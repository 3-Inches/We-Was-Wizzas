// The Forest of Guardians of the Forests (chapter 4): the fates of the forest spirits, the powers
// every forest spirit has and those some have, the Courts of the Seasons and their year-long drama,
// the rival courts of Dark Summer and Bright Winter by the Rhine Gorge, and the trees of Germany.

export interface ForestPower {
  name: string;
  cost: string;
  init?: string;
  form?: string;
  text: string;
}

export const FOREST_FATES: { name: string; text: string }[] = [
  { name: 'Survival', text: 'The genius locus holds its own against the mundanes and the Dominion: a magical forest (the Teutoburger Forest, the Drudenbaum, the Romowe Oak).' },
  { name: 'Dissolution', text: 'Too small, or sapped by stronger auras nearby, the spirit fades and leaves a mundane forest (the Hertogenwald, south of Aachen).' },
  { name: 'Replacement', text: 'The spirit dwindles and another being takes its place: most often a faerie forest, sometimes a divine or infernal one (the Black Forest, the Ash of Nortorf, the Donar Oak).' },
  { name: 'Alliance', text: 'The spirit makes a pact with another being, most often a faerie, or possesses one: a forest mostly of one realm with patches of another (the Courts of the Seasons).' },
];

/** Every forest spirit has these; its Might (30 at least) resists magic used to harm the forest or its denizens. */
export const FOREST_GENERAL_POWERS: ForestPower[] = [
  { name: 'Presence', cost: '0 points', text: 'Aware of everything within its bounds: it is the forest. Where its presence is strongest an aura springs up, as strong as its Might allows.' },
  { name: 'Manifestation', cost: '5 points or more', init: '+1', form: 'Animal or Herbam', text: 'Takes over the forest’s creatures (5 points a Size 0 creature, ten more for each 5 more), or makes its plants grow with unnatural speed.' },
  { name: 'Produce Vis', cost: '1 point a pawn', text: 'A yearly harvest of vis up to its Might, in bark, fruit, hides, bone, earth or water; magi usually find a small part of it at most.' },
];

/** Some forest spirits have these (the storyguide is encouraged to invent more); applied to people, they cause Warping. */
export const FOREST_SPECIFIC_POWERS: ForestPower[] = [
  { name: 'Control Weather', cost: '10 points', init: '0', form: 'Auram', text: 'Alters the weather over its domain, within reason for the season.' },
  { name: 'Grant Flaw', cost: '5 (Minor) or 10 (Major) points', init: '0', form: 'Vim', text: 'Lays a Flaw on those who anger it, fading over years away from the heart of its power.' },
  { name: 'Grant Victory', cost: 'variable', init: '+3', form: 'Corpus', text: 'Each Might point gives ten men +1 to combat rolls, or one man +3 to Soak (or +1 to all rolls of a kind, +3 to one roll); recovered when withdrawn.' },
  { name: 'Grant Virtue', cost: '5 (Minor) or 10 (Major) points', init: '0', form: 'Vim', text: 'Bestows a Virtue on those it favors, fading if they stay too long away from it.' },
  { name: 'Guide', cost: '2 points', init: '0', form: 'Mentem', text: 'Subtly leads visitors where it wishes: signs, a new track, a creature to follow. No compulsion.' },
  { name: 'Healing', cost: '4 points', init: '−1', form: 'Corpus', text: 'The worst wound improves a level (the forest’s own animals wholly), when the recipient drinks from its spring, uses its herbs, or sleeps a night in it.' },
  { name: 'Possession', cost: '5 points', init: '+2', form: 'Mentem', text: 'Puts a fragment of itself into a person or faerie whose resistance it overcomes, with as much of its Might Pool as it likes.' },
  { name: 'Oath-Swearing', cost: '5 or 10 points', init: '0', form: 'Vim', text: 'Enforces an oath freely sworn: one who breaks it knows, and if they carry on gains a Minor or Major Flaw, lifted by swearing again.' },
  { name: 'Regio', cost: '10 points a level', init: '0', text: 'Keeps a regio where there is an aura, its levels open as it wills (some only in certain seasons); the points are committed while it lasts.' },
  { name: 'Shroud', cost: '6 points', init: '0', form: 'Mentem', text: 'Keeps intruders from a part of the forest, as The Shrouded Glen.' },
  { name: 'Stasis', cost: '15 points', init: '0', form: 'Vim', text: 'An inner part of the forest where mortals do not age, their memories hazing and Warping after decades.' },
];

