// Batch F, item 2: the hedge traditions' suitable Hermetic lists, and every hand-written id list in
// src/engine/guided/. A suitable list is a preference (HMRE line 690): Quick build draws from it first,
// and neither the rules check nor Quick build's gate refuses a Virtue off it. The gruagach's is a limit
// (HMRE line 2953).

import { describe, expect, it } from 'vitest';
import { buildGameData } from '../../data';
import { HEDGE_HERMETIC, HEDGE_TRADITION_OWN } from '../../data/hedgeTraditionVirtues';
import { deriveCharacter } from '../character/derive';
import { addVirtue, newCharacter } from '../character/factory';
import { vfProblems } from '../character/restrictions';
import { validateCharacter } from '../character/validate';
import { DEFAULT_HOUSE_RULES, type Character, type GuidedState } from '../types';
import { CULT_MYSTERIES } from './buildMysteries';
import { choose } from './buildShared';
import { QUESTIONS } from './questions';
import { evaluate, shortlist, type Scored } from './score';
import { TAGS } from './tags';
import { FAERIE_METHOD_IDS, FAERIE_POWER_IDS, TRADITIONS, offSuitableList, traditionGate, type Tradition } from './traditionRules';

const data = buildGameData();
const raw = (glob: Record<string, unknown>) => Object.entries(glob as Record<string, string>);
const guidedSources = raw(import.meta.glob(['./*.ts', '!./*.test.ts'], { query: '?raw', import: 'default', eager: true }));

