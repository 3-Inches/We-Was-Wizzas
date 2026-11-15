// Quick build for player characters: every magus with magic of their own, and a plain build that
// keeps to the core book's Virtues and Flaws.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../../data';
import { HOUSES } from '../../data/houses';
import { DEFAULT_HOUSE_RULES, type Saga } from '../types';
import { generateCharacter } from './character';

const data = buildGameData();
const rules = DEFAULT_HOUSE_RULES;
const saga = { id: 's', name: 'S', currentYear: 1220, currentSeason: 'Spring', tribunal: 'Rhine', enabledBooks: [], houseRules: rules, mechanicsOverrides: {}, custom: { virtuesFlaws: [], abilities: [], spells: [] } } as unknown as Saga;
const hermeticOwn = (c: ReturnType<typeof generateCharacter>['c']) =>
  c.virtues.filter((v) => {
    const def = data.vfById.get(v.defId);
    return def?.kind === 'virtue' && def.categories.includes('Hermetic') && v.defId !== 'the-gift' && (!v.free || v.freeReason === 'Ex Miscellanea');
  });

describe('Quick build for players', () => {
  it('gives every magus a Hermetic Virtue of their own, in an Art they are not Deficient in', () => {
    for (const h of HOUSES) {
      for (const seed of [1, 2]) {
        const g = generateCharacter({ type: 'magus', house: h.id, variety: 'varied', npc: false, seed }, { data, saga, rules });
        const own = hermeticOwn(g.c);
        expect(own.length, `${h.name} #${seed}: ${g.c.virtues.map((v) => v.defId).join(', ')}`).toBeGreaterThan(0);
        const deficient = g.c.virtues.filter((v) => v.defId.startsWith('deficient-')).map((v) => v.param);
        for (const v of own) if (v.defId === 'affinity-with-art' || v.defId === 'puissant-art') expect(deficient, h.name).not.toContain(v.param);
      }
    }
  }, 300_000);

  it('adds that magic only where the Virtue choices left none: most magi reach their own', () => {
    let added = 0;
    let magi = 0;
    for (const h of HOUSES) {
      for (const seed of [1, 2, 3]) {
        const g = generateCharacter({ type: 'magus', house: h.id, variety: 'varied', npc: false, seed }, { data, saga, rules });
        magi++;
        if (g.log.some((l) => /magic of their own/.test(l))) added++;
      }
    }
    expect(added).toBeLessThan(magi / 2);
  }, 300_000);

  it('a plain build keeps to the core book, whatever the saga uses', () => {
    for (const [type, house] of [['magus', 'jerbiton'], ['magus', 'flambeau'], ['companion', undefined], ['grog', undefined]] as const) {
      for (const seed of [1, 2, 3]) {
        const g = generateCharacter({ type, house, variety: 'varied', coreOnly: true, npc: false, seed }, { data, saga, rules });
        const beyond = g.c.virtues
          .filter((v) => !v.free && !v.requiredBy)
          .map((v) => data.vfById.get(v.defId)!)
          .filter((def) => def.source.book !== 'DE' && !def.alsoIn?.some((a) => a.book === 'DE'));
        expect(beyond.map((d) => `${d.name} (${d.source.book})`), `${type} ${house ?? ''} #${seed}`).toEqual([]);
      }
    }
  }, 300_000);
});