export interface SeasonCourt {
  id: string;
  ruler: string;
  season: 'Winter' | 'Spring' | 'Summer' | 'Autumn';
  /** the month (1–12) of its solstice or equinox, when it is strongest */
  peak: number;
  direction: string;
  traits: string;
  powers: string;
  text: string;
  /** where the book suggests it for the Rhine Gorge saga */
  gorge: string;
}

/** The four faerie courts linked to the seasons (GotF, The Courts of the Seasons): one forest spirit splintered into four, in a ring about the covenant. */
export const SEASON_COURTS: SeasonCourt[] = [
  {
    id: 'holly', ruler: 'King Holly', season: 'Winter', peak: 12, direction: 'north', traits: 'Tyrannical +3, Cold-hearted +2', powers: 'Shroud, Grant Flaw (Depressed), Control Weather, Regio', gorge: 'the Westerwald',
    text: 'Holds sway from a grove of holly trees; some link him to the leader of the Wild Hunt. The northern spirit possessed a faerie of winter who has rebelled against it ever since, so he rules with an iron will: within his forest the very letter of his complex law must be obeyed. His court: faeries of ice, frost and snow.',
  },
  {
    id: 'alder', ruler: 'The Alder Prince', season: 'Spring', peak: 3, direction: 'west', traits: 'Compassionate +3, Secretive +2', powers: 'Shroud, Grant Virtue (Rapid Convalescence), Control Weather, Regio', gorge: 'the Odenwald',
    text: 'A red-hued prince whose hidden court lies in a deep-shrouded vale of peace and serenity. Possessed by the western spirit after his prevarication nearly dissolved it, he is passive and shy, benign and kindly, and rules over many holzfrauen. His court prefers to manipulate others without their knowing faeries are there.',
  },
  {
    id: 'oak', ruler: 'King Oak', season: 'Summer', peak: 6, direction: 'south', traits: 'Regal +3, Generous +2', powers: 'Guide, Grant Virtue (Inspirational), Control Weather, Regio', gorge: 'the Palatinate Forest',
    text: 'Holds court beneath a mighty oak in a forest where patches of Magic aura linger from his alliance with the spirit. A generous monarch who treats visitors well, but touchy of honor and literal: a misplaced turn of phrase can bind one in a supernaturally enforced contract. His court of joyful, whimsical faeries frustrates their military-minded king.',
  },
  {
    id: 'willow', ruler: 'The Willow Maiden', season: 'Autumn', peak: 9, direction: 'east', traits: 'Manipulative +3, Uncaring +2', powers: 'Guide, Grant Flaw (Weak-Willed), Control Weather, Regio', gorge: 'the Hunsrück',
    text: 'Seems as generous as the Summer King, but every gift has a price, often found out too late. She came off far the better in her pact with the eastern spirit and controls her woodland almost wholly; political and manipulative, obsessed with her rival the Alder Prince. Her court: handsome courtiers and beautiful enchantresses.',
  },
];

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Months away from a court's height, around the year (0 to 6). */
const distance = (month: number, peak: number) => Math.min(Math.abs(month - peak), 12 - Math.abs(month - peak));

/**
 * A court's Might Pool and forest aura in a month (1–12): 35 and an aura of 3 at its solstice or
 * equinox, falling steadily to 15 and next to no aura six months on, then rising again; each pair of
 * rivals' pools add up to 50. The Might Score stays 30. The book gives the pools month by month and
 * the auras at the solstices and equinoxes; between, the aura is read from the pool.
 */
export function courtInMonth(c: SeasonCourt, month: number): { pool: number; aura: number } {
  const d = distance(month, c.peak);
  const pool = Math.round((35 - (20 * d) / 6) / 5) * 5;
  const aura = d === 0 ? 3 : d <= 2 ? 2 : d <= 4 ? 1 : 0;
  return { pool, aura };
}

