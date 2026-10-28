// How a character's year is spent (DE, Assigning Seasons): free and working seasons by Virtue and
// Flaw, Worship for a Regular, the extra seasons of one who needs no sleep, and the clock that keeps
// count of them.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newSaga } from '../store/store';
import { newCovenant } from './covenant';
import { addVirtue, ensureAbility, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { seasonsOf, seasonsUsed } from './seasons';
import { advanceSeasons, resolveStanding, seasonTaken } from './time';
import { DEFAULT_HOUSE_RULES, type Character } from './types';

const data = buildGameData();
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
const companion = (...virtues: [string, ('Minor' | 'Major')?][]) => {
  const c = newCharacter('companion', 's');
  c.name = 'Albrecht';
  for (const [id, size] of virtues) addVirtue(c, data, id, size);
  return c;
};

describe('free seasons by Virtue and Flaw', () => {
  it('gives a working character two, Wealthy three, Poor one, and a magus four', () => {
    expect(seasonsOf(companion(), d(companion()))).toMatchObject({ free: 2, work: 2 });
    const rich = companion(['wealthy', 'Major']);
    expect(seasonsOf(rich, d(rich)).free).toBe(3);
    const poor = companion(['poor-flaw', 'Major']);
    expect(seasonsOf(poor, d(poor))).toMatchObject({ free: 1, work: 3 });
    const magus = newCharacter('magus', 's');
    expect(seasonsOf(magus, d(magus))).toMatchObject({ free: 4, work: 0 });
  });
  it('adds a season for a License of Absence, never past four', () => {
    const priest = companion(['license-of-absence', 'Major']);
    expect(seasonsOf(priest, d(priest)).free).toBe(3);
    const rich = companion(['wealthy', 'Major'], ['license-of-absence', 'Major']);
    expect(seasonsOf(rich, d(rich)).free).toBe(4);
    const poor = companion(['poor-flaw', 'Major'], ['license-of-absence', 'Major']);
    expect(seasonsOf(poor, d(poor)).free).toBe(2);
  });
  it('gives a Regular one free season in Worship, and one who needs no sleep two extra', () => {
    const monk = companion(['regular-flaw', 'Minor']);
    expect(seasonsOf(monk, d(monk))).toMatchObject({ free: 2, worship: 1, work: 2 });
    const sleepless = companion();
    sleepless.seasons = { sleepless: true };
    expect(seasonsOf(sleepless, d(sleepless)).extra).toBe(2);
    const spirit = companion();
    spirit.creature = { magicCharacter: { qualities: [{ uid: 'q', id: 'no-fatigue' }] } } as never;
    expect(seasonsOf(spirit, d(companion())).extra).toBe(2);
    const servant = companion();
    servant.seasons = { free: 0 };
    expect(seasonsOf(servant, d(servant))).toMatchObject({ free: 0, work: 4 });
  });
});

describe('the clock keeps count of the year', () => {
  const sagaWith = (...chars: Character[]) => {
    const s = newSaga('T');
    s.currentYear = 1220;
    s.currentSeason = 'Spring';
    const cov = newCovenant(s.id, 1220);
    for (const c of chars) {
      c.creation.finalized = true;
      c.age = 25;
      cov.memberIds.push(c.id);
      c.covenantId = cov.id;
    }
    return { saga: s, characters: chars, covenants: [cov] };
  };
  it('gives a Poor character one free season and three of work, and a Regular a season of Worship', () => {
    const poor = companion(['poor-flaw', 'Major']);
    ensureAbility(poor, 'craft-type', { laterLife: 50 }).param = 'Carpenter';
    const monk = companion(['regular-flaw', 'Minor']);
    monk.name = 'Brother Paul';
    ensureAbility(monk, 'craft-type', { laterLife: 50 }).param = 'Scribe';
    const { state } = advanceSeasons(sagaWith(poor, monk), data, 4);
    const kinds = (c: Character) => c.seasonLog.filter((e) => e.year === 1220).map((e) => e.activity);
    expect(kinds(state.characters[0])).toEqual(['practice', 'exposure', 'exposure', 'exposure']);
    expect(kinds(state.characters[1])).toEqual(['practice', 'worship', 'exposure', 'exposure']);
    const worship = state.characters[1].seasonLog.find((e) => e.activity === 'worship')!;
    expect(worship.summary).toMatch(/Worship: Organization Lore.*Church|Worship: .*Lore/);
    expect(Object.values(worship.gains)[0]).toBe(4); // a church's Dominion of 4
  });
  it('counts the seasons logged by hand: after two of study, the rest is work', () => {
    const c = companion();
    c.seasonLog.push(
      { uid: 'a', year: 1220, season: 'Spring', activity: 'study-book', summary: 'Read', gains: {}, applied: true },
      { uid: 'b', year: 1220, season: 'Summer', activity: 'practice', summary: 'Practice', gains: {}, applied: true },
    );
    expect(seasonsUsed(c, 1220)).toMatchObject({ free: 2, work: 0 });
    expect(resolveStanding(c, d(c), 1220).kind).toBe('exposure');
  });
  it('gives one who needs no sleep an extra season of study in Spring and Autumn, never lab work, which does not take the season', () => {
    const c = companion();
    c.seasons = { sleepless: true };
    ensureAbility(c, 'craft-type', { laterLife: 50 }).param = 'Weaver';
    const { state, reports } = advanceSeasons(sagaWith(c), data, 4);
    const x = state.characters[0];
    expect(seasonsUsed(x, 1220).extra).toBe(2);
    expect(x.seasonLog.filter((e) => e.extra).map((e) => e.season)).toEqual(['Spring', 'Autumn']);
    expect(reports[0].lines.some((l) => /Extra season: Practiced/.test(l.text))).toBe(true);
    expect(seasonTaken(x, 1220, 'Spring')).toHaveLength(1); // the season's own activity, not the extra one
  });
});
