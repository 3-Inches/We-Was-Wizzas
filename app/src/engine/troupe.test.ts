// The troupe: players and how far along their characters are, and what a character sent again changes.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { addVirtue, ensureAbility, newCharacter } from './character/factory';
import { CHANGE_FIELDS, characterChanges, fieldChanges, troupeOf, type Named } from './troupe';
import { DEFAULT_HOUSE_RULES, type Character, type Saga } from './types';

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

  it('never says nothing changed when something did: numbers set by hand, rulings, Confidence, what they carry', () => {
    const before = newCharacter('companion', 's');
    before.name = 'Konrad';
    addVirtue(before, data, 'relic', 'Minor');
    const ab = { uid: 'br', abilityId: 'brawl', xp: { laterLife: 15 } };
    before.abilities.push(ab as never);
    const after = structuredClone(before);
    after.overrides[`ability:${ab.uid}`] = 6;
    after.overrides.soak = 9;
    after.acknowledgedIssues = ['points-balance'];
    after.confidence = { score: 2, points: 7 };
    after.personality.push({ uid: 'p', trait: 'Brave', score: 3 });
    after.equipment.other = 'a sword and a lantern';
    const text = characterChanges(before, after, data, rules).map((l) => `${l.kind}:${l.text}`).join(' | ');
    expect(text).toMatch(/added:Set by hand: Brawl = 6/);
    expect(text).toMatch(/added:Set by hand: soak = 9/);
    expect(text).toMatch(/added:1 rules problem allowed as a troupe ruling/);
    expect(text).toMatch(/changed:Confidence 1 \(3\) → 2 \(7\)/);
    expect(text).toMatch(/added:Personality Trait: Brave \+3/);
    expect(text).toMatch(/changed:Weapons, armor or other equipment/);
    // a Virtue that changed size is one removed and one added
    const sized = structuredClone(before);
    sized.virtues.find((v) => v.defId === 'relic')!.size = 'Major';
    expect(characterChanges(before, sized, data, rules).map((l) => l.kind).sort()).toEqual(['added', 'removed']);
    // something no line names still shows
    const other = structuredClone(before);
    other.gender = 'Female';
    expect(characterChanges(before, other, data, rules)).toEqual([{ kind: 'changed', text: 'Other details of the sheet differ' }]);
  });

  it('names hedge, faerie and holy changes: Sympathy Traits, hedge Arts, charms, spells, scripts, potions, Devotion Points, holy work', () => {
    const before = newCharacter('companion', 's');
    addVirtue(before, data, 'mathematicus-of-bologna', 'Free');
    addVirtue(before, data, 'succurro', 'Major');
    addVirtue(before, data, 'salutem', 'Minor');
    before.sympathy = [{ uid: 'dawn', trait: 'Dawn', score: 3 }];
    before.devotions = [{ uid: 'm', saint: 'Saint Martin', points: 2 }];
    before.creation.finalized = true;
    const after = structuredClone(before);
    after.sympathy = [{ uid: 'dawn', trait: 'Dawn', score: 4 }, { uid: 'iron', trait: 'Iron', score: -1 }];
    ensureAbility(after, 'succurro', { laterLife: 5 });
    after.learned = { charms: [{ uid: 'c', name: 'Ward of the Hearth', tf: 'TuSa', level: 10, range: 'Touch', duration: 'Sun', target: 'Individual', source: 'play' }] };
    after.gruagach = { spells: [{ uid: 'g', name: 'The Giant’s Grip', tf: 'GvBl', level: 15, range: 'Touch', duration: 'Momentary', target: 'Individual', source: 'play' }] };
    after.vitki = { scripts: [{ uid: 'v', name: 'Ward against Iron', runes: ['Algiz', 'Isa'], level: 10, method: 'I', source: 'play' }] };
    after.folkWitch = { things: [{ uid: 'p', power: 'witch-healing', name: 'Willow-bark draught', kind: 'potion', doses: 3 }] };
    after.devotions = [{ uid: 'm', saint: 'Saint Martin', points: 3 }];
    after.holy = { works: [{ uid: 'w', kind: 'amulet', name: 'Amulet of the Seven', target: 20, progress: 5, seasons: 1 }], trueNames: ['Sammael'] };
    after.powers = [{ uid: 'pw', name: 'Wings of the Dove' } as never];
    after.gender = 'Male';
    const lines = characterChanges(before, after, data, rules).map((l) => `${l.kind}:${l.text}`);
    const text = lines.join(' | ');
    expect(text).toMatch(/changed:Sympathy Trait: Dawn \+3 → Dawn \+4/);
    expect(text).toMatch(/added:Sympathy Trait: Iron −1|added:Sympathy Trait: Iron -1/);
    expect(text).toMatch(/changed:Succurro 0 → 1/);
    expect(text).toMatch(/added:Charm: Ward of the Hearth \(TuSa 10\)/);
    expect(text).toMatch(/added:Gruagach spell: The Giant’s Grip \(GvBl 15\)/);
    expect(text).toMatch(/added:Rune script: Ward against Iron \(level 10\)/);
    expect(text).toMatch(/added:Potion or fetish: Willow-bark draught \(potion, 3 doses\)/);
    expect(text).toMatch(/changed:Devotion Points: Saint Martin 2 → Saint Martin 3/);
    expect(text).toMatch(/added:Holy work: Amulet of the Seven 5 of 20/);
    expect(text).toMatch(/changed:True Names/);
    expect(text).toMatch(/added:Supernatural power: Wings of the Dove/);
    // the line of other details is said beside the others, not only when nothing else changed
    expect(lines).toContain('changed:Other details of the sheet differ');
    expect(text).not.toMatch(/nothing the rules count/);
  });

  it('names a change to every field a rule reads, and keeps the line of other details for what none reads', () => {
    const base = newCharacter('companion', 's');
    // a value of the field's own shape, different from the one before
    const changedValue = (how: Named) => {
      if (how.item) return [{ uid: 'test', name: 'Test', trait: 'Test', score: 1, saint: 'Test', points: 1, text: 'Test', virtueName: 'Test', spirit: 'Test', title: 'Test', kind: 'test', tf: 'TuSa', level: 1, label: 'Test', amount: 1 }];
      return 'test value';
    };
    for (const [k, how] of Object.entries(CHANGE_FIELDS) as [keyof Character, (typeof CHANGE_FIELDS)[keyof Character]][]) {
      if (typeof how !== 'object') continue;
      const after = structuredClone(base);
      // an object's part no rule names is added to what is there, so nothing else of it differs
      (after as unknown as Record<string, unknown>)[k] = how.parts ? { ...((base as unknown as Record<string, object>)[k] ?? {}), testPart: 1 } : changedValue(how);
      const r = fieldChanges(base, after);
      expect(r.lines.map((l) => l.text).join(' | '), k).toContain(how.label);
      expect(r.other, k).toBe(false);
      // each named part of a field, by its own name
      for (const [part, sub] of Object.entries(how.parts ?? {})) {
        if (typeof sub !== 'object') continue;
        const withPart = structuredClone(base);
        (withPart as unknown as Record<string, unknown>)[k] = { ...((base as unknown as Record<string, object>)[k] ?? {}), [part]: changedValue(sub) };
        expect(fieldChanges(base, withPart).lines.map((l) => l.text).join(' | '), `${k}.${part}`).toContain(sub.label);
      }
    }
    for (const [k, how] of Object.entries(CHANGE_FIELDS)) {
      if (how !== 'other') continue;
      const after = structuredClone(base);
      (after as unknown as Record<string, unknown>)[k] = 'test value';
      expect(fieldChanges(base, after), k).toEqual({ lines: [], other: true });
      expect(characterChanges(base, after, data, rules).map((l) => l.text), k).toEqual(['Other details of the sheet differ']);
    }
    // a field the list compares line by line above is not named twice
    const finished = structuredClone(base);
    finished.creation.finalized = true;
    expect(characterChanges(base, finished, data, rules).map((l) => l.text)).toEqual(['Creation finished']);
  });
});
