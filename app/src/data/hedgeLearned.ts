// The Learned Magicians (Hedge Magic, Revised Edition, Chapter Four): the Mathematici of Bologna.
// Three Techniques (Difficult Arts, which advance as Abilities) and three Forms (which advance as
// Arts), verbal charms cast from memory or read from a formulary, and two kinds of device written
// out with a horoscope: chartae (one use, made in hours) and amulets (charged, made in a season).
// Mythic Alchemy, which the book adds, is kept here as an Ability.

import type { AbilityDef } from './types';

export type LearnedTechnique = 'Tu' | 'Su' | 'Vu';
export type LearnedForm = 'Fa' | 'Ma' | 'Sa';
export type LearnedArts = `${LearnedTechnique}${LearnedForm}`;

const src = (line: number) => ({ book: 'HMRE', line });

export const LEARNED_TECHNIQUES: { abbr: LearnedTechnique; id: string; name: string; text: string; vis: string; defense: string }[] = [
  { abbr: 'Tu', id: 'tueor', name: 'Tueor', text: 'I guard: protects the target from a specific harm; the rarer or narrower the harm, the easier the charm.', vis: 'Rego', defense: 'Alacritous Fortune: a defense against Terram effects' },
  { abbr: 'Su', id: 'succurro', name: 'Succurro', text: 'I aid: enhances what the target already has (as Creo), never creating from nothing or healing at once.', vis: 'Creo', defense: 'Accelerated Expiry: a defense against Corpus or Mentem effects' },
  { abbr: 'Vu', id: 'vulnero', name: 'Vulnero', text: 'I harm: worsens the target (as Perdo), most easily what is already weak; it never removes an aspect wholly.', vis: 'Perdo', defense: 'Confounding Magics: a defense against Corpus effects' },
];

export const LEARNED_FORMS: { abbr: LearnedForm; id: string; name: string; text: string; vis: string; defense: string }[] = [
  { abbr: 'Fa', id: 'fortunam', name: 'Fortunam', text: 'Luck: small chances that turn a roll or an event for or against the target. It has no Hermetic equivalent.', vis: 'Vim', defense: 'Confounding Magics: a defense against Mentem effects' },
  { abbr: 'Ma', id: 'magicam', name: 'Magicam', text: 'Magic: grants or improves Supernatural powers of the Magic realm, strengthens charms and amulets, or wards off hostile magic (as Vim).', vis: 'Vim', defense: 'Confounding Magics: a defense against Vim effects on the magician’s charms' },
  { abbr: 'Sa', id: 'salutem', name: 'Salutem', text: 'Health: disease, age, injury and infirmity of any living thing, person, beast or plant; never more than its natural best.', vis: 'Corpus, Animal, Herbam or Mentem by the target (an element for a ward)', defense: 'Magical Fortitude: a defense against Corpus effects' },
];

export const learnedArtName = (tf: LearnedArts) => `${LEARNED_TECHNIQUES.find((t) => t.abbr === tf.slice(0, 2))!.name} ${LEARNED_FORMS.find((f) => f.abbr === tf.slice(2))!.name}`;

/** The Ability ids of the six Arts. */
export const LEARNED_ART_IDS = [...LEARNED_TECHNIQUES.map((t) => t.id), ...LEARNED_FORMS.map((f) => f.id)];

/** Each Art at its own heading (Hedge Magic, The Arts), not at the Virtue of the same name. */
const OWN_HEADING: Record<string, number> = { tueor: 4406, succurro: 4415, vulnero: 4422, fortunam: 4431, magicam: 4436, salutem: 4441 };

const LEARNED_ABILITIES: AbilityDef[] = [
  ...LEARNED_TECHNIQUES.map(
    (t): AbilityDef => ({
      id: t.id, name: t.name, type: 'Supernatural', restricted: true, specialties: ['a Form', 'charms', 'amulets'], source: src(OWN_HEADING[t.id]),
      text: `Learned Magician Technique (Hedge Magic): a Difficult Art, bought and raised as an Ability. ${t.text} Casting Score: Technique + Form + Communication + aura; Lab Total: Technique + Form + Intelligence + Artes Liberales + aura. Vis: ${t.vis}. Magic Defense: ${t.defense}.`,
    }),
  ),
  ...LEARNED_FORMS.map(
    (f): AbilityDef => ({
      id: f.id, name: f.name, type: 'Supernatural', restricted: true, asArt: true, specialties: ['a Technique', 'charms', 'amulets'], source: src(OWN_HEADING[f.id]),
      text: `Learned Magician Form (Hedge Magic): opens at 0 and rises as an Art. ${f.text} Vis: ${f.vis}. Magic Defense: ${f.defense}.`,
    }),
  ),
  {
    id: 'mythic-alchemy', name: 'Mythic Alchemy', type: 'Supernatural', restricted: true, specialties: ['metals', 'reagents', 'vis extraction'], source: src(4167),
    text: 'Mythic Alchemy (Hedge Magic): truly transmutes matter, always in a season in an alchemical laboratory. Its score adds to the Lab Total (Intelligence + Philosophiae) for alchemical reagents (Art & Academe), and it opens reagents others cannot make. A learned magician with it extracts vis as a magus does, with the Succurro Magicam Lab Total, and Mythic Alchemy in place of Magic Theory for the pawns a season. It can prepare a craftsman’s raw materials, lowering the Ease Factor of superior goods (City & Guild).',
  },
];

