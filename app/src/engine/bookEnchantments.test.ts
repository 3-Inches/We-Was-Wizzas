// Hermetic Projects' enchantments as item effects: the effect level from the book's design, and
// the item's total matching the book.
import { describe, expect, it } from 'vitest';
import { BOOK_ENCHANTMENTS, effectLevelOf, enchantmentToEffect } from './bookEnchantments';
import { modifiedEffectLevel } from './enchant';
import { buildGameData } from '../data';

const by = (name: string) => BOOK_ENCHANTMENTS.find((x) => x.name === name)!;

describe('book enchantments', () => {
  const hpSpells = buildGameData().spells.filter((s) => s.source.book === 'HP');
  it('the book’s 98 enchantments and its 100 spells are read, each with an id of its own', () => {
    expect(BOOK_ENCHANTMENTS.length).toBeGreaterThanOrEqual(98);
    expect(hpSpells.length).toBeGreaterThanOrEqual(100);
    expect(new Set(BOOK_ENCHANTMENTS.map((x) => x.id)).size).toBe(BOOK_ENCHANTMENTS.length);
  });
  it('a device is told from a spell by its Pen line, however that line is written', () => {
    // "Pen: +0, Constant Effect", and "0 Pen, constant effect" for the two in the orrery
    expect([by('Cutting the Waves').uses, by('Sense the Heavens').uses, by('Move the Wheels').uses]).toEqual(['constant', 'constant', 'constant']);
    for (const name of ['Cutting the Waves', 'Sense the Heavens', 'Move the Wheels', 'Launch the Distant Vessel']) expect(hpSpells.some((s) => s.name === name), name).toBe(false);
  });
  it('requisites written after the Technique are read: Dragon’s Blood is Mu(Re)Co(Ig)(Te) 70', () => {
    const d = hpSpells.find((s) => s.name === 'Dragon’s Blood')!;
    expect([d.technique, d.form, d.level, [...d.requisites].sort().join(' '), d.ritual]).toEqual(['Mu', 'Co', 70, 'Ig Re Te', true]);
  });
  it('the book’s errata are in: Fill the Well 44, The Endless Well 50, Lungs of Drowning 15 at Individual', () => {
    expect([by('Fill the Well').level, by('The Endless Well').level, by('The Mermaid’s Kiss').level, by('The Mermaid’s Kiss').range]).toEqual([44, 50, 48, 'Touch']);
    const lungs = hpSpells.find((s) => s.name === 'Lungs of Drowning')!;
    expect([lungs.level, lungs.target, lungs.design]).toEqual([15, 'Individual', 'Base 4, +1 Touch, +1 Diameter, +1 Corpus requisite']);
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
    // after the errata: Fill the Well (44) and The Endless Well (50)
    expect([1, 2, 3, 4].map((n) => labTotalForSeasons(44, n))).toEqual([88, 66, 59, 55]);
    expect([1, 2, 3, 4].map((n) => labTotalForSeasons(50, n))).toEqual([100, 75, 67, 63]);
  });
});
