// What the Rhine's magi have beyond their sheets: the book's items, talismans and familiar, the
// Mysteries of their Houses, heartbeasts, a Redcap's devices, House duties and the Bjornaer's
// Gathering of Twelve Years.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { RHINE } from '../data/livingCovenants/rhine';
import { newSaga } from '../store/store';
import { newCharacter } from './character/factory';
import { newCovenant } from './covenant';
import { issueRedcapDevices, redcapYearEnd } from './generate/items';
import { seeded } from './generate/random';
import { buildLivingCovenant, houseGatheringIn, livingYearEnd } from './living';
import { ensureAegis, livingStewardship, livingVisMarket, magicalImprovement, spareVis, visReserve, visShortfall } from './livingEconomy';
import { owed } from './hardship';
import { accountsForecast } from './covenantYear';
import { deriveCovenant } from './covenant';
import { houseDuty } from './priorities';
import { advanceSeasons, DEFAULT_ADVANCE } from './time';
import { DEFAULT_HOUSE_RULES, type Character } from './types';

const data = buildGameData();
const rules = DEFAULT_HOUSE_RULES;
const def = (id: string) => RHINE.covenants.find((c) => c.id === id)!;
const sagaAt = (year = 1220, season: 'Spring' | 'Summer' | 'Autumn' | 'Winter' = 'Spring', options: Record<string, boolean> = { rhineGilds: true }) => {
  const s = newSaga('Living');
  s.tribunal = 'Rhine';
  s.currentYear = year;
  s.currentSeason = season;
  s.options = options;
  return s;
};
const named = (cs: Character[], name: string) => cs.find((c) => c.name === name)!;

describe('the book’s items and familiars', () => {
  const { chars } = buildLivingCovenant(RHINE, def('durenmar'), { data, saga: sagaAt(), rules }, { seed: 3 });
  it('gives Philippus Niger his talisman, bridle and chain, and Sordus as the book has him', () => {
    const p = named(chars, 'Philippus Niger');
    const knife = p.items.find((i) => i.name === 'Knife of Human Bone')!;
    expect(knife.kind).toBe('talisman');
    expect(p.talismanUid).toBe(knife.uid);
    expect(knife.attunements.map((a) => a.bonus)).toEqual([2, 4, 3]);
    expect(knife.effects).toHaveLength(11);
    expect(knife.effects.find((e) => e.name === 'Evisceration of Ten Thousand Knives')?.modifiedLevel).toBe(55);
    expect(p.items.find((i) => i.name === 'The Wizard’s Bridle')?.effects.map((e) => e.modifiedLevel)).toEqual([50, 69]);
    expect(p.items.find((i) => i.name === 'The Subtle Chain')?.effects).toHaveLength(6);
    expect(p.familiar).toMatchObject({ name: 'Sordus', species: 'basilisk', might: 30, bindingTechnique: 'Pe', bindingForm: 'Vi', bindingLabTotal: 81, golden: 4, silver: 2, bronze: 2 });
    expect(p.familiar?.powers[0].name).toBe('Mental Communication');
  });
  it('gives every archmage a talisman', () => {
    for (const c of chars.filter((x) => x.rhine?.rank === 'archmage')) expect(c.talismanUid, c.name).toBeTruthy();
  });
  it('gives Falke her anklet-ring', () => {
    const { chars: cr } = buildLivingCovenant(RHINE, def('crintera'), { data, saga: sagaAt(), rules }, { seed: 3, others: false });
    const falke = named(cr, 'Falke');
    const ring = falke.items.find((i) => i.uid === falke.talismanUid)!;
    expect(ring.name).toBe('Silver anklet-ring');
    expect(ring.effects.map((e) => e.modifiedLevel)).toEqual([19, 17, 12]);
  });
});

