// Reference-data types. Everything here describes *game content* (Virtues, spells,
// abilities...) as extracted from the books, plus the hand-coded mechanics layered
// on top. Saga/character data types live in src/engine/*/types.ts.

export interface SourceRef {
  book: string;
  line?: number;
  anchor?: string;
  page?: number;
}

export type Technique = 'Cr' | 'In' | 'Mu' | 'Pe' | 'Re';
export type Form = 'An' | 'Aq' | 'Au' | 'Co' | 'He' | 'Ig' | 'Im' | 'Me' | 'Te' | 'Vi';
export type Art = Technique | Form;

export type Characteristic = 'Int' | 'Per' | 'Str' | 'Sta' | 'Pre' | 'Com' | 'Dex' | 'Qik';

export type AbilityType = 'General' | 'Academic' | 'Arcane' | 'Martial' | 'Supernatural' | 'Mystery' | 'Spell Mastery' | 'Heroic' | 'Special' | 'Social';

export type VFKind = 'virtue' | 'flaw';
export type VFSize = 'Major' | 'Minor' | 'Free';
export type VFCategory =
  | 'General'
  | 'Hermetic'
  | 'Supernatural'
  | 'Social Status'
  | 'Personality'
  | 'Story'
  | 'Mythic Companion'
  | 'Heroic'
  | 'Mystery'
  | 'Special';

export type CharType = 'grog' | 'companion' | 'mythic' | 'magus';

/** What a Virtue/Flaw asks the player to choose when it is taken. */
export type ParamKind =
  | 'ability'
  | 'art'
  | 'technique'
  | 'form'
  | 'characteristic'
  | 'text'
  | 'realm'
  | 'abilityGroup';

export interface ParamSpec {
  kind: ParamKind;
  label: string;
  /** optional list of allowed values (for kind=ability/art/form: allowed ids) */
  options?: string[];
  /** grouped choices, e.g. Faerie Blood heritages by book; shown as a dropdown with "Other" */
  groups?: { label: string; options: string[] }[];
  /** for kind=ability: restrict to ability types */
  abilityTypes?: AbilityType[];
  /** several values may be chosen (stored comma-separated) */
  multiple?: boolean;
  /** the choice can be left blank without a warning */
  optional?: boolean;
}

/**
 * Something a Virtue or Flaw needs the character to have as well. Satisfied by any taken
 * V&F in `anyOf` or matching `match`. Tokens: '$gift' (has The Gift), '$academic' /
 * '$arcane' / '$martial' (may learn that ability type), '$supernaturalAbility'.
 */
export interface VFNeed {
  anyOf?: string[];
  match?: { category?: VFCategory; size?: VFSize; kind?: VFKind };
  label: string;
  /** the book's wording of this requirement */
  quote?: string;
  /** added automatically when this V&F is taken; counts normally unless noPoints */
  auto?: { id: string; size?: VFSize; noPoints?: boolean };
  severity?: 'error' | 'warning';
}

/** '$param' means "the parameter chosen when the Virtue was taken". */
export type ParamRef = '$param';

/**
 * Mechanical effects. The engine interprets these; anything not expressible here is
 * shown as text on the sheet and adjudicated by the troupe.
 */
