// A record for every Virtue and Flaw: which outcome tags it touches (with a direction and a
// strength), what kind of effect it is, its flags and its region or culture gates. Records are
// built from the hand-written mechanics where they exist and from the book text otherwise; each
// one points back at its source and never replaces it.

import { ARCHETYPES, CHOICE_LINKS, MAGNITUDES, RANKED_TOTALS } from './magnitudes';
import { ARTS, CHARACTERISTICS, type AbilityType, type Effect, type GameData, type VirtueFlawDef } from '../../data';
import { isThemeTag } from './tags';

/** How a Virtue or Flaw relates to a tag. */
export interface TagLink {
  /** a tag id, or '$param' (the tag of the choice made when taking it), '$anyChar' */
  tag: string;
  /** +1 helps, -1 hurts */
  dir: 1 | -1;
  /** 1 mentioned in the text, 2 in the name or a clear rule, 3 a computed effect */
  strength: number;
  /** a Flaw that pulls stories towards the tag (Story, Personality and beneficial Flaws) */
  hook?: boolean;
  why: string;
}

export type EffectKind = 'adds' | 'rate' | 'new-path' | 'story';

export interface VFRecord {
  id: string;
  links: TagLink[];
  kind: EffectKind;
  /** what the option is worth, in words */
  value: string;
  flags: { complexity: boolean; otherBook: boolean; spellLike: boolean; beneficialFlaw: boolean; infernal: boolean };
  /** Tribunals it belongs to (empty: anywhere) */
  regions: string[];
  /** societies it belongs to (empty: any) */
  cultures: string[];
  /** the kind of choice '$param' links resolve through */
  paramKind?: 'art' | 'ability' | 'char' | 'realm';
  /** the rules engine computes something for it */
  computed: boolean;
  /** for options the engine does not compute: how the work to describe it sorts */
  pile?: 'self-contained' | 'other-book' | 'story-only';
  summary: string;
}

// ------------------------------------------------------------------ gates

/** Tribunal books: their Virtues and Flaws belong to that part of Mythic Europe. */
const BOOK_REGIONS: Record<string, string[]> = {
  AtD: ['Transylvanian'],
  GotF: ['Rhine'],
  SE: ['Theban'],
  FF: ['Provençal'],
  LotN: ['Levant'],
  CC: ['Levant'],
  BSS: ['Iberian', 'Levant'],
};
const REGION_FIELD: Record<string, string[]> = {
  'the Iberian Peninsula': ['Iberian'],
  Ireland: ['Hibernian'],
  'North Africa': ['Iberian', 'Levant'],
};
/** Virtues and Flaws of a faith other than Latin Christianity (the text says so). */
const CULTURE_GATES: Record<string, string[]> = {
  'educated-islamic': ['Islamic', 'North Africa'],
  ineslemen: ['Islamic', 'North Africa'],
  sufi: ['Islamic', 'North Africa'],
  'wisdom-from-ignorance': ['Islamic', 'North Africa'],
  'dhimmi-flaw': ['Jewish', 'Eastern Christendom', 'Islamic', 'North Africa'],
  'submitted-qareen': ['Islamic', 'North Africa'],
  'vulnerable-to-folk-tradition-islamic-flaw': ['Islamic', 'North Africa'],
  'educated-hebrew': ['Jewish'],
  rabbi: ['Jewish'],
  'rosh-beth-din': ['Jewish'],
  shamash: ['Jewish'],
  sofer: ['Jewish'],
  'gabai-flaw': ['Jewish'],
  'tzadik-nistar-flaw': ['Jewish'],
  kabbalist: ['Jewish'],
  'mazdean-priest': ['Islamic'],
};

// ------------------------------------------------------------------ abilities → tags

const ABILITY_TAG: Record<string, string> = {
  'single-weapon': 'combat', 'great-weapon': 'combat', bows: 'combat', 'thrown-weapon': 'combat', brawl: 'combat', athletics: 'combat',
  charm: 'social', 'folk-ken': 'social', guile: 'social', etiquette: 'social', intrigue: 'social', bargain: 'social', carouse: 'social',
  leadership: 'leadership', stealth: 'stealth', legerdemain: 'stealth', awareness: 'perception',
  survival: 'outdoors', hunt: 'outdoors', ride: 'outdoors', swim: 'outdoors', 'animal-handling': 'animals', 'animal-ken': 'animals',
  chirurgy: 'healing', medicine: 'healing', 'craft-type': 'crafts', 'profession-type': 'crafts', music: 'performance',
  'artes-liberales': 'scholarship', philosophiae: 'scholarship', 'theology-christian': 'scholarship', 'theology-islam': 'scholarship', 'theology-judaism': 'scholarship',
  'civil-and-canon-law': 'scholarship', 'common-law': 'scholarship', 'islamic-law': 'scholarship', 'rabbinic-law': 'scholarship', 'dead-language': 'scholarship',
  'living-language': 'scholarship', 'art-of-memory': 'scholarship',
  'magic-lore': 'lore', 'faerie-lore': 'lore', 'dominion-lore': 'lore', 'infernal-lore': 'lore', 'area-lore': 'lore', 'organization-lore': 'lore',
  'mystery-cult-lore': 'mystery', 'code-of-hermes': 'politics', 'magic-theory': 'lab', 'parma-magica': 'magic-resistance', penetration: 'penetration',
  concentration: 'concentration', finesse: 'casting', teaching: 'teaching', 'second-sight': 'senses', 'magic-sensitivity': 'senses', premonitions: 'senses',
  'sense-holiness-and-unholiness': 'senses', 'sense-passions': 'senses', 'wilderness-sense': 'outdoors', dowsing: 'senses', shapeshifter: 'shapechanged',
  heartbeast: 'shapechanged', 'enigmatic-wisdom': 'twilight', 'faerie-magic': 'realm:faerie',
};

