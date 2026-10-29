// The generators make characters the rules check passes, for every role, in every Tribunal and at
// every level of randomness; they are repeatable from their seed; they follow the rules that limit
// who may take a Social Status, and the guild and Tribunal customs the saga has on. The covenant
// filler adds what it says, and the bestiary holds the books' creatures.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../../data';
import bestiary from '../../data/generated/bestiary.json';
import { DEFAULT_HOUSE_RULES, type Saga } from '../types';
import { budgetLeft, deriveCovenant, newCovenant } from '../covenant';
import { generateCharacter, type GenOptions, type Variety } from './character';
import { fillCovenant } from './covenant';
import { homelandGroupFor } from './names';
import { seeded } from './random';
import { generateFamiliar } from './spellsAndFamiliars';
import { deriveCharacter } from '../character/derive';
import type { LabContext } from '../magic';
import { ROLES } from './roles';

const data = buildGameData();
const rules = DEFAULT_HOUSE_RULES;
const saga = (tribunal: string, options: Record<string, boolean> = {}) => ({ id: 's', name: 'Test', tribunal, enabledBooks: [], houseRules: rules, currentYear: 1220, options }) as unknown as Saga;
const gen = (o: Partial<GenOptions> & Pick<GenOptions, 'type'>, s = saga('Stonehenge')) => generateCharacter({ variety: 'varied', npc: true, seed: 1, ...o }, { data, saga: s, rules });
const errors = (g: ReturnType<typeof gen>) => g.issues.filter((i) => i.severity === 'error').map((i) => i.message);

describe('the character generator', () => {
  it('makes every role without a rules error, across Tribunals and levels of randomness', () => {
    const tribunals = ['Rhine', 'Theban', 'Transylvanian', 'Normandy', 'Iberian', 'Stonehenge'];
    const varieties: Variety[] = ['focused', 'varied', 'wild'];
    const customs = { rhineGilds: true, thebanTokens: true, transylvaniaPrivileges: true };
    ROLES.forEach((role, i) => {
      const g = gen({ type: role.type, role: role.id, variety: varieties[i % 3], npc: i % 2 === 0, seed: 1000 + i }, saga(tribunals[i % tribunals.length], customs));
      expect(errors(g), `${role.id} (seed ${1000 + i})`).toEqual([]);
      expect(g.c.name, role.id).toBeTruthy();
    });
  }, 300_000);

  it('makes the same character from the same seed', () => {
    const a = gen({ type: 'companion', seed: 42 });
    const b = gen({ type: 'companion', seed: 42 });
    expect([a.c.name, a.c.age, a.c.nationality, a.c.virtues.map((v) => v.defId)]).toEqual([b.c.name, b.c.age, b.c.nationality, b.c.virtues.map((v) => v.defId)]);
    expect(gen({ type: 'companion', seed: 43 }).c.name + gen({ type: 'companion', seed: 44 }).c.name).not.toBe(a.c.name + a.c.name);
  }, 60_000);

  it('finishes an NPC, and leaves a player’s character as a draft at the Review step', () => {
    const npc = gen({ type: 'grog', role: 'shield-grog', npc: true });
    expect(npc.c.npc).toBe(true);
    expect(npc.c.creation.finalized).toBe(true);
    const draft = gen({ type: 'grog', role: 'shield-grog', npc: false });
    expect(draft.c.npc).toBeFalsy();
    expect(draft.c.creation.finalized).toBe(false);
    expect(draft.c.creation.step).toBeGreaterThan(0);
    // a shield grog fights: a weapon and armor
    expect(npc.c.equipment.weapons.length).toBeGreaterThan(0);
    expect(npc.c.equipment.armorId).toBeTruthy();
  }, 60_000);

  it('gives a Social Status only to those the rules allow it', () => {
    // Priest is open only to men in the rules: a priest of open gender is a man; a woman asked for takes another status
    const priest = gen({ type: 'companion', role: 'priest', seed: 7 });
    expect(priest.c.gender).toBe('Male');
    expect(priest.c.virtues.some((v) => v.defId === 'priest')).toBe(true);
    const woman = gen({ type: 'companion', role: 'priest', gender: 'Female', seed: 7 });
    expect(woman.c.gender).toBe('Female');
    expect(woman.c.virtues.some((v) => v.defId === 'priest')).toBe(false);
    expect(errors(woman)).toEqual([]);
  }, 60_000);

  it('makes craftsmen guild members when the guild rules are on', () => {
    const on = gen({ type: 'companion', role: 'master-craftsman', seed: 3 }, saga('Rhine', { guilds: true }));
    expect(on.c.guild?.rank).toBeTruthy();
    expect(on.c.virtues.some((v) => ['guild-apprentice', 'journeyman', 'guild-master'].includes(v.defId))).toBe(true);
    expect(on.c.abilities.some((a) => a.abilityId === 'craft-type' && a.param)).toBe(true);
    const off = gen({ type: 'companion', role: 'master-craftsman', seed: 3 }, saga('Rhine', { guilds: false }));
    expect(off.c.guild).toBeUndefined();
  }, 60_000);

  it('follows the Tribunal customs the saga has on, and only those', () => {
    const rhine = gen({ type: 'magus', seed: 5 }, saga('Rhine', { rhineGilds: true }));
    expect(rhine.c.rhine?.rank).toBeTruthy();
    expect(gen({ type: 'magus', seed: 5 }, saga('Rhine')).c.rhine).toBeUndefined();
    const thebes = gen({ type: 'magus', seed: 6 }, saga('Theban', { thebanTokens: true }));
    expect(thebes.c.theban).toBeTruthy();
    const transylvania = gen({ type: 'magus', seed: 8 }, saga('Transylvanian', { transylvaniaPrivileges: true }));
    expect(transylvania.c.privilege).toBeTruthy();
    // a grog keeps out of Hermetic politics
    expect(gen({ type: 'grog', seed: 9 }, saga('Rhine', { rhineGilds: true })).c.rhine).toBeUndefined();
  }, 60_000);

  it('names a character from the saga’s part of Mythic Europe', () => {
    expect(homelandGroupFor('Rhine')?.label).toMatch(/^Rhine/);
    expect(homelandGroupFor('Theban')?.label).toMatch(/^Theban/);
    const g = gen({ type: 'grog', seed: 11 }, saga('Rhine'));
    expect(homelandGroupFor('Rhine')!.options).toContain(g.c.nationality);
  }, 60_000);
});

