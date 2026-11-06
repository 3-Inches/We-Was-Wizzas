// After the roll: how many Confidence and Faith Points one roll may take, and All According to Plan's
// reroll of a botch die (DE p.52, p.419; the Virtue).
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { afterRollMax, rerollBotchDie } from './afterRoll';
import { DEFAULT_HOUSE_RULES } from './types';
import { opposedOutcome } from './rolls';

const data = buildGameData();

describe('after the roll', () => {
  it('lets a roll take Confidence up to the Score, from the points held, and none for a grog', () => {
    const c = newCharacter('companion', 's');
    c.confidence = { score: 2, points: 7 };
    expect(afterRollMax(c, deriveCharacter(c, data, DEFAULT_HOUSE_RULES)).confidence).toBe(2);
    c.confidence = { score: 2, points: 1 };
    expect(afterRollMax(c, deriveCharacter(c, data, DEFAULT_HOUSE_RULES)).confidence).toBe(1);
    const g = newCharacter('grog', 's');
    g.confidence = { score: 1, points: 3 };
    expect(afterRollMax(g, deriveCharacter(g, data, DEFAULT_HOUSE_RULES)).confidence).toBe(0);
  });

  it('lets Faith Points go on a roll up to the True Faith Score, one at a time without a Score', () => {
    const c = newCharacter('companion', 's');
    c.faith = { score: 0, points: 4 };
    expect(afterRollMax(c, deriveCharacter(c, data, DEFAULT_HOUSE_RULES)).faith).toBe(1);
    c.faith = { score: 3, points: 4 };
    expect(afterRollMax(c, deriveCharacter(c, data, DEFAULT_HOUSE_RULES)).faith).toBe(3);
  });

  it('rerolls one botch die that showed a zero', () => {
    const zeroThenFive = (() => {
      const seq = [0.5];
      return () => seq.shift() ?? 0.5;
    })();
    const r = rerollBotchDie([3, 0, 0], zeroThenFive);
    expect(r.faces).toEqual([3, 5, 0]);
    expect(r.botches).toBe(1);
    const all = rerollBotchDie([0], () => 0.7);
    expect(all.botches).toBe(0);
  });

  it('judges a contest again when Confidence changes a total', () => {
    const a = { total: 10, botched: false, text: '', base: 6 };
    const b = { total: 12, botched: false, text: '', base: 7 };
    expect(opposedOutcome(a, b).winner).toBe('b');
    expect(opposedOutcome({ ...a, total: 13, bonus: 3 }, b).winner).toBe('a');
    expect(opposedOutcome({ ...a, total: 12, bonus: 3 }, b).winner).toBe('b');
  });
});
