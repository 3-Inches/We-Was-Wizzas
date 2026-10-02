// Covenant and laboratory rules raised in playtesting: lab Virtues that depend on a helper or a choice,
// Safety and space, income from Boons and Hooks, tithes and Tithing Miracles, Build Point pools,
// the Exceptional Book, craftsmen and cost saving, and starting limits for specialists.

import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { computeFinances, deriveCovenant, newCovenant, optimalLaborers } from './covenant';
import { CRAFTS, canBeUnknown, computeIncome, receivedAfterTithe } from './covenantRules';
import { deriveLab, labContextOf, newLab } from './lab';
import { labTotal } from './magic';
import { deriveCharacter } from './character/derive';
import { newCharacter, setHouse } from './character/factory';
import { DEFAULT_HOUSE_RULES } from './types';
import type { Covenant, CovenantHookBoon, Laboratory, Specialist } from './types';
import { migrateCovenant } from '../store/migrate';

const data = buildGameData();
let n = 0;
const hb = (name: string, kind: 'hook' | 'boon', size: 'Major' | 'Minor', extra: Partial<CovenantHookBoon> = {}): CovenantHookBoon => {
  const def = data.hooksBoons.find((h) => h.kind === kind && h.size === size && h.name === name);
  return { uid: `hb${n++}`, defId: def?.id, name, kind, size, ...extra };
};
const lab = (...ids: (string | [string, Partial<Laboratory['virtues'][number]>])[]): Laboratory => {
  const l = newLab('Lab');
  for (const x of ids) {
    const [defId, extra] = typeof x === 'string' ? [x, {}] : x;
    l.virtues.push({ uid: `v${n++}`, defId, ...extra });
  }
  return l;
};
const craftsman = (craft: string, score: number, count = 1, extra: Partial<Specialist> = {}): Specialist => ({
  uid: `c${n++}`, name: craft, role: 'craftsman', ability: `Craft (${craft})`, craft, score, count, free: true, ...extra,
});

describe('laboratory Virtues that need a number or a choice', () => {
  it('lets Magical Heating and Lighting work as the Superior or Excessive version without Upkeep', () => {
    const sup = deriveLab(lab('magical-heating', 'magical-lighting'), data);
    expect(sup.characteristics.Upkeep).toBe(0);
    expect(sup.characteristics.Health).toBe(1);
    expect(sup.characteristics.Aesthetics).toBe(2);
    expect(sup.specializations).toMatchObject({ Ig: 1, Im: 1, Texts: 1 });
    const exc = deriveLab(lab(['magical-heating', { alt: 'excessive' }], ['magical-lighting', { alt: 'excessive' }]), data);
    expect(exc.characteristics.Upkeep).toBe(0);
    expect(exc.characteristics.Safety).toBe(-1);
    expect(exc.specializations).toMatchObject({ Ig: 2, Im: 2 });
  });
  it('takes the creature or helper numbers for Guardian, Horde, Servant and Assistant', () => {
    const l = lab(['greater-guardian', { inputs: { int: 3 } }], ['servant', { inputs: { int: 3 } }], ['assistant', { inputs: { int: 2, mt: 4 } }]);
    l.size = 3;
    const d = deriveLab(l, data);
    expect(d.parts.Safety.find((p) => p.label === 'Greater Guardian')?.value).toBe(3);
    expect(d.parts.Safety.find((p) => p.label === 'Servant')?.value).toBe(2); // half of 3, rounded up
    expect(d.characteristics['General Quality']).toBe(6);
    expect(d.characteristics.Warping).toBe(1);
  });
  it('applies conditions only while they hold', () => {
    expect(deriveLab(lab('relocation'), data).characteristics.Warping).toBe(1);
    expect(deriveLab(lab(['relocation', { toggles: { constant: false } }]), data).characteristics.Warping).toBe(0);
    expect(deriveLab(lab(['diminutive-flaw', { toggles: { big: false } }]), data).characteristics.Safety).toBe(0);
    expect(deriveLab(lab(['empty-flaw', { alt: 'health' }]), data).characteristics).toMatchObject({ Upkeep: 0, Health: -1, Aesthetics: -1 });
    expect(deriveLab(lab(['studio', { inputs: { aes: 2 } }]), data).characteristics.Aesthetics).toBe(2);
    expect(deriveLab(lab('flawless-tools'), data).characteristics.Upkeep).toBe(1);
  });
  it('explains Safety: Expansions add equipment, not Size, and fill space', () => {
    const d = deriveLab(lab(['greater-expansion', { choice: { Spells: 2 } }]), data);
    expect(d.size).toBe(0);
    expect(d.occupiedSize).toBe(3);
    expect(d.characteristics.Safety).toBe(-3);
    expect(d.parts.Safety[0].label).toMatch(/Occupied Size 3/);
    const roomy = lab(['greater-expansion', { choice: { Spells: 2 } }]);
    roomy.refinement = 3;
    expect(deriveLab(roomy, data).characteristics.Safety).toBe(3);
  });
});

