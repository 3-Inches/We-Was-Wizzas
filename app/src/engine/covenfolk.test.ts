// The covenfolk beyond the head count: soldiers and their pay, yearly events and the feast cycle's
// Loyalty, who counts among the inhabitants, the officers' Loyalty, the Guild Hook and guild ranks,
// craft magic, the specialists' year of experience, and the covenant fill-out that buys it all.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { addGuildAbilities, deriveCovenant, homeCovenant, newCovenant } from './covenant';
import { DEFAULT_YEAR_END, applyYearEnd, planYearEnd } from './covenantYear';
import { specialistCost } from './covenantRules';
import {
  covenfolkYearEnd, craftMagicFigures, guildShortfalls, newSoldierGroup, officerLoyalty, stressChance, suggestedGuildRank, weaponArmorEstimate, yearlyEventPounds,
} from './covenfolk';
import { fillCovenant } from './generate/covenant';
import { buildTestSaga } from './testing/sagaFixture';
import { DEFAULT_HOUSE_RULES, type CraftMagicUse, type Specialist } from './types';
import { TECHNIQUES } from '../data';

const data = buildGameData();
const spec = (o: Partial<Specialist>): Specialist => ({ uid: Math.random().toString(36).slice(2), name: 'X', role: 'specialist', ability: '', score: 5, ...o });
const fin = (c: ReturnType<typeof newCovenant>) => deriveCovenant(c, data, []).finances;

describe('the dice for craft magic', () => {
  it('reckons a stress roll’s chances: a 0 risks a botch, a 1 doubles', () => {
    // need 2 or more: every face but the 0 (and a 1 always doubles to 4 or more)
    expect(stressChance(10, 12, 1).success).toBeCloseTo(0.9, 5);
    // already there: only a botch fails (a 0 then a 0 on the one botch die)
    expect(stressChance(12, 12, 1).success).toBeCloseTo(0.99, 5);
    // need 10: no face reaches it on its own; a 1 then 5 or more, or a 1, a 1 and 3 or more (0.1 × (0.6 + 0.1 × 0.9))
    expect(stressChance(0, 10, 1).success).toBeCloseTo(0.069, 5);
  });
  it('saves a pound a magnitude for a spell cast over and over, five each Ritual casting', () => {
    const u: CraftMagicUse = { uid: 'u', name: 'Mystical Carpenter', technique: 'Re', form: 'He', level: 25, taskEase: 6, span: 'day', castsPerYear: 180, active: true };
    const f = craftMagicFigures(u, 5);
    expect(f.ease).toBe(9);
    expect(f.saving).toBe(5);
    expect(craftMagicFigures({ ...u, ritual: true, castsPerYear: 2 }, 5).saving).toBe(50);
    expect(craftMagicFigures({ ...u, span: 'season' }, 5).ease).toBe(15);
    expect(craftMagicFigures({ ...u, active: false }, 5).saving).toBe(0);
  });
});

