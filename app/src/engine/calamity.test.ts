import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { RHINE } from '../data/livingCovenants/rhine';
import { newSaga } from '../store/store';
import { deriveCovenant } from './covenant';
import { planYearEnd } from './covenantYear';
import { faceTrouble, strike, troublesYearEnd, worstTrouble } from './calamity';
import { buildLivingCovenant } from './living';
import { seeded } from './generate/random';
import { DEFAULT_HOUSE_RULES } from './types';

const data = buildGameData();
function roznov() {
  const saga = newSaga('Living');
  saga.tribunal = 'Rhine';
  saga.currentYear = 1220;
  const { cov, chars } = buildLivingCovenant(RHINE, RHINE.covenants.find((c) => c.id === 'roznov')!, { data, saga, rules: DEFAULT_HOUSE_RULES }, { seed: 3, others: false });
  return { cov, members: chars.filter((c) => cov.memberIds.includes(c.id)) };
}

describe('calamities', () => {
  it('a devastating plague kills half the covenfolk, costs loyalty, and halves the income for three years', () => {
    const { cov, members } = roznov();
    cov.covenfolk.servants = 20;
    const income = deriveCovenant(cov, data, members).finances.income;
    const lp = cov.loyalty.actionPoints;
    const lines = strike(cov, members, 'plague', 3, { year: 1220, season: 'Summer', rng: seeded(2) });
    expect(lines[0]).toMatch(/Plague \(devastating\) strikes Roznov/);
    expect(cov.covenfolk.servants).toBe(10);
    expect(cov.loyalty.actionPoints).toBe(lp - 15);
    expect(Math.abs(deriveCovenant(cov, data, members).finances.income - income * 0.5)).toBeLessThanOrEqual(1);
    expect(cov.troubles![0]).toMatchObject({ kind: 'plague', yearsLeft: 3, incomeMult: 0.5 });
  });

  it('seven plagues sent by the players, and known, turn a covenant against them and close its vis', () => {
    const { cov, members } = roznov();
    expect(cov.visSources.length).toBeGreaterThan(0);
    strike(cov, members, 'plagues', 2, { year: 1220, season: 'Spring', by: 'Testhold', byPlayers: true, known: true, rng: seeded(4) });
    expect(cov.living!.attitude).toBe('hostile');
    const closed = cov.troubles![0].skipVis!;
    expect(closed).toHaveLength(1);
    const plan = planYearEnd(cov, deriveCovenant(cov, data, members));
    expect(plan.lines.join(' ')).not.toContain(cov.visSources.find((s) => s.uid === closed[0])!.name + ':');
  });

  it('fire burns books and damages a lab; theft takes vis and silver', () => {
    const { cov, members } = roznov();
    const books = cov.library.length;
    strike(cov, members, 'fire', 3, { year: 1220, season: 'Autumn', rng: seeded(5) });
    expect(cov.library.length).toBe(books - Math.max(1, Math.round(books * 0.5)));
    expect(cov.labs.filter((l) => l.virtues.some((v) => v.defId === 'decaying-flaw')).length).toBeGreaterThanOrEqual(1);
    cov.visStocks = [{ art: 'Vi', pawns: 10 }];
    cov.finances.treasury = 100;
    strike(cov, members, 'theft', 2, { year: 1220, season: 'Winter', rng: seeded(6) });
    expect(cov.visStocks[0].pawns).toBe(5);
    expect(cov.finances.treasury).toBe(80);
  });

  it('its magi deal with it a season at a time, one a season; the years pass and the folk are replaced', () => {
    const { cov, members } = roznov();
    cov.covenfolk.servants = 30;
    strike(cov, members, 'monster', 3, { year: 1220, season: 'Spring', rng: seeded(7) });
    const t = worstTrouble(cov, 1220, 'Summer')!;
    expect(t.yearsLeft).toBe(2);
    expect(faceTrouble(cov, members[0], t.uid, 1220, 'Summer')[0]).toMatch(/hunts the creature: 1 year of it left/);
    expect(faceTrouble(cov, members[1], t.uid, 1220, 'Summer')).toEqual([]);
    expect(worstTrouble(cov, 1220, 'Summer')).toBeUndefined();
    const lost = t.lost!.servants!;
    expect(troublesYearEnd(cov, true).join(' ')).toMatch(/is over.*new covenfolk/);
    expect(cov.covenfolk.servants).toBe(30 - lost + Math.ceil(lost / 3));
  });
});
