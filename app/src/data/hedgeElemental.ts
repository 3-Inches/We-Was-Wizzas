// The Elementalists (Hedge Magic, Revised Edition, Chapter Two): four Techniques (Summoning,
// Controlling, Divining, Refining) and four Forms (Air, Earth, Fire, Water), all Difficult Arts raised
// as Abilities. Each Technique is learned for a type of target: Medicinal (the humors of the body),
// Philosophical (natural matter, weather and animals) or Theurgical (elementals and beings of Might).

import type { AbilityDef } from './types';

const src = (line: number) => ({ book: 'HMRE', line });

export type ElementId = 'air' | 'earth' | 'fire' | 'water';
export type ElementalTechniqueId = 'summoning' | 'controlling' | 'divining' | 'refining';
export type ElementalType = 'Medicinal' | 'Philosophical' | 'Theurgical';

export const ELEMENTAL_TYPES: ElementalType[] = ['Medicinal', 'Philosophical', 'Theurgical'];

export const ELEMENTS: {
  id: ElementId;
  ability: string;
  name: string;
  trait: string;
  opposes: ElementId;
  hermetic: string;
  soak: string;
  types: Record<ElementalType, string>;
}[] = [
  {
    id: 'air', ability: 'elementalist-air', name: 'Elementalist Air', trait: 'Sanguine', opposes: 'earth', hermetic: 'Auram',
    soak: 'asphyxiation, poisonous gases, wind, hail and lightning',
    types: { Medicinal: 'the sanguine humor: lightheadedness, diseases of the blood (quotidian fever)', Philosophical: 'weather, and sanguine animals such as birds', Theurgical: 'air elementals and beings of Auram' },
  },
  {
    id: 'earth', ability: 'elementalist-earth', name: 'Elementalist Earth', trait: 'Melancholic', opposes: 'air', hermetic: 'Terram',
    soak: 'suffocation, metal and stone weapons, crushing blows, falls onto solid ground',
    types: { Medicinal: 'the melancholic humor: sadness, constriction', Philosophical: 'earth and its minerals, and melancholic animals (cattle, mice, badgers)', Theurgical: 'earth elementals and beings of Terram' },
  },
  {
    id: 'fire', ability: 'elementalist-fire', name: 'Elementalist Fire', trait: 'Choleric', opposes: 'water', hermetic: 'Ignem',
    soak: 'extreme heat, blinding light, flames',
    types: { Medicinal: 'the choleric humor: anger, tertian fever', Philosophical: 'heat and flame, and choleric animals (horses, predators)', Theurgical: 'fire elementals and beings of heat and light' },
  },
  {
    id: 'water', ability: 'elementalist-water', name: 'Elementalist Water', trait: 'Phlegmatic', opposes: 'fire', hermetic: 'Aquam',
    soak: 'thirst, drowning, poisonous drink, falls onto water, great waves',
    types: { Medicinal: 'the phlegmatic humor: listlessness, flux', Philosophical: 'liquids, and phlegmatic animals that swim or creep', Theurgical: 'water elementals and beings of cold and liquid' },
  },
];

export const ELEMENTAL_TECHNIQUES: { id: ElementalTechniqueId; ability: string; name: string; char: 'Sta' | 'Pre' | 'Per' | 'Int'; cost: string; text: string }[] = [
  { id: 'summoning', ability: 'elemental-summoning', name: 'Summoning', char: 'Sta', cost: 'a long-term Fatigue level', text: 'Draws the element, an animal or an elemental to the elementalist’s side; the total sets the greatest Size and Might it reaches. Minutes to hours.' },
  { id: 'controlling', ability: 'elemental-controlling', name: 'Controlling', char: 'Pre', cost: 'a Fatigue level', text: 'Commands what is summoned or met, a round of gesture and incantation; it must penetrate, but a target held in its container counts the effect as level 0.' },
  { id: 'divining', ability: 'elemental-divining', name: 'Divining', char: 'Per', cost: 'no Fatigue', text: 'Senses targets within a hundred paces while concentrating (the total beats their Size), and understands one touched; finds vis of the element.' },
  { id: 'refining', ability: 'elemental-refining', name: 'Refining', char: 'Int', cost: 'a season in a workshop', text: 'Purifies or breaks down a target over a season, often yielding vis of the element; makes a longevity potion.' },
];