export function learnedAbilityDefs(existing: Set<string>): AbilityDef[] {
  return LEARNED_ABILITIES.filter((a) => !existing.has(a.id));
}

/** The book's Lore of the Mathematici, an Organization Lore; any (Organization) Lore stands for it. */
export const MATHEMATICI_LORE = 'Lore of the Mathematici';

export interface LearnedParam {
  name: string;
  magnitude: number;
  note?: string;
}

/** A charm's parameters: the base is Personal, Momentary, Individual. */
export const CHARM_PARAMS: { ranges: LearnedParam[]; durations: LearnedParam[]; targets: LearnedParam[] } = {
  ranges: [
    { name: 'Personal', magnitude: 0 },
    { name: 'Touch', magnitude: 1 },
    { name: 'Eye', magnitude: 1 },
    { name: 'Voice', magnitude: 2 },
  ],
  durations: [
    { name: 'Momentary', magnitude: 0 },
    { name: 'Diameter', magnitude: 1, note: 'Two minutes' },
    { name: 'Sun', magnitude: 2, note: 'Until the next sunrise or sunset' },
  ],
  targets: [
    { name: 'Individual', magnitude: 0 },
    { name: 'Group', magnitude: 1 },
  ],
};

/** An amulet's or a charta's parameters: always Touch; the base is Touch, Momentary, Individual. */
export const DEVICE_PARAMS: { ranges: LearnedParam[]; durations: LearnedParam[]; targets: LearnedParam[] } = {
  ranges: [{ name: 'Touch', magnitude: 0, note: 'The device must touch its target' }],
  durations: [
    { name: 'Momentary', magnitude: 0 },
    { name: 'Sun', magnitude: 1 },
    { name: 'Moon', magnitude: 2 },
    { name: 'Season', magnitude: 3, note: 'Until the next solstice or equinox' },
  ],
  targets: [
    { name: 'Individual', magnitude: 0 },
    { name: 'Group', magnitude: 1, note: 'Carried by the group’s leader' },
    { name: 'Bloodline', magnitude: 2 },
    { name: 'Structure', magnitude: 3, note: 'Placed near the main entrance' },
    { name: 'Boundary', magnitude: 4, note: 'Placed near the main entrance' },
  ],
};

/** The book's Initiations for an unGifted mathematicus (each a Virtue and the Flaws its Ordeal leaves). */
export const LEARNED_INITIATIONS: { art: string; ease: number; script: number; test: string; flaws: string }[] = [
  { art: 'Tueor', ease: 21, script: 20, test: 'Philosophiae 2', flaws: 'Short-Ranged Magic (Major), Short-Lived Magic (Minor)' },
  { art: 'Fortunam', ease: 15, script: 14, test: 'Theology 2', flaws: 'Careless Sorcerer, Weird Magic (Minor)' },
  { art: 'Magicam', ease: 15, script: 14, test: 'Magic Lore 2', flaws: 'Weak Magic, Warped Magic (Minor)' },
  { art: 'Salutem', ease: 15, script: 14, test: 'Medicine 2', flaws: 'No Magical Defenses, Incompatible Hedge Arts (Vulnero and Salutem) (Minor)' },
  { art: 'Entreat the Divine Powers', ease: 15, script: 14, test: 'Divine Lore 2', flaws: 'Intervention Prone (Major)' },
];

/**
 * Mythic Herbalism (HMRE, the learned magicians' Virtues): what a concoction does at each Ease Factor, as a
 * cure, a poison (the poison's own Ease Factor and the wound it deals) or a potion of physical vigor.
 */
export const HERBALISM_TABLE: { ease: number; healing: string; poison: string; physical: string; source: { book: string; line: number } }[] = [
  { ease: 3, healing: 'Mythic Herbalism added to the Stamina roll to resist all disease', poison: 'Ease Factor 6, sleep', physical: '+2 to Fatigue rolls', source: src(4221) },
  { ease: 6, healing: 'None of the patient’s Wounds grows worse for a day', poison: 'Ease Factor 6, a Light Wound', physical: 'Ignore Wound penalties up to Medium Wounds', source: src(4226) },
  { ease: 9, healing: 'Mythic Herbalism × 2 to a Recovery roll', poison: 'Ease Factor 9, a Medium Wound', physical: '+3 to Soak', source: src(4231) },
  { ease: 12, healing: 'Mythic Herbalism × 3 to a Recovery roll', poison: 'Ease Factor 9, a Heavy Wound', physical: 'Ignore one level of Fatigue', source: src(4236) },
  { ease: 15, healing: 'Mythic Herbalism × 4 to a Recovery roll', poison: 'Ease Factor 9, an Incapacitating Wound', physical: '+5 to Soak', source: src(4241) },
  { ease: 18, healing: 'Heal the lasting aftereffects of a disease, poison or injury', poison: 'Ease Factor 9, death', physical: 'One physical Characteristic from negative to 0', source: src(4246) },
  { ease: 21, healing: 'Resolve a major aging crisis', poison: 'Antidote: heal a Medium Wound caused by poison', physical: 'One physical Characteristic to +1', source: src(4251) },
  { ease: 24, healing: 'Resolve one terminal aging crisis', poison: 'Antidote: heal an Incapacitating Wound caused by poison', physical: 'One physical Characteristic to +2', source: src(4256) },
];
