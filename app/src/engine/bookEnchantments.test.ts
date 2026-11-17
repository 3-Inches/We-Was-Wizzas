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

// Roadmap 2.3: the item effects other books set out like spells are items, not spells. Each case is
// one of the ways a book marks an item, taken from that book's own entry.
describe('item effects from the other books', () => {
  const spells = buildGameData().spells;
  const item = (name: string, book: string) => BOOK_ENCHANTMENTS.find((x) => x.name === name && x.source.book === book)!;
  const terms = (name: string, book: string) => {
    const x = item(name, book);
    return [x.level, x.penetration, x.uses];
  };

  it('"Pen" between the Arts and R/D/T, and above the Arts, where it was taken for the name (Dies Irae)', () => {
    expect(terms('Opening the Intangible Tunnel', 'DI')).toEqual([53, 30, '6']);
    expect(terms('The Fetid Arrow', 'DI')).toEqual([41, 30, '2']);
  });
  it('"Pen" at the end of the R/D/T line (Mystery Cults), and after it (The Lion and the Lily)', () => {
    expect(terms('Perceive the Change', 'HoH_MC')).toEqual([14, 0, 'constant']);
    expect(terms('Agony of the Uncharitable Stranger', 'LaL')).toEqual([30, 20, '24']);
  });
  it('a uses line without "Pen", and "Penetration" in full (Legends of Hermes)', () => {
    expect(terms('Herald of Imperative', 'LoH')).toEqual([29, 0, '50']);
    expect(terms('Summon the Stony Servants', 'LoH')).toEqual([52, 8, '6']);
    expect(terms('Insubstantial Prison', 'LoH')).toEqual([71, 30, null]);
  });
  it('an item known only by its design: its uses, and Penetration counted in levels (two points a level)', () => {
    expect(terms('The Sands of Time', 'LoH')).toEqual([19, 0, '2']);
    expect(terms('Rosemary Sprig of Rego Vis', 'RoP_M')).toEqual([56, 22, null]);
    expect(terms('Shout of Unravelling', 'LoH')).toEqual([60, 32, '12']);
  });
  it('the name, not the note beside it: Magi of Hermes and Through the Aegis', () => {
    // "Enchanted Item 4 pawns of Auram vis, 4 Seasons spent to invest." stands between name and Arts
    expect(item('Chamber of Spring Breezes', 'MoH').level).toBe(39);
    // "This device costs 12 Build Points. Finding the Fleet"; "Talisman powers: Tongue of Beasts"
    expect([item('Finding the Fleet', 'TtA').level, item('Tongue of Beasts', 'TtA').level]).toEqual([14, 35]);
    expect(spells.find((s) => s.name === 'The Tremere Trench')?.level).toBe(20); // under "-6 longevity ritual."
    expect(spells.find((s) => s.name === 'The Twisted Spine')?.source.book).toBe('LaL'); // was "New Spell: The Twisted Spine"
  });
  it('a creature’s power is neither a spell nor an item (Rival Magic’s olibanum serpents, Realms of Power: Magic)', () => {
    // "Stance of the Patient Tree" is a spell in the core book; in Realms of Power: Magic it is a power
    const from = (book: string) => [...spells, ...BOOK_ENCHANTMENTS].filter((x) => x.source.book === book);
    expect(from('RM').filter((x) => /Gift of Vigor|Unseen Servants|points|Init/.test(x.name))).toEqual([]);
    expect(from('RoP_M').filter((x) => /Patient Tree|changes into a tree/.test(x.name))).toEqual([]);
  });
  it('no spell in the catalog is an item: no constant duration, no "Pen" line, no level an item’s modifiers make', () => {
    const odd = spells.filter((s) => s.source.book !== 'DE' && (/constant|always/i.test(s.duration) || /^\W*Pen\b/i.test(s.text) || /^Pen\b/i.test(s.name) || (s.level !== null && s.level > 5 && s.level % 5 !== 0)));
    // the one exception: an experimental spell on a casting tablet, its level raised by "+11 for penetration"
    expect(odd.map((s) => s.name)).toEqual(['Ward Against Woodland Spirits']);
  });
  it('every enchantment has an id of its own', () => {
    expect(new Set(BOOK_ENCHANTMENTS.map((x) => x.id)).size).toBe(BOOK_ENCHANTMENTS.length);
    expect(BOOK_ENCHANTMENTS.length).toBeGreaterThanOrEqual(360);
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
