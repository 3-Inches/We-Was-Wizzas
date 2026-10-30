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
  /** the troupe's own dates: a fair, a wedding, a faerie court that meets every Midsummer (the Game table's calendar) */
  calendar?: SagaEvent[];
  /** what the Tribunal's living covenants did that touches the players: approaches, deaths, new members, gatherings (newest first) */
  tribunalNews?: TribunalNews[];
  /** the motions the Tribunal's gatherings have voted on, newest first */
  tribunalVotes?: TribunalVote[];
  /** the players' magi's votes on a motion before the gathering, by motion id and character id (unset: the magus votes as the storyguide decides on the day, counted as abstaining) */
  playerVotes?: Record<string, Record<string, 'for' | 'against' | 'abstain'>>;
  /** the players' bid for the Tribunal's recognition of their covenant (the Rhine's sponsors from every other covenant) */
  founding?: CovenantFounding;
}

/** A sponsor for the players' new covenant from one covenant of the Tribunal (GotF, On the Founding of Covenants). */
export interface FoundingSponsor {
  status: 'unasked' | 'sought' | 'promised' | 'refused';
  /** the sponsoring magus: one of the covenant's living magi, or a name */
  magusId?: string;
  name?: string;
  /** what the players promised in return */
  terms?: string;
  /** the sponsor's gift to the new covenant, and whether it has come */
  gift?: string;
  delivered?: boolean;
}

export interface CovenantFounding {
  /** the players' covenant seeking recognition */
  covenantId?: string;
  /** a sponsor from each covenant, by its id in the Tribunal book */
  sponsors: Record<string, FoundingSponsor>;
  /** the gathering that recognized it */
  recognizedYear?: number;
}

/** Something from the Tribunal for the storyguide: a living covenant's approach to the players, a death, a gathering. */
export interface TribunalNews {
  uid: string;
  year: number;
  season: Season;
  /** the living covenant it is about */
  covenantId?: string;
  kind: 'approach' | 'death' | 'member' | 'gathering' | 'event' | 'vote' | 'certamen' | 'apprentice';
  text: string;
  /** an approach: which one (BookApproach id), its kind, and where it is dealt with */
  approach?: string;
  approachKind?: 'trade' | 'request' | 'offer' | 'visit' | 'trouble' | 'invitation';
  page?: 'market' | 'covenant' | 'seasons' | 'tribunal' | 'dice';
  /** the character it is about */
  characterId?: string;
  /** dealt with, or set aside, by the storyguide */
  done?: boolean;
  /** an approach left unanswered for two years, set aside by the toolkit (it may come again) */
  lapsed?: boolean;
}

/** A date the troupe puts on the saga's calendar, once or every so many years. */
export interface SagaEvent {
  uid: string;
  year: number;
  season: Season;
  text: string;
  /** comes round again every so many years (1: every year) */
  every?: number;
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
  lines: { who?: string; text: string; kind?: 'season' | 'year' | 'aging' | 'crisis' | 'warping' | 'covenant' | 'lab' | 'effect' | 'reminder' | 'money'; tribunal?: string }[];
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
/** A Magic aura from year to year (Realms of Power: Magic, Aura Variation Rules), and what changes it for a while. */
/**
 * A Magic aura's one special aspect (Realms of Power: Magic, Aligned Auras): an Art, which the aura
 * counts double for; Healing, half the aura on Recovery Totals; Luck; Distracting; an emotion it
 * strengthens in the unGifted; or something else the troupe describes.
 */
export interface AuraAlignment {
  kind: 'art' | 'healing' | 'luck' | 'distracting' | 'emotion' | 'other';
  art?: Art;
  /** emotion: the Personality Trait it brings out; other: what it is */
  text?: string;
}

export interface AuraTrack {
  /** the base aura score its tethers give, which the aura drifts back toward; the aura when first tracked, unless set */
  base?: number;
  /** botch dice for the next roll on the Aura Strengthening or Weakening Table */
  botchDice: number;
  /** added to next year's aura modifier (a latent strengthening or weakening) */
  latent: number;
  /** stronger foreign auras that impinge on it */
  impinging: ('Magic' | 'Faerie' | 'Divine' | 'Infernal')[];
  /** other things this year that push the aura: a magical botch, vis spent, a spell cast at it */
  notes: { uid: string; year: number; label: string; value: number }[];
  /** a change that lasts one season */
  temp?: { delta: number; year: number; season: Season };
  /** Flickering Aura: the year its task was missed, when the aura is one lower */
  flickerYear?: number;
  /** spontaneous magic eased or stifled for a year (up to ±3 on spontaneous Casting Totals) */
  spontaneous?: { year: number; bonus: number };
  /** rituals of three or more pawns cast in the aura this year (wards renewed and the like) */
  visRituals?: { year: number; n: number };
  /**
   * a Dominion kept by a congregation (RoP: The Divine): the year regular worship began and the year
   * it stopped; a large congregation and a significant church; points more from relics of over five
   * Faith Points
   */
  dominion?: { since: number; until?: number; significant?: boolean; relics?: number };
}

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
  kind: 'auto' | 'priorities' | 'exposure' | 'practice' | 'vis' | 'read' | 'lab' | 'work' | 'taught' | 'worship' | 'write' | 'none';
  /** read: the library book (by uid) */
  bookUid?: string;
  /** vis: study from the covenant's stocks rather than the purse */
  visFrom?: 'covenant';
  /** taught: one of the covenant's teachers ('spec:<uid>') */
  teacher?: string;
  /** 'art:Cr' or 'ability:<uid>' */
  target?: string;
  /** a lab project, or a writing project, to work on */
  projectUid?: string;
}