export function abilityTag(abilityId: string, type?: AbilityType): string {
  if (ABILITY_TAG[abilityId]) return ABILITY_TAG[abilityId];
  switch (type) {
    case 'Martial': return 'combat';
    case 'Academic': return 'scholarship';
    case 'Arcane': return 'lore';
    case 'Supernatural': return 'senses';
    default: return '';
  }
}

// ------------------------------------------------------------------ effects → tags

type Draft = Omit<TagLink, 'hook'>;
const sgn = (n: number): 1 | -1 => (n < 0 ? -1 : 1);

function labTag(when: string): string {
  switch (when) {
    case 'notFromText': return 'lab-invent';
    case 'experimenting': return 'experiment';
    case 'fromText': return 'lab-texts';
    case 'items': return 'lab-enchant';
    case 'longevityForSelf': return 'lab-longevity';
    default: return 'lab';
  }
}

function castTag(when: string): string {
  if (when === 'spontaneous') return 'spont';
  if (when === 'ritual') return 'ritual';
  return 'casting';
}

function effectLinks(e: Effect, data: GameData): Draft[] {
  const L = (tag: string, dir: 1 | -1, why: string, strength = 3): Draft => ({ tag, dir, strength, why });
  switch (e.type) {
    case 'charPoints': return [L('$anyChar', sgn(e.amount), `${e.amount > 0 ? '+' : ''}${e.amount} Characteristic points`)];
    case 'charBonus': return [L(e.char === '$param' ? '$param' : `char:${e.char}`, sgn(e.amount), `${e.amount > 0 ? '+' : ''}${e.amount} to a Characteristic`)];
    case 'greatChar': return [L(e.char === '$param' ? '$param' : `char:${e.char}`, sgn(e.amount), e.amount > 0 ? 'Raises a Characteristic above +3' : 'Lowers a Characteristic below –3')];
    case 'abilityAccess': {
      const out: Draft[] = [];
      for (const t of e.abilityTypes ?? []) out.push(L(t === 'Martial' ? 'combat' : t === 'Academic' ? 'scholarship' : t === 'Arcane' ? 'lore' : 'senses', 1, `Lets the character learn ${t} Abilities`, 2));
      for (const a of e.abilities ?? []) out.push(L(abilityTag(a, data.abilityById.get(a)?.type), 1, `Lets the character learn ${data.abilityById.get(a)?.name ?? a}`, 2));
      return out;
    }
    case 'xpPool': return [L('xp', 1, `${e.amount} xp (${e.label})`)];
    case 'laterLifeXpPerYear': return [L('xp', sgn(e.amount - 15), `${e.amount} xp per year of later life`), L('wealth', sgn(e.amount - 15), 'Wealth', 2)];
    case 'freeSeasons': return [L('seasons', sgn(e.amount - 2), `${e.amount} free seasons a year`)];
    case 'abilityBonus': return [L('$param', 1, `+${e.amount} to an Ability`), L('specialist', 1, 'Concentrates on one Ability', 1)];
    case 'artBonus': return [L('$param', 1, `+${e.amount} to an Art`), L('specialist', 1, 'Concentrates on one Art', 1)];
    case 'abilityAffinity': return [L('$param', 1, 'Learns one Ability 1½ times as fast'), L('specialist', 1, 'Concentrates on one Ability', 1)];
    case 'artAffinity': return [L('$param', 1, 'Learns one Art 1½ times as fast'), L('specialist', 1, 'Concentrates on one Art', 1)];
    case 'languageAffinity': return [L('scholarship', 1, 'Learns languages faster')];
    case 'abilityCapBonus': return [L('$param', 1, 'Raises the creation cap of an Ability', 1)];
    case 'grantAbility':
      return e.ability === '$param' ? [L('$param', 1, 'Grants an Ability', 2)] : [L(abilityTag(e.ability, data.abilityById.get(e.ability)?.type), 1, `Grants ${data.abilityById.get(e.ability)?.name ?? e.ability}`, 2)];
    case 'deficientArt': return [L('$param', -1, 'Halves one Art')];
    case 'magicalFocus': return [L('casting', 1, 'Adds an Art again inside the focus'), L('lab', 1, 'Adds an Art again inside the focus', 2), L('specialist', 1, 'Concentrates on the focus', 2)];
    case 'labTotal': return [L(labTag(e.when), sgn(e.amount), `${e.amount > 0 ? '+' : ''}${e.amount} to Lab Totals${e.when === 'all' ? '' : ` (${e.when})`}`)];
    case 'labTotalMultiplier': return [L(labTag(e.when), sgn(e.multiplier - 1), `Lab Totals ×${e.multiplier}${e.when === 'all' ? '' : ` (${e.when})`}`)];
    case 'castingTotal': case 'castingScore':
      return [L(castTag(e.when), sgn(e.amount), `${e.amount > 0 ? '+' : ''}${e.amount} to casting${e.when === 'all' ? '' : ` (${e.when})`}`, e.when === 'circumstance' ? 2 : 3)];
    case 'botchDice': return [L('reliability', sgn(-e.amount), `${e.amount > 0 ? '+' : ''}${e.amount} botch dice`)];
    case 'soak': return [L('soak', sgn(e.amount), `${e.amount > 0 ? '+' : ''}${e.amount} Soak`)];
    case 'woundPenalty': case 'fatiguePenalty': return [L('fatigue', sgn(-e.amount), `${e.amount < 0 ? 'Smaller' : 'Larger'} ${e.type === 'woundPenalty' ? 'Wound' : 'Fatigue'} penalties`)];
    case 'initiative': case 'spellInitiative': return [L('speed', sgn(e.amount), `${e.amount > 0 ? '+' : ''}${e.amount} Initiative`)];
    case 'confidence': return [L('confidence', 1, 'More Confidence')];
    case 'reputation': return [L('fame', e.kind === 'bad' ? -1 : 1, `${e.kind === 'bad' ? 'Bad ' : ''}Reputation ${e.score}: ${e.label}`, 2)];
    case 'warpingPoints': return [L('warping', sgn(-e.amount), `${e.amount} Warping Points`)];
    case 'apprenticeXp': case 'apprenticeshipTotalXp': return [L('xp', sgn(e.type === 'apprenticeXp' ? e.amount : e.amount - 240), 'Apprenticeship experience')];
    case 'apprenticeSpellLevels': return [L('xp', sgn(e.amount), 'Spell levels at creation', 2)];
    case 'gift':
      if (e.kind === 'gentle') return [L('social', 1, 'No social penalty from The Gift')];
      if (e.kind === 'blatant') return [L('social', -1, 'A heavier social penalty from The Gift')];
      return [];
    case 'size': return [L('soak', sgn(e.amount), `Size ${e.amount > 0 ? '+' : ''}${e.amount}`, 2)];
    case 'sourceQuality': return [L('study', sgn(e.amount), `${e.amount > 0 ? '+' : ''}${e.amount} Source Quality (${e.when.join(', ')})`)];
    case 'advancementMultiplier': return [L('study', sgn(e.multiplier - 1), `Study ×${e.multiplier}`), L('xp', sgn(e.multiplier - 1), 'More experience from study', 2)];
    case 'teachingQuality': return [L('teaching', sgn(e.amount), 'Better teaching')];
    case 'bookWritingQuality': return [L('writing', sgn(e.amount), 'Better books')];
    case 'livingConditions': return [L('aging', sgn(e.amount), `${e.amount > 0 ? '+' : ''}${e.amount} Living Conditions`)];
    case 'agingRoll': return [L('aging', sgn(-e.amount), `${e.amount > 0 ? '+' : ''}${e.amount} to aging rolls`)];
    case 'agingStartAge': return [L('aging', sgn(e.age - 35), 'Starts aging later')];
    case 'masteryXp': return [L('mastery', 1, 'Mastery experience')];
    case 'flawlessMagic': return [L('mastery', 1, 'Masters every spell'), L('reliability', 1, 'Mastery reduces botches', 2)];
    case 'spellMasteryMultiplier': return [L('mastery', sgn(e.multiplier - 1), `Mastery ×${e.multiplier}`)];
    case 'ritualVisMultiplier': return [L('vis', sgn(1 - e.multiplier), `Ritual vis ×${e.multiplier}`), L('ritual', 1, 'Rituals', 1)];
    case 'penetrationMultiplier': return [L('penetration', sgn(e.multiplier - 1), `Penetration ×${e.multiplier}`)];
    case 'magicResistance': return [L('magic-resistance', sgn(e.amount), `Magic Resistance ${e.amount}`)];
    case 'elementalMagic': return ['Aq', 'Au', 'Ig', 'Te'].map((a) => L(`art:${a}`, 1, 'The four elemental Forms support each other', 2));
    case 'secondaryInsight': return [L('study', 1, 'Studying an Art also teaches its neighbours', 2), L('xp', 1, 'Extra experience', 2)];
    case 'socialPenalty': return [L('social', -1, `–${e.amount} social rolls`)];
    case 'mightScore': return [L(`realm:${e.realm.toLowerCase()}`, 1, `${e.realm} Might`, 2)];
    case 'labTheory': return [L('realm:divine', 1, 'Holy magic', 2)];
    case 'trueFaith': return [L('realm:divine', 1, 'True Faith'), L('magic-resistance', 1, 'Magic Resistance from True Faith', 2), L('church', 1, 'Faith', 2)];
    case 'relic': return [L('realm:divine', 1, 'A holy relic', 2), L('magic-resistance', 1, 'Magic Resistance from a relic', 2)];
    case 'personalityRange': return [L('heroic', 1, 'Stronger Personality Traits', 1)];
    default: return [];
  }
}