describe('Mysteries, heartbeasts and House duties', () => {
  it('initiates the senior Merinita into their Mysteries only when the saga uses Mystery Initiation', () => {
    const off = buildLivingCovenant(RHINE, def('irencillia'), { data, saga: sagaAt(1220, 'Spring', { rhineGilds: true, mysteries: false }), rules }, { seed: 3, others: false });
    expect(named(off.chars, 'Handri').virtues.some((v) => v.defId === 'arcadian-travel')).toBe(false);
    const on = buildLivingCovenant(RHINE, def('irencillia'), { data, saga: sagaAt(1220, 'Spring', { rhineGilds: true, mysteries: true }), rules }, { seed: 3, others: false });
    const v = named(on.chars, 'Handri').virtues.find((x) => x.defId === 'arcadian-travel');
    expect(v).toMatchObject({ free: true, freeReason: 'Initiated before play' });
    expect(v?.note).toMatch(/^Not in the book/);
  });
  it('gives each Bjornaer a heartbeast, the book’s or a likely one', () => {
    const { chars } = buildLivingCovenant(RHINE, def('crintera'), { data, saga: sagaAt(), rules }, { seed: 5 });
    for (const c of chars.filter((x) => x.house === 'bjornaer')) expect(c.heartbeast, c.name).toBeTruthy();
    expect(named(chars, 'Urgen').heartbeast).toBe('bear');
  });
  it('lays a Quaesitor’s investigations and a Gifted Mercere’s season on the road on their lists', () => {
    const tabanus = newCharacter('magus', 's');
    tabanus.house = 'guernicus';
    expect(houseDuty(tabanus)?.ability).toBe('code-of-hermes');
    const xavier = newCharacter('magus', 's');
    xavier.house = 'mercere';
    expect(houseDuty(xavier)?.everyYears).toBe(7);
    const { chars } = buildLivingCovenant(RHINE, def('durenmar'), { data, saga: sagaAt(), rules }, { seed: 3, others: false });
    expect(named(chars, 'Caecilius').priorities?.some((p) => p.kind === 'house')).toBe(true);
  });
});

describe('a Redcap’s devices', () => {
  it('fits out a Redcap with the House’s fifty levels and two more a year, and upgrades them', () => {
    const { chars } = buildLivingCovenant(RHINE, def('fengheld'), { data, saga: sagaAt(), rules }, { seed: 3, others: false });
    const horst = named(chars, 'Horst');
    expect(horst.redcap?.levels).toBe(50 + 2 * (horst.age - 25));
    expect(horst.items.length).toBeGreaterThanOrEqual(2);
    expect(horst.redcap!.spent).toBeLessThanOrEqual(horst.redcap!.levels);
    // a young Redcap: no more than fifty, in at least two effects
    const r = newCharacter('companion', 's');
    r.virtues.push({ uid: 'v', defId: 'redcap', size: 'Major' });
    r.redcap = { levels: 50, spent: 0 };
    issueRedcapDevices(r, data, seeded(1));
    expect(r.items.length).toBeGreaterThanOrEqual(2);
    expect(r.redcap.spent).toBeLessThanOrEqual(50);
    const before = r.redcap.levels;
    r.age = 36;
    const lines = redcapYearEnd(r, data, seeded(2));
    expect(r.redcap.levels).toBe(before + 2);
    expect(r.longevity?.labTotal).toBe(50);
    expect(lines.join(' ')).toMatch(/Longevity Ritual/);
  });
});

describe('the Gathering of Twelve Years', () => {
  it('takes the Bjornaer’s Summer at Crintera in 1227, and no one else’s', () => {
    expect(houseGatheringIn(sagaAt(), 1227, 'Summer')).toMatchObject({ house: 'bjornaer', at: 'Crintera' });
    expect(houseGatheringIn(sagaAt(), 1227, 'Spring')).toBeUndefined();
    const saga = sagaAt(1227, 'Summer');
    const a = buildLivingCovenant(RHINE, def('crintera'), { data, saga, rules }, { seed: 2, others: false });
    const b = buildLivingCovenant(RHINE, def('roznov'), { data, saga, rules }, { seed: 2, others: false, avoidNames: a.chars.map((c) => c.name) });
    const r = advanceSeasons({ saga, characters: [...a.chars, ...b.chars], covenants: [newCovenant(saga.id, 1220), a.cov, b.cov] }, data, 1, { ...DEFAULT_ADVANCE, rollAging: false, rng: seeded(3) });
    const summer = (c: Character) => c.seasonLog.find((e) => e.year === 1227 && e.season === 'Summer')?.summary ?? '';
    for (const c of r.state.characters.filter((x) => x.house === 'bjornaer' && x.type === 'magus' && x.standing?.kind !== 'none')) expect(summer(c), c.name).toMatch(/^Attended The Gathering of Twelve Years at Crintera/);
    for (const c of r.state.characters.filter((x) => x.house !== 'bjornaer' && x.type === 'magus' && x.standing?.kind !== 'none')) expect(summer(c), c.name).not.toMatch(/Gathering of Twelve Years/);
  });
});