/** What a season can go to on a priority list (engine/priorities.ts). */
export type PriorityKind = 'longevity' | 'apprentice' | 'house' | 'service' | 'politics' | 'travel' | 'read' | 'vis' | 'invent' | 'enchant' | 'write' | 'lab' | 'practice';

/** One entry of a priority list: the kind, whether it is on, and the Arts it favors (else the character's best). */
export interface SeasonPriority {
  kind: PriorityKind;
  off?: boolean;
  arts?: Art[];
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
  /** one of the agency a Virtue or Flaw gives at creation, bought with agency points: Bond + this Resistance Strength from the table */
  fromCreation?: boolean;
  strength?: number;
  /** when the principal last asked them for sensitive or secret information (no more than once a season) */
  askedFor?: { year: number; season: Season };
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
  kind: 'invent' | 'open' | 'attune' | 'instill' | 'extract' | 'tame' | 'longevity' | 'bind' | 'strengthen' | 'empower' | 'refine' | 'install' | 'repair' | 'other';
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
  /** the work falls within the magus's Magical Focus */
  inFocus?: boolean;
  /** conditional Lab Total bonuses that apply to this work (their sources' uids) */
  circumstances?: string[];
  /** experiment each season (DE, Arcane Experimentation), with this risk modifier (0 to 3) */
  experiment?: { risk: number };
  /** invent: from a Laboratory Text, done in one season once the Lab Total reaches the level; no experimenting */
  fromText?: boolean;
  /** longevity: the character it is for (the magus, if unset), and extra vis for a stronger ritual */
  subjectId?: string;
  extraVis?: number;
  /** invent: other spells of the same Technique and Form worked in the same seasons (DE, Multiple Laboratory Activities) */
  alongside?: string[];
  /** install: the lab Virtue to build into the lab (Covenants, Laboratory Virtues and Flaws) */
  labVirtue?: { defId: string; note?: string };
  /** refine, install: a Virtue taken out in the same season's work; refine, repair: a Flaw put right (the lab entry's uid) */
  removeUid?: string;
  /** bind, strengthen: the cords bought with the season's Lab Total */
  cords?: { golden: number; silver: number; bronze: number };
  /** what the Extraordinary Results Chart and the lab's own Safety and Warping did, season by season */
  results?: string[];
  done?: boolean;
  /** it came to nothing: the creation was destroyed, or the project abandoned */
  failed?: boolean;
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
  /** Variable Power: the Virtue (its uid) that makes it grow, and with what */
  variable?: { virtueUid: string; by: VarianceBy };
  /** Deteriorating Power: the Flaw (its uid) that wears it down, and with what */
  deteriorating?: { virtueUid: string; by: VarianceBy };
}

