// What a built character carries besides its numbers: Personality Flaws for all the points the rules
// allow, the Reputations its Virtues and Flaws give, words for its Characteristics, and specialties.

import { describe, expect, it } from 'vitest';
import { buildGameData } from '../../data';
import { DEFAULT_HOUSE_RULES, type Saga } from '../types';
import { addVirtue, newCharacter } from '../character/factory';
import { deriveCharacter } from '../character/derive';
import { seeded } from '../generate/random';
import { autoBuild } from './autobuild';

const data = buildGameData();
const rules = DEFAULT_HOUSE_RULES;
const saga = { id: 's', tribunal: 'Rhine', currentYear: 1220 } as Saga;
const build = (type: 'magus' | 'companion' | 'grog', seed: number, themes: string[] = ['warrior']) => {
  const c = newCharacter(type, 's');
  c.creation.archetypes = themes;
  autoBuild(c, { answers: {}, declined: [] }, { data, rules, saga, archetypes: themes, rng: seeded(seed) });
  return { c, d: deriveCharacter(c, data, rules) };
};

describe('a built character', () => {
  it('takes one Major and one Minor Personality Flaw (a grog one Minor), each with its trait', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      for (const type of ['magus', 'companion'] as const) {
        const { c, d } = build(type, seed, [['warrior', 'scholar', 'rogue'][seed % 3]]);
        const pf = d.virtues.filter((v) => v.def?.kind === 'flaw' && v.def.categories.includes('Personality'));
        expect(pf.map((v) => v.cv.size).sort()).toEqual(['Major', 'Minor']);
        for (const v of pf) expect(c.personality.find((p) => p.trait === v.def!.name.replace(/\s*\(.*\)$/, ''))?.score).toBe(v.cv.size === 'Major' ? 6 : 3);
        // the Flaws' points are spent on Virtues
        expect(d.tally.virtuePoints).toBe(d.tally.allowedVirtuePoints);
      }
      const grog = build('grog', seed);
      expect(grog.d.virtues.filter((v) => v.def?.kind === 'flaw' && v.def.categories.includes('Personality')).map((v) => v.cv.size)).toEqual(['Minor']);
    }
  });

  it('describes each Characteristic above or below average, and gives its Abilities a specialty from the book', () => {
    const { c, d } = build('companion', 3);
    for (const ch of Object.keys(c.characteristics) as (keyof typeof c.characteristics)[]) expect(!!c.characteristicNotes?.[ch]).toBe(d.characteristics[ch].value !== 0);
    const withScore = c.abilities.filter((a) => (d.abilityByUid.get(a.uid)?.score ?? 0) > 0 && data.abilityById.get(a.abilityId)?.specialties?.length);
    expect(withScore.filter((a) => a.specialty).length).toBeGreaterThan(withScore.length * 0.7);
    for (const a of withScore.filter((x) => x.specialty)) expect(data.abilityById.get(a.abilityId)!.specialties).toContain(a.specialty);
  });
});

describe('a Flaw that lowers a Characteristic', () => {
  it('never lowers one a Virtue raises (Poor Strength beside Giant Blood)', () => {
    const clashes: string[] = [];
    for (let seed = 1; seed <= 16; seed++)
      for (const type of ['companion', 'grog'] as const)
        for (const random of [true, false]) {
          const c = newCharacter(type, 's');
          const themes = [['warrior', 'faerie', 'rogue', 'beast'][seed % 4]];
          c.creation.archetypes = themes;
          autoBuild(c, { answers: {}, declined: [] }, { data, rules, saga, archetypes: themes, rng: random ? seeded(seed) : undefined });
          const d = deriveCharacter(c, data, rules);
          const up = new Set(d.effects.flatMap((e) => ((e.type === 'charBonus' || e.type === 'greatChar') && e.amount > 0 ? [String(e.char)] : [])));
          for (const v of c.virtues.filter((x) => x.defId === 'poor-characteristic-flaw')) if (up.has(v.param ?? '')) clashes.push(`${type} ${seed}: Poor ${v.param}`);
        }
    expect(clashes).toEqual([]);
  }, 60000);
});

describe('Reputations from Virtues and Flaws', () => {
  it('Raised from the Dead brings a Reputation of 4 where the miracle happened (DE)', () => {
    const c = newCharacter('companion', 's');
    addVirtue(c, data, 'raised-from-the-dead-flaw', 'Major');
    addVirtue(c, data, 'excommunicate-flaw', 'Major');
    const reps = deriveCharacter(c, data, rules).reputations;
    expect(reps).toContainEqual(expect.objectContaining({ text: 'Raised from the Dead', score: 4 }));
    expect(reps).toContainEqual(expect.objectContaining({ text: 'Excommunicate (bad)', score: 3, scope: 'Church' }));
  });
});
