// A living covenant's magus falls into Wizard's Twilight as the players' magi do (owner.md, point 5).
// Nobody plays them, so the Twilight their Warping owes (gainWarping, warping.ts) does not wait on a
// Resolve list: the toolkit rolls it when the season ends, and tells it in the Tribunal's news.
// DE, Wizard's Twilight (line 9749): Entering Twilight (line 9755), Comprehending Twilight, the time
// it takes, and its effects (line 9810).

import { ART_NAMES, ARTS, type Art } from '../data';
import type { DerivedCharacter } from './character/derive';
import { stressDie, type Rng } from './dice';
import { newSeasonEntry, twilightAvoidance, twilightComprehension, TWILIGHT_TIME } from './longterm';
import { nextSeason, seasonIndex } from './effects';
import type { Character, Season, TribunalNews } from './types';
import { uid } from '../util/id';
import { warpingScoreFromPoints } from './xp';

/** How long the world goes without the magus, by the step of the Twilight time table (DE), and the seasons it takes. */
function timeAway(idx: number, rng: Rng): { text: string; seasons: number } {
  const short = ['a moment', 'two minutes', 'two hours', 'until the sun next rises or sets', 'a day', 'a month'];
  if (idx <= 5) return { text: short[Math.max(0, idx)], seasons: 0 };
  if (idx === 6) return { text: 'a season', seasons: 1 };
  if (idx === 7) return { text: 'a year', seasons: 4 };
  // Seven plus a Stress Die years (no botch)
  const years = idx === 8 ? 7 : 7 + stressDie(0, rng, true).value;
  return { text: `${years} years`, seasons: years * 4 };
}

/** The Art the magus knows best: the storyguide's pick of "an Art, Magic Theory, or Enigmatic Wisdom" (DE), made for them. */
function bestArt(d: DerivedCharacter): Art {
  return ARTS.reduce((best, a) => (d.arts[a].score > d.arts[best].score ? a : best), ARTS[0]);
}

/** Experience gained or lost in an Art; a loss "cannot reduce the score below zero" (DE, Lost Knowledge). */
function changeArt(c: Character, art: Art, xp: number): number {
  const alloc = (c.arts[art] ??= {});
  if (xp >= 0) {
    alloc.play = (alloc.play ?? 0) + xp;
    return xp;
  }
  let left = -xp;
  for (const k of ['play', ...Object.keys(alloc).filter((x) => x !== 'play')] as (keyof typeof alloc)[]) {
    const take = Math.min(left, alloc[k] ?? 0);
    if (take > 0) alloc[k] = (alloc[k] ?? 0) - take;
    left -= take;
  }
  return xp + left;
}

export interface LivingTwilight {
  /** the season report's lines */
  lines: string[];
  /** the Tribunal's news: a Twilight entered */
  news: TribunalNews[];
}

/**
 * Roll each Wizard's Twilight a living covenant's magus owes, oldest first: avoid it (Sta + Concentration
 * + Vim bonus + stress die vs Warping Score + points gained + Enigmatic Wisdom + local aura + stress die),
 * and if it is entered, comprehend it. Its effects are applied as the storyguide's: a simple die of further
 * Warping Points, a Twilight Scar, the knowledge gained or lost in the Art the magus knows best, and the
 * time lost to the world, kept as seasons logged "in Twilight". Final Twilight takes the magus from play.
 * Changes `c`.
 */
export function livingTwilight(c: Character, derive: (c: Character) => DerivedCharacter, aura: number, covenantId: string | undefined, year: number, season: Season, rng: Rng): LivingTwilight {
  const out: LivingTwilight = { lines: [], news: [] };
  const who = c.name || 'The magus';
  for (let o = c.owed?.find((x) => x.kind === 'twilight'); o && !c.wounds.dead; o = c.owed?.find((x) => x.kind === 'twilight')) {
    c.owed = c.owed!.filter((x) => x !== o);
    const gained = o.points ?? 2;
    const d = derive(c);
    // the points are on the sheet already: add them, then roll (DE)
    const avoid = twilightAvoidance(d, gained, aura, rng, true);
    if (avoid.success) {
      out.lines.push(`${who} avoided Wizard’s Twilight (${avoid.my} vs ${avoid.tw}).`);
      continue;
    }
    const comp = twilightComprehension(d, gained, rng, true);
    // a botched avoidance enters Twilight and cannot comprehend it (DE line 9761): no roll, the base time
    const comprehended = comp.success && !avoid.botch;
    const score = warpingScoreFromPoints(c.warpingPoints);
    const time = avoid.botch ? TWILIGHT_TIME[Math.min(10, Math.max(1, score))] : comp.duration;
    const idx = TWILIGHT_TIME.indexOf(time);
    const total = gained + comp.extraWarping;
    c.warpingPoints += comp.extraWarping;
    const art = bestArt(d);
    // Final Twilight takes the magus from the world: nothing of it comes back
    const xp = idx >= 10 ? 0 : changeArt(c, art, (comprehended ? 2 : -2) * total);
    const scar = `${season} ${year}: ${comprehended ? 'a beneficial' : 'an annoying'} Twilight Scar (the storyguide describes it)`;
    c.twilightScars = [...c.twilightScars.filter(Boolean), scar];
    const away = idx >= 10 ? { text: '', seasons: 0 } : timeAway(idx, rng);
    // after any seasons a Twilight already took from the world
    const lost = c.seasonLog.filter((x) => x.told === 'was lost in Wizard’s Twilight' && seasonIndex(x.year, x.season) > seasonIndex(year, season));
    const last = lost.sort((a, b) => seasonIndex(b.year, b.season) - seasonIndex(a.year, a.season))[0];
    let when = last ? { year: last.year, season: last.season } : { year, season };
    for (let i = 0; i < away.seasons; i++) {
      when = nextSeason(when.year, when.season);
      const e = newSeasonEntry(when.year, when.season, 'other', `In Wizard’s Twilight, from ${season} ${year}.`);
      e.told = 'was lost in Wizard’s Twilight';
      e.applied = true;
      c.seasonLog.push(e);
    }
    const what = idx >= 10 ? 'and could not find the way back' : `${comprehended ? 'comprehended it' : 'did not comprehend it'}, and ${xp >= 0 ? 'gained' : 'lost'} ${Math.abs(xp)} experience in ${ART_NAMES[art]}`;
    const detail = `${avoid.botch ? 'botched the roll to avoid it' : `failed to avoid it (${avoid.my} vs ${avoid.tw})`}, ${what}; ${comp.extraWarping} more Warping Point${comp.extraWarping === 1 ? '' : 's'}, and a Twilight Scar`;
    if (idx >= 10) c.wounds.dead = true;
    const gone = idx >= 10 ? 'passed into Final Twilight, and is gone from the world' : `was lost to the world for ${away.text}`;
    out.lines.push(`${who} entered Wizard’s Twilight from ${gained} Warping Points: ${detail}. ${who} ${gone}.`);
    out.news.push({ uid: uid(), year, season, kind: idx >= 10 ? 'death' : 'event', covenantId, characterId: c.id, text: `${who} fell into Wizard’s Twilight and ${gone}${idx >= 10 ? '' : comprehended ? ', and came back wiser in the ways of magic' : ', marked by it'}.` });
  }
  return out;
}
