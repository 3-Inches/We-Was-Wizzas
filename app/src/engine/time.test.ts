// The saga's clock: seasons pass for everyone, and the year's end closes covenants and ages characters.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newSaga } from '../store/store';
import { newCovenant } from './covenant';
import { ensureAbility, newCharacter } from './character/factory';
import { advanceSeason, advanceSeasons, auraWarping, loggedThisSeason } from './time';
import { applyEffect, expireEffects } from './effects';
import { applyRitual } from './rituals';
import { deriveCharacter } from './character/derive';
import { characterContext } from './context';
import { DEFAULT_HOUSE_RULES } from './types';

const data = buildGameData();
const faces = (...f: number[]) => {
  let i = 0;
  return () => (f[i++ % f.length] + 0.5) / 10;
};

function saga() {
  const s = newSaga('Test');
  s.currentYear = 1220;
  s.currentSeason = 'Winter';
  const cov = newCovenant(s.id, 1220);
  cov.name = 'Domus';
  cov.income.push({ uid: 'farm', name: 'Farms', type: 'Agriculture', level: 'Typical', pounds: 100 });
  cov.visSources.push({ uid: 'v1', name: 'Spring', art: 'Aq', pawnsPerYear: 4 });
  const grog = newCharacter('grog', s.id);
  grog.name = 'Grog';
  grog.creation.finalized = true;
  grog.age = 40;
  ensureAbility(grog, 'craft-type', { laterLife: 50 }).param = 'Blacksmith';
  const magus = newCharacter('magus', s.id);
  magus.name = 'Magus';
  magus.creation.finalized = true;
  magus.age = 30;
  cov.memberIds.push(grog.id, magus.id);
  grog.covenantId = magus.covenantId = cov.id;
  return { saga: s, characters: [grog, magus], covenants: [cov] };
}

describe('the saga clock', () => {
  it('fills unplanned seasons with standing activities and keeps what was logged', () => {
    const st = saga();
    st.saga.currentSeason = 'Spring';
    const { state, report } = advanceSeason(st, data);
    expect(state.saga.currentSeason).toBe('Summer');
    expect(loggedThisSeason(state.characters[0], 1220, 'Spring')).toHaveLength(1);
    expect(report.lines.some((l) => l.who === 'Grog' && /Exposure/.test(l.text))).toBe(true);
    expect(st.saga.currentSeason).toBe('Spring'); // the input is untouched
  });
  it('ends the year: the covenant closes its books, everyone is a year older, aging is rolled from 35', () => {
    const st = saga();
    const { state, report } = advanceSeason(st, data, { fillUnplanned: true, rollAging: true, yearEnd: { permanentIncome: true, inflation: true, harvestVis: true, skipVis: [], clearSundry: true }, rng: faces(5) });
    expect(state.saga.currentYear).toBe(1221);
    expect(state.saga.currentSeason).toBe('Spring');
    expect(state.covenants[0].visStocks.find((v) => v.art === 'Aq')?.pawns).toBe(4);
    expect(state.characters[0].age).toBe(41);
    expect(state.characters[0].lastAgedYear).toBe(1220);
    expect(state.characters[1].lastAgedYear).toBeUndefined(); // 31: too young
    expect(report.lines.some((l) => l.kind === 'aging' && l.who === 'Grog')).toBe(true);
  });
  it('passes years at once', () => {
    const st = saga();
    st.saga.currentSeason = 'Spring';
    const { state, reports } = advanceSeasons(st, data, 8);
    expect(reports).toHaveLength(8);
    expect(state.saga.currentYear).toBe(1222);
    expect(state.characters[0].age).toBe(42);
  });
  it("pays a flat allowance into the magi's purses", () => {
    const st = saga();
    st.covenants[0].finances.treasury = 100;
    st.covenants[0].allowance = { mode: 'flat', amount: 10, to: 'magi', visShare: 50 };
    const { state } = advanceSeason(st, data);
    expect(state.characters[1].purse?.pounds).toBe(10);
    expect(state.characters[1].purse?.vis).toEqual([{ art: 'Aq', pawns: 2 }]);
    expect(state.characters[0].purse).toBeUndefined();
  });
  it('gives non-magi Warping for living in a strong Magic aura, and spares magi', () => {
    const st = saga();
    st.covenants[0].aura = 8;
    const [grog, magus] = st.characters;
    const ctx = characterContext(grog, st.covenants, data);
    expect(auraWarping(grog, deriveCharacter(grog, data, DEFAULT_HOUSE_RULES), ctx)).toBe(2);
    expect(auraWarping(magus, deriveCharacter(magus, data, DEFAULT_HOUSE_RULES), characterContext(magus, st.covenants, data))).toBe(0);
  });
});

