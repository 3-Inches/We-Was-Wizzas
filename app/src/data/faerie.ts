// Realms of Power: Faerie, Chapters Five and Six: the faerie wizard's Abilities (three Methods, eight
// Powers and the four Arts of the Ars Fabulosa), the guidelines of each Power, the Ranges, Durations
// and Targets faerie rites may use, and the pagan traditions. Their text is the book's, shortened.

import type { AbilityDef, VirtueFlawDef } from './types';

const src = (line: number) => ({ book: 'RoP_F', line });

export type FaerieMethodId = 'evocation' | 'enchantment' | 'empathy';
export type FaeriePowerId = 'beguile' | 'conjure' | 'dream' | 'grant' | 'portage' | 'ware' | 'weal' | 'woe';
export type BargainArtId = 'summoning' | 'bonding' | 'captivating' | 'dismissing';

/** The three Faerie Methods: what a rite asks of the caster, and the Characteristic it is cast with. */
export const FAERIE_METHODS: { id: FaerieMethodId; name: string; char: 'Com' | 'Pre' | 'Sta'; cost: string; text: string }[] = [
  {
    id: 'evocation', name: 'Evocation', char: 'Com', cost: 'a Warping Point or a Confidence Point',
    text: 'Calls on the gods of the Faerie realm in a bold voice with firm gestures. The caster gains a Warping Point or spends a Confidence Point. Evocation also lets the caster use vis, +2 a pawn to any rite, up to Evocation + the Power in pawns (a botch die each unless the vis is Faerie).',
  },
  {
    id: 'enchantment', name: 'Enchantment', char: 'Pre', cost: 'a performance (an Ability roll against 3 × the magnitude)',
    text: 'A performance (a song, a dance, a feat) persuades the target to accept the rite: an Ability roll against 3 × the intended magnitude, and the rite follows the next round at that level. Rolls may be added together over several rounds. Enchantment lets any rite be cast on a simple die (no botch, no Sympathy experience).',
  },
  {
    id: 'empathy', name: 'Empathy', char: 'Sta', cost: 'a Fatigue level (a Light Wound if none can be spent), about an hour',
    text: 'Draws the Faerie realm out of the caster by concentration, in about an hour of trance. A Fatigue level is spent (a Light Wound if it cannot be). Another Fatigue level extends the rite, doubling bonuses such as Confidence or vis, and the Sympathy Traits that set its highest level.',
  },
];

/** The eight Faerie Powers. Each has a weakness chosen when it is gained (iron, running water, the Dominion…) that dispels its effects. */
export const FAERIE_POWERS: { id: FaeriePowerId; name: string; text: string }[] = [
  { id: 'beguile', name: 'Beguile', text: 'Command the target or convince it it has already done so; change memories, perceptions and emotions. Any Sympathy Trait fitting the memory, emotion or perception applies.' },
  { id: 'conjure', name: 'Conjure', text: 'Glamours: solid images made of the realm’s power, or the target changed into one. Their consequences are often undone when the effect ends.' },
  { id: 'dream', name: 'Dream', text: 'See and sense at a distance, understand speech and thought, and foresee the target’s likely future.' },
  { id: 'grant', name: 'Grant', text: 'Give the target Sympathy Traits, Warping, Virtues or Flaws, faerie powers, Might Points, or a Faerie aura, for the duration.' },
  { id: 'portage', name: 'Portage', text: 'Faerie trods: move the target in a blink, in and out of regiones and the Faerie realm, or hold it within range.' },
  { id: 'ware', name: 'Ware', text: 'Take the target under the caster’s protection: wards against what a Sympathy Trait names, Soak and Defense.' },
  { id: 'weal', name: 'Weal', text: 'Healing and youth that last for the duration: Recovery and Aging bonuses, wounds healed or their healing hastened.' },
  { id: 'woe', name: 'Woe', text: 'Harm that lasts for the duration: Fatigue, wounds, slower healing, Recovery and Aging penalties.' },
];

