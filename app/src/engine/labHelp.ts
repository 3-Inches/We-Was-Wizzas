// Help in the laboratory (DE, Help in the Laboratory): anyone with The Gift and Magic Theory 1 or
// more may help a magus with any activity that uses Magic Theory, adding Intelligence + Magic
// Theory to the Lab Total; a familiar may help its magus without the Gift (DE, Familiars). A magus
// takes as many helpers as Leadership (at least one), and a familiar as well as one. Helpers gain
// Exposure, typically in Magic Theory.

import type { DerivedCharacter } from './character/derive';
import type { Character } from './types';

export interface LabHelper {
  c: Character;
  d: DerivedCharacter;
  /** Intelligence + Magic Theory */
  value: number;
  familiar: boolean;
  /** helping in one of the extra seasons of a character who needs no sleep */
  extra: boolean;
  /** the project helped with, once the magus has worked it */
  used?: string;
}

const theoryOf = (d: DerivedCharacter) => d.abilities.find((a) => a.abilityId === 'magic-theory')?.score ?? 0;

/** Why this character cannot help that magus in the lab, or nothing if it can. */
export function cannotHelp(h: Character, hd: DerivedCharacter, magus: Character | undefined): string | undefined {
  if (!magus) return 'choose the magus to help';
  if (magus.id === h.id) return 'a magus cannot be their own helper';
  if (magus.type !== 'magus') return `${magus.name || 'they'} is not a magus with a laboratory`;
  const familiar = h.creature?.familiarOf === magus.id;
  if (!hd.hasGift && !familiar) return 'a helper needs The Gift (or to be the magus’s bound familiar)';
  if (theoryOf(hd) < 1) return 'a helper needs Magic Theory 1';
  return undefined;
}

/** What the helper adds to the Lab Total: Intelligence + Magic Theory. */
export function helpValue(hd: DerivedCharacter): number {
  return hd.characteristics.Int.value + theoryOf(hd);
}

/** The most helpers a magus can use in a season: Leadership (at least one), or two with the familiar among them. */
export function maxHelpers(md: DerivedCharacter, withFamiliar: boolean): number {
  const leadership = md.abilities.find((a) => a.abilityId === 'leadership')?.score ?? 0;
  return Math.max(withFamiliar ? 2 : 1, leadership);
}

/** The helpers as Lab Total parts. */
export function helperParts(helpers: LabHelper[] | undefined): { label: string; value: number }[] {
  return (helpers ?? []).map((h) => ({ label: `Helper: ${h.c.name || 'an assistant'} (Int + Magic Theory)`, value: h.value }));
}