describe('soldiers, horses and the year', () => {
  it('pays and houses the soldiers a Boon brings', () => {
    const c = newCovenant('s', 1220);
    const before = fin(c);
    c.finances.soldiers = [newSoldierGroup('veteran', 10), newSoldierGroup('cavalry', 4), newSoldierGroup('peasants', 30)];
    const after = fin(c);
    // veterans a penny a day each; cavalry unpaid, with a horse each; peasants live at home
    expect(after.soldiers.pennies).toBe(10);
    expect(after.soldiers.inhabitants).toBe(14);
    expect(after.soldiers.horses).toBe(4);
    expect(after.inhabitantPoints).toBeGreaterThan(before.inhabitantPoints + 14);
    expect(after.expenditures.find((e) => e.label === 'Wages')!.pounds).toBeGreaterThan(before.expenditures.find((e) => e.label === 'Wages')!.pounds + 10);
  });
  it('works out the weapons and armor from the grogs and the soldiers', () => {
    const c = newCovenant('s', 1220);
    c.covenfolk.grogs = 10;
    c.finances.soldiers = [newSoldierGroup('veteran', 5)];
    expect(weaponArmorEstimate(c, [], data).total).toBe(10 * 32 + 5 * 32);
    c.finances.equipment = 'inexpensive';
    expect(weaponArmorEstimate(c, [], data).total).toBe(10 * 8 + 5 * 32);
  });
  it('costs feasts by the hundred fed, and a cycle of four earns a Loyalty point each year', () => {
    expect(yearlyEventPounds({ id: 'feasts', count: 4 }, 200)).toBe(4);
    expect(yearlyEventPounds({ id: 'redcaps', count: 4 }, 200)).toBe(2);
    const c = newCovenant('s', 1220);
    c.finances.yearly = [{ id: 'feasts', count: 4 }];
    expect(fin(c).expenditures.some((e) => e.label === 'Yearly events and guests')).toBe(true);
    const dc = deriveCovenant(c, data, []);
    const plan = planYearEnd(c, dc, DEFAULT_YEAR_END);
    expect(plan.feasts).toBe(true);
    const was = c.loyalty.actionPoints;
    applyYearEnd(c, plan, 1220, DEFAULT_YEAR_END);
    expect(c.loyalty.actionPoints).toBe(was + 1);
    // the yearly events stay; sundry is cleared
    expect(c.finances.yearly).toHaveLength(1);
  });
});

describe('who counts and who pays', () => {
  it('counts personal servants as specialists at no Build Points, and leaves agents out', () => {
    const c = newCovenant('s', 1220);
    c.covenfolk.specialists = 0;
    const base = fin(c).inhabitantPoints;
    c.specialists.push(spec({ role: 'personal-servant', score: 4 }), spec({ role: 'agent', score: 6 }));
    expect(fin(c).inhabitantPoints).toBeGreaterThanOrEqual(base + 2);
    expect(fin(c).inhabitantPoints).toBeLessThan(base + 4 + 1);
    expect(specialistCost(c.specialists[0])).toBe(0);
    expect(specialistCost(c.specialists[1])).toBe(6);
  });
  it('lets magi live poorer for fewer points, and leaves out members who pay their own way', () => {
    const st = buildTestSaga(data, { seed: 3 });
    const cov = st.covenants[0];
    const pts = () => deriveCovenant(cov, data, st.characters).finances.inhabitantPoints;
    const full = pts();
    cov.finances.magiLiving = 'pauper';
    expect(pts()).toBeLessThan(full);
    cov.finances.magiLiving = undefined;
    const magus = st.characters.find((c) => c.type === 'magus' && cov.memberIds.includes(c.id))!;
    cov.finances.ownUpkeep = [magus.id];
    expect(pts()).toBeLessThan(full);
  }, 120_000);
  it('gives an autocrat the Loyalty of both the steward and the chamberlain', () => {
    const a = spec({ role: 'autocrat', name: 'Aldo', chars: { Pre: 1 }, abilities: [{ id: 'profession-type', param: 'Steward', score: 6 }, { id: 'profession-type', param: 'Chamberlain', score: 5 }] });
    const parts = officerLoyalty(a);
    expect(parts.map((p) => p.value)).toEqual([7, 6]);
  });
});

