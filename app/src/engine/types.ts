// Persisted domain model: sagas, characters, covenants, laboratories.
// Everything here is plain JSON (it is saved to IndexedDB and exported to files).

import type { Art, Characteristic, CharType, Effect, Form, Technique, VFSize, SpellDef, LabCharacteristic, AbilityType, PowerKind } from '../data/types';
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
  /** what happened as time passed, newest first (the Seasons page) */
  timeLog?: TimeReport[];
  /** prices the saga uses for trade */
  economy?: { visPrice: number };
  /** optional rules turned on or off by the troupe (see engine/optional.ts); missing ones use their default */
  options?: Record<string, boolean>;
  /** the storyguide's cast: creatures from the books' bestiaries kept to hand (Quick build → Creatures) */
  cast?: CastMember[];
}

/** A creature the storyguide keeps to hand: one from the bestiary (data/bestiary.ts), with their own notes. */
export interface CastMember {
  uid: string;
  /** the bestiary entry */
  creatureId: string;
  name: string;
  /** how many (a pack of wolves) */
  count: number;
  notes: string;
}

export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter';

/** One season's passing: what the time system did, line by line. */
export interface TimeReport {
  id: string;
  year: number;
  season: Season;
  lines: { who?: string; text: string; kind?: 'season' | 'year' | 'aging' | 'crisis' | 'warping' | 'covenant' | 'lab' | 'effect' | 'reminder' | 'money' }[];
}

/**
 * A supernatural effect on a character or a covenant: a spell, power or ritual still working on
 * them, or one that changed them for good (DE: Ritual Creo with Momentary Duration is permanent).
 */
export interface ActiveEffect {
  uid: string;
  name: string;
  /** who or what it came from ("Bingus, Ritual Power") */
  source?: string;
  year: number;
  season: Season;
  /** permanent: done and kept for the record; moon: ends with the season; year: ends four seasons on; indefinite: until ended by hand */
  duration: 'permanent' | 'moon' | 'year' | 'indefinite';
  /** bonuses while it lasts (Characteristic bonuses, Soak, an Ability…) */
  bonuses?: Effect[];
  /** the Virtue it gave (a CharVirtue uid): taken away when the effect ends unless permanent */
  virtueUid?: string;
  /** Characteristics it raised for good */
  raised?: Partial<Record<Characteristic, number>>;
  /** a constant effect: a Warping Point a year while it lasts (DE, Constant Supernatural Effects) */
  constant?: boolean;
  /** Warping Points it gave when it began */
  warping?: number;
  /** a covenant ward to cast again when it ends (the Aegis of the Hearth): who casts it and at what level */
  renew?: { casterId?: string; level: number; art?: Art };
  notes?: string;
}

/**
 * A spell, ritual or power cast on the covenant, kept so that it can be undone: what the caster
 * paid (given back on undo) and what it did to each target (taken back).
 */
export interface CastRecord {
  uid: string;
  name: string;
  source: string;
  casterId: string;
  year: number;
  season: Season;
  /** what happened, as shown when it was cast */
  lines: string[];
  paid: {
    /** where the vis came from: the covenant's stocks or the caster's purse */
    visFrom: 'covenant' | 'purse';
    vis: VisStock[];
    /** Might Points from the pool (net of vis eaten to refill it) */
    pool: number;
    confidence: number;
    mightScore: number;
    fatigue: number;
    longTermFatigue: number;
    /** Warping Points from a botch */
    warping: number;
  };
  done: {
    effects: { characterId: string; effectUid: string }[];
    specialists: { uid: string; raised: Partial<Record<Characteristic, number>>; warping: number }[];
    covenfolkEffectUid?: string;
  };
  /** cast before casts were recorded: what it did was pieced together, and its cost is unknown */
  legacy?: boolean;
  undone?: { year: number; season: Season };
}

