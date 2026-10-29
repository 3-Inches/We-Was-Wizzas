// The covenants a Tribunal book describes, as data the living-covenant generator builds into a saga:
// each covenant's season, founding, place, aura and holdings, the magi the book names (House, age,
// rank, gild, specialty, Personality Traits, and the full Arts of those it gives a statistics block),
// the magi it counts without naming, how it stands with its neighbors, and the ways it may come to
// the players' covenant. Ages are those the book gives for its present (1220).

import type { Art, Characteristic } from '../types';

export type Wealth = 'poor' | 'modest' | 'comfortable' | 'rich' | 'very rich';
export type Holdings = 'poor' | 'modest' | 'good' | 'great';
export type VisWealth = 'scarce' | 'some' | 'rich' | 'very rich';
export type Rank = 'journeyman' | 'master' | 'archmage';

/** A magus (or a Redcap without the Gift) the book describes. */
export interface BookMagus {
  name: string;
  /** House id (data/houses.ts) */
  house: string;
  gender: 'Male' | 'Female';
  /** age in the book's present */
  age: number;
  /** the book does not give the age: a likely one for the rank */
  ageGuess?: boolean;
  rank: Rank;
  /** the generator's magus archetype (recommend.ts ARCHETYPES id) */
  role: string;
  /** the Arts the book says the magus is strongest in */
  arts?: Art[];
  /** a title or office: Prima of House Bonisagus, librarian, Protector */
  title?: string;
  /** Rhine gild id (engine/tribunal.ts RHINE_GILDS), where the book names it */
  gild?: string;
  traits: [string, number][];
  /** what the book says of them, in a sentence or two */
  note: string;
  familiar?: string;
  heartbeast?: string;
  /** a Redcap of House Mercere without the Gift: made as a companion */
  ungifted?: boolean;
  /** lives at one of the covenant's chapter houses, not its main site */
  chapter?: string;
  /** a guest (peregrinator), not a member */
  guest?: boolean;
  /** inactive: in Final Twilight in all but name, and does nothing with the seasons */
  inactive?: string;
  /** Decrepitude score the book gives (2 if it gives none) */
  decrepitude?: number;
  /** the Arts of the book's statistics block, raised to at the least */
  statArts?: Partial<Record<Art, number>>;
  statChars?: Partial<Record<Characteristic, number>>;
  /** Virtues named in the book's statistics block, by id, added where the rules allow */
  statVirtues?: string[];
  /** the season's priorities, in order, where the book says what the magus spends time on */
  priorities?: string[];
  /** book line of the entry */
  line: number;
}

/** Unnamed magi the book counts, generated to fill the covenant out. */
export interface BookOthers {
  count: number;
  /** Houses to draw from, in turn */
  houses: string[];
  rank: Rank | 'mixed';
  chapter?: string;
  note: string;
}

export interface BookRelation {
  /** the other covenant's id */
  with: string;
  attitude: 'ally' | 'friendly' | 'wary' | 'hostile' | 'enemy';
  note: string;
}

/** A way the covenant may come to the players: a visit, an offer, a request, trouble. */
export interface BookApproach {
  id: string;
  kind: 'trade' | 'request' | 'offer' | 'visit' | 'trouble' | 'invitation';
  text: string;
  /** where in the toolkit it is dealt with */
  page?: 'market' | 'covenant' | 'seasons' | 'tribunal' | 'dice';
  /** the chance a year (in a hundred) that it comes up */
  chance: number;
  /** it no longer comes up from this year (Heorot's admission is decided at the gathering of 1221) */
  until?: number;
  /** the book line it comes from */
  line?: number;
}

/** Something the covenant offers visitors under its own rules (a library, a laboratory, a portal). */
export interface BookService {
  id: string;
  label: string;
  text: string;
  /** what it costs, in pawns of vis a season */
  pawns?: number;
  line: number;
}

export interface BookCovenant {
  id: string;
  name: string;
  season: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
  /** the book does not say: a likely season from what it says */
  seasonGuess?: boolean;
  founded: number;
  place: string;
  aura: number;
  realm: 'Magic' | 'Faerie' | 'Divine' | 'Infernal';
  /** the aura is not given in the book */
  auraGuess?: boolean;
  /** a few sentences: who they are and what they want */
  summary: string;
  /** House most of its magi belong to, if any (a domus magna) */
  domusMagna?: string;
  wealth: Wealth;
  library: Holdings;
  vis: VisWealth;
  /** covenfolk counts as the book gives them, or likely ones */
  folk: { grogs: number; servants: number; craftsmen: number; laborers: number; companions?: number; text: string };
  /** the gild most of its magi lean to, where the book names none for a magus */
  gild?: string;
  magi: BookMagus[];
  others?: BookOthers[];
  relations: BookRelation[];
  approaches: BookApproach[];
  services?: BookService[];
  /** chapter houses: name and place */
  chapters?: { name: string; place: string }[];
  line: number;
}

/** A Tribunal's book: its covenants and the gatherings that bring them together. */
export interface TribunalBook {
  tribunal: string;
  /** the book's key in the reference library (reviewed/*.md) */
  book: string;
  title: string;
  /** the year the book describes */
  present: number;
  /** Tribunal gatherings: every so many years, from this year, at this covenant */
  gathering: { every: number; from: number; at: string; line: number };
  /** other gatherings a House holds (Bjornaer's Gathering of Twelve Years) */
  otherGatherings?: { name: string; every: number; from: number; at: string; house?: string; line: number }[];
  covenants: BookCovenant[];
}
