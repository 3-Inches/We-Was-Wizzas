// The Nightwalkers (Hedge Magic, Revised Edition): straying and the night battles.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { addVirtue, ensureAbility, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { DEFAULT_HOUSE_RULES } from './types';
import { BATTLE_OUTCOMES, leadEase, strayEase, strayTotal } from './nightwalker';

const data = buildGameData();

describe('nightwalkers', () => {
  it('the Nightwalker Virtue gives Second Sight 1 for the spirit', () => {
    const c = newCharacter('companion', 'n');
    addVirtue(c, data, 'nightwalker', 'Major');
    expect(deriveCharacter(c, data, DEFAULT_HOUSE_RULES).abilities.find((a) => a.abilityId === 'second-sight')?.total).toBe(1);
  });
  it('spirit travel: Stamina + Athletics against the destination, +3 an object; leading another +3', () => {
    const c = newCharacter('companion', 'n');
    c.characteristics.Sta = 2;
    ensureAbility(c, 'athletics', { play: 15 });
    expect(strayTotal(deriveCharacter(c, data, DEFAULT_HOUSE_RULES))).toBe(4);
    expect(strayEase(9, 2)).toBe(15);
    expect(leadEase(9)).toBe(12);
    expect(leadEase()).toBe(3);
  });
  it('a battle won holds the harvest; a rout of the enemy makes it grow', () => {
    expect(BATTLE_OUTCOMES.map((o) => o.mod)).toEqual(['Slump', 'Contraction', 'Stagnation', 'Status Quo', 'Growth', 'Expansion', 'Boom']);
  });
});
