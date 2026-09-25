import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { DEFAULT_HOUSE_RULES } from './types';
import { abilityScoreFromXp, abilityXpForScore, artScoreFromXp, artXpForScore, withAffinity } from './xp';
import { addVirtue, ensureAbility, newCharacter, setHouse } from './character/factory';
import { deriveCharacter } from './character/derive';
import { validateCharacter } from './character/validate';
import { castingScore, labTotal, magicResistance, auraModifier, penetrationTotal } from './magic';

const data = buildGameData();
const rules = DEFAULT_HOUSE_RULES;

describe('xp tables', () => {
  it('matches the DE advancement table', () => {
    expect(artXpForScore(10)).toBe(55);
    expect(artXpForScore(20)).toBe(210);
    expect(abilityXpForScore(5)).toBe(75);
    expect(abilityXpForScore(10)).toBe(275);
    expect(artScoreFromXp(56)).toBe(10);
    expect(artScoreFromXp(54)).toBe(9);
    expect(abilityScoreFromXp(74)).toBe(4);
    expect(abilityScoreFromXp(75)).toBe(5);
    expect(withAffinity(37)).toBe(56); // Darius: 37 xp in Perdo becomes 56
  });
});

describe('data', () => {
  it('loads DE virtues and flaws with mechanics', () => {
    expect(data.virtuesFlaws.length).toBeGreaterThan(900);
    const pa = data.vfById.get('puissant-art');
    expect(pa?.param?.kind).toBe('art');
    expect(pa?.effects?.[0].type).toBe('artBonus');
    expect(data.vfById.get('second-sight')?.effects?.some((e) => e.type === 'grantAbility')).toBe(true);
  });
  it('infers ability grants for supernatural virtues without explicit mechanics', () => {
    const count = data.virtuesFlaws.filter((v) => v.categories.includes('Supernatural') && v.effects?.some((e) => e.type === 'grantAbility')).length;
    expect(count).toBeGreaterThan(20);
  });
  it('has spells, guidelines, hooks, lab virtues', () => {
    expect(data.spells.filter((s) => s.source.book === 'DE').length).toBeGreaterThanOrEqual(350);
    expect(data.guidelines.length).toBeGreaterThan(500);
    expect(data.hooksBoons.length).toBeGreaterThan(150);
    expect(data.labVirtuesFlaws.length).toBeGreaterThan(100);
  });
});

function makeDarius() {
  const c = newCharacter('magus', 's1');
  c.name = 'Darius';
  setHouse(c, data, 'flambeau', 0); // Puissant Perdo
  addVirtue(c, data, 'affinity-with-art', 'Minor', 'Pe');
  addVirtue(c, data, 'hermetic-prestige', 'Minor');
  addVirtue(c, data, 'premonitions', 'Minor');
  addVirtue(c, data, 'second-sight', 'Minor');
  addVirtue(c, data, 'fast-caster', 'Minor');
  addVirtue(c, data, 'flawless-magic', 'Major');
  addVirtue(c, data, 'strong-willed', 'Minor');
  addVirtue(c, data, 'enduring-constitution', 'Minor');
  addVirtue(c, data, 'blatant-gift-flaw', 'Major');
  addVirtue(c, data, 'driven-flaw', 'Major', 'Hunt enemies of the Order');
  addVirtue(c, data, 'enemies-flaw', 'Major', 'Renounced magus');
  addVirtue(c, data, 'disfigured-flaw', 'Minor');
  c.characteristics = { Int: 3, Per: 1, Str: 2, Sta: 0, Pre: -3, Com: -1, Dex: 1, Qik: 2 };
  const german = ensureAbility(c, 'living-language', { native: 75 }, 'German');
  german.native = true;
  ensureAbility(c, 'area-lore', { childhood: 15 }, 'Bavaria');
  ensureAbility(c, 'awareness', { childhood: 15 });
  ensureAbility(c, 'folk-ken', { childhood: 15 });
  ensureAbility(c, 'dead-language', { apprenticeship: 50 }, 'Latin');
  const mt = ensureAbility(c, 'magic-theory', { apprenticeship: 50 });
  mt.specialty = 'inventing spells';
  ensureAbility(c, 'artes-liberales', { apprenticeship: 30 });
  ensureAbility(c, 'parma-magica', { apprenticeship: 5 });
  ensureAbility(c, 'penetration', { apprenticeship: 15 });
  c.arts.Pe = { apprenticeship: 37 };
  c.arts.Cr = { apprenticeship: 15 };
  c.arts.Co = { apprenticeship: 3 };
  return c;
}

