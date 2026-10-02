// Hand-written details for laboratory Virtues and Flaws whose effects the extracted text can't
// express as fixed numbers: values that depend on a creature or helper, either/or versions,
// conditions, which Specializations a choice may go to, and a few extraction errors.
// (DE Laboratory chapter; Covenants ch.9.)

import type { LabCharacteristic } from './types';

type CharMods = Partial<Record<LabCharacteristic, number>>;

export interface LabInputDef {
  key: string;
  label: string;
  min: number;
  max: number;
  def: number;
}

/** One version of an either/or Virtue or Flaw; it replaces the extracted effects. */
export interface LabAltDef {
  id: string;
  label: string;
  characteristics: CharMods;
  specializations?: Record<string, number>;
  /** lab activities that cannot be done in the lab with this version (Missing Equipment) */
  rulesOut?: string[];
}

/** A condition the player switches on or off; its effects apply only while it is on. */
export interface LabToggleDef {
  key: string;
  label: string;
  def: boolean;
  characteristics: CharMods;
}

export type LabChoiceOptions = string[] | 'arts' | 'forms' | 'activities' | 'all' | 'feature';

export interface LabOptionDef {
  inputs?: LabInputDef[];
  /** Characteristic bonuses from the inputs */
  formula?: (n: Record<string, number>) => CharMods;
  alts?: LabAltDef[];
  /** the version must be chosen: there is no sensible default */
  altRequired?: boolean;
  /** how many times the lab may take it */
  maxTimes?: number;
  /** Boundless: the Size can be anything, so it grows to hold the Virtues at no cost */
  boundless?: boolean;
  toggles?: LabToggleDef[];
  /** replaces the extracted effects (extraction errors and conditional parts moved to toggles) */
  fix?: { characteristics: CharMods; specializations?: Record<string, number> };
  /** where the free Specialization points may go */
  choiceOptions?: LabChoiceOptions;
  /** all the points go to one of the options ("+2 Co or Me") */
  choiceSingle?: boolean;
  /** the effects are up to the troupe: the player sets them on the entry */
  freeForm?: boolean;
  aestheticsMax?: number;
  halveAesthetics?: boolean;
  /** Undecorated: −1 to every Specialization of 2 or more */
  reduceHighSpecs?: boolean;
  note?: string;
}

// Missing Equipment (DE): "If you pick Items, Spells, or Texts, only this one activity cannot be
// undertaken. Otherwise, you must pick two of the activity categories." The other categories are
// those of the activity Specializations.
const SINGLE_GAPS = ['Items', 'Spells', 'Texts'];
const PAIRED_GAPS = ['Experimentation', 'Familiar', 'Longevity Rituals', 'Teaching', 'Vis Extraction'];
const MISSING_EQUIPMENT_ALTS: LabAltDef[] = [
  ...SINGLE_GAPS.map((a) => ({ id: a, label: `no ${a}`, characteristics: { Upkeep: -1 }, rulesOut: [a] })),
  ...PAIRED_GAPS.flatMap((a, i) => PAIRED_GAPS.slice(i + 1).map((b) => ({ id: `${a}+${b}`, label: `no ${a} and no ${b}`, characteristics: { Upkeep: -1 }, rulesOut: [a, b] }))),
];

const INT = (label: string): LabInputDef => ({ key: 'int', label, min: -5, max: 10, def: 0 });
const MT: LabInputDef = { key: 'mt', label: 'Magic Theory', min: 0, max: 15, def: 0 };
const RESTATED = 'This restates the usual helper bonus (DE Laboratory chapter). It is counted here in the lab\'s General Quality, so do not also add this helper as an assistant when working out a Lab Total.';

