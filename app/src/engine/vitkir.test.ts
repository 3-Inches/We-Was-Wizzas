// The Vitkir (Hedge Magic, Revised Edition): runes, casting with the inscription variations and the
// vitkar Virtues, the Lab Total and scripts, and Nátt-thel, checked against the book's Eirik Svennson.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { RUNES, RUNE_IDS } from '../data/hedgeVitkir';
import { RUNE_GUIDELINES, RUNE_SCRIPTS } from '../data/vitkirRunes';
import { addVirtue, ensureAbility, newCharacter } from './character/factory';
import { VITKI_APPRENTICESHIP, deriveCharacter } from './character/derive';
import { validateCharacter } from './character/validate';
import { DEFAULT_HOUSE_RULES, type Character } from './types';
import {
  aettPartners, inventedLevels, nattThelAvoid, nattThelDuration, nattThelFollows, hideRunesTotal, runeCast, vitkiAbilities, runeLevelFromHermetic, taughtLevels, vitkiBotchDice, vitkiCastingTotal, vitkiLabTotal, vitkirRunes,
} from './vitkir';

const data = buildGameData();
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
// Accelerated Abilities: the Art scale
const art = (n: number) => (n * (n + 1)) / 2;

/** Eirik Svennson, Warrior Vitki: Int +2, Sta +2, Rune Magic 5; B 6, D 5, M 8, O 9+2, T 10, U 5, W 4, Z 10. */
function eirik(): Character {
  const c = newCharacter('companion', 'e');
  c.age = 29;
  c.characteristics.Int = 2;
  c.characteristics.Sta = 2;
  addVirtue(c, data, 'the-gift', 'Free');
  addVirtue(c, data, 'vitki', 'Free');
  addVirtue(c, data, 'major-rune-focus', 'Major', 'Victory runes (Sigrúnar)');
  addVirtue(c, data, 'puissant-ability', 'Minor', 'rune-othila');
  addVirtue(c, data, 'natt-thel-prone-flaw', 'Major');
  for (const [name, n] of [['Berkanan', 6], ['Dagaz', 5], ['Mannaz', 8], ['Othila', 9], ['Tiwaz', 10], ['Uruz', 5], ['Wunjo', 4], ['Algiz', 10]] as const) ensureAbility(c, `rune-${name.toLowerCase()}`, { play: art(n) });
  ensureAbility(c, 'rune-magic', { play: 75 });
  return c;
}

describe('the runes', () => {
  it('24 runes in three aetts, 157 guidelines and the book’s 46 scripts, each naming known runes', () => {
    expect(RUNES).toHaveLength(24);
    expect(new Set(RUNES.map((r) => r.aett)).size).toBe(3);
    expect(RUNE_IDS.every((id) => data.abilityById.get(id)?.asArt)).toBe(true);
    expect(RUNE_GUIDELINES.length).toBeGreaterThan(150);
    expect(RUNE_SCRIPTS.flatMap((s) => s.runes).every((n) => RUNES.some((r) => r.name === n))).toBe(true);
  });
  it('a Gifted vitki has all 24 runes open; Secondary Insight reaches the other seven of the aett', () => {
    const c = eirik();
    expect(vitkirRunes(c, d(c))).toHaveLength(24);
    expect(aettPartners('Tiwaz').map((r) => r.name)).toHaveLength(7);
  });
  it('apprenticeship: 240 points and 120 levels of scripts, at least half on the runes', () => {
    const c = eirik();
    c.vitki = { apprenticeYears: 15 };
    const b = d(c).budgets.find((x) => x.id === VITKI_APPRENTICESHIP)!;
    expect([b.total, b.spellLevels?.total]).toEqual([240, 120]);
    ensureAbility(c, 'single-weapon', { [VITKI_APPRENTICESHIP]: 240 });
    expect(validateCharacter(d(c), data, DEFAULT_HOUSE_RULES).map((i) => i.id)).toContain('vitki-runes');
  });
});