/** The four Arts of the Ars Fabulosa, faerie bargaining: each opens at 0 and rises as an Art. */
export const BARGAIN_ARTS: { id: BargainArtId; name: string; char: 'Pre' | 'Com' | 'Per' | 'Int'; text: string }[] = [
  { id: 'summoning', name: 'Summoning', char: 'Pre', text: 'Calls a faerie of Might up to 5 × the applicable Sympathy Traits and holds it to listen and bargain, warding the summoner from it, if the total reaches its Might and penetrates. A faerie appears even on a botch.' },
  { id: 'bonding', name: 'Bonding', char: 'Com', text: 'A mystic bond with a faerie (or between it and a held thing): its Characteristics, Pretenses and senses, its powers, a temporary enchantment, or immunity to Warping, deprivation and aging.' },
  { id: 'captivating', name: 'Captivating', char: 'Per', text: 'The summoner and the faerie exchange places: each controls the other’s body. 1 Warping Point a season and another a year; both are immune to Faerie Calling meanwhile.' },
  { id: 'dismissing', name: 'Dismissing', char: 'Int', text: 'Cancels an effect of a being with Might, ends effects on such a being, or releases it from a supernatural bargain.' },
];

const methodAbility = (m: (typeof FAERIE_METHODS)[number]): AbilityDef => ({
  id: m.id, name: m.name, type: 'Supernatural', restricted: true, specialties: ['a Power', 'a kind of target', 'a place or time'], source: src(6829),
  text: `Faerie Method (Realms of Power: Faerie). Rite Casting Total: stress die + ${({ Com: 'Communication', Pre: 'Presence', Sta: 'Stamina' } as const)[m.char]} + ${m.name} + the Power + the Faerie aura; the level reached, no higher than 5 × the applicable Sympathy Traits. ${m.text}`,
});
const powerAbility = (p: (typeof FAERIE_POWERS)[number]): AbilityDef => ({
  id: p.id, name: p.name, type: 'Supernatural', restricted: true, specialties: ['a kind of target', 'a Method', 'a Sympathy Trait'], source: src(6859),
  text: `Faerie Power (Realms of Power: Faerie), used with a Faerie Method in a rite. ${p.text}`,
});
const bargainAbility = (a: (typeof BARGAIN_ARTS)[number]): AbilityDef => ({
  id: a.id === 'summoning' ? 'faerie-summoning' : a.id, name: a.id === 'summoning' ? 'Summoning (Ars Fabulosa)' : a.name, type: 'Supernatural', restricted: true, asArt: true,
  specialties: ['a kind of faerie', 'in a Faerie aura'], source: src(7396),
  text: `Art of the Ars Fabulosa (Realms of Power: Faerie): opens at 0 and rises as an Art. Total: stress die + ${({ Pre: 'Presence', Com: 'Communication', Per: 'Perception', Int: 'Intelligence' } as const)[a.char]} + ${a.name} + Faerie Rank + aura, a Fatigue level spent; the highest Might it reaches is 5 × the applicable Sympathy Traits. ${a.text}`,
});

export const FAERIE_ABILITIES: AbilityDef[] = [...FAERIE_METHODS.map(methodAbility), ...FAERIE_POWERS.map(powerAbility), ...BARGAIN_ARTS.map(bargainAbility)];

/** The Ability a bargaining Art is kept under (Summoning is also a Goetic Art, kept apart). */
export const bargainAbilityId = (a: BargainArtId) => (a === 'summoning' ? 'faerie-summoning' : a);

export function faerieAbilityDefs(existing: Set<string>): AbilityDef[] {
  return FAERIE_ABILITIES.filter((a) => !existing.has(a.id));
}

/** A Faerie Power's guideline: its level, or for a general one the level the caster picks. */
export interface FaerieGuideline {
  power: FaeriePowerId;
  level: number;
  general?: boolean;
  ritual?: boolean;
  text: string;
}

const g = (power: FaeriePowerId, level: number, text: string, o: { general?: boolean; ritual?: boolean } = {}): FaerieGuideline => ({ power, level, text, ...o });

