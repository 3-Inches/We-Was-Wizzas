// Choice lists for free-text fields: Tribunals, homelands, crafts, professions, organizations,
// Mystery Cults, and example Characteristic descriptions. Every field that uses one also lets
// the player type their own value.

import type { Characteristic } from './types';

export interface ChoiceGroup {
  label: string;
  options: string[];
}

/** The thirteen regional Tribunals of 1220 (DE, The Order of Hermes: Regional Tribunals). */
export const TRIBUNALS = [
  'Greater Alps', 'Hibernian', 'Iberian', 'Levant', 'Loch Leglean', 'Normandy', 'Novgorod', 'Provençal', 'Rhine', 'Rome', 'Stonehenge', 'Theban', 'Transylvanian',
];

/**
 * Peoples and homelands of Mythic Europe around 1220, by Tribunal, as they appear in the Tribunal
 * books. `culture` is the Social Status culture that usually goes with them (DE p.64).
 */
export const HOMELANDS: (ChoiceGroup & { culture: string })[] = [
  { label: 'Stonehenge (England & Wales)', culture: 'Western Christendom', options: ['English', 'Anglo-Norman', 'Welsh', 'Cornish', 'Londoner'] },
  { label: 'Loch Leglean (Scotland)', culture: 'Western Christendom', options: ['Scots', 'Highland Gael', 'Lowland Scot', 'Norse of the Isles', 'Pictish'] },
  { label: 'Hibernian (Ireland)', culture: 'Hibernia', options: ['Irish (Gaelic)', 'Hiberno-Norse', 'Anglo-Norman (Irish)'] },
  { label: 'Normandy (northern France)', culture: 'Western Christendom', options: ['Norman', 'French (Île-de-France)', 'Breton', 'Angevin', 'Champenois', 'Picard', 'Flemish'] },
  { label: 'Provençal (southern France)', culture: 'Provençal', options: ['Provençal', 'Occitan', 'Toulousain', 'Gascon', 'Languedocien', 'Catalan (Roussillon)'] },
  { label: 'Iberian (Spain & Portugal)', culture: 'Iberia', options: ['Castilian', 'Leonese', 'Aragonese', 'Catalan', 'Navarrese', 'Basque', 'Galician', 'Portuguese', 'Mozarab', 'Andalusian (Moorish)'] },
  { label: 'Rhine (Germany & the Low Countries)', culture: 'Western Christendom', options: ['Rhinelander', 'Saxon', 'Bavarian', 'Swabian', 'Franconian', 'Thuringian', 'Frisian', 'Lotharingian', 'Brabançon', 'Hessian'] },
  { label: 'Greater Alps', culture: 'Western Christendom', options: ['Swiss', 'Savoyard', 'Tyrolean', 'Austrian', 'Burgundian', 'Lombard (Alpine)'] },
  { label: 'Rome (Italy)', culture: 'Western Christendom', options: ['Roman', 'Tuscan', 'Lombard', 'Venetian', 'Genoese', 'Pisan', 'Neapolitan', 'Sicilian', 'Sardinian', 'Apulian'] },
  { label: 'Theban (Greece & the Aegean)', culture: 'Eastern Christendom', options: ['Greek (Romaioi)', 'Constantinopolitan', 'Cretan', 'Cypriot', 'Latin settler (Frank)', 'Venetian colonist', 'Bulgarian', 'Serb'] },
  { label: 'Transylvanian (Hungary & the Carpathians)', culture: 'Western Christendom', options: ['Hungarian (Magyar)', 'Székely', 'Transylvanian Saxon', 'Vlach', 'Croat', 'Slovak', 'Bohemian', 'Pole', 'Cuman'] },
  { label: 'Novgorod (the Rus & the Baltic)', culture: 'Eastern Christendom', options: ['Novgorodian', 'Rus (Kievan)', 'Finn', 'Estonian', 'Livonian', 'Lithuanian', 'Prussian', 'Swede', 'Dane', 'Norwegian', 'Icelander', 'Sámi'] },
  { label: 'Levant (the Holy Land)', culture: 'Islamic', options: ['Syrian', 'Egyptian', 'Palestinian', 'Arab (Bedouin)', 'Armenian (Cilician)', 'Frank of Outremer', 'Kurd', 'Seljuk Turk', 'Persian'] },
  { label: 'North Africa & beyond', culture: 'North Africa', options: ['Moroccan', 'Berber', 'Tuareg', 'Ifriqiyan', 'Nubian', 'Ethiopian', 'Copt'] },
  { label: 'Jewish communities', culture: 'Jewish', options: ['Ashkenazi Jew', 'Sephardi Jew', 'Romaniote Jew'] },
];