describe('effects on characters', () => {
  it('raises a Characteristic for good, no higher than the cap, with a Warping Point', () => {
    const c = newCharacter('grog', 's');
    c.characteristics.Dex = 2;
    const r = applyEffect(c, { name: 'Ritual', duration: 'permanent', raise: { chars: ['Dex', 'Str'], amount: 1, max: 2 }, warping: 1 }, 1220, 'Spring', data);
    expect(c.characteristics.Dex).toBe(2);
    expect(c.characteristics.Str).toBe(1);
    expect(c.magicGain?.Str).toBe(1);
    expect(c.warpingPoints).toBe(1);
    expect(r.lines.join(' ')).toMatch(/already/);
  });
  it('gives a Virtue that goes when a temporary effect ends', () => {
    const c = newCharacter('companion', 's');
    applyEffect(c, { name: 'Gift of Luck', duration: 'year', virtue: { defId: 'luck', size: 'Minor' } }, 1220, 'Spring', data);
    expect(c.virtues.some((v) => v.defId === 'luck' && v.free)).toBe(true);
    expect(expireEffects(c, 1220, 'Winter')).toEqual([]);
    expireEffects(c, 1221, 'Spring');
    expect(c.virtues.some((v) => v.defId === 'luck')).toBe(false);
  });
  it('casts on the whole covenant: characters, specialists and the covenfolk', () => {
    const st = saga();
    const cov = st.covenants[0];
    cov.specialists.push({ uid: 't', name: 'Teacher', role: 'teacher', ability: 'Latin', score: 5, com: 2, teaching: 4 });
    const lines = applyRitual(
      { name: 'Honing the Mind', level: 60, effect: { kind: 'raise', chars: ['Com'], max: 3 }, duration: 'permanent', targets: { characterIds: st.characters.map((c) => c.id), specialistUids: ['t'], covenfolk: true } },
      cov, st.characters, st.characters[1].id, 'Magus, ritual', 1220, 'Spring', data,
    );
    expect(cov.specialists[0].chars?.Com).toBe(3);
    expect(cov.specialists[0].magicGain?.Com).toBe(1);
    expect(st.characters[0].characteristics.Com).toBe(1);
    expect(st.characters[0].warpingPoints).toBe(1);
    expect(st.characters[1].warpingPoints).toBe(0); // the caster
    expect(lines.some((l) => /covenfolk/.test(l.text))).toBe(true);
  });
});

describe('covenant teachers', () => {
  it('teach a standing student two seasons a year, from their own score in the subject', () => {
    const st = saga();
    st.saga.currentSeason = 'Spring';
    const cov = st.covenants[0];
    const grog = st.characters[0];
    const latin = ensureAbility(grog, 'dead-language', {});
    latin.param = 'Latin';
    cov.specialists.push({ uid: 't', name: 'Brother Anselm', role: 'teacher', ability: 'Latin', score: 5, teaching: 4, chars: { Com: 2 }, abilities: [{ id: 'dead-language', param: 'Latin', score: 5 }], goodTeacher: true });
    grog.standing = { kind: 'taught', target: `ability:${latin.uid}`, teacher: 'spec:t' };
    const { state, reports } = advanceSeasons(st, data, 3);
    const lines = reports.flatMap((r) => r.lines).filter((l) => l.who === 'Grog');
    expect(lines[0].text).toMatch(/Quality 20/); // Com 2 + Teaching 4 + 3 + 6 one student + 5 Good Teacher
    expect(lines[2].text).toMatch(/two seasons this year/);
    expect(state.covenants[0].specialists[0].taught).toEqual({ year: 1220, seasons: 2 });
  });
});
