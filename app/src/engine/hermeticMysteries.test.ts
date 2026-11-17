// The Mysteries (Revised Edition): Laboratory Horoscopes, periapts, Hermetic and Philosophic Alchemy,
// the Lesser and Great Elixirs, and the small calculations of divination, theurgy and numerology.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { addVirtue, newCharacter, ensureAbility } from './character/factory';
import { deriveCharacter } from './character/derive';
import { newProject, planProject, workProject } from './projects';
import { DEFAULT_HOUSE_RULES, type Character, type LabProject } from './types';
import { newItem, newEffect } from '../ui/items/ItemEditor';
import { alchemyYield, elixirLevel, empowerment, grantMight, greatElixirTest, ingredientPoints, invokedSpirit, longevityModifier, rollHoroscope, roteTotals } from './hermeticMysteries';
import { newSeasonEntry } from './longterm';

const data = buildGameData();
const ctx = { aura: { realm: 'Magic' as const, strength: 5 } };
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
/** a die that always shows this face (0 to 9) */
const face = (f: number) => () => f / 10 + 0.01;

function magus(): Character {
  const c = newCharacter('magus', 's');
  c.characteristics.Int = 3;
  c.characteristics.Sta = 2;
  c.arts.Cr = { apprenticeship: 55 }; // 10
  c.arts.Vi = { apprenticeship: 55 };
  c.arts.Ig = { apprenticeship: 21 }; // 6
  c.arts.Co = { apprenticeship: 55 };
  ensureAbility(c, 'magic-theory', { apprenticeship: 75 }); // 5
  ensureAbility(c, 'artes-liberales', { apprenticeship: 50 }).specialty = 'astronomy'; // 4, +1 astronomy
  c.purse = { pounds: 0, vis: [{ art: 'Vi', pawns: 40 }, { art: 'Cr', pawns: 20 }] };
  c.age = 50;
  return c;
}
const logSeason = (c: Character) => c.seasonLog.push(newSeasonEntry(1220, 'Spring', 'other', 'Lab', {}));

describe('Hermetic Astrology', () => {
  it('a Laboratory Horoscope adds its bonus on Intelligence + Astronomy + stress die against 3 × the bonus', () => {
    const c = magus();
    addVirtue(c, data, 'planetary-magic', 'Minor');
    const dc = d(c);
    // Int 3 + Artes Liberales 4 + astronomy specialty 1 = 8; a 7 makes 15 against 12
    expect(rollHoroscope(dc, 4, face(7)).bonus).toBe(4);
    expect(rollHoroscope(dc, 5, face(5)).bonus).toBe(0); // 13 against 15
    const botch = rollHoroscope(dc, 3, face(0));
    expect(botch.botched).toBe(true);
  });
  it('Planetary Magic only for an enchantment; Celestial Magic for any lab work, its bonus off the vis to open a device', () => {
    const c = magus();
    addVirtue(c, data, 'planetary-magic', 'Minor');
    const ex = { ...newProject('extract'), horoscope: 2 };
    c.projects = [ex];
    // no horoscope roll for vis extraction with Planetary Magic: the season's Lab Total is the plain one
    workProject(c, d(c), ctx, undefined, ex.uid, data, 1220, { rng: face(9) });
    expect(ex.results ?? []).toEqual([]);
    addVirtue(c, data, 'celestial-magic', 'Major');
    const it = { ...newItem('invested'), material: 'silver', size: 'small' } as ReturnType<typeof newItem>;
    c.items.push(it);
    const open = { ...newProject('open'), itemUid: it.uid, horoscope: 3 };
    c.projects.push(open);
    const plain = planProject(open, c, d(c), ctx).vis!.pawns;
    expect(planProject(open, c, d(c), ctx, { horoscope: 3 }).vis!.pawns).toBe(Math.max(1, plain - 3));
    const before = c.purse!.vis.find((v) => v.art === 'Vi')!.pawns;
    const lines = workProject(c, d(c), ctx, undefined, open.uid, data, 1220, { rng: face(9) });
    expect(lines.join(' ')).toMatch(/Laboratory Horoscope for \+3/);
    expect(before - c.purse!.vis.find((v) => v.art === 'Vi')!.pawns).toBe(Math.max(1, plain - 3));
  });
  it('a botched Laboratory Horoscope wastes the season', () => {
    const c = magus();
    addVirtue(c, data, 'planetary-magic', 'Minor');
    addVirtue(c, data, 'celestial-magic', 'Major');
    const p = { ...newProject('invent'), technique: 'Cr' as const, form: 'Vi' as const, level: 10, name: 'Test', horoscope: 2 };
    c.projects = [p];
    const lines = workProject(c, d(c), ctx, undefined, p.uid, data, 1220, { rng: face(0) });
    expect(lines.join(' ')).toMatch(/season is wasted working to faulty alignments/);
    expect(p.progress).toBe(0);
  });
  it('a periapt has a charge for every 5 points of the whole Lab Total, its effect held to 5 × Astronomy', () => {
    const c = magus();
    addVirtue(c, data, 'periapt', 'Minor');
    const it = newItem('charged');
    const e = { ...newEffect(), technique: 'Cr' as const, form: 'Co' as const, modifiedLevel: 20, pending: true, name: 'Heal' };
    it.effects.push(e);
    c.items.push(it);
    const p = { ...newProject('instill'), itemUid: it.uid, effectUid: e.uid, periapt: true };
    c.projects = [p];
    const plan = planProject(p, c, d(c), ctx);
    const lt = plan.total!.total; // Cr 10 + Co 10 + Int 3 + MT 5 + aura 5 = 33
    expect(plan.problems).toEqual([]);
    expect(plan.summary).toMatch(new RegExp(`^${Math.ceil(lt / 5)} charges`));
    workProject(c, d(c), ctx, undefined, p.uid, data, 1220, { rng: face(9) });
    expect(c.items[0].charges).toBe(Math.ceil(lt / 5));
    // over 5 × Astronomy (25): refused
    const big = { ...newEffect(), technique: 'Cr' as const, form: 'Co' as const, modifiedLevel: 30, pending: true };
    it.effects.push(big);
    const q = { ...newProject('instill'), itemUid: it.uid, effectUid: big.uid, periapt: true };
    expect(planProject(q, c, d(c), ctx).problems.join(' ')).toMatch(/no higher than 5 × Artes Liberales \(astronomy\): 25/);
  });
});