describe('every hand-written id list in src/engine/guided/ resolves', () => {
  const known = new Set<string>([
    ...data.virtuesFlaws.map((d) => d.id), ...data.abilities.map((a) => a.id), ...QUESTIONS.map((q) => q.id), ...TAGS.map((t) => t.id),
    // the character types
    'magus', 'companion', 'mythic', 'grog',
  ]);

  it('the traditions’ lists name Virtues, Flaws and Abilities that exist', () => {
    const lists: [string, readonly string[]][] = [
      ...TRADITIONS.flatMap((t): [string, readonly string[]][] => [[`${t.id} own`, t.own], [`${t.id} opens`, t.opens ?? []], [`${t.id} suitable`, t.hermetic?.ids ?? []]]),
      ...Object.entries(HEDGE_TRADITION_OWN).flatMap(([t, x]): [string, readonly string[]][] => [[`${t} own`, x.ids], [`${t} Hermetic too`, x.hermeticToo ?? []]]),
      ...Object.entries(HEDGE_HERMETIC).map(([t, x]): [string, readonly string[]] => [`${t} suitable`, x.ids]),
      ['Faerie Methods', FAERIE_METHOD_IDS], ['Faerie Powers', FAERIE_POWER_IDS], ['Mysteries', CULT_MYSTERIES.map((m) => m.id)],
    ];
    const unknown = lists.flatMap(([name, ids]) => ids.filter((id) => !data.vfById.has(id) && !data.abilityById.has(id)).map((id) => `${name}: ${id}`));
    expect(unknown).toEqual([]);
  });

  it('so does every list of ids written out in the source', () => {
    // an array of two or more quoted names, each like an id, one at least of which is one
    const unknown: string[] = [];
    for (const [path, src] of guidedSources) {
      for (const m of src.matchAll(/\[\s*('[^'\n]*'\s*,\s*)+'[^'\n]*'\s*,?\s*\]/g)) {
        const names = [...m[0].matchAll(/'([^'\n]*)'/g)].map((x) => x[1]);
        if (!names.every((n) => /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(n)) || !names.some((n) => known.has(n))) continue;
        unknown.push(...names.filter((n) => !known.has(n)).map((n) => `${path}: ${n}`));
      }
    }
    expect(unknown).toEqual([]);
  });

  it('the scan finds a list with a name that is no id', () => {
    const src = "const X = ['gentle-gift', 'cyclic-magic'];";
    const m = [...src.matchAll(/\[\s*('[^'\n]*'\s*,\s*)+'[^'\n]*'\s*,?\s*\]/g)];
    expect(m.length).toBe(1);
    expect(data.vfById.has('cyclic-magic')).toBe(false);
  });
});

const NO_ANSWERS: GuidedState = { answers: {}, declined: [] } as unknown as GuidedState;

/** A Gifted member of the tradition, its Social Status taken. */
function member(t: Tradition): Character {
  const c = newCharacter('companion', 's1');
  const def = TRADITIONS.find((x) => x.id === t)!;
  addVirtue(c, data, 'the-gift', 'Free');
  if (def.status) addVirtue(c, data, def.status, 'Free');
  return c;
}

// Magical Memory: on the folk witch's list, not the vitki's. Elemental Magic (DE): on no list.
const OFF: Record<Exclude<Tradition, 'faerie'>, string> = { witch: 'elemental-magic', learned: 'free-study', vitki: 'magical-memory', gruagach: 'elemental-magic' };

describe('a suitable list is a preference, the gruagach’s a limit', () => {
  for (const t of ['witch', 'learned', 'vitki'] as const) {
    it(`${t}: an off-list Hermetic Virtue is not refused`, () => {
      const c = member(t);
      expect(HEDGE_HERMETIC[t].ids).not.toContain(OFF[t]);
      expect(traditionGate(OFF[t], c, data, NO_ANSWERS, t), 'Quick build’s gate').toBeNull();
      expect(offSuitableList(OFF[t], c, data, t), 'but it is off the list').toBe(true);
      addVirtue(c, data, OFF[t], 'Minor');
      const d = deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
      expect(vfProblems(d, data, data.vfById.get(OFF[t])!, c.virtues.at(-1)).filter((p) => p.code === 'tradition'), 'the rules check').toEqual([]);
    });
  }

  it('gruagach: an off-list Hermetic Virtue is refused by Quick build and warned of by the rules check', () => {
    const c = member('gruagach');
    expect(traditionGate(OFF.gruagach, c, data, NO_ANSWERS, 'gruagach')).toMatch(/Not among the Hermetic Virtues and Flaws a gruagach may take/);
    // one on the list is not
    expect(traditionGate('affinity-with-art', c, data, NO_ANSWERS, 'gruagach')).toBeNull();
    addVirtue(c, data, OFF.gruagach, 'Minor');
    const d = deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
    expect(vfProblems(d, data, data.vfById.get(OFF.gruagach)!, c.virtues.at(-1)).map((p) => p.short)).toContain('Not on the gruagach’s list');
    // asked for by name ("unless the troupe decides otherwise"), Quick build takes it
    expect(traditionGate(OFF.gruagach, c, data, { answers: { [`vf:${OFF.gruagach}`]: 9 }, declined: [] } as unknown as GuidedState, 'gruagach')).toBeNull();
  });

  it('a Flaw the book lets a magus take as a Hermetic one is no tradition warning for a magus', () => {
    for (const id of ['vulnerable-to-form-flaw', 'weak-elemental-resistance-flaw']) {
      const c = newCharacter('magus', 's1');
      c.house = 'flambeau';
      addVirtue(c, data, id, data.vfById.get(id)!.sizes[0]);
      const d = deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
      expect(vfProblems(d, data, data.vfById.get(id)!, c.virtues.at(-1)).filter((p) => p.code === 'tradition'), id).toEqual([]);
      expect(validateCharacter(d, data, DEFAULT_HOUSE_RULES).filter((p) => /tradition/i.test(p.message)).map((p) => p.message), id).toEqual([]);
    }
  });
});

describe('Quick build draws from the suitable list first', () => {
  it('ranks an off-list Hermetic Virtue after every on-list one', () => {
    const c = member('witch');
    const ctx = { c, d: deriveCharacter(c, data, DEFAULT_HOUSE_RULES), data, rules: DEFAULT_HOUSE_RULES, archetypes: [] };
    const st = NO_ANSWERS;
    const list = shortlist(evaluate(st, ctx), 'virtue');
    const firstOff = list.findIndex((s) => s.offList);
    expect(firstOff, 'an off-list Virtue is offered').toBeGreaterThan(-1);
    expect(list.slice(firstOff).every((s) => s.offList), 'and every one after it is off the list too').toBe(true);
  });

  it('chooses one off the list only when nothing on it is left', () => {
    const c = member('witch');
    const opt = (id: string, fit: number, offList?: true): Scored => ({ def: data.vfById.get(id)!, fit, offList } as Scored);
    const inp = { data, rng: () => 0 } as unknown as Parameters<typeof choose>[0];
    const pick = choose(inp, c, [opt('elemental-magic', 50, true), opt('magical-memory', 10)], () => 'Minor');
    expect(pick?.def.id).toBe('magical-memory');
    expect(choose(inp, c, [opt('elemental-magic', 50, true)], () => 'Minor')?.def.id).toBe('elemental-magic');
  });
});
