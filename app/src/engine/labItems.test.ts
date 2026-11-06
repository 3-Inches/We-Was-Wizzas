// Magic items for laboratories (Covenants): an item's effect must be new to the lab (a second one
// giving the same Virtue gives nothing), and a custom item's points come from its levels.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { deriveLab, labItemBudget, newLab } from './lab';
import type { EnchantedItem } from './types';

const data = buildGameData();

describe('magic items in a lab', () => {
  it('gives a Virtue once: a second item giving it again adds nothing', () => {
    const lab = newLab('Lab');
    const one = deriveLab(lab, data);
    lab.virtues.push({ uid: 'a', defId: 'superior-equipment', note: 'Glassware', fromItem: 'i1' });
    const with1 = deriveLab(lab, data);
    lab.virtues.push({ uid: 'b', defId: 'superior-equipment', note: 'More glassware', fromItem: 'i2' });
    const with2 = deriveLab(lab, data);
    expect(with1.characteristics['General Quality']).toBe(one.characteristics['General Quality'] + 1);
    expect(with2.characteristics['General Quality']).toBe(with1.characteristics['General Quality']);
    expect(with2.issues.some((i) => /twice/.test(i))).toBe(true);
  });

  it('counts a custom item’s points against its levels: 10 a Specialization point, 20 a Characteristic point', () => {
    const item = { uid: 'i', name: 'Bookstand', effects: [{ modifiedLevel: 30, baseLevel: 20 }] } as unknown as EnchantedItem;
    const b = labItemBudget({ uid: 'v', defId: 'magic-item', fromItem: 'i', choice: { Texts: 1 }, inputs: { 'General Quality': 1 } }, item)!;
    expect(b).toEqual({ levels: 30, used: 30 });
  });
});
