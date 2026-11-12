// Realms of Power: The Divine at the table, checked against the book's own examples: Isabelle's
// blessing and prayer, Mansur's invocation of God's aid, Dominia's Divine Ascent, Arshaq's Divine
// Form, Henry of Cyprus's relic, and Holy Magic's casting, rituals, Lab Texts and auras.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { SAINTS } from '../data/divine';
import { addVirtue, ensureAbility, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import {
  ascentCheck, ascentDuration, ceremonyParts, divineAidBonus, divineAuraWarps, godsAidTotal, holyEffectLevel, holyEffectTotal, holyWorkTotal, workHolySeason,
  holyOutcome, miracleLevel, miracleTotal, schism, threatEase, threatResult,
} from './holy';
import { castingScore, divineResistance, labTotal, magicResistance } from './magic';
import { auraWarping } from './time';
import { DEFAULT_HOUSE_RULES, type Character } from './types';

const data = buildGameData();
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
const dominion = (strength: number) => ({ realm: 'Divine' as const, strength });

function holyCompanion(): Character {
  const c = newCharacter('companion', 's');
  c.characteristics.Pre = 2;
  c.characteristics.Com = 2;
  return c;
}

describe('miraculous effects', () => {
  it('add the Method’s Characteristic, the Method, the Power and the Divine aura', () => {
    const c = holyCompanion();
    addVirtue(c, data, 'invocation', 'Major');
    addVirtue(c, data, 'blessing-power', 'Major');
    const r = holyEffectTotal(d(c), { method: 'invocation', power: 'blessing', aura: dominion(3) });
    expect(r.works).toBe(true);
    expect(r.total).toBe(2 + 1 + 1 + 3); // Communication, Invocation 1, Blessing 1, Dominion 3
    expect(r.stress).toBe(true);
    // Invocation does not call Intervention, and a Power with no score cannot be used at all
    expect(holyEffectTotal(d(c), { method: 'invocation', power: 'intervention' }).works).toBe(false);
  });

  it('Holy Music works as Meditation, with Presence (Isabelle sings Paul to sleep)', () => {
    const c = holyCompanion();
    c.characteristics.Pre = 4;
    addVirtue(c, data, 'holy-music', 'Major');
    addVirtue(c, data, 'blessing-power', 'Major');
    ensureAbility(c, 'holy-music', { laterLife: 15 }); // 2
    const r = holyEffectTotal(d(c), { method: 'holy-music', power: 'blessing', aura: dominion(0) });
    expect(r.works).toBe(true);
    // 7 on the die + Presence 4 + Holy Music 2 + Blessing 1 = 14, against level 10
    expect(r.total + 7).toBe(14);
    expect(holyEffectLevel({ base: 2, range: 'Touch', duration: 'Moon', target: 'Individual' }).level).toBe(10);
  });

  it('levels its effects as Hermetic magic does, with four magnitudes for what would be a Ritual', () => {
    expect(holyEffectLevel({ base: 5, range: 'Personal', duration: 'Momentary', target: 'Boundary', asRitual: true }).level).toBe(45);
    expect(holyEffectLevel({ base: 30, range: 'Sight', duration: 'Momentary', target: 'Boundary', asRitual: true }).level).toBe(85);
    expect(holyEffectLevel({ base: 4, range: 'Personal', duration: 'Momentary', target: 'Individual', asRitual: true }).level).toBe(20);
    expect(holyEffectLevel({ base: 5, range: 'Arcane Connection', duration: 'Concentration', target: 'Individual', asRitual: true }).level).toBe(50);
    expect(holyEffectLevel({ base: 30, range: 'Personal', duration: 'Year', target: 'Individual' }).level).toBe(50);
  });

  it('a failure brings a tragedy of hubris, which True Faith may spare (level 30, a total of 15)', () => {
    expect(holyOutcome(15, 30, 0).tragedy).toBe('major');
    expect(holyOutcome(15, 30, 2).tragedy).toBe('minor');
    const saved = holyOutcome(15, 30, 3);
    expect(saved.tragedy).toBeUndefined();
    expect(saved.faithSaved).toBe(true);
    expect(holyOutcome(5, 30, 0).tragedy).toBe('ultimate');
    const ok = holyOutcome(32, 30, 0);
    expect(ok.works && ok.warpsTarget).toBe(true);
    // a botch: a Warping Point for each zero, and at least a minor tragedy
    const b = holyOutcome(40, 10, 0, 2);
    expect(b.works).toBe(false);
    expect(b.warping).toBe(2);
    expect(b.tragedy).toBe('minor');
  });

  it('a ceremony adds each member’s Characteristic + Method, and the unled group modifier', () => {
    const members = [
      { name: 'A', adds: 4, ceremony: 1 },
      { name: 'B', adds: 3, ceremony: 0 },
    ];
    const unled = ceremonyParts({ members, focusCeremony: 2 });
    expect(unled.reduce((s, p) => s + p.value, 0)).toBe(4 + 3 + (1 + 0 + 2 - 3));
    const led = ceremonyParts({ members, leaderCeremony: 1 });
    expect(led.reduce((s, p) => s + p.value, 0)).toBe(4);
  });
});

describe('prayers, God’s aid and the saints', () => {
  it('Isabelle prays to escape the faerie prince: True Faith 1 + Concentration 0 + Dominion 3, for a level 20 miracle', () => {
    const c = holyCompanion();
    addVirtue(c, data, 'true-faith', 'Major');
    expect(miracleTotal(d(c), { aura: dominion(3) }).total).toBe(4);
    expect(miracleLevel(15, 10, -5)).toBe(20);
  });

  it('Mansur invokes God’s aid: a 7 + Communication 2 = 9 gives +1', () => {
    const c = holyCompanion();
    expect(godsAidTotal(d(c)).total).toBe(2);
    expect(divineAidBonus(9)).toBe(1);
    expect(divineAidBonus(15)).toBe(2);
    expect(divineAidBonus(30)).toBe(3);
    expect(divineAidBonus(8)).toBe(0);
  });

  it('threatening a saint is against 9 + its Might ÷ 5; ten short is a curse', () => {
    const martin = SAINTS.find((s) => s.id === 'martin')!;
    expect(threatEase(martin)).toBe(19);
    expect(threatResult(19, martin, false)).toBe('granted');
    expect(threatResult(15, martin, false)).toBe('annoyed');
    expect(threatResult(9, martin, false)).toBe('cursed');
    expect(threatResult(30, martin, true)).toBe('botched');
  });

  it('two tempers in one aura are a schism', () => {
    const t = { value: 2, how: 'ceremonial' as const, place: 'St Mary’s', year: 1220, season: 'Spring' as const };
    expect(schism([{ ...t, temper: 'calm' }, { ...t, temper: 'brave' }])).toHaveLength(1);
    expect(schism([{ ...t, temper: 'calm' }, { ...t, temper: 'calm', place: 'elsewhere' }])).toHaveLength(0);
  });
});

describe('the Divine Ascent and the Divine Form', () => {
  it('Dominia: three Warping Points in an Empyreal aura of 5, with True Faith 1', () => {
    const c = holyCompanion();
    addVirtue(c, data, 'true-faith', 'Major');
    addVirtue(c, data, 'purity', 'Major');
    const a = ascentCheck(d(c), 3, dominion(5));
    expect(a.against.total).toBe(0 + 3 + 1 + 5); // + the storyguide's 8 = 17
    // failed by 10: 13 points gained in all, twelve days in the Divine
    expect(ascentDuration(0, 13, 1)).toEqual({ n: 12, unit: 'days' });
    expect(ascentDuration(6, 2, 0).unit).toBe('months');
  });

  it('Arshaq’s Divine Form: Magic Resistance 11 and Soak +2 at Warping Score 1 and True Faith 1', () => {
    const c = holyCompanion();
    addVirtue(c, data, 'true-faith', 'Major');
    c.warpingPoints = 5;
    c.holy = { ascent: 'form' };
    const x = d(c);
    expect(divineResistance(x)[0].value).toBe(11);
    expect(x.soak - x.characteristics.Sta.value).toBe(2);
  });

  it('Henry of Cyprus: a crowned king (10) with a relic of 2 Faith Points has Magic Resistance 30, Soak +2', () => {
    const c = holyCompanion();
    c.holy = { commandingAura: 10 };
    addVirtue(c, data, 'relic', 'Minor');
    c.virtues = c.virtues.filter((v) => v.defId !== 'relic');
    addVirtue(c, data, 'powerful-relic', 'Major');
    const x = d(c);
    // a Powerful Relic is Faith 3: 10 + 30
    expect(magicResistance(x, 'Co').total).toBe(40);
    expect(x.soak - x.characteristics.Sta.value).toBe(2);
  });

  it('True Faith 3 doubles resistance against Mentem, and each Virtue taken again raises the score', () => {
    const c = holyCompanion();
    for (let i = 0; i < 3; i++) addVirtue(c, data, 'true-faith', 'Major');
    const x = d(c);
    expect(x.trueFaith).toBe(3);
    expect(magicResistance(x, 'Me').total).toBe(60);
    expect(magicResistance(x, 'Co').total).toBe(30);
  });
});

describe('Holy Magic', () => {
  function holyMagus(): Character {
    const c = newCharacter('magus', 's');
    c.arts.Cr = { apprenticeship: 55 }; // 10
    c.arts.Co = { apprenticeship: 15 }; // 5
    addVirtue(c, data, 'holy-magic', 'Major');
    return c;
  }
  const arts = { technique: 'Cr' as const, form: 'Co' as const };
  const auraPart = (r: ReturnType<typeof castingScore>) => r.parts.find((p) => p.label.startsWith('Aura'))?.value ?? 0;

  it('is attuned to the Dominion as to a Magic aura, and loses nothing in an Infernal one', () => {
    const c = holyMagus();
    expect(auraPart(castingScore(d(c), arts, { kind: 'formulaic', aura: dominion(4) }))).toBe(4);
    expect(auraPart(castingScore(d(c), arts, { kind: 'formulaic', aura: { realm: 'Infernal', strength: 3 } }))).toBe(0);
    expect(auraPart(castingScore(d(c), arts, { kind: 'formulaic', aura: { realm: 'Faerie', strength: 4 } }))).toBe(2);
    // a Hermetic magus in the same Dominion
    const h = newCharacter('magus', 's');
    expect(auraPart(castingScore(d(h), arts, { kind: 'formulaic', aura: dominion(4) }))).toBe(-12);
    // and the lab: a Divine aura counts for a holy magus's Lab Total
    expect(labTotal(d(c), arts, { activity: 'spells', aura: dominion(3) }).parts.find((p) => p.label.startsWith('Aura'))?.value).toBe(3);
  });

  it('adds a Method and a Power to a Ritual, not Artes Liberales and Philosophiae', () => {
    const c = holyMagus();
    addVirtue(c, data, 'purity', 'Major');
    addVirtue(c, data, 'intervention', 'Major');
    ensureAbility(c, 'artes-liberales', { laterLife: 15 });
    const r = castingScore(d(c), arts, { kind: 'ritual' });
    expect(r.parts.some((p) => p.label === 'Artes Liberales')).toBe(false);
    expect(r.parts.find((p) => p.label === 'Purity')?.value).toBe(1);
    expect(r.parts.find((p) => p.label === 'Intervention')?.value).toBe(1);
  });

  it('halves a Hermetic Laboratory Text, and its own are halved for Hermetic magi', () => {
    const c = holyMagus();
    const h = newCharacter('magus', 's');
    h.arts.Cr = { apprenticeship: 55 };
    h.arts.Co = { apprenticeship: 15 };
    const lt = (x: Character, holyText?: boolean) => labTotal(d(x), arts, { activity: 'spells', fromText: true, textByHolyMagus: holyText });
    expect(lt(c).halved).toBe(true);
    expect(lt(c, true).halved).toBe(false);
    expect(lt(h).halved).toBe(false);
    expect(lt(h, true).halved).toBe(true);
  });

  it('a powerful Dominion does not warp the faithful, a holy magus, or a holy character', () => {
    const cov = { id: 'cv', hooksBoons: [], boons: [] } as never;
    const ctx = { aura: dominion(7), covenant: cov } as never;
    const plain = holyCompanion();
    const faithful = holyCompanion();
    faithful.faith = { score: 0, points: 1 };
    expect(divineAuraWarps(plain, d(plain))).toBe(true);
    expect(divineAuraWarps(faithful, d(faithful))).toBe(false);
    expect(auraWarping(holyMagus(), d(holyMagus()), ctx, 1220)).toBe(0);
  });
});

describe('seasons of holy work', () => {
  it('Moshe awakens a golem: 15 + 20 Ceremony against 30, three seasons, and an 8: Might 23', () => {
    const c = holyCompanion();
    c.characteristics.Int = 2;
    addVirtue(c, data, 'educated-hebrew', 'Minor');
    addVirtue(c, data, 'kabbalah', 'Major');
    addVirtue(c, data, 'wonders', 'Major');
    ensureAbility(c, 'kabbalah', { laterLife: 105 }); // 6
    ensureAbility(c, 'wonders', { laterLife: 30 }); // 3
    c.holy = { works: [{ uid: 'g', kind: 'golem', name: 'Isaac', target: 0, progress: 0, seasons: 0, helpers: 3, ceremonyBonus: 20 }] };
    const aura = dominion(4);
    expect(holyWorkTotal(d(c), c.holy.works![0], aura).total).toBe(35);
    workHolySeason(c, d(c), 'g', aura); // the body
    workHolySeason(c, d(c), 'g', aura);
    workHolySeason(c, d(c), 'g', aura);
    // the last: +5 more, and the stress die shows 8 (0.8 → 8)
    const out = workHolySeason(c, d(c), 'g', aura, { finish: true, rng: () => 0.85 });
    expect(c.holy.works![0].done).toBe(true);
    expect(out.join(' ')).toMatch(/Divine Might 23/);
  });

  it('Shinnui Shem gives a fifth of its total as a bonus to aging, until the next Aging Point', () => {
    const c = holyCompanion();
    c.characteristics.Int = 3;
    addVirtue(c, data, 'educated-hebrew', 'Minor');
    addVirtue(c, data, 'gematria', 'Major');
    c.holy = { works: [{ uid: 's', kind: 'shinnui', name: 'Shinnui Shem', target: 1, progress: 0, seasons: 0, quality: 10 }] };
    workHolySeason(c, d(c), 's', dominion(3), { rng: () => 0.65 }); // a 6
    // 3 + 1 + 0 + 10 + 3 = 17, + 6 = 23: 4
    expect(c.holy.shinnui).toBe(4);
    expect(d(c).agingRollParts.find((p) => p.label === 'Shinnui Shem')?.value).toBe(-4);
  });

  it('a True Name through Merkavah costs a long-term Fatigue level a season', () => {
    const c = holyCompanion();
    addVirtue(c, data, 'educated-hebrew', 'Minor');
    addVirtue(c, data, 'merkavah', 'Major');
    c.holy = { works: [{ uid: 't', kind: 'trueName', name: 'True Name: Raphael', target: 1, progress: 0, seasons: 0, helpers: 1, ceremonyBonus: 5 }] };
    workHolySeason(c, d(c), 't', dominion(2));
    expect(c.longTermFatigueLost).toBe(1);
    // Stamina 0 + Merkavah 1 + 5 + 2 = 8, 7 over Might 1: the name comes
    expect(c.holy.trueNames).toEqual(['Raphael']);
  });
});