/** The months each season covers in the toolkit (Spring from March, as the equinoxes and solstices fall). */
export const SEASON_MONTHS: Record<'Spring' | 'Summer' | 'Autumn' | 'Winter', number[]> = { Spring: [3, 4, 5], Summer: [6, 7, 8], Autumn: [9, 10, 11], Winter: [12, 1, 2] };

/** The rival courts by the Rhine Gorge (GotF, The Curse of the Rhine Gorge): Dark Summer holds dominion from Walpurgis Night to All Hallows' Eve, Bright Winter the rest of the year. */
export const GORGE_COURTS = {
  line: 3907,
  text: 'The Seelie Court of Bright Winter (light, snow, cold, the hunt) is found at midwinter by day among the highest snow-covered hills of the Westerwald; the Unseelie Court of Dark Summer (dark, fire, warmth, agriculture) at midsummer by night in the lowest swampy ground of the Hunsrück, west of the Rhine Gorge. Either may become a contested vis source, with diplomacy and skill.',
  /** who holds dominion in each season: Spring and Autumn change hands within the season */
  bySeason: { Winter: 'Bright Winter', Spring: 'Bright Winter, then Dark Summer from Walpurgis Night (the eve of 1 May)', Summer: 'Dark Summer', Autumn: 'Dark Summer, then Bright Winter from All Hallows’ Eve (31 October)' } as Record<string, string>,
};

/** The trees of Germany whose Shape and Material bonuses the book gives (tripled for a whole living tree); their bonuses are in the toolkit's Shape and Material list. */
export const GERMAN_TREES: { tree: string; material: string; lore: string }[] = [
  { tree: 'Alder', material: 'Alder Wood', lore: 'An ancient royal tree; its water-resistant wood for foundations, its bark a royal red dye.' },
  { tree: 'Apple', material: 'Apple Wood', lore: 'Long life and the restorative apple; the tree of mankind.' },
  { tree: 'Ash', material: 'Ash Wood', lore: 'Spears and arrow shafts; sacred to Woden, associated with death and evil.' },
  { tree: 'Aspen', material: 'Aspen Wood', lore: 'Healing, especially of ague; aspen rods measure a corpse for its coffin.' },
  { tree: 'Beech', material: 'Beech Wood', lore: 'Learning: the writing tablets of antiquity.' },
  { tree: 'Birch', material: 'Birch Wood', lore: 'First to recolonize open ground: rebirth.' },
  { tree: 'Elder', material: 'Elder Wood', lore: 'Magic and witchcraft.' },
  { tree: 'Elm', material: 'Elm Wood', lore: 'Death: the wood of coffins.' },
  { tree: 'Fir', material: 'Fir Wood', lore: 'Darkness and evil spirits.' },
  { tree: 'Hawthorn', material: 'Hawthorn Wood', lore: 'Protection and warding, with its thorns.' },
  { tree: 'Hazel', material: 'Hazel Wood', lore: 'Divination, wisdom and judgement.' },
  { tree: 'Holly', material: 'Holly Wood', lore: 'The winter king, ruler of the dark half of the year; bad luck with wounds.' },
  { tree: 'Linden', material: 'Linden Wood', lore: 'Exalted by the Slavs; never struck by lightning, shelter of wayside shrines, wood for shields.' },
  { tree: 'Oak', material: 'Oak Wood', lore: 'The summer king, opposed to the Holly; the thunder gods’ tree.' },
  { tree: 'Pine', material: 'Pine Wood', lore: 'Light and illumination, for its pale bark: the Fir’s brother.' },
  { tree: 'Rowan', material: 'Rowan Wood', lore: 'The benign side of the craft: protection from malicious spells.' },
  { tree: 'Willow', material: 'Willow Wood', lore: 'Regrows from the smallest twig: healing and rejuvenation.' },
  { tree: 'Yew', material: 'Yew Wood', lore: 'The tree of the dead; its berries gave the ancients visions.' },
];
