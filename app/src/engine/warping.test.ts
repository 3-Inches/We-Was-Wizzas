// What follows Warping Points, for each tradition (warping.ts), on the books' own rules and examples.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { addVirtue, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { newCovenant } from './covenant';
import { ageCharacter } from './time';
import { DEFAULT_HOUSE_RULES, type Character } from './types';
import { gainWarping, owedReaction, warpingReaction } from './warping';
import { warpingScoreFromPoints } from './xp';

const data = buildGameData();
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
const when = { year: 1220, season: 'Spring' as const };

const magus = (...flaws: string[]) => {
  const c = newCharacter('magus', 'm');
  for (const f of flaws) addVirtue(c, data, f, 'Major');
  return c;
};
const witch = () => {
  const c = newCharacter('companion', 'w');
  addVirtue(c, data, 'folk-witch', 'Free');
  addVirtue(c, data, 'the-gift', 'Free');
  return c;
};
const vitki = (prone = false) => {
  const c = newCharacter('companion', 'v');
  addVirtue(c, data, 'the-gift', 'Free');
  addVirtue(c, data, 'vitki', 'Free');
  if (prone) addVirtue(c, data, 'natt-thel-prone-flaw', 'Major');
  return c;
};
const faerieTouched = () => {
  const c = newCharacter('companion', 'f');
  c.sympathy = [{ uid: 't', trait: 'Hounds', score: 2 }];
  return c;
};

describe('who reacts to Warping, and how', () => {
  it('each tradition has its own reaction, the Magic realm’s before Faerie (RoP: Faerie line 6739)', () => {
    expect(warpingReaction(magus(), d(magus()))).toBe('twilight');
    expect(warpingReaction(witch(), d(witch()))).toBe('witch-moon');
    expect(warpingReaction(vitki(), d(vitki()))).toBe('natt-thel');
    expect(warpingReaction(faerieTouched(), d(faerieTouched()))).toBe('calling');
    const v = vitki();
    v.sympathy = [{ uid: 't', trait: 'Ravens', score: 1 }];
    expect(warpingReaction(v, d(v))).toBe('natt-thel');
    expect(warpingReaction(newCharacter('companion', 'x'), d(newCharacter('companion', 'x')))).toBeUndefined();
  });
});

describe('Wizard’s Twilight (DE, Entering Twilight)', () => {
  it('two or more points from a single event are owed, with the points', () => {
    const c = magus();
    expect(gainWarping(c, d(c), { points: 2, why: 'from a botched casting', botch: true, ...when })).toMatch(/Twilight follows/);
    expect(c.warpingPoints).toBe(2);
    expect(owedReaction(c, 'twilight')).toMatchObject({ points: 2, year: 1220, season: 'Spring', text: '2 Warping Points from a botched casting: roll to avoid Wizard’s Twilight.' });
  });
  it('one point is not enough, unless from a botch with Twilight Prone', () => {
    const c = magus();
    expect(gainWarping(c, d(c), { points: 1, why: '', botch: true, ...when })).toBeUndefined();
    expect(c.owed ?? []).toHaveLength(0);
    const p = magus('twilight-prone-flaw');
    gainWarping(p, d(p), { points: 1, why: '', botch: true, ...when });
    expect(owedReaction(p, 'twilight')?.points).toBe(1);
  });
  it('prolonged exposure brings no Twilight', () => {
    const c = magus();
    expect(gainWarping(c, d(c), { points: 4, why: 'for the year', prolonged: true, ...when })).toBeUndefined();
    expect(c.warpingPoints).toBe(4);
    expect(c.owed ?? []).toHaveLength(0);
  });
});

describe('the Witch Moon (HMRE line 2069)', () => {
  it('begins when the Warping Score rises, whatever the source: the first at Warping Score 1', () => {
    const c = witch();
    c.warpingPoints = 4;
    expect(gainWarping(c, d(c), { points: 1, why: 'for the year', prolonged: true, ...when })).toMatch(/Warping Score 1: the Witch Moon begins/);
    expect(c.folkWitch?.witchMoon).toEqual({ months: 0, warpingScore: 1, pointsGained: 0 });
    expect(owedReaction(c, 'witch-moon')?.text).toMatch(/^Warping Score 1 \(1 Warping Point for the year\): the Witch Moon begins/);
  });
  it('does not begin while the score holds, nor again while it lasts', () => {
    const c = witch();
    gainWarping(c, d(c), { points: 3, why: '', ...when });
    expect(c.folkWitch?.witchMoon).toBeUndefined();
    gainWarping(c, d(c), { points: 2, why: '', ...when });
    expect(c.owed).toHaveLength(1);
    gainWarping(c, d(c), { points: 10, why: '', ...when });
    expect(warpingScoreFromPoints(c.warpingPoints)).toBe(2);
    expect(c.owed).toHaveLength(1);
  });
  it('replaces the ordinary effects of Warping at the year’s end (HMRE line 2071)', () => {
    const c = witch();
    c.warpingPoints = 4;
    const cov = newCovenant('s', 1220);
    const lines = ageCharacter(c, d(c), { covenant: cov, aura: { realm: 'Faerie', strength: 6 } }, 1220, () => 0.5, false);
    expect(lines.map((l) => l.text).join(' ')).toMatch(/\+1 Warping Point for the year/);
    expect(c.owed?.map((o) => o.kind)).toEqual(['witch-moon']);
    expect(c.owed?.[0]).toMatchObject({ year: 1220, season: 'Winter' });
  });
});

describe('Nátt-thel (HMRE line 6350)', () => {
  it('two or more points from a single event: the book’s vitki at Warping Score 3 gains 2', () => {
    const c = vitki();
    c.warpingPoints = 30; // Warping Score 3
    gainWarping(c, d(c), { points: 2, why: 'from a spell', ...when });
    expect(owedReaction(c, 'natt-thel')).toMatchObject({ points: 2, text: '2 Warping Points from a spell: roll Stamina + Concentration to avoid Nátt-thel.' });
  });
  it('a single botch is enough with Nátt-thel Prone (line 6314), and not without', () => {
    const c = vitki();
    gainWarping(c, d(c), { points: 1, why: '', botch: true, ...when });
    expect(owedReaction(c, 'natt-thel')).toBeUndefined();
    const p = vitki(true);
    gainWarping(p, d(p), { points: 1, why: '', botch: true, ...when });
    expect(owedReaction(p, 'natt-thel')?.points).toBe(1);
  });
  it('is not owed again where it was rolled already', () => {
    const c = vitki();
    gainWarping(c, d(c), { points: 3, why: '', botch: true, handled: true, ...when });
    expect(c.warpingPoints).toBe(3);
    expect(c.owed ?? []).toHaveLength(0);
  });
});

describe('Faerie Calling (RoP: Faerie line 6717)', () => {
  it('comes on 2 or more Warping Points at once', () => {
    const c = faerieTouched();
    gainWarping(c, d(c), { points: 1, why: '', ...when });
    expect(owedReaction(c, 'calling')).toBeUndefined();
    gainWarping(c, d(c), { points: 2, why: 'from a faerie rite', ...when });
    expect(owedReaction(c, 'calling')).toMatchObject({ points: 2 });
  });
  it('replaces the ordinary Virtues and Flaws of Warping (line 6685)', () => {
    const c = faerieTouched();
    c.warpingPoints = 4;
    const cov = newCovenant('s', 1220);
    ageCharacter(c, d(c), { covenant: cov, aura: { realm: 'Magic', strength: 6 } }, 1220, () => 0.5, false);
    expect(c.warpingPoints).toBe(5);
    expect(c.owed ?? []).toHaveLength(0);
  });
});
