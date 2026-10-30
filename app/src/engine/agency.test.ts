// Agencies (HoH: Societates): how many agents, recruiting, Bond, gifts, and the persuasion roll.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { ensureAbility, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { addAgencyXp, agencyCost, giftToAgent, impressRoll, maxAgents, persuasionRoll } from './agency';
import { DEFAULT_HOUSE_RULES, type Agent, type Character } from './types';

const data = buildGameData();
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
const agent = (o: Partial<Agent> = {}): Agent => ({ uid: 'a', name: 'Godfroi', status: 'Merchant', resources: '', bondTrait: 'Fear', bond: 2, resistance: 0, ...o });

describe('agencies', () => {
  it('lets a character control 2 × (Presence + Intrigue or Leadership), at least one', () => {
    const c = newCharacter('companion', 's');
    c.characteristics.Pre = 2;
    ensureAbility(c, 'intrigue', { apprenticeship: 15 }); // 2
    expect(maxAgents(d(c))).toBe(8);
    c.characteristics.Pre = -3;
    expect(maxAgents(d(c))).toBe(1);
  });

  it('wears Resistance down a step for its value in points, then raises the Bond like an Art', () => {
    const a = agent({ bond: 0, resistance: 3 });
    addAgencyXp(a, 4); // 3 → 2 (3 points), 1 carried
    expect(a).toMatchObject({ resistance: 2, xp: 1 });
    addAgencyXp(a, 4); // 5 points: 2 → 1 (2), 1 → 0 (1), recruited; Bond 0 → 1 (1), 1 left
    expect(a).toMatchObject({ resistance: 0, bond: 1, xp: 1 });
  });

  it('turns a pound of gifts into 5 points, never past Bond +3', () => {
    const a = agent({ bond: 2 });
    giftToAgent(a, 4);
    expect(a.bond).toBe(3);
    expect(giftToAgent(a, 4)).toMatch(/cannot raise/);
  });

  it('rolls persuasion against the task, its timeframe and risk', () => {
    const c = newCharacter('companion', 's');
    c.characteristics.Com = 2;
    ensureAbility(c, 'charm', { apprenticeship: 30 }); // 3
    const r = persuasionRoll(d(c), agent({ bond: 3 }), 4, 0, 2, () => 0.55); // Hard task (6) + injury (3): 9; stress die 5 + 2 + 3 + 3
    expect(r.ease).toBe(9);
    expect(r.total).toBe(13);
    expect(r.ok).toBe(true);
  });
  it('prices the starting agency at Bond + Resistance Strength, at least 1 each', () => {
    expect(agencyCost(agent({ bond: 2, strength: 1, fromCreation: true }))).toBe(3);
    // Aelfric, an Outlaw Leader with underlings: Resistance 0, Bond +1
    expect(agencyCost(agent({ bond: 1, strength: 0, fromCreation: true }))).toBe(1);
    expect(agencyCost(agent({ bond: 1, strength: -3, fromCreation: true }))).toBe(1);
  });
  it('impresses a would-be agent with Presence + Leadership − the Gift + a stress die against 6', () => {
    const c = newCharacter('magus', 's');
    c.characteristics.Pre = 1;
    ensureAbility(c, 'leadership', { apprenticeship: 5 }); // 1
    // a die of 7, no botch: 7 + 1 + 1 − 3 (the Gift) = 6
    const r = impressRoll(d(c), 0, () => 0.75);
    expect(r.ease).toBe(6);
    expect(r.total).toBe(6);
    expect(r.ok).toBe(true);
    // an inherited agent's former Bond adds to the Ease Factor
    expect(impressRoll(d(c), 2, () => 0.75).ok).toBe(false);
  });
});