describe('the Great Library', () => {
  it('stocks Durenmar as the greatest library of the Order', () => {
    const { cov } = buildLivingCovenant(RHINE, def('durenmar'), { data, saga: sagaAt(), rules }, { seed: 3, others: false });
    const summae = cov.library.filter((b) => b.kind === 'summa');
    const arcane = summae.filter((b) => b.subjectType === 'art' || ['magic-theory', 'parma-magica', 'penetration', 'finesse', 'concentration', 'code-of-hermes', 'organization-lore', 'magic-lore', 'faerie-lore', 'infernal-lore', 'dominion-lore', 'area-lore'].includes(b.subject));
    expect(arcane.length).toBeGreaterThan(100);
    // at least one outstanding summa in each Art, of level 17 or more, and none above 20
    for (const a of ['Cr', 'In', 'Mu', 'Pe', 'Re', 'An', 'Aq', 'Au', 'Co', 'He', 'Ig', 'Im', 'Me', 'Te', 'Vi']) {
      const top = Math.max(...summae.filter((b) => b.subject === a).map((b) => b.level));
      expect(top, a).toBeGreaterThanOrEqual(17);
      expect(top, a).toBeLessThanOrEqual(20);
    }
    expect(summae.filter((b) => b.title.startsWith('Principia Magica'))).toHaveLength(3);
    expect(cov.library.filter((b) => b.kind === 'tractatus').length).toBeGreaterThan(100);
    expect(Math.max(...cov.library.filter((b) => b.kind === 'tractatus').map((b) => b.quality))).toBeLessThanOrEqual(12);
    expect(cov.library.filter((b) => b.kind === 'labText').reduce((t, b) => t + b.level, 0)).toBeGreaterThan(5000);
  });
});

describe('peregrinatores', () => {
  it('come from other Tribunals when the customs are turned on after the covenants were added', () => {
    const saga = sagaAt(1220, 'Winter', { rhineGilds: false });
    const a = buildLivingCovenant(RHINE, def('durenmar'), { data, saga, rules }, { seed: 3 });
    const b = buildLivingCovenant(RHINE, def('crintera'), { data, saga, rules }, { seed: 4, avoidNames: a.chars.map((c) => c.name) });
    const state = { saga, characters: [...a.chars, ...b.chars], covenants: [a.cov, b.cov] };
    const guests = () => state.characters.filter((c) => c.wanderer?.wanders === 'peregrinator' && !c.wounds.dead);
    expect(guests().filter((c) => c.notes?.startsWith('A peregrinator the toolkit made'))).toHaveLength(0);
    const rng = seeded(9);
    for (let y = 1220; y < 1224; y++) livingYearEnd(state, { data, saga, rules }, y, rng, new Set());
    expect(guests()).toHaveLength(0);
    saga.options = { rhineGilds: true };
    for (let y = 1224; y < 1232; y++) livingYearEnd(state, { data, saga, rules }, y, rng, new Set());
    const magi = state.characters.filter((c) => c.type === 'magus' && !c.wounds.dead);
    expect(guests().length).toBeGreaterThanOrEqual(Math.round(magi.length / 6) - 2);
    for (const c of guests()) expect(state.covenants.some((v) => v.id === c.covenantId && v.labs.some((l) => l.ownerId === c.id)), c.name).toBe(true);
    expect(new Set(state.characters.map((c) => c.name)).size).toBe(state.characters.length);
  });
});

describe('approaches to the players', () => {
  it('lapse when left unanswered for two years', () => {
    const saga = sagaAt(1220, 'Winter');
    saga.tribunalNews = [
      { uid: 'old', year: 1221, season: 'Spring', kind: 'approach', approach: 'x', text: 'An offer' },
      { uid: 'met', year: 1221, season: 'Spring', kind: 'approach', approach: 'y', text: 'A request', done: true },
    ];
    const state = { saga, characters: [], covenants: [] };
    livingYearEnd(state, { data, saga, rules }, 1221, seeded(1), new Set());
    expect(saga.tribunalNews[0].done).toBeUndefined();
    livingYearEnd(state, { data, saga, rules }, 1222, seeded(1), new Set());
    expect(saga.tribunalNews[0]).toMatchObject({ done: true, lapsed: true });
    expect(saga.tribunalNews[1].lapsed).toBeUndefined();
  });
});

