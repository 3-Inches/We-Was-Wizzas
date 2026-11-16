// The Vitkir (Hedge Magic, Revised Edition, Chapter Seven): the 24 runes of the Elder Futhark as
// Accelerated Abilities (raised as Arts, opened at 0), rune scripts invented ahead of time and cast by
// inscription in three Methods, the casting variations, the vitkar magic foci and Nátt-thel.

import type { AbilityDef } from './types';
import { RUNE_TEXTS } from './vitkirRunes';

const src = (line: number) => ({ book: 'HMRE', line });

export type Aett = 'Freya' | 'Heimdall' | 'Tyr';

export interface Rune {
  /** the letter the book uses for it, e.g. Th, Ng */
  letter: string;
  name: string;
  meaning: string;
  aett: Aett;
  effects: string;
  /** the Ability id */
  id: string;
}

const r = (letter: string, name: string, meaning: string, aett: Aett, effects: string): Rune => ({ letter, name, meaning, aett, effects, id: `rune-${name.toLowerCase()}` });

/** The Elder Futhark, by aett, as the book's sidebar sets it out. */
export const RUNES: Rune[] = [
  r('F', 'Fehu', 'Wealth', 'Freya', 'Wealth, domesticated animals'),
  r('U', 'Uruz', 'Auroch', 'Freya', 'Endurance, the wild'),
  r('Th', 'Thurisaz', 'Ogre', 'Freya', 'Malice, shapeshifting'),
  r('A', 'Ansuz', 'Mouth', 'Freya', 'Communication, teaching'),
  r('R', 'Raido', 'Riding', 'Freya', 'Travel, knowledge'),
  r('K', 'Kauno', 'Pain', 'Freya', 'Fire, sores'),
  r('G', 'Gebo', 'Gift', 'Freya', 'Debt, sacrifice'),
  r('W', 'Wunjo', 'Joy', 'Freya', 'Emotion, intoxication'),
  r('H', 'Hagalaz', 'Hail', 'Heimdall', 'Weather, illness'),
  r('N', 'Naudiz', 'Need', 'Heimdall', 'Trouble, hardship'),
  r('I', 'Isa', 'Ice', 'Heimdall', 'Cold, stasis'),
  r('J', 'Jera', 'Year', 'Heimdall', 'Harvest, bounty'),
  r('Y', 'Ihwaz', 'Yew', 'Heimdall', 'Patience, the dead'),
  r('P', 'Perth', 'Cup', 'Heimdall', 'Chance, secrets'),
  r('Z', 'Algiz', 'Elk', 'Heimdall', 'Protection, the hunt'),
  r('S', 'Sowilo', 'Sun', 'Heimdall', 'Triumph, virtue'),
  r('T', 'Tiwaz', 'Tyr', 'Tyr', 'Justice, battle'),
  r('B', 'Berkanan', 'Birch', 'Tyr', 'Health, youth'),
  r('E', 'Ehwaz', 'Horse', 'Tyr', 'Speed, relationships'),
  r('M', 'Mannaz', 'Man', 'Tyr', 'Cooperation, duty'),
  r('L', 'Laguz', 'Water', 'Tyr', 'Ocean, ships'),
  r('Ng', 'Ingwaz', 'Lord', 'Tyr', 'Family, security'),
  r('D', 'Dagaz', 'Day', 'Tyr', 'Time, growth'),
  r('O', 'Othila', 'Inheritance', 'Tyr', 'Lands, possessions'),
];

export const RUNE_IDS = RUNES.map((x) => x.id);
export const runeByName = (name: string) => RUNES.find((x) => x.name === name);

const RUNE_ABILITIES: AbilityDef[] = RUNES.map(
  (x): AbilityDef => ({
    id: x.id, name: `${x.name} (Rune)`, type: 'Supernatural', restricted: true, asArt: true, specialties: ['Method I scripts', 'Method II scripts', 'a material'], source: src(RUNE_TEXTS[x.name]?.line ?? 6447),
    text: `Vitkar rune (Hedge Magic), ${x.letter}, “${x.meaning}”, ${x.aett}’s aett: ${x.effects.toLowerCase()}. An Accelerated Ability: opened at 0 and raised as an Art. Casting Total: stress die + Stamina + the lowest rune of the script + aura; Lab Total: the lowest rune + Intelligence + Rune Magic + aura.`,
  }),
);

