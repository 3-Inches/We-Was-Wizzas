// A character's season log: each season's work, what it gained, and what Unlog needs to take it back
// (engine/unlog.ts). Part of the persisted model (types.ts), kept apart so that file need not grow.

import type { Art } from '../data/types';
import type { GreatBuilding, LabProject, PriorityKind, Workshop } from './types';

export type SeasonActivityKind =
  | 'study-book'
  | 'study-vis'
  | 'taught'
  | 'trained'
  | 'practice'
  | 'exposure'
  | 'adventure'
  | 'teach'
  | 'invent-spell'
  | 'learn-spell-text'
  | 'learn-spell-teacher'
  | 'enchant-item'
  | 'longevity-ritual'
  | 'bind-familiar'
  | 'vis-extraction'
  | 'write-book'
  | 'copy-book'
  | 'lab-improvement'
  | 'work'
  | 'worship'
  | 'other';

export interface SeasonLogEntry {
  uid: string;
  year: number;
  season: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
  activity: SeasonActivityKind;
  summary: string;
  /**
   * How the Chronicle tells the season: a phrase that follows the character's name, made from what the
   * work did ("brewed four doses of a Healing potion in the kitchen"; engine/seasonTold.ts). The
   * Chronicle prefers it to its stock phrases for the activity. Older entries have none.
   */
  told?: string;
  /** experience gained: target key -> xp. keys: 'art:Cr', 'ability:<uid>', 'mastery:<spellUid>' */
  gains: Record<string, number>;
  sourceQuality?: number;
  bookId?: string;
  visUsed?: { art: Art; pawns: number }[];
  warpingPoints?: number;
  notes?: string;
  /** the kind of lab project worked in the season (vis extraction weakens a Magic aura) */
  labKind?: LabProject['kind'];
  /** Secondary Insight's points are in its gains already (added once, when the season was first applied) */
  insight?: boolean;
  /** one of the extra seasons a character who needs no sleep has each year */
  extra?: boolean;
  /** the season priority it was spent on */
  priority?: PriorityKind;
  /** applied to the character already (so it can be reverted) */
  applied: boolean;
  /** what else the season changed, so Unlog can take it back (engine/unlog.ts) */
  undo?: SeasonUndo;
}

/**
 * What a logged season changed besides its experience and Warping: Unlog reverses it. A season whose
 * work finished something (a spell learned, an item made, a familiar bound) is `final`: what it made
 * stays on the sheet, and the season cannot be unlogged.
 */
export interface SeasonUndo {
  /** Labor Points the season earned (negative: spent) */
  laborPoints?: number;
  /** the workshop's counters as they were before */
  workshop?: Partial<Pick<Workshop, 'seasonsWorked' | 'reputationXp' | 'shoddyStreak' | 'innovation' | 'rawMaterials'>> & { wonder?: Workshop['wonder'] | null };
  /** the lab project as it was before the season's work */
  project?: LabProject;
  /** vis the season spent, and where from */
  vis?: { from: 'purse' | 'covenant'; covenantId?: string; taken: { art: Art; pawns: number; pair?: Art }[] };
  /** vis the season put in the purse or the covenant's stores (drawn from an aura, or moved), and where */
  visAdded?: { to: 'purse' | 'covenant'; covenantId?: string; added: { art: Art; pawns: number; pair?: Art }[] };
  /** pounds the season spent from the purse */
  pounds?: number;
  /** Warping Points the season's work added outside its gains */
  warping?: number;
  /** what its work left owed on the Resolve list (a Warping reaction), by uid: taken off again */
  owed?: string[];
  /** Virtues the season gave (an Initiation) */
  virtueUids?: string[];
  /** the Initiation it recorded */
  initiationUid?: string;
  /** a Discovery it stabilized (original research) */
  discoveryUid?: string;
  /** a season taught to the apprentice */
  apprentice?: boolean;
  /** writing projects' points as they were */
  writing?: { uid: string; points: number }[];
  /** a tractatus read: its reader is struck off again */
  tractatus?: { covenantId: string; bookUid: string };
  /** a great building as it was before the season's work (none: the season began it) */
  building?: { covenantId: string; uid: string; before?: GreatBuilding };
  /** why it cannot be unlogged: what its work made */
  final?: string;
}
