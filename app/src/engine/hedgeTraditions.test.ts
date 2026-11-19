// Which hedge tradition a character practices: each tradition's practice saga is recognized, and a
// single Art taken alone (the gruagach Form Vision, the learned Form Magicam) is not a tradition.
import { describe, expect, it } from 'vitest';
import { hasGruagach, hasHedgeMagic, hedgeTradition } from './hedgeTraditions';
import type { Character } from './types';

const fixtures = import.meta.glob('../../scripts/qa/fixtures/*.saga.json', { eager: true, import: 'default' }) as Record<string, { characters: Character[] }>;
const who = (file: string, id: string) => Object.entries(fixtures).find(([k]) => k.endsWith(`/${file}.saga.json`))![1].characters.find((c) => c.id === id)!;

describe('hedge traditions', () => {
  it('know each practice saga’s tradition', () => {
    expect(hedgeTradition(who('witch', '2f21ffa5c86f'))).toBe('witch');
    expect(hedgeTradition(who('learned', '70fe0036f986'))).toBe('learned');
    expect(hedgeTradition(who('elem', '1f8d2137a573'))).toBe('elemental');
    expect(hedgeTradition(who('gru', 'bf5f92f9a31e'))).toBe('gruagach');
    expect(hedgeTradition(who('vit', 'bd0eb3c7df9e'))).toBe('vitki');
    expect(hedgeTradition(who('vit', '21208df916be'))).toBe('nightwalker');
  });

  it('count no tradition for one Art taken alone, though the page still shows it', () => {
    const base = who('witch', '2f21ffa5c86f');
    for (const [defId, abilityId] of [['vision', 'gruagach-vision'], ['magicam', 'magicam']]) {
      const c: Character = { ...base, virtues: [{ uid: 'v', defId, size: 'Minor' }], abilities: [{ uid: 'a', abilityId, xp: {} }] };
      expect(hasHedgeMagic(c), defId).toBe(true);
      expect(hedgeTradition(c), defId).toBeUndefined();
    }
  });

  it('take the holy power Blessing, an Ability, for no gruagach’s Blessing, a Virtue', () => {
    // the gruagach practice saga's Ida: Blessing and Holy Music (RoP: The Divine), no hedge magic
    const ida = who('gru', 'd30684a76704');
    expect(ida.abilities.some((a) => a.abilityId === 'blessing')).toBe(true);
    expect(hasGruagach(ida)).toBe(false);
    expect(hasHedgeMagic(ida)).toBe(false);
    expect(hasGruagach(who('gru', 'bf5f92f9a31e'))).toBe(true);
  });
});
