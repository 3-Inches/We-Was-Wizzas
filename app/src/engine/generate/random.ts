// Seeded randomness for the generators: the same seed gives the same result, so a character can be
// rolled again, a covenant's folk regenerated, and a test reproduce exactly what failed.

import type { Rng } from '../dice';

/** A seeded generator (mulberry32): numbers in [0, 1). */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh seed, for a new roll. */
export function newSeed(): number {
  return Math.floor(Math.random() * 1e9);
}

export function pick<T>(rng: Rng, xs: readonly T[]): T {
  return xs[Math.floor(rng() * xs.length)];
}

/** A whole number from min to max inclusive. */
export function between(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function chance(rng: Rng, p: number): boolean {
  return rng() < p;
}

/** Up to n different items, in random order. */
export function sample<T>(rng: Rng, xs: readonly T[], n: number): T[] {
  const pool = [...xs];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}
