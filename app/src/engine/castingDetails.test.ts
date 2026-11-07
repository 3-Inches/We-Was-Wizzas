// Diedne Magic with a Magical Focus, sympathetic connections, Potent Magic and Potent spells, a
// Verditius's enchanted casting tool, and the Greater Charm whose Virtue goes with it.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { addVirtue, ensureAbility, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { castingScore, conditionalBonuses, penetrationBonus } from './magic';
import { castingToolLevel, newProject, planProject, workProject } from './projects';
import { charmsOf, passCharm } from './charms';
import { validateCharacter } from './character/validate';
import { DEFAULT_HOUSE_RULES, type Character } from './types';

const data = buildGameData();
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
const ctx = { aura: { realm: 'Magic' as const, strength: 0 } };

function magus(): Character {
  const c = newCharacter('magus', 's');
  c.arts.Cr = { apprenticeship: 55 }; // 10
  c.arts.Ig = { apprenticeship: 15 }; // 5
  return c;
}

describe('Diedne Magic with a Magical Focus', () => {
  it('counts the lowest Art three times on a fatiguing spontaneous spell within the Focus', () => {
    const c = magus();
    addVirtue(c, data, 'diedne-magic', 'Major');
    addVirtue(c, data, 'minor-magical-focus', 'Minor', 'fire');
    const arts = { technique: 'Cr' as const, form: 'Ig' as const };
    const sum = (o: Parameters<typeof castingScore>[2]) => castingScore(d(c), arts, o).parts.filter((p) => /Technique|Form|Focus|Diedne/.test(p.label)).reduce((t, p) => t + p.value, 0);
    expect(sum({ kind: 'spontaneous' })).toBe(15); // 10 + 5
    expect(sum({ kind: 'spontaneous', inFocus: true })).toBe(20); // the Focus: Ignem twice
    expect(sum({ kind: 'spontaneous', diedneExerted: true })).toBe(20); // Diedne: Ignem doubled
    expect(sum({ kind: 'spontaneous', inFocus: true, diedneExerted: true })).toBe(25); // both: Ignem three times
  });
});

describe('sympathetic connections', () => {
  it('stack on the multiplier once there is an Arcane Connection, and not before', () => {
    const c = magus();
    ensureAbility(c, 'penetration', { apprenticeship: 15 }); // 2
    expect(penetrationBonus(d(c), { arcaneConnection: 'none', sympathies: ['nativity', 'blood'] }).multiplier).toBe(1);
    const r = penetrationBonus(d(c), { arcaneConnection: 'indefinite', sympathies: ['nativity', 'blood', 'representation'] });
    expect(r.multiplier).toBe(1 + 4 + 2 + 1 + 2);
    expect(r.bonus).toBe(2 * 10);
  });
});

describe('Potent Magic', () => {
  it('adds +3 (Minor) or +6 (Major) as a circumstance within its field', () => {
    const c = magus();
    addVirtue(c, data, 'potent-magic', 'Minor', 'fire');
    addVirtue(c, data, 'potent-magic', 'Major', 'storms');
    const b = conditionalBonuses(d(c));
    expect(b.map((x) => [x.casting, x.lab]).sort()).toEqual([[3, 3], [6, 6]]);
  });
});

describe('an enchanted casting tool', () => {
  it('needs twice the effect level, the spell’s level and its powers, and gives its spell the bonus', () => {
    const c = magus();
    c.characteristics.Int = 3;
    ensureAbility(c, 'magic-theory', { apprenticeship: 75 }); // 5
    ensureAbility(c, 'philosophiae', { apprenticeship: 15 }); // 2
    addVirtue(c, data, 'verditius-magic', 'Minor');
    addVirtue(c, data, 'enchant-casting-tools', 'Minor');
    c.spells.push({ uid: 'sp', spell: { id: 'x', name: 'Lamp', technique: 'Cr', form: 'Ig', level: 5, general: false, range: 'Touch', duration: 'Sun', target: 'Ind', ritual: false, requisites: [], text: '', design: null, base: null, source: { book: 'DE', line: 0 } } as never, masteryXp: {}, masteryAbilities: [], source: 'play' });
    c.purse = { pounds: 0, vis: [{ art: 'Cr', pawns: 3 }] };
    expect(castingToolLevel(5, { bonus: 3, fast: true })).toBe(10);
    const p = { ...newProject('castingTool'), spellUid: 'sp', tool: { bonus: 3, fast: true } };
    c.projects = [p];
    const plan = planProject(p, c, d(c), ctx, { data });
    // Cr 10 + Ig 5 + Int 3 + MT 5 + Philosophiae 2 + magnitude 1 = 26 ≥ 20
    expect(plan.total!.total).toBe(26);
    expect(plan.problems).toEqual([]);
    workProject(c, d(c), ctx, undefined, p.uid, data);
    expect(c.spells[0].castingTool).toEqual({ bonus: 3, fast: true });
    const big = { ...newProject('castingTool'), spellUid: 'sp', tool: { bonus: 20 } };
    c.spells[0].castingTool = undefined;
    c.projects = [big];
    expect(planProject(big, c, d(c), ctx, { data }).problems.join(' ')).toMatch(/twice the effect level/);
  });
});

describe('a Greater Charm', () => {
  it('takes its Virtue to whoever steals the charm, and back when it is recovered', () => {
    const owner = newCharacter('companion', 's');
    owner.name = 'Bingus';
    const life = addVirtue(owner, data, 'luck', 'Minor');
    addVirtue(owner, data, 'greater-charm-flaw', 'Major', 'Luck');
    const thief = newCharacter('companion', 's');
    thief.name = 'Thief';
    const chars = [owner, thief];
    const before = d(owner).tally.virtuePoints;
    const flaw = owner.virtues.find((v) => v.defId === 'greater-charm-flaw')!;
    expect(passCharm(chars, owner.id, flaw.uid, thief.id, data).join(' ')).toMatch(/Bingus loses Luck.*Thief has the charm/);
    expect(owner.virtues.some((v) => v.uid === life.uid)).toBe(false);
    expect(thief.virtues.find((v) => v.defId === 'luck')).toMatchObject({ free: true, fromCharm: { ownerId: owner.id } });
    // the owner's points still balance; the thief's Virtue costs nothing
    expect(d(owner).tally.virtuePoints).toBe(before);
    expect(validateCharacter(d(thief), data, DEFAULT_HOUSE_RULES).filter((i) => i.severity === 'error' && /point|Luck/i.test(i.message))).toEqual([]);
    expect(d(thief).tally.virtuePoints).toBe(0);
    expect(charmsOf(chars, data)[0].holder?.id).toBe(thief.id);
    passCharm(chars, owner.id, flaw.uid, owner.id, data);
    expect(owner.virtues.some((v) => v.defId === 'luck')).toBe(true);
    expect(thief.virtues.some((v) => v.defId === 'luck')).toBe(false);
    expect(flaw.charm).toBeUndefined();
  });
});