/** What a Variable or Deteriorating Power changes with (RoP: Magic): age / 10, Might Score / 5 (Deteriorating: Might spent / 5), Warping Score, or an Ability's score ('ability:<id>'). */
export type VarianceBy = 'age' | 'might' | 'warping' | `ability:${string}`;

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
  /** it does the covenant's work (Covenants, Cost Saving): in place of a servant, or a pound a year, for each magnitude of its effects */
  serves?: 'servants' | 'pounds';
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
  /** Labor Points stored in goods for a rise in price: a point a year for every ten (City & Guild, Commodity Speculation) */
  speculation?: number;
  /** returns owed later: an introduction's three seasons' worth after two years */
  pending?: { year: number; lp: number; note: string }[];
  /** experience toward a Reputation for charity (a point per season's worth given) */
  charityXp?: number;
  /** a Wealthy character living as an average or Poor one: an extra season's Labor Points every three years or every year, and a name for miserliness */
  miserly?: 'average' | 'poor';
  /** the last year the miser's extra season was counted */
  miserMark?: number;
}

export interface LongevityRitual {
  labTotal: number;
  bonus: number;
  extraVis: number;
  createdYear?: number;
  createdBy?: string;
  forMundane?: boolean;
  /** the year an aging crisis ended it (kept while it can be performed again) */
  lapsedYear?: number;
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
  | 'worship'
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
  /** the kind of lab project worked in the season (vis extraction weakens a Magic aura) */
  labKind?: LabProject['kind'];
  /** one of the extra seasons a character who needs no sleep has each year */
  extra?: boolean;
  /** the season priority it was spent on */
  priority?: PriorityKind;
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
  /** the year each of its Story and Personality Flaws last came up in play (by the Virtue's uid): the Game table's stories waiting */
  storiesTold?: Record<string, number>;
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
  /** a ritual an aging crisis ended, which can be performed again from its Laboratory Text */
  longevityLapsed?: LongevityRitual;
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
  /** books, copies and lab texts being written (DE, Writing Books) */
  writing?: WritingProject[];
  /** what the character does in a season nobody planned */
  standing?: StandingActivity;
  /** what the character does with a season, in order of preference, when its standing activity is to follow them (engine/priorities.ts) */
  priorities?: SeasonPriority[];
  /** a magus's apprentice: a light record until the Gauntlet, when they become a magus of their own */
  apprentice?: Apprentice;
  /** a magus of the Tribunal who belongs to no covenant, and how they wander (living covenants) */
  wanderer?: Wanderer;
  /** a Redcap's devices from the Mercer House: the levels given so far (50 at the Gauntlet, 2 a year since) and those spent on devices */
  redcap?: { levels: number; spent: number };
  /** the seasons this year the character has worked under the covenant's laboratory aura (its magestones) */
  labAuraUse?: { year: number; seasons: number };
  /** a character the toolkit built from a book: where it is described */
  fromBook?: { book: string; line: number; title?: string };
  /** the seasons a year are spent: a free-season count set by hand, needing no sleep, and what the extra seasons go to */
  seasons?: { free?: number; sleepless?: boolean; extra?: StandingActivity };
  /** the last year whose aging roll was made */
  lastAgedYear?: number;
  /** improved or reduced rations given as a reward or punishment: the year, and its change to the aging roll (Grogs) */
  rations?: { year: number; living: number };
  /** where the character lives and works that worsens aging (City & Guild): a leper colony, a bad-air trade, a mine */
  hazards?: ('colony' | 'bad-air' | 'mine')[];
  /** a grog retired from the covenant's service (still counted among its people), or dismissed from it (Grogs) */
  retired?: { year: number; how: 'retired' | 'dismissed' };
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
  /** Hidden, Flawed and Illusory Resources: what its Build Points are set aside for, so Quick build spends them there */
  earmark?: BudgetKind[];
  /** Flawed Resource: how its story went */
  outcome?: 'pending' | 'saved' | 'lost' | 'botched';
  /** Flawed Resource saved: the resources kept (up to half) */
  kept?: string[];
  /** Natural Disaster: it has struck. Indebted: the debt is still owed (default yes). Guild: the covenfolk are on strike. */
  active?: boolean;
  /** Flawed Resource, Natural Disaster: when it comes (the storyguide's choice, or one at random within the saga's first five years) */
  due?: { year: number; season: Season };
  /** Flawed Resource: its story's roll, as it went */
  rolled?: string;
}

