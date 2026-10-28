// Optional rules: subsystems from the supplements that add detail a troupe may not want. Each can
// be turned on or off for a saga (House rules → Optional rules); a Tribunal's own rules are offered
// when the saga is set in that Tribunal and stay off until the troupe asks for them.

import type { Saga } from './types';

export type OptionGroup = 'Health' | 'Laboratory' | 'Covenant' | 'Society & influence' | 'Houses & Mysteries' | 'Tribunal';

export interface OptionalRule {
  id: string;
  label: string;
  /** what it adds, in a line */
  summary: string;
  /** where in the app it shows */
  where: string;
  group: OptionGroup;
  book: string;
  line: number;
  endLine?: number;
  /** a Tribunal's own rule: offered when the saga is set there, off until chosen */
  tribunal?: string;
  /** on unless the troupe turns it off (otherwise off until turned on) */
  defaultOn: boolean;
}

export const OPTIONAL_RULES: OptionalRule[] = [
  // ---------------------------------------------------------------- health
  { id: 'illness', label: 'Disease and illness', summary: 'Catching diseases, the Disease Penalty, physicians and recovery rolls.', where: 'Combat & Health tab', group: 'Health', book: 'AA', line: 1700, endLine: 1800, defaultOn: true },
  // ---------------------------------------------------------------- laboratory
  { id: 'labRoutines', label: 'Non-standard lab routines', summary: 'Work odd hours or overtime for a bonus to a season’s Lab Total, at a price in health and Warping.', where: 'Lab projects', group: 'Laboratory', book: 'Cov', line: 5638, endLine: 5661, defaultOn: true },
  { id: 'originalResearch', label: 'Original research', summary: 'Stabilize Discoveries toward a Breakthrough.', where: 'Lab tab', group: 'Laboratory', book: 'HoH_TL', line: 849, endLine: 943, defaultOn: true },
  // ---------------------------------------------------------------- covenant
  { id: 'auraVariation', label: 'Aura variation', summary: 'A Magic aura drifts from year to year: the covenant’s magic, vis spent and extracted, and neighbouring auras give a yearly modifier; at ±4 a roll on the Aura Strengthening or Weakening Table, and repeated instability can fracture it into a regio.', where: 'Covenant Overview, and the year’s end on the Seasons page', group: 'Covenant', book: 'RoP_M', line: 509, endLine: 620, defaultOn: false },
  { id: 'libraryResearch', label: 'Library research', summary: 'A roll to find a fact in the covenant’s books.', where: 'Covenant Library tab', group: 'Covenant', book: 'Cov', line: 5252, endLine: 5263, defaultOn: true },
  // ---------------------------------------------------------------- society
  { id: 'agents', label: 'Agents and agencies', summary: 'Recruit agents, keep their Bond, and ask them for information or help.', where: 'Character Overview', group: 'Society & influence', book: 'HoH_S', line: 5647, endLine: 5836, defaultOn: true },
  { id: 'guilds', label: 'Guilds', summary: 'Guild ranks and Guild Lore, the apprentice piece, journeymen’s contracts, becoming a master, dues and the dean’s stipend.', where: 'Seasons & Aging (craftsmen)', group: 'Society & influence', book: 'CG', line: 1147, endLine: 1503, defaultOn: true },
  { id: 'petitions', label: 'Petitioning the Church', summary: 'The Petition Total (Com or Pre + Church Lore + support) against the request’s Ease Factor, one petition a season.', where: 'Character Overview: Society', group: 'Society & influence', book: 'Church', line: 1987, endLine: 2106, defaultOn: true },
  { id: 'courts', label: 'Quick court decisions', summary: 'Settle a trial in one roll: Com + Civil and Canon Law against 6, adjusted for guilt, reputation and witnesses.', where: 'Character Overview: Society', group: 'Society & influence', book: 'CG', line: 903, endLine: 920, defaultOn: false },
  { id: 'etiquette', label: 'Etiquette performances', summary: 'Making an impression at an event, etiquette duels, and gifts and money spent to help.', where: 'Character Overview: Society', group: 'Society & influence', book: 'HoH_S', line: 2137, endLine: 2187, defaultOn: false },
  { id: 'debate', label: 'Debate', summary: 'Argue like certamen: attack and defense Abilities, debate Fatigue, then the Argument Strength that sways the votes at Tribunal.', where: 'Character Overview: Society', group: 'Society & influence', book: 'HoH_S', line: 3711, endLine: 3850, defaultOn: true },
  // ---------------------------------------------------------------- Houses and Mysteries
  { id: 'mysteries', label: 'Mystery Initiation', summary: 'Initiate Mystery Virtues: the Mystagogue’s Initiation Total, the books’ Scripts, Ordeals and the Criamon Paths.', where: 'Advancement tab (Mystery Houses and cult Lores)', group: 'Houses & Mysteries', book: 'DE', line: 16467, endLine: 16535, defaultOn: true },
  // ---------------------------------------------------------------- Tribunals (offered when the saga is set there; off until chosen)
  { id: 'rhineGilds', tribunal: 'Rhine', label: 'Ranks, gilds and voting sigils', summary: 'Apprentice, journeyman, master and archmage; the six political gilds; the sigils each rank holds; peregrinatores and the laws of hospitality.', where: 'Character Overview', group: 'Tribunal', book: 'GotF', line: 542, endLine: 842, defaultOn: false },
  { id: 'rhineForest', tribunal: 'Rhine', label: 'Paths through the Forest', summary: 'Forest Lore, communion with a forest’s genius locus, and pacts: a Sacrifice (Flaw), a Quest, then its Fruit (Virtue).', where: 'Character Overview', group: 'Tribunal', book: 'GotF', line: 1032, endLine: 1224, defaultOn: false },
  { id: 'thebanTokens', tribunal: 'Theban', label: 'Citizenship, tokens and shards', summary: 'Politai and metoikoi, the four phylai, tokens for civic service and shards for harm, neutralizing them, ostracism and the Tribunal’s Longevity Ritual.', where: 'Character Overview', group: 'Tribunal', book: 'SE', line: 1210, endLine: 1360, defaultOn: false },
  { id: 'thebanPatrons', tribunal: 'Theban', label: 'Covenant patrons', summary: 'Each covenant’s patron spirit, and the vis offered at the Ceremony of Propitiation to raise it.', where: 'Covenant Overview', group: 'Tribunal', book: 'SE', line: 1391, endLine: 1430, defaultOn: false },
  { id: 'normandyCompact', tribunal: 'Normandy', label: 'The Perthean Compact', summary: 'Every vis source is a seisin, legacy, tropaeum or luctatio, with seven-year leases and cursors who prove a day’s march.', where: 'Covenant Library & Vis', group: 'Tribunal', book: 'LaL', line: 678, endLine: 802, defaultOn: false },
  { id: 'normandyTourney', tribunal: 'Normandy', label: 'The Hermetic Tourney', summary: 'Score a covenant’s team over the six events, then its rank’s prize pawns and named Sieges.', where: 'Covenant Overview', group: 'Tribunal', book: 'LaL', line: 1103, endLine: 1215, defaultOn: false },
  { id: 'transylvaniaPrivileges', tribunal: 'Transylvan', label: 'Privileges of residence', summary: 'Each magus’s written privilege (cives, socius, colonus, hospes or foederatus) and what it allows and demands.', where: 'Character Overview', group: 'Tribunal', book: 'AtD', line: 938, endLine: 1143, defaultOn: false },
];

