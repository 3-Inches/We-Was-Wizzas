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
  /** Improved Powers / Reduced Power: mastery points for the character's powers */
  mastery?: number;
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
  'improved-characteristic': { repeatable: true, param: 'characteristic', note: '+1 to a Characteristic already +5 or more' },
  'magical-meditation': { grantAbility: 'magical-meditation' },
  'major-virtue': { repeatable: true, vf: { kind: 'virtue', size: 'Major' } },
  'natural-appearance': { hidesMonstrous: true },
  'no-fatigue': {},
  'ritual-power': { repeatable: true, powers: { kind: 'ritual', levels: 25 } },
  'vis-mastery': {},
  'form-resistance': { repeatable: true, param: 'form', grantAbility: 'form-resistance' },
  'gift-of-speech': {},
  'improved-abilities': { repeatable: true, xp: 50 },
  'improved-attack': { repeatable: true, param: 'text', note: '+2 Attack with the named natural weapon' },
  'improved-confidence': { repeatable: true, confidence: { score: 1, points: 2 } },
  'improved-damage': { repeatable: true, param: 'text', note: '+3 Damage with the named natural weapon' },
  'improved-defense': { repeatable: true, param: 'text', note: '+2 Defense with the named natural weapon' },
  'improved-fatigue': { repeatable: true },
  'improved-initiative': { repeatable: true, param: 'text', note: '+3 Initiative with the named natural weapon' },
  'improved-might': { repeatable: true, might: 1 },
  'improved-powers': { repeatable: true, mastery: 5, note: '5 mastery points for powers' },
  'improved-recovery': {},
  'improved-soak': { repeatable: true, soak: 2 },
  'lesser-power': { repeatable: true, powers: { kind: 'lesser', levels: 25 } },
  'minor-virtue': { repeatable: true, vf: { kind: 'virtue', size: 'Minor' } },
  'personal-power': { repeatable: true, powers: { kind: 'personal', levels: 25 } },
  'acclimation-prone-inferiority': {},
  'major-flaw-inferiority': { repeatable: true, vf: { kind: 'flaw', size: 'Major' } },
  'miniature-inferiority': { repeatable: true, sizeTable: 'miniature' },
  'monstrous-appearance-inferiority': {},
  'reduced-characteristic-inferiority': { repeatable: true, param: 'characteristic', note: '−1 to a Characteristic already −5 or less from Poor (Characteristic)' },
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
  'reduced-power-inferiority': { repeatable: true, mastery: -5, note: '−5 mastery points: higher Might cost or lower Initiative' },
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

export interface MagicIssue {
  severity: 'error' | 'warning';
  text: string;
  /** copies of a Quality the rules do not allow, for the one-click fix */
  remove?: { id: string; param?: string; count: number };
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
  /** Improved and Reduced (Characteristic), the copies the rules allow */
  chars: Partial<Record<Characteristic, number>>;
  /** Characteristics before Size and Qualities, and those lowered by Poor (Characteristic) */
  preSize?: Record<Characteristic, number>;
  poor: Characteristic[];
  confidence: { score: number; points: number };
  soak: number;
  powers: Partial<Record<PowerKind, number>>;
  /** mastery points from Improved Powers, less Reduced Power, for any of its powers */
  mastery: number;
  /** Supernatural Abilities its Qualities give (Magical Meditation, (Form) Resistance) at score 1 */
  grants: { ability: string; param?: string; from: string }[];
  monstrous: boolean;
  inherent: { id: string; label: string }[];
  vis: number;
  issues: MagicIssue[];
}

/** What the rest of the character sheet tells the Quality rules. */
export interface MagicCharacterContext {
  /** each Characteristic after Virtues and Flaws, before Size and Qualities */
  preSize?: Record<Characteristic, number>;
  /** Characteristics lowered by Poor (Characteristic) */
  poor?: Set<Characteristic>;
}

const count = (qs: CreatureQuality[], id: string) => qs.filter((q) => q.id === id).length;

/** Qualities grouped by what they are and what they name, in the order first taken. */
export function groupQualities(qs: CreatureQuality[]): { key: string; id: string; param?: string; items: CreatureQuality[] }[] {
  const out: { key: string; id: string; param?: string; items: CreatureQuality[] }[] = [];
  for (const q of qs) {
    // a Virtue or Flaw Quality is its own row: each names a different Virtue or Flaw
    const key = QUALITY_RULES[q.id]?.vf ? q.uid : `${q.id}|${q.param ?? ''}`;
    const g = out.find((x) => x.key === key);
    if (g) g.items.push(q);
    else out.push({ key, id: q.id, param: q.param, items: [q] });
  }
  return out;
}

