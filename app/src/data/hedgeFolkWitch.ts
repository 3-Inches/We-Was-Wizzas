// The Folk Witches (Hedge Magic, Revised Edition, Chapter Three): what the extracted Virtue and
// Ability lists lack. Seven favored Supernatural Abilities used by potion, incantation or fetish;
// Folk Witch Magic Theory for the kitchen (their laboratory); the Witch Moon in place of Twilight.
// Cursing, Healing and Flight are kept apart from the Divine power and other books' versions.

import type { AbilityDef, VFCategory, VirtueFlawDef } from './types';

const src = (line: number) => ({ book: 'HMRE', line });

const v = (id: string, name: string, kind: 'virtue' | 'flaw', size: 'Major' | 'Minor' | 'Free', category: VFCategory, line: number, text: string): VirtueFlawDef => ({
  id, name, kind, sizes: [size], categories: [category], tainted: false, source: src(line), text,
});

const FOLK_VF: VirtueFlawDef[] = [
  v('folk-witch', 'Folk Witch', 'virtue', 'Free', 'Social Status', 1586, 'Trained as a folk witch: she brews potions and works in her kitchen, uses the folk witch casting methods with her Supernatural Abilities and has their Magical Defenses, and belongs to a coven that meets at sabbats. Not supported by a covenant, she spends two seasons a year supporting herself, usually with magical services to her community. Compatible with many other Social Statuses, and with Wealthy and Poor.'),
  v('flawed-folk-witch-gift-opening', 'Flawed Folk Witch Gift Opening', 'flaw', 'Minor', 'Hermetic', 1590, 'One of the seven folk witch Abilities is not favored and cannot be learned at character creation; learned later, as any Supernatural Ability, it takes −1 on all its totals. Gifted folk witches only; may be taken for several Abilities.'),
  v('witch-cursing', 'Cursing (Folk Witch)', 'virtue', 'Major', 'Supernatural', 1594, 'The folk witch can cast curses on other characters: a score of 1 in the Supernatural Ability Cursing (Folk Witch), worked through a curse fetish or a potion.'),
  v('witch-healing', 'Healing (Folk Witch)', 'virtue', 'Major', 'Supernatural', 1598, 'The folk witch can heal characters: a score of 1 in the Supernatural Ability Healing (Folk Witch), by incantation or potion, at a cost in Corpus vis.'),
  v('life-linked-folk-witch-magic', 'Life-Linked Folk Witch Magic', 'virtue', 'Major', 'Supernatural', 1602, 'The folk witch may spend Fatigue levels to boost her Casting Total: +5 for each.'),
  v('animal-healer', 'Animal Healer', 'virtue', 'Minor', 'Supernatural', 1606, 'A score of 1 in the Supernatural Ability Animal Healing, which works as Healing on animals (with Animal vis). Potions can be made with it.'),
  v('concentrated-potions', 'Concentrated Potions', 'virtue', 'Minor', 'Supernatural', 1610, 'Up to four times Folk Witch Magic Theory in vis in a season of brewing potions, double the usual.'),
  v('expert-potion-brewer', 'Expert Potion Brewer', 'virtue', 'Minor', 'Supernatural', 1614, 'The Supernatural Ability counts double in the Lab Total for brewing potions, raising the Brew Potency.'),
  v('witch-flight', 'Flight (Folk Witch)', 'virtue', 'Minor', 'Supernatural', 1618, 'The folk witch can fly: a score of 1 in the Supernatural Ability Flight (Folk Witch).'),
  v('painless-moon', 'Painless Moon', 'virtue', 'Minor', 'Supernatural', 1622, 'No Medium Wound during each month of the Witch Moon.'),
  v('well-trained-folk-witch', 'Well-Trained Folk Witch', 'virtue', 'Minor', 'General', 1626, '+50 experience points to spend during apprenticeship. May be taken several times.'),
  v('primitive-tradition-flaw', 'Primitive Tradition', 'flaw', 'Major', 'Supernatural', 1630, 'The folk witch cannot brew potions.'),
  v('rarefied-tradition-flaw', 'Rarefied Tradition', 'flaw', 'Major', 'Supernatural', 1634, 'She uses her Supernatural Abilities only through potions she brews and drinks, never by incantation or fetish.'),
  v('harsh-moon-flaw', 'Harsh Moon', 'flaw', 'Minor', 'Supernatural', 1638, 'A Heavy Wound, not a Medium one, during each month of the Witch Moon.'),
  v('short-ranged-curses-flaw', 'Short-Ranged Curses', 'flaw', 'Minor', 'Supernatural', 1642, 'Her curses work only while the fetish is within 100 yards of the target: disease, aging and miscarriage strike when the target comes in range; the lasting curses cease out of range and resume (penetrating again) in it.'),
  v('silent-tradition-flaw', 'Silent Tradition', 'flaw', 'Minor', 'Supernatural', 1646, 'She cannot use the incantation casting method. Not with Rarefied Tradition.'),
  v('unstable-magic-flaw', 'Unstable Magic', 'flaw', 'Minor', 'Supernatural', 1650, 'What she makes in the kitchen (potions, fetishes) stops working after a year and a day.'),
  v('poorly-trained-folk-witch-flaw', 'Poorly Trained Folk Witch', 'flaw', 'Minor', 'General', 1654, '−50 experience points to spend during apprenticeship.'),
];

