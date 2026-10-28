// The turb's day (Grogs ch.2 and ch.4) and damaged goods (City & Guild ch.4).
import { describe, expect, it } from 'vitest';
import { newCharacter } from './character/factory';
import {
  applyDiscipline, assignWatches, bargainPrice, disciplineLoyalty, dutyAt, rationsModifier, retire, rollDoubleDuty, rollGroupTraining, rollStayAwake, stayAwakeEase, appraiseEase,
} from './turb';
import { itemDamageLevels, itemStressCheck, repairNeeds } from './workshop';

const faces = (...f: number[]) => {
  let i = 0;
  return () => (f[i++ % f.length] + 0.5) / 10;
};

describe('watches (Grogs, Watch Patterns)', () => {
  it('follows the single and double duty charts', () => {
    // eventide: the first watch is on duty; the day patrol's others asleep, the night patrol's off duty
    expect(dutyAt('day', 1, 0)).toBe('duty');
    expect(dutyAt('day', 2, 0)).toBe('free');
    expect(dutyAt('night', 2, 0)).toBe('off');
    // morntide: the first watch again; by day the night patrol sleeps
    expect(dutyAt('night', 1, 4)).toBe('duty');
    expect(dutyAt('night', 3, 4)).toBe('free');
    expect(dutyAt('day', 3, 4)).toBe('off');
    // double duty: the first and second watches together, then the third and fourth from midnight
    expect(dutyAt('day', 2, 1, true)).toBe('duty');
    expect(dutyAt('day', 3, 2, true)).toBe('duty');
    expect(dutyAt('day', 1, 2, true)).toBe('free');
  });
  it('shares grogs evenly between the patrols and watches', () => {
    const w = assignWatches(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], faces(3, 7, 1));
    const patrols = Object.values(w).map((x) => x.patrol);
    expect(patrols.filter((p) => p === 'day')).toHaveLength(4);
    expect(new Set(Object.values(w).filter((x) => x.patrol === 'night').map((x) => x.watch)).size).toBe(4);
  });
  it('staying awake: 3 on single duty, 6 on double, +3 at night; double duty wears on', () => {
    expect([stayAwakeEase(false, false), stayAwakeEase(true, true)]).toEqual([3, 9]);
    expect(rollStayAwake(1, 1, false, true, faces(3)).ok).toBe(false);
    expect(rollStayAwake(1, 1, false, true, faces(4)).ok).toBe(true);
    expect(rollDoubleDuty(1, 4, faces(5)).ok).toBe(false);
    expect(rollDoubleDuty(1, 4, faces(6)).ok).toBe(true);
  });
  it('a leader shortens a group’s training with Communication + Leadership', () => {
    expect(rollGroupTraining(1, 4, 12, faces(7)).ok).toBe(true);
    expect(rollGroupTraining(1, 4, 15, faces(7)).ok).toBe(false);
    expect(rollGroupTraining(1, 4, 6, faces(0, 0)).text).toMatch(/botch/);
  });
});

describe('rewards and punishments (Grogs ch.2)', () => {
  it('marks wounds, fatigue and the year’s rations on the grog', () => {
    const g = newCharacter('grog', 's1');
    applyDiscipline(g, 'flog5', 1220, 'insolence');
    expect(g.wounds.light).toBe(2);
    expect(g.longTermFatigueLost).toBe(3);
    expect(g.notes).toMatch(/1220: Punished: Flogging: five blows \(insolence\)/);
    applyDiscipline(g, 'whip30s', 1220);
    expect(g.wounds.medium).toBe(2);
    applyDiscipline(g, 'reduced3', 1220);
    applyDiscipline(g, 'reduced1', 1220);
    expect(rationsModifier(g, 1220)).toBe(-2);
    expect(rationsModifier(g, 1221)).toBe(0);
    applyDiscipline(g, 'rations', 1221);
    expect(rationsModifier(g, 1221)).toBe(1);
  });
  it('costs Loyalty Points only when a magus orders it, and only if unjust while loyalty is positive', () => {
    expect(disciplineLoyalty('flog10', false, false, -1)).toBe(0);
    expect(disciplineLoyalty('flog10', true, false, 2)).toBe(0);
    expect(disciplineLoyalty('flog10', true, true, 2)).toBe(-12);
    expect(disciplineLoyalty('castigation', true, false, 0)).toBe(-1);
    expect(disciplineLoyalty('flog10', true, false, 0, 3)).toBe(-15);
    expect(disciplineLoyalty('rations', true, true, 0)).toBe(0);
  });
  it('retires and dismisses', () => {
    const g = newCharacter('grog', 's1');
    retire(g, 1225);
    expect(g.retired).toEqual({ year: 1225, how: 'retired' });
    applyDiscipline(g, 'dismissal', 1226);
    expect(g.retired?.how).toBe('dismissed');
  });
});

describe('bargaining (Grogs ch.4)', () => {
  it('takes 10% off for every 3 points or part, never under half', () => {
    expect(bargainPrice(10, 12, 12).price).toBe(10);
    expect(bargainPrice(10, 13, 12).price).toBe(9);
    expect(bargainPrice(10, 13, 12).text).toMatch(/10% off/);
    expect(bargainPrice(10, 18, 12).price).toBe(8);
    expect(bargainPrice(10, 40, 12).price).toBe(5);
    expect([appraiseEase(false, false), appraiseEase(true, false), appraiseEase(false, true)]).toEqual([9, 6, 12]);
  });
});

describe('damaged goods (City & Guild ch.4)', () => {
  it('gives damage levels by quality times size, double for a lock', () => {
    expect(itemDamageLevels('standard', -1)).toBe(2);
    expect(itemDamageLevels('excellent', 0)).toBe(4);
    expect(itemDamageLevels('standard', 5)).toBe(4);
    expect(itemDamageLevels('superior', 8)).toBe(9);
    expect(itemDamageLevels('shoddy', 10)).toBe(4);
    expect(itemDamageLevels('standard', -1, true)).toBe(4);
  });
  it('a stress check against 15 costs a level, a botch one more per botch', () => {
    expect(itemStressCheck(6, faces(9)).lost).toBe(0);
    expect(itemStressCheck(5, faces(9)).lost).toBe(1);
    expect(itemStressCheck(20, faces(0, 0, 3)).lost).toBe(2);
    expect(repairNeeds('excellent').craft).toBe(6);
    expect(repairNeeds('standard').craft).toBe(0);
  });
});
