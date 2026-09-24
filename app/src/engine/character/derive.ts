// Computes everything derivable about a character from its stored choices.
// Pure functions: (character, game data, house rules) -> DerivedCharacter.

import {
  ARTS, CHARACTERISTICS, CHILDHOOD_ABILITIES, abilityCapForAge, childModifier, charCost, isForm, isTechnique,
  PARAMETERIZED_ABILITIES, abilityMatches, abilityTypeOf, isLanguageAbility,
  type Art, type Characteristic, type Effect, type GameData, type VirtueFlawDef, type AbilityType, type AbilityDef,
} from '../../data';
import type { Character, CharAbility, CharVirtue, HouseRules, XpAlloc, XpSource } from '../types';
import { abilityScoreFromXp, abilityXpRemainder, artScoreFromXp, artXpRemainder, withAffinity, warpingScoreFromPoints } from '../xp';

export type ResolvedEffect = Effect & { fromUid: string; fromName: string; param?: string };

export interface ResolvedVirtue {
  cv: CharVirtue;
  def: VirtueFlawDef | undefined;
  points: number; // signed: + for virtue cost, - for flaw
  name: string;
}

export interface DerivedAbility {
  uid: string;
  abilityId: string;
  def?: AbilityDef;
  name: string;
  type: AbilityType;
  restricted: boolean;
  specialty?: string;
  xp: XpAlloc;
  effectiveXp: number;
  score: number;
  remainder: number;
  bonus: number; // Puissant etc.
  total: number; // score + bonus
  affinity: boolean;
  cap: number;
  granted: number; // score granted by virtues
}

export interface DerivedArt {
  art: Art;
  xp: XpAlloc;
  effectiveXp: number;
  score: number;
  remainder: number;
  puissant: number;
  value: number; // score + puissant (before deficiency)
  deficient: 'none' | 'all' | 'notMR';
  affinity: boolean;
  elementalBonus: number;
}

export interface XpBudget {
  id: XpSource;
  label: string;
  total: number;
  spent: number;
  spellLevels?: { total: number; spent: number };
  /** human description of what can be bought */
  allows: string;
  kind: 'ability' | 'art+ability' | 'mixed';
  abilityTypes?: AbilityType[];
  abilities?: string[];
  arts?: boolean;
}

export interface VFTally {
  virtuePoints: number;
  flawPoints: number;
  minorFlaws: number;
  majorFlaws: number;
  storyFlaws: number;
  personalityFlaws: number;
  majorPersonalityFlaws: number;
  majorHermeticVirtues: number;
  hermeticFlaws: number;
  socialStatuses: ResolvedVirtue[];
  taintedVirtuePoints: number;
  taintedFlawPoints: number;
  allowedVirtuePoints: number;
  freeVirtues: ResolvedVirtue[];
}

export interface DerivedCharacter {
  char: Character;
  virtues: ResolvedVirtue[];
  effects: ResolvedEffect[];
  hasGift: boolean;
  giftType: 'none' | 'normal' | 'gentle' | 'blatant' | 'suppressed';
  isMagus: boolean;
  tally: VFTally;
  size: number;
  characteristics: Record<Characteristic, { base: number; value: number; notes: string[] }>;
  charPointsBudget: number;
  charPointsSpent: number;
  abilities: DerivedAbility[];
  abilityByUid: Map<string, DerivedAbility>;
  arts: Record<Art, DerivedArt>;
  budgets: XpBudget[];
  abilityAccess: { types: Set<AbilityType>; abilities: Set<string>; notes: string[] };
  laterLifeYears: number;
  ageCap: number;
  confidence: { score: number; points: number };
  reputations: { text: string; scope: string; score: number; fromVirtue?: string }[];
  warpingScore: number;
  warpingPoints: number;
  decrepitude: number;
  livingConditionsMod: number;
  agingRollMod: number;
  soak: number;
  woundPenaltyAdj: number;
  fatiguePenaltyAdj: number;
  load: number;
  burden: number;
  encumbrance: number;
  woundRanges: { light: [number, number]; medium: [number, number]; heavy: [number, number]; incap: [number, number]; dead: number };
  fatigueLevels: { name: string; penalty: number | null }[];
  currentWoundPenalty: number;
  currentFatiguePenalty: number;
  apprenticeshipSpellLevelBudget: number;
  masteryPools: { uid: string; label: string; total: number }[];
  flawless: boolean;
  magicalFocus: 'none' | 'minor' | 'major';
  focusText?: string;
  socialPenalty: number;
  notes: string[];
}

