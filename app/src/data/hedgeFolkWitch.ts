// The Folk Witches (Hedge Magic, Revised Edition, Chapter Three): what the extracted Virtue and
// Ability lists lack. Seven favored Supernatural Abilities used by potion, incantation or fetish;
// Folk Witch Magic Theory for the kitchen (their laboratory); the Witch Moon in place of Twilight.
// Cursing, Healing and Flight are kept apart from the Divine power and other books' versions.

import type { AbilityDef, SourceRef, VFCategory, VirtueFlawDef } from './types';

const src = (line: number) => ({ book: 'HMRE', line });

const v = (id: string, name: string, kind: 'virtue' | 'flaw', size: 'Major' | 'Minor' | 'Free', category: VFCategory, line: number, text: string): VirtueFlawDef => ({
  id, name, kind, sizes: [size], categories: [category], tainted: false, source: src(line), text,
});

const FOLK_VF: VirtueFlawDef[] = [
  v('folk-witch', 'Folk Witch', 'virtue', 'Free', 'Social Status', 1598, "The character has been trained as a folk witch. She may perform folk witch laboratory activities such as brewing potions, she uses folk witch casting methods with her Supernatural Virtues and gains the associated magical defenses, and she is a member of a coven who attends sabbat meetings. As she is not supported by a covenant, like a magus is, she must spend two seasons each year supporting herself — normally by performing magical services for the local community. This Virtue is compatible with many other Social Status Virtues and Flaws, and with Wealthy and Poor."),
  v('flawed-folk-witch-gift-opening', 'Flawed Folk Witch Gift Opening', 'flaw', 'Minor', 'Hermetic', 1603, "The Opening of the folk witch’s Gift was flawed — she does not treat one of the seven folk witch Supernatural Abilities as favored, and she may not learn the Ability during character generation. This Flaw can be taken several times, each time for a different Supernatural Ability. She can still learn the Ability at a later date, but she suffers the usual penalties for learning a Supernatural Ability. In addition, even if she does eventually learn the Ability she suffers a −1 penalty on all totals generated with it. This Flaw is Hermetic as it can only be taken by Gifted folk witches; it is normally unavailable to Gifted characters who are not folk witches."),
  v('witch-cursing', 'Cursing (Folk Witch)', 'virtue', 'Major', 'Supernatural', 1609, "The folk witch can cast curses on other characters. She has a score of 1 in the Supernatural Ability Cursing (see later)."),
  v('witch-healing', 'Healing (Folk Witch)', 'virtue', 'Major', 'Supernatural', 1615, "The folk witch can heal characters and has a score of 1 in the Supernatural Ability Healing (see later)."),
  v('life-linked-folk-witch-magic', 'Life-Linked Folk Witch Magic', 'virtue', 'Major', 'Supernatural', 1621, "The folk witch may expend Fatigue levels to boost her Casting Total. Boost her Casting Total by 5 for each Fatigue level spent."),
  v('animal-healer', 'Animal Healer', 'virtue', 'Minor', 'Supernatural', 1627, "The folk witch can heal animals, and she has a Supernatural Ability Animal Healing with a Score of 1. This works exactly the same as the Healing Ability except that it works on animals instead of people (expending Animal vis instead of Corpus). A folk witch character can also make potions using this Ability. This is not normally a Favored Ability of folk witches, although it is for some variant covens. The character may also have the Healing Ability."),
  v('concentrated-potions', 'Concentrated Potions', 'virtue', 'Minor', 'Supernatural', 1633, "The folk witch can use up to four times her Folk Witch Magic Theory Ability score worth of vis in a season when she brews potions (see later). This is double the usual amount of vis that may be used."),
  v('expert-potion-brewer', 'Expert Potion Brewer', 'virtue', 'Minor', 'Supernatural', 1639, "The folk witch doubles the Supernatural Ability used to form her Lab Total when brewing potions (see later), which increases the Brew Potency."),
  v('witch-flight', 'Flight (Folk Witch)', 'virtue', 'Minor', 'Supernatural', 1645, "The folk witch character can fly. She has a score of 1 in the Supernatural Ability Flight (see later)."),
  v('painless-moon', 'Painless Moon', 'virtue', 'Minor', 'Supernatural', 1651, "The folk witch does not suffer a Medium Wound during each month of her Witch’s Moon (see later)."),
  v('well-trained-folk-witch', 'Well-Trained Folk Witch', 'virtue', 'Minor', 'General', 1657, "Due to the quality of her induction into the folk witch tradition, the character receives an extra 50 experience points to spend during apprenticeship. This Virtue can be taken several times."),
  v('primitive-tradition-flaw', 'Primitive Tradition', 'flaw', 'Major', 'Supernatural', 1663, "The folk witch is incapable of brewing potions (see later)."),
  v('rarefied-tradition-flaw', 'Rarefied Tradition', 'flaw', 'Major', 'Supernatural', 1669, "The folk witch may only use her Supernatural Abilities via potions. That is, she must brew and drink a suitable potion when she uses her Supernatural Abilities; she cannot use the other folk witch casting methods."),
  v('harsh-moon-flaw', 'Harsh Moon', 'flaw', 'Minor', 'Supernatural', 1675, "The folk witch suffers a Heavy Wound (instead of a Medium Wound) during each month of her Witch’s Moon (see later)."),
  v('short-ranged-curses-flaw', 'Short-Ranged Curses', 'flaw', 'Minor', 'Supernatural', 1681, "Curses cast by the folk witch are only effective if the curse fetish is within 100 yards of the target. The curse takes effect at the moment that the target moves within range of the completed fetish. Once a disease, aging, or miscarriage curse fetish has thus activated, removing the target from the vicinity of the fetish has no effect on the curse. On the other hand, if a target is removed from the range of an emotion, tongue, paralysis, reduction, or beast curse fetish the effect ceases, but resumes again if the target moves back into range (and the effect manages to Penetrate again) — this continues until either the Arcane Connection powering the fetish expires or the fetish is destroyed. This Flaw has no effect on curse potions brewed by the witch. This Flaw is only available if the character is a Gifted Folk Witch or has the Major Supernatural Virtue Cursing. This Flaw is suitable for a Gifted character whose Opening of The Gift was flawed."),
  v('silent-tradition-flaw', 'Silent Tradition', 'flaw', 'Minor', 'Supernatural', 1687, "The folk witch cannot use the incantation casting method. This Flaw cannot be taken if the folk witch has the Rarefied Tradition Major Flaw."),
  v('unstable-magic-flaw', 'Unstable Magic', 'flaw', 'Minor', 'Supernatural', 1693, "Things that the folk witch creates in the laboratory (potions, fetishes, etc.) decay and cease to work after one year and one day. This Flaw is suitable for a Gifted character whose Opening of The Gift was flawed, although it may also be taken by unGifted characters."),
  v('poorly-trained-folk-witch-flaw', 'Poorly Trained Folk Witch', 'flaw', 'Minor', 'General', 1699, "The folk witch was not well trained; she receives 50 fewer experience points to spend during her apprenticeship."),
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

// each power at its own heading (HMRE, Folk Witch Powers); Animal Healing is described under the Virtue that gives it
const WITCH_POWER_SOURCE: Record<string, SourceRef> = { 'witch-cursing': src(1771), 'witch-flight': src(1811), 'witch-healing': src(1821), 'animal-healing': { ...src(1627), group: 'Animal Healer' } };

const FOLK_ABILITIES: AbilityDef[] = [
  {
    id: 'folk-witch-magic-theory', name: 'Folk Witch Magic Theory', type: 'Arcane', restricted: false, specialties: ['potions', 'fetishes', 'curses', 'vis'], source: { ...src(1876), group: 'Witch’s Kitchen' },
    text: 'The technical lore of folk witch magic (Hedge Magic), used in the kitchen as Magic Theory is in a laboratory: Lab Total = Supernatural Ability + Intelligence + Folk Witch Magic Theory + aura. A brew makes this many doses; a season uses up to twice it in vis (four times with Concentrated Potions). Anyone may be taught it.',
  },
  ...WITCH_POWERS.filter((p) => p.id.startsWith('witch-') || p.id === 'animal-healing').map(
    (p): AbilityDef => ({
      id: p.id, name: p.id === 'animal-healing' ? 'Animal Healing' : `${p.name} (Folk Witch)`, type: 'Supernatural', restricted: true, specialties: p.id === 'witch-cursing' ? ['disease', 'emotion', 'a kind of curse'] : ['potions', p.methods[0]], source: WITCH_POWER_SOURCE[p.id],
      text: `Folk witch power (Hedge Magic). Casting Total: stress die + ${({ Com: 'Communication', Dex: 'Dexterity', Per: 'Perception', Sta: 'Stamina' } as const)[p.char]} + the Ability + aura, against an Ease Factor; Penetration: the total + the Penetration bonus − the Ease Factor. By ${p.methods.join(' or ')}. Vis: ${p.form}. ${p.text}`,
    }),
  ),
];

export function folkWitchAbilityDefs(existing: Set<string>): AbilityDef[] {
  return FOLK_ABILITIES.filter((a) => !existing.has(a.id));
}
