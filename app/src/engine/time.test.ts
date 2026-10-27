// The saga's clock: seasons pass for everyone, and the year's end closes covenants and ages characters.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newSaga } from '../store/store';
import { newCovenant } from './covenant';
import { ensureAbility, newCharacter } from './character/factory';
import { advanceSeason, advanceSeasons, ageCharacter, auraWarping, loggedThisSeason } from './time';
import { newLab } from './lab';
import { newProject } from './projects';
import { applyEffect, expireEffects } from './effects';
import { applyRitual, castCost, casterTally, legacyCasts, undoCast } from './rituals';
import { takeVis } from './vis';
import { deriveCharacter } from './character/derive';
import { characterContext } from './context';
import { DEFAULT_HOUSE_RULES, type CastRecord } from './types';

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
    // by time spent there: an aura of 10 is a point a month always within, a season half the time
    st.covenants[0].aura = 10;
    const d = deriveCharacter(grog, data, DEFAULT_HOUSE_RULES);
    const at = (t: typeof grog.auraTime, year = 1220) => auraWarping({ ...grog, auraTime: t }, d, characterContext(grog, st.covenants, data), year);
    expect([at(undefined), at('half'), at('visits'), at('away')]).toEqual([12, 4, 2, 0]);
    st.covenants[0].aura = 7;
    expect([at('half', 1220), at('half', 1221), at('visits')]).toEqual([1, 0, 0]); // one every other year
  });
  it('tells the storyguide what a non-magus gains as its Warping Score rises, and attunes it at 5', () => {
    const st = saga();
    st.covenants[0].aura = 10;
    const grog = st.characters[0];
    grog.warpingPoints = 70; // Warping Score 4
    st.characters[1].warpingPoints = 70;
    const { state, report } = advanceSeason(st, data, { fillUnplanned: true, rollAging: false, yearEnd: { permanentIncome: true, inflation: true, harvestVis: true, skipVis: [], clearSundry: true }, rng: faces(5) });
    const g = state.characters[0];
    expect(g.warpingPoints).toBe(82);
    expect(report.lines.filter((l) => l.who === 'Grog' && /Warping Score 5/.test(l.text))).toHaveLength(1);
    expect(report.lines.some((l) => l.who === 'Magus' && /Warping Score/.test(l.text))).toBe(false); // magi have Twilight instead
    expect(g.warpingAttuned).toBe('Magic');
    expect(auraWarping(g, deriveCharacter(g, data, DEFAULT_HOUSE_RULES), characterContext(g, state.covenants, data))).toBe(0);
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
    const { lines } = applyRitual(
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
  it('undoes a cast: takes back what it did to everyone and gives back what it cost', () => {
    const st = saga();
    const cov = st.covenants[0];
    cov.visStocks = [{ art: 'Cr', pawns: 5 }];
    cov.specialists.push({ uid: 't', name: 'Teacher', role: 'teacher', ability: 'Latin', score: 5, com: 2, teaching: 4 });
    const m = st.characters[1];
    const tally = casterTally(m, cov.visStocks);
    takeVis(cov.visStocks, ['Cr'], 3);
    m.fatigueLost = 1;
    const paid = castCost(tally, casterTally(m, cov.visStocks), 'covenant');
    expect(paid.vis).toEqual([{ art: 'Cr', pawns: 3 }]);
    const plan = { name: 'Honing the Mind', level: 60, effect: { kind: 'raise' as const, chars: ['Com' as const], max: 3 }, duration: 'permanent' as const, targets: { characterIds: st.characters.map((c) => c.id), specialistUids: ['t'], covenfolk: true } };
    const { done } = applyRitual(plan, cov, st.characters, m.id, 'Magus, ritual', 1220, 'Spring', data);
    expect(st.characters[0].characteristics.Com).toBe(1);
    const rec: CastRecord = { uid: 'c1', name: plan.name, source: 'Magus, ritual', casterId: m.id, year: 1220, season: 'Spring', lines: [], paid, done };
    undoCast(rec, cov, st.characters, 1220, 'Spring');
    expect(cov.visStocks).toEqual([{ art: 'Cr', pawns: 5 }]);
    expect(m.fatigueLost).toBe(0);
    expect(st.characters[0].characteristics.Com).toBe(0);
    expect(st.characters[0].warpingPoints).toBe(0);
    expect(st.characters[0].activeEffects).toEqual([]);
    expect(cov.specialists[0].chars?.Com).toBe(2);
    expect(cov.specialists[0].history).toEqual([]);
    expect(cov.effects).toEqual([]);
    expect(rec.undone).toEqual({ year: 1220, season: 'Spring' });
  });
  it('pieces together a cast made before casts were recorded, and undoes it without refunds', () => {
    const st = saga();
    const cov = st.covenants[0];
    cov.specialists.push({ uid: 't', name: 'Teacher', role: 'teacher', ability: 'Latin', score: 5, com: 2, teaching: 4 });
    applyRitual(
      { name: 'Honing the Mind', level: 60, effect: { kind: 'raise', chars: ['Com'], max: 3 }, duration: 'permanent', targets: { characterIds: st.characters.map((c) => c.id), specialistUids: ['t'], covenfolk: true } },
      cov, st.characters, st.characters[1].id, 'Magus, ritual', 1220, 'Spring', data,
    );
    const [old] = legacyCasts(cov, st.characters);
    expect(old.done.effects).toHaveLength(2);
    expect(old.done.specialists).toEqual([{ uid: 't', raised: { Com: 1 }, warping: 1 }]);
    expect(old.casterId).toBe(st.characters[1].id);
    undoCast(old, cov, st.characters, 1220, 'Spring');
    expect(cov.specialists[0].chars?.Com).toBe(2);
    expect(cov.specialists[0].warpingPoints).toBe(0);
    expect(st.characters[0].characteristics.Com).toBe(0);
    expect(legacyCasts(cov, st.characters)).toEqual([]);
  });
  it('spares a creature with Might the Warping, and its Qualities stay as built after a raise', () => {
    const st = saga();
    const m = st.characters[1];
    const beast = newCharacter('companion', st.saga.id);
    beast.name = 'Beast';
    beast.creation.finalized = true;
    beast.creature = { realm: 'Magic', kind: 'animal', size: 0, might: 10, intelligence: 'companion', powers: '' };
    st.characters.push(beast);
    const mightOf = (c: typeof m) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES).might?.score ?? 0;
    const plan = { name: 'Strength', level: 35, effect: { kind: 'raise' as const, chars: ['Str' as const], max: 1 }, duration: 'permanent' as const, targets: { characterIds: [beast.id, st.characters[0].id], specialistUids: [], covenfolk: false } };
    const { lines } = applyRitual(plan, st.covenants[0], st.characters, m.id, 'Magus, ritual', 1220, 'Spring', data, undefined, mightOf);
    expect(beast.characteristics.Str).toBe(1);
    expect(beast.warpingPoints).toBe(0);
    expect(lines.find((l) => l.who === 'Beast')?.text).toMatch(/Might makes it immune/);
    expect(st.characters[0].warpingPoints).toBe(1); // the grog has no Might
  });
  it('measures a ritual’s limit against the Characteristic as it stands, Virtues and Qualities included', () => {
    const st = saga();
    const m = st.characters[1];
    m.characteristics.Int = 3;
    m.virtues.push({ uid: 'g1', defId: 'great-characteristic', size: 'Minor', param: 'Int' }, { uid: 'g2', defId: 'great-characteristic', size: 'Minor', param: 'Int' });
    const now = (c: typeof m) => Object.fromEntries(Object.entries(deriveCharacter(c, data, DEFAULT_HOUSE_RULES).characteristics).map(([k, v]) => [k, v.value]));
    expect(now(m).Int).toBe(5);
    const plan = { name: 'Honing the Mind', level: 60, effect: { kind: 'raise' as const, chars: ['Int' as const, 'Per' as const], max: 5 }, duration: 'permanent' as const, targets: { characterIds: [m.id], specialistUids: [], covenfolk: false } };
    const { lines } = applyRitual(plan, st.covenants[0], st.characters, m.id, 'Magus, ritual', 1220, 'Spring', data, now);
    expect(m.characteristics.Int).toBe(3); // already +5: no higher
    expect(m.characteristics.Per).toBe(1);
    expect(lines[0].text).toMatch(/Intelligence is already \+5/);
    // a spell lasting a year adds to the score as it stands, and never takes it down to its limit
    applyEffect(m, { name: 'Mind for a year', duration: 'year', raise: { chars: ['Int', 'Per'], amount: 1, max: 3 } }, 1220, 'Spring', data);
    const d = deriveCharacter(m, data, DEFAULT_HOUSE_RULES);
    expect(d.characteristics.Int.value).toBe(5);
    expect(d.characteristics.Per.value).toBe(2);
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
    expect(lines[2].text).toMatch(/two seasons this year.*Instead: Practiced Latin: \+4 xp/); // the free season it would have had
    expect(state.covenants[0].specialists[0].taught).toEqual({ year: 1220, seasons: 2 });
  });
});