const SIZE_POINTS: Record<string, number> = { Major: 3, Minor: 1, Free: 0 };

export function vfDisplayName(def: VirtueFlawDef | undefined, cv: CharVirtue, data?: GameData): string {
  const base = def?.name ?? cv.defId;
  if (!cv.param) return base;
  let label = cv.param;
  if (def?.param?.kind === 'ability' && data) label = data.abilityById.get(cv.param)?.name ?? cv.param;
  if (def?.param?.kind === 'art' || def?.param?.kind === 'technique' || def?.param?.kind === 'form') {
    label = ({ Cr: 'Creo', In: 'Intellego', Mu: 'Muto', Pe: 'Perdo', Re: 'Rego', An: 'Animal', Aq: 'Aquam', Au: 'Auram', Co: 'Corpus', He: 'Herbam', Ig: 'Ignem', Im: 'Imaginem', Me: 'Mentem', Te: 'Terram', Vi: 'Vim' } as Record<string, string>)[cv.param] ?? cv.param;
  }
  if (/\(.*\)/.test(base)) return base.replace(/\(([^)]*)\)/, `(${label})`);
  if (/ Ability$/.test(base)) return base.replace(/Ability$/, label);
  if (/ Art$/.test(base)) return base.replace(/Art$/, label);
  if (/Technique$|Form$/.test(base)) return base.replace(/(Technique|Form)$/, label);
  return `${base} (${label})`;
}

export function abilityDisplayName(ab: { abilityId: string; param?: string }, data: GameData): string {
  const def = data.abilityById.get(ab.abilityId);
  const base = def?.name ?? ab.abilityId;
  if (!ab.param) return base;
  if (ab.abilityId === 'living-language' || ab.abilityId === 'dead-language') return ab.param;
  if (base.includes('(')) return base.replace(/\(([^)]*)\)/, ab.param);
  return `${base}: ${ab.param}`;
}

function resolveEffects(virtues: ResolvedVirtue[]): ResolvedEffect[] {
  const out: ResolvedEffect[] = [];
  for (const v of virtues) {
    for (const e of v.def?.effects ?? []) {
      const r: Record<string, unknown> = { ...e, fromUid: v.cv.uid, fromName: v.name, param: v.cv.param };
      for (const k of ['ability', 'art', 'char']) if (r[k] === '$param') r[k] = v.cv.param ?? '';
      out.push(r as ResolvedEffect);
    }
  }
  return out;
}

const CREATION_SOURCES: XpSource[] = ['native', 'childhood', 'laterLife', 'apprenticeship', 'postGauntlet'];

function effectiveXp(alloc: XpAlloc, multiplier: number): number {
  let total = 0;
  for (const [src, v] of Object.entries(alloc) as [XpSource, number][]) {
    if (!v) continue;
    if (multiplier !== 1 && (CREATION_SOURCES.includes(src) || src.startsWith('pool:'))) total += withAffinity(v, multiplier);
    else total += v;
  }
  return total;
}

export function sumAlloc(alloc: XpAlloc, pred?: (s: XpSource) => boolean): number {
  let t = 0;
  for (const [k, v] of Object.entries(alloc) as [XpSource, number][]) if (!pred || pred(k)) t += v || 0;
  return t;
}

