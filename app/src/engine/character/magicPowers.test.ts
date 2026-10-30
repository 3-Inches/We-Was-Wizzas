// Realms of Power: Magic: the Common Magic Powers as the book builds them, Variable and
// Deteriorating Power, and (Form) Resistance against a Magic being's Form.
import { describe, expect, it } from 'vitest';
import { essentialTraits, hasMagicMight, trueFormName, trueFormTrait, withCharacterTrait } from './magicCharacter';
import { buildGameData } from '../../data';
import { COMMON_MAGIC_POWERS } from '../../data/commonPowers';
import { DEFAULT_HOUSE_RULES } from '../types';
import { addQualities, addVirtue, ensureAbility, newCharacter } from './factory';
import { deriveCharacter } from './derive';
import { powerStats, varianceLevels, variedLevel, type VarianceInputs } from './powers';
import { magicResistance } from '../magic';

const data = buildGameData();
const rules = DEFAULT_HOUSE_RULES;
const bingus = () => {
  const c = newCharacter('companion', 's1');
  c.creature = { realm: 'Magic', kind: 'animal', size: 0, might: 0, intelligence: 'companion', magicCharacter: { season: 'summer', powerLevel: 'Medium', baseMight: 10, form: 'An', qualities: [] } };
  return c;
};

describe('the Common Magic Powers', () => {
  it('has the sixteen of the book, each costing the Might the book gives it', () => {
    expect(COMMON_MAGIC_POWERS).toHaveLength(16);
    // the book's Might costs, from its level, kind and mastery (Focus Powers vary with the effect)
    const book: Record<string, number> = {
      'Enliven the Gross (Elemental Form)': 4, 'Equine Shape': 2, 'Flight of the Hummingbird': 0, 'Grant (Major Flaw)': 10, 'Grant (Minor Flaw)': 5, 'Grant Puissance in (Ability)': 4,
      'Grant (Major Virtue)': 10, 'Grant (Minor Virtue)': 5, Guide: 3, 'Hands of the Magical Animal': 0, Healing: 3, 'Human Shape': 1, 'Oath-Swearing': 10, 'Sight Beyond Sight': 1,
    };
    for (const p of COMMON_MAGIC_POWERS.filter((x) => x.kind !== 'focus')) {
      const st = powerStats({ uid: 'p', name: p.name, kind: p.kind, level: p.level, penetration: 0, mastery: p.mastery }, 0, true);
      expect(st.mightCost, p.name).toBe(book[p.name]);
    }
  });
});

describe('Variable and Deteriorating Power', () => {
  const x: VarianceInputs = { age: 50, might: 15, mightSpent: 10, warping: 2, ability: (id) => (id === 'hunt' ? 4 : 0) };
  it('counts the levels of variance as the book gives them', () => {
    expect(varianceLevels('age', false, x)).toBe(5);
    expect(varianceLevels('might', false, x)).toBe(3);
    expect(varianceLevels('might', true, x)).toBe(2);
    expect(varianceLevels('warping', false, x)).toBe(2);
    expect(varianceLevels('ability:hunt', false, x)).toBe(4);
    // the book's example: age 25 wears a power down by 3 magnitudes
    expect(varianceLevels('age', true, { ...x, age: 25 })).toBe(3);
  });
  it('raises a power five levels a level of variance, and lowers it a magnitude for each deterioration', () => {
    const p = { uid: 'p', name: 'Equine Shape', kind: 'personal' as const, level: 25, penetration: 0 };
    expect(variedLevel({ ...p, variable: { virtueUid: 'v', by: 'might' } }, x)).toEqual({ level: 40, up: 3, down: 0 });
    expect(variedLevel({ ...p, deteriorating: { virtueUid: 'f', by: 'warping' } }, x)).toEqual({ level: 15, up: 0, down: 2 });
  });
  it('can be taken by a magic character as a Minor Virtue Quality', () => {
    const c = bingus();
    addQualities(c, data, 'minor-virtue', 1);
    const q = c.creature!.magicCharacter!.qualities[0];
    q.virtueUid = addVirtue(c, data, 'variable-power', 'Minor', undefined, { free: true, freeReason: 'Minor Virtue' }).uid;
    const d = deriveCharacter(c, data, rules);
    expect(d.virtues.some((v) => v.cv.defId === 'variable-power')).toBe(true);
  });
});

describe('(Form) Resistance', () => {
  it('adds to a Magic being’s resistance against its Form, not to others', () => {
    const c = bingus();
    ensureAbility(c, 'form-resistance', { laterLife: 15 }, 'Ignem');
    const d = deriveCharacter(c, data, rules);
    const might = d.might?.score ?? 0;
    expect(magicResistance(d, 'Ig').total).toBe(might + 2);
    expect(magicResistance(d, 'Aq').total).toBe(might);
  });
});

describe('Essential Traits (RoP: Magic)', () => {
  it('names a true form, and reads a Characteristic with a trait tied to it', () => {
    expect(trueFormName('a raven')).toBe('Raven');
    expect(trueFormName('the Old Oak*')).toBe('Old Oak');
    expect(withCharacterTrait(1, 3)).toBe(3);
    expect(withCharacterTrait(4, 3)).toBe(4);
    expect(withCharacterTrait(-1, -3)).toBe(-3);
    expect(withCharacterTrait(-1, 3)).toBe(2);
    expect(withCharacterTrait(2, -3)).toBe(-1);
  });
  it('makes every Personality Trait of a being of Magic Might Essential, and adds the Essential Virtue’s and Flaw’s', () => {
    const c = newCharacter('companion', 's');
    c.personality = [{ uid: 'a', trait: 'Raven*', score: 3 }, { uid: 'b', trait: 'Curious', score: 2 }];
    c.virtues.push({ uid: 'v', defId: 'essential-virtue', size: 'Minor', param: 'Keen-eyed (Per)' }, { uid: 'f', defId: 'essential-flaw-flaw', size: 'Major', param: 'Stutter' });
    // without Might, only the asterisked trait and the Virtue's and Flaw's
    expect(essentialTraits(c).map((t) => `${t.trait} ${t.score}`)).toEqual(['Raven* 3', 'Keen-eyed (Per)* 3', 'Stutter* -6']);
    expect(hasMagicMight(c)).toBe(false);
    c.creature = { realm: 'Magic', kind: 'animal', size: -3, might: 10, intelligence: 'companion' };
    expect(hasMagicMight(c)).toBe(true);
    expect(trueFormTrait(c)?.trait).toBe('Raven*');
    expect(essentialTraits(c).map((t) => t.trait)).toEqual(['Raven*', 'Curious*', 'Keen-eyed (Per)*', 'Stutter*']);
  });
});