describe('Hermetic and Philosophic Alchemy', () => {
  it('a vessel’s Shape and Material bonus adds (to Magic Theory), and Form vis comes a pawn for every 20 points', () => {
    const c = magus();
    addVirtue(c, data, 'hermetic-alchemy', 'Minor');
    const p: LabProject = { ...newProject('extract'), alchemy: { sm: 8 } };
    c.projects = [p];
    const vim = planProject(p, c, d(c), ctx);
    expect(vim.total!.total).toBe(10 + 10 + 3 + 5 + 5 + 5); // the +8 held to Magic Theory 5
    expect(vim.gain).toBe(4);
    p.alchemy = { sm: 4, form: 'Ig' };
    const ig = planProject(p, c, d(c), ctx);
    expect(ig.total!.total).toBe(10 + 6 + 3 + 5 + 5 + 4); // Vim held to Ignem 6, the requisite
    expect(ig.gain).toBe(alchemyYield(ig.total!.total, 'Ig'));
    workProject(c, d(c), ctx, undefined, p.uid, data, 1220);
    expect(c.purse!.vis.find((v) => v.art === 'Ig')?.pawns).toBe(2);
  });
  it('without Hermetic Alchemy a vessel is refused', () => {
    const c = magus();
    const p = { ...newProject('extract'), alchemy: { sm: 3 } };
    expect(planProject(p, c, d(c), ctx).problems.join(' ')).toMatch(/Hermetic Alchemy/);
  });
  it('Minor Philosophic Alchemy digests beside other lab work for four seasons in a row, the lowest Lab Total counting', () => {
    const c = magus();
    addVirtue(c, data, 'hermetic-alchemy', 'Minor');
    addVirtue(c, data, 'philosophic-alchemy', 'Minor');
    const ex = { ...newProject('extract'), name: 'Digesting', alchemy: { automatic: true } };
    const inv = { ...newProject('invent'), technique: 'Cr' as const, form: 'Vi' as const, level: 30, name: 'Long spell' };
    c.projects = [ex, inv];
    const vimBefore = c.purse!.vis.find((v) => v.art === 'Vi')!.pawns;
    for (let i = 0; i < 4; i++) {
      const lines = workProject(c, d(c), ctx, undefined, inv.uid, data, 1220 + i);
      if (i < 3) expect(lines.join(' ')).toMatch(/digesting, season \d of 4/);
      else expect(lines.join(' ')).toMatch(/digestion is done: 4 pawns of Vim/);
      logSeason(c);
    }
    expect(c.purse!.vis.find((v) => v.art === 'Vi')!.pawns).toBe(vimBefore + 4);
    expect(inv.progress).toBeGreaterThan(0);
  });
  it('a season away from the lab breaks the digestion, and experimenting spoils it', () => {
    const c = magus();
    addVirtue(c, data, 'hermetic-alchemy', 'Minor');
    addVirtue(c, data, 'philosophic-alchemy', 'Minor');
    const ex: LabProject = { ...newProject('extract'), alchemy: { automatic: true } };
    const inv = { ...newProject('invent'), technique: 'Cr' as const, form: 'Vi' as const, level: 30, name: 'Long spell' };
    c.projects = [ex, inv];
    workProject(c, d(c), ctx, undefined, inv.uid, data, 1220);
    logSeason(c);
    logSeason(c); // a season out of the lab
    expect(workProject(c, d(c), ctx, undefined, inv.uid, data, 1221).join(' ')).toMatch(/broke the digestion/);
    logSeason(c);
    inv.experiment = { risk: 0 };
    expect(workProject(c, d(c), ctx, undefined, inv.uid, data, 1222, { rng: face(5) }).join(' ')).toMatch(/experimenting while it digests/);
    expect(ex.alchemy!.totals).toEqual([]);
  });
  it('Major Philosophic Alchemy makes ready-opened spaces in a season, counted off the vis when the item is opened', () => {
    const c = magus();
    addVirtue(c, data, 'hermetic-alchemy', 'Minor');
    addVirtue(c, data, 'philosophic-alchemy', 'Major');
    const it = { ...newItem('invested'), material: 'silver', size: 'small' } as ReturnType<typeof newItem>;
    c.items.push(it);
    const ex = { ...newProject('extract'), alchemy: { automatic: true, itemUid: it.uid } };
    c.projects = [ex];
    workProject(c, d(c), ctx, undefined, ex.uid, data, 1220);
    expect(ex.done).toBe(true);
    expect(c.items[0].alchemyOpened).toBe(4);
    expect(c.items[0].openedPawns).toBe(4);
    const open = { ...newProject('open'), itemUid: it.uid };
    c.projects.push(open);
    const plan = planProject(open, c, d(c), ctx);
    const full = planProject({ ...open, pawns: -1 }, c, d(c), ctx);
    expect(full.vis!.pawns - plan.vis!.pawns).toBe(4);
  });
});

