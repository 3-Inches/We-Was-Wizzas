// A covenant's aura and how it changes: its Boons and Hooks (Covenants), changes recorded with
// their reasons, and the yearly drift of a Magic aura (Realms of Power: Magic, Aura Variation).
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newSaga } from '../store/store';
import { newCovenant } from './covenant';
import { newCharacter } from './character/factory';
import { auraAtTime, auraOf, changeAura, newAuraTrack, rollAuraYear, yearlyAuraModifier } from './aura';
import { covenantAura } from './context';
import { advanceSeason, DEFAULT_ADVANCE } from './time';
import type { Covenant } from './types';

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