export const LAB_OPTIONS: Record<string, LabOptionDef> = {
  // helpers and creatures whose bonus depends on them
  'greater-guardian': { inputs: [INT("Creature's Intelligence")], formula: (n) => ({ Safety: n.int }), choiceOptions: 'arts' },
  'lesser-guardian': { choiceOptions: 'arts' },
  'greater-horde': { inputs: [INT("Creatures' Intelligence")], formula: (n) => ({ Safety: n.int }), choiceOptions: 'arts', note: 'Rego is the usual Specialization.' },
  'lesser-horde': { choiceOptions: 'arts', note: 'Rego is the usual Specialization.' },
  servant: { inputs: [INT("Servant's Intelligence")], formula: (n) => ({ Safety: Math.ceil(n.int / 2) }) },
  assistant: { inputs: [INT("Assistant's Intelligence"), MT], formula: (n) => ({ 'General Quality': n.int + n.mt }), note: RESTATED },
  familiar: {
    inputs: [INT("Familiar's Intelligence"), MT, { key: 'cord', label: 'Golden Cord', min: 0, max: 10, def: 0 }],
    formula: (n) => ({ 'General Quality': n.int + n.mt, Safety: n.cord }),
    note: RESTATED,
  },
  studio: { fix: { characteristics: {} }, inputs: [{ key: 'aes', label: 'Aesthetics (number and magnificence of items)', min: 1, max: 3, def: 1 }], formula: (n) => ({ Aesthetics: n.aes }) },

  // either/or versions
  'magical-heating': {
    alts: [
      { id: 'superior', label: 'as Superior Heating, without its Upkeep', characteristics: { Health: 1, Aesthetics: 1 }, specializations: { Ig: 1 } },
      { id: 'excessive', label: 'as Excessive Heating, without its Upkeep', characteristics: { Safety: -1 }, specializations: { Ig: 2 } },
    ],
    note: 'Works as Superior or Excessive Heating but takes no space and costs no Upkeep.',
  },
  'magical-lighting': {
    alts: [
      { id: 'superior', label: 'as Superior Lighting, without its Upkeep', characteristics: { Aesthetics: 1 }, specializations: { Texts: 1, Im: 1 } },
      { id: 'excessive', label: 'as Excessive Lighting, without its Upkeep', characteristics: {}, specializations: { Im: 2 } },
    ],
    note: 'Works as Superior or Excessive Lighting but takes no space and costs no Upkeep.',
  },
  'flawless-equipment': {
    alts: [
      { id: 'mundane', label: 'mundane upkeep', characteristics: { 'General Quality': 2, Upkeep: 2 }, specializations: { 'Vis Extraction': 2 } },
      { id: 'supernatural', label: 'kept up by supernatural means', characteristics: { 'General Quality': 2, Upkeep: -1 }, specializations: { 'Vis Extraction': 2 } },
    ],
  },
  'flawless-tools': {
    alts: [
      { id: 'mundane', label: 'mundane upkeep', characteristics: { Upkeep: 1 }, specializations: { Items: 2 } },
      { id: 'supernatural', label: 'kept up by supernatural means', characteristics: { Upkeep: -1 }, specializations: { Items: 2 } },
    ],
  },
  'empty-flaw': {
    alts: [
      { id: 'upkeep', label: 'kept up: +1 Upkeep', characteristics: { Aesthetics: -1, Upkeep: 1 } },
      { id: 'health', label: 'neglected: −1 Health', characteristics: { Aesthetics: -1, Health: -1 } },
    ],
  },
  'restriction-flaw': {
    alts: [
      { id: 'gq', label: '−1 General Quality', characteristics: { 'General Quality': -1 } },
      { id: 'upkeep', label: '+2 Upkeep', characteristics: { Upkeep: 2 } },
    ],
  },

  'missing-equipment-flaw': {
    alts: MISSING_EQUIPMENT_ALTS,
    altRequired: true,
    maxTimes: 2,
    note: 'Lab work of the chosen kind is impossible in this lab. Items, Spells or Texts alone, or two of the other activities. At most twice.',
  },
  boundless: { boundless: true, note: 'Size may be increased to any desired number: it grows to hold the Virtues, and that extra Size costs no Build Points.' },

  // conditions
  relocation: {
    fix: { characteristics: {}, specializations: { Experimentation: 1 } },
    toggles: [{ key: 'constant', label: 'Relocation is in constant effect (+1 Warping)', def: true, characteristics: { Warping: 1 } }],
  },
  'ice-cavern': {
    fix: { characteristics: { Upkeep: 1, Warping: 1, Aesthetics: 2 } },
    toggles: [{ key: 'cold', label: 'Owner is not immune to the cold (−2 Health)', def: true, characteristics: { Health: -2 } }],
    choiceOptions: ['Re', 'Aq'],
    choiceSingle: true,
  },
  'diminutive-flaw': {
    fix: { characteristics: {} },
    toggles: [{ key: 'big', label: 'Owner is Size 0 or larger', def: true, characteristics: { 'General Quality': -1, Safety: -2, Health: -1, Aesthetics: -1 } }],
  },
  'lightless-flaw': { aestheticsMax: -1, choiceOptions: ['Pe', 'Im'], choiceSingle: true },
  'undecorated-flaw': { reduceHighSpecs: true },
  invisible: { halveAesthetics: true },
  shrouded: { halveAesthetics: true },

  // effects set by the troupe
  enchantment: { freeForm: true, choiceOptions: 'all', note: 'Set the effects of the enchantment (Covenants ch.9 guidelines).' },
  'magic-item': { freeForm: true, choiceOptions: 'all', note: 'Set the effects of the item. A very large item is a Minor Virtue instead.' },
  'site-of-legend': { freeForm: true, choiceOptions: 'all', note: 'Any adjustments to Characteristics and Specializations as appropriate.' },
  'cursed-flaw': { freeForm: true, choiceOptions: 'all', note: 'Any penalties to Characteristics (often Safety) as may be appropriate.' },

  // where Specialization points may go
  'deformed-flaw': { choiceOptions: ['Mu', 'Pe'], choiceSingle: true },
  person: { choiceOptions: ['Co', 'Me'], choiceSingle: true },
  'disorganized-flaw': { choiceOptions: ['Mu', 'Experimentation'], choiceSingle: true },
  'uneven-floor-flaw': { choiceOptions: ['Mu', 'Te'], choiceSingle: true },
  slaves: { choiceOptions: ['Co', 'Me'], choiceSingle: true },
  'infested-flaw': { choiceOptions: ['An', 'He'], choiceSingle: true },
  'chaotic-flaw': { choiceOptions: ['Mu', 'Re'], choiceSingle: true },
  'labyrinth-flaw': { choiceOptions: ['Me', 'Vi'], choiceSingle: true },
  'cramped-flaw': { choiceOptions: 'activities', choiceSingle: true },
  'vis-source': { choiceOptions: 'arts', choiceSingle: true, note: 'The Specialization is the Art of the vis.' },
  'natural-environment': { choiceOptions: ['Cr', 'An', 'Aq', 'Au', 'He', 'Ig', 'Te'] },
  'idyllic-surroundings': { choiceOptions: ['Cr', 'An', 'Aq', 'He', 'Te'] },
  'vile-surroundings-flaw': { choiceOptions: ['Pe', 'An', 'Aq', 'Au', 'Co'] },
  'sacrifices-flaw': { choiceOptions: ['Cr', 'In', 'Mu', 'Pe', 'Re', 'An'] },
  specimens: { choiceOptions: 'forms' },
  gateway: { choiceOptions: 'arts', note: 'Rego is the usual Specialization.' },
  'inhabitants-flaw': { choiceOptions: 'arts' },
  'lair-flaw': { choiceOptions: 'arts' },
  'precarious-flaw': { choiceOptions: 'arts' },
  'gremlins-flaw': { choiceOptions: 'arts' },
  'living-flaw': { choiceOptions: 'arts' },
  'greater-feature': { choiceOptions: 'feature' },
  'lesser-feature': { choiceOptions: 'feature' },
  'greater-focus-flaw': { choiceOptions: 'feature' },
  'lesser-focus-flaw': { choiceOptions: 'feature' },
  'greater-expansion': {
    choiceOptions: 'all',
    note: 'An Expansion adds equipment, not floor space: it does not raise Size. Like any Virtue it fills space, which raises the occupied Size; once that is above 0 it lowers Safety (DE: base Safety = Refinement − occupied Size). Raise Size or Refinement to make room.',
  },
  'lesser-expansion': {
    choiceOptions: 'all',
    note: 'An Expansion adds equipment, not floor space: it does not raise Size. Like any Virtue it fills space, which raises the occupied Size; once that is above 0 it lowers Safety (DE: base Safety = Refinement − occupied Size). Raise Size or Refinement to make room.',
  },
  'faerie-ingredients': { choiceOptions: 'all' },
};

/** Free-form entries: the characteristics a player may set. */
export const FREE_FORM_CHARS: LabCharacteristic[] = ['General Quality', 'Upkeep', 'Safety', 'Warping', 'Health', 'Aesthetics'];
