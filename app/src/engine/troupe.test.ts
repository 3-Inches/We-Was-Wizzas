// The troupe: players and how far along their characters are, and what a character sent again changes.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { addVirtue, newCharacter } from './character/factory';
import { characterChanges, troupeOf } from './troupe';
import { DEFAULT_HOUSE_RULES, type Saga } from './types';

const data = buildGameData();
const rules = DEFAULT_HOUSE_RULES;
const saga = { id: 's', name: 'S', currentYear: 1220, currentSeason: 'Spring', tribunal: 'Rhine', enabledBooks: [], houseRules: rules, mechanicsOverrides: {}, custom: { virtuesFlaws: [], abilities: [], spells: [] }, playerOrder: ['Ann', 'Bea'] } as unknown as Saga;

describe('the troupe', () => {
  it('lists each player with their characters, in turn order, and a named player with none as not started', () => {
    const a = newCharacter('magus', 's');
    a.name = 'Aurelia';
    a.player = 'ann';
    const b = newCharacter('companion', 's');
    b.name = 'Konrad';
    b.player = 'Cy';
    b.creation.finalized = true;
    const npc = newCharacter('grog', 's');
    npc.npc = true;
    const loose = newCharacter('grog', 's');
    loose.name = 'Hans';
    const t = troupeOf(saga, [a, b, npc, loose], data);
    expect(t.map((p) => p.name)).toEqual(['Ann', 'Bea', 'Cy', '']);
    expect(t[0].characters.map((x) => [x.c.name, x.standing])).toEqual([['Aurelia', 'creation']]);
    expect(t[1].characters).toEqual([]);
    // a finished character the rules check finds fault with has rules to fix
    expect(['fix', 'finished']).toContain(t[2].characters[0].standing);
    expect(t[3].characters.map((x) => x.c.name)).toEqual(['Hans']);
    expect(t.flatMap((p) => p.characters).some((x) => x.c.id === npc.id)).toBe(false);
  });

  it("says what a character sent again changes: Virtues, Abilities, Arts, Characteristics, spells", () => {
    const before = newCharacter('magus', 's');
    before.name = 'Aurelia';
    const after = structuredClone(before);
    after.name = 'Aurelia of Tytalus';
    after.characteristics.Int = 2;
    after.arts.Re = { laterLife: 55 };
    addVirtue(after, data, 'puissant-art', 'Minor', 'Re');
    after.abilities.push({ uid: 'mt', abilityId: 'magic-theory', xp: { apprenticeship: 30 } } as never);
    after.warpingPoints = 2;
    const lines = characterChanges(before, after, data, rules);
    const text = lines.map((l) => `${l.kind}:${l.text}`).join(' | ');
    expect(text).toMatch(/changed:Name: Aurelia → Aurelia of Tytalus/);
    expect(text).toMatch(/changed:Intelligence 0 → 2/);
    expect(text).toMatch(/added:Puissant Rego/);
    expect(text).toMatch(/added:Magic Theory 3/);
    expect(text).toMatch(/changed:Rego 0 → 1[0-9]/);
    expect(text).toMatch(/changed:Warping Points 0 → 2/);
    expect(characterChanges(before, structuredClone(before), data, rules)).toEqual([]);
  });
});
