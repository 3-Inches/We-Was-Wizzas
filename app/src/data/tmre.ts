// What The Mysteries (Revised Edition) defines that the extracted Virtue and Ability lists lack:
// Hermetic Alchemy (its heading reads "Hermetic Minor Virtue", which the extractor missed), the
// Supernatural Ability Divination that Divination & Augury opens, and Synthemata Magia. Their text
// is the book's, shortened.

import type { AbilityDef, VirtueFlawDef } from './types';

const TMRE_VF: VirtueFlawDef[] = [
  {
    id: 'hermetic-alchemy', name: 'Hermetic Alchemy', kind: 'virtue', sizes: ['Minor'], categories: ['Hermetic'], tainted: false,
    source: { book: 'TMRE', line: 1488 },
    text:
      "Hermetic Alchemy lets the magus extract more vis from an aura, or to extract Form-specific vis rather than Vim vis.",
  },
];

const TMRE_ABILITIES: AbilityDef[] = [
  {
    id: 'divination', name: 'Divination', type: 'Supernatural', restricted: true, specialties: ['astrology', 'dream interpretation', 'numerology', 'scrying', 'by night', 'about people'],
    text:
      'Hermetic Divination (The Mysteries): answers a question as a Momentary, non-Ritual Intellego spell of any Form would, with that spell’s level as the Ease Factor. Casual (one round): stress die + Perception + Divination + aura + a bonus of 0 to 3 for fitting omens. Ceremonial (15 minutes per 5 points of Ease Factor): stress die + Intelligence + Divination + aura + the method’s ceremonial bonus (1 to 5) + sympathetic bonuses + a scrying device’s bonus. Penetration: the total + Penetration bonus − the Ease Factor. Opened at 1 by Divination & Augury or Hermetic Dream Interpreter.',
    source: { book: 'TMRE', line: 2318 },
  },
  {
    id: 'synthemata-magia', name: 'Synthemata Magia', type: 'Supernatural', restricted: true, specialties: ['daimons', 'ghosts', 'elementals'],
    text:
      'Intuit the synthemata of a named spirit (The Mysteries): stress die + Perception + (Realm) Lore + the aura where the magus is, against the spirit’s Might + its aura + its Name Hiding (usually half its Might). Known synthemata are used in Hermetic Synthemata’s Muto Vim spells, which add their level to the caster’s Casting Score while they last.',
    source: { book: 'TMRE', line: 3513 },
  },
];

export function tmreVirtueDefs(existing: Set<string>): VirtueFlawDef[] {
  return TMRE_VF.filter((v) => !existing.has(v.id));
}

export function tmreAbilityDefs(existing: Set<string>): AbilityDef[] {
  return TMRE_ABILITIES.filter((a) => !existing.has(a.id));
}
