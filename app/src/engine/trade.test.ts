// City & Guild: travel, merchants' investments, skullduggery and intrigue, largesse, dowries; disease in towns;
// and an adventure sharing its season with the character's other work.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newSaga } from '../store/store';
import { ensureAbility, newCharacter } from './character/factory';
import { newCovenant } from './covenant';
import { hazardPenalty, townExposure } from './disease';
import { newSeasonEntry } from './longterm';
import { seasonsUsed } from './seasons';
import { DEFAULT_ADVANCE, advanceSeason } from './time';
import {
  blockadeRoll, captainsRoll, dowry, entertain, festivalXp, indirectRoll, investmentLp, journey, proxyRoll, sabotageRoll, warehouse,
} from './trade';

const data = buildGameData();
const faces = (...f: number[]) => {
  let i = 0;
  return () => (f[i++ % f.length] + 0.5) / 10;
};

describe('travel (City & Guild ch.5)', () => {
  it('works out days and passage by means of transport', () => {
    const sea = journey(700, 'ship', 8);
    expect(sea.days).toEqual([9, 12]);
    // a pound a fortnight for eight at sea
    expect(sea.pounds[1]).toBeCloseTo(12 / 14, 2);
    const road = journey(100, 'cargo', 8);
    expect(road.days).toEqual([4, 7]);
    expect(road.pounds).toEqual([Math.round((4 / 14) * 8 * 100) / 100, Math.round((7 / 14) * 20 * 100) / 100]);
    // a known magus pays double
    expect(journey(700, 'ship', 8, 2).pounds[1]).toBeCloseTo((12 / 14) * (10 / 8), 2);
  });
  it('rolls the captains against each other', () => {
    expect(captainsRoll(5, 3, faces(6, 4)).winner).toBe('first');
    expect(captainsRoll(3, 5, faces(6, 4)).winner).toBe('tie');
  });
});

describe('merchants (City & Guild ch.7)', () => {
  it('earns Labor Points from investments of time', () => {
    expect(investmentLp('government', 30, 'average', { Com: 2, intrigue: 3 })).toEqual({ lp: 15, favors: 1 });
    expect(investmentLp('talent', 30, 'wealthy', { Com: 2, leadership: 2 })).toEqual({ lp: 24, favors: 3 });
    expect(investmentLp('convoy', 30, 'average', {}).lp).toBe(15);
    expect(investmentLp('repossession-guild', 30, 'average', {}).lp).toBe(15);
  });
  it('runs a blockade on Dexterity + Profession against 15, and throws a party for Favors', () => {
    expect(blockadeRoll(2, 5, faces(8)).ok).toBe(true);
    expect(blockadeRoll(2, 5, faces(7)).ok).toBe(false);
    // die 6 + 2 + 3 + pounds up to Intrigue 2 = 13: three Favors
    expect(entertain(2, 3, 5, 2, faces(6)).favors).toBe(3);
  });
});

describe('skullduggery and intrigue (City & Guild ch.7)', () => {
  it('lets the hirer’s Communication + Intrigue stand in, and sabotage beat the sentries', () => {
    expect(proxyRoll(2, 4, faces(5)).total).toBe(11);
    // agent 6 + 9 = 15 against sentry 4 + 3 + one more sentry + arson 6 = 14
    expect(sabotageRoll(6, 4, 2, 6, faces(9, 3)).ok).toBe(true);
    expect(sabotageRoll(6, 4, 3, 6, faces(9, 3)).ok).toBe(false);
  });
  it('takes 3 × Ease days and Ease ÷ 3 pounds above Ease 6', () => {
    expect(indirectRoll(2, 4, 12, faces(6)).ok).toBe(true);
    expect(indirectRoll(2, 4, 12, faces(6)).text).toMatch(/36 days and at least 4 £/);
    expect(indirectRoll(2, 4, 6, faces(2)).text).not.toMatch(/days/);
  });
  it('reckons largesse, warehouses and dowries', () => {
    expect(festivalXp(10, 5000)).toBe(2);
    expect(warehouse(250)).toEqual({ pounds: 30, guards: 25 });
    expect(dowry(20, 4, 0).pounds).toBe(50);
    expect(dowry(20, 4, 2).pounds).toBe(0);
  });
});

describe('disease in towns (City & Guild)', () => {
  it('catches the ague or the flux on a failed Stamina roll, with the wound by the source', () => {
    expect(townExposure(1, 'ague', 1, faces(6))).toMatchObject({ caught: false });
    expect(townExposure(1, 'ague', 2, faces(6))).toMatchObject({ caught: true, wound: 'heavy' });
    expect(townExposure(0, 'flux', 0, faces(2))).toMatchObject({ caught: true, wound: 'medium' });
    expect(townExposure(0, 'worms', 0, faces(2))).toMatchObject({ caught: true, wound: undefined });
  });
  it('counts a bad-air trade, a mine and a leper colony against the aging roll', () => {
    expect(hazardPenalty({ hazards: ['bad-air', 'colony'] })).toBe(2);
    expect(hazardPenalty({})).toBe(0);
  });
});

describe('an adventure shares the season (DE)', () => {
  it('neither uses one of the year’s seasons nor stops the standing activity', () => {
    const s = newSaga('T');
    s.currentYear = 1220;
    s.currentSeason = 'Spring';
    const cov = newCovenant(s.id, 1220);
    const g = newCharacter('grog', s.id);
    g.name = 'Grog';
    g.creation.finalized = true;
    g.age = 25;
    ensureAbility(g, 'single-weapon', { laterLife: 30 });
    cov.memberIds.push(g.id);
    g.covenantId = cov.id;
    g.seasonLog.push(newSeasonEntry(1220, 'Spring', 'adventure', 'Adventure', {}));
    expect(seasonsUsed(g, 1220).free).toBe(0);
    const { state } = advanceSeason({ saga: s, characters: [g], covenants: [cov] }, data, { ...DEFAULT_ADVANCE, rollAging: false });
    const spring = state.characters[0].seasonLog.filter((e) => e.year === 1220 && e.season === 'Spring');
    expect(spring.map((e) => e.activity)).toEqual(['adventure', 'practice']);
  });
});
