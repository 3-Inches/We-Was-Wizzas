// Persisted domain model: sagas, characters, covenants, laboratories.
// Everything here is plain JSON (it is saved to IndexedDB and exported to files).

import type { Art, Characteristic, CharType, Form, Technique, VFSize, SpellDef, LabCharacteristic, AbilityType, PowerKind } from '../data/types';
import type { CustomContent } from '../data';
import type { Mechanics } from '../data/mechanics';

export const SCHEMA_VERSION = 1;

// ------------------------------------------------------------------------------ Saga

export interface HouseRules {
  // Character creation
  characteristicPoints: number; // 7
  maxFlawPoints: number; // 10
  maxMinorFlaws: number; // 5
  grogMaxFlawPoints: number; // 3
  mythicVirtueRatio: number; // 2
  maxStoryFlaws: number; // 1 (guideline)
  maxPersonalityFlaws: number; // 2 (guideline)
  maxMajorHermeticVirtues: number; // 1
  childhoodXp: number; // 45
  nativeLanguageXp: number; // 75
  laterLifeXpPerYear: number; // 15
  wealthyXpPerYear: number; // 20
  poorXpPerYear: number; // 10
  apprenticeshipXp: number; // 240
  apprenticeshipSpellLevels: number; // 120
  apprenticeshipYears: number; // 15
  postGauntletPointsPerYear: number; // 30
  postGauntletLabSeasonCost: number; // 10
  spellLevelLimitBonus: number; // +3 (the "aura" in Te+Fo+Int+MT+3)
  enforceAbilityAgeCap: boolean;
  startingConfidenceScore: number; // 1
  startingConfidencePoints: number; // 3
  puissantAbilityBonus: number; // 2
  puissantArtBonus: number; // 3
  affinityMultiplier: number; // 1.5
  // Covenants
  labTextLevelsPerBP: number; // 5
  // Free-form list of the troupe's own rulings, shown in the House Rules page
  rulings: { id: string; title: string; text: string }[];
}

export const DEFAULT_HOUSE_RULES: HouseRules = {
  characteristicPoints: 7,
  maxFlawPoints: 10,
  maxMinorFlaws: 5,
  grogMaxFlawPoints: 3,
  mythicVirtueRatio: 2,
  maxStoryFlaws: 1,
  maxPersonalityFlaws: 2,
  maxMajorHermeticVirtues: 1,
  childhoodXp: 45,
  nativeLanguageXp: 75,
  laterLifeXpPerYear: 15,
  wealthyXpPerYear: 20,
  poorXpPerYear: 10,
  apprenticeshipXp: 240,
  apprenticeshipSpellLevels: 120,
  apprenticeshipYears: 15,
  postGauntletPointsPerYear: 30,
  postGauntletLabSeasonCost: 10,
  spellLevelLimitBonus: 3,
  enforceAbilityAgeCap: true,
  startingConfidenceScore: 1,
  startingConfidencePoints: 3,
  puissantAbilityBonus: 2,
  puissantArtBonus: 3,
  affinityMultiplier: 1.5,
  labTextLevelsPerBP: 5,
  rulings: [],
};

export interface Saga {
  id: string;
  name: string;
  description: string;
  currentYear: number;
  currentSeason: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
  tribunal: string;
  enabledBooks: string[]; // [] means all
  houseRules: HouseRules;
  mechanicsOverrides: Record<string, Partial<Mechanics>>;
  custom: CustomContent;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  journal: JournalEntry[];
  /** the storyguide's settings for the guided build */
  guided?: SagaGuidedSettings;
}

export interface JournalEntry {
  id: string;
  year: number;
  season: string;
  title: string;
  text: string;
  characterIds: string[];
}

// ------------------------------------------------------------------------------ Character

/** Where experience points came from. */
export type XpSource =
  | 'native' // 75 xp native language
  | 'childhood' // 45 xp
  | 'laterLife'
  | 'apprenticeship'
  | 'postGauntlet'
  | 'free' // granted by virtues (e.g. Second Sight 1)
  | 'play' // gained in play (already includes affinity etc.)
  | 'adjust' // manual correction
  | `pool:${string}`; // virtue xp pools, keyed by the virtue instance uid

