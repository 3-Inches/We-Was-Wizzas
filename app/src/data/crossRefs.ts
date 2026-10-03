// Mechanics found by following each Virtue and Flaw's references to other Virtues and Flaws
// (see tools/extract/extract_vf_refs.py and the "Rules it refers to" list under each one): what it
// gives free, what it works "the same as", what it requires and what it rules out. Each entry
// quotes the wording it comes from. These are added to the hand-coded mechanics (data/index.ts),
// never replacing them.

import type { Effect, ParamSpec } from './types';
import type { Mechanics } from './mechanics';

const implies = (virtue: string, note?: string): Effect => ({ type: 'implies', virtue, note });
const note = (text: string): Effect => ({ type: 'note', text });
const ACADEMIC: Effect = { type: 'abilityAccess', abilityTypes: ['Academic'] };

// "The character may select one of the following Virtues at no cost" (Life-Linked Art)
const LIFE_LINKED_CHOICE: ParamSpec = {
  kind: 'text',
  label: 'Free Virtue',
  options: ['Affinity with (Craft or Profession)', 'Free Expression', 'Inspirational', 'Puissant (Craft or Profession)'],
};

const ANTAEUS_CHOICE: ParamSpec = {
  kind: 'text',
  label: 'Minor version: one benefit',
  options: ['+1 Strength', '+1 Brawl', '+1 Soak'],
  optional: true,
};

// "a variety of Faerie Blood" / "a variety of Strong Faerie Blood with the same benefit"
const AS_FAERIE_BLOOD: Effect[] = [{ type: 'abilityAccess', abilities: ['faerie-lore'] }, { type: 'agingRoll', amount: -1 }];
const AS_STRONG_FAERIE_BLOOD: Effect[] = [
  { type: 'abilityAccess', abilities: ['faerie-lore'] },
  { type: 'agingRoll', amount: -3 },
  { type: 'agingStartAge', age: 50 },
  implies('second-sight', 'Second Sight free, as with Strong Faerie Blood'),
];