describe('income from Boons and Hooks (Covenants ch.5)', () => {
  it('upgrades sources with Wealth and adds them with Secondary Income', () => {
    const c = newCovenant('s', 1220);
    c.hooksBoons = [hb('Wealth', 'boon', 'Major'), hb('Wealth', 'boon', 'Minor'), hb('Secondary Income', 'boon', 'Minor')];
    c.income.push({ uid: 'i2', name: 'Second', type: 'Trade', level: 'Typical', pounds: 100 });
    const r = computeIncome(c, 6);
    expect(r.lines.map((l) => l.level)).toEqual(['Legendary', 'Greater']);
    expect(r.income).toBe(1250);
    expect(r.issues).toEqual([]);
  });
  it('sets every source a covenant like the playtest one has: three Legendary sources from three Major Wealth and two Secondary Income', () => {
    const c = newCovenant('s', 1220);
    c.hooksBoons = [...[1, 2, 3].map(() => hb('Wealth', 'boon', 'Major')), hb('Secondary Income', 'boon', 'Minor'), hb('Secondary Income', 'boon', 'Minor')];
    c.income = ['a', 'b', 'c'].map((u) => ({ uid: u, name: u, type: 'Trade', level: 'Legendary' as const, pounds: 1000 }));
    const r = computeIncome(c, 6);
    expect(r.lines.map((l) => [l.origin, l.level])).toEqual([['base', 'Legendary'], ['secondary', 'Legendary'], ['secondary', 'Legendary']]);
    expect(r.issues).toEqual([]);
  });
  it('flags a source the Boons do not allow', () => {
    const c = newCovenant('s', 1220);
    c.income.push({ uid: 'i2', name: 'Second', type: 'Trade', level: 'Typical', pounds: 100 });
    const r = computeIncome(c, 6);
    expect(r.issues[0].message).toMatch(/2 income sources come from the base covenant/);
    r.issues[0].fix!(c);
    expect(computeIncome(c, 6).issues).toEqual([]);
  });
  it('applies Poverty, Natural Disaster and Indebted', () => {
    const c = newCovenant('s', 1220);
    c.hooksBoons = [hb('Poverty', 'hook', 'Minor')];
    expect(computeIncome(c, 6).income).toBe(40);
    c.hooksBoons = [hb('Natural Disaster', 'hook', 'Minor', { active: true }), hb('Indebted', 'hook', 'Minor')];
    const r = computeIncome(c, 6);
    expect(r.income).toBe(50);
    expect(r.debt).toBe(13);
    c.hooksBoons = [hb('Poverty', 'hook', 'Major')];
    expect(computeIncome(c, 6).income).toBe(0);
  });
  it('tithes a tenth and the Tithing Miracle multiplies what is tithed, rounding up what the covenant gets', () => {
    expect(receivedAfterTithe(1000, true, true, 1.8).received).toBe(1800);
    expect(receivedAfterTithe(1000, true, false, 1.8).received).toBe(900);
    expect(receivedAfterTithe(1, true, true, 1.8).received).toBe(2);
    expect(receivedAfterTithe(1, true, false, 1.8).received).toBe(1);
    expect(receivedAfterTithe(7, false, false, 1.8).received).toBe(7);
    const c = newCovenant('s', 1220);
    c.hooksBoons = [hb('Tithing Miracles', 'boon', 'Major')];
    c.income[0].tithed = true;
    c.income[0].miracle = true;
    c.finances.miracleMultiplier = 2.5;
    expect(computeIncome(c, 6).income).toBe(250);
    c.visSources = [{ uid: 'v', name: 'Spring', art: 'Vi', pawnsPerYear: 3, tithed: true, miracle: true }];
    expect(deriveCovenant(c, data, []).visIncome.Vi).toBe(8); // 3 × 2.5 = 7.5, rounded up
  });
});

describe('Hooks that may be Unknown', () => {
  it('allows Unknown only where the Hook says so', () => {
    const def = (name: string, size: 'Major' | 'Minor') => data.hooksBoons.find((h) => h.kind === 'hook' && h.size === size && h.name === name);
    expect(canBeUnknown(def('Flawed Resource', 'Minor'))).toBe(true);
    expect(canBeUnknown(def('Poverty', 'Minor'))).toBe(true);
    expect(canBeUnknown(def('Regional Produce', 'Minor'))).toBe(false);
    const c = newCovenant('s', 1220);
    c.hooksBoons = [hb('Regional Produce', 'hook', 'Minor', { unknown: true })];
    expect(deriveCovenant(c, data, []).issues.some((i) => /cannot be Unknown/.test(i))).toBe(true);
  });
});

