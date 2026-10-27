// Lab work under the lab's own rules (DE, The Laboratory and Arcane Experimentation; Covenants,
// Laboratories): what its Flaws rule out or halve, experimenting on any project that allows it, the
// lab's Safety and Warping each season, Longevity Rituals and familiars as season-long projects.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newCharacter, ensureAbility } from './character/factory';
import { deriveCharacter } from './character/derive';
import { deriveLab, newLab } from './lab';
import { newProject, planProject, renewLongevity, renewLongevityCost, workProject } from './projects';
import { lapseLongevity } from './longterm';
import { DEFAULT_HOUSE_RULES, type Character, type LabVirtueEntry } from './types';
import { newEffect, newItem } from '../ui/items/ItemEditor';
import type { CharacterContext } from './context';

const data = buildGameData();
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
const aura = { realm: 'Magic' as const, strength: 3 };
/** a die that always shows this face (0–9) */
const face = (f: number) => () => (f + 0.5) / 10;
/** dice that show these faces in turn, then the last one */
const seq = (...faces: number[]) => {
  let i = 0;
  return () => (faces[Math.min(i++, faces.length - 1)] + 0.5) / 10;
};

function magus(): Character {
  const c = newCharacter('magus', 's');
  c.name = 'Maga';
  c.characteristics.Int = 3;
  for (const a of ['Cr', 'Co', 'Re', 'An', 'Vi', 'Te'] as const) c.arts[a] = { apprenticeship: 55 }; // 10 each
  ensureAbility(c, 'magic-theory', { apprenticeship: 75 }); // 5
  c.purse = { pounds: 0, vis: [{ art: 'Vi', pawns: 30 }, { art: 'Cr', pawns: 10 }, { art: 'An', pawns: 10 }, { art: 'Re', pawns: 10 }] };
  return c;
}

function ctxWith(virtues: Omit<LabVirtueEntry, 'uid'>[] = [], mods: Record<string, number> = {}, specs: Record<string, number> = {}): CharacterContext {
  const lab = newLab('Test lab');
  lab.virtues = virtues.map((v, i) => ({ uid: `v${i}`, ...v }));
  lab.customMods = mods;
  lab.customSpecs = specs;
  return { aura, lab: deriveLab(lab, data) } as CharacterContext;
}

describe("a lab's Flaws", () => {
  it('rule out the work they forbid, on every project of that kind', () => {
    const c = magus();
    const ctx = ctxWith([{ defId: 'missing-equipment-flaw', alt: 'Longevity Rituals+Vis Extraction' }, { defId: 'restriction-flaw', alt: 'forbids Spells' }]);
    expect(ctx.lab!.impossible).toEqual(['Longevity Rituals', 'Vis Extraction', 'Spells']);
    for (const kind of ['extract', 'longevity'] as const) {
      const p = newProject(kind);
      c.projects = [p];
      expect(planProject(p, c, d(c), ctx).problems[0]).toMatch(/cannot be used for (Vis Extraction|Longevity Rituals)/);
      expect(workProject(c, d(c), ctx, undefined, p.uid, data)[0]).toMatch(/no progress/);
    }
    const inv = { ...newProject('invent'), technique: 'Re' as const, form: 'An' as const, level: 10 };
    expect(planProject(inv, c, d(c), ctx).problems[0]).toMatch(/cannot be used for Spells/);
    expect(c.purse!.vis.find((v) => v.art === 'Vi')!.pawns).toBe(30); // nothing was made
  });
  it('halve the Lab Totals of the Arts Missing Ingredients names', () => {
    const c = magus();
    const plain = ctxWith();
    const short = ctxWith([{ defId: 'missing-ingredients-flaw', alt: 'An+Te' }]);
    const p = { ...newProject('invent'), technique: 'Re' as const, form: 'Te' as const, level: 10 };
    const full = planProject(p, c, d(c), plain).total!.total;
    const half = planProject(p, c, d(c), short).total!;
    expect(half.total).toBe(Math.ceil(full / 2));
    expect(half.notes.join(' ')).toMatch(/Missing Ingredients/);
    expect(planProject({ ...p, form: 'Vi' }, c, d(c), short).total!.total).toBe(full); // other Arts are untouched
  });
});

