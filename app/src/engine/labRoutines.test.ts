// Non-standard lab routines (Covenants): the Lab Total bonus, Warping, and the year's Living Conditions and Aging rolls.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newCharacter, ensureAbility } from './character/factory';
import { deriveCharacter } from './character/derive';
import { routineClash, routineYear, toggleRoutine } from './labRoutines';
import { newProject, planProject, workProject } from './projects';
import { ageCharacter } from './time';
import { DEFAULT_HOUSE_RULES, type Character } from './types';

const data = buildGameData();
const ctx = { aura: { realm: 'Magic' as const, strength: 5 } };
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
function magus(): Character {
  const c = newCharacter('magus', 's');
  c.characteristics.Int = 3;
  c.arts.Cr = { apprenticeship: 55 }; // 10
  c.arts.Vi = { apprenticeship: 55 };
  ensureAbility(c, 'magic-theory', { apprenticeship: 75 }); // 5
  c.age = 30;
  return c;
}

describe('lab routines', () => {
  it('adds each routine’s bonus to the Lab Total and keeps one kind of overtime', () => {
    const c = magus();
    const p = { ...newProject('extract'), routines: toggleRoutine(toggleRoutine([], 'nocturnal'), 'overtime') };
    c.projects = [p];
    expect(planProject(p, c, d(c), ctx).total!.total).toBe(33 + 2 + 3);
    expect(toggleRoutine(['overtime', 'nocturnal'], 'double')).toEqual(['nocturnal', 'double']);
    expect(toggleRoutine(['nocturnal'], 'early')).toEqual(['early']);
    expect(routineClash(['overtime', 'triple'])).toMatch(/one kind of overtime/);
  });

  it('gives Warping by the seasons worked, and a worse Living Conditions and more Aging rolls that year', () => {
    const c = magus();
    const p = { ...newProject('extract'), routines: ['double' as const] };
    c.projects = [p];
    const before = c.warpingPoints;
    workProject(c, d(c), ctx, undefined, p.uid, data, 1220);
    expect(c.warpingPoints).toBe(before);
    const lines = workProject(c, d(c), ctx, undefined, p.uid, data, 1220);
    expect(c.warpingPoints).toBe(before + 1); // a Warping Point every two seasons of Double Overtime
    expect(lines.join(' ')).toMatch(/Double Overtime/);
    expect(routineYear(c, 1220)).toMatchObject({ living: -2, extraRolls: 1 });
    // a magus of 30 rolls for aging in a year of Double Overtime: twice
    let n = 0;
    const rng = () => ((n++ % 10) + 0.5) / 10;
    const year = ageCharacter(c, d(c), ctx, 1220, rng, true);
    expect(year.filter((l) => l.text.startsWith('Aging roll')).length).toBe(2);
    expect(year.some((l) => /Living Conditions -2/.test(l.text))).toBe(true);
  });
});
