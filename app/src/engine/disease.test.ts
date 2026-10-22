// Disease (Art & Academe): stages, Disease Penalty, recovery rolls and crises.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { DISEASES, currentSeverity, illnessFrom, recoveryRoll } from './disease';
import { DEFAULT_HOUSE_RULES, type Character } from './types';

const data = buildGameData();
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
// a stress die that reads the given faces in turn (no botch dice are rolled on recovery)
const faces = (...f: number[]) => { let i = 0; return () => (f[i++ % f.length] + 0.5) / 10; };

describe('disease', () => {
  it('reads the diseases of Art & Academe with their Ease Factors', () => {
    const garotillo = DISEASES.find((x) => x.name === 'Garotillo')!;
    expect(garotillo).toMatchObject({ stage: 'Serious', severity: 9, stable: 6, improve: 12, interval: 'Week' });
    expect(DISEASES.length).toBeGreaterThan(20);
  });

  it('worsens below the Stable Ease Factor, holds with +3 between, and improves at the Improvement Ease Factor', () => {
    const c = newCharacter('companion', 's');
    c.characteristics.Sta = 0;
    const ill = illnessFrom(DISEASES.find((x) => x.name === 'Garotillo')!);
    c.illnesses = [ill];
    expect(d(c).currentDiseasePenalty).toBe(-3);
    recoveryRoll(c, d(c), ill.uid, {}, faces(4)); // 4 < 6: worse
    expect(c.illnesses[0].stage).toBe('Major');
    expect(currentSeverity(c.illnesses[0])).toBe(12);
    expect(d(c).currentDiseasePenalty).toBe(-5);
    recoveryRoll(c, d(c), ill.uid, {}, faces(7)); // 7: stable, +3 next
    expect(c.illnesses[0]).toMatchObject({ stage: 'Major', bonus: 3 });
    recoveryRoll(c, d(c), ill.uid, {}, faces(9)); // 9 + 3 = 12: better
    expect(c.illnesses[0]).toMatchObject({ stage: 'Serious', bonus: 0 });
    recoveryRoll(c, d(c), ill.uid, { medicine: 5 }, faces(8)); // 13: Minor
    const r = recoveryRoll(c, d(c), ill.uid, { medicine: 5 }, faces(8)); // 13: gone
    expect(r.outcome).toBe('cured');
    expect(c.illnesses).toEqual([]);
  });

  it('kills at a crisis on a total of 0 or less', () => {
    const c = newCharacter('companion', 's');
    c.characteristics.Sta = -2;
    const ill = { ...illnessFrom(DISEASES.find((x) => x.name === 'Apoplexy')!) };
    c.illnesses = [ill];
    expect(recoveryRoll(c, d(c), ill.uid, {}, faces(2)).outcome).toBe('dead');
  });
});
