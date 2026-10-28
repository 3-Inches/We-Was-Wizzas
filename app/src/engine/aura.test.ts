// A covenant's aura and how it changes: its Boons and Hooks (Covenants), changes recorded with
// their reasons, the yearly drift of a Magic aura (Realms of Power: Magic, Aura Variation), what an
// aligned aura does (RoP: Magic, Aligned Auras), and the aura on recovery (RoP: The Infernal).
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newSaga } from '../store/store';
import { newCovenant } from './covenant';
import { ensureAbility, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { auraAtTime, auraOf, auraRecovery, changeAura, dominionOutlook, dominionStrength, newAuraTrack, rollAuraYear, yearlyAuraModifier } from './aura';
import { recoveryRoll } from './disease';
import { castingScore, labTotal } from './magic';
import { covenantAura } from './context';
import { advanceSeason, DEFAULT_ADVANCE } from './time';
import { DEFAULT_HOUSE_RULES, type Covenant } from './types';

const data = buildGameData();
/** dice that show these faces in turn, then the last one */
const seq = (...f: number[]) => {
  let i = 0;
  return () => (f[Math.min(i++, f.length - 1)] + 0.5) / 10;
};
const hb = (name: string, kind: 'boon' | 'hook', size: 'Minor' | 'Major' = 'Minor') => ({ uid: name + Math.random(), name, kind, size }) as Covenant['hooksBoons'][number];

describe('the aura as it stands', () => {
  it('adds the Aura Boons and takes the Weak Aura, Missing Aura and Faerie Aura Hooks into account', () => {
    const cov = newCovenant('s', 1220);
    cov.aura = 3;
    cov.hooksBoons.push(hb('Aura', 'boon'), hb('Aura', 'boon'));
    expect(covenantAura(cov)).toEqual({ realm: 'Magic', strength: 5 });
    cov.hooksBoons.push(hb('Weak Aura', 'hook'));
    expect(auraOf(cov).strength).toBe(4);
    cov.hooksBoons.push(hb('Faerie Aura', 'hook'));
    expect(auraOf(cov).realm).toBe('Faerie');
    cov.hooksBoons.push(hb('Missing Aura', 'hook', 'Major'));
    expect(auraOf(cov).strength).toBe(0);
  });
  it('is one lower in a Flickering Aura’s missed year, and changes for one season when the table says so', () => {
    const cov = newCovenant('s', 1220);
    cov.aura = 5;
    cov.auraTrack = { ...newAuraTrack(cov), flickerYear: 1220, temp: { delta: 1, year: 1221, season: 'Spring' } };
    expect(auraOf(cov).strength).toBe(5);
    expect(auraOf(cov).parts.map((p) => p.label).join(' ')).toMatch(/Flickering.*Spring 1221 only/);
  });
  it('records a change with its reason', () => {
    const cov = newCovenant('s', 1220);
    cov.aura = 3;
    changeAura(cov, 1, 'A dragon of Might 40 settled in the hills', 1225, 'Summer');
    expect(cov.aura).toBe(4);
    expect(cov.auraLog).toMatchObject([{ year: 1225, season: 'Summer', delta: 1, text: 'A dragon of Might 40 settled in the hills' }]);
  });
  it('is one weaker at night and one stronger on holy days for the Dominion, and one stronger at night for an Infernal aura', () => {
    expect(auraAtTime({ realm: 'Divine', strength: 4 }, 'night').strength).toBe(3);
    expect(auraAtTime({ realm: 'Divine', strength: 4 }, 'holy').strength).toBe(5);
    expect(auraAtTime({ realm: 'Infernal', strength: 2 }, 'night').strength).toBe(3);
    expect(auraAtTime({ realm: 'Magic', strength: 5 }, 'night').strength).toBe(5);
  });
});

describe('a Magic aura from year to year (RoP: Magic)', () => {
  it('sums the year’s modifier: the pull to the base, neighbours, the covenant’s magic, vis spent and extracted', () => {
    const cov = newCovenant('s', 1220);
    cov.season = 'Summer';
    cov.aura = 4;
    cov.auraTrack = { ...newAuraTrack(cov), base: 5, impinging: ['Divine'] };
    const magus = newCharacter('magus', 's');
    magus.seasonLog.push(
      { uid: 'a', year: 1220, season: 'Spring', activity: 'study-vis', summary: '', gains: {}, visUsed: [{ art: 'Cr', pawns: 3 }], applied: true },
      { uid: 'b', year: 1220, season: 'Summer', activity: 'other', summary: 'Lab: Extract vis', gains: {}, labKind: 'extract', applied: true },
      { uid: 'c', year: 1219, season: 'Summer', activity: 'other', summary: 'Lab: Extract vis', gains: {}, labKind: 'extract', applied: true },
    );
    const m = yearlyAuraModifier(cov, [magus], 1220);
    // +3 back to the base, −6 Divine, +2 Summer, +1 vis spent, −1 extraction
    expect(m.total).toBe(3 - 6 + 2 + 1 - 1);
  });
  it('stays as it is between −3 and +3, easing the botch dice built up', () => {
    const cov = newCovenant('s', 1220);
    cov.auraTrack = { ...newAuraTrack(cov), botchDice: 2 };
    const r = rollAuraYear(cov, 3, 1220, seq(5));
    expect(r.delta).toBe(0);
    expect(cov.auraTrack.botchDice).toBe(1);
  });
  it('rolls on the Strengthening Table at +4 or more: 15–20 raises it for good, 11 for a season, 9 next year', () => {
    const cov = newCovenant('s', 1220);
    cov.auraTrack = newAuraTrack(cov);
    expect(rollAuraYear(cov, 6, 1220, seq(9)).delta).toBe(1); // 9 + 6 = 15
    expect(cov.auraTrack.botchDice).toBe(1);
    const c2 = newCovenant('s', 1220);
    c2.auraTrack = newAuraTrack(c2);
    rollAuraYear(c2, 6, 1220, seq(5)); // 11
    expect(c2.auraTrack!.temp).toEqual({ delta: 1, year: 1221, season: 'Spring' });
    const c3 = newCovenant('s', 1220);
    c3.auraTrack = newAuraTrack(c3);
    rollAuraYear(c3, -5, 1220, seq(4)); // 9 on the Weakening Table
    expect(c3.auraTrack!.latent).toBe(-3);
  });
  it('fractures into a regio on a botch, with Warping Points for everyone in it', () => {
    const cov = newCovenant('s', 1220);
    cov.auraTrack = { ...newAuraTrack(cov), botchDice: 2 };
    const r = rollAuraYear(cov, 5, 1220, seq(0, 0, 4));
    expect(r.lines.join(' ')).toMatch(/A regio level appears/);
    expect(r.warping).toBe(3);
  });
  it('is rolled at the year’s end when the saga turns the rule on, and the missed year of a Flickering Aura ends', () => {
    const s = newSaga('T');
    s.currentYear = 1220;
    s.currentSeason = 'Winter';
    s.options = { auraVariation: true };
    const cov = newCovenant(s.id, 1220);
    cov.name = 'Domus';
    cov.aura = 5;
    cov.season = 'Autumn';
    cov.hooksBoons.push(hb('Flickering Aura', 'hook'));
    cov.auraTrack = { ...newAuraTrack(cov), base: 5, impinging: ['Magic'], flickerYear: 1220 };
    const magus = newCharacter('magus', s.id);
    magus.name = 'Magus';
    magus.creation.finalized = true;
    magus.age = 30;
    cov.memberIds.push(magus.id);
    magus.covenantId = cov.id;
    // Autumn +3, a stronger Magic aura +2: +5, and a 9 on the die: 14, the aura expands
    const { state, report } = advanceSeason({ saga: s, characters: [magus], covenants: [cov] }, data, { ...DEFAULT_ADVANCE, rng: seq(9) });
    const text = report.lines.filter((l) => l.who === 'Domus').map((l) => l.text).join(' ');
    expect(text).toMatch(/Flickering Aura: the year is over/);
    expect(text).toMatch(/modifier is \+5/);
    expect(state.covenants[0].auraTrack!.flickerYear).toBeUndefined();
    expect(state.covenants[0].auraLog?.length).toBe(1);
    // the rule off: nothing is rolled
    const off = advanceSeason({ saga: { ...s, options: {} }, characters: [magus], covenants: [cov] }, data, { ...DEFAULT_ADVANCE, rng: seq(9) });
    expect(off.report.lines.some((l) => /modifier/.test(l.text))).toBe(false);
  });
});

describe('an aligned aura (RoP: Magic)', () => {
  const magus = () => {
    const c = newCharacter('magus', 's');
    c.arts.Cr = { apprenticeship: 55 };
    c.arts.Co = { apprenticeship: 55 };
    ensureAbility(c, 'magic-theory', { apprenticeship: 75 });
    return deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
  };
  it('counts double for magic that uses its Art, and not for other magic', () => {
    const cov = newCovenant('s', 1220);
    cov.aura = 4;
    cov.auraAlignment = { kind: 'art', art: 'Co' };
    const aura = covenantAura(cov);
    expect(aura).toMatchObject({ realm: 'Magic', strength: 4, aligned: 'Co' });
    const d = magus();
    const plain = castingScore(d, { technique: 'Cr', form: 'Co' }, { kind: 'formulaic', aura: { realm: 'Magic', strength: 4 } }).total;
    expect(castingScore(d, { technique: 'Cr', form: 'Co' }, { kind: 'formulaic', aura }).total).toBe(plain + 4);
    expect(castingScore(d, { technique: 'Cr', form: 'An' }, { kind: 'formulaic', aura }).total).toBe(castingScore(d, { technique: 'Cr', form: 'An' }, { kind: 'formulaic', aura: { realm: 'Magic', strength: 4 } }).total);
    expect(labTotal(d, { technique: 'Cr', form: 'Co' }, { activity: 'spells', aura }).parts.map((p) => p.label)).toContain('Aura aligned with Corpus: counts double');
    // only a Magic aura is aligned
    cov.auraRealm = 'Faerie';
    expect(covenantAura(cov).aligned).toBeUndefined();
  });
  it('adds half a Healing aura to Recovery Totals; an Infernal aura takes its strength off, and no disease improves there', () => {
    expect(auraRecovery({ realm: 'Magic', strength: 5, aspect: 'healing' }).parts[0].value).toBe(3);
    expect(auraRecovery({ realm: 'Magic', strength: 5 }).parts).toEqual([]);
    expect(auraRecovery({ realm: 'Infernal', strength: 3 })).toMatchObject({ parts: [{ value: -3 }], noImprovement: true });
    const c = newCharacter('companion', 's');
    c.characteristics.Sta = 3;
    c.illnesses = [{ uid: 'i', name: 'Ague', stage: 'Minor', stable: 3, improve: 6, interval: 'Week', bonus: 0 } as never];
    const d = deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
    // Stamina 3 + 9 − 2 = 10: enough to improve, but in an Infernal aura it only holds
    const r = recoveryRoll(c, d, 'i', { aura: { realm: 'Infernal', strength: 2 } }, seq(9));
    expect(r.outcome).toBe('same');
    expect(r.text).toMatch(/no disease improves in an Infernal aura/);
    expect(recoveryRoll(c, d, 'i', { aura: { realm: 'Magic', strength: 6, aspect: 'healing' } }, seq(0)).outcome).toBe('cured'); // 3 + 3 + 3 (the bonus from the stable roll before) = 9
  });
  it('is a Site Boon or Hook a covenant can take', () => {
    expect(['Fine Aura', 'Favorable Aura', 'Troublesome Aura'].map((n) => data.hooksBoons.find((h) => h.name === n)?.size)).toEqual(['Major', 'Minor', 'Minor']);
  });
});

describe('a Dominion and its congregation (RoP: The Divine)', () => {
  it('is 3 from the rite, 4 after a year, 5 after a decade only for a significant church, and more for relics', () => {
    expect([1220, 1221, 1235].map((y) => dominionStrength({ since: 1220 }, y))).toEqual([3, 4, 4]);
    expect(dominionStrength({ since: 1220, significant: true }, 1230)).toBe(5);
    expect(dominionStrength({ since: 1220, significant: true, relics: 2 }, 1230)).toBe(7);
  });
  it('fades steadily once worship stops, to nothing over as long as it was worshipped', () => {
    const w = { since: 1200, until: 1220, significant: true };
    expect([1220, 1225, 1230, 1235, 1240, 1250].map((y) => dominionStrength(w, y))).toEqual([5, 4, 3, 2, 0, 0]);
    expect(dominionOutlook(w, 1220)).toMatch(/Worship stopped in 1220 after 20 years: the Dominion fades steadily, to nothing by 1240/);
  });
  it('follows the congregation at the year’s end', () => {
    const s = newSaga('T');
    s.currentYear = 1220;
    s.currentSeason = 'Winter';
    const cov = newCovenant(s.id, 1220);
    cov.name = 'Abbey';
    cov.auraRealm = 'Divine';
    cov.aura = 3;
    cov.auraTrack = { ...newAuraTrack(cov), dominion: { since: 1220 } };
    const { state, report } = advanceSeason({ saga: s, characters: [], covenants: [cov] }, data, DEFAULT_ADVANCE);
    expect(state.covenants[0].aura).toBe(4);
    expect(report.lines.some((l) => /The Dominion grows to 4: a year of regular worship/.test(l.text))).toBe(true);
  });
});
