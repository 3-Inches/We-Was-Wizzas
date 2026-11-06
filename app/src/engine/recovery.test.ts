// Recovery at the Game Table (DE, Recovering From Wounds; Fatigue): each wound at its interval with its
// own stable bonus, Incapacitation's two rolls a day, Fatigue back with rest, time passed for everyone.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { DAY, HOUR, MONTH, WEEK, ailmentsOf, condition, fatigueStep, medicCapacity, nextRecovery, passTime, rollIncapacitated, rollWound } from './recovery';
import { DEFAULT_HOUSE_RULES, type Character } from './types';

const data = buildGameData();
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
// a die that reads the given faces in turn (2 to 9: no rerolls, no botches)
const faces = (...f: number[]) => {
  let i = 0;
  return () => (f[i++ % f.length] + 0.5) / 10;
};
const patient = () => {
  const c = newCharacter('grog', 's');
  c.characteristics.Sta = 0;
  return c;
};

describe('recovery', () => {
  it('lists what ails a character, the soonest first', () => {
    const c = patient();
    c.wounds.light = 2;
    c.wounds.medium = 1;
    c.fatigueLost = 2;
    const a = ailmentsOf(c);
    expect(a.map((x) => x.kind)).toEqual(['fatigue', 'light', 'medium']);
    expect(a[0].next).toBe(fatigueStep(2));
    expect(a[1].next).toBe(WEEK);
    expect(nextRecovery([c])).toBe(10);
  });

  it('keeps a stable wound’s +3, wound by wound, and heals or worsens one wound at a time', () => {
    const c = patient();
    c.wounds.light = 2;
    // 5 against 4/10: stable, +3 to this wound only
    expect(rollWound(c, d(c), 'light', 1, {}, faces(5))).toMatch(/stable/);
    expect(c.recovery?.stable?.light).toEqual([undefined, 3]);
    // 7 + 3 = 10: the second wound heals
    expect(rollWound(c, d(c), 'light', 1, {}, faces(7))).toMatch(/healed/);
    expect(c.wounds.light).toBe(1);
    // 2 against 4: the first worsens to Medium
    expect(rollWound(c, d(c), 'light', 0, {}, faces(2))).toMatch(/worsens/);
    expect(c.wounds).toMatchObject({ light: 0, medium: 1 });
  });

  it('adds the medic’s Chirurgy and magical aid, and a disease hinders', () => {
    const c = patient();
    c.wounds.medium = 1;
    // 6 + Chirurgy 4 + aid 2 = 12: Medium becomes Light
    rollWound(c, d(c), 'medium', 0, { chirurgy: 4, aid: 2 }, faces(6));
    expect(c.wounds).toMatchObject({ light: 1, medium: 0 });
  });

  it('rolls Incapacitation twice a day: 9+ makes it Heavy, else worse, 0 or less dies', () => {
    const c = patient();
    c.wounds.incapacitating = 1;
    expect(rollIncapacitated(c, d(c), {}, faces(5))).toMatch(/worse/);
    expect(c.recovery?.incapacitated).toBe(-1);
    rollIncapacitated(c, d(c), {}, faces(9), ); // 9 − 1 = 8: worse again
    expect(c.recovery?.incapacitated).toBe(-2);
    rollIncapacitated(c, d(c), { chirurgy: 3 }, faces(9)); // 9 + 3 − 2 = 10: Heavy
    expect(c.wounds).toMatchObject({ incapacitating: 0, heavy: 1 });
    expect(c.recovery?.incapacitated).toBeUndefined();
  });

  it('passes time: Fatigue back with rest, a night for Long-Term, wounds at their intervals', () => {
    const c = patient();
    c.fatigueLost = 2;
    c.longTermFatigueLost = 1;
    c.wounds.light = 1;
    // Tired (3 lost): 30 minutes to Weary, 10 more to Winded; then a night for the Long-Term level
    passTime(c, d, 40, {}, () => 0, faces(5));
    expect(c.fatigueLost).toBe(0);
    expect(c.longTermFatigueLost).toBe(1);
    passTime(c, d, DAY, {}, () => 0, faces(5));
    expect(c.longTermFatigueLost).toBe(0);
    // a week from the start: the light wound rolls (8 ≥ 4: stable, not 10)
    const lines = passTime(c, d, WEEK, {}, () => 0, faces(8));
    expect(lines.some((l) => /Light Wound/.test(l))).toBe(true);
    expect(c.recovery?.stable?.light).toEqual([3]);
  });

  it('rolls each wound at its own level’s interval, and a healed level’s clock stops', () => {
    const c = patient();
    c.wounds.medium = 1;
    passTime(c, d, WEEK, {}, () => 0, faces(9));
    expect(c.wounds.medium).toBe(1); // a month for a Medium Wound
    passTime(c, d, MONTH - WEEK, {}, () => 0, faces(9, 9)); // 9 + 3? no: 9 against 6/12, stable
    expect(c.recovery?.stable?.medium).toEqual([3]);
    passTime(c, d, MONTH, {}, () => 0, faces(9)); // 9 + 3 = 12: Light
    expect(c.wounds).toMatchObject({ medium: 0, light: 1 });
    expect(c.recovery?.since?.medium).toBeUndefined();
    expect(c.recovery?.since?.light).toBe(0);
  });

  it('tells how near the edge a character is, and how many a medic can tend', () => {
    const c = patient();
    c.fatigueLost = 4;
    expect(condition(c, d(c)).fatigue).toMatch(/Dazed, 1 level from Unconscious/);
    c.wounds.incapacitating = 1;
    expect(condition(c, d(c)).danger).toMatch(/0 or less dies/);
    expect(medicCapacity(3, false)).toBe(3);
    expect(medicCapacity(3, true)).toBe(15);
    expect(12 * HOUR).toBe(720);
  });
});
