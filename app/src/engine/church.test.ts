// The Church: Devotion and its points, pilgrimages and their Oppositional Elements, the
// contemplative's Spiritual Path and the monistic's Revelations, checked against the book.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { addVirtue, newCharacter } from './character/factory';
import {
  OPPOSITIONAL_ELEMENTS, creationDevotionPoints, devotionScore, monisticRevelations, pathTarget, piousScore, pilgrimageProgress, relicDevotionBonus,
} from './church';

const data = buildGameData();

describe('Devotion', () => {
  it('Pious sets the Devotion Points at creation: the trait, or 3 for the Minor Flaw and 6 for the Major', () => {
    const c = newCharacter('companion', 's');
    c.personality = [{ uid: 'p', trait: 'Pious', score: 2 }];
    expect(creationDevotionPoints(c)).toBe(2);
    addVirtue(c, data, 'pious-flaw', 'Major');
    expect(piousScore(c)).toBe(6);
  });
  it('a Devotion rises as an Ability on its points; a relic adds twice its Faith Points', () => {
    expect([devotionScore(0), devotionScore(5), devotionScore(15), devotionScore(30)]).toEqual([0, 1, 2, 3]);
    expect(relicDevotionBonus(3)).toBe(6);
  });
});

describe('pilgrimage', () => {
  it('the book’s example: three seasons (+9) and Muslim lands (+6) make 15 of a major pilgrimage’s 30; abroad counts once, the higher', () => {
    const season = OPPOSITIONAL_ELEMENTS.find((x) => x.label === 'A season on the road')!;
    const muslim = OPPOSITIONAL_ELEMENTS.find((x) => x.label.startsWith('Non-Christian'))!;
    const christian = OPPOSITIONAL_ELEMENTS.find((x) => x.label.startsWith('A Christian land'))!;
    expect(pilgrimageProgress([season, season, season, muslim, christian], 30)).toEqual({ total: 15, left: 15, done: false });
  });
});

describe('mysticism', () => {
  it('the Path Target is the Path Total less Pious', () => {
    expect(pathTarget(18, 3)).toBe(15);
    expect(pathTarget(15, 20)).toBe(0);
  });
  it('a monistic Revelation: the first is Second Sight; a Major Virtue from 5 points; another Lore from 7', () => {
    expect(monisticRevelations(3, true)[1]).toMatch(/Second Sight/);
    expect(monisticRevelations(5, false)[1]).toMatch(/Major/);
    expect(monisticRevelations(7, false)).toHaveLength(3);
    expect(monisticRevelations(2, false)).toHaveLength(1);
  });
});
