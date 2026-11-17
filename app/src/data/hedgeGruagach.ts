// The Gruagachan (Hedge Magic, Revised Edition, Chapter Four): two Techniques (Give, Take; Difficult
// Arts raised as Abilities) and four Forms (Blessing, Curse, Shape, Vision; raised as Arts), Formulaic
// spells varied by two magnitudes, spontaneous spells that always tire, tattoos enchanted as lesser
// devices, the Geas and Limit Durations, and Pictish, which stands for Magic Theory and caps the Arts.

import type { AbilityDef } from './types';

export type GruagachTechnique = 'Gv' | 'Ta';
export type GruagachForm = 'Bl' | 'Cu' | 'Sh' | 'Vs';
export type GruagachArts = `${GruagachTechnique}${GruagachForm}`;

const src = (line: number) => ({ book: 'HMRE', line });

export const GRUAGACH_TECHNIQUES: { abbr: GruagachTechnique; id: string; virtue: string; name: string; text: string }[] = [
  { abbr: 'Gv', id: 'gruagach-give', virtue: 'give', name: 'Give', text: 'Grants blessings, inflicts curses and geasa, imparts shapes and provides visions.' },
  { abbr: 'Ta', id: 'gruagach-take', virtue: 'take', name: 'Take', text: 'Removes something from a target, or acquires it: lifts hostile magic, gains knowledge, takes away Virtues and Abilities.' },
];

export const GRUAGACH_FORMS: { abbr: GruagachForm; id: string; virtue: string; name: string; text: string }[] = [
  { abbr: 'Bl', id: 'gruagach-blessing', virtue: 'blessing', name: 'Blessing', text: 'Virtues, Ability bonuses and better Characteristics, always balanced by a prohibition that ends them (Limit Duration).' },
  { abbr: 'Cu', id: 'gruagach-curse', virtue: 'curse', name: 'Curse', text: 'Flaws and lowered Characteristics and Abilities, with a condition that lifts them; Take Curse removes curses and lingering magic.' },
  { abbr: 'Sh', id: 'gruagach-shape', virtue: 'shape', name: 'Shape', text: 'Changes the shape of oneself or a willing target (Give), or forces another into a form (Take).' },
  { abbr: 'Vs', id: 'gruagach-vision', virtue: 'vision', name: 'Vision', text: 'Illusions, senses beyond the normal, finding vis; at its height, a glimpse of a possible future.' },
];

export const gruagachArtName = (tf: GruagachArts) => `${GRUAGACH_TECHNIQUES.find((t) => t.abbr === tf.slice(0, 2))!.name} ${GRUAGACH_FORMS.find((f) => f.abbr === tf.slice(2))!.name}`;

export const GRUAGACH_ART_IDS = [...GRUAGACH_TECHNIQUES.map((t) => t.id), ...GRUAGACH_FORMS.map((f) => f.id)];

const GRUAGACH_ABILITIES: AbilityDef[] = [
  ...GRUAGACH_TECHNIQUES.map(
    (t): AbilityDef => ({
      id: t.id, name: `${t.name} (Gruagach)`, type: 'Supernatural', restricted: true, specialties: ['a Form', 'spontaneous spells', 'tattoos'], source: src(2862),
      text: `Gruagach Technique (Hedge Magic): a Difficult Art, raised as an Ability. ${t.text} Casting Score: Technique + Form + Stamina + aura; Lab Total: Technique + Form + Intelligence + Pictish + aura. Arts are held by Pictish: 5 at Pictish 1, 15 at 2, 30 at 3.`,
    }),
  ),
  ...GRUAGACH_FORMS.map(
    (f): AbilityDef => ({
      id: f.id, name: `${f.name} (Gruagach)`, type: 'Supernatural', restricted: true, asArt: true, specialties: ['a Technique', 'spontaneous spells', 'tattoos'], source: src(2872),
      text: `Gruagach Form (Hedge Magic): opens at 0 and rises as an Art. ${f.text}`,
    }),
  ),
];

export function gruagachAbilityDefs(existing: Set<string>): AbilityDef[] {
  return GRUAGACH_ABILITIES.filter((a) => !existing.has(a.id));
}

