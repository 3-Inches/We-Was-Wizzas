// Magic characters: beings with a Magic Might Score, built with the Magic Character Creation rules
// of Realms of Power: Magic (Chapter Four). Season replaces age for their experience; their Might
// comes from the saga's power level and their role, adjusted by Size for magic animals; they buy
// Magic Qualities with points equal to that Might, and Inferiorities give more points. Size changes
// Strength and Quickness; Might is subtracted from their Advancement Totals; they do not age.

import qualitiesJson from '../../data/generated/magicQualities.json';
import type { Art, Characteristic, PowerKind } from '../../data/types';
import type { CreatureInfo, CreatureQuality, MagicCharacterInfo, MagicSeason, PowerLevel } from '../types';

export interface MagicQualityDef {
  id: string;
  name: string;
  kind: 'quality' | 'inferiority';
  size: 'Major' | 'Minor';
  text: string;
  source: { book: string; line: number; anchor: string };
}

export const MAGIC_QUALITIES = qualitiesJson as MagicQualityDef[];
export const MAGIC_QUALITY_BY_ID = new Map(MAGIC_QUALITIES.map((q) => [q.id, q]));

/** Starting experience by Season (RoP: Magic, Season). */
export const SEASON_XP: Record<MagicSeason, number> = { spring: 120, summer: 360, autumn: 720, winter: 1200 };
/** The human age each Season resembles, used for the creation limit on Ability scores. */
export const SEASON_AGE: Record<MagicSeason, number> = { spring: 5, summer: 20, autumn: 35, winter: 50 };

/** Suggested starting Might by saga power level and role (RoP: Magic, Magic Might). */
export const MIGHT_BY_POWER: Record<PowerLevel, Record<CreatureInfo['intelligence'], number>> = {
  Low: { grog: 0, companion: 5, magus: 10 },
  Medium: { grog: 3, companion: 10, magus: 20 },
  High: { grog: 5, companion: 15, magus: 30 },
  Legendary: { grog: 10, companion: 25, magus: 50 },
};

/** Flaws that bring a companion who needs a sheet of its own. */
export const COMPANION_FLAWS = new Set(['magical-being-companion-flaw', 'magic-being-companion-flaw', 'animal-companion-flaw', 'realm-spirit-companion-flaw', 'realm-spirit-companion']);

/** The five Social Statuses a magic character chooses from (RoP: Magic). */
export const MAGIC_STATUSES = ['magical-master', 'magical-champion', 'magical-covenfolk', 'magical-friend-flaw', 'magical-monster-flaw'];

/** What a Quality or Inferiority does that the toolkit can work out. */
export interface QualityRule {
  repeatable?: boolean;
  might?: number;
  xp?: number;
  confidence?: { score: number; points: number };
  soak?: number;
  /** Gigantic / Miniature: the size table applies */
  sizeTable?: 'gigantic' | 'miniature';
  powers?: { kind: PowerKind; levels: number };
  /** it brings a Virtue or Flaw of this size, chosen on the Quality */
  vf?: { kind: 'virtue' | 'flaw'; size: 'Minor' | 'Major' };
  grantAbility?: string;
  /** Natural Appearance: hides a magic human's monstrous look */
  hidesMonstrous?: boolean;
  /** what the player names on it (a Characteristic, a Form, a weapon) */
  param?: 'characteristic' | 'form' | 'text';
  note?: string;
}

