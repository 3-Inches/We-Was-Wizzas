// The mechanics reference: every game mechanic in the reviewed 5th Edition books, found by
// heading, grouped by area and topic, and shown with a short summary and the book's own text.
// The data is built by tools/extract/build_mechanics.py into generated/mechanics/: index.json,
// with the areas and their topics, and one file per area with its mechanics in full.

export type MechanicsAudience = 'all' | 'magi' | 'companions' | 'grogs' | 'storyguide' | 'covenant';

export interface MechanicsEntry {
  id: string;
  title: string;
  /** book id (see BOOKS) and the 1-based line of the section's heading */
  book: string;
  line: number;
  /** last line to show, when the mechanic is only part of its section */
  endLine?: number;
  audience: MechanicsAudience[];
  /** 1 used constantly, 2 common, 3 situational, 4 needs a Virtue, House, initiation, tradition or being type */
  prevalence: 1 | 2 | 3 | 4;
  creation?: boolean;
  /** what grants access to a prevalence-4 mechanic */
  requires?: string;
  summary: string;
  /** key rules quoted exactly from the book */
  quotes?: string[];
  /** "see also" notes; `to` links one that names another mechanic */
  related?: { text: string; to?: string }[];
  /** the topic it sits under, in a group split by topic */
  section?: string;
  /** the same rules, printed in other books */
  alsoIn?: { book: string; line: number; endLine?: number; title: string }[];
  /**
   * Other books' versions of this rule, with different text. A rule several books give is listed
   * once: under the Definitive Edition if it has it, otherwise under the newest book.
   */
  versions?: MechanicsVersion[];
}

export type MechanicsVersion = Omit<MechanicsEntry, 'versions' | 'audience' | 'creation' | 'alsoIn' | 'section'>;

export interface MechanicsGroup {
  id: string;
  title: string;
  intro?: string;
  entries: MechanicsEntry[];
}

/** A topic as the index lists it, without its mechanics. */
export interface MechanicsGroupSummary {
  id: string;
  title: string;
  intro?: string;
  /** how many mechanics it has for each audience filter, in the order of MECHANICS_FILTERS */
  counts: number[];
  books: string[];
  /** the titles of its first mechanics */
  sample: string[];
  /** what its gated mechanics need */
  requires: string[];
}

export interface MechanicsAreaSummary {
  id: string;
  title: string;
  icon: string;
  intro: string;
  groups: MechanicsGroupSummary[];
  /** topics of mechanics that need a Virtue, House, initiation, tradition or being type */
  gated: MechanicsGroupSummary[];
}

export interface MechanicsIndex {
  total: number;
  areas: MechanicsAreaSummary[];
}

/** One area's file: its topics with their mechanics. */
export interface MechanicsArea {
  id: string;
  groups: MechanicsGroup[];
  gated: MechanicsGroup[];
}

/** The audience filters, as the index counts them ('' is everything). */
export const MECHANICS_FILTERS = ['', 'magi', 'companions', 'grogs', 'storyguide'] as const;