describe('the Guild Hook and guild ranks', () => {
  it('lists the guild’s demands, and on strike the laborers and craftsmen save nothing', () => {
    const c = newCovenant('s', 1220);
    c.covenfolk.laborers = 10;
    c.specialists.push(spec({ role: 'craftsman', craft: 'carpenter', score: 6, name: 'Carpenter', guildRank: 'master' }));
    c.hooksBoons.push({ uid: 'g', name: 'Guild', kind: 'hook', size: 'Minor' });
    c.finances.wages = 'miserly';
    const dc = deriveCovenant(c, data, []);
    expect(dc.issues.some((i) => /guild \(Guild Hook\).*wages are miserly/.test(i))).toBe(true);
    expect(dc.finances.savings.length).toBeGreaterThan(0);
    c.hooksBoons[0].active = true;
    const strike = deriveCovenant(c, data, []);
    expect(strike.finances.strike).toBe(true);
    expect(strike.finances.savings.filter((s) => /Laborers|Carpenter/.test(s.label))).toHaveLength(0);
  });
  it('gives craftsmen a rank by age and Craft, and the Abilities it needs', () => {
    expect(suggestedGuildRank(18, 3)).toBe('apprentice');
    expect(suggestedGuildRank(25, 5)).toBe('journeyman');
    expect(suggestedGuildRank(35, 6)).toBe('master');
    expect(suggestedGuildRank(45, 7)).toBe('senior');
    expect(suggestedGuildRank(55, 8)).toBe('dean');
    const s = spec({ role: 'craftsman', craft: 'carpenter', score: 6, age: 35, guildRank: 'master', abilities: [{ id: 'craft-type', param: 'Carpenter', score: 6 }] });
    expect(guildShortfalls(s)).toEqual(['Guild Lore 2', 'Bargain 3', 'Artes Liberales 1']);
    addGuildAbilities(s);
    expect(guildShortfalls(s)).toEqual([]);
    // the cost stays the Craft score: the guild's Abilities are lower
    expect(specialistCost(s)).toBe(6);
  });
  it('flags craftsmen without a rank while the Guild Hook holds', () => {
    const c = newCovenant('s', 1220);
    c.specialists.push(spec({ role: 'craftsman', craft: 'carpenter', score: 6, age: 35, name: 'Hans' }));
    c.hooksBoons.push({ uid: 'g', name: 'Guild', kind: 'hook', size: 'Minor' });
    const dc = deriveCovenant(c, data, []);
    const i = dc.issueList.find((x) => /Hans: the covenfolk's guild/.test(x.message))!;
    expect(i).toBeTruthy();
    const fix = i.fixes.find((f) => f.kind === 'apply')!;
    if (fix.kind === 'apply') fix.apply(c);
    expect(c.specialists[0].guildRank).toBe('master');
    expect(deriveCovenant(c, data, []).issueList.some((x) => /Hans/.test(x.message))).toBe(false);
  });
});

describe('a year for the specialists', () => {
  it('gives a teacher Exposure for teaching and Practice for the rest, and keeps what they were bought for', () => {
    const c = newCovenant('s', 1220);
    const t = spec({ role: 'teacher', teaching: 5, chars: { Com: 2 }, abilities: [{ id: 'dead-language', param: 'Latin', score: 6 }, { id: 'artes-liberales', score: 4 }], taught: { year: 1220, seasons: 2 } });
    c.specialists.push(t);
    const cost = specialistCost(t);
    covenfolkYearEnd(c, 1220);
    // two seasons taught: 4 xp toward Teaching 6 (30 xp); two free seasons of Practice on the lesser Ability
    expect(t.teachingXp).toBe(4);
    expect(t.abilities![1].xp).toBe(8);
    expect(specialistCost(t)).toBe(cost);
    expect(t.boughtFor).toBe(cost);
    // a few years on, the lesser Ability has risen and the cost has not
    for (let y = 1221; y < 1226; y++) ((t.taught = { year: y, seasons: 2 }), covenfolkYearEnd(c, y));
    expect(t.abilities![1].score).toBeGreaterThan(4);
    expect(specialistCost(t)).toBe(cost);
    expect(deriveCovenant(c, data, []).issues.some((i) => /above the starting limit/.test(i))).toBe(false);
  });
  it('gives craftsmen Exposure in their Craft and Labor Points for their workshop', () => {
    const c = newCovenant('s', 1220);
    const k = spec({ role: 'craftsman', craft: 'carpenter', score: 8, chars: { Dex: 2 }, abilities: [{ id: 'craft-type', param: 'Carpenter', score: 8 }] });
    c.specialists.push(k);
    covenfolkYearEnd(c, 1220);
    // (Dex 2 + Craft 8) × 3 × 2 seasons − 36 upkeep
    expect(k.workshop?.laborPoints).toBe(24);
    expect(k.abilities![0].xp).toBeGreaterThan(0);
    c.folkAdvance = false;
    expect(covenfolkYearEnd(c, 1221)).toEqual([]);
  });
});

describe('the covenant fill-out', () => {
  const fillAll = (seed: number) => {
    const st = buildTestSaga(data, { seed });
    const magi = st.characters.filter((c) => c.type === 'magus');
    const cov = newCovenant(st.saga.id, 1220);
    cov.name = 'Filled';
    cov.memberIds = magi.map((m) => m.id);
    const vet = data.hooksBoons.find((h) => /veteran fighters/i.test(h.name))!;
    cov.hooksBoons.push({ uid: 'vf', defId: vet.id, name: vet.name, kind: 'boon', size: 'Minor' });
    cov.hooksBoons.push({ uid: 'fr', name: 'Flawed Resource', kind: 'hook', size: 'Minor', earmark: ['specialist', 'book'] });
    const ex = { uid: 'xb', name: 'Exceptional Book', kind: 'boon' as const, size: 'Minor' as const };
    cov.hooksBoons.push(ex);
    cov.library.push({ uid: 'ex', title: 'Magnificent Creo', kind: 'summa', subjectType: 'art', subject: 'Cr', level: 20, quality: 15, language: 'Latin', boonUid: 'xb' });
    const r = fillCovenant(cov, st.characters, { data, saga: st.saga, rules: DEFAULT_HOUSE_RULES }, {
      staff: true, teacher: true, goodTeacher: true, craftsmen: true, bookmakers: true, drill: true, soldiers: true, horses: true, gear: true, yearly: true, grogs: 3, counts: true, bought: true,
      library: { arts: true, abilities: true, labTexts: true, mundane: true, share: 0.5 }, rest: 'split', seed,
    });
    return { r, st, dc: deriveCovenant(r.cov, data, [...st.characters, ...r.grogs.map((g) => g.c)]) };
  };
  it('covers the Covenfolk page and spends every Build Point', () => {
    const { r, dc } = fillAll(9);
    expect(dc.bpSpent).toBeLessThanOrEqual(r.cov.buildPoints);
    expect(r.cov.buildPoints - dc.bpSpent).toBeLessThan(5);
    const roles = new Set(r.cov.specialists.map((s) => s.role));
    for (const role of ['steward', 'chamberlain', 'turb-captain', 'scribe', 'teacher', 'drill-sergeant', 'sergeant', 'craftsman']) expect(roles, role).toContain(role);
    expect(r.cov.specialists.some((s) => s.craft === 'bookbinder')).toBe(true);
    expect(r.cov.specialists.some((s) => s.craft === 'illuminator')).toBe(true);
    // carpenters first: they save in both Buildings and Consumables
    expect(r.cov.specialists.some((s) => s.craft === 'carpenter')).toBe(true);
    expect(r.cov.finances.soldiers?.[0].count).toBe(10);
    expect(r.cov.covenfolk.horses).toBeGreaterThan(0);
    expect(r.cov.finances.weaponArmorPoints).toBe(weaponArmorEstimate(r.cov, dc.members, data).total);
    expect(r.cov.finances.yearly?.find((e) => e.id === 'feasts')?.count).toBe(4);
    expect(r.cov.visSources.length + r.cov.visStocks.length).toBeGreaterThan(0);
    // the Flawed Resource paid for some of it, and says what
    const pool = dc.pools.find((p) => p.hb.uid === 'fr')!;
    expect(pool.resources.length).toBeGreaterThan(0);
    expect(pool.spent).toBeLessThanOrEqual(250);
  }, 300_000);
  it('hires a teacher of several Abilities at one score, and books across Techniques and Forms', () => {
    const { r } = fillAll(4);
    const t = r.cov.specialists.find((s) => s.role === 'teacher')!;
    expect(t.abilities!.length).toBeGreaterThanOrEqual(3);
    expect(new Set(t.abilities!.map((a) => a.score)).size).toBe(1);
    expect(t.goodTeacher).toBe(true);
    const summae = r.cov.library.filter((b) => b.kind === 'summa' && b.subjectType === 'art');
    expect(summae.some((b) => (TECHNIQUES as readonly string[]).includes(b.subject))).toBe(true);
    // nothing on Creo, the Exceptional Book covers it to Level 20
    expect(summae.filter((b) => b.subject === 'Cr' && !b.boonUid)).toHaveLength(0);
    // every summa at the best Quality its Level allows
    for (const b of summae.filter((x) => !x.boonUid)) expect(b.quality, b.title).toBe(Math.min(22, 31 - b.level));
    // Lab Texts spread: no Technique or Form more than twice
    const texts = r.cov.library.filter((b) => b.kind === 'labText' && b.spell);
    const per = new Map<string, number>();
    for (const b of texts) for (const a of [b.spell!.technique, b.spell!.form]) per.set(a, (per.get(a) ?? 0) + 1);
    for (const [a, n] of per) expect(n, a).toBeLessThanOrEqual(2);
  }, 300_000);
  it('gives craftsmen guild ranks and meets the guild’s demands under the Guild Hook', () => {
    const st = buildTestSaga(data, { seed: 6 });
    const cov = newCovenant(st.saga.id, 1220);
    cov.memberIds = st.characters.filter((c) => c.type === 'magus').map((m) => m.id);
    cov.hooksBoons.push({ uid: 'g', name: 'Guild', kind: 'hook', size: 'Minor' });
    cov.finances.wages = 'miserly';
    const r = fillCovenant(cov, st.characters, { data, saga: st.saga, rules: DEFAULT_HOUSE_RULES }, { staff: false, teacher: false, craftsmen: true, grogs: 0, counts: true, bought: true, seed: 2 });
    const crafts = r.cov.specialists.filter((s) => s.role === 'craftsman');
    expect(crafts.length).toBeGreaterThan(0);
    for (const k of crafts) expect(guildShortfalls(k), k.name).toEqual([]);
    expect(r.cov.finances.pension).toBe(true);
    expect(r.cov.finances.wages).toBe('standard');
    expect(deriveCovenant(r.cov, data, st.characters).issues.filter((i) => /guild/i.test(i))).toEqual([]);
  }, 300_000);
  it('fills the covenant chosen, from its own members, and starts at the one with the most magi', () => {
    const st = buildTestSaga(data, { seed: 5 });
    const empty = newCovenant(st.saga.id, 1220);
    empty.name = 'Empty abbey';
    const covs = [empty, ...st.covenants];
    expect(homeCovenant(covs, st.characters)?.id).toBe(st.covenants[0].id);
    const r = fillCovenant(empty, st.characters, { data, saga: st.saga, rules: DEFAULT_HOUSE_RULES }, { staff: true, teacher: true, craftsmen: false, grogs: 0, counts: true, bought: true, seed: 1 });
    expect(r.cov.id).toBe(empty.id);
    expect(r.cov.memberIds).toEqual([]);
  }, 300_000);
});

describe('the spell list', () => {
  it('leaves out enchanted-item headings the extractor took for spells, and title-cases capitals', () => {
    expect(data.spells.some((s) => /^(Invested \d|Enchanted Item\b)/.test(s.name))).toBe(false);
    expect(data.spells.find((s) => /regio skin/i.test(s.name))?.name).toBe('Penetrate the Regio Skin');
  });
});