export const QUALITY_RULES: Record<string, QualityRule> = {
  'fatigue-mastery': {},
  'focus-power': { repeatable: true, powers: { kind: 'focus', levels: 25 } },
  'gentle-air': {},
  gifted: {},
  gigantic: { repeatable: true, sizeTable: 'gigantic' },
  'greater-power': { repeatable: true, powers: { kind: 'greater', levels: 50 } },
  'improved-characteristic': { repeatable: true, param: 'characteristic' },
  'magical-meditation': { grantAbility: 'magical-meditation' },
  'major-virtue': { repeatable: true, vf: { kind: 'virtue', size: 'Major' } },
  'natural-appearance': { hidesMonstrous: true },
  'no-fatigue': {},
  'ritual-power': { repeatable: true, powers: { kind: 'ritual', levels: 25 } },
  'vis-mastery': {},
  'form-resistance': { repeatable: true, param: 'form' },
  'gift-of-speech': {},
  'improved-abilities': { repeatable: true, xp: 50 },
  'improved-attack': { repeatable: true, param: 'text', note: '+2 Attack with the named natural weapon' },
  'improved-confidence': { repeatable: true, confidence: { score: 1, points: 2 } },
  'improved-damage': { repeatable: true, param: 'text', note: '+3 Damage with the named natural weapon' },
  'improved-defense': { repeatable: true, param: 'text', note: '+2 Defense with the named natural weapon' },
  'improved-fatigue': { repeatable: true },
  'improved-initiative': { repeatable: true, param: 'text', note: '+3 Initiative with the named natural weapon' },
  'improved-might': { repeatable: true, might: 1 },
  'improved-powers': { repeatable: true, note: '5 mastery points for powers' },
  'improved-recovery': {},
  'improved-soak': { repeatable: true, soak: 2 },
  'lesser-power': { repeatable: true, powers: { kind: 'lesser', levels: 25 } },
  'minor-virtue': { repeatable: true, vf: { kind: 'virtue', size: 'Minor' } },
  'personal-power': { repeatable: true, powers: { kind: 'personal', levels: 25 } },
  'acclimation-prone-inferiority': {},
  'major-flaw-inferiority': { repeatable: true, vf: { kind: 'flaw', size: 'Major' } },
  'miniature-inferiority': { repeatable: true, sizeTable: 'miniature' },
  'monstrous-appearance-inferiority': {},
  'reduced-characteristic-inferiority': { repeatable: true, param: 'characteristic' },
  'temporary-might-inferiority': {},
  'limited-gestures-inferiority': {},
  'limited-movement-inferiority': {},
  'limited-speech-inferiority': {},
  'minor-flaw-inferiority': { repeatable: true, vf: { kind: 'flaw', size: 'Minor' } },
  'reduced-abilities-inferiority': { repeatable: true, xp: -50 },
  'reduced-attack-inferiority': { repeatable: true, param: 'text', note: '−2 Attack with the named natural weapon' },
  'reduced-defense-inferiority': { repeatable: true, param: 'text', note: '−2 Defense with the named natural weapon' },
  'reduced-fatigue-inferiority': { repeatable: true },
  'reduced-initiative-inferiority': { repeatable: true, param: 'text', note: '−3 Initiative with the named natural weapon' },
  'reduced-might-inferiority': { repeatable: true, might: -1 },
  'reduced-power-inferiority': { repeatable: true },
  'reduced-soak-inferiority': { repeatable: true, soak: -2 },
  'susceptible-to-deprivation-inferiority': {},
};

/** Qualities and Inferiorities each true form has without paying for them (RoP: Magic, the Special Virtues). */
export const INHERENT: Record<CreatureInfo['kind'], { id: string; label: string }[]> = {
  animal: [
    { id: 'no-hands', label: 'No Hands and Mute, as an animal (Gift of Speech lets it talk)' },
  ],
  human: [{ id: 'monstrous-appearance-inferiority', label: 'Monstrous Appearance: −6 to social rolls with mundane humans and animals (hidden by Natural Appearance)' }],
  spirit: [{ id: 'magical-air', label: 'Magical Air, as if it had The Gift (only Gentle Air lessens it); insubstantial in its true form' }],
  thing: [
    { id: 'temporary-might-inferiority', label: 'Temporary Might: Might Points return only slowly, and wounds cost Might and shed vis' },
    { id: 'no-fatigue', label: 'No Fatigue' },
  ],
};

export const POINTS = { Major: 3, Minor: 1 } as const;

/** Gigantic and Miniature (RoP: Magic): change in Size, Strength and Quickness for the current Size. */
export function sizeTableStep(table: 'gigantic' | 'miniature', size: number): { size: number; str: number; qik: number } {
  if (table === 'gigantic') {
    const inc = size <= -11 ? 5 : size <= -6 ? 4 : size <= -2 ? 3 : size <= 1 ? 2 : 1;
    return { size: inc, str: 2 * inc, qik: -inc };
  }
  const dec = size <= -10 ? 5 : size <= -5 ? 4 : size <= -1 ? 3 : size <= 2 ? 2 : 1;
  return { size: -dec, str: -2 * dec, qik: dec };
}

export interface MagicCharacterDerived {
  season: MagicSeason;
  xp: number;
  xpParts: { label: string; value: number }[];
  might: number;
  mightParts: { label: string; value: number }[];
  form?: Art;
  points: { budget: number; spent: number; fromInferiorities: number };
  /** Size of the true form after Gigantic and Miniature */
  size: number;
  str: number;
  qik: number;
  confidence: { score: number; points: number };
  soak: number;
  powers: Partial<Record<PowerKind, number>>;
  monstrous: boolean;
  inherent: { id: string; label: string }[];
  vis: number;
  issues: string[];
}

const count = (qs: CreatureQuality[], id: string) => qs.filter((q) => q.id === id).length;