/** What a covenant buys with Build Points (Covenants ch.2): its people (specialists and craftsmen), books, vis, items, labs and money. */
export type BudgetKind = 'specialist' | 'book' | 'vis' | 'item' | 'lab' | 'money';

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
  /** the covenant rolls (Grogs): its own accounts and records, which cost no Build Points */
  rolls?: boolean;
  /** written, copied or bought in play: no Build Points */
  inPlay?: boolean;
  /** how the book was made, under Covenants' extended rules for Quality: artisans, resonant materials, format */
  make?: BookMake;
  /** the Quality of the text alone (author, Virtues, the Level given up), which a copy keeps: the rest comes from how each copy is made */
  textQuality?: number;
  /** the author's character, Communication and score in the subject when writing (for glosses and annotation) */
  authorId?: string;
  authorCom?: number;
  authorScore?: number;
  /** the Ability's parameter (Profession: Scribe), for books on one */
  param?: string;
  /** a commentary: the summa (by uid) it is about; a reader must have studied that for a season */
  commentaryOf?: string;
  /** a copy: the book (by uid) it was copied from */
  copyOf?: string;
  /** copied by someone without the skills to copy it truly (DE, Corrupted Copies): useless */
  corrupt?: boolean;
  /** glossed by a reader more eloquent than the author, +1 Quality once (Covenants ch.7) */
  glossed?: { by: string; year: number };
  /** bound into a florilegium: its name and the Quality it added */
  florilegium?: { name: string; bonus: number };
  /** an annotated summa (inspeximus): Levels added */
  annotated?: number;
  /** being clarified: opened as an invested device and left in a Magic aura for 12 / aura years (Covenants ch.7) */
  clarifying?: { since: number; aura: number; by?: string };
}

/** A copy the covenant's scribes make in their working seasons (Covenants ch.7, Scriptoria). */
export interface ScriptoriumCopy {
  uid: string;
  sourceUid: string;
  quick?: boolean;
  points: number;
  /** the scribe (specialist uid) who copies it; anyone free if unset */
  scribeUid?: string;
}

/** The format of a book, beyond a plain bound codex (Covenants ch.7, Secondary Functions). */
export type BookFormat = 'codex' | 'flap' | 'exemplar' | 'unbound' | 'holograph' | 'deluxe' | 'juvenilia' | 'ex-libris';

/** How a book is made under the extended rules: skilled artisans (+1 each), resonant materials (+1 bought, +2 from a story), clarification (+1). */
export interface BookMake {
  scribe?: boolean;
  binder?: boolean;
  illuminator?: boolean;
  /** 1 bought materials, 2 rare materials won in a story */
  resonance?: number;
  /** clarified with resonant materials: +1 more */
  clarified?: boolean;
  format?: BookFormat;
  /** an edition de luxe gives up this much Quality, up to (Scribe + Binder + Illuminator) / 2 */
  deluxe?: number;
  /** the artisans by name, for the record */
  by?: { scribe?: string; binder?: string; illuminator?: string };
}