export function burdenFromLoad(load: number): number {
  const table = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55];
  let b = 0;
  for (let i = 0; i < table.length; i++) if (load >= table[i]) b = i;
  if (load > 55) {
    // continue triangular pattern
    let n = 10;
    let need = 55;
    while (load >= need + n + 1) {
      n++;
      need += n;
      b = n;
    }
  }
  return b;
}

export function deriveCharacter(char: Character, data: GameData, rules: HouseRules): DerivedCharacter {
  const notes: string[] = [];
  // ---------------------------------------------------------------- virtues
  const virtues: ResolvedVirtue[] = char.virtues.map((cv) => {
    const def = data.vfById.get(cv.defId);
    const base = SIZE_POINTS[cv.size] ?? 0;
    let points = 0;
    if (!cv.free) points = def?.kind === 'flaw' ? (cv.noPoints ? 0 : -base) : base;
    return { cv, def, points, name: vfDisplayName(def, cv, data) };
  });
  const effects = resolveEffects(virtues);
  const has = (id: string) => virtues.some((v) => v.cv.defId === id);
  const eff = <T extends Effect['type']>(t: T) => effects.filter((e) => e.type === t) as Extract<ResolvedEffect, { type: T }>[];

  let giftType: DerivedCharacter['giftType'] = 'none';
  for (const g of eff('gift')) {
    if (g.kind === 'normal' && giftType === 'none') giftType = 'normal';
    else if (g.kind !== 'normal') giftType = g.kind;
  }
  const hasGift = giftType !== 'none';
  const isMagus = char.type === 'magus';

  // ---------------------------------------------------------------- tally
  const tally: VFTally = {
    virtuePoints: 0, flawPoints: 0, minorFlaws: 0, majorFlaws: 0, storyFlaws: 0, personalityFlaws: 0,
    majorPersonalityFlaws: 0, majorHermeticVirtues: 0, hermeticFlaws: 0, socialStatuses: [],
    taintedVirtuePoints: 0, taintedFlawPoints: 0, allowedVirtuePoints: 0, freeVirtues: [],
  };
  for (const v of virtues) {
    const d = v.def;
    if (!d) continue;
    if (d.categories.includes('Social Status')) tally.socialStatuses.push(v);
    if (v.cv.free) tally.freeVirtues.push(v);
    if (d.kind === 'virtue') {
      tally.virtuePoints += Math.max(0, v.points);
      if (d.tainted) tally.taintedVirtuePoints += SIZE_POINTS[v.cv.size];
      if (d.categories.includes('Hermetic') && v.cv.size === 'Major') tally.majorHermeticVirtues++;
    } else {
      tally.flawPoints += Math.max(0, -v.points);
      if (d.tainted) tally.taintedFlawPoints += SIZE_POINTS[v.cv.size];
      if (!v.cv.free && !v.cv.noPoints) {
        if (v.cv.size === 'Minor') tally.minorFlaws++;
        if (v.cv.size === 'Major') tally.majorFlaws++;
      }
      if (d.categories.includes('Story')) tally.storyFlaws++;
      if (d.categories.includes('Personality')) {
        tally.personalityFlaws++;
        if (v.cv.size === 'Major') tally.majorPersonalityFlaws++;
      }
      if (d.categories.includes('Hermetic')) tally.hermeticFlaws++;
    }
  }
  tally.allowedVirtuePoints = char.type === 'mythic' ? tally.flawPoints * rules.mythicVirtueRatio : tally.flawPoints;

  // ---------------------------------------------------------------- size & characteristics
  const child = childModifier(char.age);
  let size = eff('size').reduce((s, e) => s + e.amount, 0) + child.size;
  if (has('blood-of-the-nephilim') && char.age >= 100) size += Math.floor(char.age / 100);

  const characteristics = {} as DerivedCharacter['characteristics'];
  for (const c of CHARACTERISTICS) {
    const base = char.characteristics[c] ?? 0;
    let value = base;
    const cn: string[] = [];
    for (const g of eff('greatChar')) {
      if (g.char === c) {
        value += g.amount;
        cn.push(`${g.fromName} ${g.amount > 0 ? '+' : ''}${g.amount}`);
      }
    }
    for (const b of eff('charBonus')) {
      if (b.char === c) {
        value += b.amount;
        if (b.max !== undefined) value = Math.min(value, Math.max(b.max, base));
        if (b.min !== undefined) value = Math.max(value, Math.min(b.min, base));
        cn.push(`${b.fromName} ${b.amount > 0 ? '+' : ''}${b.amount}`);
      }
    }
    if (child.char) {
      value += child.char;
      cn.push(`child ${child.char}`);
    }
    const ov = char.overrides[`char:${c}`];
    if (ov !== undefined) {
      value = ov;
      cn.push('override');
    }
    characteristics[c] = { base, value, notes: cn };
  }
  const charPointsBudget = rules.characteristicPoints + eff('charPoints').reduce((s, e) => s + e.amount, 0);
  const charPointsSpent = CHARACTERISTICS.reduce((s, c) => s + charCost(Math.max(-3, Math.min(3, char.characteristics[c] ?? 0))), 0);

  // ---------------------------------------------------------------- ability access
  const access = { types: new Set<AbilityType>(['General']), abilities: new Set<string>(), notes: [] as string[] };
  for (const a of eff('abilityAccess')) {
    const chosen = a.param && ['Martial', 'Academic', 'Arcane'].includes(a.param) ? [a.param as AbilityType] : a.abilityTypes;
    for (const t of chosen ?? []) access.types.add(t);
    for (const ab of a.abilities ?? []) access.abilities.add(ab);
    if (a.note) access.notes.push(`${a.fromName}: ${a.note}`);
    if (a.fromName.startsWith('Student of') && a.param) access.abilities.add(`${a.param.toLowerCase()}-lore`.replace('divine-lore', 'dominion-lore'));
  }
  for (const g of eff('grantAbility')) access.abilities.add(g.ability);
  if (isMagus) {
    // magi may buy Academic/Arcane/Martial during & after apprenticeship
    notes.push('Magi may buy Academic, Arcane, and Martial Abilities during and after apprenticeship.');
  }

  // ---------------------------------------------------------------- abilities
  const abilityBonus = (id: string, param?: string) =>
    eff('abilityBonus').filter((e) => e.ability === id || (param && e.ability === `${id}:${param}`)).reduce((s, e) => s + (e.fromName.startsWith('Puissant') ? rules.puissantAbilityBonus : e.amount), 0);
  const hasAffinity = (id: string, param?: string) =>
    eff('abilityAffinity').some((e) => e.ability === id || (param && e.ability === `${id}:${param}`));
  const capBonus = (id: string) => eff('abilityCapBonus').filter((e) => e.ability === id).reduce((s, e) => s + e.amount, 0);
  const linguist = eff('languageAffinity')[0];
  const ageCap = abilityCapForAge(char.age);

  const granted = new Map<string, number>();
  for (const g of eff('grantAbility')) granted.set(g.ability, Math.max(granted.get(g.ability) ?? 0, g.score));

  const abilities: DerivedAbility[] = char.abilities.map((ab) => deriveAbility(ab));
  function deriveAbility(ab: CharAbility): DerivedAbility {
    const def = data.abilityById.get(ab.abilityId);
    const affinity = hasAffinity(ab.abilityId, ab.param);
    let mult = affinity ? rules.affinityMultiplier : 1;
    if (linguist && isLanguageAbility(ab.abilityId)) mult += linguist.multiplier - 1;
    let exp = effectiveXp(ab.xp, mult);
    let score = abilityScoreFromXp(exp);
    const ov = char.overrides[`ability:${ab.uid}`];
    if (ov !== undefined) {
      score = ov;
      exp = Math.max(exp, (5 * ov * (ov + 1)) / 2);
    }
    const bonus = abilityBonus(ab.abilityId, ab.param);
    return {
      uid: ab.uid,
      abilityId: ab.abilityId,
      def,
      name: abilityDisplayName(ab, data),
      type: abilityTypeOf(data, ab.abilityId),
      restricted: def?.restricted ?? false,
      specialty: ab.specialty,
      xp: ab.xp,
      effectiveXp: exp,
      score,
      remainder: ov !== undefined ? 0 : abilityXpRemainder(exp),
      bonus,
      total: score + bonus,
      affinity,
      cap: ageCap + capBonus(ab.abilityId),
      granted: granted.get(ab.abilityId) ?? 0,
    };
  }
  const abilityByUid = new Map(abilities.map((a) => [a.uid, a]));

  // ---------------------------------------------------------------- arts
  const artAffinity = (a: Art) => eff('artAffinity').some((e) => e.art === a);
  const artPuissant = (a: Art) => eff('artBonus').filter((e) => e.art === a).reduce((s, e) => s + (e.fromName.startsWith('Puissant') ? rules.puissantArtBonus : e.amount), 0);
  const deficiency = (a: Art): DerivedArt['deficient'] => {
    const d = eff('deficientArt').find((e) => e.art === a);
    return d ? d.scope : 'none';
  };
  const elemental = eff('elementalMagic').length > 0;
  const ELEMENTS: Art[] = ['Aq', 'Au', 'Ig', 'Te'];
  const elementalBonus: Partial<Record<Art, number>> = {};
  if (elemental) {
    for (const x of ELEMENTS) {
      let bonus = 0;
      for (const y of ELEMENTS) {
        if (y === x) continue;
        const creationXp = sumAlloc(char.arts[y] ?? {}, (s) => s === 'apprenticeship' || s === 'postGauntlet');
        bonus += Math.ceil(creationXp / 2);
      }
      elementalBonus[x] = bonus;
    }
  }
  const arts = {} as Record<Art, DerivedArt>;
  for (const a of ARTS) {
    const xp = char.arts[a] ?? {};
    const affinity = artAffinity(a);
    let exp = effectiveXp(xp, affinity ? rules.affinityMultiplier : 1) + (elementalBonus[a] ?? 0);
    let score = artScoreFromXp(exp);
    const ov = char.overrides[`art:${a}`];
    if (ov !== undefined) {
      score = ov;
      exp = Math.max(exp, (ov * (ov + 1)) / 2);
    }
    const puissant = artPuissant(a);
    arts[a] = {
      art: a, xp, effectiveXp: exp, score, remainder: ov !== undefined ? 0 : artXpRemainder(exp), puissant,
      value: score + puissant, deficient: deficiency(a), affinity, elementalBonus: elementalBonus[a] ?? 0,
    };
  }

  // ---------------------------------------------------------------- budgets
  const laterLifeYears = isMagus ? Math.max(0, char.creation.apprenticeshipStartAge - 5) : Math.max(0, char.age - 5);
  let rate = rules.laterLifeXpPerYear;
  for (const l of eff('laterLifeXpPerYear')) rate = l.amount === 20 ? rules.wealthyXpPerYear : l.amount === 10 ? rules.poorXpPerYear : l.amount;
  if (has('savantism-flaw')) rate = Math.floor(rate / 2);

  const spentBy = (src: XpSource) => {
    let t = 0;
    for (const ab of char.abilities) t += ab.xp[src] ?? 0;
    for (const a of ARTS) t += char.arts[a]?.[src] ?? 0;
    for (const s of char.spells) t += s.masteryXp[src] ?? 0;
    return t;
  };
  const budgets: XpBudget[] = [];
  budgets.push({ id: 'native', label: 'Native Language', total: rules.nativeLanguageXp, spent: spentBy('native'), allows: 'Your native language only', kind: 'ability' });
  budgets.push({ id: 'childhood', label: 'Early Childhood', total: rules.childhoodXp, spent: spentBy('childhood'), allows: 'Area Lore, Athletics, Awareness, Brawl, Charm, Folk Ken, Guile, a second Living Language, Stealth, Survival, Swim', kind: 'ability', abilities: CHILDHOOD_ABILITIES });
  budgets.push({ id: 'laterLife', label: `Later Life (${laterLifeYears} yrs × ${rate})`, total: laterLifeYears * rate, spent: spentBy('laterLife'), allows: 'Any Ability your Virtues allow', kind: 'ability' });
  for (const p of eff('xpPool')) {
    const id = `pool:${p.fromUid}` as XpSource;
    budgets.push({ id, label: p.label, total: p.amount, spent: spentBy(id), allows: describePool(p, data), kind: p.arts ? 'art+ability' : 'ability', abilityTypes: p.abilityTypes, abilities: p.abilities, arts: p.arts });
  }
  for (const p of char.creation.extraPools) {
    const id = `pool:${p.uid}` as XpSource;
    budgets.push({ id, label: p.label, total: p.amount, spent: spentBy(id), allows: p.abilityTypes?.join(', ') ?? 'As agreed with the troupe', kind: 'ability', abilityTypes: p.abilityTypes });
  }
  let apprenticeshipSpellLevelBudget = 0;
  const redcapTotal = eff('apprenticeshipTotalXp')[0];
  if (isMagus || redcapTotal) {
    const total = redcapTotal ? redcapTotal.amount : rules.apprenticeshipXp + eff('apprenticeXp').reduce((s, e) => s + e.amount, 0);
    apprenticeshipSpellLevelBudget = isMagus ? rules.apprenticeshipSpellLevels + eff('apprenticeSpellLevels').reduce((s, e) => s + e.amount, 0) : 0;
    const spellsSpent = char.spells.filter((s) => s.source === 'apprenticeship').reduce((t, s) => t + (s.spell.level ?? 0), 0);
    budgets.push({
      id: 'apprenticeship', label: redcapTotal ? 'Redcap Apprenticeship (15 yrs)' : `Apprenticeship (${rules.apprenticeshipYears} yrs)`,
      total: total * (has('savantism-flaw') ? 0.5 : 1), spent: spentBy('apprenticeship'),
      spellLevels: isMagus ? { total: apprenticeshipSpellLevelBudget, spent: spellsSpent } : undefined,
      allows: isMagus ? 'Hermetic Arts and any non-Supernatural Abilities (Supernatural only with the relevant Virtue)' : 'Academic, Arcane, Martial and General Abilities',
      kind: isMagus ? 'art+ability' : 'ability',
    });
  }
  if (isMagus && char.creation.yearsPostGauntlet > 0) {
    const total = char.creation.yearsPostGauntlet * rules.postGauntletPointsPerYear - char.creation.postGauntletLabSeasons * rules.postGauntletLabSeasonCost;
    const spellsSpent = char.spells.filter((s) => s.source === 'postGauntlet').reduce((t, s) => t + (s.spell.level ?? 0), 0);
    budgets.push({
      id: 'postGauntlet', label: `After Gauntlet (${char.creation.yearsPostGauntlet} yrs × ${rules.postGauntletPointsPerYear})`,
      total: Math.max(0, total), spent: spentBy('postGauntlet') + spellsSpent,
      allows: 'Experience in Arts or Abilities, or levels of spells (1 point each). Each season of lab work costs 10 points.',
      kind: 'mixed',
    });
  }
  const masteryPools = eff('masteryXp').map((m) => ({ uid: m.fromUid, label: m.fromName, total: m.amount }));
  for (const mp of masteryPools) {
    budgets.push({ id: `pool:${mp.uid}` as XpSource, label: `${mp.label} (spell mastery)`, total: mp.total, spent: spentBy(`pool:${mp.uid}` as XpSource), allows: 'Spell Mastery of spells you know', kind: 'ability' });
  }

  // ---------------------------------------------------------------- confidence, reputations
  let confidence = char.type === 'grog' ? { score: 0, points: 0 } : { score: rules.startingConfidenceScore, points: rules.startingConfidencePoints };
  for (const c of eff('confidence')) confidence = { score: c.score ?? confidence.score, points: c.points ?? confidence.points };
  if (char.creation.finalized || char.confidence.score || char.confidence.points) {
    if (char.creation.finalized) confidence = { ...char.confidence };
  }
  const reputations = [
    ...eff('reputation').map((r) => ({ text: r.label + (r.kind === 'bad' ? ' (bad)' : ''), scope: r.scope ?? 'General', score: r.score, fromVirtue: r.fromName })),
    ...char.reputations.map((r) => ({ text: r.text, scope: r.scope, score: r.score })),
  ];

  // ---------------------------------------------------------------- warping, aging
  const warpingPoints = char.warpingPoints + (char.creation.finalized ? 0 : eff('warpingPoints').reduce((s, e) => s + e.amount, 0));
  const warpingScore = warpingScoreFromPoints(warpingPoints);
  const decrepitude = warpingScoreFromPoints(char.decrepitudePoints);
  const livingConditionsMod = eff('livingConditions').reduce((s, e) => s + e.amount, 0);
  const agingRollMod = eff('agingRoll').reduce((s, e) => s + e.amount, 0);

  // ---------------------------------------------------------------- combat & body
  const sta = characteristics.Sta.value;
  const str = characteristics.Str.value;
  let armorProt = 0;
  let load = 0;
  if (char.equipment.armorId && char.equipment.armorCoverage !== 'none') {
    const a = data.armorById.get(char.equipment.armorId);
    if (a) {
      const full = char.equipment.armorCoverage === 'full' && a.fullProt !== null;
      armorProt = (full ? a.fullProt : a.partialProt) ?? 0;
      load += (full ? a.fullLoad : a.partialLoad) ?? 0;
    }
  }
  for (const w of char.equipment.weapons) {
    load += data.weaponById.get(w.weaponId)?.load ?? 0;
    if (w.shieldId) load += data.weaponById.get(w.shieldId)?.load ?? 0;
  }
  const burden = burdenFromLoad(load);
  const encumbrance = str > 0 ? Math.max(0, burden - str) : burden;
  const bronze = char.familiar?.bronze ?? 0;
  let soak = sta + armorProt + eff('soak').reduce((s, e) => s + e.amount, 0) + bronze;
  if (char.overrides.soak !== undefined) soak = char.overrides.soak;
  const woundPenaltyAdj = eff('woundPenalty').reduce((s, e) => s + e.amount, 0);
  const fatiguePenaltyAdj = eff('fatiguePenalty').reduce((s, e) => s + e.amount, 0);
  const inc = 5 + size;
  const step = Math.max(1, inc);
  const woundRanges = size <= -4
    ? { light: [1, 1] as [number, number], medium: [2, 2] as [number, number], heavy: [3, 3] as [number, number], incap: [4, 4] as [number, number], dead: 5 }
    : { light: [1, step] as [number, number], medium: [step + 1, 2 * step] as [number, number], heavy: [2 * step + 1, 3 * step] as [number, number], incap: [3 * step + 1, 4 * step] as [number, number], dead: 4 * step + 1 };
  const adjF = (p: number) => (p === 0 ? 0 : Math.min(0, p - fatiguePenaltyAdj));
  const fatigueLevels = [
    { name: 'Fresh', penalty: 0 },
    { name: 'Winded', penalty: 0 },
    { name: 'Weary', penalty: adjF(-1) },
    { name: 'Tired', penalty: adjF(-3) },
    { name: 'Dazed', penalty: adjF(-5) },
    { name: 'Unconscious', penalty: null },
  ];
  const w = char.wounds;
  const rawWound = -(w.light * 1 + w.medium * 3 + w.heavy * 5);
  const currentWoundPenalty = rawWound === 0 ? 0 : Math.min(0, rawWound - woundPenaltyAdj);
  const lost = Math.min(5, char.fatigueLost + char.longTermFatigueLost);
  const currentFatiguePenalty = fatigueLevels[lost]?.penalty ?? 0;

  // ---------------------------------------------------------------- magic flags
  const focus = eff('magicalFocus')[0];
  const focusVirtue = focus ? virtues.find((v) => v.cv.uid === focus.fromUid) : undefined;
  const socialPenalty = giftType === 'blatant' ? -6 : giftType === 'normal' || giftType === 'suppressed' ? -3 : 0;

  return {
    char, virtues, effects, hasGift, giftType, isMagus, tally, size, characteristics, charPointsBudget, charPointsSpent,
    abilities, abilityByUid, arts, budgets, abilityAccess: access, laterLifeYears, ageCap, confidence, reputations,
    warpingScore, warpingPoints, decrepitude, livingConditionsMod, agingRollMod, soak, woundPenaltyAdj, fatiguePenaltyAdj,
    load, burden, encumbrance, woundRanges, fatigueLevels, currentWoundPenalty, currentFatiguePenalty,
    apprenticeshipSpellLevelBudget, masteryPools, flawless: eff('flawlessMagic').length > 0,
    magicalFocus: focus ? focus.scope : 'none', focusText: focusVirtue?.cv.param, socialPenalty, notes,
  };
}