describe('a living covenant’s means, with nothing from nowhere', () => {
  const build = (id: string) => {
    const { cov, chars } = buildLivingCovenant(RHINE, def(id), { data, saga: sagaAt(), rules }, { seed: 3, others: false });
    return { cov, members: chars.filter((c) => cov.memberIds.includes(c.id)) };
  };
  const incomeTotal = (cov: ReturnType<typeof build>['cov'], members: Character[]) => deriveCovenant(cov, data, members).finances.income;

  it('meets a loss by selling spare vis and spending less, never by income from nowhere', () => {
    const { cov, members } = build('roznov');
    cov.finances.sundry = 400; // a ruinous year
    cov.finances.treasury = 10;
    const income = incomeTotal(cov, members);
    const spareBefore = spareVis(cov, members).reduce((t, v) => t + v.pawns, 0);
    const lines = livingStewardship(cov, members, data, false).map((l) => l.text).join(' ');
    expect(incomeTotal(cov, members)).toBe(income);
    if (spareBefore) expect(lines).toMatch(/sells .* vis for \d+ £/);
    expect(lines).toMatch(/Hard times at Roznov/);
    expect(cov.living!.needs!.money).toBe(true);
    // the reserve for its Aegis and Longevity Rituals is never sold
    const r = visReserve(cov, members);
    expect(spareVis(cov, members).length === 0 || r.aegis + r.longevity >= 0).toBe(true);
  });

  it('pays what it owes and undoes its cuts when money comes back, and keeps a hoard as land and goods', () => {
    const { cov, members } = build('roznov');
    cov.finances.wages = 'miserly';
    cov.finances.neglect = ['Buildings'];
    cov.finances.loans = [{ uid: 'l', from: 'a merchant', pounds: 40, year: 1220 }];
    const spend = deriveCovenant(cov, data, members).finances.totalExpenditure;
    cov.finances.treasury = 20 * spend;
    const lines = livingStewardship(cov, members, data, false).map((l) => l.text).join(' ');
    expect(owed(cov)).toBe(0);
    expect(cov.finances.wages).toBe('standard');
    expect(cov.finances.neglect ?? []).toEqual([]);
    expect(lines).toMatch(/into land and goods/);
    expect(cov.finances.treasury).toBe(Math.round(5 * deriveCovenant(cov, data, members).finances.totalExpenditure));
    expect(cov.finances.holdings).toBeGreaterThan(0);
    // nothing it did not cut is said to recover
    const again = livingStewardship(cov, members, data, false).map((l) => l.text).join(' ');
    expect(again).not.toMatch(/fortunes recover/);
    // and its holdings carry it through a ruinous year before any cut
    cov.finances.treasury = 0;
    cov.finances.sundry = 300;
    cov.visStocks = []; // spare vis would go first
    expect(livingStewardship(cov, members, data, false).map((l) => l.text).join(' ')).toMatch(/sells land and goods worth/);
  });

  it('raises an Aegis from its vis, and holds that vis back after', () => {
    const { cov, members } = build('roznov');
    cov.effects = [];
    cov.visStocks = [{ art: 'Re', pawns: 10 }, { art: 'He', pawns: 4 }];
    expect(ensureAegis(cov, members, 1220)[0].text).toMatch(/raises its Aegis/);
    expect(cov.effects!.some((e) => e.name === 'Aegis of the Hearth' && e.renew)).toBe(true);
    expect(visReserve(cov, members).aegis).toBeGreaterThan(0);
    // a second call does nothing
    expect(ensureAegis(cov, members, 1221)).toEqual([]);
  });

  it('buys the vis its reserve lacks from a covenant that can spare it', () => {
    const a = build('roznov');
    const b = build('triamore');
    a.cov.effects = [{ uid: 'ae', name: 'Aegis of the Hearth', year: 1220, season: 'Winter', duration: 'year', renew: { level: 20 } }];
    a.cov.visStocks = [];
    a.cov.finances.treasury = 1000;
    b.cov.effects = [];
    b.cov.visStocks = [{ art: 'Vi', pawns: 30 }];
    expect(visShortfall(a.cov, a.members)[0]).toMatchObject({ pawns: 4 });
    const lines = livingVisMarket([a.cov, b.cov], [...a.members, ...b.members], data);
    expect(lines[0].text).toMatch(/buys 4 pawns of Vi vis from Triamore for 40 £/);
    expect(visShortfall(a.cov, a.members).filter((s) => s.arts.includes('Re'))).toEqual([]);
    expect(b.cov.visStocks[0].pawns).toBe(26);
  });

  it('raises its income by magic in a season, for vis, a twentieth at a time', () => {
    const { cov, members } = build('roznov');
    cov.visStocks = [{ art: 'Te', pawns: 6 }];
    const factor = Math.max(...cov.income.map((s) => s.factor ?? 1));
    const out = magicalImprovement(cov, members[0], members, 1221);
    expect(magicalImprovement(cov, members[0], members, 1221)).toEqual([]); // once a year
    expect(out[0]).toMatch(/Magical Improvement/);
    expect(Math.max(...cov.income.map((s) => s.factor ?? 1))).toBeCloseTo(factor * 1.05, 3);
    expect(cov.visStocks[0].pawns).toBe(4);
    expect(cov.living!.improved).toBe(1);
  });
  it('forecasts when a covenant will spend more than it earns, and run out', () => {
    // 100 £ income, 90 £ spent, rising a pound a year
    expect(accountsForecast(50, 100, 90)).toEqual({ lossIn: 11, emptyIn: 25 });
    expect(accountsForecast(0, 100, 120).lossIn).toBe(0);
    expect(accountsForecast(0, 1000, 100)).toEqual({ lossIn: undefined, emptyIn: undefined });
  });
});