describe('Quick build’s variety and older magi', () => {
  it('draws Virtues and Flaws among those that fit, keeps the dramatic ones rare, and never stacks two marks', () => {
    const magi = Array.from({ length: 24 }, (_, i) => gen({ type: 'magus', seed: 500 + i * 13 }));
    const count = new Map<string, number>();
    for (const g of magi) for (const v of new Set(g.c.virtues.map((x) => `${x.defId}:${x.param ?? ''}`))) count.set(v, (count.get(v) ?? 0) + 1);
    for (const [id, n] of count) if (!/^(the-gift|hermetic-magus):/.test(id)) expect(n, id).toBeLessThanOrEqual(8);
    const marks = ['horrifying-appearance-snake-legs-flaw', 'leprosy-flaw', 'blind-flaw', 'deaf-flaw', 'strong-faerie-blood', 'faerie-blood', 'true-faith'];
    for (const g of magi) expect(g.c.virtues.filter((v) => marks.includes(v.defId)).length, g.c.name).toBeLessThanOrEqual(1);
    // a choice with options is not always the first (Strong Faerie Blood was always the Bee King)
    const params = Array.from({ length: 40 }, (_, i) => gen({ type: 'companion', seed: 900 + i, variety: 'wild' })).flatMap((g) => g.c.virtues.filter((v) => v.defId === 'monastic-vows-flaw' || v.defId === 'strong-faerie-blood' || v.defId === 'limited-magic-resistance-flaw').map((v) => v.param));
    if (params.length >= 3) expect(new Set(params).size).toBeGreaterThan(1);
  }, 300_000);

  it('gives each magus favorite Arts of their own, so magi of one role differ', () => {
    const tops = Array.from({ length: 12 }, (_, i) => {
      const d = deriveCharacter(gen({ type: 'magus', role: 'magus-scholar', seed: 300 + i }).c, data, rules);
      return Object.entries(d.arts).sort((a, b) => b[1].score - a[1].score)[0][0];
    });
    expect(new Set(tops).size).toBeGreaterThanOrEqual(4);
  }, 120_000);

  it('spreads aging over the Characteristics a character can spare, rather than wrecking one', () => {
    for (let i = 0; i < 8; i++) {
      const g = gen({ type: 'companion', role: 'physician', seed: 70 + i, age: 55 });
      // the table's own points (Stamina on 15 and 18) may still lower one a good deal; before, a single
      // Characteristic took every point "in any" and fell to −7
      const lows = Object.entries(g.c.characteristics).filter(([, v]) => v < -4);
      expect(lows, `${g.c.name}, Decrepitude points ${g.c.decrepitudePoints}`).toEqual([]);
    }
  }, 120_000);

  it('raises an older magus’s Magic Theory, Parma and Penetration, teaches them spells and adds their Warping', () => {
    for (const seed of [11, 12, 13]) {
      const g = gen({ type: 'magus', seed, yearsPostGauntlet: 30 });
      const d = deriveCharacter(g.c, data, rules);
      const ab = (id: string) => d.abilities.find((a) => a.abilityId === id)?.total ?? 0;
      expect(ab(d.theoryAbility), g.c.name).toBeGreaterThanOrEqual(6);
      expect(ab('parma-magica'), g.c.name).toBeGreaterThanOrEqual(4);
      expect(ab('penetration'), g.c.name).toBeGreaterThanOrEqual(2);
      expect(g.c.spells.some((s) => s.source === 'postGauntlet'), g.c.name).toBe(true);
      expect(g.c.warpingPoints, g.c.name).toBeGreaterThan(5);
      expect(errors(g)).toEqual([]);
    }
  }, 120_000);
});

