// The seasons of devotion (The Church; RoP: The Divine, Ars Notoria) and the rolls a season leaves for
// Resolve, checked against the books' formula lines and examples.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newSaga } from '../store/store';
import { addVirtue, ensureAbility, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { DEVOTION_GAINS, QUEST_COMPONENTS, SHRINE_SEASON_POINTS, churchCardsOpen, hagiographyPoints } from './church';
import { recitationParts } from './holy';
import { newSeasonEntry } from './longterm';
import { SOLOMON_SEARCH_EASE, firstRecitationEase, rollSeasonRoll, seasonEndRolls } from './seasonRolls';
import { advanceSeason, DEFAULT_ADVANCE } from './time';
import { DEFAULT_HOUSE_RULES, type Character } from './types';

const data = buildGameData();
const die = (value: number, botches = 0) => ({ value, zero: botches > 0, botches, text: String(value) });

function scholar(): Character {
  const c = newCharacter('companion', 's');
  c.creation.finalized = true;
  return c;
}

describe('Devotion Points for a season (The Church, Gaining Devotion Points)', () => {
  it('a season at a saint’s shrine earns 5', () => {
    expect(SHRINE_SEASON_POINTS).toBe(5);
  });
  it('a hagiography: Quality ÷ 2; Augustine’s City of God, Quality 10, by the saint: 5', () => {
    expect(hagiographyPoints('by', 10)).toBe(5);
    expect(hagiographyPoints('about', 12)).toBe(6);
    expect(hagiographyPoints('about', 11)).toBe(5);
  });
  it('a general work on the saints: 1, once for each saint', () => {
    expect(hagiographyPoints('general', 15)).toBe(1);
    expect(hagiographyPoints('general', 15, true)).toBe(0);
  });
  it('the gains and Quest Components that take a season are marked for the Seasons page', () => {
    expect(DEVOTION_GAINS.filter((g) => g.season).map((g) => g.id)).toEqual(['season', 'hagiography']);
    expect(QUEST_COMPONENTS.filter((q) => q.season).map((q) => q.value)).toEqual([1, 1, 3, 9]);
  });
});

describe('which Church cards apply', () => {
  it('"an impious character does not possess Devotions"; both paths need a positive Pious', () => {
    const c = scholar();
    expect(churchCardsOpen(c)).toEqual({ devotions: false, mystic: false });
    addVirtue(c, data, 'pious-flaw', 'Minor');
    expect(churchCardsOpen(c)).toEqual({ devotions: true, mystic: true });
  });
  it('what is under way stays shown', () => {
    const c = scholar();
    c.devotions = [{ uid: 'd', saint: 'martin', points: 3 }];
    expect(churchCardsOpen(c).devotions).toBe(true);
  });
});

describe('a ring of Solomon’s first recitation (RoP: The Divine, The Rings of Solomon)', () => {
  it('"Ease Factor = 6 + 3 times level of ring + 1 per season of desired duration"', () => {
    expect(firstRecitationEase(1, 1)).toBe(10);
    expect(firstRecitationEase(2, 3)).toBe(15);
  });
  it('the recitation score: Intelligence + Ars Notoria + the season before, less other Supernatural Abilities', () => {
    const c = scholar();
    c.characteristics.Int = 2;
    ensureAbility(c, 'ars-notoria', { laterLife: 15 });
    ensureAbility(c, 'second-sight', { laterLife: 5 });
    const d = deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
    const parts = recitationParts(d, [{ label: 'Chastity', value: 1 }]);
    expect(parts.map((p) => p.value)).toEqual([2, 2, 1, -1]);
  });
  function reciting(logged = true) {
    const s = newSaga('T');
    s.currentYear = 1220;
    s.currentSeason = 'Spring';
    const c = scholar();
    c.sagaId = s.id;
    const e = newSeasonEntry(1220, 'Spring', 'other', 'Devotion: a ring of Solomon first recited');
    if (logged) c.seasonLog.push(e);
    c.holy = { recitation: { ring: 1, seasons: 2, score: 6, ease: firstRecitationEase(1, 2), year: 1220, season: 'Spring', entryUid: e.uid } };
    return { s, c };
  }
  it('is owed when its season ends, and dropped when that season was unlogged', () => {
    const { s, c } = reciting();
    const { state } = advanceSeason({ saga: s, characters: [c], covenants: [] }, data, DEFAULT_ADVANCE);
    expect(state.characters[0].owed?.map((o) => o.kind)).toEqual(['ring']);
    const gone = reciting(false);
    expect(seasonEndRolls(gone.c, 1220, 'Spring')).toEqual([]);
    expect(gone.c.holy?.recitation).toBeUndefined();
  });
  it('a success learns the ring; its seasons begin after the season of recitation', () => {
    const { c } = reciting();
    const r = rollSeasonRoll(c, 'ring', die(5));
    expect(r.lines[0]).toMatch(/6 = 11, against 11/);
    expect(c.holy?.notoria).toEqual({ learned: 1, active: { ring: 1, untilYear: 1220, untilSeason: 'Autumn' } });
    expect(c.holy?.recitation).toBeUndefined();
  });
  it('a failure may be tried again next season; a botch is judged unworthy', () => {
    const { c } = reciting();
    expect(rollSeasonRoll(c, 'ring', die(4)).lines[1]).toMatch(/tried again next season/);
    expect(c.holy?.notoria).toBeUndefined();
    const b = reciting();
    expect(rollSeasonRoll(b.c, 'ring', die(0, 1)).lines.join(' ')).toMatch(/BOTCH.*unworthy/);
  });
});

describe('a season’s search for the Book of Solomon (RoP: The Divine, Finding a Text)', () => {
  const searching = (score: number) => {
    const c = scholar();
    c.holy = { search: { score, year: 1220, season: 'Spring', entryUid: 'e' } };
    return c;
  };
  it('Intelligence + Divine Lore + stress die against 21: a copy found', () => {
    expect(SOLOMON_SEARCH_EASE).toBe(21);
    const r = rollSeasonRoll(searching(12), 'search', die(9));
    expect(r.found).toBe(true);
    expect(r.lines[1]).toMatch(/A copy found: a tractatus of Quality 20/);
  });
  it('short of 21, not found; a botch, a different book', () => {
    expect(rollSeasonRoll(searching(12), 'search', die(8)).found).toBe(false);
    expect(rollSeasonRoll(searching(12), 'search', die(0, 1)).lines[1]).toMatch(/different book/);
  });
});