describe('the Lesser and Great Elixirs', () => {
  it('ingredients add Elixir Points (doubled for an own find, each held to Magic Theory); the level adds to the ritual', () => {
    expect(ingredientPoints(4, false, 5)).toBe(4);
    expect(ingredientPoints(3, true, 5)).toBe(5);
    expect(elixirLevel(12, 5)).toBe(4); // the book's example: 3 + 4 + 5
    expect(elixirLevel(55, 6)).toBe(6);
    const c = magus();
    addVirtue(c, data, 'hermetic-alchemy', 'Minor');
    addVirtue(c, data, 'the-lesser-elixir', 'Minor');
    c.longevity = { labTotal: 75, bonus: 15, extraVis: 0 };
    const p = { ...newProject('elixir'), ingredient: { name: 'bloodstone', bonus: 4 } };
    c.projects = [p];
    const plan = planProject(p, c, d(c), ctx);
    expect(plan.problems).toEqual([]);
    expect(plan.vis!.pawns).toBe(10); // a dose for age 50
    workProject(c, d(c), ctx, undefined, p.uid, data, 1220);
    expect(c.longevity.elixir).toEqual({ points: 4, level: 2, ingredients: [{ name: 'bloodstone', points: 4 }] });
    expect(longevityModifier(c.longevity)).toBe(17);
  });
  it('the Great Elixir: simple die + Stamina + Elixir Level + earlier attempts against age / 10', () => {
    const c = magus();
    c.longevity = { labTotal: 75, bonus: 15, extraVis: 0, elixir: { points: 6, level: 3, ingredients: [] } };
    c.greatElixir = { attempts: 2 };
    const t = greatElixirTest(c, d(c), face(0)); // a 10
    expect(t.ease).toBe(5);
    expect(t.total).toBe(10 + 2 + 3 + 2);
    expect(t.ok).toBe(true);
    expect(grantMight(50)).toBe(15);
  });
});

describe('spirits, theurgy and numerology', () => {
  it('Hermetic Empowerment: twice the Might must reach the level; a fifth of it drained', () => {
    expect(empowerment(15, 30)).toEqual({ ok: true, drained: 6 });
    expect(empowerment(10, 25).ok).toBe(false);
  });
  it('an invoked spirit casts at Might + aura, no die; a Form spirit at half', () => {
    expect(invokedSpirit(20, 3, 30, { addedLevels: 5 })).toEqual({ total: 23, casts: true, penetration: 3 });
    expect(invokedSpirit(20, 3, 30, { ofForm: true }).total).toBe(12);
  });
  it('a rote: Stamina + Arts + Arithmetic + book + aura, halved', () => {
    const c = magus();
    const r = roteTotals(d(c), 10, 10, 4, 5);
    expect(r.casting).toBe(2 + 10 + 10 + 4 + 4 + 5);
    expect(r.total).toBe(Math.ceil(r.casting / 2));
  });
  it('the Rote Lab Total / 5 is rounded up: a Lab Total of 28 allows a level 6 rote', () => {
    const r = roteTotals(d(magus()), 8, 8, 0, 0); // 8 + 8 + Int 3 + Magic Theory 5 + Arithmetic 4
    expect(r.labTotal).toBe(28);
    expect(r.maxLevel).toBe(6);
  });
  it('Arithmetic adds to the Rote Lab Total only up to Magic Theory', () => {
    const c = magus();
    ensureAbility(c, 'magic-theory').xp = { apprenticeship: 15 }; // 2
    const r = roteTotals(d(c), 8, 8, 0, 0);
    expect(r.arith).toBe(4);
    expect(r.labArith).toBe(2);
    expect(r.labTotal).toBe(8 + 8 + 3 + 2 + 2);
    expect(r.casting).toBe(2 + 8 + 8 + 4); // the casting score keeps the whole Arithmetic
  });
});