export const CROSS_REF_MECHANICS: Record<string, Mechanics> = {
  // ------------------------------------------------------------------ gives another Virtue free
  'faerie-raised-magic': { effects: [implies('spell-improvisation', 'This Virtue also includes the Virtue Spell Improvisation.')] },
  'rosh-beth-din': { effects: [implies('social-contacts', 'This Virtue also includes the effects of the Social Contacts Virtue.')] },
  'bound-to-role-role-flaw': { effects: [implies('unaging', 'This Flaw also includes the effects of the Unaging Virtue, but the apparent age advances with the physical age.')] },
  'mythic-mimicry': { effects: [implies('messengers-memory', "This Virtue grants all the abilities of Messenger's Memory.")] },
  dhampir: { effects: [implies('second-sight', 'Dhampirs have the Virtue Second Sight.')] },
  'templar-commander': {
    effects: [
      implies('temporal-influence', 'This Virtue also grants the Temporal Influence Minor Virtue.'),
      implies('brother-knight', 'This Virtue includes the effects of the Brother-Knight Virtue.'),
      { type: 'reputation', score: 3, label: 'Templar Commander', kind: 'good', scope: 'his area' },
    ],
  },
  commander: {
    effects: [
      implies('temporal-influence', 'This Virtue also grants the Temporal Influence Minor Virtue.'),
      implies('brother-knight', 'This Virtue includes the effects of the Brother-Knight Virtue.'),
      { type: 'reputation', score: 3, label: 'Templar Commander', kind: 'good', scope: 'his area' },
    ],
  },
  'vis-sensitivity': {
    // "You may also begin with the Magic Sensitivity virtue at no cost. Magic Sensitivity is not compulsory."
    param: { kind: 'text', label: 'Magic Sensitivity', options: ['Take Magic Sensitivity free', 'Go without it'], optional: true },
    paramEffects: { 'Take Magic Sensitivity free': [implies('magic-sensitivity', 'Magic Sensitivity at no cost')] },
  },
  'life-linked-art': {
    param: LIFE_LINKED_CHOICE,
    paramEffects: {
      'Affinity with (Craft or Profession)': [implies('affinity-with-ability', 'Choose the Craft or Profession on the free Virtue')],
      'Free Expression': [implies('free-expression')],
      Inspirational: [implies('inspirational')],
      'Puissant (Craft or Profession)': [implies('puissant-ability', 'Choose the Craft or Profession on the free Virtue')],
    },
  },
  'of-kings-and-giants-antaeus-bloodline': {
    // "ages as per the Faerie Blood Virtue (Minor) or the Strong Faerie Blood Virtue (Major)"
    param: ANTAEUS_CHOICE,
    paramEffects: {
      '+1 Strength': [{ type: 'charBonus', char: 'Str', amount: 1, max: 3 }],
      '+1 Brawl': [{ type: 'abilityBonus', ability: 'brawl', amount: 1 }],
      '+1 Soak': [{ type: 'soak', amount: 1 }],
    },
    sizeEffects: {
      Minor: [{ type: 'agingRoll', amount: -1 }],
      Major: [
        { type: 'agingRoll', amount: -3 },
        { type: 'agingStartAge', age: 50 },
        { type: 'charBonus', char: 'Str', amount: 1, max: 3 },
        { type: 'abilityBonus', ability: 'brawl', amount: 1 },
        { type: 'soak', amount: 1 },
        implies('large', 'The Major version also gains the Large Virtue.'),
        implies('magic-sensitivity', 'The Major version also gains the Magic Sensitivity Virtue.'),
        implies('greater-malediction-flaw', 'The Major version also has the Major Flaw Greater Malediction (Must be Touching the Ground).'),
        note('Away from the ground the bonuses are lost and Soak drops by 2.'),
      ],
    },
  },
  'faerie-blood-jentil': {
    sizeEffects: {
      Minor: [{ type: 'agingRoll', amount: -1 }, { type: 'charBonus', char: 'Str', amount: 1, max: 3 }, note('+1 to recovery rolls.')],
      Major: [
        { type: 'agingRoll', amount: -3 },
        { type: 'agingStartAge', age: 50 },
        { type: 'charBonus', char: 'Str', amount: 1, max: 3 },
        { type: 'size', amount: 1 },
        implies('second-sight', 'As a Major Virtue, it grants Second Sight.'),
      ],
    },
  },
  'blood-of-the-old-gods': {
    sizeEffects: { Minor: AS_FAERIE_BLOOD, Major: AS_STRONG_FAERIE_BLOOD },
    effects: [note('A Sympathy Trait of +1, raised like an Ability up to Warping Score +1 (Minor) or +2 (Major); it can replace a specialty but makes the roll a stress roll.')],
  },

  // ------------------------------------------------------------------ the same as another Virtue
  'eastern-priest': { maleOnly: true, effects: [ACADEMIC, note('The same as Priest, except that the vow of celibacy is not necessarily required.')] },
  'brother-priest': { effects: [ACADEMIC, note('The same implications as the Priest Virtue, but answerable only to superiors within the Templars.')] },
  'legacy-flaw': { effects: [{ type: 'reputation', score: 4, label: 'Legacy (as Hermetic Prestige)', kind: 'good', scope: 'magi of your House' }] },
  'agent-of-the-sultan': {
    // "train constantly between assignments, for a total of three seasons per year … an equivalent of the Wealthy Virtue"
    effects: [{ type: 'laterLifeXpPerYear', amount: 20 }, { type: 'freeSeasons', amount: 3 }],
  },
  'potent-magic': {
    // "covers the same narrow fields as a Minor Magical Focus, and grants a +3 bonus to Lab Totals and Casting Score" (+6 Major)
    sizeEffects: {
      Minor: [{ type: 'castingScore', amount: 3, when: 'circumstance' }, { type: 'labTotal', amount: 3, when: 'circumstance' }],
      Major: [{ type: 'castingScore', amount: 6, when: 'circumstance' }, { type: 'labTotal', amount: 6, when: 'circumstance' }],
    },
  },
  'mythic-blood': { effects: [note('Also includes a hereditary Minor Personality Flaw at no extra cost: take it, and mark it as giving no points.')] },

  // ------------------------------------------------------------------ requires another
  'demonic-powers': { requires: ['demonic-blood'], restrictionText: 'Only a character with the Demonic Blood Virtue may have Demonic Powers.' },
  'the-great-elixir': { requires: ['unaging', 'the-lesser-elixir'], restrictionText: 'The magus must have both the Virtues Unaging and the Lesser Elixir.' },
  theriomorph: {
    needs: [{ anyOf: ['shapeshifter', 'skinchanger', 'lycanthrope-flaw'], label: 'the Shapeshifter or Skinchanger Virtue, or the Lycanthrope Flaw' }],
    restrictionText: 'This Virtue can only be taken if the individual possesses either the Shapeshifter or Skinchanger Virtue, or the Lycanthrope Flaw.',
  },
  'karaite-magic-flaw': {
    needs: [{ anyOf: ['holy-magic'], label: 'Holy Magic (all his magic is designed with Holy Magic instead of Magic Theory)', severity: 'warning' }],
  },

  // ------------------------------------------------------------------ rules another out
  'blood-of-the-nephilim': {
    noGift: true,
    excludes: ['true-faith', 'faerie-blood', 'strong-faerie-blood', 'giant-blood', 'mythic-blood', 'age-quickly-flaw', 'lycanthrope-flaw'],
    restrictionText: 'You may not take The Gift or True Faith, Hermetic Virtues or Flaws, Methods or Powers, Virtues such as Giant, Mythic, or Faerie Blood, Flaws such as Age Quickly or Lycanthrope.',
  },
  'demonic-blood': { excludes: ['unaging', 'age-quickly-flaw'] },
  'mendicant-friar': { excludes: ['wealthy', 'poor-flaw'] },
  perfectus: { excludes: ['wealthy'] },
  redcap: { excludes: ['wealthy', 'poor-flaw'] },
  'ceremonial-spontaneous-magic-flaw': { excludes: ['difficult-spontaneous-magic-flaw', 'weak-spontaneous-magic-flaw'] },
  'flawed-powers-flaw': { excludes: ['deficient-technique-flaw', 'deficient-form-flaw', 'unstructured-caster-flaw'] },
  'incompatible-arts-flaw': { excludes: ['deficient-technique-flaw', 'deficient-form-flaw'] },
  'uncertain-faith-flaw': { excludes: ['true-faith'] },
  'knightly-demands-flaw': { excludes: ['oath-of-fealty-flaw'] },
  'alluring-to-beings': { excludes: ['magical-air-flaw'] },
  'merchant-adventurer': { excludes: ['partner'] },
};
