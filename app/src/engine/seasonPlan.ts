// Planning a season (the Seasons page): the order the troupe takes its turns in, what to expect before
// the season ends (what will fall short, what comes due, what is left undone), and the choices a season
// left behind, kept on the characters until they are made.

import { ART_NAMES, type Art, type GameData } from '../data';
import { upcoming } from './calendar';
import type { DerivedCharacter } from './character/derive';
import { characterContext, covenantOf } from './context';
import { deriveCovenant } from './covenant';
import { DEFAULT_YEAR_END, planYearEnd } from './covenantYear';
import { effectExpiry } from './effects';
import { planProject, visShort } from './projects';
import { inPlay, loggedThisSeason, resolveStanding } from './time';
import type { Character, Covenant, Owed, Saga } from './types';
import { visAvailable } from './vis';
import { laborForecast } from './workshop';

const TYPE_ORDER: Record<Character['type'], number> = { magus: 0, companion: 1, mythic: 2, grog: 3 };

/** The players in their order of play: the saga's order first, then any not in it, as their first character was made. */
export function playersInOrder(saga: Saga, chars: Character[]): string[] {
  const named = [...chars].filter((c) => c.player?.trim()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const seen = [...new Set(named.map((c) => c.player.trim()))];
  const set = (saga.playerOrder ?? []).filter((p) => seen.includes(p));
  return [...set, ...seen.filter((p) => !set.includes(p))];
}

export interface Turn {
  /** a player's name, "Grogs", or "The storyguide's" */
  label: string;
  player?: string;
  people: Character[];
}

/**
 * The people in order of play: each player in turn, their magi then their companions; then the grogs,
 * whoever plays them; then the rest (the storyguide's characters, those with no player named).
 */
export function orderOfPlay(saga: Saga, chars: Character[]): Turn[] {
  const byType = (a: Character, b: Character) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || (a.name || '').localeCompare(b.name || '');
  const out: Turn[] = playersInOrder(saga, chars).map((p) => ({ label: p, player: p, people: chars.filter((c) => c.type !== 'grog' && c.player?.trim() === p).sort(byType) }));
  const grogs = chars.filter((c) => c.type === 'grog').sort(byType);
  if (grogs.length) out.push({ label: 'Grogs', people: grogs });
  const rest = chars.filter((c) => c.type !== 'grog' && !c.player?.trim()).sort(byType);
  if (rest.length) out.push({ label: 'No player named', people: rest });
  return out.filter((t) => t.people.length);
}

export interface PlanNote {
  level: 'bad' | 'warn' | 'info';
  /** the covenant or character it is about */
  covenantId?: string;
  charId?: string;
  who?: string;
  text: string;
  /** where it is dealt with */
  to?: 'finances' | 'hooks' | 'covenant' | 'tribunal' | 'workshop' | 'lab' | 'plan' | 'resolve';
}

interface State {
  saga: Saga;
  characters: Character[];
  covenants: Covenant[];
}

/**
 * What to expect when this season ends, before it does: the dates that fall in it, the covenant's year
 * (spending more than it earns, a treasury that runs dry, wards to cast again without the vis), each
 * character's work (a workshop short of Labor Points by the year's end, lab work without its vis or its
 * Lab Total, nothing to do), and the choices still owed from the seasons before.
 */
export function seasonForecast(state: State, data: GameData, derive: (c: Character) => DerivedCharacter): PlanNote[] {
  const { saga } = state;
  const { currentYear: year, currentSeason: season } = saga;
  const notes: PlanNote[] = [];
  const covs = state.covenants.filter((c) => !c.living);
  const people = state.characters.filter((c) => inPlay(c) && covs.some((cov) => cov.memberIds.includes(c.id) || c.covenantId === cov.id));

  // the dates that fall this season
  for (const e of upcoming(state, 1).filter((x) => x.year === year && x.season === season)) {
    if (e.kind === 'year') continue;
    notes.push({ level: e.kind === 'hook' || e.kind === 'covenant' ? 'warn' : 'info', covenantId: e.link?.covenantId, text: e.text, to: e.link?.page === 'tribunal' ? 'tribunal' : e.link?.tab === 'hooks' ? 'hooks' : e.link?.covenantId ? 'covenant' : undefined });
  }

  for (const cov of covs) {
    const name = cov.name || 'The covenant';
    const members = state.characters.filter((c) => cov.memberIds.includes(c.id));
    const dc = deriveCovenant(cov, data, members);
    const plan = planYearEnd(cov, dc, DEFAULT_YEAR_END);
    if (plan.treasuryAfter < 0) notes.push({ level: 'bad', covenantId: cov.id, who: name, text: `${name} runs out of money at the year's end: ${cov.finances.treasury} £ in the treasury, ${plan.balance} £ for the year.`, to: 'finances' });
    else if (plan.balance < 0) notes.push({ level: 'warn', covenantId: cov.id, who: name, text: `${name} spends more than it earns: ${plan.expenditure} £ against ${plan.income} £ a year (${plan.balance} £); the treasury holds ${cov.finances.treasury} £.`, to: 'finances' });
    // a ward that ends this season, to be cast again with vis the covenant must have
    for (const e of cov.effects ?? []) {
      const end = effectExpiry(e);
      if (!end || !e.renew || end.year !== year || end.season !== season) continue;
      const arts: Art[] = e.renew.art ? [e.renew.art] : ['Re', 'Vi'];
      const need = Math.max(1, Math.ceil(e.renew.level / 5));
      const have = visAvailable(cov.visStocks, arts);
      if (have < need) notes.push({ level: 'bad', covenantId: cov.id, who: name, text: `${e.name} must be cast again this season with ${need} pawns of ${arts.map((x) => ART_NAMES[x]).join(' or ')} vis; the stores hold ${have}.`, to: 'covenant' });
    }
  }

  const aging: string[] = [];
  for (const c of people) {
    const d = derive(c);
    const who = c.name || 'Unnamed';
    for (const o of c.owed ?? []) notes.push({ level: 'bad', charId: c.id, who, text: `${o.text} Still to settle.`, to: 'resolve' });
    const fc = c.workshop && c.workshop.laborPoints >= 0 ? laborForecast(c, d, year, season) : undefined;
    if (fc?.short)
      notes.push({ level: 'warn', charId: c.id, who, text: `${who}'s workshop will be ${-fc.atYearEnd} Labor Points short when the year closes (${fc.now} now, ${fc.workSeasons} work season${fc.workSeasons === 1 ? '' : 's'} left at ${fc.perSeason}, upkeep ${fc.upkeep}).`, to: 'workshop' });
    if (c.workshop && c.workshop.laborPoints < 0) notes.push({ level: 'bad', charId: c.id, who, text: `${who}'s workshop owes ${-c.workshop.laborPoints} Labor Points.`, to: 'workshop' });
    const logged = loggedThisSeason(c, year, season).some((e) => !e.extra);
    if (!logged) {
      const s = resolveStanding(c, d, year);
      if (s.kind === 'none') notes.push({ level: 'info', charId: c.id, who, text: `${who} does nothing this season.`, to: 'plan' });
      if (s.kind === 'lab' && s.projectUid) {
        const p = c.projects?.find((x) => x.uid === s.projectUid && !x.done);
        const ctx = characterContext(c, state.covenants, data);
        if (p) {
          const pl = planProject(p, c, d, ctx, { subject: state.characters.find((y) => y.id === p.subjectId), data });
          const short = visShort(p, c, ctx, pl);
          if (short) notes.push({ level: 'warn', charId: c.id, who, text: `${who}'s ${p.name || 'lab project'}: ${short} Another project is worked instead.`, to: 'lab' });
          else if (pl.problems.length) notes.push({ level: 'warn', charId: c.id, who, text: `${who}'s ${p.name || 'lab project'}: ${pl.problems[0]}`, to: 'lab' });
        }
      }
    }
    if (season === 'Winter' && !c.creature?.magicCharacter && !c.inhuman && (c.age + 1 >= d.agingStartAge || c.longevity)) aging.push(who);
    // the Code asks a season a year of teaching of a master (DE, Apprentices)
    if (c.apprentice && season === 'Winter' && !c.seasonLog.some((e) => e.year === year && e.priority === 'apprentice'))
      notes.push({ level: 'warn', charId: c.id, who, text: `${who} has not taught ${c.apprentice.name || 'the apprentice'} this year: the Code asks a season a year (Teach them, on the Seasons page, in full).`, to: 'plan' });
    if (c.apprentice && c.apprentice.since + 15 <= year) notes.push({ level: 'info', charId: c.id, who, text: `${c.apprentice.name || `${who}’s apprentice`} has had fifteen years of training: the Gauntlet is due.`, to: 'plan' });
    if (c.type === 'magus' && covenantOf(c, covs) && !c.longevity && c.age + 1 >= 35 && season === 'Winter') notes.push({ level: 'warn', charId: c.id, who, text: `${who} rolls for aging with no Longevity Ritual.`, to: 'lab' });
  }
  if (aging.length) notes.push({ level: 'info', text: `The year closes after this season: aging rolls for ${aging.join(', ')}; the vis harvest, the accounts and the year's Warping.` });
  else if (season === 'Winter') notes.push({ level: 'info', text: 'The year closes after this season: the vis harvest, the accounts and the year\'s Warping.' });
  const order = { bad: 0, warn: 1, info: 2 };
  return notes.sort((a, b) => order[a.level] - order[b.level]);
}

/** The choices still owed by the players' people, in order of play. */
export function owedInOrder(saga: Saga, chars: Character[]): { c: Character; o: Owed }[] {
  return orderOfPlay(saga, chars).flatMap((t) => t.people.flatMap((c) => (c.owed ?? []).map((o) => ({ c, o }))));
}

/** A choice made: off the character's list. */
export function settle(c: Character, uid: string): void {
  c.owed = (c.owed ?? []).filter((o) => o.uid !== uid);
  if (!c.owed.length) delete c.owed;
}