/** The Ability each type of Refining adds to its total. */
export const REFINING_ABILITY: Record<ElementalType, string> = { Medicinal: 'medicine', Philosophical: 'philosophiae', Theurgical: 'magic-lore' };

/** The Summoning chart: a total reaches a target of this Might and Size. */
export const SUMMONING_CHART: { total: number; size: number; note: string }[] = [
  { total: 0, size: -21, note: 'nonexistent' },
  { total: 1, size: -18, note: 'too small to perceive' },
  { total: 2, size: -15, note: 'an insect, a kernel of grain' },
  { total: 3, size: -12, note: 'a baby mouse, 10 insects' },
  { total: 4, size: -9, note: 'a bat, a frog' },
  { total: 5, size: -6, note: 'a lizard, a stoat' },
  { total: 10, size: -3, note: 'a badger, a cat' },
  { total: 15, size: 0, note: 'an adult, ten cats' },
  { total: 20, size: 3, note: 'a war horse, ten adults' },
  { total: 25, size: 6, note: 'a killer whale, 100 adults' },
  { total: 30, size: 9, note: 'a humpbacked whale, 100 horses' },
  { total: 35, size: 12, note: 'a tower, a castle' },
  { total: 40, size: 15, note: 'a village, a storm' },
  { total: 45, size: 18, note: 'a city, a river' },
  { total: 50, size: 21, note: 'a mountain, the sea' },
];

/** Each Elementalist Form and Technique at its own heading (Hedge Magic, Elementalist Forms and Techniques). */
const OWN_HEADING: Record<string, number> = {
  'elementalist-air': 1115, 'elementalist-earth': 1129, 'elementalist-fire': 1141, 'elementalist-water': 1151,
  'elemental-summoning': 1167, 'elemental-controlling': 1234, 'elemental-divining': 1268, 'elemental-refining': 1296,
};

const ELEMENTAL_ABILITIES: AbilityDef[] = [
  ...ELEMENTAL_TECHNIQUES.map(
    (t): AbilityDef => ({
      id: t.ability, name: `${t.name} (Elementalist)`, type: 'Supernatural', restricted: true, specialties: ['Medicinal', 'Philosophical', 'Theurgical', 'an element'], source: src(OWN_HEADING[t.ability]),
      text: `Elementalist Technique (Hedge Magic): a Difficult Art, raised as an Ability. Total: stress die + ${({ Sta: 'Stamina', Pre: 'Presence', Per: 'Perception', Int: 'Intelligence' } as const)[t.char]} + ${t.name} + the Elementalist Form + aura${t.id === 'refining' ? ' + the type’s Ability (Medicine, Philosophiae or Realm Lore), with no die' : ''}; it costs ${t.cost}. ${t.text}`,
    }),
  ),
  ...ELEMENTS.map(
    (e): AbilityDef => ({
      id: e.ability, name: e.name, type: 'Supernatural', restricted: true, specialties: ['Medicinal', 'Philosophical', 'Theurgical'], source: src(OWN_HEADING[e.ability]),
      text: `Elementalist Form (Hedge Magic): a Difficult Art, raised as an Ability. Medicinal: ${e.types.Medicinal}. Philosophical: ${e.types.Philosophical}. Theurgical: ${e.types.Theurgical}. The ${e.trait} Trait adds to Soak against ${e.soak}. Vis: ${e.hermetic}.`,
    }),
  ),
];

export function elementalAbilityDefs(existing: Set<string>): AbilityDef[] {
  return ELEMENTAL_ABILITIES.filter((a) => !existing.has(a.id));
}

export const ELEMENTAL_ART_IDS = [...ELEMENTAL_TECHNIQUES.map((t) => t.ability), ...ELEMENTS.map((e) => e.ability)];

/** The Virtue that opens each Technique: (Type) Summoning and the rest, taken once for each type. */
export const TECHNIQUE_VIRTUE: Record<ElementalTechniqueId, string> = { summoning: 'type-summoning', controlling: 'type-controlling', divining: 'type-divining', refining: 'type-refining' };

/** The Major Virtues that let the highest Form stand for several elements, held to an Ability. */
export const ELEMENTAL_MASTERY: Record<string, string | undefined> = { 'elementalist-magic': undefined, 'elemental-medicine': 'medicine', 'elemental-philosophiae': 'philosophiae', 'elemental-theurgy': 'magic-lore' };