export type XpAlloc = Partial<Record<XpSource, number>>;

export interface CharVirtue {
  uid: string;
  defId: string;
  size: VFSize;
  param?: string;
  /** granted without cost (House Virtue, Mythic Companion freebies, Ex Misc package, implied) */
  free?: boolean;
  freeReason?: string;
  note?: string;
  /** Ex Miscellanea compulsory flaw / Diedne dark secret: gives no Virtue points */
  noPoints?: boolean;
  /** a companion Flaw's own character sheet (Magical Being Companion…) */
  characterId?: string;
  /** uid of the Virtue/Flaw whose rules made the character take this one (removed with it) */
  requiredBy?: string;
  /** why the guided build chose it ("from: I expect to cast in a fight — 9") */
  why?: string;
}

export interface CharPower {
  uid: string;
  name: string;
  kind: PowerKind;
  level: number;
  penetration: number;
  /** a Hermetic spell the power copies, if any */
  spellId?: string;
  notes?: string;
}

export interface CharAbility {
  uid: string;
  abilityId: string;
  /** for parameterized abilities (language name, area, craft...) */
  param?: string;
  specialty?: string;
  xp: XpAlloc;
  /** Native language flag */
  native?: boolean;
  /** why the guided build chose it */
  why?: string;
}

export interface CharSpell {
  uid: string;
  spellId?: string; // reference spell, if any
  /** snapshot of the spell (so custom/edited spells survive) */
  spell: SpellDef;
  masteryXp: XpAlloc;
  masteryAbilities: string[];
  source: 'apprenticeship' | 'postGauntlet' | 'play' | 'free';
  notes?: string;
  /** the caster's Magical Focus applies to it */
  inFocus?: boolean;
  /** why the guided build chose it */
  why?: string;
}

export interface PersonalityTrait {
  uid: string;
  trait: string;
  score: number;
}

export interface Reputation {
  uid: string;
  text: string;
  scope: string;
  score: number;
  points?: number;
}

export interface WeaponLoadout {
  uid: string;
  weaponId: string;
  name?: string;
  /** optional second item (e.g. shield) */
  shieldId?: string;
  quality?: number;
}

export interface EnchantedEffectRecord {
  uid: string;
  name: string;
  technique: Technique;
  form: Form;
  requisites: Art[];
  baseLevel: number; // effect level
  range: string;
  duration: string;
  target: string;
  usesPerDay: string; // '1','2','3','6','12','24','50','unlimited'
  penetration: number;
  concentration: boolean;
  effectUse: boolean;
  environmentalTrigger: boolean;
  fastTrigger: boolean;
  linkedTrigger: boolean;
  expiry: 'none' | '1' | '7' | '70';
  modifiedLevel: number;
  description?: string;
  investedPawns?: number;
}

export interface EnchantedItem {
  uid: string;
  name: string;
  kind: 'invested' | 'lesser' | 'charged' | 'talisman';
  material: string;
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
  shapeMaterialIds: string[];
  openedPawns: number;
  charges?: number;
  effects: EnchantedEffectRecord[];
  attunements: { label: string; bonus: number }[];
  creatorId?: string;
  notes?: string;
}

export interface Familiar {
  name: string;
  species: string;
  might: number;
  size: number;
  realm: 'Magic' | 'Faerie' | 'Divine' | 'Infernal';
  bindingTechnique: Technique;
  bindingForm: Form;
  bindingLabTotal: number;
  golden: number;
  silver: number;
  bronze: number;
  pawnsSpent: number;
  powers: EnchantedEffectRecord[];
  notes?: string;
  characterId?: string; // optional full character sheet for the familiar
}

export interface LongevityRitual {
  labTotal: number;
  bonus: number;
  extraVis: number;
  createdYear?: number;
  createdBy?: string;
  forMundane?: boolean;
}

export interface WoundState {
  light: number;
  medium: number;
  heavy: number;
  incapacitating: number;
  dead?: boolean;
}

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
  | 'other';

export interface SeasonLogEntry {
  uid: string;
  year: number;
  season: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
  activity: SeasonActivityKind;
  summary: string;
  /** experience gained: target key -> xp. keys: 'art:Cr', 'ability:<uid>', 'mastery:<spellUid>' */
  gains: Record<string, number>;
  sourceQuality?: number;
  bookId?: string;
  visUsed?: { art: Art; pawns: number }[];
  warpingPoints?: number;
  notes?: string;
  /** applied to the character already (so it can be reverted) */
  applied: boolean;
}

