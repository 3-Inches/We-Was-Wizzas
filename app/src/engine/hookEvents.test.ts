import { describe, expect, it } from 'vitest';
import { fromSeasonIndex, hooksComeDue, isDue, keepHalf, randomDue, rollFlawedStory, settleFlawedStory } from './hookEvents';
import { seasonIndex } from './effects';
import { newCovenant } from './covenant';
import type { CovenantHookBoon } from './types';

const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};

describe('Hooks that come due', () => {
  it('picks a time within five years, and reads a season index back', () => {
    for (const r of [0, 0.5, 0.999]) {
      const d = randomDue({ year: 1220, season: 'Spring' }, () => r);
      const i = seasonIndex(d.year, d.season) - seasonIndex(1220, 'Spring');
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(20);
    }
    expect(fromSeasonIndex(seasonIndex(1223, 'Autumn'))).toEqual({ year: 1223, season: 'Autumn' });
  });

  it('strikes a Natural Disaster when its season begins, and reminds of a Flawed Resource', () => {
    const cov = newCovenant('s', 1220);
    const disaster: CovenantHookBoon = { uid: 'd', name: 'Natural Disaster', kind: 'hook', size: 'Minor', due: { year: 1222, season: 'Summer' } };
    const flawed: CovenantHookBoon = { uid: 'f', name: 'Flawed Resources', kind: 'hook', size: 'Minor', due: { year: 1222, season: 'Summer' } };
    cov.hooksBoons.push(disaster, flawed);
    expect(hooksComeDue(cov, 1222, 'Spring')).toEqual([]);
    const lines = hooksComeDue(cov, 1222, 'Summer');
    expect(lines).toHaveLength(2);
    expect(disaster.active).toBe(true);
    expect(isDue(disaster, 1222, 'Summer')).toBe(false);
    expect(isDue(flawed, 1222, 'Autumn')).toBe(true);
    // the next season brings nothing new for the disaster, and the reminder until the story is settled
    expect(hooksComeDue(cov, 1222, 'Autumn').map((l) => l.text)).toEqual([expect.stringContaining('Flawed Resources')]);
  });

  it('rolls the story: success keeps the most valuable half, a failure loses all, a botch doubles it', () => {
    expect(rollFlawedStory(6, 9, 1, seq(0.45)).outcome).toBe('saved'); // 5 + 6 = 11
    expect(rollFlawedStory(2, 9, 1, seq(0.45)).outcome).toBe('lost'); // 5 + 2 = 7
    expect(rollFlawedStory(6, 9, 1, seq(0.05, 0.05)).outcome).toBe('botched'); // 0, then a 0 on the botch die
    const res = [
      { uid: 'a', kind: 'book' as const, label: 'A', cost: 100 },
      { uid: 'b', kind: 'book' as const, label: 'B', cost: 80 },
      { uid: 'c', kind: 'book' as const, label: 'C', cost: 40 },
      { uid: 'd', kind: 'book' as const, label: 'D', cost: 30 },
    ];
    expect(keepHalf(res)).toEqual(['a']); // half of 250 is 125: A (100) and nothing else fits
    const hb: CovenantHookBoon = { uid: 'f', name: 'Flawed Resources', kind: 'hook', size: 'Minor' };
    settleFlawedStory(hb, { outcome: 'saved', total: 11, text: 'ok' }, res, { year: 1222, season: 'Summer' });
    expect(hb.outcome).toBe('saved');
    expect(hb.kept).toEqual(['a']);
    expect(hb.rolled).toContain('Summer 1222');
  });
});