describe('experimenting', () => {
  it("adds the simple die, the risk and the lab's Experimentation Specialization, and rolls on the chart", () => {
    const c = magus();
    const ctx = ctxWith([], {}, { Experimentation: 2 });
    const p = { ...newProject('invent'), technique: 'Re' as const, form: 'An' as const, level: 30, experiment: { risk: 1 } };
    c.projects = [p];
    const before = planProject(p, c, d(c), ctx);
    expect(before.total!.parts.some((x) => /Experimentation/.test(x.label) && x.value === 2)).toBe(true);
    // a 5 on every die: +6 to the Lab Total, and a 6 on the chart (a side effect)
    const lines = workProject(c, d(c), ctx, undefined, p.uid, data, 1220, { rng: face(5), season: 'Spring' });
    expect(lines.join(' ')).toMatch(/Lab Total \+6/);
    expect(c.projects[0].progress).toBe(before.gain + 6);
    expect(c.projects[0].results!.join(' ')).toMatch(/Spring 1220: .*Side effect/);
  });
  it('may carry a Lab Total past the level only with the die, and wastes the season when it falls short', () => {
    const c = magus();
    const ctx = ctxWith();
    const p = { ...newProject('invent'), technique: 'Re' as const, form: 'An' as const, level: 40, experiment: { risk: 0 } };
    c.projects = [p];
    expect(planProject(p, c, d(c), ctx).problems).toEqual([]); // 31 now: the die may carry it
    workProject(c, d(c), ctx, undefined, p.uid, data, 1220, { rng: face(2) }); // a 2: still short
    expect(c.projects[0].progress).toBe(0);
    expect(c.projects[0].seasons).toBe(1);
    const strict = { ...p, experiment: undefined };
    expect(planProject(strict, c, d(c), ctx).problems.join(' ')).toMatch(/must exceed the level/);
  });
  it('is not offered from a Laboratory Text, which works in one season once the Lab Total reaches the level', () => {
    const c = magus();
    const ctx = ctxWith();
    const p = { ...newProject('invent'), technique: 'Re' as const, form: 'An' as const, level: 30, fromText: true, experiment: { risk: 2 } };
    c.projects = [p];
    workProject(c, d(c), ctx, undefined, p.uid, data, 1220, { rng: face(5) });
    expect(c.projects[0].done).toBe(true);
    expect(c.projects[0].results).toBeUndefined();
  });
});

describe("the lab's own Safety and Warping", () => {
  it('warps a season of work in a lab with Warping, and wastes one in an accident', () => {
    const c = magus();
    const warped = ctxWith([], { Warping: 10 });
    const p = { ...newProject('invent'), technique: 'Re' as const, form: 'An' as const, level: 10 };
    c.projects = [p];
    const lines = workProject(c, d(c), warped, undefined, p.uid, data, 1220, { rng: face(4) });
    expect(lines.join(' ')).toMatch(/Lab Warping 10 .*even.*modified/);
    expect(c.projects[0].done).toBe(true);
    // an unsafe lab: a 0 on every die is an accident, Warping Points and a wasted season
    const unsafe = ctxWith([], { Safety: -3 });
    const q = { ...newProject('invent'), technique: 'Re' as const, form: 'An' as const, level: 10 };
    c.projects = [q];
    const out = workProject(c, d(c), unsafe, undefined, q.uid, data, 1220, { rng: seq(1, 0, 0, 0, 5) });
    expect(out.join(' ')).toMatch(/lab accident/);
    expect(c.warpingPoints).toBeGreaterThan(0);
    expect(c.projects[0].progress).toBe(0);
  });
});

