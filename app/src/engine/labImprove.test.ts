// Improving a laboratory in play (Covenants): a season raising its Refinement and the rolls it makes,
// Virtues installed and Flaws put right over a season or two with the space and Magic Theory they need,
// the Upkeep's rise paid; and several spells of the same Technique and Form invented at once (DE).
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newCharacter, ensureAbility } from './character/factory';
import { deriveCharacter } from './character/derive';
import { newCovenant } from './covenant';
import { deriveLab, newLab } from './lab';
import { inventedWith, newProject, planProject, workProject } from './projects';
import { DEFAULT_HOUSE_RULES, type Character, type LabProject } from './types';
import type { CharacterContext } from './context';

const data = buildGameData();
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
/** dice that show these faces in turn, then the last one */
const seq = (...faces: number[]) => {
  let i = 0;
  return () => (faces[Math.min(i++, faces.length - 1)] + 0.5) / 10;
};

function setup(theory: number, flaws: string[] = []) {
  const c = newCharacter('magus', 's');
  c.name = 'Maga';
  c.characteristics.Int = 3;
  for (const a of ['Re', 'Co'] as const) c.arts[a] = { apprenticeship: 55 }; // 10 each
  ensureAbility(c, 'magic-theory', { apprenticeship: (5 * theory * (theory + 1)) / 2 });
  const cov = newCovenant('s', 1220);
  cov.finances.treasury = 100;
  const lab = newLab('Tower lab', c.id);
  lab.virtues = flaws.map((defId, i) => ({ uid: `f${i}`, defId }));
  cov.labs.push(lab);
  const ctx = () => ({ aura: { realm: 'Magic', strength: 3 }, covenant: cov, lab: deriveLab(cov.labs[0], data) }) as CharacterContext;
  const add = (p: LabProject) => ((c.projects = [...(c.projects ?? []), p]), p);
  const work = (p: LabProject, rng = seq(5)) => workProject(c, d(c), ctx(), cov, p.uid, data, 1221, { rng, season: 'Spring' });
  return { c, cov, ctx, add, work };
}

describe('raising the Refinement', () => {
  it('takes a season with Magic Theory at least the new Refinement + 3, and may gain Highly Organized', () => {
    const { c, cov, ctx, add, work } = setup(4);
    const p = add(newProject('refine'));
    expect(planProject(p, c, d(c), ctx(), { data }).problems).toEqual([]);
    // Int 3 + Magic Theory 4 + 5 = 12
    const lines = work(p).join(' ');
    expect(cov.labs[0].refinement).toBe(1);
    expect(lines).toMatch(/Refinement rises to 1.*= 12: Highly Organized/);
    expect(cov.labs[0].virtues.map((v) => v.defId)).toEqual(['highly-organized']);
    expect(p.done).toBe(true);
    // with Refinement 1 the next point needs Magic Theory 5: the season still sets the lab in order
    const q = add(newProject('refine'));
    expect(planProject(q, c, d(c), ctx(), { data }).summary).toMatch(/stays 1: raising it to 2 needs Magic Theory 5/);
    work(q);
    expect(cov.labs[0].refinement).toBe(1);
  });
  it('finds a Hidden Defect at 15, leaves one on a botch, and gains Spotless on a Tidy roll of 9', () => {
    const { c, cov, add, work } = setup(5, ['hidden-defect-flaw']);
    c.personality = [{ uid: 't', trait: 'Tidy', score: 3 }];
    // the Hidden Defect's Safety −3 makes the lab unsafe: its hazard die first (7, no accident), then 3 + 5 + 7 = 15, and Tidy 3 + 6 = 9
    work(add(newProject('refine')), seq(7, 7, 6));
    expect(cov.labs[0].virtues.map((v) => v.defId).sort()).toEqual(['highly-organized', 'spotless']);
    // a lab of Safety 0 rolls one botch die (a safer one none): a zero, and a zero on it
    const b = setup(4);
    expect(b.work(b.add(newProject('refine')), seq(0, 0)).join(' ')).toMatch(/a botch, and a Hidden Defect/);
    expect(b.cov.labs[0].virtues.map((v) => v.defId)).toEqual(['hidden-defect-flaw']);
  });
  it('puts a Minor Flaw right in the same season', () => {
    const { cov, add, work } = setup(4, ['cramped-flaw']);
    const p = add(newProject('refine'));
    p.removeUid = 'f0';
    expect(work(p).join(' ')).toMatch(/Cramped is put right/);
    expect(cov.labs[0].virtues.some((v) => v.defId === 'cramped-flaw')).toBe(false);
    // Upkeep −1 to 0: 7 points to 10, a pound and a half
    expect(cov.finances.treasury).toBe(98.5);
  });
});

