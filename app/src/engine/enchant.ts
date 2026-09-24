// Enchanted devices, talismans, charged items, Longevity Rituals and familiars (DE Chapter 8).

export const MATERIAL_BASE: Record<string, number> = {
  'cloth': 1, 'glass': 1, 'wood': 2, 'leather': 2, 'bone': 3, 'soft stone': 3, 'hard stone': 4,
  'base metal': 5, 'silver': 6, 'gold': 10, 'semi-precious gem': 12, 'precious gem': 15, 'priceless gem': 20,
};

export const SIZE_MULT: Record<string, { mult: number; example: string }> = {
  tiny: { mult: 1, example: 'ring, bracelet, pendant, any gem' },
  small: { mult: 2, example: 'wand, dagger, belt, cap' },
  medium: { mult: 3, example: 'sword, tunic, boots, skull' },
  large: { mult: 4, example: 'staff, shield, cloak, skeleton' },
  huge: { mult: 5, example: 'boat, wagon, human body, small room' },
};

export function openingCost(material: string, size: string): number {
  return (MATERIAL_BASE[material] ?? 0) * (SIZE_MULT[size]?.mult ?? 1);
}

export const FREQUENCY: { label: string; value: string; mod: number }[] = [
  { label: '1 use per day', value: '1', mod: 0 },
  { label: '2 uses per day', value: '2', mod: 1 },
  { label: '3 uses per day', value: '3', mod: 2 },
  { label: '6 uses per day', value: '6', mod: 3 },
  { label: '12 uses per day', value: '12', mod: 4 },
  { label: '24 uses per day', value: '24', mod: 5 },
  { label: '50 uses per day', value: '50', mod: 6 },
  { label: 'Unlimited', value: 'unlimited', mod: 10 },
];

export interface EffectModsInput {
  baseLevel: number; // effect level (as designed like a spell)
  usesPerDay: string;
  penetration: number;
  concentration: boolean;
  effectUse: boolean;
  environmentalTrigger: boolean;
  fastTrigger: boolean;
  linkedTrigger: boolean;
  weakMagic?: boolean; // halves penetration benefit
}

export function modifiedEffectLevel(i: EffectModsInput): { level: number; parts: { label: string; value: number }[] } {
  const parts: { label: string; value: number }[] = [{ label: 'Effect level', value: i.baseLevel }];
  const freq = FREQUENCY.find((f) => f.value === i.usesPerDay)?.mod ?? 0;
  if (freq) parts.push({ label: `Uses per day (${i.usesPerDay})`, value: freq });
  if (i.penetration > 0) {
    const perLevel = i.weakMagic ? 1 : 2;
    parts.push({ label: `Penetration +${i.penetration}`, value: Math.ceil(i.penetration / perLevel) });
  }
  if (i.concentration) parts.push({ label: 'Maintains concentration', value: 5 });
  if (i.effectUse) parts.push({ label: 'Restricted use', value: 3 });
  if (i.environmentalTrigger) parts.push({ label: 'Environmental trigger', value: 3 });
  if (i.fastTrigger) parts.push({ label: 'Fast trigger (+3 Init)', value: 5 });
  if (i.linkedTrigger) parts.push({ label: 'Linked trigger', value: 3 });
  return { level: parts.reduce((s, p) => s + p.value, 0), parts };
}

export const EXPIRY_MULT: Record<string, number> = { none: 1, '1': 10, '7': 5, '70': 2 };

export interface InvestResult {
  possible: boolean;
  seasons: number;
  vis: number;
  pointsPerSeason: number;
  reason?: string;
}

export function investEffect(labTotal: number, modLevel: number, kind: 'invested' | 'lesser' | 'talisman', expiry: string = 'none'): InvestResult {
  const vis = Math.ceil(modLevel / 10);
  if (kind === 'lesser') {
    const ok = labTotal >= 2 * modLevel;
    return { possible: ok, seasons: ok ? 1 : Infinity, vis, pointsPerSeason: labTotal - modLevel, reason: ok ? undefined : 'A lesser enchantment needs a Lab Total of at least twice the modified level.' };
  }
  const excess = labTotal - modLevel;
  if (excess <= 0) return { possible: false, seasons: Infinity, vis, pointsPerSeason: 0, reason: 'Lab Total must exceed the modified effect level.' };
  const per = excess * (EXPIRY_MULT[expiry] ?? 1);
  return { possible: true, seasons: Math.ceil(modLevel / per), vis, pointsPerSeason: per };
}

/** Charged items: one charge per 5 points (or fraction) of excess; exactly equal gives one. */
export function chargedItemCharges(labTotal: number, level: number, fromText = false): number {
  if (fromText) return Math.ceil(labTotal / 5);
  if (labTotal < level) return 0;
  if (labTotal === level) return 1;
  return Math.ceil((labTotal - level) / 5);
}

export function talismanCapacity(highestTechnique: number, highestForm: number): number {
  return highestTechnique + highestForm;
}

/** Vis a magus can use in one season: Magic Theory × 2 (Faerie Magic: (MT + FM) × 2 for faerie vis). */
export function visLimit(magicTheory: number, faerieMagic = 0, allFaerieVis = false): number {
  return (magicTheory + (allFaerieVis ? faerieMagic : 0)) * 2;
}

// ------------------------------------------------------------------ Longevity Ritual

export function longevityBonus(labTotal: number, extraVis: number, forMundane: boolean): number {
  const t = labTotal + extraVis;
  return forMundane ? Math.ceil(t / 10) : Math.ceil(t / 5);
}

export function longevityVisCost(age: number, extraVis = 0): number {
  return Math.ceil(age / 5) + extraVis;
}

// ------------------------------------------------------------------ Familiars

export const CORD_COST = [0, 5, 15, 30, 50, 75];

export function familiarBindingLevel(might: number, size: number): number {
  return 25 + might + 5 * size;
}

export function familiarBindingVis(labTotal: number): number {
  return Math.ceil(labTotal / 5);
}

export function cordPointsCost(golden: number, silver: number, bronze: number): number {
  return CORD_COST[golden] + CORD_COST[silver] + CORD_COST[bronze];
}

export function familiarPowerBonus(matches: 'none' | 'one' | 'both'): number {
  return matches === 'both' ? 10 : matches === 'one' ? 5 : 0;
}

// ------------------------------------------------------------------ Lab texts, books

export function labTextWritingLevels(latin: number): number {
  return latin * 20;
}
export function labTextCopyLevels(scribe: number): number {
  return scribe * 60;
}

export interface SummaPlan {
  maxLevel: number;
  quality: number;
  seasons: number;
  pointsNeeded: number;
  perSeason: number;
}

/** Writing a summa (DE p.379). */
export function planSumma(o: { isArt: boolean; score: number; level: number; com: number; language: number; qualityBonus: number }): SummaPlan {
  const maxLevel = Math.floor(o.score / 2);
  const level = Math.min(o.level, maxLevel);
  const base = o.com + 6 + o.qualityBonus;
  const drop = maxLevel - level;
  const bonus = Math.min(base, drop * (o.isArt ? 1 : 3));
  const quality = base + bonus;
  const pointsNeeded = o.isArt ? level : level * 5;
  const perSeason = Math.max(1, o.com + o.language);
  return { maxLevel, quality, pointsNeeded, perSeason, seasons: Math.ceil(pointsNeeded / perSeason) };
}

export function tractatusQuality(com: number, qualityBonus: number): number {
  return com + 6 + qualityBonus;
}

export function maxTractatus(isArt: boolean, score: number): number {
  return isArt ? Math.ceil(score / 5) : Math.ceil(score / 2);
}