describe('Longevity Rituals and familiars as lab projects', () => {
  it('makes a Longevity Ritual in a season for its vis, for the magus or someone else', () => {
    const c = magus();
    c.age = 40;
    const ctx = ctxWith();
    const p = newProject('longevity');
    c.projects = [p];
    const plan = planProject(p, c, d(c), ctx);
    expect(plan.vis).toEqual({ arts: ['Cr', 'Co', 'Vi'], pawns: 8 });
    workProject(c, d(c), ctx, undefined, p.uid, data, 1220);
    expect(c.longevity!.bonus).toBe(Math.ceil(plan.total!.total / 5));
    // a mundane grog: a point for every 10, and the Lab Total must be 30
    const grog = newCharacter('grog', 's');
    grog.age = 30;
    const q = { ...newProject('longevity'), subjectId: grog.id };
    c.projects = [q];
    const lines = workProject(c, d(c), ctx, undefined, q.uid, data, 1221, { chars: [c, grog] });
    expect(lines.join(' ')).toMatch(/aging rolls/);
    expect(grog.longevity).toMatchObject({ forMundane: true, createdBy: 'Maga' });
    expect(grog.longevity!.bonus).toBe(Math.ceil(grog.longevity!.labTotal / 10));
  });
  it('binds a familiar for a pawn per 5 points of the Lab Total, with cords no dearer than it, then strengthens the bond', () => {
    const c = magus();
    const ctx = ctxWith([], {}, { Familiar: 3 });
    c.familiar = { name: 'Corvus', species: 'raven', might: 5, size: -2, realm: 'Magic', bindingTechnique: 'Re', bindingForm: 'An', bindingLabTotal: 0, golden: 0, silver: 0, bronze: 0, pawnsSpent: 0, powers: [] };
    const bind = { ...newProject('bind'), cords: { golden: 3, silver: 0, bronze: 0 } };
    c.projects = [bind];
    const plan = planProject(bind, c, d(c), ctx);
    const lt = plan.total!.total;
    expect(plan.total!.parts.some((x) => x.label === 'Lab specialization: Familiar')).toBe(true);
    expect(plan.target).toBe(25 + 5 - 10);
    expect(plan.vis).toEqual({ arts: ['Re', 'An'], pawns: Math.ceil(lt / 5) });
    // the cords cannot cost more than the Lab Total
    expect(planProject({ ...bind, cords: { golden: 5, silver: 5, bronze: 0 } }, c, d(c), ctx).problems.join(' ')).toMatch(/cannot exceed the Lab Total/);
    workProject(c, d(c), ctx, undefined, bind.uid, data);
    expect(c.familiar).toMatchObject({ bindingLabTotal: lt, golden: 3, pawnsSpent: Math.ceil(lt / 5) });
    // strengthening: a higher Lab Total, the same Arts, a pawn per 5 points less those spent
    c.arts.Re = { apprenticeship: 105 }; // 14
    const str = { ...newProject('strengthen'), cords: { golden: 3, silver: 1, bronze: 0 } };
    c.projects = [str];
    const sp = planProject(str, c, d(c), ctx);
    expect(sp.vis!.pawns).toBe(Math.ceil(sp.total!.total / 5) - Math.ceil(lt / 5));
    expect(planProject({ ...str, cords: { golden: 2, silver: 1, bronze: 0 } }, c, d(c), ctx).problems.join(' ')).toMatch(/cannot weaken/);
    workProject(c, d(c), ctx, undefined, str.uid, data);
    expect(c.familiar).toMatchObject({ golden: 3, silver: 1, bronze: 0, bindingLabTotal: sp.total!.total });
  });
  it('invests a power in the bond with +10 for both binding Arts, and makes charged items in one season', () => {
    const c = magus();
    const ctx = ctxWith();
    const power = { ...newEffect(), technique: 'Re' as const, form: 'An' as const, modifiedLevel: 10, baseLevel: 10, pending: true };
    c.familiar = { name: 'Corvus', species: 'raven', might: 5, size: -2, realm: 'Magic', bindingTechnique: 'Re', bindingForm: 'An', bindingLabTotal: 30, golden: 1, silver: 0, bronze: 0, pawnsSpent: 6, powers: [power] };
    const emp = { ...newProject('empower'), effectUid: power.uid };
    c.projects = [emp];
    const plan = planProject(emp, c, d(c), ctx);
    expect(plan.total!.parts.some((x) => /Familiar bond/.test(x.label) && x.value === 10)).toBe(true);
    workProject(c, d(c), ctx, undefined, emp.uid, data);
    expect(c.familiar.powers[0].pending).toBe(false);
    // a charged item: one season, a charge per 5 points over the level
    const wand = newItem('charged');
    const e = { ...newEffect(), technique: 'Cr' as const, form: 'Te' as const, modifiedLevel: 15, baseLevel: 15, pending: true };
    wand.effects.push(e);
    c.items.push(wand);
    const ch = { ...newProject('instill'), itemUid: wand.uid, effectUid: e.uid };
    c.projects = [ch];
    const cp = planProject(ch, c, d(c), ctx);
    workProject(c, d(c), ctx, undefined, ch.uid, data);
    expect(c.items[0].charges).toBe(Math.ceil((cp.total!.total - 15) / 5));
    expect(c.projects[0].done).toBe(true);
  });
});

