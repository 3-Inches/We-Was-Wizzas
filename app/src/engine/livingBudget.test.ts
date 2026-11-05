// The Tribunal book's covenants bought with Build Points by the players' rules (Covenants ch.2): a
// power level from what they hold, no higher than their age allows; libraries, vis by the magus,
// enchanted devices of their own and a treasury, all costed; and nothing gained in play counted
// against them.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { RHINE } from '../data/livingCovenants/rhine';
import { newSaga } from '../store/store';
import { POWER_LEVELS, deriveCovenant, newCovenant } from './covenant';
import { deriveLab, newLab } from './lab';
import { buildLivingCovenant } from './living';
import { VIS_PER_MAGUS, livingBudget, powerLevelForAge } from './livingBudget';
import { stockLibrary } from './generate/library';
import { covenantItems } from './generate/covenantItems';
import { seeded } from './generate/random';
import { advanceSeasons, DEFAULT_ADVANCE } from './time';
import { DEFAULT_HOUSE_RULES } from './types';

const data = buildGameData();
const rules = DEFAULT_HOUSE_RULES;
const def = (id: string) => RHINE.covenants.find((c) => c.id === id)!;
const saga = () => {
  const s = newSaga('Built');
  s.tribunal = 'Rhine';
  s.currentYear = 1220;
  s.options = { rhineGilds: true };
  return s;
};
const order = POWER_LEVELS.map((p) => p.level);
const built = new Map<string, ReturnType<typeof buildLivingCovenant>>();
const build = (id: string, seed = 3) => {
  const k = `${id}:${seed}`;
  if (!built.has(k)) built.set(k, buildLivingCovenant(RHINE, def(id), { data, saga: saga(), rules }, { seed }));
  return built.get(k)!;
};

describe('the power level and Build Points of a Tribunal covenant', () => {
  it('allows no higher a power level than its age (Covenants ch.2: a minimum age for each)', () => {
    expect([0, 9, 10, 49, 50, 99, 100, 450].map(powerLevelForAge)).toEqual(['Low', 'Low', 'Medium', 'Medium', 'High', 'High', 'Legendary', 'Legendary']);
    // Heorot, five years old, is held to Low whatever it holds
    const b = livingBudget({ ...def('heorot'), library: 'great', vis: 'very rich', wealth: 'very rich' }, 12, 1220, seeded(1));
    expect(b.ageCap).toBe('Low');
    expect(b.total).toBeLessThanOrEqual(300);
  });

  it('spends every Build Point by the rules, at a power level within its range and its age, with nothing to put right', () => {
    for (const d of RHINE.covenants) {
      const { cov, chars } = build(d.id);
      const dc = deriveCovenant(cov, data, chars);
      const pl = POWER_LEVELS.find((p) => p.level === cov.powerLevel)!;
      expect(dc.bpSpent, d.name).toBe(cov.buildPoints);
      expect(cov.buildPoints, d.name).toBeGreaterThanOrEqual(pl.min);
      expect(cov.buildPoints, d.name).toBeLessThanOrEqual(pl.max);
      expect(order.indexOf(cov.powerLevel), d.name).toBeLessThanOrEqual(order.indexOf(powerLevelForAge(1220 - d.founded)));
      expect(dc.issues, d.name).toEqual([]);
      // its laboratories as the rules have them: a refined one's space holds Virtues, not the Empty Flaw
      for (const l of cov.labs) expect(deriveLab(l, data).issues, `${d.name}: ${l.name}`).toEqual([]);
      // the library, the vis and the treasury are bought, not given
      for (const k of ['Library', 'Vis', 'Money']) expect(dc.bpLines.filter((l) => l.category === k).reduce((t, l) => t + l.cost, 0), `${d.name} ${k}`).toBeGreaterThan(0);
    }
  }, 120_000);

  it('makes Durenmar Legendary by its Great Library, and the others what they hold', () => {
    const levels = Object.fromEntries(RHINE.covenants.map((d) => [d.id, build(d.id).cov.powerLevel]));
    expect(levels).toMatchObject({ durenmar: 'Legendary', heorot: 'Low', crintera: 'High', irencillia: 'High', dankmar: 'Medium', triamore: 'Medium', waddenzee: 'Medium' });
    const dur = build('durenmar');
    const lib = deriveCovenant(dur.cov, data, dur.chars).bpLines.filter((l) => l.category === 'Library').reduce((t, l) => t + l.cost, 0);
    expect(lib).toBeGreaterThan(5000);
    expect(dur.cov.buildPoints).toBeGreaterThan(Math.max(...RHINE.covenants.filter((d) => d.id !== 'durenmar').map((d) => build(d.id).cov.buildPoints)));
    // its books from the book are bought, but not held to the founding limits on Quality
    expect(dur.cov.library.every((b) => b.fromBook === RHINE.title && !b.inPlay)).toBe(true);
  }, 120_000);
});