export const CRAFTS = [
  'Blacksmith', 'Armorer', 'Weaponsmith', 'Goldsmith', 'Silversmith', 'Farrier', 'Carpenter', 'Woodworker', 'Cooper', 'Mason', 'Sculptor', 'Painter', 'Glassblower', 'Potter',
  'Leatherworker', 'Tanner', 'Shoemaker', 'Weaver', 'Tailor', 'Dyer', 'Baker', 'Brewer', 'Cook', 'Boatbuilder', 'Bookbinder', 'Illuminator', 'Jeweler', 'Bowyer', 'Fletcher',
  'Candlemaker', 'Runes', 'Automata',
];

/**
 * Crafts that go together: the same materials, tools or workshop, so a craftsman who knows one may
 * well have picked up another (a smith shoes horses, a baker brews). Covers the names in the list
 * above and in the covenant's crafts (Covenants ch.5).
 */
const CRAFT_FAMILIES: string[][] = [
  ['Blacksmith', 'Farrier', 'Armorer', 'Weaponsmith', 'Swordsmith', 'Toolmaker', 'Tinker'],
  ['Tinker', 'Pewterer', 'Toolmaker', 'Mechanic'],
  ['Goldsmith', 'Silversmith', 'Jeweler', 'Lapidary'],
  ['Carpenter', 'Woodworker', 'Furniture maker', 'Cooper', 'Cartwright', 'Boatbuilder'],
  ['Bowyer', 'Fletcher', 'Woodworker'],
  ['Armorer', 'Weaponsmith', 'Swordsmith', 'Shield maker'],
  ['Mason', 'Stonemason', 'Sculptor'],
  ['Thatcher', 'Roofer', 'Carpenter'],
  ['Glassblower', 'Glazier', 'Potter'],
  ['Leatherworker', 'Tanner', 'Shoemaker', 'Cobbler', 'Saddler'],
  ['Weaver', 'Tailor', 'Dyer'],
  ['Baker', 'Cook', 'Brewer', 'Miller'],
  ['Brewer', 'Vintner', 'Cooper'],
  ['Cook', 'Butcher'],
  ['Bookbinder', 'Illuminator', 'Percamenarius (parchment maker)', 'Ink-maker'],
  ['Painter', 'Illuminator', 'Sculptor'],
  ['Candlemaker', 'Butcher'],
];

/** The crafts that go with this one, most closely related first. */
export function relatedCrafts(craft: string): string[] {
  const key = (s: string) => s.toLowerCase().replace(/\s*\(.*\)/, '').trim();
  const k = key(craft);
  return [...new Set(CRAFT_FAMILIES.filter((f) => f.some((x) => key(x) === k)).flat())].filter((x) => key(x) !== k);
}

/** The guild of a craft's name: "Bakers’ guild", "Lapidaries’ guild", "Parchment makers’ guild". */
export function guildOf(craft: string): string {
  const inner = /\(([^)]+)\)/.exec(craft)?.[1];
  const base = (inner ?? craft).trim();
  const plural = /s$/i.test(base) ? base : /[^aeiou]y$/i.test(base) ? `${base.slice(0, -1)}ies` : `${base}s`;
  return `${plural.charAt(0).toUpperCase()}${plural.slice(1)}’ guild`;
}

export const PROFESSIONS = [
  'Scribe', 'Apothecary', 'Merchant', 'Farmer', 'Storyteller', 'Steward', 'Sailor', 'Navigator', 'Librarian', 'Servant', 'Laborer', 'Actor', 'Jongleur', 'Minstrel', 'Miner',
  'Ferryman', 'Fisherman', 'Falconer', 'Gardener', 'Chamberlain', 'Reeve', 'Teamster', 'Marshal', 'Soldier', 'Mercenary', 'Animal Trainer', 'Master of Kennels', 'Washerwoman',
  'Torturer', 'Tinker', 'Poet', 'Bookbinder', 'Brewer', 'Midwife', 'Barber',
];