export const OPTION_GROUPS: OptionGroup[] = ['Health', 'Laboratory', 'Covenant', 'Society & influence', 'Houses & Mysteries', 'Tribunal'];

/** Is a book in the saga's library (an empty list means every book)? */
export function bookOn(saga: Pick<Saga, 'enabledBooks'> | undefined, book: string): boolean {
  return !saga || saga.enabledBooks.length === 0 || saga.enabledBooks.includes(book);
}

/** Does this Tribunal rule belong to the saga's Tribunal? */
export function tribunalMatches(saga: Pick<Saga, 'tribunal'> | undefined, rule: OptionalRule): boolean {
  return !!rule.tribunal && !!saga?.tribunal && saga.tribunal.toLowerCase().startsWith(rule.tribunal.toLowerCase());
}

/** Is an optional rule in use in this saga? The troupe's choice, else its default (off when its book is not used). */
export function optionOn(saga: Pick<Saga, 'options' | 'enabledBooks' | 'tribunal'> | undefined, id: string): boolean {
  const rule = OPTIONAL_RULES.find((r) => r.id === id);
  if (!rule) return true;
  // a Tribunal's own rules apply only while the saga is set there, whatever was chosen before
  if (rule.tribunal && !tribunalMatches(saga, rule)) return false;
  const chosen = saga?.options?.[id];
  if (chosen !== undefined) return chosen;
  if (rule.tribunal) return false;
  return rule.defaultOn && bookOn(saga, rule.book);
}

/** The Tribunal rules offered to a saga set in their Tribunal. */
export function tribunalOptions(saga: Pick<Saga, 'tribunal'> | undefined): OptionalRule[] {
  return OPTIONAL_RULES.filter((r) => tribunalMatches(saga, r));
}
