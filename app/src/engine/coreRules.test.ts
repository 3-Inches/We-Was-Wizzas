// What the check of the core book added: forceless casting, the botch suggestions, fixing an
// Arcane Connection, and tainted vis (DE, Forceless Casting; Botches; Fixing Arcane Connections; Tainted Vis).
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { ensureAbility, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { BOTCH_SUGGESTIONS, penetrationTotal } from './magic';
import { newProject, planProject, workProject } from './projects';
import { addVis, takeVis, visText } from './vis';
import { DEFAULT_HOUSE_RULES, type Character } from './types';
import { newItem } from '../ui/items/ItemEditor';

const data = buildGameData();
const ctx = { aura: { realm: 'Magic' as const, strength: 5 } };
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
function magus(): Character {
  const c = newCharacter('magus', 's');
  c.characteristics.Int = 3;
  c.arts.Vi = { apprenticeship: 55 };
  c.arts.Cr = { apprenticeship: 55 };
  ensureAbility(c, 'magic-theory', { apprenticeship: 75 });
  ensureAbility(c, 'penetration', { apprenticeship: 15 }); // 2
  return c;
}

describe('the core book’s rules the check added', () => {
  it('forceless casting keeps the Penetration Total at 0 at most, and leaves a lower one alone', () => {
    const c = magus();
    expect(penetrationTotal(d(c), 30, 10)).toBe(22);
    expect(penetrationTotal(d(c), 30, 10, { forceless: true })).toBe(0);
    expect(penetrationTotal(d(c), 5, 10, { forceless: true })).toBe(-3);
  });

  it('offers the book’s fourteen botch suggestions', () => {
    expect(BOTCH_SUGGESTIONS).toHaveLength(14);
    expect(BOTCH_SUGGESTIONS.map((b) => b.name)).toContain('Wrong target');
  });

  it('fixes an Arcane Connection with a season and a pawn of Vim, and keeps it among what the magus owns', () => {
    const c = magus();
    c.purse = { pounds: 0, vis: [{ art: 'Vi', pawns: 2 }] };
    const p = { ...newProject('fixConnection') };
    c.projects = [p];
    expect(planProject(p, c, d(c), ctx).problems).toContain('Say what the Arcane Connection is to.');
    p.connectionTo = 'the Bishop of Mainz';
    const plan = planProject(p, c, d(c), ctx);
    expect([plan.problems, plan.vis, plan.seasonsLeft]).toEqual([[], { arts: ['Vi'], pawns: 1 }, 1]);
    workProject(c, d(c), ctx, undefined, p.uid, data);
    expect(c.projects[0].done).toBe(true);
    expect(c.purse.vis).toEqual([{ art: 'Vi', pawns: 1 }]);
    expect(c.possessions?.[0]).toMatchObject({ name: 'Arcane Connection to the Bishop of Mainz (fixed)', kind: 'arcane connection' });
  });

  it('keeps tainted vis apart, spends plain vis first, and says when Infernal vis was used', () => {
    const stocks = [{ art: 'Vi' as const, pawns: 2 }];
    addVis(stocks, 'Vi', 3, undefined, 'Infernal');
    addVis(stocks, 'Vi', 1);
    expect(stocks).toEqual([{ art: 'Vi', pawns: 3 }, { art: 'Vi', pawns: 3, realm: 'Infernal' }]);
    const r = takeVis(stocks, ['Vi'], 4);
    expect(visText(r.taken)).toBe('3 Vi, 1 Vi (Infernal)');
  });

  it('Infernal vis in an enchantment rolls the Extraordinary Results Chart, and adds no die to the Lab Total', () => {
    const c = magus();
    c.purse = { pounds: 0, vis: [{ art: 'Vi', pawns: 10, realm: 'Infernal' }] };
    const it0 = newItem('invested');
    c.items = [it0];
    c.talismanUid = it0.uid;
    const p = { ...newProject('open'), itemUid: it0.uid, pawns: 2 };
    c.projects = [p];
    const lines = workProject(c, d(c), ctx, undefined, p.uid, data, 1220, { rng: () => 0.5 });
    expect(lines.join(' ')).toMatch(/Infernal vis in the enchantment: a roll on the Extraordinary Results Chart/);
    expect(lines.join(' ')).toMatch(/Infernal vis: it twists the work/);
  });
});
