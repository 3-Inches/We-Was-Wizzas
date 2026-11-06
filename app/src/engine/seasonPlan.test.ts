// The Seasons page's order of play, the forecast before a season ends, and the choices a season
// leaves (a Warping Flaw) kept on the character until they are made.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newSaga } from '../store/store';
import { newCovenant } from './covenant';
import { newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { orderOfPlay, owedInOrder, seasonForecast, settle } from './seasonPlan';
import { advanceSeasons } from './time';
import { DEFAULT_HOUSE_RULES, type Character } from './types';

const data = buildGameData();

const person = (type: Character['type'], name: string, player: string, at: string) => {
  const c = newCharacter(type, 's');
  c.name = name;
  c.player = player;
  c.createdAt = at;
  c.creation.finalized = true;
  return c;
};

describe('the order of play', () => {
  it('takes each player in turn, magi before companions, and the grogs last', () => {
    const s = newSaga('T');
    const chars = [
      person('companion', 'Ada', 'Ann', '2026-01-01'),
      person('magus', 'Bran', 'Ann', '2026-01-02'),
      person('grog', 'Cob', 'Ann', '2026-01-03'),
      person('magus', 'Dov', 'Ben', '2026-01-04'),
    ];
    expect(orderOfPlay(s, chars).map((t) => [t.label, t.people.map((c) => c.name)])).toEqual([
      ['Ann', ['Bran', 'Ada']],
      ['Ben', ['Dov']],
      ['Grogs', ['Cob']],
    ]);
    s.playerOrder = ['Ben', 'Ann'];
    expect(orderOfPlay(s, chars).map((t) => t.label)).toEqual(['Ben', 'Ann', 'Grogs']);
  });
});

describe('what a season leaves to settle', () => {
  it('keeps the Flaw a Warping Score brings on the character until it is chosen', () => {
    const s = newSaga('T');
    s.currentYear = 1220;
    s.currentSeason = 'Winter';
    const cov = newCovenant(s.id, 1220);
    cov.aura = 7;
    const g = person('grog', 'Hob', 'Ann', '2026-01-01');
    g.age = 25;
    g.warpingPoints = 4;
    cov.memberIds.push(g.id);
    g.covenantId = cov.id;
    const { state } = advanceSeasons({ saga: s, characters: [g], covenants: [cov] }, data, 1);
    const hob = state.characters[0];
    expect(hob.owed?.map((o) => [o.kind, o.want?.kind, o.want?.size])).toEqual([['warping', 'flaw', 'Minor']]);
    expect(owedInOrder(state.saga, state.characters)).toHaveLength(1);
    // the forecast names it until it is settled
    const derive = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
    expect(seasonForecast(state, data, derive).some((n) => n.to === 'resolve')).toBe(true);
    settle(hob, hob.owed![0].uid);
    expect(hob.owed).toBeUndefined();
    expect(seasonForecast(state, data, derive).some((n) => n.to === 'resolve')).toBe(false);
  });

  it('warns of a covenant spending more than it earns', () => {
    const s = newSaga('T');
    const cov = newCovenant(s.id, 1220);
    cov.finances.treasury = 5;
    cov.finances.sundry = 10000;
    const notes = seasonForecast({ saga: s, characters: [], covenants: [cov] }, data, (c) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES));
    expect(notes.some((n) => n.to === 'finances' && n.level !== 'info')).toBe(true);
  });
});
