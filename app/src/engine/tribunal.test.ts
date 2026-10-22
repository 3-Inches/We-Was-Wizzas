// Tribunal customs: Rhine sigils and communion, Theban propitiation and status, Normandy's Tourney and
// cursors, and that each is offered only in its own Tribunal and off until chosen.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { OPTIONAL_RULES, optionOn, tribunalOptions } from './optional';
import { RHINE_RANKS, communionRoll, cursorMiles, forestUnderstanding, propitiationXp, thebanStatus, tourneyPrize, tourneyTally, FOREST_PATHS } from './tribunal';
import type { Saga } from './types';

const saga = (tribunal: string, options?: Record<string, boolean>) => ({ tribunal, enabledBooks: [], options }) as unknown as Saga;

describe('Tribunal options', () => {
  it('offers a Tribunal’s rules only there, off until the troupe turns them on', () => {
    expect(tribunalOptions(saga('Rhine')).map((r) => r.id)).toEqual(['rhineGilds', 'rhineForest']);
    expect(tribunalOptions(saga('Theban')).map((r) => r.id)).toEqual(['thebanTokens', 'thebanPatrons']);
    expect(tribunalOptions(saga('Transylvanian')).map((r) => r.id)).toEqual(['transylvaniaPrivileges']);
    expect(tribunalOptions(saga('Stonehenge'))).toEqual([]);
    expect(optionOn(saga('Rhine'), 'rhineGilds')).toBe(false);
    expect(optionOn(saga('Rhine', { rhineGilds: true }), 'rhineGilds')).toBe(true);
    // a choice made in the Rhine does not follow the saga to another Tribunal
    expect(optionOn(saga('Theban', { rhineGilds: true }), 'rhineGilds')).toBe(false);
    // every option points at a real book
    for (const r of OPTIONAL_RULES) expect(r.line, r.id).toBeGreaterThan(0);
  });
});

describe('the Rhine', () => {
  it('gives masters and archmagi the proxy sigils of retired magi', () => {
    expect(RHINE_RANKS.map((r) => r.sigils)).toEqual([0, 1, 2, 3]);
  });

  it('rolls communion against 9, or 12 in a foreign forest, and knows the forest better with Lore', () => {
    expect(communionRoll(1, 2, false, () => 0.65)).toMatchObject({ total: 9, ease: 9, ok: true }); // die 6
    expect(communionRoll(1, 2, true, () => 0.65).ok).toBe(false);
    expect(forestUnderstanding(1, false)).toHaveLength(2);
    expect(forestUnderstanding(4, true)).toHaveLength(2); // 4 abroad is 1 at home
  });

  it('names the Sacrifices and Fruits of the book’s paths by real Virtues and Flaws', () => {
    const data = buildGameData();
    for (const p of FOREST_PATHS)
      for (const s of p.steps) {
        expect(data.vfById.get(s.sacrifice)?.kind, s.sacrifice).toBe('flaw');
        expect(data.vfById.get(s.fruit)?.kind, s.fruit).toBe('virtue');
      }
    expect(data.vfById.get('gild-trained')?.categories).toContain('Hermetic');
    expect(data.abilityById.get('forest-lore')?.type).toBe('Arcane');
  });
});

describe('Thebes', () => {
  it('gives a propitiated patron 25 experience less its Might, two less penalty a pawn', () => {
    expect(propitiationXp(25, 0)).toBe(0);
    expect(propitiationXp(25, 10)).toBe(20);
    expect(propitiationXp(10, 0)).toBe(15);
    expect(propitiationXp(10, 20)).toBe(25);
  });

  it('warns a citizen with shards of ostracism, and offers the Longevity Ritual to one without', () => {
    expect(thebanStatus({ citizen: true, tokens: 2, shards: 1, log: [] }, false)[0]).toContain('ostracism');
    expect(thebanStatus({ citizen: true, tokens: 2, shards: 0, log: [] }, false)[0]).toContain('Longevity');
    expect(thebanStatus({ citizen: true, tokens: 2, shards: 0, log: [] }, true)).toEqual([]);
  });
});

describe('Normandy', () => {
  it('tallies a team: its members, then each event by place and taking part', () => {
    const t = tourneyTally(5, { certamen: 1, joust: -1, melee: 2, hastiludium: 0 });
    expect(t.total).toBe(5 + 26 + 1 + 2);
    expect(tourneyTally(0, {}).total).toBe(1);
  });

  it('pays prize pawns by rank, with the named Sieges', () => {
    expect(tourneyPrize(1)).toMatchObject({ pawns: 31, siege: 'Siege of Normandy', reputation: true });
    expect(tourneyPrize(7).pawns).toBe(17);
    expect(tourneyPrize(13)).toMatchObject({ pawns: 0, siege: 'Siege of Shame' });
    expect(tourneyPrize(14).pawns).toBe(11);
    expect(tourneyPrize(30).pawns).toBe(0);
  });

  it('runs a cursor 10 + 2 × Athletics miles a day, out and back', () => {
    expect(cursorMiles(5, 'country')).toEqual({ day: 20, reach: 10 });
    expect(cursorMiles(5, 'roads').day).toBe(25);
    expect(cursorMiles(5, 'wild').day).toBe(15);
  });
});
