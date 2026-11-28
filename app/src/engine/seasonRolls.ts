// The rolls a season's work leaves for the season's end, made in the Seasons page's Resolve step: a folk
// witch's curse fabric, complete when the season of weaving ends (HMRE, Curse Fetish Weaving); the first
// recitation of a ring of Solomon, an entire season's work (RoP: The Divine, The Rings of Solomon, line
// 5053); and a season's search for the Book of Solomon (RoP: The Divine, Finding a Text, line 4987). The
// season's card logs the season and keeps what the roll needs; when the season ends it is owed.

import { SOLOMON_RINGS } from '../data/divine';
import { ensureAbility } from './character/factory';
import { rollWovenCurse, witchBotchDice } from './folkWitch';
import { ringUntil } from './holy';
import type { Character, Owed, Season } from './types';
import { uid } from '../util/id';

export type SeasonRollKind = Extract<Owed['kind'], 'curse' | 'ring' | 'search'>;
export const SEASON_ROLL_KINDS: SeasonRollKind[] = ['curse', 'ring', 'search'];
export const isSeasonRoll = (k: Owed['kind']): k is SeasonRollKind => (SEASON_ROLL_KINDS as string[]).includes(k);

/** A die as the roll is made: its value, whether it came up zero, its botches, and how to say it. */
export interface RolledDie {
  value: number;
  zero: boolean;
  botches: number;
  text: string;
}

/** Finding a copy of the Ars Notoria: Intelligence + Divine Lore + stress die against 21. */
export const SOLOMON_SEARCH_EASE = 21;

/** The Ease Factor of a ring's first recitation: 6 + 3 × its level + 1 a season it is to last. */
export const firstRecitationEase = (ring: number, seasons: number) => 6 + 3 * ring + Math.max(1, seasons);

function pending(c: Character, kind: SeasonRollKind): { year: number; season: Season; entryUid: string } | undefined {
  if (kind === 'curse') return c.folkWitch?.curse;
  if (kind === 'ring') return c.holy?.recitation;
  return c.holy?.search;
}

/** Set a roll aside unmade (and drop what it kept). Changes `c`. */
export function dropSeasonRoll(c: Character, kind: SeasonRollKind): void {
  if (kind === 'curse') c.folkWitch = { ...(c.folkWitch ?? {}), curse: undefined };
  else if (c.holy) c.holy = { ...c.holy, [kind === 'ring' ? 'recitation' : 'search']: undefined };
}

/**
 * The season that has just ended: each roll its work left, to owe (the text to show in Resolve). A roll
 * whose season was unlogged is dropped. Changes `c`.
 */
export function seasonEndRolls(c: Character, year: number, season: Season): { kind: SeasonRollKind; text: string }[] {
  const out: { kind: SeasonRollKind; text: string }[] = [];
  for (const kind of SEASON_ROLL_KINDS) {
    const p = pending(c, kind);
    if (!p || p.year !== year || p.season !== season) continue;
    if (!c.seasonLog.some((e) => e.uid === p.entryUid)) {
      dropSeasonRoll(c, kind);
      continue;
    }
    if (kind === 'curse') {
      const k = c.folkWitch!.curse!;
      out.push({ kind, text: `The curse of ${k.name}${k.target ? ` on ${k.target}` : ''} is woven: roll it.` });
    } else if (kind === 'ring') {
      const r = SOLOMON_RINGS.find((x) => x.ring === c.holy!.recitation!.ring);
      out.push({ kind, text: `${r?.name ?? 'A ring'} of Solomon has been recited for the first time, all season: roll the recitation.` });
    } else out.push({ kind, text: 'A season’s search for the Book of Solomon is over: roll it.' });
  }
  return out;
}

/**
 * Owe each roll the season that has just ended left, on the Resolve list, and keep it on the season's
 * entry: Unlog takes the season back with the roll still waiting (unlog.ts). Changes `c`.
 */
export function oweSeasonEndRolls(c: Character, year: number, season: Season): void {
  for (const r of seasonEndRolls(c, year, season)) {
    const o: Owed = { uid: uid(), year, season, kind: r.kind, text: r.text };
    (c.owed ??= []).push(o);
    const e = c.seasonLog.find((x) => x.uid === pending(c, r.kind)?.entryUid);
    if (e) (e.undo ??= {}).owed = [...(e.undo.owed ?? []), o.uid];
  }
}

/** The season roll still waiting for this season's work, if any. */
export function seasonRollOf(c: Character, entryUid: string): SeasonRollKind | undefined {
  return SEASON_ROLL_KINDS.find((k) => pending(c, k)?.entryUid === entryUid);
}