export const FAERIE_GUIDELINES: FaerieGuideline[] = [
  g('beguile', 1, 'Make a minor change to the target’s memory of an event.'),
  g('beguile', 2, 'Make a major change to the target’s memory of an event.'),
  g('beguile', 2, 'Make a minor change to the target’s perceptions.'),
  g('beguile', 2, 'Plant a single suggestion in the mind of the target.'),
  g('beguile', 3, 'Make a major change to the target’s memory of a series of events, or to its perceptions or emotions.'),
  g('beguile', 4, 'Make major changes to the target’s memory of a long period; control its mental state (awake, asleep, confused, lucid); completely change its perceptions or emotions.'),
  g('beguile', 5, 'Control the target’s behavior based on a natural emotion; paralyze it with emotion.'),
  g('beguile', 10, 'Completely change the target’s memories; control its behavior based on an unnatural emotion; imbue all its responses with an emotion.'),
  g('beguile', 15, 'Give a simple command to the target.'),
  g('beguile', 20, 'Give a complex command to the target.'),
  g('beguile', 25, 'Completely control the target, including its movement and communication.'),
  g('conjure', 1, 'Conjure a faerie with Faerie Might equal to the base level.', { general: true, ritual: true }),
  g('conjure', 3, 'Conjure a glamour, or change the target into a glamour of about its own size (Size modifiers for larger). +1 magnitude for an intricate glamour, +2 for one that obeys the caster’s mind, +2 to make something animate inanimate.'),
  g('conjure', 4, 'Change the target into a glamour up to two Size categories smaller.'),
  g('conjure', 5, 'Change the target into a glamour up to five Size categories smaller.'),
  g('conjure', 10, 'Change the target into a glamour up to 10 Size categories smaller.'),
  g('conjure', 15, 'Change the target into a glamour up to 15 Size categories smaller.'),
  g('dream', 1, 'The target has Premonitions, at a score of the base level / 5, for the duration.', { general: true }),
  g('dream', 1, 'Allow the target to use one sense at a distance.'),
  g('dream', 2, 'Allow the target to use two senses at a distance, or to communicate mentally.'),
  g('dream', 3, 'Allow the target to use all senses at a distance, or to understand the meaning of spoken sounds.'),
  g('dream', 4, 'Answer a question about the target’s likely future in the next minute; let the target speak the caster’s native language.'),
  g('dream', 5, 'Answer a question about the target’s likely future in the next hour; read the target’s surface thoughts.'),
  g('dream', 10, 'Answer a question about the target’s likely future in the next day; read its memories of the past day.'),
  g('dream', 15, 'Answer a question about the target’s likely future in the next month; read all of its memories.'),
  g('dream', 20, 'Answer a question about the target’s likely future in the next season.', { ritual: true }),
  g('dream', 25, 'Answer a question about the target’s likely future in the next year.', { ritual: true }),
  g('dream', 30, 'Answer a question about the target’s likely future in the next decade.', { ritual: true }),
  g('dream', 35, 'Answer a question about the target’s likely future in the next century.', { ritual: true }),
  g('grant', 1, 'The target faerie regains (the base level + 5) Faerie Might Points for the duration.', { general: true, ritual: true }),
  g('grant', 1, 'The target gains, as a faerie power, a non-Ritual effect the caster can cast, of level up to half (this effect’s level + 15).', { general: true }),
  g('grant', 3, 'The target gains one of the caster’s Sympathy Traits, at most +1 or −1.'),
  g('grant', 5, 'Grant the target a Warping Point, another for each further magnitude; or one of the caster’s Sympathy Traits at most ±2.'),
  g('grant', 10, 'The target gains a Minor Flaw.', { ritual: true }),
  g('grant', 10, 'The target Boundary gains a Faerie aura of 1, a point more for each further magnitude.'),
  g('grant', 15, 'The target gains a Minor Virtue.', { ritual: true }),
  g('grant', 15, 'The target gains one of the caster’s Sympathy Traits, at most ±3.'),
  g('grant', 25, 'The target gains one of the caster’s Sympathy Traits, at most ±4.'),
  g('grant', 30, 'The target gains a Major Flaw.', { ritual: true }),
  g('grant', 30, 'The target Boundary, holding a Faerie aura, becomes a Faerie regio.', { ritual: true }),
  g('grant', 35, 'The target gains one of the caster’s Sympathy Traits, at most ±5.'),
  g('grant', 45, 'The target gains a Major Virtue, or one of the caster’s Sympathy Traits at most ±6.', { ritual: true }),
  g('portage', 1, 'Transport the target out of a regio through a boundary of at most (base level + 15) / 5; into the Faerie Realm, or back out of it, through a boundary of at most 13 − (base level + 15) / 5.', { general: true }),
  g('portage', 5, 'Instantly transport the target to anything within range associated with one of the caster’s Sympathy Traits; keep the target from traveling out of the effect’s range.'),
  g('portage', 10, 'Instantly transport the target anywhere within range; the target travels as faeries do, ignoring Fatigue penalties but unable to spend Fatigue levels.'),
  g('portage', 15, 'Double or halve the target’s natural speed.'),
  g('ware', 1, 'Ward against things a positive Sympathy Trait names: Faerie Might up to the base level + 20, any Might up to + 15. Against what a negative Trait opposes: Faerie Might up to + 5, any Might up to the base level. Against what any Trait names: Faerie Might up to the base level, any up to − 5. Against what no Trait names: Faerie up to − 10, any up to − 15.', { general: true }),
  g('ware', 1, 'Ward the target against all mundane things associated with one of the caster’s positive Sympathy Traits.'),
  g('ware', 4, 'Ward the target against all mundane things opposed by one of the caster’s negative Sympathy Traits.'),
  g('ware', 5, '+1 Soak, +1 more for each further magnitude; or ward against all mundane things associated with any of the caster’s Sympathy Traits.'),
  g('ware', 10, '+1 Defense, +1 more for each further magnitude.'),
  g('ware', 15, 'Ward the target against all mundane things not associated with any of the caster’s Sympathy Traits.'),
  g('weal', 1, '+1 to Recovery rolls and +1 to Aging rolls, or −1 to Aging rolls and −1 to Recovery rolls.'),
  g('weal', 1, 'Reduce a mature target’s apparent age by a year, another for each further magnitude.', { ritual: true }),
  g('weal', 2, '±3 to Recovery and Aging rolls, as at level 1.'),
  g('weal', 3, '±6 to Recovery and Aging rolls, as at level 1.'),
  g('weal', 4, '±9 to Recovery and Aging rolls, as at level 1; or keep the target’s wounds from worsening.'),
  g('weal', 4, 'Delay all the target’s natural Aging and Recovery rolls until the effect ends.', { ritual: true }),
  g('weal', 5, 'Heal a Light wound for the duration.'),
  g('weal', 10, 'Heal a Medium wound for the duration.'),
  g('weal', 15, 'Heal a Heavy wound for the duration, or have a single wound heal one step faster.'),
  g('weal', 20, 'Heal an Incapacitating wound, or have a single wound heal two steps faster.'),
  g('weal', 25, 'Heal all the target’s wounds, or have a single wound heal three steps faster.'),
  g('weal', 25, 'Restore the target to the semblance of life for the duration.', { ritual: true }),
  g('weal', 30, 'A single wound heals four steps faster, or all wounds one step faster.', { ritual: true }),
  g('weal', 35, 'All the target’s wounds heal two steps faster.', { ritual: true }),
  g('weal', 40, 'All the target’s wounds heal three steps faster.', { ritual: true }),
  g('weal', 45, 'All the target’s wounds heal four steps faster.', { ritual: true }),
  g('woe', 1, '−1 to Recovery rolls or +1 to Aging rolls; the loss of a Fatigue level; a single wound heals one step slower.'),
  g('woe', 2, '−3 to Recovery rolls or +3 to Aging rolls; a Light wound; a single wound heals two steps slower.'),
  g('woe', 3, '−6 to Recovery rolls or +6 to Aging rolls; a Medium wound; a single wound heals three steps slower; force a Recovery roll with no improvement possible.'),
  g('woe', 4, '−9 to Recovery rolls or +9 to Aging rolls; a Heavy wound.'),
  g('woe', 5, 'An Incapacitating wound for the duration.'),
  g('woe', 5, 'All the target’s wounds heal one step slower.', { ritual: true }),
  g('woe', 10, 'A deadly wound for the duration.'),
  g('woe', 10, 'All the target’s wounds heal two steps slower.', { ritual: true }),
  g('woe', 15, 'Force the target to make an Aging roll.'),
  g('woe', 15, 'All the target’s wounds heal three steps slower.', { ritual: true }),
];