/** A book, a copy or lab texts being written over seasons (DE, Writing Books and Copying Books; Covenants ch.7). */
export interface WritingProject {
  uid: string;
  kind: 'summa' | 'tractatus' | 'commentary' | 'copy' | 'labTexts' | 'copyLabTexts' | 'florilegium' | 'annotate';
  title: string;
  subjectType: 'art' | 'ability' | 'spell' | 'other';
  subject: string;
  param?: string;
  /** the author's or copier's Ability (by uid) the season's Exposure goes to */
  exposure?: string;
  language: string;
  /** a summa's Level (fixed when begun), or the levels of lab texts */
  level: number;
  /** the Quality planned when begun (summae, tractatus, commentaries) */
  quality?: number;
  textQuality?: number;
  make?: BookMake;
  /** points toward the book so far, and how many it needs */
  points: number;
  needed: number;
  /** a season's points: Communication + Language (the lower of author and notary when dictating), or a copyist's rate */
  rate: number;
  notary?: string;
  /** the library the book goes to */
  covenantId?: string;
  /** copies and annotations: the library book (by uid) worked from */
  sourceUid?: string;
  /** a quick copy: three times as fast, 1 Quality lower */
  quick?: boolean;
  /** copying several tractatus or lab texts in one season: their uids */
  sources?: string[];
  /** a commentary's summa */
  commentaryOf?: string;
  /** what will go wrong: corruption, a missing skill */
  corrupt?: string;
  /** a florilegium: its bonus */
  bonus?: number;
  /** the spells (by character spell uid) whose lab texts are written up */
  spells?: string[];
  authorScore?: number;
  started: { year: number; season: Season };
  done?: { year: number; season: Season };
  /** the covenant whose library the finished work went to */
  inLibrary?: string;
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
  role: SpecialistRole;
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
  abilities?: { id: string; param?: string; score: number; /** experience toward the next point */ xp?: number }[];
  /** Characteristics as far as the job uses them (Com to teach, Dex for most crafts, Pre to lead); older files keep Com and Pre in `com` and `pre` */
  chars?: Partial<Record<Characteristic, number>>;
  /** Characteristic points raised by magic: not paid for with Build Points */
  magicGain?: Partial<Record<Characteristic, number>>;
  /** Good Teacher (+5 to the Source Quality of their teaching) */
  goodTeacher?: boolean;
  warpingPoints?: number;
  /** seasons spent teaching this year: a covenant teacher teaches two a year (DE p.180) */
  taught?: { year: number; seasons: number; /** the last season taught: the drill sergeant drills the turb together in one */ season?: string };
  /** spells and rituals that changed them, for the record */
  history?: { year: number; season: string; text: string }[];
  /** an outside teacher paid to teach (Covenants ch.5): not an inhabitant, leaves at the end of `until` */
  hired?: { until: number; fee: number };
  /** the Wealthy Virtue or Poor Flaw: how many seasons a year they have free (City & Guild: it sets free time, not pay) */
  wealth?: 'poor' | 'wealthy';
  /** experience toward the next point of Teaching (teachers) */
  teachingXp?: number;
  /** the Build Points paid when they were bought, kept once their scores start to rise in play */
  boughtFor?: number;
  /** a teacher's lab: its Teaching Specialization (at most +3) adds to the Source Quality of teaching done there (Covenants ch.9) */
  teachIn?: string;
  /** craftsmen under the guild rules: their rank (City & Guild ch.3) */
  guildRank?: 'apprentice' | 'journeyman' | 'master' | 'senior' | 'dean';
  /** craftsmen: the workshop they run for the covenant and its Labor Points (City & Guild ch.2 and ch.4) */
  workshop?: { innovation: number; rawMaterials: number; laborPoints: number };
}

/** What a specialist does at the covenant (DE, Covenants ch.5; Grogs ch.2). */
export type SpecialistRole =
  | 'teacher' | 'specialist' | 'turb-captain' | 'steward' | 'chamberlain' | 'autocrat' | 'scribe' | 'craftsman' | 'drill-sergeant' | 'sergeant'
  | 'personal-servant' | 'agent' | 'other';

/** Soldiers from a Residents Boon or Free Choice (Covenants ch.2): how many, their pay and kit. */
export interface SoldierGroup {
  uid: string;
  kind: string;
  /** the Boon this group comes from */
  hbUid?: string;
  count: number;
  /** pennies a day each: 1 pound a year per penny (Covenants ch.5) */
  pennies: number;
  /** they live at the covenant, so count as inhabitants (tenants who serve as part of their rent do not) */
  inhabitants: boolean;
  /** horses each: a point of inhabitants and a pound a year apiece */
  horses: number;
  /** points of weapons and armor each */
  gear: number;
  note?: string;
}

/** A recurring yearly expense or custom: Redcap visits, a cycle of feast days, guests (Covenants ch.5 price list). */
export interface YearlyEvent {
  id: string;
  count: number;
}