export function folkWitchVirtueDefs(existing: Set<string>): VirtueFlawDef[] {
  return FOLK_VF.filter((x) => !existing.has(x.id));
}

export type WitchMethod = 'potion' | 'incantation' | 'fetish';

/** The seven favored powers, and Animal Healing: the Characteristic, the Form of vis and Magic Resistance, the methods. */
export const WITCH_POWERS: { id: string; virtue: string; name: string; char: 'Com' | 'Dex' | 'Per' | 'Sta'; form: string; methods: WitchMethod[]; defense: string; text: string }[] = [
  { id: 'animal-ken', virtue: 'animal-ken', name: 'Animal Ken', char: 'Com', form: 'Animal', methods: ['incantation', 'potion'], defense: 'Magical Fortitude against casters in animal form; Accelerated Expiry against effects through an Arcane Connection', text: 'Speak with animals (ArM5).' },
  { id: 'witch-cursing', virtue: 'witch-cursing', name: 'Cursing', char: 'Dex', form: 'Corpus, Mentem or Animal by the curse', methods: ['fetish', 'potion'], defense: '', text: 'A curse woven into a fetish over a season with an Arcane Connection to the target, penetrating all season; or a potion the target drinks.' },
  { id: 'dowsing', virtue: 'dowsing', name: 'Dowsing', char: 'Per', form: 'by the target (Vim for vis)', methods: ['fetish', 'potion'], defense: 'Confounding Magics against Mentem effects', text: 'Find things, and vis (ArM5).' },
  { id: 'witch-flight', virtue: 'witch-flight', name: 'Flight', char: 'Sta', form: 'Auram', methods: ['fetish', 'potion'], defense: 'Immovable Object against Corpus effects', text: 'Take to the air against 9, flying as fast as a galloping horse; a long-term Fatigue level with a fetish (none by potion), more on a botch. Flight adds to Attack and Defense against those who cannot fly.' },
  { id: 'witch-healing', virtue: 'witch-healing', name: 'Healing', char: 'Sta', form: 'Corpus', methods: ['incantation', 'potion'], defense: 'Magical Fortitude against Corpus effects', text: 'True healing of a Wound or a Fatigue level, at a cost in Corpus vis; it must penetrate.' },
  { id: 'second-sight', virtue: 'second-sight', name: 'Second Sight', char: 'Per', form: 'Vim', methods: ['incantation', 'potion'], defense: 'Accelerated Expiry against effects on her senses', text: 'See the invisible and through illusion (ArM5).' },
  { id: 'shapeshifter', virtue: 'shapeshifter', name: 'Shapeshifter', char: 'Sta', form: 'Animal', methods: ['fetish', 'potion'], defense: 'Strength of Form against Animal or Corpus effects', text: 'Take an animal’s shape, with a fetish of its skin (ArM5).' },
  { id: 'animal-healing', virtue: 'animal-healer', name: 'Animal Healing', char: 'Sta', form: 'Animal', methods: ['incantation', 'potion'], defense: '', text: 'Healing for animals, with Animal vis.' },
];