export interface CharacterCreationState {
  step: number;
  /** magus: age when apprenticeship began (default 7-10) */
  apprenticeshipStartAge: number;
  /** magus: years since Gauntlet at saga start */
  yearsPostGauntlet: number;
  /** seasons of lab work taken during post-gauntlet years (cost 10 points each) */
  postGauntletLabSeasons: number;
  childhoodPackage?: string;
  finalized: boolean;
  /** player-entered pools e.g. Simple Student years */
  extraPools: { uid: string; label: string; amount: number; abilityTypes?: AbilityType[] }[];
  /** aging before play (DE p.50): the last age rolled for, and what happened */
  agedThrough?: number;
  agingLog?: string[];
  /** where Aging Points the player may place go, when rolling many years at once */
  agingAnyChar?: Characteristic;
  /** renew the Longevity Ritual after a crisis (magi re-invest vis before play) */
  renewLongevity?: boolean;
  agingLivingConditions?: number;
  /** Confidence was set by hand on the Details step (otherwise it follows the rules and Virtues) */
  confidenceSet?: boolean;
  /** why the guided build chose each Art, Characteristic and the Social Status ('art:Cr', 'char:Int', 'status') */
  guidedWhy?: Record<string, string>;
  /** what aging before play changed, kept so it can all be undone */
  preAging?: Pick<Character, 'characteristics' | 'agingPoints' | 'decrepitudePoints' | 'agingLoss' | 'apparentAge' | 'longevity'>;
  /** Ex Miscellanea tradition id */
  exMiscTradition?: string;
  /** chosen house benefit option index */
  houseBenefit?: number;
  concept?: string;
  archetypes?: string[];
}

/** A supernatural or animal being with a sheet of its own (DE Chapter 13: Creature Might, Size). */
export interface CreatureInfo {
  realm: 'Magic' | 'Faerie' | 'Divine' | 'Infernal' | 'None';
  might: number;
  size: number;
  /** magic animal, magic human, spirit, or animate thing (RoP: Magic) */
  kind: 'animal' | 'human' | 'spirit' | 'thing';
  /** how independent it is: an extension of the owner's will, follows orders, or acts on its own */
  intelligence: 'grog' | 'companion' | 'magus';
  /** the character whose Flaw it is */
  ownerId?: string;
  /** that Flaw's uid on the owner */
  ownerVirtueUid?: string;
  /** its powers: Name, Might cost, Init, Form: description */
  powers?: string;
}