export interface GruagachParam {
  name: string;
  /** magnitudes: for Range, the first for Shape and Vision and the second for Blessing and Curse */
  magnitude: number;
  blessCurse?: number;
  note?: string;
}

/** The parameters a gruagach spell may take; Blessing and Curse start from Conversation. */
export const GRUAGACH_PARAMS: { ranges: GruagachParam[]; durations: GruagachParam[]; targets: GruagachParam[] } = {
  ranges: [
    { name: 'Personal', magnitude: 0, blessCurse: 0 },
    { name: 'Conversation', magnitude: 1, blessCurse: 0, note: 'In conversation, within about three paces; the target hears the spell' },
    { name: 'Voice', magnitude: 2, blessCurse: 1 },
  ],
  durations: [
    { name: 'Momentary', magnitude: 0 },
    { name: 'Diameter', magnitude: 1 },
    { name: 'Sun', magnitude: 2 },
    { name: 'Moon', magnitude: 3 },
    { name: 'Limit', magnitude: 0, note: 'Until a condition ends it: by the prohibition below' },
    { name: 'Geas', magnitude: 0, note: 'A prohibition that brings a Limit effect when broken: the larger of the two' },
  ],
  targets: [
    { name: 'Individual', magnitude: 0 },
    { name: 'Group', magnitude: 1 },
    { name: 'Bloodline', magnitude: 2 },
  ],
};

export type Prohibition = 'sweeping' | 'general' | 'specific';

/** Geas and Limit magnitudes: a sweeping geas is hardest, a sweeping limit (easily lifted) easiest. */
export const GEAS_MAGNITUDES: Record<Prohibition, number> = { sweeping: 4, general: 2, specific: 1 };
export const LIMIT_MAGNITUDES: Record<Prohibition, number> = { sweeping: 1, general: 2, specific: 4 };

/** Poetic justice: the bonus to the victim's Stamina roll against a geas or curse. */
export const POETIC_JUSTICE: { modifier: number; text: string }[] = [
  { modifier: -6, text: 'The geas and/or curse are perfectly appropriate to some past event' },
  { modifier: -3, text: 'Appropriate to some past act of the victim' },
  { modifier: 0, text: 'Only one of the two is mildly appropriate' },
  { modifier: 3, text: 'Both are mildly inappropriate' },
  { modifier: 6, text: 'One of the two is inappropriate' },
  { modifier: 9, text: 'Both are inappropriate' },
];

/** The animal shapes of tattoos and their bonuses (each held to Pictish). */
export const GRUAGACH_SHAPES: { shape: string; bonuses: string }[] = [
  { shape: 'Bear', bonuses: '+3 Strength, +5 defense vs. attacks' },
  { shape: 'Bird', bonuses: '+5 magical flight' },
  { shape: 'Boar', bonuses: '+3 ferocity, +4 attacking' },
  { shape: 'Bull', bonuses: '+3 Stamina' },
  { shape: 'Crow', bonuses: '+3 Communication, +5 granting knowledge or wisdom' },
  { shape: 'Dove', bonuses: '+6 granting visions or premonitions' },
  { shape: 'Eagle', bonuses: '+7 improving eyesight, +3 Perception' },
  { shape: 'Goat, wild', bonuses: '+3 Dexterity' },
  { shape: 'Hawk', bonuses: '+3 Quickness' },
  { shape: 'Horse', bonuses: '+3 Stamina, +5 magical movement' },
  { shape: 'Lion', bonuses: '+3 Presence, +5 bravery' },
  { shape: 'Partridge', bonuses: '+6 concealment' },
  { shape: 'Salmon', bonuses: '+4 granting longevity' },
  { shape: 'Stag', bonuses: '+5 improving hearing, +6 virility' },
  { shape: 'Swan', bonuses: '+4 granting luck' },
  { shape: 'Wolf', bonuses: '+6 improving smelling, +7 ferocity' },
];

/** A tattoo's material: 2 times its size (an ear 1, a palm or forehead 2, a limb or the scalp 3, a back or chest 4). */
export const TATTOO_SIZES: { name: string; mult: number }[] = [
  { name: 'tiny (an ear)', mult: 1 },
  { name: 'a palm or forehead', mult: 2 },
  { name: 'a limb or the scalp', mult: 3 },
  { name: 'a back or chest', mult: 4 },
];