export type Effect =
  | { type: 'charPoints'; amount: number }
  | { type: 'charBonus'; char: Characteristic | ParamRef; amount: number; max?: number; min?: number }
  | { type: 'greatChar'; char: Characteristic | ParamRef; amount: number } // Great (Characteristic)
  | { type: 'abilityAccess'; abilityTypes?: AbilityType[]; abilities?: string[]; note?: string }
  | { type: 'xpPool'; amount: number; label: string; abilityTypes?: AbilityType[]; abilities?: string[]; arts?: boolean; spellLevels?: boolean; note?: string }
  | { type: 'laterLifeXpPerYear'; amount: number }
  | { type: 'freeSeasons'; amount: number }
  | { type: 'abilityBonus'; ability: string | ParamRef; amount: number }
  | { type: 'artBonus'; art: Art | ParamRef; amount: number }
  | { type: 'abilityAffinity'; ability: string | ParamRef; multiplier?: number }
  | { type: 'artAffinity'; art: Art | ParamRef }
  | { type: 'languageAffinity'; multiplier: number }
  | { type: 'abilityCapBonus'; ability: string | ParamRef; amount: number }
  | { type: 'abilityCapOverride'; note: string }
  | { type: 'grantAbility'; ability: string | ParamRef; score: number }
  | { type: 'deficientArt'; art: Art | ParamRef; scope: 'all' | 'notMR' }
  | { type: 'magicalFocus'; scope: 'major' | 'minor' }
  | { type: 'labTotal'; amount: number; when: LabCondition }
  | { type: 'labTotalMultiplier'; multiplier: number; when: LabCondition }
  | { type: 'castingTotal'; amount: number; when: CastCondition }
  | { type: 'castingScore'; amount: number; when: CastCondition }
  | { type: 'botchDice'; amount: number; when: 'spells' | 'lab' | 'spellsAndLab' | 'dexterity' | string }
  | { type: 'soak'; amount: number }
  | { type: 'woundPenalty'; amount: number }
  | { type: 'fatiguePenalty'; amount: number }
  | { type: 'initiative'; amount: number; when?: string }
  | { type: 'spellInitiative'; amount: number }
  | { type: 'confidence'; score?: number; points?: number }
  | { type: 'reputation'; score: number; label: string; kind?: 'good' | 'bad'; scope?: string }
  | { type: 'warpingPoints'; amount: number }
  | { type: 'apprenticeXp'; amount: number }
  | { type: 'apprenticeSpellLevels'; amount: number }
  | { type: 'apprenticeshipTotalXp'; amount: number } // replaces the 240 (e.g. Redcap 300)
  | { type: 'gift'; kind: 'normal' | 'gentle' | 'blatant' | 'suppressed' }
  | { type: 'size'; amount: number }
  | { type: 'sourceQuality'; amount: number; when: StudyKind[] }
  | { type: 'advancementMultiplier'; multiplier: number; when: StudyKind[] | 'all' }
  | { type: 'teachingQuality'; amount: number }
  | { type: 'bookWritingQuality'; amount: number }
  | { type: 'livingConditions'; amount: number }
  | { type: 'agingRoll'; amount: number }
  | { type: 'agingStartAge'; age: number }
  | { type: 'masteryXp'; amount: number }
  | { type: 'flawlessMagic' }
  | { type: 'spellMasteryMultiplier'; multiplier: number }
  | { type: 'ritualVisMultiplier'; multiplier: number }
  | { type: 'penetrationMultiplier'; multiplier: number }
  | { type: 'magicResistance'; amount: number; when: string }
  | { type: 'elementalMagic' }
  | { type: 'secondaryInsight' }
  | { type: 'implies'; virtue: string; note?: string } // grants another V&F for free
  | { type: 'requiresFlaw'; flaw: string; note?: string }
  | { type: 'socialPenalty'; amount: number; vs: string }
  | { type: 'mightScore'; realm: 'Magic' | 'Faerie' | 'Divine' | 'Infernal'; score: number }
  | { type: 'note'; text: string };

export type LabCondition =
  | 'all'
  | 'notFromText' // Inventive Genius / Creative Block
  | 'experimenting'
  | 'fromText' // Adept Laboratory Student / Weak Scholar
  | 'items' // Weak Enchanter
  | 'longevityForSelf' // Difficult Longevity Ritual
  | 'rangeBeyondTouch'
  | 'circumstance'
  | 'inFocus'
  | 'potent';

export type CastCondition = 'all' | 'formulaic' | 'ritual' | 'formulaicAndRitual' | 'spontaneous' | 'circumstance' | 'notTouching';

export type StudyKind = 'book' | 'teaching' | 'training' | 'practice' | 'exposure' | 'adventure' | 'vis' | 'worship';