const CHAR_FULL: Record<Characteristic, string> = {
  Int: 'Intelligence', Per: 'Perception', Pre: 'Presence', Com: 'Communication', Str: 'Strength', Sta: 'Stamina', Dex: 'Dexterity', Qik: 'Quickness',
};
const signedN = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Everything the Magic Character Creation rules work out from the creature's choices. */
export function deriveMagicCharacter(cr: CreatureInfo, mc: MagicCharacterInfo, ctx: MagicCharacterContext = {}): MagicCharacterDerived {
  const qs = mc.qualities ?? [];
  const issues: MagicIssue[] = [];
  const xpParts = [{ label: `Season: ${mc.season}`, value: SEASON_XP[mc.season] }];
  let might = mc.baseMight;
  const mightParts = [{ label: `Starting Might (${mc.powerLevel} saga, ${cr.intelligence}-level)`, value: mc.baseMight }];
  if (cr.kind === 'animal' && cr.size) {
    might -= cr.size;
    mightParts.push({ label: `Magic animal: Size ${cr.size > 0 ? '+' : ''}${cr.size} subtracted`, value: -cr.size });
  }
  // how many copies of each group the rules allow; the rest give nothing (and no points)
  const allowed = new Map<string, number>();
  const groups = groupQualities(qs);
  const chars: Partial<Record<Characteristic, number>> = {};
  const preSize = ctx.preSize;
  // the greatest Characteristic before Size, with the Improved (Characteristic) copies it may take
  // ("a Size +2 character with Stamina +8 could not reduce its Quickness below –10")
  const improvedBy: Partial<Record<Characteristic, number>> = {};
  if (preSize && cr.intelligence !== 'grog') {
    for (const q of qs) if (q.id === 'improved-characteristic' && q.param && preSize[q.param as Characteristic] >= 5) improvedBy[q.param as Characteristic] = (improvedBy[q.param as Characteristic] ?? 0) + 1;
  }
  const best = preSize ? Math.max(...(Object.entries(preSize) as [Characteristic, number][]).map(([k, v]) => v + (improvedBy[k] ?? 0))) : undefined;
  const xpBefore = SEASON_XP[mc.season] + 50 * count(qs, 'improved-abilities');
  for (const g of groups) {
    const def = MAGIC_QUALITY_BY_ID.get(g.id);
    const r = QUALITY_RULES[g.id] ?? {};
    if (!def) continue;
    const n = g.items.length;
    let ok = n;
    const drop = (keep: number, text: string, severity: MagicIssue['severity'] = 'error') => {
      if (keep >= ok) return;
      issues.push({ severity, text, remove: { id: g.id, param: g.param, count: ok - keep } });
      ok = keep;
    };
    if (def.size === 'Major' && cr.intelligence === 'grog') drop(0, `${def.name}: a grog-level magic character cannot take Major Qualities or Inferiorities.`);
    if (!r.repeatable) drop(1, `${def.name} can be taken only once.`);
    const ch = g.param as Characteristic | undefined;
    if (r.param === 'characteristic' && !ch) issues.push({ severity: 'warning', text: `${def.name}: choose the Characteristic it changes.` });
    if (r.param === 'form' && !g.param) issues.push({ severity: 'warning', text: `${def.name}: choose its Form.` });
    if (r.vf && !g.items[0].virtueUid) issues.push({ severity: 'warning', text: `${def.name}: choose the ${r.vf.kind === 'virtue' ? 'Virtue' : 'Flaw'} it gives.` });
    if (g.id === 'improved-characteristic' && ch && preSize) {
      const v = preSize[ch];
      if (v < 5)
        drop(0, `Improved (${CHAR_FULL[ch]}) raises a Characteristic that is already +5 or more before Size; ${CHAR_FULL[ch]} is ${signedN(v)}. Raise it to +5 first (Great ${CHAR_FULL[ch]} Virtues), or remove ${n === 1 ? 'it' : `these ${n}`}.`);
    }
    if (g.id === 'reduced-characteristic-inferiority' && ch && preSize) {
      const v = preSize[ch];
      if (!ctx.poor?.has(ch) || v > -5) {
        drop(0, `Reduced (${CHAR_FULL[ch]}) lowers a Characteristic that is already −5 or less because of Poor (${CHAR_FULL[ch]}); ${CHAR_FULL[ch]} is ${signedN(v)}${ctx.poor?.has(ch) ? '' : ' with no Poor Characteristic Flaw'}.`);
      } else if (best !== undefined) {
        // no lower than the inverse of the greatest Characteristic
        drop(Math.max(0, v + best), `Reduced (${CHAR_FULL[ch]}) cannot take ${CHAR_FULL[ch]} below ${signedN(-best)}, the inverse of the character's greatest Characteristic (before Size).`);
      }
    }
    if (g.id === 'reduced-fatigue-inferiority') drop(4 + count(qs, 'improved-fatigue'), 'Reduced Fatigue can be taken at most four times, unless the character has extra Fatigue levels.');
    if (g.id === 'reduced-abilities-inferiority') drop(Math.floor(xpBefore / 50), `Reduced Abilities takes 50 experience points the character has; it has ${xpBefore}.`);
    if (g.id === 'limited-gestures-inferiority' && cr.kind === 'animal') drop(0, 'Magic animals cannot take Limited Gestures: they already have No Hands.');
    if (g.id === 'natural-appearance' && (cr.kind === 'animal' || cr.kind === 'spirit'))
      drop(0, `Natural Appearance hides the monstrous look of a magic human, or the animated matter of a magic thing; a magic ${cr.kind} gains nothing from it.`, 'warning');
    allowed.set(g.key, ok);
  }
  let budget = mc.baseMight;
  let spent = 0;
  let fromInf = 0;
  let size = cr.size;
  let str = 2 * cr.size;
  let qik = -cr.size;
  let soak = 0;
  let mastery = 0;
  const confidence = { score: 0, points: 0 };
  const powers: Partial<Record<PowerKind, number>> = {};
  const grants: MagicCharacterDerived['grants'] = [];
  // inherent to the true form: no points for the Inferiority, no cost for the Quality
  const inherentIds = new Set((INHERENT[cr.kind] ?? []).map((i) => i.id));
  // Size changes in order: Inferiorities (Miniature) before Qualities (Gigantic)
  const used = new Map<string, number>();
  const ordered = [...qs].sort((a, b) => (a.id === 'miniature-inferiority' ? -1 : 0) - (b.id === 'miniature-inferiority' ? -1 : 0));
  for (const q of ordered) {
    const def = MAGIC_QUALITY_BY_ID.get(q.id);
    const r = QUALITY_RULES[q.id] ?? {};
    if (!def) continue;
    const key = r.vf ? q.uid : `${q.id}|${q.param ?? ''}`;
    const n = (used.get(key) ?? 0) + 1;
    used.set(key, n);
    const valid = n <= (allowed.get(key) ?? 0);
    const inherent = inherentIds.has(q.id);
    if (def.kind === 'quality') spent += inherent ? 0 : POINTS[def.size];
    else if (valid && !inherent) {
      budget += POINTS[def.size];
      fromInf += POINTS[def.size];
    }
    if (!valid) continue;
    if (r.might) {
      might += r.might;
      mightParts.push({ label: def.name, value: r.might });
    }
    if (r.xp) xpParts.push({ label: def.name, value: r.xp });
    if (r.soak) soak += r.soak;
    if (r.mastery) mastery += r.mastery;
    if (r.confidence) {
      confidence.score += r.confidence.score;
      confidence.points += r.confidence.points;
    }
    if (r.powers) powers[r.powers.kind] = (powers[r.powers.kind] ?? 0) + r.powers.levels;
    if (r.grantAbility && !grants.some((g) => g.ability === r.grantAbility && g.param === q.param)) grants.push({ ability: r.grantAbility, param: q.param, from: def.name });
    if (q.id === 'improved-characteristic' && q.param) chars[q.param as Characteristic] = (chars[q.param as Characteristic] ?? 0) + 1;
    if (q.id === 'reduced-characteristic-inferiority' && q.param) chars[q.param as Characteristic] = (chars[q.param as Characteristic] ?? 0) - 1;
    if (r.sizeTable) {
      const st = sizeTableStep(r.sizeTable, size);
      size += st.size;
      str += st.str;
      qik += st.qik;
    }
  }
  if (spent > budget) issues.push({ severity: 'error', text: `Qualities cost ${spent} points but the Might gives ${mc.baseMight}${fromInf ? ` and Inferiorities ${fromInf}` : ''} (${budget}).` });
  if (cr.kind === 'thing') {
    const min = mightMinSize(might);
    if (size < min) issues.push({ severity: 'error', text: `A magic thing with Might ${might} must be at least Size ${min} (RoP: Magic, Magic Things).` });
  }
  const monstrous = (cr.kind === 'human' || qs.some((q) => q.id === 'monstrous-appearance-inferiority')) && !qs.some((q) => q.id === 'natural-appearance');
  const xp = xpParts.reduce((s, p) => s + p.value, 0);
  return {
    season: mc.season, xp, xpParts, might, mightParts, form: mc.form, points: { budget, spent, fromInferiorities: fromInf },
    size, str, qik, chars, preSize, poor: [...(ctx.poor ?? [])], confidence, soak, powers, mastery, grants, monstrous, inherent: INHERENT[cr.kind] ?? [], vis: Math.ceil(Math.max(0, might) / 5), issues,
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