describe('filling out a covenant', () => {
  it('adds the staff, a teacher, craftsmen, the numbers needed and grogs for the turb', () => {
    const cov = newCovenant('s', 1220);
    cov.name = 'Test';
    const r = fillCovenant(cov, [], { data, saga: saga('Stonehenge'), rules }, { staff: true, teacher: true, craftsmen: true, grogs: 3, counts: true, bought: false, seed: 9 });
    for (const role of ['steward', 'chamberlain', 'turb-captain', 'scribe', 'teacher']) expect(r.cov.specialists.some((s) => s.role === role), role).toBe(true);
    expect(r.cov.specialists.every((s) => s.free)).toBe(true);
    expect(r.grogs).toHaveLength(3);
    expect(r.grogs[0].c.creation.concept).toMatch(/Sergeant/);
    expect(r.grogs.every((g) => r.cov.memberIds.includes(g.c.id) && g.c.creation.finalized && !g.c.npc)).toBe(true);
    expect(r.cov.covenfolk.servants).toBeGreaterThan(0);
    // the covenant passed in is left as it was
    expect(cov.specialists).toEqual([]);
  }, 120_000);
  it('buys no more than the Build Points cover, and gives no name twice', () => {
    const cov = newCovenant('s', 1220);
    cov.name = 'Poor';
    cov.buildPoints = 20;
    const r = fillCovenant(cov, [], { data, saga: saga('Rhine'), rules }, { staff: true, teacher: true, craftsmen: true, grogs: 8, counts: true, bought: true, seed: 4 });
    expect(deriveCovenant(r.cov, data, r.grogs.map((g) => g.c)).bpSpent).toBeLessThanOrEqual(20);
    expect(r.log.join(' ')).toMatch(/Not enough Build Points/);
    const names = [...r.cov.specialists.filter((s) => s.role !== 'craftsman').map((s) => s.name), ...r.grogs.map((g) => g.c.name)];
    expect(new Set(names).size).toBe(names.length);
  }, 120_000);
});

describe('spells and familiars for magi', () => {
  it('spends the spell levels on the Arts asked for, and binds a familiar the Lab Total reaches', () => {
    const g = gen({ type: 'magus', role: undefined, seed: 21, spells: { arts: ['Ig'], maxLevel: 20 }, familiar: true });
    const apprentice = g.c.spells.filter((s) => s.source === 'apprenticeship');
    expect(apprentice.length).toBeGreaterThan(0);
    expect(apprentice.every((s) => s.spell.form === 'Ig' && (s.spell.level ?? 0) <= 20)).toBe(true);
    const f = g.c.familiar!;
    expect(f.name).toBeTruthy();
    if (f.bindingLabTotal) {
      expect(f.bindingLabTotal).toBeGreaterThanOrEqual(25 + f.might + 5 * f.size);
      expect([0, 5, 15, 30, 50, 75][f.golden] + [0, 5, 15, 30, 50, 75][f.silver] + [0, 5, 15, 30, 50, 75][f.bronze]).toBeLessThanOrEqual(f.bindingLabTotal);
    }
    expect(errors(g)).toEqual([]);
    // asked to bind one, it picks a creature this magus can bind, whatever the roll: with a Lab Total
    // of 25, a stag or a wolf is beyond them, a hound or a fox is not
    const d = deriveCharacter(g.c, data, rules);
    const fam = (seed: number, lab?: LabContext) => generateFamiliar(d, seeded(seed), { bind: true, aura: { realm: 'Magic', strength: 3 }, lab });
    const lab = { generalQuality: 25 - fam(1).familiar.bindingLabTotal, specializations: {} };
    for (let seed = 1; seed <= 30; seed++) {
      const f = fam(seed, lab).familiar;
      expect(f.bindingLabTotal, `seed ${seed}: ${f.species}`).toBe(25);
      expect(25 + f.might + 5 * f.size).toBeLessThanOrEqual(25);
    }
  }, 120_000);
});