/** The curses and their Ease Factors. */
export const WITCH_CURSES: { name: string; ease: number; form: string; lasting: boolean; text: string }[] = [
  { name: 'Disease', ease: 9, form: 'Corpus', lasting: false, text: 'A fever and a Medium Wound; the disease runs its course, not a magical effect.' },
  { name: 'Miscarriage', ease: 9, form: 'Corpus', lasting: false, text: 'A Medium Wound to a pregnant woman; if it does not improve by the month’s end she miscarries.' },
  { name: 'Aging', ease: 12, form: 'Corpus', lasting: false, text: 'An Aging Crisis at once; it disrupts a longevity potion.' },
  { name: 'Emotion', ease: 12, form: 'Mentem', lasting: true, text: 'A strong emotion (love, hate, pity) toward another, with an Arcane Connection to each.' },
  { name: 'Tongue', ease: 15, form: 'Mentem', lasting: true, text: 'Forgets every language (a magus casts without words).' },
  { name: 'Paralysis', ease: 15, form: 'Corpus', lasting: true, text: 'Cannot move the limbs (a magus casts without gestures).' },
  { name: 'the Beast', ease: 18, form: 'Animal', lasting: true, text: 'Turned into a small animal: a frog, a newt, a rat.' },
  { name: 'Reduction', ease: 18, form: 'Corpus', lasting: true, text: 'Shrinks a Size level each month, to −18.' },
];

/** Healing: the Ease Factor and the Corpus vis for a Wound or a Fatigue level. */
export const WITCH_HEALING: { ease: number; wound: string; woundVis: number; fatigue: string; fatigueVis: number }[] = [
  { ease: 6, wound: 'Light Wound', woundVis: 3, fatigue: 'Winded', fatigueVis: 1 },
  { ease: 9, wound: 'Medium Wound', woundVis: 4, fatigue: 'Weary', fatigueVis: 2 },
  { ease: 12, wound: 'Heavy Wound', woundVis: 5, fatigue: 'Tired', fatigueVis: 3 },
  { ease: 15, wound: 'Incapacitating Wound', woundVis: 6, fatigue: 'Dazed', fatigueVis: 4 },
];

/** The fetish each power needs, made in a season with a pawn of vis. */
export const WITCH_FETISHES: Record<string, { name: string; vis: string }> = {
  dowsing: { name: 'a dowsing rod', vis: 'Intellego' },
  'witch-flight': { name: 'a flying broom', vis: 'Auram' },
  shapeshifter: { name: 'a knitted animal skin', vis: 'Animal' },
};

const FOLK_ABILITIES: AbilityDef[] = [
  {
    id: 'folk-witch-magic-theory', name: 'Folk Witch Magic Theory', type: 'Arcane', restricted: false, specialties: ['potions', 'fetishes', 'curses', 'vis'], source: src(1880),
    text: 'The technical lore of folk witch magic (Hedge Magic), used in the kitchen as Magic Theory is in a laboratory: Lab Total = Supernatural Ability + Intelligence + Folk Witch Magic Theory + aura. A brew makes this many doses; a season uses up to twice it in vis (four times with Concentrated Potions). Anyone may be taught it.',
  },
  ...WITCH_POWERS.filter((p) => p.id.startsWith('witch-') || p.id === 'animal-healing').map(
    (p): AbilityDef => ({
      id: p.id, name: p.id === 'animal-healing' ? 'Animal Healing' : `${p.name} (Folk Witch)`, type: 'Supernatural', restricted: true, specialties: p.id === 'witch-cursing' ? ['disease', 'emotion', 'a kind of curse'] : ['potions', p.methods[0]], source: src(1763),
      text: `Folk witch power (Hedge Magic). Casting Total: stress die + ${({ Com: 'Communication', Dex: 'Dexterity', Per: 'Perception', Sta: 'Stamina' } as const)[p.char]} + the Ability + aura, against an Ease Factor; Penetration: the total + the Penetration bonus − the Ease Factor. By ${p.methods.join(' or ')}. Vis: ${p.form}. ${p.text}`,
    }),
  ),
];

export function folkWitchAbilityDefs(existing: Set<string>): AbilityDef[] {
  return FOLK_ABILITIES.filter((a) => !existing.has(a.id));
}