describe('what the book says about each result (a second pass)', () => {
  it('makes charged items for no vis, and holds a lesser enchantment to what its material and size could take', () => {
    const c = magus();
    const ctx = ctxWith();
    const wand = newItem('charged');
    const e = { ...newEffect(), technique: 'Cr' as const, form: 'Te' as const, modifiedLevel: 15, baseLevel: 15, pending: true };
    wand.effects.push(e);
    c.items.push(wand);
    const p = { ...newProject('instill'), itemUid: wand.uid, effectUid: e.uid };
    c.projects = [p];
    expect(planProject(p, c, d(c), ctx).vis).toBeUndefined();
    const before = structuredClone(c.purse);
    workProject(c, d(c), ctx, undefined, p.uid, data);
    expect(c.purse).toEqual(before);
    expect(c.items[0].charges).toBeGreaterThan(0);
    // a tiny wooden lesser device takes 2 pawns: a level 25 effect needs 3
    const ring = { ...newItem('lesser'), size: 'tiny' as const };
    const big = { ...newEffect(), technique: 'Re' as const, form: 'An' as const, modifiedLevel: 25, baseLevel: 25, pending: true };
    ring.effects.push(big);
    c.items.push(ring);
    const q = { ...newProject('instill'), itemUid: ring.uid, effectUid: big.uid };
    expect(planProject(q, c, d(c), ctx).problems.join(' ')).toMatch(/more than New item can take as a lesser enchantment \(2/);
  });
  it('holds a Longevity Ritual’s vis to twice Magic Theory, and halves the Lab Total for a subject with Difficult Longevity Ritual', () => {
    const c = magus(); // Magic Theory 5: 10 pawns a season
    c.age = 60;
    const ctx = ctxWith();
    const p = newProject('longevity');
    c.projects = [p];
    expect(planProject(p, c, d(c), ctx).problems.join(' ')).toMatch(/12 pawns is more than you can handle in a season \(twice Magic Theory: 10\)/);
    c.age = 45;
    expect(planProject(p, c, d(c), ctx).problems).toEqual([]);
    const friend = magus();
    friend.name = 'Friend';
    const q = { ...newProject('longevity'), subjectId: friend.id };
    const plain = planProject(q, c, d(c), ctx, { subject: friend }).total!.total;
    friend.virtues.push({ uid: 'dl', defId: 'difficult-longevity-ritual-flaw', size: 'Minor', kind: 'flaw' } as never);
    const hard = planProject(q, c, d(c), ctx, { subject: friend }).total!;
    expect(hard.total).toBe(Math.ceil(plain / 2));
    expect(hard.notes.join(' ')).toMatch(/Friend has Difficult Longevity Ritual/);
  });
  it('abandons a project when the experiment brings No Benefit and the Lab Total without it falls short', () => {
    const c = magus();
    const ctx = ctxWith();
    // Lab Total 31 against level 40: only the die could carry it; a 7 on the chart is No Benefit
    const p = { ...newProject('invent'), technique: 'Re' as const, form: 'An' as const, level: 40, experiment: { risk: 0 } };
    c.projects = [p];
    const lines = workProject(c, d(c), ctx, undefined, p.uid, data, 1220, { rng: seq(9, 7) });
    expect(lines.join(' ')).toMatch(/No benefit/);
    expect(lines.join(' ')).toMatch(/abandoned/);
    expect(c.projects[0]).toMatchObject({ done: true, failed: true, progress: 0 });
    // within reach without the die, the season still counts at the plain Lab Total
    const q = { ...newProject('invent'), technique: 'Re' as const, form: 'An' as const, level: 20, experiment: { risk: 0 } };
    c.projects = [q];
    const gain = planProject({ ...q, experiment: undefined }, c, d(c), ctx).gain;
    workProject(c, d(c), ctx, undefined, q.uid, data, 1220, { rng: seq(9, 7) });
    expect(c.projects[0].done).toBeFalsy();
    expect(c.projects[0].progress).toBe(gain);
  });
  it('loses a long project’s points to a Disaster’s second zero, and treats a one-season project as a Complete Failure', () => {
    const c = magus();
    const ctx = ctxWith();
    // level 30 against a Lab Total of about 31: many seasons; ten points gathered already
    const p = { ...newProject('invent'), technique: 'Re' as const, form: 'An' as const, level: 30, progress: 10, experiment: { risk: 0 } };
    c.projects = [p];
    // simple die 2, chart 0, then 4 botch dice (1 + aura 3): two zeroes
    const lines = workProject(c, d(c), ctx, undefined, p.uid, data, 1220, { rng: seq(2, 0, 0, 0, 5) });
    expect(lines.join(' ')).toMatch(/points start again from nothing/);
    expect(c.projects[0].progress).toBe(0);
    expect(c.projects[0].done).toBeFalsy();
    expect(c.warpingPoints).toBe(2);
    // binding a familiar is one season: two zeroes are a Complete Failure, and the familiar survives unless a simple die shows 0
    c.familiar = { name: 'Corvus', species: 'raven', might: 5, size: -2, realm: 'Magic', bindingTechnique: 'Re', bindingForm: 'An', bindingLabTotal: 0, golden: 0, silver: 0, bronze: 0, pawnsSpent: 0, powers: [] };
    const bind = { ...newProject('bind'), cords: { golden: 1, silver: 0, bronze: 0 }, experiment: { risk: 0 } };
    c.projects = [bind];
    const out = workProject(c, d(c), ctx, undefined, bind.uid, data, 1220, { rng: seq(2, 0, 0, 0, 5, 5, 5, 5, 3) });
    expect(out.join(' ')).toMatch(/count as a Complete Failure: simple die 5, no harm/);
    expect(out.join(' ')).toMatch(/season is wasted/);
    expect(c.familiar.bindingLabTotal).toBe(0);
    expect(c.projects[0].done).toBeFalsy();
  });
  it('keeps a ritual an aging crisis ended, to be performed again for the vis of the age now, no more of each kind than the Art', () => {
    const c = magus();
    c.age = 70;
    c.longevity = { labTotal: 40, bonus: 8, extraVis: 2 };
    lapseLongevity(c, 1230);
    expect(c.longevity).toBeUndefined();
    expect(c.longevityLapsed).toMatchObject({ bonus: 8, lapsedYear: 1230 });
    expect(renewLongevityCost(c)).toBe(14 + 2);
    // Creo 10 and Vim 10 can take 20, but the purse has only 10 Creo and 30 Vim: Vim 10 + Creo 6
    const said = renewLongevity(c, d(c), c.purse!.vis);
    expect(said).toMatch(/−8 on aging rolls/);
    expect(c.longevity).toMatchObject({ bonus: 8, labTotal: 40, extraVis: 2 });
    expect(c.longevity!.lapsedYear).toBeUndefined();
    expect(c.purse!.vis.find((v) => v.art === 'Vi')!.pawns).toBe(20);
    expect(c.purse!.vis.find((v) => v.art === 'Cr')!.pawns).toBe(4);
    // a magus whose Arts cannot take the vis cannot do it
    const weak = magus();
    weak.age = 70;
    weak.arts.Cr = {};
    weak.arts.Vi = {};
    weak.longevity = { labTotal: 40, bonus: 8, extraVis: 0 };
    lapseLongevity(weak);
    expect(renewLongevity(weak, d(weak), weak.purse!.vis)).toBeNull();
    expect(weak.longevityLapsed).toBeTruthy();
  });
});