/** Money and vis a character holds (an allowance from the covenant, earnings, purchases). */
export interface Purse {
  pounds: number;
  vis: VisStock[];
  log?: { year: number; season: Season; text: string; pounds?: number; vis?: VisStock[] }[];
}

/** What a character does in a season nobody planned (and while time is fast-forwarded). */
export interface StandingActivity {
  kind: 'auto' | 'exposure' | 'practice' | 'vis' | 'lab' | 'work' | 'taught' | 'none';
  /** taught: one of the covenant's teachers ('spec:<uid>') */
  teacher?: string;
  /** 'art:Cr' or 'ability:<uid>' */
  target?: string;
  /** a lab project to work on */
  projectUid?: string;
}

/** Someone bound to help a character (Houses of Hermes: Societates, Agencies). */
export interface Agent {
  uid: string;
  name: string;
  /** their Social Status, and what they can do or give: Abilities, wealth, influence, underlings */
  status: string;
  resources: string;
  /** what binds them, as a Personality Trait (Loyal, Fear of, Gratitude to…) */
  bondTrait: string;
  bond: number;
  /** left while they are being recruited; 0 once they are */
  resistance: number;
  /** agency experience points carried toward the next step */
  xp?: number;
}

/** A disease a character suffers (Art & Academe, Disease). */
export type IllnessStage = 'Minor' | 'Serious' | 'Major' | 'Critical';
export interface Illness {
  uid: string;
  name: string;
  /** the disease from the book's list, when it is one */
  diseaseId?: string;
  stage: IllnessStage;
  /** the stage a disease of one's own began at (its Severity is for that stage) */
  startStage?: IllnessStage;
  severity: number;
  stable: number;
  /** null for a lifelong disease */
  improve: number | null;
  interval: 'Day' | 'Week' | 'Month' | 'Season' | 'Lifelong';
  /** +3 for each stable roll in a row, or −1 for each roll a crisis goes on */
  bonus: number;
  /** it gives a Flaw (named in the notes) instead of a Disease Penalty */
  flawInstead?: boolean;
  notes?: string;
}

/** Non-standard laboratory routines (Covenants): early rising, night work, drugged or overtime work. */
export type LabRoutine = 'early' | 'nocturnal' | 'addled' | 'overtime' | 'double' | 'triple';

