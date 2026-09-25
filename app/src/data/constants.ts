import type { Art, Characteristic, Form, Technique, BookInfo } from './types';

export const TECHNIQUES: Technique[] = ['Cr', 'In', 'Mu', 'Pe', 'Re'];
export const FORMS: Form[] = ['An', 'Aq', 'Au', 'Co', 'He', 'Ig', 'Im', 'Me', 'Te', 'Vi'];
export const ARTS: Art[] = [...TECHNIQUES, ...FORMS];

export const ART_NAMES: Record<Art, string> = {
  Cr: 'Creo', In: 'Intellego', Mu: 'Muto', Pe: 'Perdo', Re: 'Rego',
  An: 'Animal', Aq: 'Aquam', Au: 'Auram', Co: 'Corpus', He: 'Herbam',
  Ig: 'Ignem', Im: 'Imaginem', Me: 'Mentem', Te: 'Terram', Vi: 'Vim',
};

export const ART_BY_NAME: Record<string, Art> = Object.fromEntries(
  Object.entries(ART_NAMES).map(([k, v]) => [v.toLowerCase(), k as Art]),
);

export const isTechnique = (a: string): a is Technique => (TECHNIQUES as string[]).includes(a);
export const isForm = (a: string): a is Form => (FORMS as string[]).includes(a);

export const CHARACTERISTICS: Characteristic[] = ['Int', 'Per', 'Str', 'Sta', 'Pre', 'Com', 'Dex', 'Qik'];
export const CHAR_NAMES: Record<Characteristic, string> = {
  Int: 'Intelligence', Per: 'Perception', Str: 'Strength', Sta: 'Stamina',
  Pre: 'Presence', Com: 'Communication', Dex: 'Dexterity', Qik: 'Quickness',
};

/** DE p.48: Characteristic point costs. */
export const CHAR_COST: Record<number, number> = { 3: 6, 2: 3, 1: 1, 0: 0, [-1]: -1, [-2]: -3, [-3]: -6 };
export function charCost(v: number): number {
  if (v in CHAR_COST) return CHAR_COST[v];
  // beyond ±3 (house rules): extend triangular pattern
  const s = Math.sign(v);
  const a = Math.abs(v);
  return (s * (a * (a + 1))) / 2;
}

/** DE p.48: maximum Ability score at character creation by age. */
export function abilityCapForAge(age: number): number {
  if (age < 30) return 5;
  if (age <= 35) return 6;
  if (age <= 40) return 7;
  if (age <= 45) return 8;
  return 9;
}

/** DE child characteristic modifiers (p.43). */
export function childModifier(age: number): { char: number; size: number } {
  if (age <= 7) return { char: -4, size: -2 };
  if (age <= 9) return { char: -3, size: -2 };
  if (age <= 11) return { char: -2, size: -2 };
  if (age <= 13) return { char: -1, size: -1 };
  return { char: 0, size: 0 };
}

/** Childhood Abilities (DE p.48). */
export const CHILDHOOD_ABILITIES = [
  'area-lore', 'athletics', 'awareness', 'brawl', 'charm', 'folk-ken', 'guile',
  'living-language', 'stealth', 'survival', 'swim',
];

export const SAMPLE_CHILDHOODS: { name: string; abilities: Record<string, number> }[] = [
  { name: 'Athletic Childhood', abilities: { athletics: 2, brawl: 2, swim: 2 } },
  { name: 'Exploring Childhood', abilities: { 'area-lore': 2, athletics: 1, awareness: 1, stealth: 1, survival: 2 } },
  { name: 'Mischievous Childhood', abilities: { brawl: 2, guile: 2, stealth: 2 } },
  { name: 'Social Childhood', abilities: { charm: 2, 'folk-ken': 2, guile: 2 } },
  { name: 'Traveling Childhood', abilities: { 'area-lore': 1, 'folk-ken': 2, 'living-language': 1, survival: 2 } },
];

export const SOCIETIES = [
  'All Cultures', 'Western Christendom', 'Eastern Christendom', 'Islamic', 'Hibernia', 'Iberia',
  'North Africa', 'Provençal', 'Jewish',
];

