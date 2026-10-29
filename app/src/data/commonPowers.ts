// The Common Magic Powers of Realms of Power: Magic (Magic Character Creation): examples of what a
// magic character might be able to do, each with the Quality it is bought with, its level, the
// mastery the book spends on it from the Quality's spare levels, and its Might cost and Initiative as
// the book gives them. A name in brackets is chosen when the power is taken: a Form, an Ability, a
// Virtue or a Flaw.

import type { PowerKind } from './types';

export interface CommonPower {
  name: string;
  kind: PowerKind;
  /** the effect's level (a Focus Power: the levels the Quality gives) */
  level: number;
  /** what the book gives: Might points, Initiative, Form */
  stats: string;
  /** Range, Duration, Target */
  rdt: string;
  /** the Hermetic equivalent, or that there is none */
  design: string;
  /** mastery the book spends on it from the Quality's spare levels */
  mastery?: { cost?: number; init?: number };
  /** what is chosen when it is taken: the bracketed part of its name */
  choose?: 'Form' | 'Elemental Form' | 'Ability' | 'Major Virtue' | 'Minor Virtue' | 'Major Flaw' | 'Minor Flaw';
  text: string;
  line: number;
}

export const ELEMENTAL_FORMS = ['Aquam', 'Auram', 'Ignem', 'Terram'];

