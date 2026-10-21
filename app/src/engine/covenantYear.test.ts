// The covenant's year in play: closing the books, the Income Modification table, loyalty events.

import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { deriveCovenant, newCovenant } from './covenant';
import { computeIncome } from './covenantRules';
import { DEFAULT_YEAR_END, applyYearEnd, loyaltyAttitude, loyaltyEventPoints, planYearEnd, rollIncomeModification } from './covenantYear';
import { newCharacter } from './character/factory';

const data = buildGameData();
/** A die that shows these faces in turn (0–9). */
const faces = (...f: number[]) => {
  let i = 0;
  return () => (f[i++ % f.length] + 0.5) / 10;
};

function covenant() {
  const c = newCovenant('s1', 1220);
  c.income.push({ uid: 'farm', name: 'Farms', type: 'Agriculture', level: 'Typical', pounds: 100 });
  c.visSources.push({ uid: 'v1', name: 'Spring', art: 'Aq', pawnsPerYear: 4 }, { uid: 'v2', name: 'Grove', art: 'He', pawnsPerYear: 2 });
  return c;
}

describe('the Income Modification table (Covenants ch.5)', () => {
  it('maps a stress die to the effects', () => {
    expect(rollIncomeModification(faces(0, 0)).id).toBe('Slump'); // 0 and a botch
    expect(rollIncomeModification(faces(0, 5)).id).toBe('Contraction'); // 0, no botch
    expect(rollIncomeModification(faces(2)).id).toBe('Stagnation');
    expect(rollIncomeModification(faces(6)).id).toBe('Status Quo');
    expect(rollIncomeModification(faces(9)).id).toBe('Growth');
    expect(rollIncomeModification(faces(1, 6)).id).toBe('Expansion'); // 1 → 6 doubled = 12
    expect(rollIncomeModification(faces(1, 1, 6)).id).toBe('Boom'); // 24
  });
  it('makes a change last through a factor on the source', () => {
    const c = covenant();
    c.income[0].factor = 1.2;
    expect(computeIncome(c, 6).lines[0].base).toBe(120);
  });
});

describe('closing the year', () => {
  it('moves the balance into the treasury, raises inflation, gathers vis and adds a year of familiarity', () => {
    const c = covenant();
    c.finances.treasury = 50;
    c.finances.sundry = 7;
    c.income[0].modification = 'Expansion';
    const dc = deriveCovenant(c, data, []);
    const plan = planYearEnd(c, dc);
    expect(plan.treasuryAfter).toBeCloseTo(50 + dc.finances.balance, 5);
    expect(plan.inflationRise).toBe(Math.round(dc.finances.totalExpenditure / 100));
    expect(plan.vis).toEqual([{ art: 'Aq', pawns: 4 }, { art: 'He', pawns: 2 }]);
    applyYearEnd(c, plan, 1220);
    expect(c.finances.treasury).toBe(plan.treasuryAfter);
    expect(c.income[0].factor).toBe(1.2);
    expect(c.income[0].modification).toBe('Status Quo');
    expect(c.visStocks.find((v) => v.art === 'Aq')?.pawns).toBe(4);
    expect(c.loyalty.yearsFounded).toBe(1);
    expect(c.finances.sundry).toBe(0);
    expect(c.finances.lastExpenditure).toBe(dc.finances.totalExpenditure);
    expect(c.log.at(-1)?.text).toMatch(/Year closed/);
  });
  it('keeps inflation still in a year expenditure fell, and skips vis not gathered', () => {
    const c = covenant();
    const dc = deriveCovenant(c, data, []);
    c.finances.lastExpenditure = dc.finances.totalExpenditure + 50;
    const plan = planYearEnd(c, dc, { ...DEFAULT_YEAR_END, skipVis: ['v1'] });
    expect(plan.inflationRise).toBe(0);
    expect(plan.vis).toEqual([{ art: 'He', pawns: 2 }]);
  });
  it('turns an old covenant\'s pound of sundry into the Pound of Enumerus', () => {
    const c = covenant();
    delete c.finances.enumerus;
    c.finances.sundry = 1;
    const before = deriveCovenant(c, data, []).finances.totalExpenditure;
    applyYearEnd(c, planYearEnd(c, deriveCovenant(c, data, [])), 1220);
    expect(c.finances.enumerus).toBe(true);
    expect(deriveCovenant(c, data, []).finances.expenditures.find((e) => e.label === 'The Pound of Enumerus')?.pounds).toBe(1);
    expect(deriveCovenant(c, data, []).finances.totalExpenditure).toBeGreaterThanOrEqual(before);
  });
});

describe('loyalty (DE; Covenants ch.4)', () => {
  it('scores events from the Example Loyalty Point Penalties', () => {
    expect(loyaltyEventPoints('attitude', 2)).toBe(-6); // Malicious
    expect(loyaltyEventPoints('wound', 2, true)).toBe(-9); // Medium by magic: one level worse
    expect(loyaltyEventPoints('altruism', 1)).toBe(3);
    expect(loyaltyEventPoints('refugees', 0)).toBe(-3);
    expect(loyaltyEventPoints('celebration', 0)).toBe(1);
  });
  it('describes the covenfolk at a Prevailing Loyalty', () => {
    expect(loyaltyAttitude(-6)).toMatch(/revolt/);
    expect(loyaltyAttitude(0)).toMatch(/content/);
    expect(loyaltyAttitude(9)).toMatch(/lives/);
  });
  it('counts unGifted council members in the Base Loyalty average', () => {
    const c = covenant();
    const m = newCharacter('magus', 's1');
    c.memberIds.push(m.id);
    const alone = deriveCovenant(c, data, [m]).loyalty.base;
    expect(alone).toBeLessThan(0);
    c.loyalty.unGiftedCouncil = 2;
    expect(deriveCovenant(c, data, [m]).loyalty.base).toBe(Math.round(alone / 3));
  });
});