export const ORGANIZATIONS: ChoiceGroup[] = [
  { label: 'Hermetic', options: ['Order of Hermes', 'Covenant (your own)', 'Former covenant', 'House Mercere (Redcaps)'] },
  { label: 'Church', options: ['Church', 'Franciscans', 'Dominicans', 'Benedictines', 'Cistercians', 'Knights Templar', 'Knights Hospitaller', 'Teutonic Knights', 'Ethiopian Church'] },
  { label: 'Secular', options: ['Guild', 'Trading Guild', 'Craft Guild', 'Town Council', 'University', 'Royal Court', 'Noble House', 'Smugglers', 'Thieves'] },
  { label: 'Hedge traditions', options: ['Folk Witches', 'Storm Wizards', 'Muspelli', 'Learned Magicians', 'Gruagachan'] },
];

/** Mystery Cults: the four Mystery Houses (Houses of Hermes: Mystery Cults) and the cults of The Mysteries (Revised). */
export const MYSTERY_CULTS: ChoiceGroup[] = [
  { label: 'Mystery Houses', options: ['Bjornaer', 'Criamon', 'Merinita', 'Verditius'] },
  {
    label: 'Mystery Cults',
    options: ['Cult of Mercury', 'Legion of Mithras', 'Philosophers of Rome', 'Children of Hermes', 'Mystic Fraternity of Samos', 'Disciples of the Worm', 'Knights of the Green Stone', 'Order of the Green Cockerel', 'Cult of Orpheus'],
  },
];

/** Example descriptions for each Characteristic, for high and low scores. */
export const CHAR_DESCRIPTORS: Record<Characteristic, { high: string[]; low: string[] }> = {
  Int: { high: ['Clever', 'Quick-witted', 'Learned', 'Sharp memory', 'Analytical', 'Imaginative', 'Brilliant'], low: ['Slow-witted', 'Forgetful', 'Muddled', 'Unlettered', 'Dull', 'Simple'] },
  Per: { high: ['Observant', 'Keen-eyed', 'Sharp ears', 'Intuitive', 'Wary', 'Eagle-eyed'], low: ['Unobservant', 'Absent-minded', 'Distracted', 'Poor eyesight', 'Oblivious', 'Head in the clouds'] },
  Str: { high: ['Strong', 'Brawny', 'Powerful', 'Broad-shouldered', 'Can hit hard', 'Mighty'], low: ['Weak', 'Frail', 'Scrawny', 'Slight', 'Feeble', 'Thin-armed'] },
  Sta: { high: ['Tough', 'Hardy', 'Tireless', 'Healthy', 'Stubborn', 'Iron constitution'], low: ['Sickly', 'Tires easily', 'Delicate', 'Fragile', 'Short of breath', 'Faint-hearted'] },
  Pre: { high: ['Handsome', 'Beautiful', 'Charismatic', 'Commanding', 'Striking', 'Dignified', 'Imposing'], low: ['Ugly', 'Plain', 'Unkempt', 'Scarred', 'Forgettable', 'Unimpressive', 'Sour-faced'] },
  Com: { high: ['Eloquent', 'Persuasive', 'Silver-tongued', 'Articulate', 'Good listener', 'Witty'], low: ['Tongue-tied', 'Blunt', 'Taciturn', 'Mumbling', 'Awkward', 'Shy'] },
  Dex: { high: ['Nimble', 'Graceful', 'Deft', 'Steady hands', 'Sure-footed', 'Good with a blade'], low: ['Clumsy', 'Awkward', 'Butterfingers', 'Shaky hands', 'Stiff', 'Heavy-footed'] },
  Qik: { high: ['Quick', 'Fast reflexes', 'Swift', 'Good at dodging', 'Alert', 'Nimble on his feet'], low: ['Slow', 'Sluggish', 'Ponderous', 'Deliberate', 'Lumbering', 'Slow to react'] },
};

/** Places for (Area) Lore: the Tribunals and the lands of Mythic Europe. */
export const AREAS: ChoiceGroup[] = [
  { label: 'Tribunals', options: TRIBUNALS.map((t) => `${t} Tribunal`) },
  {
    label: 'Lands',
    options: [
      'England', 'Wales', 'Scotland', 'Ireland', 'Normandy', 'Brittany', 'Paris', 'Provence', 'Languedoc', 'Castile', 'Aragon', 'Portugal', 'Navarre', 'Al-Andalus', 'Bavaria',
      'Saxony', 'Swabia', 'the Rhineland', 'Flanders', 'Lombardy', 'Tuscany', 'Rome', 'Venice', 'Sicily', 'Hungary', 'Bohemia', 'Poland', 'Constantinople', 'Greece', 'Novgorod',
      'Outremer', 'Egypt', 'North Africa',
    ],
  },
  { label: 'Close to home', options: ['Home village', 'Home town', 'Covenant and surroundings'] },
];