describe('Build Point pools: Hidden, Flawed and Illusory Resources', () => {
  const base = (): Covenant => {
    const c = newCovenant('s', 1220);
    c.library = [{ uid: 'b1', title: 'Summa', kind: 'summa', subjectType: 'art', subject: 'Cr', level: 15, quality: 15, language: 'Latin' }];
    c.visSources = [{ uid: 'v1', name: 'Pool', art: 'Aq', pawnsPerYear: 10 }];
    return c;
  };
  it('pays for tied resources from the Hook, not the covenant', () => {
    const c = base();
    c.hooksBoons = [hb('Flawed Resource', 'hook', 'Minor', { resources: ['b1', 'v1'] })];
    const d = deriveCovenant(c, data, []);
    expect(d.bpSpent).toBe(0);
    expect(d.pools[0].spent).toBe(80);
    expect(d.visIncome.Aq).toBe(10);
  });
  it('loses the resources when the story fails, and keeps up to half when it succeeds', () => {
    const c = base();
    c.hooksBoons = [hb('Flawed Resource', 'hook', 'Minor', { resources: ['b1', 'v1'], outcome: 'lost' })];
    expect(deriveCovenant(c, data, []).visIncome.Aq).toBeUndefined();
    c.hooksBoons[0].outcome = 'saved';
    c.hooksBoons[0].kept = ['v1'];
    const d = deriveCovenant(c, data, []);
    expect(d.visIncome.Aq).toBe(10);
    expect(d.issues.some((i) => /saves at most half/.test(i))).toBe(true); // 50 of 80 kept
  });
  it('gives nothing from Illusory Resources, and flags a pool over 250 BP', () => {
    const c = base();
    c.visSources[0].pawnsPerYear = 60;
    c.hooksBoons = [hb('Illusory Resources', 'hook', 'Minor', { resources: ['v1'] })];
    const d = deriveCovenant(c, data, []);
    expect(d.visIncome.Aq).toBeUndefined();
    expect(d.issues.some((i) => /holds 250/.test(i))).toBe(true);
  });
  it('gives the Exceptional Book free, within its limits', () => {
    const c = newCovenant('s', 1220);
    const boon = hb('Exceptional Book', 'boon', 'Major');
    c.hooksBoons = [boon];
    c.library = [{ uid: 'x', title: 'Best', kind: 'summa', subjectType: 'art', subject: 'Cr', level: 20, quality: 15, language: 'Latin', boonUid: boon.uid }];
    let d = deriveCovenant(c, data, []);
    expect(d.bpSpent).toBe(0);
    expect(d.issues.some((i) => /Exceptional Book/.test(i))).toBe(false);
    c.library[0].quality = 20;
    d = deriveCovenant(c, data, []);
    expect(d.issues.some((i) => /level \+ quality must be 35/.test(i))).toBe(true);
  });
});