/** A use of craft magic in place of craftsmen (Covenants ch.4, Rego Craft Magic): who casts it, how often, and what it saves. */
export interface CraftMagicUse {
  uid: string;
  name: string;
  technique: Technique;
  form: Form;
  level: number;
  /** the caster, a member magus */
  casterId?: string;
  /** the mundane craft task's Ease Factor (Trivial 0 … Remarkable 21) */
  taskEase: number;
  /** how much work one casting does: a day's work is normal magic; a month +3, a season +6, a year +9 to the Finesse Ease Factor */
  span: 'day' | 'month' | 'season' | 'year';
  castsPerYear: number;
  ritual?: boolean;
  /** Creo needs no Finesse roll (its results are always at least roughly right) */
  noFinesse?: boolean;
  /** it saves money this year: a pound per magnitude for repeated casting, five per magnitude for each Ritual (Covenants ch.5) */
  active: boolean;
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
  /** given by an enchanted item installed in the lab: it takes no space (Covenants, Magic Items for Laboratories) */
  fromItem?: string;
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

/** Something that struck a covenant and still weighs on it (engine/calamity.ts). */
export interface Trouble {
  uid: string;
  /** the calamity (CALAMITIES id) */
  kind: string;
  label: string;
  severity: 1 | 2 | 3;
  year: number;
  season: Season;
  /** years it still weighs on the covenant */
  yearsLeft: number;
  /** what the income falls to while it lasts */
  incomeMult?: number;
  /** vis sources closed while it lasts */
  skipVis?: string[];
  /** covenfolk lost, not yet replaced */
  lost?: Partial<CovenfolkCounts>;
  /** who brought it about, if anyone */
  by?: string;
  byPlayers?: boolean;
  /** the covenant knows (or believes) who did it */
  known?: boolean;
  /** what it did when it struck */
  text: string;
  /** the season a magus last dealt with it ("1225 Summer"): one a season */
  faced?: string;
}

/** Spending a covenant can leave unpaid when the money runs out (Covenants ch.5, Emergency Savings). */
export type NeglectCategory = 'Buildings' | 'Provisions' | 'Laboratories' | 'Weapons and Armor';

/** Money a covenant owes, and to whom. */
export interface Loan {
  uid: string;
  from: string;
  pounds: number;
  year: number;
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
  /** Build Points set aside for each kind of purchase, so Quick build has a budget to fill (the rest is free to spend) */
  budget?: Partial<Record<BudgetKind, number>>;
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
    /** soldiers from Residents Boons and Free Choices: their pay, horses and kit */
    soldiers?: SoldierGroup[];
    /** what the covenant spends on every year besides upkeep: Redcap visits, feast days, guests */
    yearly?: YearlyEvent[];
    /** weapons and armor the covenant keeps in store, and siege engines (ballista 16, trebuchet 32) */
    arsenalPoints?: number;
    /** members who pay their own upkeep, or work for one of the income sources: not counted as inhabitants (Covenants ch.5) */
    ownUpkeep?: string[];
    /** magi giving up their privileges: impoverished (a companion's points) or living as covenfolk (a specialist's) (Covenants ch.5) */
    magiLiving?: 'impoverished' | 'pauper';
    /** hire only the crafts the Cost Saving Limits table names as examples, not those from other books */
    exampleCraftsOnly?: boolean;
    /** spending left unpaid in hard times (Covenants ch.5, Emergency Savings), with what it brings at each year's end */
    neglect?: NeglectCategory[];
    /** money owed: borrowed, or bills left unpaid at a year's end; a tenth a year in interest until repaid */
    loans?: Loan[];
    /** wealth put into land and goods (a living covenant's hoard beyond five years' spending): sold for four-fifths of its worth in hard times */
    holdings?: number;
  };
  /** how the covenfolk are organized (DE, The Organization of Covenfolk) */
  organization?: 'household' | 'military' | 'nations' | 'guilds' | 'professional-guilds' | 'monastery' | 'none';
  /** specialists and craftsmen gain experience each year (on unless switched off) */
  folkAdvance?: boolean;
  /** spells cast to do the covenant's craft work (Covenants ch.4) */
  craftMagic?: CraftMagicUse[];
  /** copies the covenant's scribes are making (Covenants ch.7, Scriptoria) */
  scriptorium?: ScriptoriumCopy[];
  /** the turb's watches (Grogs): each grog character's patrol and watch, double duty, and double duties stood since the last normal one */
  turb?: { watches: Record<string, { patrol: 'day' | 'night'; watch: number }>; double?: boolean; doubleDuties?: number };
  /** unGiftedCouncil: council members without The Gift whose votes count equally (they add 0 to Base Loyalty) */
  loyalty: { actionPoints: number; yearsFounded?: number; unGiftedCouncil?: number };
  log: { uid: string; year: number; season?: string; text: string; treasuryDelta?: number; visDelta?: VisStock[] }[];
  /** the vis stocks the covenant was founded with (Build Points count these; later gains are free) */
  startingVisStocks?: VisStock[];
  /** wards and other effects on the covenant (the Aegis of the Hearth) */
  effects?: ActiveEffect[];
  /** calamities that struck it and still weigh on it */
  troubles?: Trouble[];
  /** spells and powers cast on the covenant, newest last, for undoing */
  casts?: CastRecord[];
  /** what the covenant gives its members each year */
  allowance?: Allowance;
  /** the last year a Hook's story was played (Indiscreet Resource: one every five years) */
  hookStories?: Record<string, number>;
  /** year-end choices that stay from year to year */
  yearEnd?: { skipVis?: string[] };
  /** a covenant of the saga's Tribunal built from its book, which lives on its own as the seasons pass (not the players') */
  living?: LivingCovenant;
  /** something that gives its magi a better aura in the laboratory for a few seasons a year (the magestones of Verditius) */
  labAura?: LabAura;
  /** what has changed the aura, oldest first */
  auraLog?: { uid: string; year: number; season?: Season; delta: number; text: string }[];
  /** the aura from year to year (Realms of Power: Magic, Aura Variation) */
  auraTrack?: AuraTrack;
  /** what a Magic aura is aligned with, if anything (Realms of Power: Magic, Aligned Auras) */
  auraAlignment?: AuraAlignment;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** An apprentice in training (DE, Apprentices): fifteen years, a season a year of the master's teaching, then the Gauntlet. */
export interface Apprentice {
  name: string;
  gender: 'Male' | 'Female';
  /** the year the apprenticeship began, and the apprentice's age then */
  since: number;
  age: number;
  /** the seasons the master has spent teaching them */
  seasons: number;
  note?: string;
}

/**
 * A magus who belongs to no covenant (living covenants): a peregrinator stays a few years at each
 * covenant under the Rhine's guest-laws; a seasonal wanderer winters at one and summers on the road.
 * They stay as a guest (covenantId is the host, they are not among its members) with their own
 * laboratory, which goes with them.
 */
export interface Wanderer {
  wanders: 'peregrinator' | 'seasonal';
  /** the year they came to where they are now */
  since: number;
  /** a peregrinator's stay at each covenant, in years (three to seven by the guest-laws) */
  stay?: number;
  /** the covenant a seasonal wanderer winters at (a BookCovenant id) */
  winters?: string;
  favors?: 'young' | 'any';
  /** the book (BOOKS id) and their name in it, or the master's name for one who left apprenticeship to wander */
  book: string;
  key: string;
  /** their laboratory while on the road */
  lab?: Laboratory;
  /** a players' covenant that has welcomed them as a guest: a seasonal wanderer winters there, a peregrinator moves there */
  welcome?: string;
  /** the covenants they have stayed at (ids), oldest first */
  visited?: string[];
}

/** A motion put to a Tribunal gathering, and how its sigils fell. */
export interface TribunalVote {
  uid: string;
  motionId: string;
  year: number;
  title: string;
  for: number;
  against: number;
  abstain: number;
  passed: boolean;
  /** each covenant's sigils for and against, by covenant id (the players' too) */
  byCovenant: Record<string, { for: number; against: number }>;
}

/**
 * A Magic aura a covenant's magi can carry into their laboratories, so many at once and so many
 * seasons a year each (Guardians of the Forests: the three magestones of Verditius let the magi of
 * Oculus Septentrionalis, in Lübeck's Divine aura, work two seasons a year in a Magic aura of 3).
 */
export interface LabAura {
  name: string;
  realm: 'Magic' | 'Faerie';
  strength: number;
  /** how many magi may use it in the same season */
  count: number;
  /** the seasons a year each magus may use it */
  seasonsEach: number;
  text?: string;
  /** who has it this season */
  inUse?: { year: number; season: Season; ids: string[] };
}

/** A living covenant's link to its book, and what it remembers from year to year. */
export interface LivingCovenant {
  /** the Tribunal book (BOOKS id) and the covenant's id in it */
  book: string;
  key: string;
  tribunal: string;
  addedYear: number;
  /** each approach (BookApproach id) and the last year it came up */
  approached?: Record<string, number>;
  /** how it stands with the players' covenant, as play has made it */
  attitude?: 'ally' | 'friendly' | 'neutral' | 'wary' | 'hostile' | 'enemy';
  /** the storyguide stopped it acting (it still ages and keeps its books) */
  paused?: boolean;
  /** what it found short at the last year's end: money (its magi raise income by magic), and pawns of vis its reserve lacks */
  needs?: { money: boolean; vis: number };
  /** how many times magic has raised its income in play (Magical Improvement), and the last year it did */
  improved?: number;
  improvedYear?: number;
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