// ------------------------------------------------------------------ hand tags

/** Entries whose wording no keyword catches (mostly Personality Flaws and small General Virtues). */
const MANUAL_TAGS: Record<string, [string, number][]> = {
  apprentice: [['order', 1], ['patron', 2]],
  'common-sense': [['perception', 1], ['investigation', 1]],
  factor: [['wealth', 2], ['realm:mundane', 1]],
  'falls-like-a-cat': [['soak', 1], ['adventure', 1]],
  'free-expression': [['performance', 2], ['crafts', 1]],
  'greater-benediction': [['heroic', 1], ['realm:divine', 1]],
  'lesser-benediction': [['heroic', 1], ['realm:divine', 1]],
  'guest-of-house-criamon': [['order', 2], ['politics', 1]],
  'guest-of-the-house': [['order', 2], ['politics', 1]],
  'immunity-to-cold': [['soak', 1], ['outdoors', 2]],
  intuition: [['perception', 1], ['confidence', 1]],
  'lesser-immunity': [['soak', 2]],
  'magic-items': [['lab-enchant', 2]],
  muse: [['performance', 2], ['social', 2], ['love', 1]],
  'perfect-balance': [['combat', 1], ['stealth', 1], ['adventure', 1]],
  'rat-up-a-drainpipe': [['stealth', 2], ['realm:mundane', 1]],
  'see-in-darkness': [['perception', 2], ['stealth', 1]],
  'sharp-ears': [['perception', 2]],
  'temporal-influence': [['nobility', 2], ['realm:mundane', 2], ['politics', 1]],
  'unaffected-by-the-gift': [['social', 2], ['order', 1]],
  'verditius-magic': [['lab-enchant', 2], ['crafts', 2]],
  'ambitious-flaw': [['fame', 2], ['rival', 1]],
  'bound-casting-tools-flaw': [['lab-enchant', 1]],
  'bound-magic-flaw': [['lab-enchant', 2], ['duration', 1]],
  'carefree-flaw': [['temperament', 2]],
  'compulsion-flaw': [['vice', 2]],
  'compulsive-lying-flaw': [['vice', 2]],
  'crippled-flaw': [['combat', 2], ['travel', 1]],
  'strong-willed': [['magic-resistance', 1], ['temperament', 1], ['confidence', 1]],
  'disfigured-flaw': [['social', 2], ['outsider', 1]],
  'overconfident-flaw': [['heroic', 1], ['vice', 1], ['temperament', 1]],
  inspirational: [['leadership', 2], ['social', 1]],
  'noncombatant-flaw': [['combat', 2]],
  'depressed-flaw': [['temperament', 2]],
  'devoted-parent-child-flaw': [['family', 2]],
  'difficult-underlings-flaw': [['leadership', 2], ['duty', 1]],
  'disorientating-magic-flaw': [['speed', 2], ['casting', 1]],
  'driven-flaw': [['heroic', 2], ['duty', 1]],
  'dutybound-flaw': [['duty', 2], ['good', 1]],
  'envious-flaw': [['vice', 2], ['rival', 1]],
  'fettered-magic-flaw': [['magic-resistance', 1]],
  'flawed-powers-flaw': [['reliability', 2]],
  'gender-nonconforming-flaw': [['outsider', 2]],
  'grudge-flaw': [['rival', 2]],
  'hatred-flaw': [['rival', 2], ['vice', 1]],
  'horrifying-appearance-snake-legs-flaw': [['outsider', 2], ['social', 2]],
  'humble-flaw': [['good', 2]],
  'inscribed-shadow-flaw': [['outsider', 2], ['social', 1]],
  'lecherous-flaw': [['vice', 2], ['love', 2]],
  'many-marriageable-daughters-flaw': [['family', 2], ['wealth', 1]],
  'missing-ear-flaw': [['perception', 2]],
  'optimistic-flaw': [['temperament', 2]],
  'pessimistic-flaw': [['temperament', 2]],
  'poor-memory-flaw': [['temperament', 1]],
  'rebellious-flaw': [['temperament', 2], ['rival', 1]],
  'reclusive-flaw': [['temperament', 1], ['outsider', 1]],
  'seeker-flaw': [['order', 2], ['investigation', 2], ['heroic', 1]],
  'slothful-flaw': [['vice', 2]],
  'slow-power-flaw': [['speed', 2]],
  'social-handicap-flaw': [['social', 2]],
  'temperate-flaw': [['good', 1], ['temperament', 1]],
  'tormenting-master-flaw': [['patron', 2], ['rival', 2], ['order', 1]],
  'unbaptized-flaw': [['church', 2], ['realm:divine', 1]],
  'unlucky-flaw': [['curse', 2]],
  'unspecialized-flaw': [['xp', 1]],
  'warped-magic-flaw': [['casting', 1], ['social', 1]],
  'weakness-flaw': [['vice', 2], ['love', 1]],
  'weak-willed-flaw': [['temperament', 2], ['patron', 1]],
  'prolific-artist': [['crafts', 2], ['performance', 2]],
  'messengers-memory': [['scholarship', 2], ['politics', 1]],
  'mythic-mimicry': [['social', 2], ['stealth', 1]],
  'predictive-stigmata-flaw': [['visions', 2]],
  'confraternity-member-flaw': [['order', 2], ['mystery', 1]],
  give: [['realm:magic', 1]], take: [['realm:magic', 1]], shape: [['realm:magic', 1]],
  'major-rune-focus': [['casting', 2], ['specialist', 2]],
  'minor-rune-focus': [['casting', 2], ['specialist', 1]],
  'bully-flaw': [['vice', 2]],
  'infatuation-flaw': [['love', 2]],
  'know-it-all-flaw': [['temperament', 1], ['scholarship', 1]],
  'amazonian-slave-flaw': [['outsider', 1]],
  'bitter-mistress-flaw': [['rival', 2], ['patron', 1]],
  'friendly-mistress-flaw': [['patron', 2]],
  'prolonged-apprenticeship-flaw': [['patron', 2]],
  'intangible-flesh-flaw': [['outsider', 2]],
  'essential-flaw-flaw': [['outsider', 1]],
  huge: [['soak', 2], ['combat', 2]],
  'little-flaw': [['soak', 2], ['stealth', 1]],
  'eunuch-flaw': [['outsider', 1], ['family', 1]],
  'storm-calling': [['art:Au', 1], ['outdoors', 1]],
  'storm-wizard': [['outsider', 1], ['art:Au', 1]],
  'dispassionate-flaw': [['temperament', 2]],
  'slave-flaw': [['outsider', 2], ['duty', 1]],
  'favored-slave-flaw': [['outsider', 2], ['duty', 1]],
  disjunction: [['magic-resistance', 1]],
  dislocation: [['travel', 2]],
};