describe('death, crises and the care of a physician (DE, Aging)', () => {
  /** dice that show these faces in turn, then the last one */
  const seq = (...f: number[]) => {
    let i = 0;
    return () => (f[Math.min(i++, f.length - 1)] + 0.5) / 10;
  };
  const grogAt40 = () => {
    const g = newCharacter('grog', 's');
    g.name = 'Hans';
    g.creation.finalized = true;
    g.age = 40;
    return g;
  };
  it('marks a character dead at Decrepitude 5, and the clock leaves them be', () => {
    const st = saga();
    st.characters[0].decrepitudePoints = 75; // Decrepitude 5
    const { state, report } = advanceSeason(st, data, { fillUnplanned: true, rollAging: true, yearEnd: { permanentIncome: true, inflation: true, harvestVis: true, skipVis: [], clearSundry: true }, rng: faces(5) });
    expect(state.characters[0].wounds.dead).toBe(true);
    expect(report.lines.some((l) => l.who === 'Grog' && /Decrepitude 5: bedridden.*Marked dead/.test(l.text))).toBe(true);
    const next = advanceSeasons(state, data, 4, { fillUnplanned: true, rollAging: true, yearEnd: { permanentIncome: true, inflation: true, harvestVis: true, skipVis: [], clearSundry: true }, rng: faces(5) });
    expect(next.state.characters[0].age).toBe(41); // no more years for the dead
    expect(next.reports.flatMap((r) => r.lines).some((l) => l.who === 'Grog')).toBe(false);
  });
  it('marks a character dead who fails a crisis roll, unless a physician’s care carries them through', () => {
    // aging: a 1 then a 9 (18, + 5 for age 41 = a crisis); crisis 9 + 5 + Decrepitude 1 = 15, a minor illness (3); survival roll 0
    const alone = grogAt40();
    const lines = ageCharacter(alone, deriveCharacter(alone, data, DEFAULT_HOUSE_RULES), { aura: { realm: 'Magic', strength: 3 } }, 1220, seq(1, 9, 9, 0), true);
    expect(alone.wounds.dead).toBe(true);
    expect(lines.map((l) => l.text).join(' ')).toMatch(/Minor illness.*Stamina roll 0 against 3.*Marked dead/);
    // a physician with Int 2 and Medicine 4 rolls 5 + 6 = 11 against 6: +4 to survive
    const tended = grogAt40();
    const out = ageCharacter(tended, deriveCharacter(tended, data, DEFAULT_HOUSE_RULES), { aura: { realm: 'Magic', strength: 3 } }, 1220, seq(1, 9, 9, 5, 0), true, { name: 'Brother Anselm', int: 2, medicine: 4 });
    expect(tended.wounds.dead).toBeFalsy();
    expect(out.map((l) => l.text).join(' ')).toMatch(/Brother Anselm tends them \(Int \+ Medicine 11\): \+4\. Survived \(Stamina roll 4 against 3\)/);
  });
  it('finds the covenant’s physician among its specialists for the year’s crises', () => {
    const st = saga();
    st.covenants[0].specialists.push({ uid: 'doc', name: 'Brother Anselm', role: 'specialist', abilities: [{ id: 'medicine', score: 5 }], chars: { Int: 1 } } as never);
    st.characters[0].age = 80;
    st.characters[0].decrepitudePoints = 30; // Decrepitude 3: a crisis is likely
    // aging 1 then 9 (a crisis at 81); Decrepitude up to 4; crisis 2 + 9 + 4 = 15, a minor illness; care 5 + 1 + 5 = 11; survival 9
    const { report } = advanceSeason(st, data, { fillUnplanned: true, rollAging: true, yearEnd: { permanentIncome: true, inflation: true, harvestVis: true, skipVis: [], clearSundry: true }, rng: seq(1, 9, 2, 5, 9) });
    expect(report.lines.find((l) => l.who === 'Grog' && /^Crisis/.test(l.text))?.text).toMatch(/Minor illness.*Brother Anselm tends them \(Int \+ Medicine 11\): \+5\. Survived/);
  });
  it('lets a magus left to the clock work a project the lab allows, past one it rules out', () => {
    const st = saga();
    st.saga.currentSeason = 'Spring';
    const magus = st.characters[1];
    const lab = newLab('Cramped', magus.id);
    lab.virtues = [{ uid: 'mx', defId: 'missing-equipment-flaw', alt: 'Longevity Rituals+Vis Extraction' }];
    st.covenants[0].labs.push(lab);
    const extract = newProject('extract');
    const invent = { ...newProject('invent'), technique: 'Cr' as const, form: 'An' as const, level: 1 };
    magus.projects = [extract, invent];
    const { state, report } = advanceSeason(st, data);
    const m = state.characters[1];
    expect(m.projects![1].done).toBe(true);
    expect(m.projects![0].seasons).toBe(0);
    expect(report.lines.some((l) => l.who === 'Magus' && /invented/.test(l.text))).toBe(true);
  });
});