/** Everything the Magic Character Creation rules work out from the creature's choices. */
export function deriveMagicCharacter(cr: CreatureInfo, mc: MagicCharacterInfo): MagicCharacterDerived {
  const qs = mc.qualities ?? [];
  const issues: string[] = [];
  const xpParts = [{ label: `Season: ${mc.season}`, value: SEASON_XP[mc.season] }];
  let might = mc.baseMight;
  const mightParts = [{ label: `Starting Might (${mc.powerLevel} saga, ${cr.intelligence}-level)`, value: mc.baseMight }];
  if (cr.kind === 'animal' && cr.size) {
    might -= cr.size;
    mightParts.push({ label: `Magic animal: Size ${cr.size > 0 ? '+' : ''}${cr.size} subtracted`, value: -cr.size });
  }
  let budget = mc.baseMight;
  let spent = 0;
  let fromInf = 0;
  let size = cr.size;
  let str = 2 * cr.size;
  let qik = -cr.size;
  let soak = 0;
  const confidence = { score: 0, points: 0 };
  const powers: Partial<Record<PowerKind, number>> = {};
  // Size changes in order: Inferiorities (Miniature) before Qualities (Gigantic)
  const ordered = [...qs].sort((a, b) => (a.id === 'miniature-inferiority' ? -1 : 0) - (b.id === 'miniature-inferiority' ? -1 : 0));
  for (const q of ordered) {
    const def = MAGIC_QUALITY_BY_ID.get(q.id);
    const r = QUALITY_RULES[q.id] ?? {};
    if (!def) continue;
    if (def.kind === 'quality') spent += POINTS[def.size];
    else {
      budget += POINTS[def.size];
      fromInf += POINTS[def.size];
    }
    if (def.size === 'Major' && cr.intelligence === 'grog') issues.push(`${def.name}: a grog-level magic character cannot take Major Qualities or Inferiorities.`);
    if (!r.repeatable && count(qs, q.id) > 1) issues.push(`${def.name} can be taken only once.`);
    if (r.might) {
      might += r.might;
      mightParts.push({ label: def.name, value: r.might });
    }
    if (r.xp) xpParts.push({ label: def.name, value: r.xp });
    if (r.soak) soak += r.soak;
    if (r.confidence) {
      confidence.score += r.confidence.score;
      confidence.points += r.confidence.points;
    }
    if (r.powers) powers[r.powers.kind] = (powers[r.powers.kind] ?? 0) + r.powers.levels;
    if (r.sizeTable) {
      const st = sizeTableStep(r.sizeTable, size);
      size += st.size;
      str += st.str;
      qik += st.qik;
    }
  }
  if (spent > budget) issues.push(`Qualities cost ${spent} points but the Might gives ${mc.baseMight}${fromInf ? ` and Inferiorities ${fromInf}` : ''} (${budget}).`);
  if (cr.kind === 'thing') {
    const min = mightMinSize(might);
    if (size < min) issues.push(`A magic thing with Might ${might} must be at least Size ${min} (RoP: Magic, Magic Things).`);
  }
  const monstrous = (cr.kind === 'human' || qs.some((q) => q.id === 'monstrous-appearance-inferiority')) && !qs.some((q) => q.id === 'natural-appearance');
  const xp = xpParts.reduce((s, p) => s + p.value, 0);
  return {
    season: mc.season, xp, xpParts, might, mightParts, form: mc.form, points: { budget, spent, fromInferiorities: fromInf },
    size, str, qik, confidence, soak, powers, monstrous, inherent: INHERENT[cr.kind] ?? [], vis: Math.ceil(Math.max(0, might) / 5), issues,
  };
}

/** Minimum Size of a magic thing for its Might (RoP: Magic, Magic Things). */
export function mightMinSize(might: number): number {
  if (might <= 0) return -21;
  if (might <= 5) return [-21, -18, -15, -12, -9, -6][might];
  return -3 + 3 * Math.ceil((might - 10) / 5);
}

/** A fresh RoP: Magic setup for a creature: Summer, the suggested Might, and its Form. */
export function newMagicCharacter(cr: CreatureInfo, powerLevel: PowerLevel = 'Medium', baseMight?: number): MagicCharacterInfo {
  return { season: 'summer', powerLevel, baseMight: baseMight ?? MIGHT_BY_POWER[powerLevel][cr.intelligence], form: DEFAULT_FORM[cr.kind], qualities: [] };
}

const DEFAULT_FORM: Record<CreatureInfo['kind'], Art> = { animal: 'An', human: 'Co', spirit: 'Me', thing: 'Te' };

/** Characteristics named by Improved / Reduced (Characteristic). */
export function characteristicQualities(qs: CreatureQuality[]): Partial<Record<Characteristic, number>> {
  const out: Partial<Record<Characteristic, number>> = {};
  for (const q of qs) {
    if (!q.param) continue;
    if (q.id === 'improved-characteristic') out[q.param as Characteristic] = (out[q.param as Characteristic] ?? 0) + 1;
    if (q.id === 'reduced-characteristic-inferiority') out[q.param as Characteristic] = (out[q.param as Characteristic] ?? 0) - 1;
  }
  return out;
}