// ------------------------------------------------------------------ text → tags

const KEYWORDS: [RegExp, string][] = [
  [/\bcasting (total|score)s?\b/, 'casting'],
  [/\bspontaneous\b/, 'spont'],
  [/\britual(s)?\b/, 'ritual'],
  [/\blab(oratory)? totals?\b|\blaboratory\b/, 'lab'],
  [/\binvent(s|ing|ion)?\b[^.]{0,30}\bspells?\b/, 'lab-invent'],
  [/\blab(oratory)? texts?\b/, 'lab-texts'],
  [/\benchant(ed|ing|ment)?s?\b|\binvested devices?\b|\btalisman\b|\bcharged items?\b/, 'lab-enchant'],
  [/\blongevity rituals?\b/, 'lab-longevity'],
  [/\b(a|his|her|the) familiar\b|\bfamiliar'?s\b/, 'lab-familiar'],
  [/\bexperiment(ation|al|ing|s)?\b|\bbreakthrough/, 'experiment'],
  [/\bpenetration\b/, 'penetration'],
  [/\bmagic resistance\b|\bparma magica\b/, 'magic-resistance'],
  [/\bconcentration\b/, 'concentration'],
  [/\binitiative\b|\bfast cast/, 'speed'],
  [/\bbotch(es|ing)?\b/, 'reliability'],
  [/\bmastery\b|\bmastered spells?\b/, 'mastery'],
  [/\bsoak\b/, 'soak'],
  [/\b(combat|attack|weapons?|melee|battle|warriors?|soldiers?|fight(ing|er|s)?)\b/, 'combat'],
  [/\bsocial (rolls?|situations?|interactions?)\b|\bpersua(de|sion|sive)\b|\bcharm\b/, 'social'],
  [/\bperception\b|\bawareness\b|\bnotice\b/, 'perception'],
  [/\bintelligence\b/, 'char:Int'],
  [/\bperception\b/, 'char:Per'],
  [/\bstrength\b/, 'char:Str'],
  [/\bstamina\b/, 'char:Sta'],
  [/\bpresence\b/, 'char:Pre'],
  [/\bcommunication\b/, 'char:Com'],
  [/\bdexterity\b/, 'char:Dex'],
  [/\bquickness\b/, 'char:Qik'],
  [/\bcreo\b/, 'art:Cr'], [/\bintellego\b/, 'art:In'], [/\bmuto\b/, 'art:Mu'], [/\bperdo\b/, 'art:Pe'], [/\brego\b/, 'art:Re'],
  [/\banimal\b(?= (spells?|magic|art))|\banimal form\b/, 'art:An'], [/\baquam\b/, 'art:Aq'], [/\bauram\b/, 'art:Au'], [/\bcorpus\b/, 'art:Co'], [/\bherbam\b/, 'art:He'],
  [/\bignem\b/, 'art:Ig'], [/\bimaginem\b/, 'art:Im'], [/\bmentem\b/, 'art:Me'], [/\bterram\b/, 'art:Te'], [/\bvim\b/, 'art:Vi'],
  [/\bmagic(al)? (realm|auras?|creatures?|beings?|might|spirits?)\b/, 'realm:magic'],
  [/\bfaeri(e|es)\b|\bfae\b|\bfay\b|\bglamour\b/, 'realm:faerie'],
  [/\bdivine\b|\bholy\b|\bangel(s|ic)?\b|\bsaints?\b|\bdominion\b|\bmiracles?\b/, 'realm:divine'],
  [/\binfernal\b|\bdemon(s|ic)?\b|\bdevils?\b|\bhell\b|\btaint(ed)?\b/, 'realm:infernal'],
  [/\bpeasants?\b|\btowns(folk|people)?\b|\bvillagers?\b|\bmerchants?\b|\bmundane\b/, 'realm:mundane'],
  [/\bfree seasons?\b/, 'seasons'],
  [/\bexperience points?\b|\badvancement total\b|\bsource quality\b/, 'xp'],
  [/\bvis\b|\bpawns?\b/, 'vis'],
  [/\bwealth(y)?\b|\bmoney\b|\bsilver\b|\bpoverty\b|\briches\b/, 'wealth'],
  [/\bwarping\b/, 'warping'],
  [/\btwilight\b/, 'twilight'],
  [/\baging\b|\bdecrepitude\b|\bold age\b/, 'aging'],
  [/\bfatigue\b/, 'fatigue'],
  [/\bconfidence\b/, 'confidence'],
  [/\brange\b/, 'range'],
  [/\bduration\b/, 'duration'],
  [/\b(group|room|structure|boundary) targets?\b|\btarget: (group|room|structure|boundary)/, 'target'],
  [/\bgestures?\b|\bsilent(ly)?\b|\bquiet(ly)?\b|\bsubtle\b|\bwithout (words|speaking)\b/, 'silent'],
  [/\bheartbeast\b|\banimal (form|shape)\b|\bshapechang|\bshape-?shift/, 'shapechanged'],
  [/\bmultiple casting\b|\btwo spells at once\b/, 'multicast'],
  [/\bflexible\b/, 'flexible'],
  [/\bwithout (expending|losing|spending) (a )?fatigue\b|\bno fatigue\b/, 'no-fatigue'],
  [/\blong-term fatigue\b|\blife boost\b|\blife-linked\b/, 'cost-power'],
  [/\bstud(y|ies|ying)\b/, 'study'],
  [/\bteach(ing|er|es)?\b/, 'teaching'],
  [/\bwrit(e|es|ing) (books?|summae|tractatus)|\bsummae?\b|\btractat(us|e)\b/, 'writing'],
  [/\badventur(e|es|ing)\b/, 'adventure'],
  [/\btribunals?\b|\bquaesitor(es)?\b|\bcode of hermes\b|\bcertamen\b/, 'politics'],
  [/\binvestigat(e|es|ion|or)\b|\bclues?\b|\bmysteries of\b/, 'investigation'],
  [/\btravel(s|ed|led|ing|ling|er|ers|ler|lers)?\b|\bjourney(s)?\b|\bwander(s|ing|er)?\b/, 'travel'],
  [/\bwilderness\b|\bforests?\b|\bwoods\b|\boutdoors?\b|\bhunt(s|ing|er|ers)?\b|\bsurvival\b/, 'outdoors'],
  [/\banimals?\b|\bbeasts?\b|\bhorses?\b|\bhounds?\b|\bbirds?\b/, 'animals'],
  [/\bcrafts?(man|men|smen|sman)?\b|\bsmith(s|ing)?\b|\bartisans?\b/, 'crafts'],
  [/\bheal(s|ing|er)?\b|\bchirurg(y|eon)\b|\bmedicine\b|\bdiseases?\b|\bphysicians?\b/, 'healing'],
  [/\blatin\b|\bartes liberales\b|\bphilosophiae\b|\btheology\b|\blanguages?\b|\bscholar(s|ly|ship)?\b|\buniversit(y|ies)\b|\beducated\b|\bliterate\b/, 'scholarship'],
  [/\blore\b/, 'lore'],
  [/\bleadership\b|\bfollowers\b|\bretainers\b|\bcommands? (troops|men|soldiers)\b/, 'leadership'],
  [/\bstealth\b|\bsneak(ing|y)?\b|\blegerdemain\b|\bthie(f|ves)\b/, 'stealth'],
  [/\bmusic(al|ian|ians)?\b|\bsing(s|ing|er)?\b|\bsongs?\b|\bperform(s|ing|ance|er)?\b/, 'performance'],
  [/\bsecond sight\b|\bsense (magic|holiness|the supernatural)|\bsee (spirits|invisible)|\bpremonitions?\b/, 'senses'],
  [/\bchurch\b|\bpriests?\b|\bclergy\b|\bmonks?\b|\bnuns?\b|\bbishops?\b|\bpope\b|\bpious\b|\bpiety\b|\breligio(n|us)\b/, 'church'],
  [/\bcompassion(ate)?\b|\bhonest(y)?\b|\bgenerous\b|\bmercy\b|\bjustice\b|\brighteous(ness)?\b|\bpious\b|\bchivalr(y|ous)\b/, 'good'],
  [/\bnobl(e|es|ility|eman|ewoman)\b|\bknights?\b|\blords?\b|\bbarons?\b|\bdukes?\b|\bkings?\b|\broyal(ty)?\b/, 'nobility'],
  [/\border of hermes\b|\bother magi\b|\bhermetic (politics|magi)\b/, 'order'],
  [/\bfamily\b|\bkin(sman|smen)?\b|\bfathers?\b|\bmothers?\b|\bsiblings?\b|\bbrothers?\b|\bsisters?\b|\bparents\b/, 'family'],
  [/\bfaerie (courts?|lords?|queens?|kings?)\b|\bbargains?\b|\bpacts?\b/, 'courts'],
  [/\bsecrets?\b/, 'secret'],
  [/\benem(y|ies)\b|\brival(s|ry)?\b|\bnemesis\b|\bfeuds?\b/, 'rival'],
  [/\bmentors?\b|\bpatrons?\b|\bprotectors?\b|\bfavou?rs\b|\bcontacts\b/, 'patron'],
  [/\blove(r|rs|d)?\b|\bromanc(e|es)\b|\bbeloved\b|\bmarriage\b|\bspouse\b/, 'love'],
  [/\bcurse(s|d)?\b|\bmisfortune\b|\bbad luck\b|\bplagued\b|\bhaunted\b/, 'curse'],
  [/\boutsiders?\b|\bforeign(er|ers)?\b|\bheritage\b|\bancest(or|ors|ry)\b|\boutcasts?\b|\bblood of\b/, 'outsider'],
  [/\breputation\b|\bfam(e|ous)\b|\binfamous\b|\brenown(ed)?\b/, 'fame'],
  [/\bvices?\b|\bsin(s|ful)?\b|\btempt(ed|ation|s)?\b|\bgreed(y)?\b|\bwrath(ful)?\b|\blust(ful)?\b|\bpride\b|\bproud\b|\bavaric(e|ious)\b|\baddict(ed|ion)?\b/, 'vice'],
  [/\boaths?\b|\bvows?\b|\bduty\b|\bloyal(ty)?\b|\bfealty\b|\bsworn\b|\bobligations?\b/, 'duty'],
  [/\bhero(ic|es)?\b|\blegend(s|ary)?\b/, 'heroic'],
  [/\bcompanions?\b|\bfamiliar\b|\bghosts?\b/, 'companion'],
  [/\bdreams?\b|\bvisions?\b|\bprophe(cy|cies|t|ts|tic)\b|\bomens?\b/, 'visions'],
  [/\bmystery cults?\b|\binitiat(e|es|ion)\b|\bmystae\b/, 'mystery'],
];

const OTHER_BOOK = /\b(see|described in|found in|detailed in)\b[^.]{0,80}\b(Realms of Power|Houses of Hermes|The Mysteries|Hedge Magic|Ancient Magic|Art (&|and) Academe|City (&|and) Guild|Lords of Men|Legends of Hermes|Rival Magic|Apprentices|Magi of Hermes|Covenants|The Church|Cradle (&|and) the Crescent|Grogs)\b/i;
const SPELL_LIKE = /\bas if it were a (hermetic )?spell\b|\bdesign(ed)? (the|an|its|each) (effect|power)s?\b|\blevel of (the )?(effect|power)\b|\bequivalent to a (formulaic )?hermetic spell\b/i;

function firstSentence(text: string): string {
  const clean = text.replace(/\s+/g, ' ').replace(/\*/g, '').trim();
  const m = clean.match(/^(.{20,220}?[.!?])(\s|$)/);
  return m ? m[1] : clean.slice(0, 200) + (clean.length > 200 ? '…' : '');
}

const RATE_TYPES = new Set(['artAffinity', 'abilityAffinity', 'languageAffinity', 'advancementMultiplier', 'sourceQuality', 'laterLifeXpPerYear', 'spellMasteryMultiplier', 'labTotalMultiplier', 'penetrationMultiplier', 'ritualVisMultiplier', 'secondaryInsight']);
const NEW_PATH_TYPES = new Set(['grantAbility', 'abilityAccess', 'powers', 'labTheory', 'trueFaith', 'relic', 'mightScore', 'elementalMagic', 'magicalFocus', 'flawlessMagic']);

export function buildRecord(def: VirtueFlawDef, data: GameData): VFRecord {
  // effects that depend on a particular choice (a Church rank, say) are not counted
  const effects = [...(def.effects ?? []), ...Object.values(def.sizeEffects ?? {}).flat()];
  const real = effects.filter((e) => e.type !== 'note' && e.type !== 'implies' && e.type !== 'requiresFlaw');
  const drafts: Draft[] = real.flatMap((e) => effectLinks(e, data));

  // the book's words: the name counts double
  const name = def.name.toLowerCase();
  const text = def.text.toLowerCase();
  for (const [re, tag] of KEYWORDS) {
    if (re.test(name)) drafts.push({ tag, dir: 1, strength: 2, why: `“${def.name}”` });
    else if (re.test(text)) drafts.push({ tag, dir: 1, strength: 1, why: 'mentioned in the text' });
  }
  if (def.param?.kind === 'art' || def.param?.kind === 'technique' || def.param?.kind === 'form') drafts.push({ tag: '$param', dir: 1, strength: 1, why: 'about the chosen Art' });
  for (const [tag, strength] of MANUAL_TAGS[def.id] ?? []) drafts.push({ tag, dir: 1, strength, why: 'from the text' });
  if (def.param?.kind === 'characteristic') drafts.push({ tag: '$param', dir: 1, strength: 2, why: 'about the chosen Characteristic' });
  for (let i = drafts.length - 1; i >= 0; i--) if (!drafts[i].tag) drafts.splice(i, 1);

  const isFlaw = def.kind === 'flaw';
  const storyish = def.categories.includes('Story') || def.categories.includes('Personality');
  // a Flaw with a real upside (a bonus alongside the drawback) is treated like a Story Flaw
  const beneficialFlaw = isFlaw && real.some((e) => effectLinks(e, data).some((l) => l.dir > 0));
  // merge per tag: effects decide the direction; a Flaw's words about a number hurt it
  const byTag = new Map<string, TagLink>();
  for (const dr of drafts) {
    let dir = dr.dir;
    let hook = false;
    if (isFlaw) {
      // A Flaw pulls stories towards its themes (and, for Story and Personality Flaws, its realm);
      // everything else it touches, a number or an activity, it hurts.
      const theme = isThemeTag(dr.tag) || ((storyish || beneficialFlaw) && dr.tag.startsWith('realm:'));
      if (theme) {
        hook = true;
        dir = 1;
      } else if (dr.strength < 3) dir = -1;
    }
    const prev = byTag.get(dr.tag);
    if (!prev || dr.strength > prev.strength) byTag.set(dr.tag, { tag: dr.tag, dir, strength: dr.strength, why: dr.why, ...(hook ? { hook } : {}) });
  }
  const links = [...byTag.values()];
  addRankedLinks(def, links);

  const spellLike = real.some((e) => e.type === 'powers') || /\bpower\b/i.test(def.name) || SPELL_LIKE.test(def.text);
  const otherBook = def.source.book !== 'DE' || OTHER_BOOK.test(def.text);
  const complexity = def.text.length > 1300 || OTHER_BOOK.test(def.text) || def.categories.includes('Mystery') || !!def.beings || spellLike;

  const kind: EffectKind = real.some((e) => NEW_PATH_TYPES.has(e.type)) || def.categories.includes('Mystery') || (def.categories.includes('Supernatural') && !real.length)
    ? 'new-path'
    : real.some((e) => RATE_TYPES.has(e.type))
      ? 'rate'
      : real.length
        ? 'adds'
        : storyish || def.categories.includes('Social Status') ? 'story' : 'new-path';

  const regions = [...(BOOK_REGIONS[def.source.book] ?? []), ...(def.region ? REGION_FIELD[def.region] ?? [] : [])];
  const cultures = CULTURE_GATES[def.id] ?? [];
  const paramKind = def.param?.kind === 'art' || def.param?.kind === 'technique' || def.param?.kind === 'form' ? 'art' : def.param?.kind === 'ability' ? 'ability' : def.param?.kind === 'characteristic' ? 'char' : def.param?.kind === 'realm' ? 'realm' : undefined;
  const computed = real.length > 0;
  const pile = computed ? undefined : storyish || def.categories.includes('Social Status') ? 'story-only' : OTHER_BOOK.test(def.text) || def.source.book !== 'DE' && def.text.length < 200 ? 'other-book' : 'self-contained';
  const value = describeValue(real, kind, def);
  return {
    id: def.id, links, kind, value,
    flags: { complexity, otherBook, spellLike, beneficialFlaw, infernal: def.tainted || /\b(demonic|infernal)\b/i.test(def.name) || /\b(sold (his|her) soul|demonic (parent|familiar|pact)|diabolis(t|m))\b/i.test(def.text) },
    regions: [...new Set(regions)], cultures, paramKind, computed, pile, summary: firstSentence(def.text),
  };
}

const PROGRESSION_EFFECTS = new Set(['artAffinity', 'abilityAffinity', 'xpPool', 'sourceQuality', 'secondaryInsight', 'elementalMagic', 'advancementMultiplier', 'apprenticeXp', 'apprenticeshipTotalXp', 'laterLifeXpPerYear']);
const MAG_MAX: Record<string, number> = {};
for (const m of Object.values(MAGNITUDES)) for (const { tag } of RANKED_TOTALS) if (m[tag]) MAG_MAX[tag] = Math.max(MAG_MAX[tag] ?? 0, Math.abs(m[tag]!));

/**
 * Links from the size of an option's edge: on each Total it moves, its strength is set by how it
 * compares with the other options that move that Total; progression Virtues link to "progression"
 * and flat bonuses away from it; this-or-that choices and archetypes link to their questions.
 */
function addRankedLinks(def: VirtueFlawDef, links: TagLink[]) {
  const set = (tag: string, dir: 1 | -1, strength: number, why: string, hook?: boolean) => {
    const i = links.findIndex((l) => l.tag === tag);
    const link: TagLink = { tag, dir, strength: Math.round(strength * 10) / 10, why, ...(hook ? { hook } : {}) };
    if (i >= 0) links[i] = link;
    else links.push(link);
  };
  const mag = MAGNITUDES[def.id];
  for (const { tag } of RANKED_TOTALS) {
    const v = mag?.[tag];
    if (!v || tag === 'xp') continue;
    // a Flaw's penalty stays below the strength that rules it out for every magus
    const strength = 1.5 + (2 * Math.abs(v)) / MAG_MAX[tag];
    set(tag, v > 0 ? 1 : -1, def.kind === 'flaw' ? Math.min(2.5, strength) : strength, mag!.note);
  }
  const progression = mag?.xp ?? ((def.effects ?? []).some((e) => PROGRESSION_EFFECTS.has(e.type)) && def.kind === 'virtue' ? 3 : 0);
  if (progression > 0) set('progression', 1, 1.5 + (2 * progression) / 10, mag?.note ?? 'faster progression');
  else if (progression < 0) set('progression', -1, 1.5, mag!.note);
  else if (def.kind === 'virtue' && mag && (mag.casting || mag.lab)) set('progression', -1, 1, 'a flat bonus rather than faster progression', true);
  for (const [tag, strength] of CHOICE_LINKS[def.id] ?? []) set(tag, 1, strength, mag?.note ?? 'from the text', true);
  for (const a of ARCHETYPES) {
    const hit = a.vf.find(([id]) => id === def.id);
    if (hit) set(`arch:${a.id}`, 1, hit[1], `suits a ${a.name.toLowerCase()}`, true);
  }
}

function describeValue(real: Effect[], kind: EffectKind, def: VirtueFlawDef): string {
  const parts: string[] = [];
  for (const e of real) {
    const l = effectLinks(e, { abilityById: new Map() } as unknown as GameData);
    if (l[0]) parts.push(l[0].why);
  }
  if (parts.length) return parts.slice(0, 3).join('; ');
  if (kind === 'story') return 'A story hook: no fixed numbers.';
  if (def.categories.includes('Supernatural')) return 'Variable: depends on how often the character uses it.';
  return 'Variable: see the text.';
}

let cache: { data: GameData; records: Map<string, VFRecord> } | null = null;

/** Records for every Virtue and Flaw in this data set (built once). */
export function vfRecords(data: GameData): Map<string, VFRecord> {
  if (cache?.data === data) return cache.records;
  const records = new Map(data.virtuesFlaws.map((v) => [v.id, buildRecord(v, data)]));
  cache = { data, records };
  return records;
}

/** The inventory: what the engine computes and how the rest sorts (design spec, phase 1). */
export function inventory(data: GameData) {
  const recs = [...vfRecords(data).values()];
  const piles = { 'self-contained': 0, 'other-book': 0, 'story-only': 0 };
  for (const r of recs) if (r.pile) piles[r.pile]++;
  return { total: recs.length, computed: recs.filter((r) => r.computed).length, piles, untagged: recs.filter((r) => !r.links.length).map((r) => r.id) };
}

export const ALL_ART_TAGS = ARTS.map((a) => `art:${a}`);
export const ALL_CHAR_TAGS = CHARACTERISTICS.map((c) => `char:${c}`);