describe('budgets and resource pools', () => {
  it('spends a Flawed Resource set aside for covenfolk and books before the covenant’s own budget', () => {
    const cov = newCovenant('s', 1220);
    cov.name = 'Pooled';
    cov.buildPoints = 40;
    cov.budget = { book: 20 };
    cov.hooksBoons.push({ uid: 'fr', name: 'Flawed Resource', kind: 'hook', size: 'Minor', earmark: ['specialist', 'book'] });
    const r = fillCovenant(cov, [], { data, saga: saga('Rhine'), rules }, { staff: true, teacher: true, craftsmen: false, grogs: 0, counts: false, bought: true, library: { arts: true, abilities: true, labTexts: false, mundane: true }, seed: 3 });
    const dc = deriveCovenant(r.cov, data, []);
    const pool = dc.pools.find((p) => p.hb.uid === 'fr')!;
    // the staff, the teacher and the books went into the pool, up to its 250 Build Points
    expect(pool.resources.some((x) => x.kind === 'specialist')).toBe(true);
    expect(pool.resources.some((x) => x.kind === 'book')).toBe(true);
    expect(pool.spent).toBeLessThanOrEqual(250);
    expect(dc.bpSpent).toBeLessThanOrEqual(40);
    expect(r.cov.library.some((b) => b.kind === 'mundane')).toBe(true);
    expect(budgetLeft(r.cov, dc, 'book').spent).toBeLessThanOrEqual(20);
  }, 120_000);
  it('never overspends on craftsmen when a pool has too little left to take one', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const cov = newCovenant('s', 1220);
      cov.name = 'Thin';
      cov.covenfolk = { ...cov.covenfolk, grogs: 20, servants: 15, teamsters: 4, dependents: 10, horses: 6 };
      // a pool with 2 Build Points left (248 taken by a starting reserve), and 4 of the covenant's own
      cov.finances.startingReserve = 2480;
      cov.hooksBoons.push({ uid: 'fr', name: 'Flawed Resource', kind: 'hook', size: 'Minor', earmark: ['specialist'], resources: ['starting-reserve'] });
      cov.buildPoints = deriveCovenant(cov, data, []).bpSpent + 4;
      const r = fillCovenant(cov, [], { data, saga: saga('Rhine'), rules }, { staff: false, teacher: false, craftsmen: true, grogs: 0, counts: false, bought: true, seed });
      const dc = deriveCovenant(r.cov, data, []);
      expect(r.log.join(' ')).toMatch(/Craftsmen \([^)]*\): \d/); // some would save money
      expect(dc.bpSpent, `seed ${seed}: ${r.log.join(' ')}`).toBeLessThanOrEqual(r.cov.buildPoints);
      expect(dc.pools.find((p) => p.hb.uid === 'fr')!.spent).toBeLessThanOrEqual(250);
    }
  }, 120_000);
});

describe('the bestiary', () => {
  it('holds the books’ creatures, each with its Realm, Might and stat block', () => {
    const all = bestiary as { id: string; name: string; realm: string; might: number; book: string; line: number; text: string }[];
    expect(all.length).toBeGreaterThan(400);
    expect(new Set(all.map((c) => c.id)).size).toBe(all.length);
    for (const c of all) {
      expect(['Magic', 'Faerie', 'Infernal', 'Divine'], c.id).toContain(c.realm);
      expect(c.might, c.id).toBeGreaterThanOrEqual(0);
      expect(c.text, c.id).toMatch(/Might/);
      expect(c.line, c.id).toBeGreaterThan(0);
    }
    expect(new Set(all.map((c) => c.realm)).size).toBe(4);
  });
});
