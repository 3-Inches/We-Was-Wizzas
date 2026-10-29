// The covenants a Tribunal book describes, as data the living-covenant generator builds into a saga:
// each covenant's season, founding, place, aura and holdings, the magi the book names (House, age,
// rank, gild, specialty, Personality Traits, and the full Arts of those it gives a statistics block),
// the magi it counts without naming, how it stands with its neighbors, and the ways it may come to
// the players' covenant. Ages are those the book gives for its present (1220).

import type { Art } from '../types';

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
  /** the season's priorities, in order, where the book says what the magus spends time on */
  priorities?: string[];
  /** book line of the entry */
  line: number;
}

/**
 * A character as a book's stat block gives it (engine/character/statBlock reads it): every field in
 * the book's own words and layout, so a block can be copied straight from the page.
 */
export interface StatBlock {
  /** 'Int +2, Per +3, Pre –1 (2), …': the Aging Points in brackets */
  characteristics: string;
  /** as the book lists them: 'The Gift; Journeyman; Affinity with Folk Ken, Clear Thinker, …; Meddler; …' */
  virtues: string;
  /** 'Artes Liberales 2 (logic), Athletics 1 (stamina), …' */
  abilities: string;
  /** 'Cr 4, In 10+3, Mu 2, …' (the +3 is Puissant, not part of the score) */
  arts?: string;
  /** one a line, as in the book: 'Image of the Beast (InAn 5) +16, Mastery 1 (Quiet Casting)' */
  spells?: string[];
  /** levels of spells beyond those named, from the strongest Arts, for an entry that names few or none */
  moreSpells?: number;
  /** '2 (15)': the score, and the points toward the next */
  warping?: string;
  decrepitude?: string;
  confidence?: string;
  /** 'Meddlesome Upstart 4 (Hermetic), Quaesitor 3 (Hermetic)' */
  reputations?: string;
  /** the Longevity Ritual's bonus, where the book gives one or the magus would have one */
  longevity?: number;
  equipment?: string;
  twilightScars?: string;
  /** the age at Gauntlet, where the book gives it (25 if not) */
  gauntlet?: number;
  /** the age the character looks, where the book gives it */
  apparentAge?: number;
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
  /**
   * Its Boons and Hooks (Covenants ch.2), by id, with what each stands for here. The book gives none:
   * these are read from what it says of the covenant, as a non-player covenant's need not balance.
   * Minor Aura Boons and a Weak Aura Hook are counted in the book's aura, not added to it.
   */
  hooksBoons?: (string | [string, string])[];
  /** what the book says of its aura beyond its strength (a regio's levels, a patchy faerie aura) */
  auraNote?: string;
  /** something that gives its magi a better aura in the laboratory than the covenant's (the magestones of Verditius) */
  labAura?: LabAuraSource;
  /** not yet a member of the Tribunal: the motion (BookMotion id) that would admit it; its magi have no sigils until it passes */
  joins?: string;
  /** chapter houses: name and place */
  chapters?: { name: string; place: string }[];
  line: number;
}

/** A Magic aura a covenant's magi can work in for a few seasons a year, shared among them (GotF, The Magestones of Verditius). */
export interface LabAuraSource {
  name: string;
  realm: 'Magic' | 'Faerie';
  strength: number;
  /** how many there are: as many magi may use one in the same season */
  count: number;
  /** the seasons a year each magus may have one */
  seasonsEach: number;
  text: string;
  line: number;
}

/** A motion the book has the Tribunal debate, and how each gild and covenant stands on it. */
export interface BookMotion {
  id: string;
  /** the first gathering it comes before */
  year: number;
  /** after failing, its chance (in a hundred) of coming up again at each later gathering */
  again?: number;
  title: string;
  /** who brings it, and why */
  text: string;
  /** each gild's stand (RHINE_GILDS ids): for, against, or divided */
  gilds: Partial<Record<string, 'for' | 'against' | 'split'>>;
  /** covenants that vote together whatever their gilds (by BookCovenant id), or divide whatever their gilds */
  covenants?: Partial<Record<string, 'for' | 'against' | 'split'>>;
  /** the news when it passes, and when it fails */
  passed: string;
  failed: string;
  line: number;
}

/** A magus of the book who belongs to no covenant: a peregrinator who stays a few years at each, or one who winters at one and summers on the road. */
export interface BookWanderer extends BookMagus {
  wanders: 'peregrinator' | 'seasonal';
  /** where the book has them in its present */
  startsAt?: string;
  /** a peregrinator's stay at each covenant, in years */
  stay?: number;
  /** the covenant a seasonal wanderer winters at when it can */
  winters?: string;
  /** the covenants they favor */
  favors?: 'young' | 'any';
  /** how they come to the players' covenant */
  approach: BookApproach;
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
  gathering: { every: number; from: number; at: string; line: number; season?: 'Spring' | 'Summer' | 'Autumn' | 'Winter' };
  /** other gatherings a House holds (Bjornaer's Gathering of Twelve Years) */
  otherGatherings?: { name: string; every: number; from: number; at: string; house?: string; line: number }[];
  covenants: BookCovenant[];
  /** each named magus's stat block, by name: the book's own, or one written to what it says of them */
  sheets?: Record<string, StatBlock>;
  /** what the book says of each named magus, in its own words, by name */
  texts?: Record<string, string>;
  /** the motions its gatherings debate */
  motions?: BookMotion[];
  /** its magi who belong to no covenant */
  wanderers?: BookWanderer[];
  /** sigils one magus casts for others of their House (House Tremere's exarchs): of those at these covenants, or of all the rest; the first that applies */
  heldSigils?: { house: string; holder: string; covenants?: string[]; line: number }[];
}
