import { describe, expect, it } from 'vitest';
import { deprivationEase, exchange, fallingBonus, opposedRoll, perilDamage, staminaCheck, woundBySize } from './rolls';

/** A die that shows these faces in turn (0–9). */
const faces = (...f: number[]) => {
  let i = 0;
  return () => (f[i++ % f.length] + 0.5) / 10;
};

describe('rolls of a session', () => {
  it('opposed: the higher total wins, a tie holds for the one resisting, a botch loses', () => {
    expect(opposedRoll({ mod: 5 }, { mod: 3 }, faces(6, 6)).winner).toBe('a'); // 11 against 9
    const tie = opposedRoll({ mod: 3 }, { mod: 5 }, faces(6, 4)); // 9 against 9
    expect(tie.winner).toBe('b');
    expect(tie.text).toMatch(/a tie/);
    expect(opposedRoll({ mod: 9 }, { mod: 0 }, faces(0, 0, 5)).winner).toBe('b'); // a botches
  });

  it('a wound is 5 + Size points wide', () => {
    expect(woundBySize(5)).toBe('light');
    expect(woundBySize(6)).toBe('medium');
    expect(woundBySize(16)).toBe('incapacitating');
    expect(woundBySize(21)).toBe('dead');
    expect(woundBySize(6, 1)).toBe('light');
    expect(woundBySize(0)).toBe('none');
  });

  it('a blow: Attack Advantage + weapon Damage − Soak gives the wound; a miss and a botch do nothing', () => {
    // attack 9 + 8 = 17 against defense 6 + 4 = 10: advantage 7, damage 7 + 5 = 12, soak 3: 9 → medium
    const hit = exchange({ atk: 9, dam: 5, dfn: 6, soak: 3 }, faces(8, 4));
    expect(hit).toMatchObject({ advantage: 7, damage: 12, excess: 9, wound: 'medium' });
    expect(exchange({ atk: 3, dam: 5, dfn: 9, soak: 3 }, faces(4, 4)).wound).toBe('none');
    expect(exchange({ atk: 30, dam: 5, dfn: 0, soak: 0 }, faces(0, 0, 5)).text).toMatch(/botch/);
  });

  it('perils: falls, damage against Soak, Stamina checks, deprivation', () => {
    expect(fallingBonus(20, 'normal')).toBe(10);
    expect(fallingBonus(20, 'hard')).toBe(20);
    expect(fallingBonus(20, 'soft')).toBe(5);
    // damage 10 + 6 = 16 against soak 2 + 3 = 5: 11 → heavy
    expect(perilDamage(10, 2, undefined, faces(6, 3)).wound).toBe('heavy');
    expect(staminaCheck(2, 9, faces(7)).ok).toBe(true);
    expect(staminaCheck(0, 9, faces(7)).ok).toBe(false);
    expect(deprivationEase(1)).toBe(3);
    expect(deprivationEase(4)).toBe(6);
  });
});
