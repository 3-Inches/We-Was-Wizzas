// The Warping reactions of a living covenant's hedge people, whom nobody plays: the Witch Moon (Hedge
// Magic, Revised Edition, The Witch Moon, line 2069), Nátt-thel (HMRE, Vitkir) and Faerie Calling (Realms
// of Power: Faerie). A player settles them on the Resolve list with the hedge and Faerie cards; for the
// living the toolkit rolls them as the season ends, as livingTwilight.ts rolls Wizard's Twilight, with the
// same rolls, and tells each in the Tribunal's news (owner.md, Decided).

import type { DerivedCharacter } from './character/derive';
import { stressDie, simpleDie, type Rng } from './dice';
import { callingResolveEase, faerieRank } from './faerieWizardry';
import { witchMoonEnds, witchMoonOutcome } from './folkWitch';
import { settle } from './seasonPlan';
import type { Character, Season, TribunalNews } from './types';
import { nattThelAvoid, nattThelDuration } from './vitkir';
import { warpingScoreFromPoints } from './xp';
import { uid } from '../util/id';
import { livingTwilight } from './livingTwilight';

export interface LivingReactions {
  lines: string[];
  news: TribunalNews[];
}

/** Roll every reaction the character owes but Twilight (livingTwilight.ts rolls that). Changes `c`. */
export function livingReactions(c: Character, derive: (c: Character) => DerivedCharacter, covenantId: string | undefined, year: number, season: Season, rng: Rng): LivingReactions {
  const out: LivingReactions = { lines: [], news: [] };
  const who = c.name || 'The character';
  const tell = (text: string) => out.news.push({ uid: uid(), year, season, kind: 'event', covenantId, characterId: c.id, text });

  // the Witch Moon: Stamina − Warping Score + stress die against 6 at each month's end, three in a season;
  // each month it goes on adds a Warping Point, and one more for each botch
  for (let m = 0; m < 3 && c.folkWitch?.witchMoon && !c.wounds.dead; m++) {
    const moon = c.folkWitch.witchMoon;
    const d = derive(c);
    const r = stressDie(1, rng);
    const botches = r.zero ? r.botches : 0;
    const months = moon.months + 1;
    if (witchMoonEnds(d, warpingScoreFromPoints(c.warpingPoints)) + r.value >= 6 && !botches) {
      const o = witchMoonOutcome(months, moon.warpingScore, moon.pointsGained);
      c.folkWitch = { ...c.folkWitch, witchMoon: undefined };
      const t = c.owed?.find((x) => x.kind === 'witch-moon');
      if (t) settle(c, t.uid);
      out.lines.push(`${who}'s Witch Moon passed after ${months} month${months === 1 ? '' : 's'}. ${o.text}`);
      tell(`${who} came through the Witch Moon after ${months} month${months === 1 ? '' : 's'}, ${o.good ? 'the better for it' : 'the worse for it'}: the storyguide says what it brought (Hedge Magic, The Witch Moon).`);
    } else {
      const add = 1 + botches;
      c.warpingPoints += add;
      c.folkWitch = { ...c.folkWitch, witchMoon: { ...moon, months, pointsGained: moon.pointsGained + add } };
      out.lines.push(`${who}'s Witch Moon went on another month: ${add} Warping Point${add === 1 ? '' : 's'}.`);
    }
  }

  // Nátt-thel: Stamina + Concentration + stress die against 3 × Warping Score; lost, the vitki loses The
  // Gift for simple die + Warping Score's time, times the points gained. The points are on the sheet already.
  for (let o = c.owed?.find((x) => x.kind === 'natt-thel'); o; o = c.owed?.find((x) => x.kind === 'natt-thel')) {
    settle(c, o.uid);
    const d = derive(c);
    const ws = warpingScoreFromPoints(c.warpingPoints);
    const a = nattThelAvoid(d, ws);
    const r = stressDie(1, rng);
    if (a.total + r.value >= a.ease && !(r.zero && r.botches)) {
      out.lines.push(`${who} kept control of the runes (Stamina + Concentration ${a.total} + ${r.value} against ${a.ease}): no Nátt-thel.`);
      continue;
    }
    const dur = nattThelDuration(simpleDie(rng).value + ws, o.points ?? 2);
    out.lines.push(`${who} fell into Nátt-thel (${a.total + r.value} against ${a.ease}): The Gift and the vitkar Virtues and Flaws are lost for ${dur.text}, and every rune effect ends.`);
    tell(`${who} fell into Nátt-thel and lost the runes' power for ${dur.text} (Hedge Magic, Vitkir).`);
  }

  // Faerie Calling: Perception + Concentration + stress die against (Warping Score − Faerie Rank) × 3; a good
  // experience brings a new Sympathy Trait +1, a bad one −1; at Faerie Rank ±10 the character does not return
  for (let o = c.owed?.find((x) => x.kind === 'calling'); o; o = c.owed?.find((x) => x.kind === 'calling')) {
    settle(c, o.uid);
    const d = derive(c);
    const rank = faerieRank(c.sympathy);
    const ease = callingResolveEase(d.warpingScore, rank);
    const r = stressDie(1, rng);
    const total = d.characteristics.Per.value + (d.abilities.find((x) => x.abilityId === 'concentration')?.total ?? 0) + r.value;
    const good = !(r.zero && r.botches) && total > ease;
    c.sympathy = [...(c.sympathy ?? []), { uid: uid(), trait: 'new (from the Calling)', score: good ? 1 : -1 }];
    const gone = (good && rank >= 10) || (!good && rank <= -10);
    if (gone) c.wounds.dead = true;
    out.lines.push(`${who} answered a Faerie Calling (${total} against ${ease}): ${good ? 'a good experience, a new Sympathy Trait +1' : 'a bad one, a new Sympathy Trait −1'}${gone ? ', and did not return: transformed, into Faerieland for ever' : ''}.`);
    tell(`${who} heard a Faerie Calling${gone ? ' and went into Faerieland, never to return' : `, and came back ${good ? 'closer to the fae' : 'shaken by it'}`} (Realms of Power: Faerie).`);
  }
  return out;
}

/** What a living covenant's person's Warping owes this season, rolled: Twilight for a magus, else their tradition's reaction. */
export function livingSeasonEnd(c: Character, derive: (c: Character) => DerivedCharacter, aura: number, covenantId: string | undefined, year: number, season: Season, rng: Rng): LivingReactions {
  const tw = livingTwilight(c, derive, aura, covenantId, year, season, rng);
  const r = livingReactions(c, derive, covenantId, year, season, rng);
  return { lines: [...tw.lines, ...r.lines], news: [...r.news, ...tw.news] };
}
