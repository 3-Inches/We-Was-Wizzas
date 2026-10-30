import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { deriveCovenant, newCovenant } from './covenant';
import { newLab } from './lab';
import { borrow, hardTimesOptions, hardshipYearEnd, owed, repay, sellVis } from './hardship';

const data = buildGameData();

function covenant() {
  const cov = newCovenant('s', 1220);
  cov.name = 'Hardhold';
  cov.covenfolk = { ...cov.covenfolk, grogs: 10, servants: 12, teamsters: 4, laborers: 10 };
  cov.labs.push(newLab('A lab'));
  cov.finances.weaponArmorPoints = 500;
  return cov;
}

describe('hard times', () => {
  it('lists the ways to spend less, each with its saving and its cost in loyalty', () => {
    const cov = covenant();
    const opts = hardTimesOptions(cov, data, []);
    const ids = opts.map((o) => o.id);
    // no magi here, so their giving up privileges saves nothing and is not offered
    expect(ids).not.toContain('perks');
    expect(ids).toContain('wages');
    expect(ids).toContain('layoff');
    expect(ids).toContain('neglect:Provisions');
    for (const o of opts) expect(o.saving).toBeGreaterThan(0);
    expect(opts.find((o) => o.id === 'wages')!.loyalty).toBe(-10);
    // leaving Provisions unpaid takes their whole cost (after the laborers' saving) off the year
    const before = deriveCovenant(cov, data, []).finances.totalExpenditure;
    opts.find((o) => o.id === 'neglect:Provisions')!.apply(cov);
    const after = deriveCovenant(cov, data, []).finances.totalExpenditure;
    expect(before - after).toBeCloseTo(opts.find((o) => o.id === 'neglect:Provisions')!.saving, 1);
  });

  it('turns an empty treasury into bills owed, and neglect into its trouble at the year’s end', () => {
    const cov = covenant();
    cov.finances.treasury = -37;
    cov.finances.neglect = ['Provisions', 'Laboratories', 'Weapons and Armor', 'Buildings'];
    const lp = cov.loyalty.actionPoints;
    const lines = hardshipYearEnd(cov, data, 1225);
    expect(cov.finances.treasury).toBe(0);
    expect(owed(cov)).toBe(37);
    expect(cov.loyalty.actionPoints).toBe(lp - 3 - 9 - 3);
    expect(cov.labs[0].virtues.some((v) => v.defId === 'decaying-flaw')).toBe(true);
    expect(cov.finances.weaponArmorPoints).toBe(400);
    expect(cov.covenfolk.laborers).toBe(9);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    // the interest shows in the spending
    expect(deriveCovenant(cov, data, []).finances.expenditures.find((e) => e.label === 'Interest on money owed')?.pounds).toBe(3.7);
  });

  it('borrows, repays and sells vis', () => {
    const cov = covenant();
    cov.finances.treasury = 5;
    borrow(cov, 50, 'a Lombard', 1221);
    expect(cov.finances.treasury).toBe(55);
    expect(owed(cov)).toBe(50);
    expect(repay(cov, 30)).toBe(30);
    expect(owed(cov)).toBe(20);
    expect(cov.finances.treasury).toBe(25);
    cov.visStocks = [{ art: 'Vi', pawns: 8 }];
    expect(sellVis(cov, ['Vi'], 5)).toContain('50 £');
    expect(cov.visStocks[0].pawns).toBe(3);
    expect(cov.finances.treasury).toBe(75);
  });
});