export function vitkirAbilityDefs(existing: Set<string>): AbilityDef[] {
  return RUNE_ABILITIES.filter((a) => !existing.has(a.id));
}

/** The three Methods of a rune script. */
export const RUNE_METHODS: { method: 'I' | 'II' | 'III'; form: string; text: string }[] = [
  { method: 'I', form: '“I, [name], [effect].”', text: 'On the vitki, or on the thing inscribed (and whoever wears or carries it while touching it). One rune: the target is implied.' },
  { method: 'II', form: '“[Name] [effect] [target].”', text: 'On a target within about ten paces of the runes, or one the vitki has an Arcane Connection to. Usually two runes, one for the effect and one for the target; the lowest score counts.' },
  { method: 'III', form: '“[Name], [target].”', text: 'No effect but a substitute Arcane Connection to the target, for later Method II scripts. Against Magic Resistance its level must exceed it.' },
];

export type Inscription = 'written' | 'hidden' | 'none';

/** Casting variations: the name and the description may be written, hidden or left off. */
export const NAME_PENALTY: Record<Inscription, number> = { written: 0, hidden: -2, none: -5 };
export const DESCRIPTION_PENALTY: Record<Inscription, number> = { written: 0, hidden: -5, none: -10 };

/** The vitkar magic foci (Sigrdrífumál): what the focus covers and the material the runes must be cut into. */
export const VITKAR_FOCI: { name: string; norse: string; material: string; runes: string[]; text: string }[] = [
  { name: 'Victory runes', norse: 'Sigrúnar', material: 'metal weapons and armor', runes: ['Tiwaz', 'Othila', 'Ehwaz'], text: 'Success in battle.' },
  { name: 'Ale runes', norse: 'Olúnar', material: 'horn, hardened leather or the vitki’s fingernails', runes: ['Algiz', 'Naudiz', 'Perth'], text: 'Good luck; protection from poison and hidden danger.' },
  { name: 'Fertility runes', norse: 'Biargrúnar', material: 'coins or jewelry', runes: ['Fehu', 'Ingwaz', 'Jera'], text: 'Wealth and prosperity for the vitki and their family.' },
  { name: 'Sea runes', norse: 'Brimrúnar', material: 'a ship, a cart, a sail: anything bigger than a man', runes: ['Laguz', 'Raido', 'Hagalaz'], text: 'Travel and its conditions.' },
  { name: 'Healing runes', norse: 'Limrúnar', material: 'bone, human or animal', runes: ['Berkanan', 'Dagaz', 'Wunjo'], text: 'Recovery from pain and injury; easing sorrow.' },
  { name: 'Speech runes', norse: 'Malrúnar', material: 'wood: a staff, a tree, a chest, a table', runes: ['Ansuz', 'Gebo', 'Mannaz'], text: 'Eloquence; relations with other vitkir and companions.' },
  { name: 'Wisdom runes', norse: 'Hugrúnar', material: 'stone', runes: ['Ihwaz', 'Sowilo', 'Kauno'], text: 'Wisdom; sensing hidden properties of the surroundings.' },
  { name: 'Strength runes', norse: 'Meginrúnar', material: 'impossible things (mead, fire, the heart, the sky), flesh or the dead', runes: ['Uruz', 'Thurisaz', 'Isa'], text: 'The magic of the wilderness and of dark, supernatural forces.' },
];

/** Nátt-thel duration: simple die + Warping Score gives the unit, multiplied by the Warping Points gained. */
export const NATT_THEL_DURATIONS: { roll: number; unit: string }[] = [
  { roll: 0, unit: 'moments' },
  { roll: 3, unit: 'diameters' },
  { roll: 6, unit: 'suns' },
  { roll: 9, unit: 'moons' },
  { roll: 12, unit: 'years' },
  { roll: 15, unit: 'unknown (the storyguide chooses a time longer than a year)' },
];
