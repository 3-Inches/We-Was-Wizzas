// Boons and Hooks that change the covenant's people, aura and points (Covenants ch.2): a regio of
// another realm, Immunity, inhuman covenfolk, the covenfolk Boons, loyalty and health, Reputations,
// Edifices' Great Works, and a power level kept whatever the Build Points.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newSaga } from '../store/store';
import { addVirtue, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { validateCharacter } from './character/validate';
import { deriveCovenant, newCovenant } from './covenant';
import { applyCovenfolkBoons, covenfolkBoonLines, hookBoonPoints, immunityFlawState, takeImmunityFlaw } from './covenantBoons';
import { generateCharacter } from './generate/character';
import { strike } from './calamity';
import { fillCovenant } from './generate/covenant';
import { seeded } from './generate/random';
import { advanceSeason, DEFAULT_ADVANCE, livingConditions } from './time';
import { DEFAULT_HOUSE_RULES, type Covenant, type CovenantHookBoon, type Saga } from './types';

const data = buildGameData();
let n = 0;
const hb = (name: string, kind: 'hook' | 'boon', size: 'Major' | 'Minor' = 'Minor', extra: Partial<CovenantHookBoon> = {}): CovenantHookBoon => {
  const def = data.hooksBoons.find((h) => h.kind === kind && h.name === name);
  return { uid: `hb${n++}`, defId: def?.id, name, kind, size, ...extra };
};
const covWith = (...h: CovenantHookBoon[]): Covenant => {
  const c = newCovenant('s', 1220);
  c.name = 'Testhold';
  c.hooksBoons = h;
  return c;
};

describe('Boon and Hook points', () => {
  it('counts a regio of another realm as an additional Minor Hook', () => {
    expect(hookBoonPoints(hb('Regio', 'hook', 'Major'), []).hook).toBe(3);
    expect(hookBoonPoints(hb('Regio', 'hook', 'Major', { regioRealm: 'Faerie' }), []).hook).toBe(4);
    expect(hookBoonPoints(hb('Regio', 'hook', 'Minor', { regioRealm: 'Infernal' }), []).hook).toBe(2);
    expect(deriveCovenant(covWith(hb('Regio', 'hook', 'Minor', { regioRealm: 'Divine' })), data, []).hookPoints).toBe(2);
  });
  it('makes a Major Immunity a Major Hook once a member pairs a Flaw with it', () => {
    const flaw = data.virtuesFlaws.find((v) => v.id === 'lycanthrope-flaw') ?? data.virtuesFlaws.find((v) => v.kind === 'flaw' && v.sizes.includes('Major'))!;
    const imm = hb('Immunity', 'boon', 'Major', { immunity: { kind: 'flaw', value: flaw.id } });
    const cov = covWith(imm);
    const m = newCharacter('companion', 's');
    cov.memberIds = [m.id];
    expect(deriveCovenant(cov, data, [m]).boonPoints).toBe(3);
    addVirtue(m, data, flaw.id, 'Major');
    const d = deriveCovenant(cov, data, [m]);
    expect(d.boonPoints).toBe(0);
    expect(d.hookPoints).toBe(3);
  });
});

describe('loyalty and living conditions', () => {
  it('sets the points to 30 for Loyal Covenfolk, −75 for Rebellious, and adds the Healthy Feature and Vivid Environment', () => {
    const loyal = deriveCovenant(covWith(hb('Loyal Covenfolk', 'boon')), data, []).loyalty;
    expect(loyal.points).toBe(30);
    expect(loyal.score).toBe(3);
    expect(deriveCovenant(covWith(hb('Rebellious Covenfolk', 'hook', 'Major')), data, []).loyalty.points).toBe(-75);
    const pleasant = deriveCovenant(covWith(hb('Healthy Feature', 'boon'), hb('Healthy Feature', 'boon'), hb('Vivid Environment', 'boon')), data, []).loyalty;
    expect(pleasant.points).toBe(30);
  });
  it('gives the Healthy Feature to Aging rolls, and the Unhealthy Environment to those without a longevity ritual', () => {
    const cov = covWith(hb('Healthy Feature', 'boon'));
    const c = newCharacter('companion', 's');
    const d = deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
    const ctx = { covenant: cov, aura: { realm: 'Magic', strength: 3 } } as never;
    const base = livingConditions(d, { covenant: covWith(), aura: { realm: 'Magic', strength: 3 } } as never);
    expect(livingConditions(d, ctx)).toBe(base + 1);
    const sick = covWith(hb('Unhealthy Environment', 'hook'), hb('Unhealthy Environment', 'hook'));
    expect(livingConditions(d, { covenant: sick, aura: { realm: 'Magic', strength: 3 } } as never)).toBe(base - 2);
    c.longevity = { labTotal: 30, bonus: 6 } as never;
    expect(livingConditions(deriveCharacter(c, data, DEFAULT_HOUSE_RULES), { covenant: sick, aura: { realm: 'Magic', strength: 3 } } as never)).toBe(base);
  });
});

describe('inhuman covenfolk', () => {
  it('leaves the share who need no food out of the Provisions', () => {
    const plain = covWith();
    plain.covenfolk = { ...plain.covenfolk, grogs: 10, servants: 10 };
    const fey = structuredClone(plain);
    fey.hooksBoons = [hb('Inhuman Residents', 'boon', 'Minor', { inhuman: { nature: 'faerie', share: 0.6 } })];
    const p = (c: Covenant) => deriveCovenant(c, data, []).finances.expenditures.find((e) => e.label === 'Provisions')!.pounds;
    expect(p(fey)).toBeLessThan(p(plain) * 0.6);
    expect(covenfolkBoonLines(fey, data)[0]).toMatch(/immune to Warping/);
  });
  it('does not age or gain Warping in a strong aura, where a human grog does', () => {
    const s: Saga = { ...newSaga('T'), currentYear: 1220, currentSeason: 'Winter' };
    const cov = newCovenant(s.id, 1200);
    cov.name = 'High aura';
    cov.aura = 8;
    const human = newCharacter('grog', s.id);
    const fey = newCharacter('grog', s.id);
    for (const c of [human, fey]) ((c.age = 40), (c.creation.finalized = true), (c.covenantId = cov.id), cov.memberIds.push(c.id));
    fey.inhuman = 'faerie';
    const { state } = advanceSeason({ saga: s, characters: [human, fey], covenants: [cov] }, data, { ...DEFAULT_ADVANCE, rng: seeded(3) });
    const h = state.characters.find((c) => c.id === human.id)!;
    const f = state.characters.find((c) => c.id === fey.id)!;
    expect(h.age).toBe(41);
    expect(h.warpingPoints).toBeGreaterThan(0);
    expect(f.age).toBe(40);
    expect(f.warpingPoints).toBe(0);
  });
});

describe('Immunity', () => {
  it('spares a covenant immune to disease the plague, and those living there the aura’s Warping when immune to it', () => {
    const cov = covWith(hb('Immunity', 'boon', 'Major', { immunity: { kind: 'disease', value: 'all' } }));
    cov.covenfolk = { ...cov.covenfolk, grogs: 20, servants: 20 };
    const lines = strike(cov, [], 'plague', 3, { rng: seeded(1) } as never);
    expect(lines.join(' ')).toMatch(/Immunity keeps the sickness out/);
    expect(cov.covenfolk.grogs).toBe(20);
    const s: Saga = { ...newSaga('T'), currentYear: 1220, currentSeason: 'Winter' };
    const warded = newCovenant(s.id, 1200);
    warded.aura = 8;
    warded.hooksBoons = [hb('Immunity', 'boon', 'Major', { immunity: { kind: 'influence', value: 'Warping' } })];
    const g = newCharacter('grog', s.id);
    ((g.creation.finalized = true), (g.covenantId = warded.id), warded.memberIds.push(g.id));
    const { state } = advanceSeason({ saga: s, characters: [g], covenants: [warded] }, data, { ...DEFAULT_ADVANCE, rng: seeded(3) });
    expect(state.characters[0].warpingPoints).toBe(0);
  });
});

describe('the covenfolk Boons on those made at the covenant', () => {
  it('gives reading, the local language and an inhuman nature without a rules error', () => {
    const cov = covWith(hb('Literate Covenfolk', 'boon'), hb('Local Language', 'boon', 'Minor', { language: 'Vulgar Latin' }), hb('Inhuman Residents', 'boon', 'Minor', { inhuman: { nature: 'magic', share: 1 } }));
    const g = newCharacter('grog', 's');
    const notes = applyCovenfolkBoons(g, cov, data, seeded(2));
    expect(notes.join(' ')).toMatch(/Artes Liberales 1/);
    expect(notes.join(' ')).toMatch(/Vulgar Latin 4/);
    expect(g.inhuman).toBe('magic');
    expect(g.seasons?.sleepless).toBe(true);
    const d = deriveCharacter(g, data, DEFAULT_HOUSE_RULES);
    expect(d.abilities.find((a) => a.abilityId === 'artes-liberales')?.score).toBe(1);
    expect(validateCharacter(d, data, DEFAULT_HOUSE_RULES).filter((i) => /Artes Liberales/.test(i.message) && i.severity !== 'info')).toEqual([]);
  });
  it('shapes the grogs and specialists Quick build makes, and says so', () => {
    const saga = { id: 's', name: 'Test', tribunal: 'Rhine', enabledBooks: [], houseRules: DEFAULT_HOUSE_RULES, currentYear: 1220, options: {} } as unknown as Saga;
    const cov = covWith(hb('Literate Covenfolk', 'boon'), hb('Useful Curse', 'boon', 'Minor', { curse: { what: 'live as wolves', ability: 'awareness', bonus: 2, share: 1 } }));
    cov.buildPoints = 300;
    const r = fillCovenant(cov, [], { data, saga, rules: DEFAULT_HOUSE_RULES }, { staff: true, teacher: false, craftsmen: false, grogs: 2, counts: false, bought: true, seed: 5 });
    expect(r.log.join(' ')).toMatch(/covenfolk Boons and Hooks on those made here/);
    for (const g of r.grogs) expect(g.c.abilities.some((a) => a.abilityId === 'artes-liberales')).toBe(true);
    for (const s of r.cov.specialists) expect(s.abilities?.some((a) => a.id === 'artes-liberales')).toBe(true);
  }, 60_000);
});

describe('the covenant’s Reputations, Great Works and power level', () => {
  it('gives Prestige and Infamous as Reputations', () => {
    const d = deriveCovenant(covWith(hb('Prestige', 'boon', 'Major', { note: 'the Order' }), hb('Infamous', 'hook', 'Minor', { note: 'the local bishop' })), data, []);
    expect(d.reputations).toEqual([
      { text: 'Prestigious', scope: 'the Order', score: 9, bad: false },
      { text: 'Infamous', scope: 'the local bishop', score: 3, bad: true },
    ]);
  });
  it('lets an Edifice Boon pay for a Great Work, and triples its resonance', () => {
    const ed = hb('Edifices', 'boon');
    const cov = covWith(ed);
    cov.library = [{ uid: 'gw', title: 'Forest of Shining Stone', kind: 'summa', subjectType: 'ability', subject: 'magic-theory', level: 6, quality: 12, language: 'Latin', boonUid: ed.uid, make: { format: 'great-work' } }];
    expect(deriveCovenant(cov, data, []).bpLines.find((l) => l.ref === 'gw')?.cost).toBe(0);
    delete cov.library[0].boonUid;
    expect(deriveCovenant(cov, data, []).bpLines.find((l) => l.ref === 'gw')?.cost).toBe(12 + 3 * 6);
  });
  it('keeps the power level’s limits with Build Points outside its range when the troupe says so', () => {
    const cov = covWith();
    cov.powerLevel = 'Low';
    cov.buildPoints = 800;
    expect(deriveCovenant(cov, data, []).issues.some((i) => /outside the Low power range/.test(i))).toBe(true);
    cov.keepPowerLevel = true;
    const d = deriveCovenant(cov, data, []);
    expect(d.issues.some((i) => /outside the Low power range/.test(i))).toBe(false);
    cov.library = [{ uid: 'lt', title: 'Text', kind: 'labText', subjectType: 'spell', subject: 'X', level: 30, quality: 0, language: 'Latin' }];
    expect(deriveCovenant(cov, data, []).issues.some((i) => /exceeds the Low power level maximum of 25/.test(i))).toBe(true);
  });
});

describe('a Flaw the Immunity holds off', () => {
  const sagaFor = (): Saga => {
    const s = newSaga('Immune');
    s.currentYear = 1220;
    return s;
  };
  const leperhold = (share?: number) => {
    const cov = covWith(hb('Immunity', 'boon', 'Major', { immunity: { kind: 'flaw', value: 'leprosy-flaw', share } }));
    cov.id = 'leper';
    return cov;
  };

  it('is given, paired, to grogs and companions made for the covenant, who spend its Virtue points', () => {
    const cov = leperhold();
    const saga = sagaFor();
    for (const type of ['grog', 'companion'] as const) {
      for (let seed = 1; seed <= 3; seed++) {
        const g = generateCharacter({ type, variety: 'varied', npc: true, seed }, { data, saga, rules: DEFAULT_HOUSE_RULES, covenant: cov });
        const flaw = g.c.virtues.find((v) => v.defId === 'leprosy-flaw');
        expect(flaw?.heldBy).toBe(cov.hooksBoons[0].uid);
        const d = deriveCharacter(g.c, data, DEFAULT_HOUSE_RULES);
        expect(validateCharacter(d, data, DEFAULT_HOUSE_RULES).filter((i) => i.severity === 'error').map((i) => i.message)).toEqual([]);
        // the Flaw's 3 points are spent on Virtues
        expect(d.tally.virtuePoints).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('is given to nobody at a share of none, and to a specialist only as a note', () => {
    const cov = leperhold(0);
    const g = generateCharacter({ type: 'grog', variety: 'varied', npc: true, seed: 4 }, { data, saga: sagaFor(), rules: DEFAULT_HOUSE_RULES, covenant: cov });
    expect(g.c.virtues.some((v) => v.defId === 'leprosy-flaw')).toBe(false);
    const cov2 = leperhold();
    const r = fillCovenant(cov2, [], { data, saga: sagaFor(), rules: DEFAULT_HOUSE_RULES }, { staff: true, teacher: false, craftsmen: false, grogs: 0, counts: false, bought: false, seed: 2 });
    expect(r.cov.specialists.length).toBeGreaterThan(0);
    expect(r.cov.specialists.every((s) => /Leprosy \(held off within the aura/.test(s.notes ?? ''))).toBe(true);
  });

  it('does nothing in the aura and is back away from it', () => {
    const cov = leperhold();
    const c = newCharacter('companion', 's');
    takeImmunityFlaw(c, cov, data, seeded(1));
    const home = deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
    expect(home.livingConditionsMod).toBe(0);
    expect(home.virtues.find((v) => v.cv.defId === 'leprosy-flaw')?.held).toBe(true);
    // its points still count
    expect(home.tally.flawPoints).toBe(3);
    c.awayFromCovenant = true;
    expect(deriveCharacter(c, data, DEFAULT_HOUSE_RULES).livingConditionsMod).toBeLessThan(0);
    c.awayFromCovenant = undefined;
    c.auraTime = 'away';
    expect(deriveCharacter(c, data, DEFAULT_HOUSE_RULES).livingConditionsMod).toBeLessThan(0);
  });

  it('pairs a Flaw a character already has, makes the Boon a Major Hook, and finds a stale pairing', () => {
    const cov = leperhold();
    const c = newCharacter('companion', 's');
    addVirtue(c, data, 'leprosy-flaw', 'Major');
    expect(immunityFlawState(cov, c).unpaired).toHaveLength(1);
    expect(takeImmunityFlaw(c, cov, data, seeded(1))).toMatch(/paired/);
    expect(immunityFlawState(cov, c).paired).toHaveLength(1);
    cov.memberIds = [c.id];
    expect(hookBoonPoints(cov.hooksBoons[0], [c])).toMatchObject({ hook: 3, boon: 0 });
    cov.hooksBoons = [];
    expect(immunityFlawState(cov, c).stale).toHaveLength(1);
  });
});