describe('craftsmen and cost saving (Covenants ch.5)', () => {
  const semita = () => {
    // Semita Errabunda's craftsmen, laborers and writers (Covenants ch.5)
    const c = newCovenant('s', 1220);
    c.covenfolk = { grogs: 20, companions: 4, specialists: 2, craftsmen: 0, laborers: 40, servants: 16, teamsters: 0, dependents: 5, horses: 6 };
    c.specialists = [
      { uid: 'sc', name: 'Scribes', role: 'scribe', ability: 'Profession: Scribe', score: 5, count: 2, free: true },
      craftsman('carpenter', 6, 2), craftsman('thatcher', 6), craftsman('furniture-maker', 6),
      craftsman('blacksmith', 6), craftsman('candlemaker', 6), craftsman('tinker', 6), craftsman('cobbler', 6),
      craftsman('brewer', 6, 2), craftsman('bookbinder', 4), craftsman('illuminator', 4),
    ];
    return c;
  };
  it('saves up to each craft\'s limit per category, as in the Semita Errabunda example', () => {
    const f = computeFinances(semita(), [], [], 5);
    const cat = Object.fromEntries(f.categories.map((x) => [x.category, x.saved]));
    expect(cat.Buildings).toBe(16);
    expect(cat.Consumables).toBe(16);
    expect(cat.Provisions).toBe(48); // 40 from laborers + 8 from brewers
    expect(f.writersCount).toBe(9);
  });
  it('lets carpenters save in Buildings first and then Consumables', () => {
    const c = newCovenant('s', 1220);
    c.covenfolk = { ...c.covenfolk, grogs: 60 };
    c.specialists = [craftsman('carpenter', 6, 3)];
    const f = computeFinances(c, [], [], 6);
    const carp = f.crafts.find((x) => x.craft.id === 'carpenter')!;
    expect(carp.potential).toBe(12);
    expect(carp.applied[0].category).toBe('Buildings');
    expect(carp.applied[0].pounds).toBe(carp.applied[0].limit);
    expect(carp.applied[1].pounds).toBeGreaterThan(0);
    expect(CRAFTS.find((x) => x.id === 'carpenter')!.categories).toEqual(['Buildings', 'Consumables']);
  });
  it('finds the number of laborers that keeps spending lowest', () => {
    const c = semita();
    const best = optimalLaborers(c, [], []);
    const cost = (k: number) => { const x = structuredClone(c); x.covenfolk.laborers = k; return computeFinances(x, [], [], 5).totalExpenditure; };
    expect(cost(best)).toBeLessThanOrEqual(cost(best + 1));
    expect(cost(best)).toBeLessThanOrEqual(cost(Math.max(0, best - 1)));
    expect(cost(best)).toBeLessThan(cost(0));
    c.season = 'Summer';
    expect(optimalLaborers(c, [], [])).toBe(0); // 2 points each: they cost more than they save
  });
  it('holds bought specialists to the starting limits', () => {
    const c = newCovenant('s', 1220);
    c.specialists = [{ uid: 't', name: 'Tutor', role: 'teacher', ability: 'Latin', score: 10, teaching: 10, com: 5 }];
    const d = deriveCovenant(c, data, []);
    expect(d.bpSpent).toBe(25);
    expect(d.issues.filter((i) => /Tutor/.test(i))).toHaveLength(3);
    c.specialists[0].age = 46;
    c.specialists[0].score = 9;
    c.specialists[0].teaching = 9;
    c.specialists[0].com = 3;
    expect(deriveCovenant(c, data, []).issues.filter((i) => /Tutor/.test(i))).toHaveLength(0);
  });
  it('moves craft savings from older files to craftsmen', () => {
    const c = newCovenant('s', 1220);
    c.covenfolk.craftsmen = 5;
    c.finances.craftSavings = [{ uid: 'o', craft: 'Carpenter', category: 'Buildings', score: 6, rare: false }];
    const m = migrateCovenant(c);
    expect(m.finances.craftSavings).toEqual([]);
    expect(m.specialists[0]).toMatchObject({ role: 'craftsman', craft: 'carpenter', free: true });
    expect(m.covenfolk.craftsmen).toBe(4);
  });
});

describe('lab notes from the playtest covenant', () => {
  it('makes Missing Equipment rule out the chosen work, at most twice', () => {
    const one = lab(['missing-equipment-flaw', { alt: 'Texts' }]);
    const dl = deriveLab(one, data);
    expect(dl.impossible).toEqual(['Texts']);
    expect(dl.characteristics.Upkeep).toBe(-1);
    expect(deriveLab(lab('missing-equipment-flaw'), data).issues.some((i) => /choose which lab work/.test(i))).toBe(true);
    const pair = deriveLab(lab(['missing-equipment-flaw', { alt: 'Familiar+Longevity Rituals' }], ['missing-equipment-flaw', { alt: 'Spells' }]), data);
    expect(pair.impossible).toEqual(['Familiar', 'Longevity Rituals', 'Spells']);
    expect(pair.issues.filter((i) => /Missing Equipment/.test(i))).toEqual([]);
    const three = deriveLab(lab(['missing-equipment-flaw', { alt: 'Items' }], ['missing-equipment-flaw', { alt: 'Spells' }], ['missing-equipment-flaw', { alt: 'Texts' }]), data);
    expect(three.issues.some((i) => /more than twice/.test(i))).toBe(true);
    // the Lab Total says the work cannot be done here
    const c = newCharacter('magus', 's1');
    setHouse(c, data, 'bonisagus', 0);
    const d = deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
    expect(labTotal(d, { technique: 'Cr', form: 'Ig' }, { activity: 'spells', lab: labContextOf(pair) }).impossible).toBe(true);
    expect(labTotal(d, { technique: 'Cr', form: 'Ig' }, { activity: 'items', lab: labContextOf(pair) }).impossible).toBe(false);
  });
  it('lets a Boundless lab grow to hold its Virtues, at no Build Point cost', () => {
    const full = lab('superior-equipment', 'spacious', 'superior-tools', 'opulent');
    const tight = deriveLab(full, data);
    expect(tight.issues.some((i) => /exceed space/.test(i))).toBe(true);
    const roomy = deriveLab({ ...full, virtues: [...full.virtues, { uid: 'b', defId: 'boundless' }] }, data);
    expect(roomy.issues.filter((i) => /exceed space/.test(i))).toEqual([]);
    expect(roomy.size).toBe(roomy.occupiedSize);
    expect(roomy.characteristics.Warping).toBe(2);
    expect(roomy.buildPoints).toBe(tight.buildPoints);
  });
});