describe('casting', () => {
  it('Eirik’s scripts: Berkanan +8; with the Victory runes focus Othila +24, Tiwaz +22; Algiz (Uruz) by Method II +7', () => {
    const c = eirik();
    const dc = d(c);
    expect(vitkiCastingTotal(c, dc, ['Berkanan'], undefined).total).toBe(8);
    expect(vitkiCastingTotal(c, dc, ['Othila'], undefined, { focus: true }).total).toBe(24);
    expect(vitkiCastingTotal(c, dc, ['Tiwaz'], undefined, { focus: true }).total).toBe(22);
    expect(vitkiCastingTotal(c, dc, ['Algiz', 'Uruz'], undefined).total).toBe(7);
  });
  it('variations: −5 no name, −10 no description; Deft Rune and Secret Runes waive them; Mastered Rune halves them', () => {
    const c = eirik();
    const t = (x: Character) => vitkiCastingTotal(x, d(x), ['Berkanan'], undefined, { name: 'none', description: 'none', extraEffort: true }).total;
    expect(t(c)).toBe(8 - 15 + 1);
    const s = eirik();
    addVirtue(s, data, 'secret-runes', 'Minor');
    expect(t(s)).toBe(8 - 5 - 5 + 1);
    const m = eirik();
    addVirtue(m, data, 'mastered-rune', 'Minor', 'Berkanan');
    expect(t(m)).toBe(8 - 2 - 5 + 1);
    expect(vitkiBotchDice(m, ['Berkanan'], 2)).toBe(1);
    const f = eirik();
    addVirtue(f, data, 'deft-rune', 'Minor', 'Berkanan');
    expect(t(f)).toBe(9);
  });
  it('hiding: −2 for the name, −5 for the description, or none when hidden with care', () => {
    const c = eirik();
    const t = (care: boolean) => vitkiCastingTotal(c, d(c), ['Berkanan'], undefined, { name: 'hidden', description: 'hidden', hiddenWithCare: care }).total;
    expect(t(false)).toBe(8 - 2 - 5);
    expect(t(true)).toBe(8);
    // only what is hidden is waived: a name left off still costs 5
    expect(vitkiCastingTotal(c, d(c), ['Berkanan'], undefined, { name: 'none', description: 'hidden', hiddenWithCare: true }).total).toBe(8 - 5);
    expect(hideRunesTotal(c, d(c))).toBe(c.characteristics.Dex + vitkiAbilities(c, d(c)).craftRunes);
  });
  it('vis +2 a pawn, held to the rune’s score; within 10 below, it works for a Fatigue level; a deficiency halves', () => {
    const c = eirik();
    const w = vitkiCastingTotal(c, d(c), ['Wunjo'], undefined, { vis: 6 });
    expect(w.total).toBe(2 + 4 + 8);
    expect(runeCast(w, 5, 20)).toEqual({ total: 19, outcome: 'fatigue' });
    expect(runeCast(w, 5, 30).outcome).toBe('fails');
    addVirtue(c, data, 'minor-magical-deficiency-flaw', 'Minor', 'Wunjo, Gebo, Isa');
    const h = vitkiCastingTotal(c, d(c), ['Wunjo'], undefined);
    expect(h.halved).toBe(true);
    expect(runeCast(h, 4, 5).total).toBe(5);
  });
  it('Lab Total: the lowest rune + Intelligence + Rune Magic + aura; a season gives that many levels', () => {
    const c = eirik();
    expect(vitkiLabTotal(c, d(c), ['Berkanan', 'Mannaz'], { realm: 'Magic', strength: 3 }).total).toBe(6 + 2 + 5 + 3);
    expect(inventedLevels(16)).toBe(16);
    expect(inventedLevels(15, 1)).toBe(5);
    expect(taughtLevels(30, 16)).toEqual({ levels: 30, maxLevel: 16 });
    expect(runeLevelFromHermetic(15)).toBe(35);
  });
});

describe('Nátt-thel', () => {
  it('two Warping Points at once, or any botch when Nátt-thel Prone; Sta + Concentration against Warping Score × 3', () => {
    const c = eirik();
    expect(nattThelFollows({ virtues: [] }, 1, true)).toBe(false);
    expect(nattThelFollows({ virtues: [] }, 2)).toBe(true);
    expect(nattThelFollows(c, 1, true)).toBe(true);
    expect(nattThelAvoid(d(c), 3)).toEqual({ total: 2, ease: 9 });
  });
  it('the book’s example: Warping Score 3, a roll of 6 and 2 points gained: two moons', () => {
    expect(nattThelDuration(6 + 3, 2).text).toBe('2 moons');
    expect(nattThelDuration(2, 1).text).toBe('1 moment');
    expect(nattThelDuration(18, 1).unit).toMatch(/^unknown/);
  });
});