export interface Character {
  id: string;
  sagaId: string;
  schemaVersion: number;
  type: CharType;
  /** a creature's Might, Size and kind */
  creature?: CreatureInfo;
  /** things used up once per game session (All According to Plan) */
  session?: { aatpUsed?: boolean };
  name: string;
  player: string;
  gender: string;
  society: string;
  nationality: string;
  birthYear: number;
  age: number;
  apparentAge?: number;
  /** the guided build's answers (Concept step → Guided build) */
  guided?: GuidedState;
  /** supernatural powers bought with the levels of Greater/Lesser/Personal/Ritual Power, Heroes' Birthright */
  powers?: CharPower[];
  /** True Faith score and Faith Points, once play changes them (the Virtue starts at 1 and 1) */
  faith?: { score: number; points: number };
  /** how far aging has lowered each Characteristic (the purchased value is this much higher) */
  agingLoss?: Partial<Record<Characteristic, number>>;
  description: string;
  house?: string;
  covenantId?: string;
  virtues: CharVirtue[];
  characteristics: Record<Characteristic, number>;
  /** short descriptors such as 'keen-eyed' */
  characteristicNotes?: Partial<Record<Characteristic, string>>;
  /** Aging points per characteristic */
  agingPoints: Partial<Record<Characteristic, number>>;
  abilities: CharAbility[];
  arts: Record<Art, XpAlloc>;
  spells: CharSpell[];
  personality: PersonalityTrait[];
  reputations: Reputation[];
  confidence: { score: number; points: number };
  warpingPoints: number;
  decrepitudePoints: number;
  equipment: {
    weapons: WeaponLoadout[];
    armorId?: string;
    armorCoverage: 'none' | 'partial' | 'full';
    other: string;
  };
  items: EnchantedItem[];
  talismanUid?: string;
  familiar?: Familiar;
  longevity?: LongevityRitual;
  wounds: WoundState;
  fatigueLost: number;
  longTermFatigueLost: number;
  sigil?: string;
  twilightScars: string[];
  /** In-game override of derived values: path -> number (e.g. "soak", "art:Cr", "ability:<uid>") */
  overrides: Record<string, number>;
  acknowledgedIssues: string[];
  seasonLog: SeasonLogEntry[];
  creation: CharacterCreationState;
  notes: string;
  portrait?: string;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------------------------ Covenant

export interface CovenantHookBoon {
  uid: string;
  defId?: string;
  name: string;
  kind: 'hook' | 'boon';
  size: 'Major' | 'Minor';
  /** Unknown hook: a Minor hook counting as Major */
  unknown?: boolean;
  note?: string;
  /** the income or vis source a Resources Boon or Hook applies to */
  target?: string;
  /** Hidden, Flawed and Illusory Resources: the resources (by uid) paid from its 250 Build Points */
  resources?: string[];
  /** Flawed Resource: how its story went */
  outcome?: 'pending' | 'saved' | 'lost' | 'botched';
  /** Flawed Resource saved: the resources kept (up to half) */
  kept?: string[];
  /** Natural Disaster: it has struck. Indebted: the debt is still owed (default yes). */
  active?: boolean;
}

export interface LibraryBook {
  uid: string;
  title: string;
  author?: string;
  kind: 'summa' | 'tractatus' | 'labText' | 'castingTablet' | 'mundane';
  subjectType: 'art' | 'ability' | 'spell' | 'other';
  subject: string; // art code, ability id, or spell name
  level: number; // summa level / lab text level
  quality: number;
  /** for lab texts: spell snapshot */
  spell?: SpellDef;
  language: string;
  hidden?: boolean; // part of Hidden Resources
  notes?: string;
  readBy?: string[]; // character ids who studied (tractatus once)
  /** a bundle of lab texts (e.g. from a covenant package): `level` is the total, this the most for one text */
  collectionMax?: number;
  /** the Exceptional Book Boon that provides this book (no Build Points) */
  boonUid?: string;
}

export interface VisSource {
  uid: string;
  name: string;
  art: Art;
  pawnsPerYear: number;
  season?: string;
  description?: string;
  contested?: boolean;
  /** a tenth goes to the Church */
  tithed?: boolean;
  /** the Tithing Miracles Boon increases it */
  miracle?: boolean;
}

export interface VisStock {
  art: Art;
  pawns: number;
}

export interface Specialist {
  uid: string;
  name: string;
  role: 'teacher' | 'specialist' | 'turb-captain' | 'steward' | 'chamberlain' | 'scribe' | 'craftsman' | 'other';
  ability: string;
  score: number;
  com?: number;
  teaching?: number;
  pre?: number;
  rare?: boolean;
  characterId?: string;
  notes?: string;
  /** craftsmen: the craft (CRAFTS id) */
  craft?: string;
  /** how many people of this kind (default 1) */
  count?: number;
  /** sets the most a starting score can be (DE p.48) */
  age?: number;
  /** part of the base covenant or recruited in play: no Build Points */
  free?: boolean;
}

/** A Virtue or Flaw taken by a lab, with the player's choices for it. */
export interface LabVirtueEntry {
  uid: string;
  defId: string;
  /** Specialization points assigned */
  choice?: Record<string, number>;
  note?: string;
  /** numbers the effect depends on (a creature's Intelligence…), or own effects for free-form entries */
  inputs?: Record<string, number>;
  /** which version of an either/or entry */
  alt?: string;
  /** conditions switched on or off */
  toggles?: Record<string, boolean>;
}

export interface Laboratory {
  uid: string;
  name: string;
  ownerId?: string; // character id
  size: number;
  refinement: number;
  virtues: LabVirtueEntry[];
  customMods: Partial<Record<LabCharacteristic, number>>;
  customSpecs: Record<string, number>;
  droppedSpecs: string[];
  personalityTraits: { trait: string; score: number }[];
  use: 'light' | 'typical' | 'heavy';
  notes?: string;
}

export interface CovenfolkCounts {
  grogs: number;
  companions: number; // non-PC companions
  specialists: number;
  craftsmen: number;
  laborers: number;
  servants: number;
  teamsters: number;
  dependents: number;
  horses: number;
}

export type IncomeModification = 'Slump' | 'Contraction' | 'Stagnation' | 'Status Quo' | 'Growth' | 'Expansion' | 'Boom';

export interface IncomeSource {
  uid: string;
  name: string;
  type: string;
  level: 'None' | 'Lesser' | 'Typical' | 'Greater' | 'Legendary';
  /** pounds a year when entered by hand (customPounds) */
  pounds: number;
  /** use `pounds` instead of the book value for the level */
  customPounds?: boolean;
  /** the yearly change set by the storyguide (Covenants ch.5) */
  modification?: IncomeModification;
  /** gained or changed in play: its level is not set by Boons and Hooks */
  inPlay?: boolean;
  /** a tenth goes to the Church */
  tithed?: boolean;
  /** the Tithing Miracles Boon increases it */
  miracle?: boolean;
}

export interface Covenant {
  id: string;
  sagaId: string;
  schemaVersion: number;
  name: string;
  tribunal: string;
  season: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
  foundedYear: number;
  description: string;
  aura: number; // base aura (3) — boons add
  auraRealm: 'Magic' | 'Faerie' | 'Divine' | 'Infernal';
  powerLevel: 'Low' | 'Medium' | 'High' | 'Legendary';
  buildPoints: number;
  memberIds: string[];
  hooksBoons: CovenantHookBoon[];
  library: LibraryBook[];
  visSources: VisSource[];
  visStocks: VisStock[];
  items: EnchantedItem[];
  specialists: Specialist[];
  labs: Laboratory[];
  spareLabs: number;
  covenfolk: CovenfolkCounts;
  income: IncomeSource[];
  finances: {
    treasury: number;
    inflation: number;
    tithes: number;
    sundry: number;
    wages: 'none' | 'miserly' | 'standard' | 'generous' | 'lavish';
    pension: boolean;
    equipment: 'inexpensive' | 'standard' | 'standard+expensive' | 'any';
    livingConditions: number;
    weaponArmorPoints: number;
    magicSavings: number;
    /** older files: moved to craftsmen in `specialists` */
    craftSavings: { uid: string; craft: string; category: string; score: number; rare: boolean }[];
    paidSoldierPennies: number;
    /** Tithing Miracles: what tithed income and vis is multiplied by (1.8 = the tithed tenth made good and the rest doubled) */
    miracleMultiplier?: number;
    /** starting reserve bought with Build Points (1 BP per 10 pounds) */
    startingReserve?: number;
    /** adjust the principal income by 15 pounds per magus above or below six (Covenants ch.5) */
    magiIncomeAdjust?: boolean;
  };
  loyalty: { actionPoints: number; yearsFounded?: number };
  log: { uid: string; year: number; season?: string; text: string; treasuryDelta?: number; visDelta?: VisStock[] }[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** What a player has told the guided build (design spec: Guided Build). */
export interface GuidedState {
  /** question id → 0-10; 'tb:<tag>' tie-breaker ratings; 'vf:<id>' "still interested?" */
  answers: Record<string, number>;
  /** Virtues and Flaws the player turned down */
  declined: string[];
  /** a House the player picked in the guided build */
  house?: string;
}

/** The storyguide's saga settings for the guided build (never asked of players). */
export interface SagaGuidedSettings {
  /** how present each realm is, 0-10 (5: as in the core book) */
  realms: Record<'magic' | 'faerie' | 'divine' | 'infernal' | 'mundane', number>;
  /** 0: the saga covers a few years … 10: it spans decades */
  speed: number;
  /** how much Hermetic politics, 0-10 */
  politics: number;
}

export const DEFAULT_SAGA_SETTINGS: SagaGuidedSettings = { realms: { magic: 5, faerie: 5, divine: 5, infernal: 5, mundane: 5 }, speed: 5, politics: 5 };