/** The Ranges, Durations and Targets a faerie rite may use besides the Hermetic ones and Merinita's (RoP: Faerie, Chapter Six). */
export const FAERIE_RANGES = [
  { name: 'Road', magnitude: 2, note: 'Merinita' },
  { name: 'Crossroads', magnitude: 2, note: 'a target on a road crossing the caster’s, not his own' },
  { name: 'Presence', magnitude: 2, note: '100 paces at Presence +4/+5, 50 at +2/+3, 15 at −1 to +1, 5 at −2/−3, the caster only at −4/−5' },
  { name: 'Prop', magnitude: 1, note: 'touching the target with something the caster also touches' },
  { name: 'Symbol', magnitude: 4, ritual: true, note: 'a symbol of the target as an Arcane Connection; 3 points of Sympathy Traits for each Symbol parameter' },
];
export const FAERIE_DURATIONS = [
  { name: 'Held', magnitude: 1, note: 'delayed while the caster concentrates, then Momentary' },
  { name: 'Focus', magnitude: 1, note: 'until the caster uses another supernatural effect; meanwhile no healing or recovery' },
  { name: 'While (Condition)', magnitude: 1, note: 'while the target sings, sleeps, is drunk…' },
  { name: 'Geas (Condition)', magnitude: 2, note: 'triggered by an uncommon circumstance told to the victim' },
  { name: 'Hour + 1', magnitude: 2, note: 'an hour and a day: about 13 hours' },
  { name: 'Midday/Midnight', magnitude: 2, note: 'begins at the next dawn, noon, dusk or midnight and lasts to the next' },
  { name: 'Not (Condition)', magnitude: 2, note: 'while the target does not sleep, speak…; a month at most' },
  { name: 'Season', magnitude: 3, ritual: true, note: 'from the next equinox or solstice to the one after' },
  { name: 'Until (Condition)', magnitude: 4, ritual: true, note: 'Merinita: until a condition is met' },
  { name: 'Aura', magnitude: 4, ritual: true, note: 'while the target stays in a supernatural aura' },
  { name: 'Faerie', magnitude: 4, ritual: true, note: 'while target or caster has Faerie Might and is in Mythic Europe' },
  { name: 'Hidden', magnitude: 4, ritual: true, note: 'while caster or target is hidden; ends if anyone finds it' },
  { name: 'Symbol', magnitude: 4, ritual: true, note: 'while a symbol made as it is cast lasts' },
  { name: 'If (Condition)', magnitude: 4, ritual: true, note: '+4 magnitudes on the Duration it has once triggered' },
];
export const FAERIE_TARGETS = [
  { name: 'Medium', magnitude: 1, note: 'held by a medium and passed to a target that comes in range (as Part)' },
  { name: 'Passion', magnitude: 2, note: 'a group inclined to an emotion: simple die + the Personality Trait, 6+ affected (as Group)' },
  { name: 'Symbol', magnitude: 4, ritual: true, note: 'all represented by a symbol within range (as Boundary)' },
];