/** A laboratory project that runs over one or more seasons (DE, The Laboratory). */
export interface LabProject {
  uid: string;
  kind: 'invent' | 'open' | 'attune' | 'instill' | 'extract' | 'tame' | 'other';
  name: string;
  /** invent: the spell; instill: the effect's Technique, Form and level; tame: the creature's Form and Might */
  technique?: Technique;
  form?: Form;
  requisites?: Art[];
  level?: number;
  spell?: SpellDef;
  /** open, attune, instill: the item (a uid among the character's items) */
  itemUid?: string;
  effectUid?: string;
  /** open: pawns of Vim to put in this season (a talisman may be opened a little at a time) */
  pawns?: number;
  /** add a talisman attunement this season (one a season, while preparing or instilling) */
  attunement?: { label: string; bonus: number };
  /** points gathered toward the level */
  progress: number;
  seasons: number;
  /** the vis has been paid (it is spent in the first season) */
  visPaid?: boolean;
  /** where its vis comes from: the magus's own, or the covenant's stocks */
  visFrom?: 'purse' | 'covenant';
  /** anything else on the Lab Total (a similar spell, a Shape and Material bonus…) */
  bonus?: number;
  /** tame: how many seasons the character had logged when it was last worked (points only add up over consecutive seasons) */
  logMark?: number;
  /** the non-standard lab routines it is worked under (Covenants) */
  routines?: LabRoutine[];
  done?: boolean;
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
  | 'quality' // granted by a Magic Quality (Magical Meditation 1)
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
  /** uid of the Virtue that gives this one at no cost (Strong Faerie Blood: Second Sight); kept in step with it */
  grantedBy?: string;
  /** it was bought before the Virtue that gives it free: it stays (and costs again) if that Virtue goes */
  wasTaken?: boolean;
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
  /** a magic character's mastery points on it (RoP: Magic, Improved Powers): lower Might cost, more Initiative, a Focus Power's level beyond Might (5 each) */
  mastery?: { cost?: number; init?: number; level?: number };
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
  /** still being instilled (a lab project): it does not work yet */
  pending?: boolean;
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
  /** a talisman is attuned only after a season's work (DE, Talisman Attunement); older files count as attuned */
  attuned?: boolean;
  /** bonuses the device gives whoever bears it while it is worn (a constant effect) */
  bearerBonuses?: Effect[];
  worn?: boolean;
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

/** A craftsman's or laborer's livelihood (City & Guild): the business, its workshop and banked Labor Points. */
export interface Workshop {
  /** the Craft or Profession worked (an ability uid) */
  abilityUid?: string;
  /** the craft's primary Characteristic (Dexterity for most crafts, Strength for smiths and laborers) */
  primary: Characteristic;
  innovation: number;
  rawMaterials: number;
  laborPoints: number;
  /** a guild master loses 3 Labor Points a season for each worker short of his Leadership */
  guildMaster?: boolean;
  /** a journeyman's contract: Labor Points a season above or below the usual (City & Guild) */
  contractLp?: number;
  assistants: { uid: string; name: string; craft: number }[];
  manual: number;
  /** raises the base Craft Level of 6 (war, famine, scarce materials, interruptions, auras…) */
  craftLevelMod: number;
  /** seasons worked since the year was last closed */
  seasonsWorked: number;
  reputationXp: number;
  shoddyStreak: number;
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

/** An Initiation into a Mystery: the Virtue gained, the totals, and any Ordeal (which lowers later targets). */
export interface InitiationRecord {
  uid: string;
  year: number;
  season: Season;
  virtueId: string;
  virtueName: string;
  size: VFSize;
  mystagogue: string;
  total: number;
  target: number;
  /** the Ordeal suffered: Minor (a Minor Flaw or loss of a Minor Virtue), Medium (a Minor Flaw made Major), Major */
  ordeal?: 'Minor' | 'Medium' | 'Major';
  ordealText?: string;
  /** a Criamon station, by id */
  station?: string;
}

/** A pact with a forest spirit: the Sacrifice taken at communion, the Quest, and the Fruit it earns. */
export interface ForestPact {
  uid: string;
  path: string;
  spirit: string;
  size: VFSize;
  quest: string;
  /** the Flaw taken as the Sacrifice (its uid on the character) */
  sacrificeUid?: string;
  /** the Virtue the Quest earns */
  fruit?: string;
  done: boolean;
}

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
  /** the Form its Might is associated with */
  form?: Art;
  /** built with the Magic Character Creation rules of Realms of Power: Magic */
  magicCharacter?: MagicCharacterInfo;
  /** Might Points spent from the pool (it refreshes over a day; with Temporary Might, only slowly) */
  poolSpent?: number;
  /** Might Score lost to Ritual Powers, returning only slowly (RoP: Magic, Ritual Power) */
  mightLost?: number;
}

export type MagicSeason = 'spring' | 'summer' | 'autumn' | 'winter';
export type PowerLevel = 'Low' | 'Medium' | 'High' | 'Legendary';

/** A Magic Quality or Inferiority a magic character has (RoP: Magic). */
export interface CreatureQuality {
  uid: string;
  id: string;
  /** a Characteristic, Form or natural weapon it names */
  param?: string;
  /** the Virtue or Flaw a Minor/Major Virtue Quality or Flaw Inferiority brought */
  virtueUid?: string;
}

/** Realms of Power: Magic, Magic Character Creation. */
export interface MagicCharacterInfo {
  /** replaces age for starting experience */
  season: MagicSeason;
  /** the saga's power level, which sets the suggested Might */
  powerLevel: PowerLevel;
  /** the Might chosen before Size (magic animals), Improved and Reduced Might; also the Quality points */
  baseMight: number;
  form?: Art;
  qualities: CreatureQuality[];
  /** mastery points turned into experience: 5 each in Concentration, Finesse or Penetration */
  masteryXp?: number;
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
  /** a storyguide's character (made by the generator as an NPC, or marked so): listed apart from the players' */
  npc?: boolean;
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
  /** how much of the year it spends in the covenant's aura, for the Warping a strong one gives (DE, Living in Strong Auras); always, unless set */
  auraTime?: 'always' | 'half' | 'visits' | 'away';
  /** the highest Warping Score whose effects on a non-magus the year's end has reported (DE, Effects of Warping) */
  warpingNoted?: number;
  /** the realm a non-magus's Warping Score 5 Virtue is attuned to: an aura of that realm no longer warps it */
  warpingAttuned?: 'Magic' | 'Faerie' | 'Divine' | 'Infernal';
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
  workshop?: Workshop;
  longevity?: LongevityRitual;
  /** spells, powers and rituals working on the character, or that changed it for good */
  activeEffects?: ActiveEffect[];
  /** Characteristic points raised by magic (the purchased value is this much lower) */
  magicGain?: Partial<Record<Characteristic, number>>;
  purse?: Purse;
  projects?: LabProject[];
  /** the agents the character controls or is recruiting (HoH: Societates) */
  agents?: Agent[];
  /** Mystery Initiations the character has undergone (DE and Houses of Hermes: Mystery Cults) */
  initiations?: InitiationRecord[];
  /** the Criamon Path the magus follows (Houses of Hermes: Mystery Cults) */
  criamonPath?: string;
  /** a Bjornaer's heartbeast: the one creature the magus is as well as human */
  heartbeast?: string;
  /** the Rhine's rank and gild (Guardians of the Forests) */
  rhine?: { rank: 'apprentice' | 'journeyman' | 'master' | 'archmage'; gild?: string; sponsors?: string[]; guestAt?: string };
  /** pacts with forest spirits along the Paths through the Forest (Guardians of the Forests) */
  forestPacts?: ForestPact[];
  /** Theban citizenship, tokens and shards (The Sundered Eagle) */
  theban?: { citizen: boolean; phyle?: string; tokens: number; shards: number; log: { year: number; text: string }[] };
  /** a Transylvanian resident's privilege (Against the Dark) */
  privilege?: string;
  /** guild membership (City & Guild): the guild, a rank earned in play, dues and the master's vote */
  guild?: { name: string; rank?: 'apprentice' | 'journeyman' | 'master' | 'senior' | 'dean'; dues?: number; paidYear?: number; masterVote?: boolean; fined?: boolean };
  /** diseases the character suffers (Art & Academe) */
  illnesses?: Illness[];
  /** original research toward a Breakthrough (Houses of Hermes: True Lineages): its goal and the stabilized discoveries so far */
  research?: {
    goal: string;
    kind: 'minor' | 'major' | 'hermetic';
    /** the number of points the storyguide set (the player should not know it) */
    target?: number;
    discoveries: { uid: string; name: string; magnitude: number; year?: number; season?: Season; fromText?: boolean }[];
  };
  /** seasons worked under each non-standard lab routine, in all and by year (for Warping and the year's Living Conditions) */
  labRoutines?: { seasons: Partial<Record<LabRoutine, number>>; years: Record<number, Partial<Record<LabRoutine, number>>> };
  /** what the character does in a season nobody planned */
  standing?: StandingActivity;
  /** the last year whose aging roll was made */
  lastAgedYear?: number;
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
  /** bought by a member for their own use (kept in the covenant's library) */
  ownerId?: string;
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
  /** dedicated vis (RoP: Magic): each pawn holds a Technique and a Form and works as two pawns for them; 7.5 Build Points a pawn a year */
  dedicated?: boolean;
  /** the other Art of a dedicated source's Technique + Form */
  pair?: Art;
  /** found or won in play: no Build Points */
  inPlay?: boolean;
  /** Normandy's Perthean Compact: how the covenant holds it, and the year its lease began */
  perthean?: 'seisin' | 'legacy' | 'tropaeum' | 'luctatio' | 'interim' | 'undeclared';
  leaseYear?: number;
}

/** The covenant's yearly gift to its members (the charter's division of resources). */
export interface Allowance {
  /** pounds: a flat sum each, or a share of the year's surplus split evenly */
  mode: 'none' | 'flat' | 'percent';
  amount: number;
  /** who receives it */
  to: 'magi' | 'members';
  /** a share of the year's vis harvest (percent), split evenly among the magi */
  visShare: number;
}

export interface VisStock {
  art: Art;
  pawns: number;
  /** dedicated vis: the other Art of its Technique + Form (each pawn works as two for that combination) */
  pair?: Art;
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
  /** the Abilities this person uses or teaches (the highest sets the cost); `ability` and `score` follow the highest */
  abilities?: { id: string; param?: string; score: number }[];
  /** Characteristics as far as the job uses them (Com to teach, Dex for most crafts, Pre to lead); older files keep Com and Pre in `com` and `pre` */
  chars?: Partial<Record<Characteristic, number>>;
  /** Characteristic points raised by magic: not paid for with Build Points */
  magicGain?: Partial<Record<Characteristic, number>>;
  /** Good Teacher (+5 to the Source Quality of their teaching) */
  goodTeacher?: boolean;
  warpingPoints?: number;
  /** seasons spent teaching this year: a covenant teacher teaches two a year (DE p.180) */
  taught?: { year: number; seasons: number };
  /** spells and rituals that changed them, for the record */
  history?: { year: number; season: string; text: string }[];
  /** an outside teacher paid to teach (Covenants ch.5): not an inhabitant, leaves at the end of `until` */
  hired?: { until: number; fee: number };
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
  /** past years' lasting changes (Income Modification made permanent), multiplied together */
  factor?: number;
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
  powerLevel: PowerLevel;
  buildPoints: number;
  memberIds: string[];
  hooksBoons: CovenantHookBoon[];
  library: LibraryBook[];
  visSources: VisSource[];
  visStocks: VisStock[];
  items: EnchantedItem[];
  specialists: Specialist[];
  /** a Theban covenant's patron spirit and its Ceremonies of Propitiation (The Sundered Eagle) */
  patron?: { name: string; might: number; xp: number; offerings: { year: number; pawns: number; xp: number }[] };
  /** the covenant's team at Normandy's Hermetic Tourney (The Lion and the Lily) */
  tourney?: { year: number; results: Record<string, number>; rank?: number };
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
    /** the Pound of Enumerus: a pound of untraceable spending a year, added to sundry (Covenants ch.5) */
    enumerus?: boolean;
    /** last closed year's expenditure: inflation does not rise in a year expenditure falls */
    lastExpenditure?: number;
  };
  /** unGiftedCouncil: council members without The Gift whose votes count equally (they add 0 to Base Loyalty) */
  loyalty: { actionPoints: number; yearsFounded?: number; unGiftedCouncil?: number };
  log: { uid: string; year: number; season?: string; text: string; treasuryDelta?: number; visDelta?: VisStock[] }[];
  /** the vis stocks the covenant was founded with (Build Points count these; later gains are free) */
  startingVisStocks?: VisStock[];
  /** wards and other effects on the covenant (the Aegis of the Hearth) */
  effects?: ActiveEffect[];
  /** spells and powers cast on the covenant, newest last, for undoing */
  casts?: CastRecord[];
  /** what the covenant gives its members each year */
  allowance?: Allowance;
  /** the last year a Hook's story was played (Indiscreet Resource: one every five years) */
  hookStories?: Record<string, number>;
  /** year-end choices that stay from year to year */
  yearEnd?: { skipVis?: string[] };
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
