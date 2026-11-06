// What a character owns: one list, damage kept on each item, giving and discarding (City & Guild, Damaged Goods).
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newCharacter } from './character/factory';
import { discardItem, giveItem, newPossession, ownedItems, setCondition } from './possessions';

const data = buildGameData();
const sword = [...data.weaponById.values()].find((w) => w.ability === 'Single Weapon' && (w.dam ?? 0) > 0 && !/shield/i.test(w.name))!;
const shield = [...data.weaponById.values()].find((w) => /shield/i.test(w.name))!;

describe('possessions', () => {
  it('lists weapons, shields, armor, enchanted items and other possessions, each with its damage levels', () => {
    const c = newCharacter('grog', 's');
    c.equipment.weapons = [{ uid: 'l1', weaponId: sword.id, shieldId: shield.id }];
    c.possessions = [newPossession('p1', 'cart', 'standard', 'The covenant cart')];
    const items = ownedItems(c, data);
    expect(items.map((i) => i.key)).toEqual(['w:l1', 's:l1', 'p:p1']);
    expect(items[0].ability).toBe('single-weapon');
    // a standard item has 2 damage levels; a cart (Size +2) twice that
    expect(items[0].levels).toBe(2);
    expect(items[2].levels).toBe(4);
  });

  it('keeps the damage on the item, and it goes with the item when given', () => {
    const a = newCharacter('grog', 's');
    const b = newCharacter('grog', 's');
    a.equipment.weapons = [{ uid: 'l1', weaponId: sword.id, shieldId: shield.id }];
    setCondition(a, 'w:l1', { lost: 1, repaired: true });
    expect(ownedItems(a, data)[0].condition).toEqual({ lost: 1, repaired: true });
    expect(giveItem(a, b, 'w:l1')).toBeUndefined();
    // the shield stays with the giver, as its own
    expect(ownedItems(a, data).map((i) => i.what)).toEqual(['shield']);
    expect(a.equipment.weapons[0].weaponId).toBe(shield.id);
    const got = ownedItems(b, data).find((i) => i.what === 'weapon')!;
    expect(got.condition).toEqual({ lost: 1, repaired: true });
  });

  it('will not give armor to someone already wearing some, and a broken item can be discarded', () => {
    const a = newCharacter('grog', 's');
    const b = newCharacter('grog', 's');
    const armor = [...data.armorById.keys()][0];
    a.equipment.armorId = armor;
    a.equipment.armorCoverage = 'partial';
    b.equipment.armorId = armor;
    b.equipment.armorCoverage = 'full';
    expect(giveItem(a, b, 'armor')).toMatch(/already wear armor/);
    expect(a.equipment.armorId).toBe(armor);
    a.possessions = [newPossession('p1', 'tool', 'shoddy', 'A cracked lute')];
    expect(discardItem(a, 'p:p1')).toBe(true);
    expect(a.possessions).toEqual([]);
  });
});
