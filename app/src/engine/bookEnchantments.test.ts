// Hermetic Projects' enchantments as item effects: the effect level from the book's design, and
// the item's total matching the book.
import { describe, expect, it } from 'vitest';
import { BOOK_ENCHANTMENTS, effectLevelOf, enchantmentToEffect } from './bookEnchantments';
import { modifiedEffectLevel } from './enchant';
import { buildGameData } from '../data';

const by = (name: string) => BOOK_ENCHANTMENTS.find((x) => x.name === name)!;

describe('book enchantments', () => {
  it('the book’s 80 enchantments and its 91 spells are read', () => {
    expect(BOOK_ENCHANTMENTS.length).toBeGreaterThanOrEqual(80);
    expect(buildGameData().spells.filter((s) => s.source.book === 'HP').length).toBeGreaterThanOrEqual(90);
  });
  it('effect levels from the design: Scribe of All That I Can See 20, Clarion Call 4', () => {
    expect(effectLevelOf(by('Scribe of All That I Can See'))).toBe(20);
    const c = enchantmentToEffect(by('Clarion Call'));
    expect([c.baseLevel, c.usesPerDay, c.linkedTrigger]).toEqual([4, 'unlimited', true]);
  });
  it('a constant effect is two uses a day with an environmental trigger', () => {
    const e = enchantmentToEffect(by('Fumarole Vent'));
    expect([e.usesPerDay, e.environmentalTrigger, e.modifiedLevel]).toEqual(['2', true, 44]);
  });
  it('every enchantment, made an effect, comes to the book’s level', () => {
    for (const b of BOOK_ENCHANTMENTS.filter((x) => x.level)) expect(modifiedEffectLevel(enchantmentToEffect(b)).level, b.name).toBe(b.level);
  });
});

import { labTotalForSeasons } from './spellDesign';
describe('the Lab Total for a number of seasons', () => {
  it('as the book lists it: level 15 needs 30, 23, 20, 19; level 4 needs 8, 6, 6, 5', () => {
    expect([1, 2, 3, 4].map((n) => labTotalForSeasons(15, n))).toEqual([30, 23, 20, 19]);
    expect([1, 2, 3, 4].map((n) => labTotalForSeasons(4, n))).toEqual([8, 6, 6, 5]);
    expect([1, 2, 3, 4].map((n) => labTotalForSeasons(80, n))).toEqual([160, 120, 107, 100]);
  });
});
