import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { DEFAULT_HOUSE_RULES } from './types';
import { addVirtue, ensureAbility, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { castingFatigue, castingRules, castingScore, certamenFatigue, certamenTotals, lifeLinkedFatigue, magicBotchDice, ritualVis, visWithWaste } from './magic';
import { experimentBotchDice, researchRiskLimit, rollExperiment } from './experiment';
import { agingRoll, computeStudy } from './longterm';

const data = buildGameData();

/** A die that shows these faces in turn (0–9; 0 is the "0" face). */
const faces = (...f: number[]) => {
  let i = 0;
  return () => (f[i++ % f.length] + 0.5) / 10;
};

function duelist(chars: Record<string, number>, arts: Record<string, number>, ab: { finesse: number; parma: number; pen: number }) {
  const c = newCharacter('magus', 's1');
  c.characteristics = { Int: 0, Per: 0, Str: 0, Sta: 0, Pre: 0, Com: 0, Dex: 0, Qik: 0, ...chars };
  const xpFor = (n: number) => (n * (n + 1)) / 2;
  for (const [a, n] of Object.entries(arts)) c.arts[a as 'Re'] = { apprenticeship: xpFor(n) };
  ensureAbility(c, 'finesse', { apprenticeship: 5 * xpFor(ab.finesse) });
  ensureAbility(c, 'parma-magica', { apprenticeship: 5 * xpFor(ab.parma) });
  ensureAbility(c, 'penetration', { apprenticeship: 5 * xpFor(ab.pen) });
  return c;
}

describe('certamen (DE, Certamen Example)', () => {
  it("gives Moratamis's totals", () => {
    const c = duelist({ Int: 2, Per: 3, Pre: 2, Sta: 1, Qik: -1 }, { Re: 8, Te: 0 }, { finesse: 2, parma: 5, pen: 3 });
    const t = certamenTotals(deriveCharacter(c, data, DEFAULT_HOUSE_RULES), 'Re', 'Te');
    expect(t.initiative.total).toBe(1);
    expect(t.attack.technique.total).toBe(10);
    expect(t.attack.form.total).toBe(2);
    expect(t.defense.technique.total).toBe(11);
    expect(t.defense.form.total).toBe(3);
    expect(t.weakening.total).toBe(5);
    expect(t.resistance.total).toBe(6);
  });
  it("gives Carolus's totals", () => {
    const c = duelist({ Int: 2, Per: -1, Pre: -1, Sta: 1, Qik: 0 }, { Re: 7, Te: 6 }, { finesse: 2, parma: 3, pen: 1 });
    const t = certamenTotals(deriveCharacter(c, data, DEFAULT_HOUSE_RULES), 'Re', 'Te');
    expect([t.initiative.total, t.attack.technique.total, t.attack.form.total, t.defense.technique.total, t.defense.form.total]).toEqual([2, 6, 5, 6, 5]);
    expect([t.weakening.total, t.resistance.total]).toEqual([3, 4]);
  });
  it('costs a Fatigue level per five points of Weakening over Resistance', () => {
    expect(certamenFatigue(16, 6)).toBe(2); // Attack Advantage 13 + Weakening 3, Resistance 6
    expect(certamenFatigue(11, 6)).toBe(1); // Advantage 8 + 3
    expect(certamenFatigue(6, 6)).toBe(0); // resisted exactly
    expect(certamenFatigue(5 + 2, 6)).toBe(1);
  });
  it('doubles the lower Art with a Minor Magical Focus in Certamen (House Tremere)', () => {
    const c = duelist({ Pre: 1 }, { Re: 7, Te: 4 }, { finesse: 0, parma: 1, pen: 0 });
    addVirtue(c, data, 'minor-magical-focus', 'Minor', 'Certamen');
    const t = certamenTotals(deriveCharacter(c, data, DEFAULT_HOUSE_RULES), 'Re', 'Te');
    expect(t.attack.form.total).toBe(1 + 4 + 4);
    expect(t.attack.technique.total).toBe(1 + 7);
  });
});

describe('arcane experimentation (DE, Extraordinary Results Chart)', () => {
  it('adds a simple die and the risk modifier to the Lab Total', () => {
    // simple die 6, then a chart roll of 3 (+2 risk = 5: side effect), then the side-effect die 1
    const r = rollExperiment({ risk: 2, auraStrength: 3 }, faces(6, 3, 1));
    expect(r.labBonus).toBe(8);
    expect(r.lines[1]).toMatch(/Side effect .*sigil/);
  });
  it('rolls botch dice for the risk and the aura on a 0', () => {
    // simple die 4, chart 0, then 1 + 1 risk + 2 aura = 4 botch dice: two zeroes
    const r = rollExperiment({ risk: 1, auraStrength: 2 }, faces(4, 0, 0, 5, 0, 7));
    expect(r.disaster).toBe(true);
    expect(r.lines.filter((l) => /^ {2}\d\./.test(l))).toHaveLength(2);
  });
  it('lets original research move the roll onto a Discovery, without adding the risk to the Lab Total', () => {
    // simple die 5, chart 6 + risk 3 = 9 (story event); 10 is within the risk, so a Discovery too
    const r = rollExperiment({ risk: 3, auraStrength: 0, originalResearch: true }, faces(5, 6));
    expect(r.labBonus).toBe(5);
    expect(r.discovery).toBe(true);
    expect(r.lines.join(' ')).toMatch(/Special or story event/);
  });
  it('limits the original researcher’s risk by Magic Theory', () => {
    expect([0, 1, 5, 6, 10, 11, 20].map(researchRiskLimit)).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });
  it('never produces blank text', () => {
    for (let i = 0; i < 500; i++) {
      const r = rollExperiment({ risk: i % 4, auraStrength: i % 5, originalResearch: i % 3 === 0, enchantment: i % 2 === 0 });
      expect(r.lines.join(' ')).not.toMatch(/undefined|NaN/);
    }
  });
});

describe('a familiar\'s cords and the lab\'s Safety on botch dice (DE, The Three Cords; Covenants)', () => {
  it('takes the golden cord off casting botch dice, never down to none, then Spell Mastery', () => {
    expect(magicBotchDice(0, 2)).toBe(1); // one die stays one
    expect(magicBotchDice(3, 2)).toBe(2); // 4 dice − 2
    expect(magicBotchDice(3, 9)).toBe(1); // never to zero
    expect(magicBotchDice(3, 9, 1)).toBe(0); // Mastery can
  });
  it('counts risk, aura, Safety and the golden cord on the Extraordinary Results Chart', () => {
    expect(experimentBotchDice({ risk: 2, auraStrength: 3 })).toBe(6);
    expect(experimentBotchDice({ risk: 2, auraStrength: 3, safety: 2, goldenCord: 1 })).toBe(3);
    expect(experimentBotchDice({ risk: 0, auraStrength: 1, goldenCord: 5 })).toBe(1);
    expect(experimentBotchDice({ risk: 0, auraStrength: 0, safety: -2 })).toBe(3);
  });
  it('adds the bronze cord to Soak and to the aging roll', () => {
    const c = newCharacter('magus', 's1');
    const before = deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
    c.familiar = { name: 'Cattus', species: 'cat', might: 5, size: -2, realm: 'Magic', bindingTechnique: 'In', bindingForm: 'Aq', bindingLabTotal: 25, golden: 1, silver: 1, bronze: 2, pawnsSpent: 5, powers: [] };
    const d = deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
    expect(d.soak).toBe(before.soak + 2);
    expect(d.agingRollParts).toContainEqual({ label: "Familiar's bronze cord", value: -2 });
    expect(agingRoll(40, 0, 0, d.agingRollParts, () => 0.55).roll).toBe(5 + 4 - 2);
  });
});

describe('casting Virtues and Flaws (DE)', () => {
  const magus = (...ids: string[]) => {
    const c = newCharacter('magus', 's1');
    for (const id of ids) addVirtue(c, data, id);
    c.arts.Cr = { apprenticeship: 21 }; // 6
    c.arts.Ig = { apprenticeship: 10 }; // 4
    return deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
  };
  it('reads the casting Flaws and counts repeated Withstand Casting', () => {
    const r = castingRules(magus('weak-spontaneous-magic-flaw', 'unpredictable-magic-flaw', 'withstand-casting', 'withstand-casting', 'mercurian-magic'));
    expect(r.weakSpontaneous && r.unpredictable).toBe(true);
    expect(r.withstand).toBe(2);
    expect(r.ritualVisMultiplier).toBe(0.5);
  });
  it('applies Vulnerable Casting first, then Withstand Casting, never below one', () => {
    expect(castingFatigue(1, { vulnerable: 2, withstand: 0 })).toBe(3);
    expect(castingFatigue(3, { vulnerable: 0, withstand: 3 })).toBe(1);
    expect(castingFatigue(0, { vulnerable: 2, withstand: 0 })).toBe(0);
  });
  it("prices a Ritual's vis with Mercurian Magic and Waster of Vis (12 → 16, 10 → 14)", () => {
    expect(visWithWaste(12, true)).toEqual({ pawns: 16, wasted: 4 });
    expect(visWithWaste(10, true)).toEqual({ pawns: 14, wasted: 4 });
    expect(ritualVis(30, { ritualVisMultiplier: 1, wasterOfVis: false }).pawns).toBe(6);
    expect(ritualVis(30, { ritualVisMultiplier: 0.5, wasterOfVis: false }).pawns).toBe(3);
  });
  it('charges Life-Linked a Fatigue level per 5 points or fraction short', () => {
    expect(lifeLinkedFatigue(12, 20)).toBe(2);
    expect(lifeLinkedFatigue(20, 20)).toBe(0);
  });
  it('doubles the lowest Art for an exerted Diedne caster', () => {
    const d = magus('diedne-magic');
    const plain = castingScore(d, { technique: 'Cr', form: 'Ig' }, { kind: 'spontaneous' });
    const exerted = castingScore(d, { technique: 'Cr', form: 'Ig' }, { kind: 'spontaneous', diedneExerted: true });
    expect(exerted.total - plain.total).toBe(4);
    expect(exerted.parts.some((p) => /Diedne/.test(p.label))).toBe(true);
  });
  it('keeps botch dice at one or more until Spell Mastery (Cautious Sorcerer)', () => {
    expect(magicBotchDice(-3)).toBe(1);
    expect(magicBotchDice(-3, 0, 1)).toBe(0);
  });
});

describe('study distractions (DE, Distractions)', () => {
  it('takes a third of the total for each full month lost: 15, 10, 5, 0', () => {
    const d = deriveCharacter(newCharacter('magus', 's1'), data, DEFAULT_HOUSE_RULES);
    const xp = (m: number) => computeStudy(d, { kind: 'tractatus', quality: 15, isArt: true, subject: 'Vim' }, { art: 'Vi', monthsLost: m }).advancementTotal;
    expect([0, 1, 2, 3].map(xp)).toEqual([15, 10, 5, 0]);
  });
});