describe('what a Tribunal covenant buys', () => {
  it('has vis by the magus as the core rules reckon it (DE p.218)', () => {
    for (const d of RHINE.covenants) {
      const { cov, chars } = build(d.id);
      const magi = chars.filter((c) => c.type === 'magus' && !c.wanderer).length;
      const pawns = cov.visSources.reduce((t, s) => t + s.pawnsPerYear, 0);
      expect(pawns / magi, d.name).toBeGreaterThanOrEqual(VIS_PER_MAGUS[d.vis] * 0.8);
      expect(pawns / magi, d.name).toBeLessThanOrEqual(VIS_PER_MAGUS[d.vis] * 1.2);
      expect(cov.visSources.every((s) => !s.inPlay), d.name).toBe(true);
    }
  }, 120_000);

  it('has a library for its magi and those to come, with a collection of its Laboratory Texts', () => {
    for (const id of ['crintera', 'irencillia', 'fengheld']) {
      const { cov } = build(id);
      expect(cov.library.filter((b) => b.kind !== 'mundane').length, id).toBeGreaterThan(25);
      expect(cov.library.some((b) => b.kind === 'labText' && b.subject === 'various' && b.level >= 100), id).toBe(true);
    }
  }, 120_000);

  it('has enchanted devices of its own that do the covenfolk’s work, and items installed in its labs', () => {
    for (const id of ['fengheld', 'irencillia', 'oculus-septentrionalis']) {
      const { cov, chars } = build(id);
      const pl = POWER_LEVELS.find((p) => p.level === cov.powerLevel)!;
      expect(cov.items.length, id).toBeGreaterThan(3);
      expect(cov.items.some((it) => it.serves), id).toBe(true);
      expect(cov.items.every((it) => it.effects.every((e) => e.modifiedLevel <= pl.maxItemLevel)), id).toBe(true);
      const installed = cov.labs.flatMap((l) => l.virtues.filter((v) => v.fromItem));
      expect(installed.length, id).toBeGreaterThan(0);
      for (const v of installed) expect(cov.items.some((it) => it.uid === v.fromItem), id).toBe(true);
      // the devices save the covenant money: a pound a magnitude (Covenants ch.5, Cost Saving)
      const f = deriveCovenant(cov, data, chars).finances;
      if (cov.items.some((it) => it.serves === 'pounds')) expect(f.savings.some((x) => /Enchanted devices at work/.test(x.label) && x.pounds < 0), id).toBe(true);
    }
    // a Low covenant's devices are of level 25 or lower
    const cov = newCovenant('s', 1220);
    cov.powerLevel = 'Low';
    cov.covenfolk.grogs = 4;
    cov.labs = [newLab('A lab')];
    const r = covenantItems(cov, [], 200, 25, seeded(2));
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.items.every((it) => it.effects[0].modifiedLevel <= 25)).toBe(true);
  });

  it('varies from one covenant to the next, by its seed', () => {
    const a = build('irencillia', 3);
    const b = build('irencillia', 11);
    expect(a.cov.items.map((i) => i.name).join()).not.toBe(b.cov.items.map((i) => i.name).join());
    expect(a.cov.buildPoints).not.toBe(b.cov.buildPoints);
  }, 120_000);

  it('buys a Low covenant no Laboratory Text above level 25', () => {
    const cov = newCovenant('s', 1220);
    cov.powerLevel = 'Low';
    const r = stockLibrary(cov, [], { data, rules }, 300, { arts: true, abilities: true, labTexts: true, mundane: false, labShare: 0.4, collection: true }, seeded(4));
    const texts = r.books.filter((b) => b.kind === 'labText');
    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) expect(t.subject === 'various' ? t.collectionMax : t.level).toBeLessThanOrEqual(25);
  });
});

describe('play does not count against the Build Points', () => {
  it('leaves a lab Virtue installed in play out of the lab’s Build Points', () => {
    const lab = newLab('A lab');
    lab.virtues.push({ uid: 'v', defId: 'extensive-stores' });
    const bought = deriveLab(lab, data).buildPoints;
    lab.virtues[0].inPlay = true;
    expect(deriveLab(lab, data).buildPoints).toBeLessThan(bought);
  });

  it('keeps a Tribunal covenant within its Build Points after a year of play', () => {
    const b = buildLivingCovenant(RHINE, def('triamore'), { data, saga: saga(), rules }, { seed: 7 });
    const r = advanceSeasons({ saga: saga(), characters: b.chars, covenants: [b.cov] }, data, 4, { ...DEFAULT_ADVANCE, rng: seeded(3) });
    const cov = r.state.covenants.find((c) => c.id === b.cov.id)!;
    const dc = deriveCovenant(cov, data, r.state.characters);
    expect(dc.bpSpent).toBeLessThanOrEqual(cov.buildPoints);
    expect(dc.issues.filter((i) => /Build Points|power range/.test(i))).toEqual([]);
  }, 120_000);
});
