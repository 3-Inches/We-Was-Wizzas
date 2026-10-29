// Studying in the Great Library of Durenmar (Guardians of the Forests, ch.6): a magus earns two
// seasons of study for each new book or Lab Text given to it, one for a season of copying; what the
// library holds is found by rolling. A summa of an Art is there if a simple die + 10 (+3 for a
// master, a follower of Bonisagus or a member, +6 more for an archmage, at most 20) beats its level,
// and is of Quality simple die + 5; a tractatus is of Quality simple die + 2; a spell's Lab Text is
// found on a stress die against an Ease Factor, an enchantment's likewise. A roll that only matches
// the Ease Factor means a magus of equal rank wants the same book this season: certamen decides.

import { defaultRng, describeStress, simpleDie, stressDie, type Rng } from './dice';

export type LibraryRank = 'journeyman' | 'master' | 'archmage';

export interface FindResult {
  found: boolean;
  /** the roll matched the Ease Factor: a magus of equal rank wants it too, and certamen decides */
  contest: boolean;
  total: number;
  ease: number;
  quality?: number;
  text: string;
}

/**
 * A summa on an Art (simple die + 10, with the bonuses) or an Arcane Ability (a simple die alone)
 * of at least the level wanted. Durenmar Lore adds to its Quality, less one for each earlier use in
 * the same subject.
 */
export function findSumma(o: { level: number; art: boolean; rank: LibraryRank; bonisagusOrMember: boolean; lore?: number; loreUsed?: number }, rng: Rng = defaultRng): FindResult {
  const die = simpleDie(rng).value;
  const bonus = o.art ? 10 + (o.rank !== 'journeyman' || o.bonisagusOrMember ? 3 : 0) + (o.rank === 'archmage' ? 6 : 0) : 0;
  const total = o.art ? Math.min(20, die + bonus) : die;
  const ease = o.level;
  const contest = total === ease;
  const found = total > ease;
  const lore = Math.max(0, (o.lore ?? 0) - (o.loreUsed ?? 0));
  // the Quality should not pass 30 less the level, or 24, whichever is lower (28 at the very most)
  const cap = Math.min(30 - o.level, 24);
  const quality = found || contest ? Math.max(1, Math.min(cap, simpleDie(rng).value + 5 + lore)) : undefined;
  const parts = `simple die ${die}${bonus ? ` + ${bonus}` : ''}${o.art && die + bonus > 20 ? ' (at most 20)' : ''} = ${total} against Level ${ease}`;
  const text = found
    ? `${parts}: there is one, Quality ${quality}${lore ? ` (with Durenmar Lore ${lore})` : ''}.`
    : contest
      ? `${parts}: a magus of equal rank wants the same summa this season; certamen decides (Quality ${quality}).`
      : `${parts}: not this season (${o.art ? 'none of that level, or more likely a magus of higher rank has it' : 'there is no such book'}).`;
  return { found, contest, total, ease, quality, text };
}

/** The Quality of a tractatus studied there: simple die + 2 (+ Durenmar Lore, less one for each earlier use in the Art), at most 12. */
export function tractatusQuality(o: { lore?: number; loreUsed?: number } = {}, rng: Rng = defaultRng): { quality: number; text: string } {
  const die = simpleDie(rng).value;
  const lore = Math.max(0, (o.lore ?? 0) - (o.loreUsed ?? 0));
  const quality = Math.min(12, die + 2 + lore);
  return { quality, text: `Simple die ${die} + 2${lore ? ` + Durenmar Lore ${lore}` : ''}: a tractatus of Quality ${quality}.` };
}

export type SpellKind = 'standard' | 'version' | 'other';
/** Ease Factors for a Lab Text: a standard spell 3, a version of a general standard spell (to level 40) 6, any other 6 to 21 as the storyguide sets. */
export const LAB_TEXT_EASE: Record<SpellKind, number> = { standard: 3, version: 6, other: 12 };

/** A spell's Lab Text: a stress die against the Ease Factor; every full six over it also finds a tractatus on its Mastery (Quality simple die + 2). */
export function findLabText(kind: SpellKind, ease: number = LAB_TEXT_EASE[kind], rng: Rng = defaultRng): FindResult & { mastery: number[] } {
  const r = stressDie(1, rng);
  const total = r.value;
  const contest = !r.botches && total === ease;
  const found = !r.botches && total > ease;
  const mastery = found ? Array.from({ length: Math.floor((total - ease) / 6) }, () => simpleDie(rng).value + 2) : [];
  const roll = `${describeStress(r)} against ${ease}`;
  let text: string;
  if (kind === 'standard') {
    text = r.botches ? `${roll}: a botch; the spell is not in the library.` : contest ? `${roll}: a magus of equal rank wants the same Lab Text; certamen decides.` : found ? `${roll}: the Lab Text is there.` : `${roll}: a magus of higher rank or privilege is using it this season.`;
  } else {
    text = r.botches ? `${roll}: a botch; there is a Lab Text, but it has a significant flaw or strays from what was wanted.` : contest ? `${roll}: it is there, and a magus of equal rank wants it too; certamen decides.` : found ? `${roll}: the Lab Text is there.` : `${roll}: there is no such Lab Text.`;
  }
  if (mastery.length) text += ` And ${mastery.length} tractatus on its Mastery (Quality ${mastery.join(', ')}).`;
  return { found, contest, total, ease, text, mastery };
}

/** An enchanted device's Lab Text: beating the Ease Factor finds one very like it; beating it by 6 finds the very one. */
export function findEnchantment(ease: number, rng: Rng = defaultRng): FindResult & { exact: boolean } {
  const r = stressDie(1, rng);
  const total = r.value;
  const found = !r.botches && total > ease;
  const exact = found && total - ease >= 6;
  const text = `${describeStress(r)} against ${ease}: ${r.botches ? 'a botch; nothing of the kind.' : exact ? 'a Lab Text for exactly that enchantment.' : found ? 'a Lab Text for an enchantment very like it.' : 'nothing close enough.'}`;
  return { found, contest: false, total, ease, text, exact };
}

/** Seasons of study earned: two for each new contribution (a book, a new spell's Lab Text), one for a season of copying. */
export function libraryCredit(contributions: number, copyingSeasons: number): number {
  return contributions * 2 + copyingSeasons;
}
