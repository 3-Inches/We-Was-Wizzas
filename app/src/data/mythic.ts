// The Mythic Companion types (DE p.63; Realms of Power: The Divine for the Nephilim, kabbalists,
// perfecti and zahids): the Free Virtue that defines each, the Virtues and Flaws it requires, the
// free Minor Virtue it names, and the least Ability scores it begins with.

import type { VFSize } from './types';

/** A Flaw a Mythic Companion type requires, with its size and choice where the book names them (Outsider: Major, a Jew). */
export type MythicFlaw = string | { id: string; size?: VFSize; param?: string };

export interface MythicType {
  label: string;
  /** the Free Virtue that defines the type */
  virtue: string;
  requiredVirtues: (string | { id: string; param?: string })[];
  requiredFlaws: MythicFlaw[];
  /** the least scores to begin with: an Ability id, with its choice after a colon (dead-language:Hebrew) */
  minAbilities: Record<string, number>;
  /** the free Minor Virtue the type names; none when the book leaves it to the player */
  freeMinor: string;
  /** the society its people come from, set with the type when the character has none of its own */
  society?: string;
  /** what the required Virtues stand for when the book gives a choice */
  note?: string;
  book?: string;
  /** the Social Status its people usually hold, when the type's Virtue is not one itself */
  status?: string;
  /** concept themes and guided-build answers that suit the type, for a build made around it */
  themes?: string[];
  answers?: Record<string, number>;
}

export const MYTHIC_TYPES: Record<string, MythicType> = {
  'devil-child': {
    label: 'Devil Child', virtue: 'devil-child', requiredVirtues: ['demonic-blood', { id: 'puissant-ability', param: 'guile' }], requiredFlaws: ['tragic-life-flaw'],
    minAbilities: {}, freeMinor: 'demonic-might', answers: { 'f-infernal': 8, 'f-infernal-taint': 8, 'h-stealth': 6 },
  },
  'faerie-doctor': {
    label: 'Faerie Doctor', virtue: 'faerie-doctor', requiredVirtues: ['wise-one', 'curse-throwing'], requiredFlaws: ['faerie-friend-flaw', 'dutybound-flaw'],
    minAbilities: { 'curse-throwing': 4, dowsing: 1, 'faerie-lore': 3, 'profession-type': 1 }, freeMinor: 'dowsing', themes: ['healer', 'faerie'], answers: { 'f-faerie': 9, 'h-healing': 7, 'h-lore': 7 },
  },
  // RoP: The Divine, Mythic Companions: Great Stamina and Great Strength, Hebrew 1
  nephilim: {
    label: 'Nephilim', virtue: 'nephilim',
    requiredVirtues: ['blood-of-the-nephilim', { id: 'greater-immunity', param: 'Disease' }, { id: 'great-characteristic', param: 'Sta' }, { id: 'great-characteristic', param: 'Str' }, 'improved-characteristics', 'sense-holiness-and-unholiness'],
    requiredFlaws: [],
    minAbilities: { 'dominion-lore': 4, 'dead-language:Hebrew': 1, penetration: 1, 'sense-holiness-and-unholiness': 3 }, freeMinor: 'strong-angelic-heritage', book: 'RoP_D',
    themes: ['faith', 'warrior'], answers: { 'f-divine': 9, 'f-divine-faith': 7, 'h-fight': 8, 'g-good': 7 },
  },
  'spirit-votary': {
    label: 'Spirit Votary', virtue: 'spirit-votary', requiredVirtues: ['spiritual-pact'], requiredFlaws: ['pagan-flaw'],
    minAbilities: { 'area-lore': 1, 'magic-lore': 4, penetration: 1, 'second-sight': 3 }, freeMinor: 'second-sight', themes: ['mystic'], answers: { 'f-magic': 8, 'f-senses': 8, 'h-lore': 7 },
  },
  // RoP: The Divine, Mythic Judaism: a favored Method (Gematria, Kabbalah or Merkavah), two Powers and Educated (Hebrew)
  kabbalist: {
    label: 'Kabbalist', virtue: 'kabbalist', requiredVirtues: ['educated-hebrew', 'kabbalah', 'wonders', 'blessing-power'], requiredFlaws: [{ id: 'outsider-flaw', size: 'Major', param: 'Jew' }],
    minAbilities: { 'artes-liberales': 1, 'dominion-lore': 1, 'dead-language:Hebrew': 4, 'judaic-lore': 1, 'theology-judaism': 3, 'rabbinical-law': 1 }, freeMinor: '', society: 'Jewish', book: 'RoP_D',
    themes: ['faith', 'scholar'], answers: { 'f-divine': 9, 'f-divine-faith': 8, 'f-divine-powers': 9, 'h-scholar': 8, 'h-lore': 6 },
    note: 'Any one of Gematria, Kabbalah or Merkavah, and any two Holy Powers: swap Kabbalah, Wonders and Blessing for others on the Virtues step. A further Social Status says where the kabbalist stands in the community, and the free Minor Virtue is yours to choose.',
  },
  // RoP: The Divine, Mythic Christianity: the Cathar perfecti
  perfectus: {
    label: 'Perfectus', virtue: 'perfectus', requiredVirtues: ['purity', 'transcendence'], requiredFlaws: [{ id: 'enemies-flaw', size: 'Major', param: 'the Church' }],
    minAbilities: { 'organization-lore:Church': 1, concentration: 1, 'dominion-lore': 1, purity: 2, 'theology-christian': 2, transcendence: 2 }, freeMinor: 'second-sight', book: 'RoP_D',
    themes: ['faith'], answers: { 'f-divine': 9, 'f-divine-faith': 9, 'f-divine-powers': 9, 'g-good': 8, 'g-church': 7 },
    note: 'A Cathar holy man or woman: Purity calls Transcendence. Fifty experience points go to the least scores.',
  },
  // RoP: The Divine, Mythic Islam: the ascetic Sufis
  zahid: {
    label: 'Zahid', virtue: 'zahid', requiredVirtues: ['true-faith', 'meditation', 'understanding'], requiredFlaws: [],
    minAbilities: { concentration: 1, 'dominion-lore': 1, 'islamic-law': 1, meditation: 3, 'second-sight': 2, 'theology-islam': 2, understanding: 2 }, freeMinor: 'second-sight', society: 'Islamic', book: 'RoP_D', status: 'wise-one',
    themes: ['faith', 'mystic'], answers: { 'f-divine': 9, 'f-divine-faith': 10, 'f-divine-powers': 9, 'g-good': 8 },
    note: 'An ascetic Sufi: Meditation calls Understanding. Take a Social Status too: Wise One or ’Alim in Muslim lands, Outsider (Muslim) elsewhere. A shaykh takes Ceremony and Dependent (the tariqa).',
  },
};

/** The Ability a least score names, and its choice (dead-language:Hebrew). */
export function mythicAbility(key: string): { id: string; param?: string } {
  const [id, param] = key.split(':');
  return { id, param };
}