function describePool(p: Extract<Effect, { type: 'xpPool' }>, data: GameData): string {
  const parts: string[] = [];
  if (p.abilityTypes?.length) parts.push(p.abilityTypes.join('/') + ' Abilities');
  if (p.abilities?.length) {
    parts.push(
      p.abilities
        .map((a) => data.abilityById.get(a)?.name ?? a.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()))
        .join(', '),
    );
  }
  if (p.arts) parts.push('Hermetic Arts');
  return parts.join('; ') || 'Any';
}

/** Can the ability instance take xp from a given budget? Returns a reason when not. */
export function canSpend(
  d: DerivedCharacter,
  data: GameData,
  budget: XpBudget,
  ab: { abilityId: string; param?: string; native?: boolean },
): { ok: boolean; reason?: string } {
  const type = abilityTypeOf(data, ab.abilityId);
  const id = ab.abilityId;
  if (budget.id === 'native') return ab.native ? { ok: true } : { ok: false, reason: 'Only your native language' };
  if (budget.id === 'childhood') {
    if (ab.native) return { ok: false, reason: 'Native language uses its own 75 xp' };
    return CHILDHOOD_ABILITIES.includes(id) ? { ok: true } : { ok: false, reason: 'Not a childhood Ability' };
  }
  if (budget.abilities || budget.abilityTypes) {
    const byId = budget.abilities?.some((r) => abilityMatches(r, id, ab.param)) ?? false;
    const byType = budget.abilityTypes?.includes(type) ?? false;
    return byId || byType ? { ok: true } : { ok: false, reason: `Not allowed by ${budget.label}` };
  }
  const supernaturalOk = type !== 'Supernatural' || d.abilityAccess.abilities.has(id) || (d.hasGift && !d.isMagus);
  if (budget.id === 'apprenticeship' || budget.id === 'postGauntlet') {
    if (!supernaturalOk) return { ok: false, reason: 'Supernatural Abilities need the Virtue that grants them' };
    return { ok: true };
  }
  // later life / generic
  if (type === 'General') return { ok: true };
  if (d.abilityAccess.abilities.has(id)) return { ok: true };
  if (type === 'Supernatural') return supernaturalOk ? { ok: true } : { ok: false, reason: 'Requires the Virtue granting this Supernatural Ability' };
  if (d.abilityAccess.types.has(type)) return { ok: true };
  // languages: dead languages are Academic, living are General
  return { ok: false, reason: `${type} Abilities require a Virtue (e.g. ${type === 'Academic' ? 'Educated' : type === 'Martial' ? 'Warrior' : 'Arcane Lore'})` };
}

export function isParameterized(abilityId: string): boolean {
  return abilityId in PARAMETERIZED_ABILITIES;
}

export function artIsTechnique(a: Art) {
  return isTechnique(a);
}
export function artIsForm(a: Art) {
  return isForm(a);
}
