// The generators make characters the rules check passes, for every role, in every Tribunal and at
// every level of randomness; they are repeatable from their seed; they follow the rules that limit
// who may take a Social Status, and the guild and Tribunal customs the saga has on. The covenant
// filler adds what it says, and the bestiary holds the books' creatures.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../../data';
import bestiary from '../../data/generated/bestiary.json';
import { DEFAULT_HOUSE_RULES, type Saga } from '../types';
import { deriveCovenant, newCovenant } from '../covenant';
import { generateCharacter, type GenOptions, type Variety } from './character';
import { fillCovenant } from './covenant';
import { homelandGroupFor } from './names';
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