describe('installing a Virtue and putting a Flaw right', () => {
  it('needs free space and Magic Theory of the Refinement + 3; a Minor Virtue takes a season and the Upkeep’s rise is paid', () => {
    const { c, cov, ctx, add, work } = setup(4);
    const p = add(newProject('install'));
    p.labVirtue = { defId: 'excessive-lighting' };
    expect(planProject(p, c, d(c), ctx(), { data }).problems.join(' ')).toMatch(/takes 1 point of space and Tower lab has 0 free/);
    cov.labs[0].refinement = 1;
    const plan = planProject(p, c, d(c), ctx(), { data });
    expect(plan.problems).toEqual([]);
    expect(plan.pounds).toBe(10); // Upkeep 0 to +2: 10 points to 30
    expect(work(p).join(' ')).toMatch(/Excessive Lighting is installed in Tower lab.*10 pounds paid from the covenant’s treasury/);
    expect(cov.finances.treasury).toBe(90);
    expect(cov.log.at(-1)?.treasuryDelta).toBe(-10);
    cov.labs[0].refinement = 2;
    const q = add(newProject('install'));
    q.labVirtue = { defId: 'superior-lighting' };
    expect(planProject(q, c, d(c), ctx(), { data }).problems.join(' ')).toMatch(/needs Magic Theory of at least the Refinement \+ 3 \(5\)/);
  });
  it('takes two seasons for a Major Virtue, and will not install one the lab already has', () => {
    const { c, cov, ctx, add, work } = setup(5);
    cov.labs[0].size = 4;
    cov.labs[0].virtues = [{ uid: 'e', defId: 'empty-flaw' }, { uid: 'e2', defId: 'empty-flaw' }];
    const p = add(newProject('install'));
    p.labVirtue = { defId: 'greater-feature' };
    expect(planProject(p, c, d(c), ctx(), { data }).problems).toEqual([]);
    expect(work(p).join(' ')).toMatch(/1 of 2 seasons done/);
    expect(p.done).toBeFalsy();
    work(p);
    expect(p.done).toBe(true);
    expect(cov.labs[0].virtues.some((v) => v.defId === 'greater-feature')).toBe(true);
    const twice = add(newProject('install'));
    twice.labVirtue = { defId: 'gallery' };
    work(twice);
    const again = add(newProject('install'));
    again.labVirtue = { defId: 'gallery' };
    expect(planProject(again, c, d(c), ctx(), { data }).problems.join(' ')).toMatch(/already has Gallery/);
  });
  it('puts a Flaw right in a season, two for a Major, with room for what it adds', () => {
    const { c, cov, ctx, add, work } = setup(3, ['no-stores-flaw']);
    const p = add(newProject('repair'));
    p.removeUid = 'f0';
    expect(planProject(p, c, d(c), ctx(), { data }).problems).toEqual([]);
    work(p);
    expect(cov.labs[0].virtues).toEqual([]);
    const { c: c2, ctx: ctx2, add: add2 } = setup(3, ['hovel-flaw', 'greater-feature']);
    const q = add2(newProject('repair'));
    q.removeUid = 'f0';
    // the Hovel's three points hold the Greater Feature: there is no room to put it right
    expect(planProject(q, c2, d(c2), ctx2(), { data }).problems.join(' ')).toMatch(/takes 3 points of space/);
    expect(planProject(q, c2, d(c2), ctx2(), { data }).target).toBe(2);
  });
});

describe('several spells at once (DE, Multiple Laboratory Activities)', () => {
  const spell = (name: string, level: number, fromText = true): LabProject => ({ ...newProject('invent'), name, technique: 'Re', form: 'Co', level, fromText });
  it('learns spells of the same Technique and Form from their texts in one season, their levels within the Lab Total', () => {
    const { c, add, ctx, work } = setup(5);
    const a = add(spell('Lift the Body', 10));
    const b = add(spell('Hold the Body', 10));
    a.alongside = [b.uid];
    // Re 10 + Co 10 + Int 3 + Magic Theory 5 + aura 3 = 31: room for 20 levels
    expect(planProject(b, c, d(c), ctx(), { data }).problems.join(' ')).toMatch(/Invented alongside Lift the Body/);
    expect(inventedWith(b, c)?.uid).toBe(a.uid);
    expect(planProject(a, c, d(c), ctx(), { data }).summary).toMatch(/level 20 \(2 spells, levels 10 \+ 10\)/);
    expect(work(a).join(' ')).toMatch(/invented, with Hold the Body/);
    expect(c.spells.map((s) => s.spell?.name).sort()).toEqual(['Hold the Body', 'Lift the Body']);
    expect(b.done).toBe(true);
    // too many levels for the Lab Total
    const x = add(spell('Big', 20));
    const y = add(spell('Bigger', 15));
    x.alongside = [y.uid];
    expect(planProject(x, c, d(c), ctx(), { data }).problems.join(' ')).toMatch(/must reach the levels added together \(35\)/);
  });
  it('invents them by research against their levels added together', () => {
    const { c, add, ctx } = setup(5);
    const a = add(spell('One', 5, false));
    const b = add(spell('Two', 10, false));
    a.alongside = [b.uid];
    // 31 − 15 = 16 points a season, 15 to gather: one season
    const plan = planProject(a, c, d(c), ctx(), { data });
    expect([plan.gain, plan.target, plan.seasonsLeft]).toEqual([16, 15, 1]);
    b.form = 'An';
    expect(planProject(a, c, d(c), ctx(), { data }).problems.join(' ')).toMatch(/Two is not a spell of Rego Corpus/);
  });
});