/** DE social statuses by culture (p.65). Keys are V&F names. */
export const STATUS_CULTURES: Record<string, string[]> = {
  // All cultures
  Apprentice: ['All Cultures'], Covenfolk: ['All Cultures'], Craftsman: ['All Cultures'],
  'Domestic Animal': ['All Cultures'], 'Hermetic Magus': ['All Cultures'], Laborer: ['All Cultures'],
  Merchant: ['All Cultures'], 'Paid Rights': ['All Cultures'], Peasant: ['All Cultures'], Wanderer: ['All Cultures'],
  Custos: ['All Cultures'], Factor: ['All Cultures'], 'Failed Apprentice': ['All Cultures'],
  'Forge-Companion': ['All Cultures'], 'Gentleman/woman': ['All Cultures'], 'Lone Redcap': ['All Cultures'],
  'Mercenary Captain': ['All Cultures'], 'Merchant Adventurer': ['All Cultures'], 'Wise One': ['All Cultures'],
  Capo: ['All Cultures'], Partner: ['All Cultures'], Redcap: ['All Cultures'], Venditor: ['All Cultures'],
  'Branded Criminal': ['All Cultures'], 'Companion Animal': ['All Cultures'], Outcast: ['All Cultures'],
  'Outlaw Leader': ['All Cultures'], Outsider: ['All Cultures'], Usurer: ['All Cultures'], Outlaw: ['All Cultures'],
  // Western Christendom
  Baccalaureus: ['Western Christendom'], Beadle: ['Western Christendom'], 'Brother Chaplain': ['Western Christendom'],
  'Brother Knight': ['Western Christendom'], 'Brother Sergeant': ['Western Christendom'],
  Clerk: ['Western Christendom', 'Eastern Christendom'], Falconer: ['Western Christendom', 'Eastern Christendom'],
  'Guild Apprentice': ['Western Christendom'], 'Guild Master': ['Western Christendom'], Journeyman: ['Western Christendom'],
  Jurist: ['Western Christendom', 'Eastern Christendom'], Knight: ['Western Christendom', 'Eastern Christendom'],
  Marshal: ['Western Christendom', 'Eastern Christendom'], 'Master of Kennels': ['Western Christendom', 'Eastern Christendom'],
  'Mendicant Friar': ['Western Christendom', 'Eastern Christendom'], Notary: ['Western Christendom', 'Eastern Christendom'],
  Priest: ['Western Christendom', 'Eastern Christendom'], Religious: ['Western Christendom', 'Eastern Christendom'],
  'Simple Student': ['Western Christendom'], 'Templar Administrator': ['Western Christendom'],
  'Templar Office Holder': ['Western Christendom'], 'Templar Specialist': ['Western Christendom'],
  'Town Magistrate': ['Western Christendom'], 'University Grammar Teacher': ['Western Christendom'],
  'Male Guild Sponsor': ['Western Christendom'], Nuntius: ['Western Christendom'],
  'Templar Confrere or Consoeur': ['Western Christendom'], 'Templar Servant': ['Western Christendom'],
  'Cathedral School Master': ['Western Christendom'], 'Doctor in (Faculty)': ['Western Christendom'],
  'Guild Dean': ['Western Christendom'], 'Landed Noble': ['Western Christendom', 'Eastern Christendom'],
  'Magister in Artibus': ['Western Christendom'], 'Magister in Medicina': ['Western Christendom'],
  'Senior Clergy': ['Western Christendom', 'Eastern Christendom'], 'Senior Master': ['Western Christendom'],
  'Templar Commander': ['Western Christendom'], 'Failed Journeyman': ['Western Christendom'],
  'Failed Master': ['Western Christendom'], 'Failed Monk': ['Western Christendom'], 'Surgical Empiricus': ['Western Christendom'],
  // Eastern
  Eunuch: ['Eastern Christendom'], Archieunuch: ['Eastern Christendom'],
  // Islamic
  "'Alim": ['Islamic'], Bureaucrat: ['Islamic'], Emir: ['Islamic'], "Fida'i": ['Islamic'], Mamluk: ['Islamic'],
  Sufi: ['Islamic'], Lasiq: ['Islamic'], "Muqta' (Muq-Ta')": ['Islamic'],
  // Hibernia
  Bard: ['Hibernia'], 'Senior Bard': ['Hibernia'], 'Master Bard': ['Hibernia'],
  // Iberia
  Almogaten: ['Iberia'], Almogavar: ['Iberia'],
  // North Africa
  'Mazdean Priest': ['North Africa'], Ineslemen: ['North Africa'],
  // Provençal
  Perfectus: ['Provençal'], 'Troubadour/Trobairitz': ['Provençal'],
  // Jewish
  Shamash: ['Jewish'], Sofer: ['Jewish'], Rabbi: ['Jewish'], Shadchan: ['Jewish'], Gabai: ['Jewish'], 'Rosh Beth Din': ['Jewish'],
};

