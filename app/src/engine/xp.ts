// Experience point tables (DE p.49 / p.375).
// Arts: score n costs n(n+1)/2 xp. Abilities: 5 × n(n+1)/2 xp.

export function artXpForScore(score: number): number {
  return (score * (score + 1)) / 2;
}

export function abilityXpForScore(score: number): number {
  return (5 * score * (score + 1)) / 2;
}

export function artScoreFromXp(xp: number): number {
  if (xp <= 0) return 0;
  // largest n with n(n+1)/2 <= xp
  let n = Math.floor((Math.sqrt(8 * xp + 1) - 1) / 2);
  while (artXpForScore(n + 1) <= xp) n++;
  while (n > 0 && artXpForScore(n) > xp) n--;
  return n;
}

export function abilityScoreFromXp(xp: number): number {
  return artScoreFromXp(Math.floor(xp / 5));
}

/** Experience towards the next score, e.g. "Perdo 10 (1)" means 1 xp past 10. */
export function artXpRemainder(xp: number): number {
  return xp - artXpForScore(artScoreFromXp(xp));
}

export function abilityXpRemainder(xp: number): number {
  return xp - abilityXpForScore(abilityScoreFromXp(xp));
}

/** Warping score from points: like an Ability (5 × triangular). Decrepitude is the same. */
export const warpingScoreFromPoints = abilityScoreFromXp;
export const warpingPointsForScore = abilityXpForScore;

/** Affinity: "increased by one half, rounded up". */
export function withAffinity(xp: number, multiplier = 1.5): number {
  return Math.ceil(xp * multiplier);
}

/** Inverse of withAffinity: minimum raw xp needed to reach `effective` xp. */
export function rawXpForEffective(effective: number, multiplier = 1.5): number {
  let raw = Math.floor(effective / multiplier);
  while (withAffinity(raw, multiplier) < effective) raw++;
  return raw;
}

/** Prevailing Loyalty / Reputation: points → score using the Ability table. */
export function scoreFromPointsSigned(points: number): number {
  const s = abilityScoreFromXp(Math.abs(points));
  return points < 0 ? -s : s;
}
