// A Bjornaer in heartbeast form (HoH: Mystery Cults, Statistics of Shapechangers), checked against the book's own example.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { MUNDANE_BEASTS } from '../data/beasts';
import { HEARTBEASTS } from '../data/houses';
import { newCharacter, setHouse } from './character/factory';
import { deriveCharacter } from './character/derive';
import { generateCharacter } from './generate/character';
import { beastFor, blendCharacteristic, heartbeastForm } from './heartbeast';
import { DEFAULT_HOUSE_RULES, type Saga } from './types';

const data = buildGameData();
const rules = DEFAULT_HOUSE_RULES;

describe('the heartbeast form', () => {
  it('has the core book’s eleven mundane beasts, with their combat lines', () => {
    expect(MUNDANE_BEASTS.map((b) => b.id)).toEqual(['bear', 'boar-wild', 'bull', 'cat', 'falcon', 'horse-courser', 'horse-destrier', 'hound', 'lion', 'stag', 'wolf']);
    expect(MUNDANE_BEASTS.find((b) => b.id === 'wolf')).toMatchObject({ size: -1, soak: 4, combat: [{ name: 'Teeth', init: 2, attack: 11, defense: 9, damage: 0 }] });
    expect(beastFor('Wolf')?.id).toBe('wolf');
    expect(beastFor('a wild boar')?.id).toBe('boar-wild');
    expect(beastFor('horse')?.id).toBe('horse-courser');
    expect(beastFor('raven')).toBeUndefined();
  });

  it('folds the magus’s Characteristics in by the book’s rule, as in its example of Ulf', () => {
    // Ulf and the Mystery Cults wolf: Int +2 kept; Per -1 & +2 → +1; Pre +2 & 0 → +2; Com 0 & +1 → +1; Str -1 & -1 → -1; Sta +1 & +3 → +3; Dex +1 & +2 → +2; Qik +1 & +1 → +1
    const ulf = { Per: -1, Pre: 2, Com: 0, Str: -1, Sta: 1, Dex: 1, Qik: 1 };
    const mcWolf = { Per: 2, Pre: 0, Com: 1, Str: -1, Sta: 3, Dex: 2, Qik: 1 };
    const blended = Object.fromEntries(Object.entries(ulf).map(([k, v]) => [k, blendCharacteristic(v, mcWolf[k as keyof typeof mcWolf])]));
    expect(blended).toEqual({ Per: 1, Pre: 2, Com: 1, Str: -1, Sta: 3, Dex: 2, Qik: 1 });
    // on the sheet, with the core book's wolf (Per 0, Pre -2, Com 0, Str -1, Sta +3, Dex +2, Qik +2)
    const c = newCharacter('magus', 's');
    setHouse(c, data, 'bjornaer', 0);
    c.heartbeast = 'wolf';
    Object.assign(c.characteristics, { Int: 2, ...ulf });
    const form = heartbeastForm(deriveCharacter(c, data, rules))!;
    expect(form.characteristics).toEqual({ Int: 2, Per: -1, Pre: 0, Com: 0, Str: -1, Sta: 3, Dex: 2, Qik: 2 });
    // the same Quickness, Dexterity, Strength and Stamina as the wolf: its teeth and Soak as printed
    expect(form.combat[0]).toMatchObject({ init: 2, attack: 11, defense: 9, damage: 0 });
    expect(form.soak).toBe(4);
    // a stronger magus hits harder in wolf form: Str +2 and the wolf's -1 add to +1, two above the wolf's
    c.characteristics.Str = 2;
    expect(heartbeastForm(deriveCharacter(c, data, rules))!.combat[0].damage).toBe(2);
  });

  it('a Quick-built Bjornaer takes a beast the book gives', () => {
    const saga = { id: 's', name: 'S', currentYear: 1220, currentSeason: 'Spring', tribunal: 'Rhine', enabledBooks: [], houseRules: rules, mechanicsOverrides: {}, custom: { virtuesFlaws: [], abilities: [], spells: [] } } as unknown as Saga;
    for (const seed of [1, 2, 3]) {
      const g = generateCharacter({ type: 'magus', house: 'bjornaer', variety: 'varied', npc: false, seed }, { data, saga, rules });
      expect(beastFor(g.c.heartbeast), g.c.heartbeast).toBeTruthy();
    }
    expect(HEARTBEASTS.filter((h) => beastFor(h)).length).toBeGreaterThanOrEqual(9);
  }, 120_000);
});
