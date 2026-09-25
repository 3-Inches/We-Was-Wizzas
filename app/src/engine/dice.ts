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