export const COMMON_MAGIC_POWERS: CommonPower[] = [
  {
    name: 'Crafter of (Form)', kind: 'focus', level: 25, stats: 'Variable points, Init Qik − 5, the Form', rdt: 'R: varies, D: varies, T: varies', design: 'Cr(Form) or Re(Form) 25: Focus Power', choose: 'Form', line: 1734,
    text: 'Duplicates any of a range of non-Ritual Creo or Rego spells of the Form, at 1 Might point per magnitude. The level cannot be greater than the creature’s Might, or 25, whichever is lowest. Some creatures have it more than once, for different Forms.',
  },
  {
    name: 'Enliven the Gross (Elemental Form)', kind: 'ritual', level: 30, stats: '4 points, Init Qik − 10, the elemental Form', rdt: 'R: Touch, D: Mom, T: Ind, Ritual', design: 'CrFo 30 (base 25, +1 Touch): Ritual Power ×2 (30 levels, −2 Might cost, +2 Init)', mastery: { cost: 2, init: 2 }, choose: 'Elemental Form', line: 1742,
    text: 'Rarefies an elemental of the type from enough raw elemental matter, with any Might less than the creature’s, under its control; it can also control elementals not of its making, if it Penetrates their Might.',
  },
  {
    name: 'Equine Shape', kind: 'personal', level: 25, stats: '2 points, Init Qik − 2, Animal', rdt: 'R: Per, D: Sun, T: Ind', design: 'MuFo 25 (base 10, +2 Sun, +1 size): Personal Power (25 levels)', line: 1750,
    text: 'The character can transform into a horse until the sun rises or sets.',
  },
  {
    name: 'Flight of the Hummingbird', kind: 'personal', level: 15, stats: '0 points, Init Qik − 2, the appropriate Form', rdt: 'R: Per, D: Sun, T: Ind', design: 'ReFo 15 (base 4, +2 Sun, constant): Personal Power (15 levels, −2 Might cost)', mastery: { cost: 2 }, line: 1758,
    text: 'Flies in any direction by concentrating; if distracted, control is lost but the power still holds the character aloft.',
  },
  {
    name: 'Grant (Major Flaw)', kind: 'ritual', level: 50, stats: '10 points, Init Qik − 20, Vim', rdt: 'R: Touch, D: Mom, T: Ind, Ritual', design: 'No Hermetic equivalent: Ritual Power ×2', choose: 'Major Flaw', line: 1766,
    text: 'Imposes the named Major Flaw, permanently (a ritual-like power, costing Might Score as well as pool) or temporarily (the Might points come back only when it is withdrawn). A creature may have several, each a different Flaw.',
  },
  {
    name: 'Grant (Minor Flaw)', kind: 'ritual', level: 25, stats: '5 points, Init Qik − 10, Vim', rdt: 'R: Touch, D: Mom, T: Ind, Ritual', design: 'No Hermetic equivalent: Ritual Power', choose: 'Minor Flaw', line: 1774,
    text: 'Imposes the named Flaw, permanently or temporarily, as Grant (Major Flaw).',
  },
  {
    name: 'Grant Puissance in (Ability)', kind: 'lesser', level: 20, stats: '4 points, Init Qik − 3, Corpus', rdt: 'R: Voice, D: Sun, T: Group', design: 'MuCo 20 (base 2, +2 Voice, +2 Sun, +2 Group): Lesser Power (20 levels, +1 Init)', mastery: { init: 1 }, choose: 'Ability', line: 1783,
    text: 'For each Might point invested, ten men gain +1 to all rolls in a general situation (combat, woodcraft), or one man +3 to a specific Total or Ability. The points come back only when it is withdrawn.',
  },
  {
    name: 'Grant (Major Virtue)', kind: 'ritual', level: 50, stats: '10 points, Init Qik − 20, Vim', rdt: 'R: Touch, D: Mom, T: Ind, Ritual', design: 'No Hermetic equivalent: Ritual Power ×2', choose: 'Major Virtue', line: 1792,
    text: 'Bestows the named Major Virtue, permanently (costing Might Score as well as pool) or temporarily (the points come back when it is withdrawn).',
  },
  {
    name: 'Grant (Minor Virtue)', kind: 'ritual', level: 25, stats: '5 points, Init Qik − 10, Vim', rdt: 'R: Touch, D: Mom, T: Ind, Ritual', design: 'No Hermetic equivalent: Ritual Power', choose: 'Minor Virtue', line: 1801,
    text: 'Bestows the named Minor Virtue, permanently or temporarily, as Grant (Major Virtue).',
  },
  {
    name: 'Guide', kind: 'greater', level: 30, stats: '3 points, Init Qik + 1, Mentem', rdt: 'R: Voice, D: Conc, T: Group', design: 'ReMe 30 (base 5, +2 Voice, +1 Conc, +2 Group): Greater Power (30 levels, +4 Init)', mastery: { init: 4 }, line: 1810,
    text: 'Subtly steers a group toward a course of action or a place; the storyguide gives advice as Common Sense does, but serving the creature’s agenda. There is no compulsion to follow it.',
  },
  {
    name: 'Hands of the Magical Animal', kind: 'personal', level: 15, stats: '0 points, Init Qik − 2, the appropriate Form', rdt: 'R: Touch, D: Sun, T: Ind', design: 'ReTe 15 (base 3, +1 Touch, +2 Sun, +1 constant): Personal Power (15 levels, −2 Might cost)', mastery: { cost: 2 }, line: 1819,
    text: 'An animal handles and carries an item as with human hands and Strength +5; it must concentrate to do anything but carry it.',
  },
  {
    name: 'Healing', kind: 'ritual', level: 30, stats: '3 points, Init Qik − 9, Animal or Corpus', rdt: 'R: Touch, D: Mom, T: Ind, Ritual', design: 'CrCo 30 (base 25, +1 Touch): Ritual Power ×2 (30 levels, −3 Might cost, +1 Init)', mastery: { cost: 3, init: 1 }, line: 1828,
    text: 'The worst of the target’s wounds improves a level when the recipient performs a set action (drinking from a sacred spring, swearing a vow). A genius loci heals all wounds of a creature native to its locus.',
  },
  {
    name: 'Human Shape', kind: 'personal', level: 20, stats: '1 point, Init Qik − 2, Corpus', rdt: 'R: Per, D: Sun, T: Ind', design: 'MuFo 20 (base 10, +2 Sun): Personal Power (20 levels, −1 Might cost)', mastery: { cost: 1 }, line: 1837,
    text: 'Takes the shape of a normal human being, to move through mundane society relatively unnoticed.',
  },
  {
    name: 'Master of (Form)', kind: 'focus', level: 25, stats: 'Variable points, Init Qik − Might cost, the Form', rdt: 'R: varies, D: varies, T: varies', design: 'Mu(Form) or Pe(Form) 25: Focus Power', choose: 'Form', line: 1846,
    text: 'Duplicates any of a range of non-Ritual Muto or Perdo spells of the Form, at 1 Might point per magnitude, no higher than the creature’s Might or 25.',
  },
  {
    name: 'Oath-Swearing', kind: 'ritual', level: 50, stats: '10 points, Init Qik − 10, Vim', rdt: 'R: Touch, D: Mom, T: Group, Ritual', design: 'No Hermetic equivalent: Ritual Power (the book gives 10 points, which a level-50 power costs: the Quality taken twice)', line: 1855,
    text: 'Enforces a freely sworn oath (it must Penetrate every party). One who acts against it knows, and if they carry on gains a Minor Flaw, lifted by swearing again before the others. It lasts while the oath is remembered or written. Its Might points regenerate normally.',
  },
  {
    name: 'Sight Beyond Sight', kind: 'personal', level: 30, stats: '1 point, Init Qik, the appropriate Form', rdt: 'R: Per, D: Conc, T: Vision', design: 'InIm 30 (base 5, +1 Conc, +4 Vision): Personal Power ×2 (−2 Might cost, +2 Init)', mastery: { cost: 2, init: 2 }, line: 1864,
    text: 'All five senses work at a distance, as far as the creature can see: it is exceptionally hard to surprise.',
  },
];
