// Long play: a generated saga (testing/sagaFixture) left to the clock for years at a time, checked
// every season for what should never happen: numbers that are not numbers, vis below nothing, a
// covenant or character that no longer derives, auras outside 0 to 10, characters who do not age.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { deriveCovenant } from './covenant';
import { deriveCharacter } from './character/derive';
import { seeded } from './generate/random';
import { buildTestSaga } from './testing/sagaFixture';
import { advanceSeason, DEFAULT_ADVANCE } from './time';
import { DEFAULT_HOUSE_RULES } from './types';

const data = buildGameData();

/** Paths to numbers that are not finite. */
function nonFinite(o: unknown, path: string, out: string[]): string[] {
  if (typeof o === 'number') {
    if (!Number.isFinite(o)) out.push(`${path} = ${o}`);
  } else if (Array.isArray(o)) o.forEach((x, i) => nonFinite(x, `${path}[${i}]`, out));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) nonFinite(v, `${path}.${k}`, out);
  return out;
}

describe('long play on a generated saga', () => {
  for (const [seed, tribunal, years, living] of [[1, 'Rhine', 12, []], [2, 'Theban', 12, []], [3, 'Rhine', 10, ['heorot', 'triamore', 'dankmar']]] as const) {
    it(`runs ${years} years in the ${tribunal} Tribunal (seed ${seed})${living.length ? ' with living covenants' : ''} without breaking`, () => {
      let state = buildTestSaga(data, { seed, tribunal, living: [...living] });
      const rng = seeded(seed);
      const problems: string[] = [];
      const firstAge = new Map(state.characters.map((c) => [c.id, c.age]));
      for (let s = 0; s < years * 4 && problems.length < 20; s++) {
        const r = advanceSeason(state, data, { ...DEFAULT_ADVANCE, rng });
        state = r.state;
        const when = `${r.report.season} ${r.report.year}`;
        for (const l of r.report.lines) if (/undefined|NaN|\[object Object\]|Infinity/.test(l.text)) problems.push(`${when} ${l.who}: ${l.text.slice(0, 200)}`);
        const bad = [...nonFinite(state.characters, 'characters', []), ...nonFinite(state.covenants, 'covenants', [])];
        if (bad.length) problems.push(`${when}: ${bad.slice(0, 5).join('; ')}`);
        for (const cov of state.covenants) {
          for (const v of cov.visStocks) if (v.pawns < 0 || !Number.isInteger(v.pawns)) problems.push(`${when}: ${cov.name} vis ${v.art} ${v.pawns}`);
          if (cov.aura < 0 || cov.aura > 10) problems.push(`${when}: ${cov.name} aura ${cov.aura}`);
          for (const lab of cov.labs) if (lab.refinement < 0) problems.push(`${when}: ${lab.name} Refinement ${lab.refinement}`);
          try {
            deriveCovenant(cov, data, state.characters);
          } catch (e) {
            problems.push(`${when}: deriving ${cov.name} threw ${(e as Error).message}`);
          }
        }
        for (const c of state.characters) {
          for (const v of c.purse?.vis ?? []) if (v.pawns < 0) problems.push(`${when}: ${c.name} purse vis ${v.art} ${v.pawns}`);
          if (c.seasonLog.filter((e) => e.year === r.report.year && e.season === r.report.season && !e.extra).length > 1) problems.push(`${when}: ${c.name} logged the season twice`);
          try {
            const d = deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
            nonFinite({ soak: d.soak, arts: d.arts }, c.name, problems);
          } catch (e) {
            problems.push(`${when}: deriving ${c.name} threw ${(e as Error).message}`);
          }
        }
      }
      for (const c of state.characters) {
        // a magus who joined a living covenant in play is younger in the saga
        if (!firstAge.has(c.id)) continue;
        const aged = c.age - (firstAge.get(c.id) ?? c.age);
        if (!c.wounds.dead && !c.creature?.magicCharacter && aged !== years) problems.push(`${c.name} aged ${aged} in ${years} years`);
      }
      expect(problems).toEqual([]);
      // the work in hand got done: the lab set in order and its Cramped Flaw put right, the spells from the texts learned, the abbey's Dominion grown to 5
      const [main, abbey] = state.covenants;
      const [m1, , m3] = state.characters.filter((c) => c.type === 'magus');
      expect(m3.projects?.find((p) => p.kind === 'refine')?.done).toBe(true);
      expect(main.labs[2].virtues.some((v) => v.defId === 'cramped-flaw')).toBe(false);
      expect(m1.projects?.filter((p) => p.fromText).every((p) => p.done)).toBe(true);
      expect(abbey.aura).toBe(5);
    }, 120_000);
  }
});