/** Four traditions of faerie wizardry and their favored Abilities (RoP: Faerie, Pagan Traditions). */
export const FAERIE_TRADITIONS = [
  { id: 'borrowers', name: 'Borrowers', favored: ['faerie-summoning', 'bonding', 'captivating', 'dismissing'], text: 'Exotic traders who live by faerie bargains, dealing in novelties from far places.' },
  { id: 'ollamhain', name: 'Ollamhain', favored: ['enchantment', 'beguile', 'dream', 'portage'], text: 'Irish poets, sages and performers with a claimed kinship with the Fair Folk.' },
  { id: 'volkhvy', name: 'Volkhvy', favored: ['evocation', 'ceremony', 'conjure', 'grant'], text: 'Russian pagan wizards whose great rites call on their faerie gods for the whole community.' },
  { id: 'wise-folk', name: 'Wise Folk', favored: ['empathy', 'ware', 'weal', 'woe'], text: 'Wise men and women on the fringes of village life, who ward, mend and injure.' },
];

/** Two Flaws of faerie Might the extracted list lacks (RoP: Faerie, Flaws That Affect Might). */
const FAERIE_VF: VirtueFlawDef[] = [
  {
    id: 'decreased-might-flaw', name: 'Decreased Might', kind: 'flaw', sizes: ['Minor'], categories: ['Supernatural'], tainted: false, source: src(2135),
    text: 'The faerie has only 1 point of Might instead of the usual 5. It keeps the powers that need no Might, such as regeneration and equipment without Encumbrance.',
  },
  {
    id: 'restricted-might-flaw', name: 'Restricted Might', kind: 'flaw', sizes: ['Major', 'Minor'], categories: ['Supernatural'], tainted: false, source: src(2139),
    text: 'Under certain conditions the faerie is nearly powerless: its supernatural effects end (but those on itself) and it can neither spend nor recover Might while they last. Major if they are common (daylight, winter: a quarter of the time or more); Minor if uncommon (a thunderstorm, the new moon).',
  },
];

export function faerieVirtueDefs(existing: Set<string>): VirtueFlawDef[] {
  return FAERIE_VF.filter((v) => !existing.has(v.id));
}
