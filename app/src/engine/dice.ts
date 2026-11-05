// Ars Magica dice: simple die (1-10), stress die (1 → double & reroll, 0 → possible botch).

export type Rng = () => number;
export const defaultRng: Rng = () => Math.random();

export function d10(rng: Rng = defaultRng): number {
  return Math.floor(rng() * 10); // 0..9 where 0 represents "0"
}

export interface SimpleResult {
  kind: 'simple';
  face: number;
  value: number; // 1..10
}

export interface StressResult {
  kind: 'stress';
  faces: number[];
  value: number;
  multiplier: number;
  zero: boolean;
  botchDice: number;
  botchFaces: number[];
  botches: number;
  exploded: boolean;
}

export function simpleDie(rng: Rng = defaultRng): SimpleResult {
  const f = d10(rng);
  return { kind: 'simple', face: f, value: f === 0 ? 10 : f };
}

/**
 * Stress die (DE p.7): roll; on 1, reroll and double (repeat); on 0 roll botch dice
 * (a 0 on any botch die is a botch); otherwise the face value (0 counts as 0).
 */
export function stressDie(botchDice: number, rng: Rng = defaultRng, noBotch = false): StressResult {
  const faces: number[] = [];
  let mult = 1;
  let f = d10(rng);
  faces.push(f);
  if (f === 0) {
    if (noBotch) return { kind: 'stress', faces, value: 0, multiplier: 1, zero: true, botchDice: 0, botchFaces: [], botches: 0, exploded: false };
    const n = Math.max(0, botchDice);
    const bf: number[] = [];
    for (let i = 0; i < n; i++) bf.push(d10(rng));
    const botches = bf.filter((x) => x === 0).length;
    return { kind: 'stress', faces, value: 0, multiplier: 1, zero: true, botchDice: n, botchFaces: bf, botches, exploded: false };
  }
  let exploded = false;
  while (f === 1) {
    exploded = true;
    mult *= 2;
    f = d10(rng);
    faces.push(f);
  }
  const face = f === 0 ? 10 : f;
  return { kind: 'stress', faces, value: face * mult, multiplier: mult, zero: false, botchDice: 0, botchFaces: [], botches: 0, exploded };
}

export function describeStress(r: StressResult): string {
  if (r.zero) return r.botchDice === 0 ? '0 (no botch dice)' : r.botches ? `BOTCH ×${r.botches} (${r.botchFaces.join(',')})` : `0, no botch (${r.botchFaces.join(',')})`;
  if (r.exploded) return `${r.value} (${r.faces.join('→')}, ×${r.multiplier})`;
  return String(r.value);
}

// ------------------------------------------------------------------ the chance of a roll

/** The chance that a simple die (1-10) plus this total reaches the Ease Factor. */
export function simpleChance(total: number, ease: number): number {
  const need = Math.max(1, ease - total);
  return Math.max(0, Math.min(1, (11 - need) / 10));
}

/** The chance that a stress die plus this total reaches the Ease Factor, and of a botch on a 0 with these botch dice. */
export function stressChance(total: number, ease: number, botchDice = 1): { chance: number; botch: number } {
  const need = ease - total;
  // after a 1: roll again and double; each further 1 doubles again (a 0 after a 1 counts as 10)
  const after = (m: number, depth: number): number => {
    if (depth > 10) return 0;
    let p = 0;
    for (const g of [2, 3, 4, 5, 6, 7, 8, 9, 10]) if (m * g >= need) p += 0.1;
    return p + 0.1 * after(m * 2, depth + 1);
  };
  let p = need <= 0 ? 0.1 : 0;
  for (const f of [2, 3, 4, 5, 6, 7, 8, 9]) if (f >= need) p += 0.1;
  p += 0.1 * after(2, 0);
  return { chance: Math.max(0, Math.min(1, p)), botch: botchDice > 0 ? 0.1 * (1 - 0.9 ** botchDice) : 0 };
}

/** The chance that one side's simple die plus total beats (not ties) the other's. */
export function contestChance(mine: number, theirs: number): number {
  let wins = 0;
  for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) if (a + mine > b + theirs) wins++;
  return wins / 100;
}

/** A chance as a percentage for the page: "60%", "under 1%", "certain". */
export function pct(p: number): string {
  if (p >= 0.995) return 'certain';
  if (p <= 0) return 'no chance';
  if (p < 0.01) return 'under 1%';
  return `${Math.round(p * 100)}%`;
}

/** A stress die's values and their chances (one botch die on a 0: a botch is −Infinity), for working out contests. */
function stressDistribution(botchDice = 1): Map<number, number> {
  const out = new Map<number, number>();
  const add = (v: number, p: number) => out.set(v, (out.get(v) ?? 0) + p);
  const botch = botchDice > 0 ? 1 - 0.9 ** botchDice : 0;
  add(-Infinity, 0.1 * botch);
  add(0, 0.1 * (1 - botch));
  for (const f of [2, 3, 4, 5, 6, 7, 8, 9]) add(f, 0.1);
  const after = (m: number, p: number, depth: number) => {
    for (const g of [2, 3, 4, 5, 6, 7, 8, 9, 10]) add(m * g, p * 0.1);
    if (depth < 8) after(m * 2, p * 0.1, depth + 1);
  };
  after(2, 0.1, 0);
  return out;
}

/** The chance that one side's stress die plus total beats (not ties) the other's; a botch loses, or for the other side counts as a 0 when asked. */
export function stressContestChance(mine: number, theirs: number, botchDice = 1, theirBotch: 'loses' | 'zero' = 'loses'): number {
  const dist = [...stressDistribution(botchDice)];
  let p = 0;
  for (const [a, pa] of dist) for (const [b, pb] of dist) if (a + mine > (b === -Infinity && theirBotch === 'zero' ? 0 : b) + theirs) p += pa * pb;
  return Math.max(0, Math.min(1, p));
}