export const BOOKS: BookInfo[] = [
  { id: 'DE', file: 'Ars Magica - Definitive Edition (Core Rules).md', title: 'Ars Magica Definitive Edition', abbr: 'DE', category: 'core', status: 'reviewed' },
  { id: 'ArM5', file: 'Ars Magica 5e - Core Rules.md', title: 'Ars Magica 5th Edition (original core)', abbr: 'ArM5', category: 'core', status: 'wip' },
  { id: 'AA', file: 'Ars Magica 5e - Art & Academe.md', title: 'Art & Academe', abbr: 'A&A', category: 'social', status: 'reviewed' },
  { id: 'CG', file: 'Ars Magica 5e - City & Guild.md', title: 'City & Guild', abbr: 'C&G', category: 'social', status: 'reviewed' },
  { id: 'Cov', file: 'Ars Magica 5e - Covenants.md', title: 'Covenants', abbr: 'Cov', category: 'covenant', status: 'reviewed' },
  { id: 'Grogs', file: 'Ars Magica 5e - Social - Grogs.md', title: 'Grogs', abbr: 'Grogs', category: 'social', status: 'reviewed' },
  { id: 'LoM', file: 'Ars Magica 5e - Lords of Men.md', title: 'Lords of Men', abbr: 'LoM', category: 'social', status: 'reviewed' },
  { id: 'Church', file: 'Ars Magica 5e - The Church.md', title: 'The Church', abbr: 'TC', category: 'social', status: 'reviewed' },
  { id: 'HoH_TL', file: 'Ars Magica 5e - Houses of Hermes - True Lineages.md', title: 'Houses of Hermes: True Lineages', abbr: 'HoH:TL', category: 'houses', status: 'reviewed' },
  { id: 'HoH_MC', file: 'Ars Magica 5e - Houses of Hermes - Mystery Cults.md', title: 'Houses of Hermes: Mystery Cults', abbr: 'HoH:MC', category: 'houses', status: 'reviewed' },
  { id: 'HoH_S', file: 'Ars Magica 5e - Houses of Hermes - Societates.md', title: 'Houses of Hermes: Societates', abbr: 'HoH:S', category: 'houses', status: 'reviewed' },
  { id: 'TMRE', file: 'Ars Magica 5e - The Mysteries (Revised).md', title: 'The Mysteries (Revised Edition)', abbr: 'TMRE', category: 'magic', status: 'reviewed' },
  { id: 'AM', file: 'Ars Magica 5e - Magic - Ancient Magic.md', title: 'Ancient Magic', abbr: 'AM', category: 'magic', status: 'reviewed' },
  { id: 'HMRE', file: 'Ars Magica 5e - Magic - Hedge Magic (Revised).md', title: 'Hedge Magic (Revised Edition)', abbr: 'HMRE', category: 'magic', status: 'reviewed' },
  { id: 'App', file: 'Ars Magica 5e - Magic - Apprentices.md', title: 'Apprentices', abbr: 'App', category: 'magic', status: 'reviewed' },
  { id: 'RM', file: 'Ars Magica 5e - Magic - Rival Magic.md', title: 'Rival Magic', abbr: 'RM', category: 'magic', status: 'wip' },
  { id: 'CC', file: 'Ars Magica 5e - Magic - The Cradle & the Crescent.md', title: 'The Cradle & the Crescent', abbr: 'C&C', category: 'magic', status: 'wip' },
  { id: 'HP', file: 'Ars Magica 5e - Magic - Hermetic Projects.md', title: 'Hermetic Projects', abbr: 'HP', category: 'magic', status: 'wip' },
  { id: 'MoH', file: 'Ars Magica 5e - Magi of Hermes.md', title: 'Magi of Hermes', abbr: 'MoH', category: 'magic', status: 'wip' },
  { id: 'LoH', file: 'Ars Magica 5e - Legends of Hermes.md', title: 'Legends of Hermes', abbr: 'LoH', category: 'magic', status: 'reviewed' },
  { id: 'RoP_M', file: 'Ars Magica 5e - Realms of Power - Magic.md', title: 'Realms of Power: Magic', abbr: 'RoP:M', category: 'realms', status: 'reviewed' },
  { id: 'RoP_F', file: 'Ars Magica 5e - Realms of Power - Faerie.md', title: 'Realms of Power: Faerie', abbr: 'RoP:F', category: 'realms', status: 'reviewed' },
  { id: 'RoP_D', file: 'Ars Magica 5e - Realms of Power - The Divine (Revised).md', title: 'Realms of Power: The Divine', abbr: 'RoP:D', category: 'realms', status: 'reviewed' },
  { id: 'RoP_I', file: 'Ars Magica 5e - Realms of Power - The Infernal.md', title: 'Realms of Power: The Infernal', abbr: 'RoP:I', category: 'realms', status: 'reviewed' },
  { id: 'ML', file: 'Ars Magica 5e - Mythic Locations.md', title: 'Mythic Locations', abbr: 'ML', category: 'setting', status: 'reviewed' },
  { id: 'TME', file: 'Ars Magica 5e - Transforming Mythic Europe.md', title: 'Transforming Mythic Europe', abbr: 'TME', category: 'setting', status: 'reviewed' },
  { id: 'Hooks', file: 'Ars Magica 5e - Hooks.md', title: 'Hooks', abbr: 'Hooks', category: 'setting', status: 'reviewed' },
  { id: 'DI', file: 'Ars Magica 5e - Dies Irae - A Book of Wrathful Days.md', title: 'Dies Irae', abbr: 'DI', category: 'setting', status: 'reviewed' },
  { id: 'TtA', file: 'Ars Magica 5e - Through the Aegis - Developed Covenants.md', title: 'Through the Aegis', abbr: 'TtA', category: 'covenant', status: 'wip' },
  { id: 'LC', file: 'Ars Magica 5e - Living Covenant.md', title: 'The Living Covenant', abbr: 'LC', category: 'covenant', status: 'wip' },
  { id: 'Antag', file: 'Ars Magica 5e - Antagonists.md', title: 'Antagonists', abbr: 'Antag', category: 'setting', status: 'wip' },
  { id: 'MB', file: 'Ars Magica 5e - Mundane Beasts.md', title: 'Mundane Beasts', abbr: 'MB', category: 'setting', status: 'wip' },
  { id: 'ToP', file: 'Ars Magica 5e - Tales of Power.md', title: 'Tales of Power', abbr: 'ToP', category: 'adventure', status: 'wip' },
  { id: 'ToME', file: 'Ars Magica 5e - Tales of Mythic Europe.md', title: 'Tales of Mythic Europe', abbr: 'ToME', category: 'adventure', status: 'wip' },
  { id: 'TTT', file: 'Ars Magica 5e - Thrice-Told Tales.md', title: 'Thrice-Told Tales', abbr: 'TTT', category: 'adventure', status: 'wip' },
  { id: 'BCoC', file: 'Ars Magica 5e - Adventure - Broken Covenant of Calebais.md', title: 'The Broken Covenant of Calebais', abbr: 'BCoC', category: 'adventure', status: 'wip' },
  { id: 'AtD', file: 'Ars Magica 5e - Against the Dark - The Transylvanian Tribunal.md', title: 'Against the Dark (Transylvania)', abbr: 'AtD', category: 'tribunal', status: 'reviewed' },
  { id: 'GotF', file: 'Ars Magica 5e - Guardians of the Forests - The Rhine Tribunal.md', title: 'Guardians of the Forests (Rhine)', abbr: 'GotF', category: 'tribunal', status: 'reviewed' },
  { id: 'LaL', file: 'Ars Magica 5e - The Lion and the Lily - The Normandy Tribunal.md', title: 'The Lion and the Lily (Normandy)', abbr: 'L&L', category: 'tribunal', status: 'reviewed' },
  { id: 'SE', file: 'Ars Magica 5e - The Sundered Eagle - The Theban Tribunal.md', title: 'The Sundered Eagle (Thebes)', abbr: 'SE', category: 'tribunal', status: 'reviewed' },
  { id: 'LotN', file: 'Ars Magica 5e - Lands of the Nile - Egypt, Ethiopia & Nubia.md', title: 'Lands of the Nile', abbr: 'LotN', category: 'tribunal', status: 'reviewed' },
  { id: 'FF', file: 'Ars Magica 5e - Faith & Flame - The Provencal Tribunal.md', title: 'Faith & Flame (Provençal)', abbr: 'F&F', category: 'tribunal', status: 'wip' },
  { id: 'CI', file: 'Ars Magica 5e - The Contested Isle - The Hibernian Tribunal.md', title: 'The Contested Isle (Hibernia)', abbr: 'CI', category: 'tribunal', status: 'wip' },
  { id: 'BSS', file: 'Ars Magica 5e - Between Sand & Sea - Mythic Africa.md', title: 'Between Sand & Sea (Mythic Africa)', abbr: 'BS&S', category: 'tribunal', status: 'wip' },
];

export const BOOK_BY_ID: Record<string, BookInfo> = Object.fromEntries(BOOKS.map((b) => [b.id, b]));

export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;
export type Season = (typeof SEASONS)[number];
