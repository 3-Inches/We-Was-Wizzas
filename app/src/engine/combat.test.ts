// Combat options beyond a single fighter's totals.
import { describe, expect, it } from 'vitest';
import { distributeBlows, groupCombat } from './combat';
import { labDistraction } from './magic';

describe('group combat (DE, Groups)', () => {
  const m = (name: string, ab: number, atk: number, lead = 0) => ({ name, leadership: lead, line: { name: 'Spear', ability: 'Great Weapon', abilityScore: ab, specialty: false, init: 1, atk, dfn: 5, dam: 7, load: 0, strOk: true, notes: [] } });
  it("adds the others' Combat Abilities, capped by 3 × Leadership", () => {
    const g = groupCombat([m('Vanguard', 5, 10, 3), m('A', 4, 9), m('B', 4, 8)], 0, 0, true);
    expect(g).toMatchObject({ trained: true, bonus: 8, cap: 9 });
    expect(groupCombat([m('V', 5, 10, 1), m('A', 4, 9)], 0, 0, true).trained).toBe(false); // Leadership 1 can't coordinate two
  });
  it('flags totals more than five apart and spreads blows with the vanguard first', () => {
    expect(groupCombat([m('V', 5, 15, 3), m('A', 4, 8)], 0, 0, true).outOfRange).toEqual(['Attack 8–15']);
    expect(distributeBlows(4, 3)).toEqual([2, 1, 1]);
  });
});

describe('distractions (DE)', () => {
  it('costs the Lab Total for days away, and rules out work past twenty', () => {
    expect(labDistraction(10)).toEqual({ penalty: 0, impossible: false });
    expect(labDistraction(11).penalty).toBe(-12);
    expect(labDistraction(20).penalty).toBe(-30);
    expect(labDistraction(21).impossible).toBe(true);
  });
});
