// Faerie characters (Realms of Power: Faerie, Chapter Three): Might, Pretense points, the required
// Virtues and Flaws, the Virtue budget and what a faerie may not take.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../../data';
import { addVirtue, newCharacter } from './factory';
import { deriveCharacter } from './derive';
import { validateCharacter } from './validate';
import { newFaerieCreature } from './faerieCharacter';
import { DEFAULT_HOUSE_RULES, type Character } from '../types';

const data = buildGameData();
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
const ids = (c: Character) => validateCharacter(d(c), data, DEFAULT_HOUSE_RULES).map((i) => i.id);

function faerie(replaces: 'companion' | 'magus' = 'companion', age = 21): Character {
  const c = newCharacter('companion', 's');
  c.creature = newFaerieCreature(replaces, age);
  c.virtues = c.virtues.filter((v) => !data.vfById.get(v.defId)?.categories.includes('Social Status'));
  for (const id of ['narrowly-cognizant', 'passes-for-human']) addVirtue(c, data, id, 'Free');
  return c;
}

describe('faerie characters', () => {
  it('Might 5, +5 a Minor and +15 a Major Increased Faerie Might; it is the faerie’s Might', () => {
    const c = faerie();
    expect(d(c).faerieChar!.might).toBe(5);
    addVirtue(c, data, 'increased-faerie-might', 'Minor');
    addVirtue(c, data, 'increased-faerie-might', 'Major');
    const dc = d(c);
    expect(dc.faerieChar!.might).toBe(25);
    expect(dc.might).toMatchObject({ realm: 'Faerie', score: 25 });
  });
  it('Pretense points: 15 × (the magi’s age − 5) + 120, 20 Pretentious, less 50 Freshly Sprung', () => {
    const c = faerie();
    expect(d(c).faerieChar!.pretensePoints).toBe(360);
    expect(d(c).budgets.find((b) => b.id === 'laterLife')!.total).toBe(360);
    addVirtue(c, data, 'pretentious', 'Minor');
    addVirtue(c, data, 'freshly-sprung-flaw', 'Minor');
    expect(d(c).faerieChar!.pretensePoints).toBe(20 * 16 + 120 - 50);
  });
  it('any Ability is a Pretense: Martial, Academic and Arcane need no Virtue', () => {
    const dc = d(faerie());
    expect(['Martial', 'Academic', 'Arcane'].every((t) => dc.abilityAccess.types.has(t as never))).toBe(true);
  });
  it('requires a form, a taboo; Narrowly Cognizant and Passes for Human come free', () => {
    const c = faerie();
    const first = ids(c);
    expect(first).toContain('faerie-a physical form');
    expect(first).toContain('faerie-a taboo');
    expect(first).not.toContain('faerie-a level of cognizance');
    expect(first).not.toContain('status-none');
    addVirtue(c, data, 'humanoid-faerie', 'Minor');
    addVirtue(c, data, 'traditional-ward-flaw', 'Minor');
    const after = ids(c);
    expect(after).not.toContain('faerie-a physical form');
    expect(after).not.toContain('faerie-a taboo');
  });
  it('no Gift, no human Social Status, no Confidence; in place of a magus two Virtue points a Flaw point', () => {
    const c = faerie('magus');
    addVirtue(c, data, 'covenfolk', 'Free');
    expect(ids(c)).toContain('faerie-status');
    const dc = d(c);
    expect(dc.confidence.score).toBe(0);
    addVirtue(c, data, 'traditional-ward-flaw', 'Minor');
    expect(d(c).tally.allowedVirtuePoints).toBe(1 + 2);
  });
});