describe('character derivation (Darius of Flambeau, DE p.50-54)', () => {
  const c = makeDarius();
  const d = deriveCharacter(c, data, rules);

  it('balances Virtues and Flaws', () => {
    expect(d.tally.flawPoints).toBe(10);
    expect(d.tally.virtuePoints).toBe(10); // 5 minor + Flawless(3) + ... = check
  });
  it('applies Affinity and Puissant to Perdo', () => {
    expect(d.arts.Pe.effectiveXp).toBe(56);
    expect(d.arts.Pe.score).toBe(10);
    expect(d.arts.Pe.remainder).toBe(1);
    expect(d.arts.Pe.value).toBe(13);
  });
  it('grants supernatural abilities from virtues', () => {
    const ss = d.abilities.find((a) => a.abilityId === 'second-sight');
    expect(ss?.score).toBe(1);
  });
  it('knows the Gift type and flawless magic', () => {
    expect(d.giftType).toBe('blatant');
    expect(d.flawless).toBe(true);
    expect(d.socialPenalty).toBe(-6);
  });
  it('computes the apprenticeship spell limit like the example (+11 to Te+Fo)', () => {
    // Int 3 + MT 4 + specialty 1 + 3 = 11
    const lt = labTotal(d, { technique: 'Pe', form: 'Co' }, { activity: 'spells', aura: { realm: 'Magic', strength: 3 } });
    expect(lt.total).toBe(d.arts.Pe.value + d.arts.Co.value + 11);
  });
  it('computes casting scores and magic resistance', () => {
    const cs = castingScore(d, { technique: 'Pe', form: 'Co' }, { kind: 'formulaic', aura: { realm: 'Magic', strength: 5 } });
    expect(cs.total).toBe(13 + 2 + 0 + 5);
    const mr = magicResistance(d, 'Ig');
    expect(mr.total).toBe(5 + 0);
    expect(penetrationTotal(d, 30, 15)).toBe(30 + 2 - 15);
  });
  it('validates without hard errors except expected', () => {
    const issues = validateCharacter(d, data, rules);
    const errors = issues.filter((i) => i.severity === 'error').map((i) => i.id);
    expect(errors).not.toContain('vf-balance');
    expect(errors).not.toContain('magus-gift');
    expect(errors).not.toContain('min-latin');
  });
});

describe('validation catches rule breaks', () => {
  it('flags grog with major virtue and too many flaws', () => {
    const c = newCharacter('grog', 's1');
    addVirtue(c, data, 'wealthy', 'Major');
    addVirtue(c, data, 'clumsy-flaw', 'Minor');
    addVirtue(c, data, 'lame-flaw', 'Minor');
    addVirtue(c, data, 'obese-flaw', 'Minor');
    addVirtue(c, data, 'poor-hearing-flaw', 'Minor');
    const d = deriveCharacter(c, data, rules);
    const ids = validateCharacter(d, data, rules).map((i) => i.id);
    expect(ids.some((i) => i.startsWith('grog-major'))).toBe(true);
    expect(ids).toContain('grog-flaws');
  });
  it('flags a companion taking Hermetic virtues without the Gift', () => {
    const c = newCharacter('companion', 's1');
    addVirtue(c, data, 'covenfolk', 'Free');
    addVirtue(c, data, 'fast-caster', 'Minor');
    const d = deriveCharacter(c, data, rules);
    const ids = validateCharacter(d, data, rules).map((i) => i.id);
    expect(ids.some((i) => i.startsWith('nogift-hermetic') || i.startsWith('gift-'))).toBe(true);
  });
  it('mythic companions get 2 virtue points per flaw point', () => {
    const c = newCharacter('mythic', 's1');
    addVirtue(c, data, 'covenfolk', 'Free');
    addVirtue(c, data, 'lame-flaw', 'Minor');
    addVirtue(c, data, 'tough', 'Minor');
    addVirtue(c, data, 'large', 'Minor');
    const d = deriveCharacter(c, data, rules);
    expect(d.tally.allowedVirtuePoints).toBe(2);
    expect(validateCharacter(d, data, rules).some((i) => i.id === 'vf-balance')).toBe(false);
  });
});

describe('realm interaction', () => {
  it('follows the DE table', () => {
    expect(auraModifier('Magic', { realm: 'Divine', strength: 3 }).mod).toBe(-9);
    expect(auraModifier('Magic', { realm: 'Faerie', strength: 5 }).mod).toBe(2);
    expect(auraModifier('Magic', { realm: 'Infernal', strength: 2 }).botch).toBe(2);
    expect(auraModifier('Magic', { realm: 'Faerie', strength: 4 }, { faerieMagic: true }).mod).toBe(4);
  });
});
