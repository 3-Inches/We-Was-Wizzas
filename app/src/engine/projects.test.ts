// Lab projects season by season (DE): inventing, preparing and attuning a talisman, instilling, extracting vis.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newCharacter, ensureAbility } from './character/factory';
import { deriveCharacter } from './character/derive';
import { newProject, planProject, workProject } from './projects';
import { DEFAULT_HOUSE_RULES, type Character } from './types';
import { newItem, newEffect } from '../ui/items/ItemEditor';

const data = buildGameData();
const ctx = { aura: { realm: 'Magic' as const, strength: 5 } };
function magus(): Character {
  const c = newCharacter('magus', 's');
  c.characteristics.Int = 3;
  c.arts.Re = { apprenticeship: 55 }; // 10
  c.arts.Vi = { apprenticeship: 55 };
  c.arts.Cr = { apprenticeship: 55 };
  ensureAbility(c, 'magic-theory', { apprenticeship: 75 }); // 5
  c.purse = { pounds: 0, vis: [{ art: 'Vi', pawns: 20 }, { art: 'Re', pawns: 5 }] };
  return c;
}
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);

describe('lab projects', () => {
  it('invents a spell over seasons, the Lab Total less the level each season', () => {
    const c = magus();
    const p = { ...newProject('invent'), technique: 'Re' as const, form: 'Vi' as const, level: 25, name: 'Ward' };
    c.projects = [p];
    const plan = planProject(p, c, d(c), ctx);
    expect(plan.total!.total).toBe(10 + 10 + 3 + 5 + 5); // Re + Vi + Int + Magic Theory + aura
    expect(plan.gain).toBe(8);
    expect(plan.seasonsLeft).toBe(4);
    for (let i = 0; i < 4; i++) workProject(c, d(c), ctx, undefined, p.uid, data);
    expect(c.projects[0].done).toBe(true);
    expect(c.spells.some((s) => s.spell.name === 'Ward' && s.spell.level === 25)).toBe(true);
  });
  it('opens a talisman a little at a time, attunes it, and instills an effect with +5', () => {
    const c = magus();
    const it = newItem('invested');
    c.items.push(it);
    c.talismanUid = it.uid;
    const open = { ...newProject('open'), itemUid: it.uid, pawns: 4 };
    c.projects = [open];
    workProject(c, d(c), ctx, undefined, open.uid, data);
    expect(c.items[0].openedPawns).toBe(4);
    expect(c.purse!.vis.find((v) => v.art === 'Vi')?.pawns).toBe(16);
    const att = { ...newProject('attune'), itemUid: it.uid };
    c.projects.push(att);
    workProject(c, d(c), ctx, undefined, att.uid, data);
    expect(c.items[0].attuned).toBe(true);
    const e = { ...newEffect(), technique: 'Re' as const, form: 'Vi' as const, modifiedLevel: 20, pending: true };
    c.items[0].effects.push(e);
    const ins = { ...newProject('instill'), itemUid: it.uid, effectUid: e.uid };
    c.projects.push(ins);
    const plan = planProject(ins, c, d(c), ctx);
    expect(plan.total!.parts.some((x) => /talisman/i.test(x.label) && x.value === 5)).toBe(true);
    expect(plan.vis).toEqual({ arts: ['Re', 'Vi'], pawns: 2 });
    workProject(c, d(c), ctx, undefined, ins.uid, data);
    expect(c.items[0].effects[0].pending).toBe(true); // Lab Total 38: 18 points of 20, just short of twice the level
    workProject(c, d(c), ctx, undefined, ins.uid, data);
    expect(c.items[0].effects[0].pending).toBe(false);
    expect(c.purse!.vis.find((v) => v.art === 'Vi')?.pawns).toBe(14); // 4 to open, 2 to instill (paid once)
  });
  it('extracts a pawn of Vim per 10 points of the Creo Vim Lab Total', () => {
    const c = magus();
    const p = newProject('extract');
    c.projects = [p];
    workProject(c, d(c), ctx, undefined, p.uid, data);
    expect(c.purse!.vis.find((v) => v.art === 'Vi')?.pawns).toBe(20 + 4); // Lab Total 33 → 4 pawns
  });
});