/** What a roll made at the season's end did, that stands though its season is unlogged (owner.md, point 2). */
const STANDS: Record<SeasonRollKind, string> = {
  curse: 'The curse has been rolled: what it did stands (a botch’s Warping, and the Witch Moon it brought).',
  ring: 'The recitation has been rolled: what it did stands (a ring learned stays learned).',
  search: 'The search has been rolled: what it found stands (a copy found stays in the library).',
};

/**
 * Keep the roll's result on the season's entry, beside its work, and mark it made: Unlog then leaves what
 * it did, and says so. Call with the roll's season entry uid, taken before the roll. Changes `c`.
 */
export function noteSeasonRoll(c: Character, kind: SeasonRollKind, entryUid: string | undefined, lines: string[]): void {
  const e = c.seasonLog.find((y) => y.uid === entryUid);
  if (!e) return;
  e.notes = [e.notes, ...lines].filter(Boolean).join(' ');
  (e.undo ??= {}).rolled = STANDS[kind];
}

/** The botch dice of the roll: one, and a foreign aura's for a curse. */
export function seasonRollBotchDice(c: Character, kind: SeasonRollKind): number {
  return witchBotchDice({ auraBotch: kind === 'curse' ? (c.folkWitch?.curse?.auraBotch ?? 0) : 0 });
}

/** What the roll needs, in words: its score and Ease Factor. */
export function seasonRollText(c: Character, kind: SeasonRollKind): string {
  if (kind === 'curse') return c.folkWitch?.curse ? `Casting Score ${c.folkWitch.curse.score} + a stress die against ${c.folkWitch.curse.ease}` : '';
  if (kind === 'ring') return c.holy?.recitation ? `Recitation score ${c.holy.recitation.score} + a stress die against ${c.holy.recitation.ease}` : '';
  return c.holy?.search ? `Intelligence + Dominion Lore ${c.holy.search.score} + a stress die against ${SOLOMON_SEARCH_EASE}` : '';
}

/**
 * Make the roll a season left, changing `c`, and say what happened. `found` is set when a search found
 * a copy of the Book of Solomon, for the covenant's library.
 */
export function rollSeasonRoll(c: Character, kind: SeasonRollKind, die: RolledDie): { lines: string[]; found?: boolean } {
  if (kind === 'curse') return { lines: rollWovenCurse(c, die) };
  const botch = die.zero && die.botches > 0;
  if (kind === 'ring') {
    const k = c.holy?.recitation;
    const r = k && SOLOMON_RINGS.find((x) => x.ring === k.ring);
    if (!k || !r) return { lines: [] };
    const total = k.score + die.value;
    const out = [`${r.name} of Solomon, first recited in ${k.season} ${k.year}: stress die ${die.text} + ${k.score} = ${botch ? 'BOTCH' : total}, against ${k.ease}.`];
    if (botch) out.push('Deemed unworthy: the storyguide may take experience in Ars Notoria (as many as the Ease Factor), give a Minor Flaw until atoned, end the benefits, or forbid orations for a while.');
    else if (total >= k.ease) {
      // the season of the first recitation was its work: the ring's seasons begin after it
      const until = ringUntil(k.year, k.season, k.seasons + 1);
      c.holy = { ...c.holy, notoria: { learned: Math.max(c.holy?.notoria?.learned ?? 0, r.ring), active: { ring: r.ring, ...until, ...(k.disease ? { disease: k.disease } : {}) } } };
      if (r.xp) ensureAbility(c, r.xp.ability);
      out.push(`The ring is learned, and works until the end of ${until.untilSeason} ${until.untilYear}: ${r.text}${k.disease ? ` (the disease: ${k.disease})` : ''}`);
    } else out.push('It fails; it may be tried again next season.');
    dropSeasonRoll(c, 'ring');
    return { lines: out };
  }
  const k = c.holy?.search;
  if (!k) return { lines: [] };
  const total = k.score + die.value;
  const found = !botch && total >= SOLOMON_SEARCH_EASE;
  const out = [`The search for the Book of Solomon: stress die ${die.text} + ${k.score} = ${botch ? 'BOTCH' : total}, against ${SOLOMON_SEARCH_EASE}.`];
  if (botch) out.push('A distant journey, and a different book: a lesser religious manuscript that furthers a heresy, or a demonic ruse (the storyguide decides).');
  else if (found) out.push('A copy found: a tractatus of Quality 20. To the unGifted its subject is Dominion Lore (the book’s Divine Lore); the Gifted may learn Ars Notoria from it, with Latin, Greek, Hebrew, Chaldean and Artes Liberales at 4.');
  else out.push('Not found this season.');
  dropSeasonRoll(c, 'search');
  return { lines: out, found };
}