export interface VirtueFlawDef {
  id: string;
  name: string;
  kind: VFKind;
  sizes: VFSize[];
  categories: VFCategory[];
  tainted: boolean;
  notes?: string | null;
  text: string;
  source: SourceRef;
  alsoIn?: SourceRef[];
  // --- hand-coded / derived mechanics ---
  param?: ParamSpec;
  repeatable?: boolean;
  effects?: Effect[];
  tags?: string[];
  /** only available to these character types */
  forTypes?: CharType[];
  /** social status restrictions */
  maleOnly?: boolean;
  femaleOnly?: boolean;
  cultures?: string[];
  /** requires another V&F (id) */
  requires?: string[];
  /** ids of V&F this cannot be combined with */
  excludes?: string[];
  /** for social statuses: which statuses it may combine with */
  compatibleStatuses?: string[];
  /** creature-only content (bestiary): hidden by default */
  creatureOnly?: boolean;
  /** Requires The Gift */
  requiresGift?: boolean;
  /** houses-specific (soft: a House's own Virtue) */
  house?: string;
  /** only magi of these Houses may take it */
  houses?: string[];
  houseSeverity?: 'error' | 'warning';
  /** not available to these character types */
  notForTypes?: CharType[];
  /** other V&F (or abilities) this needs; see VFNeed */
  needs?: VFNeed[];
  /** may not be taken by a character with The Gift */
  noGift?: boolean;
  /** limits on the final Characteristic scores */
  minChar?: Partial<Record<Characteristic, number>>;
  maxChar?: Partial<Record<Characteristic, number>>;
  minAge?: number;
  /** for non-human beings built with a Realms of Power creation chapter (e.g. "faerie characters") */
  beings?: string;
  /** belongs to a hedge tradition; normally only its members take it */
  tradition?: string;
  /** only exists in these regions (informational) */
  region?: string;
  /** extra effects that apply when the chosen parameter has this value */
  paramEffects?: Record<string, Effect[]>;
  /** the book's own wording of the restriction, quoted in rules messages */
  restrictionText?: string;
  custom?: boolean;
}

export interface AbilityDef {
  id: string;
  name: string;
  type: AbilityType;
  restricted: boolean; // asterisked: cannot use without a score
  specialties: string[];
  text: string;
  source: SourceRef;
  alsoIn?: SourceRef[];
  /** true for placeholder abilities like "(Area) Lore" that need a parameter */
  parameterized?: boolean;
  isLanguage?: boolean;
  custom?: boolean;
}

export interface SpellDef {
  id: string;
  name: string;
  technique: Technique;
  form: Form;
  level: number | null;
  general: boolean;
  range: string;
  duration: string;
  target: string;
  ritual: boolean;
  requisites: Art[];
  text: string;
  design: string | null;
  base: number | null;
  source: SourceRef;
  alsoIn?: SourceRef[];
  custom?: boolean;
}

export interface GuidelineDef {
  technique: Technique;
  form: Form;
  level: number | null;
  general: boolean;
  text: string;
  source: SourceRef;
}

export interface LabVFDef {
  id: string;
  name: string;
  kind: VFKind;
  size: VFSize;
  group: 'Structure' | 'Outfittings' | 'Supernatural';
  repeatable: boolean;
  text: string;
  modText: string;
  mods: {
    characteristics: Partial<Record<LabCharacteristic, number>>;
    specializations: Record<string, number>;
    choicePoints: number | null;
    choice: string | null;
  };
  source: SourceRef;
  alsoIn?: SourceRef[];
  custom?: boolean;
}

export type LabCharacteristic = 'Size' | 'Refinement' | 'General Quality' | 'Upkeep' | 'Safety' | 'Warping' | 'Health' | 'Aesthetics';

export interface LabFeatureDef {
  id: string;
  name: string;
  text: string;
  specializations: string[];
  source: SourceRef;
}

export interface HookBoonDef {
  id: string;
  name: string;
  kind: 'hook' | 'boon';
  size: 'Major' | 'Minor';
  category: string | null;
  requires: string | null;
  text: string;
  deText?: string;
  source: SourceRef;
  alsoIn?: SourceRef[];
  custom?: boolean;
}

export interface ShapeMaterialDef {
  id: string;
  name: string;
  bonuses: { bonus: number; effect: string }[];
  custom?: boolean;
}

export interface WeaponDef {
  id: string;
  name: string;
  kind: 'melee' | 'missile';
  ability: string;
  init: number | null;
  atk: number | null;
  dfn: number | null;
  dam: number | null;
  str: number | null;
  load: number | null;
  range?: number | null;
  cost: string;
  custom?: boolean;
}

export interface ArmorDef {
  id: string;
  name: string;
  partialProt: number | null;
  partialLoad: number | null;
  fullProt: number | null;
  fullLoad: number | null;
  cost: string;
}

export interface BookInfo {
  id: string;
  file: string;
  title: string;
  abbr: string;
  category: 'core' | 'social' | 'covenant' | 'houses' | 'magic' | 'realms' | 'setting' | 'adventure' | 'tribunal';
  status: 'reviewed' | 'wip';
}
