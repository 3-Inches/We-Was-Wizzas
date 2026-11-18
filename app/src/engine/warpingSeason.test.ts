// Warping a season's work brings (a double botch studying raw vis, a lab accident): the points come once,
// what follows is owed on the Resolve list, and Unlog takes back both (audit 3, A1 and B1).
// DE, Studying from Vis, line 16215: "If the stress die double botches, the maga may enter Wizard's
// Twilight. The number of botch dice equals the number of pawns of vis used in study."
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newSaga } from '../store/store';
import { addVirtue, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { newCovenant } from './covenant';
import { applySeason, newSeasonEntry } from './longterm';
import { advanceSeason, loggedThisSeason } from './time';
import { DEFAULT_HOUSE_RULES, type Character } from './types';
import { labUndo, owedUndo, unlogSeason } from './unlog';
import { gainWarping, seasonWarping } from './warping';
import { warpingScoreFromPoints } from './xp';

const data = buildGameData();
const derive = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
// every face 0: a stress die of 0, and every botch die a 0
const zeros = () => 0.05;
const fives = () => 0.55;

/** A magus who studies Creo from vis in their purse, set as their season's work. `art` is the Creo score. */
function sagaWith(art: number, o: { living?: boolean; prone?: boolean } = {}) {
  const s = newSaga('Test');
  s.currentYear = 1220;
  s.currentSeason = 'Spring';
  const cov = newCovenant(s.id, 1220);
  if (o.living) cov.living = { book: 'gotf', key: 'test', tribunal: 'rhine', addedYear: 1220 } as NonNullable<typeof cov.living>;
  const m = newCharacter('magus', s.id);
  m.name = 'Magus';
  m.creation.finalized = true;
  m.age = 30;
  if (o.prone) addVirtue(m, data, 'twilight-prone-flaw', 'Major');
  m.arts.Cr = { play: (art * (art + 1)) / 2 };
  m.purse = { pounds: 0, vis: [{ art: 'Cr', pawns: 4 }] };
  m.standing = { kind: 'vis', target: 'art:Cr' };
  m.covenantId = cov.id;
  cov.memberIds.push(m.id);
  return { saga: s, characters: [m], covenants: [cov] };
}

const owedTwilight = (c: Character) => (c.owed ?? []).filter((o) => o.kind === 'twilight');

describe('a double botch studying vis, at a planned season’s end', () => {
  it('owes Wizard’s Twilight in Resolve, and adds the points once', () => {
    const st = sagaWith(6); // Creo 6: two pawns, so two botch dice
    const before = st.characters[0].warpingPoints;
    const { state, report } = advanceSeason(st, data, { fillUnplanned: true, rollAging: false, yearEnd: { permanentIncome: true, inflation: true, harvestVis: true, skipVis: [], clearSundry: true }, rng: zeros });
    const m = state.characters[0];
    const [e] = loggedThisSeason(m, 1220, 'Spring');
    expect(e.activity).toBe('study-vis');
    expect(e.warpingPoints).toBe(2);
    expect(m.warpingPoints).toBe(before + 2);
    expect(owedTwilight(m)).toHaveLength(1);
    expect(owedTwilight(m)[0]).toMatchObject({ year: 1220, season: 'Spring', points: 2 });
    expect(e.undo?.owed).toEqual([owedTwilight(m)[0].uid]);
    expect(report.lines.find((l) => l.who === 'Magus' && /BOTCH/.test(l.text))?.text).toMatch(/Wizard’s Twilight follows/);
  });

  it('is taken back whole by Unlog: the points and the Twilight owed', () => {
    const st = sagaWith(6);
    const before = st.characters[0].warpingPoints;
    const { state } = advanceSeason(st, data, { fillUnplanned: true, rollAging: false, yearEnd: { permanentIncome: true, inflation: true, harvestVis: true, skipVis: [], clearSundry: true }, rng: zeros });
    const m = state.characters[0];
    const [e] = loggedThisSeason(m, 1220, 'Spring');
    expect(unlogSeason(m, e.uid, state.covenants).ok).toBe(true);
    expect(m.warpingPoints).toBe(before);
    expect(owedTwilight(m)).toHaveLength(0);
    expect(m.purse?.vis).toEqual([{ art: 'Cr', pawns: 4 }]);
  });

  it('a single botch is one point and owes nothing, unless the magus is Twilight Prone (DE line 6965)', () => {
    const one = advanceSeason(sagaWith(3), data, { fillUnplanned: true, rollAging: false, yearEnd: { permanentIncome: true, inflation: true, harvestVis: true, skipVis: [], clearSundry: true }, rng: zeros }).state.characters[0];
    expect(loggedThisSeason(one, 1220, 'Spring')[0].warpingPoints).toBe(1);
    expect(one.owed ?? []).toHaveLength(0);
    const prone = advanceSeason(sagaWith(3, { prone: true }), data, { fillUnplanned: true, rollAging: false, yearEnd: { permanentIncome: true, inflation: true, harvestVis: true, skipVis: [], clearSundry: true }, rng: zeros }).state.characters[0];
    expect(owedTwilight(prone)).toHaveLength(1);
  });

  it('a season that does not botch owes nothing and adds no Warping', () => {
    const st = sagaWith(6);
    const before = st.characters[0].warpingPoints;
    const m = advanceSeason(st, data, { fillUnplanned: true, rollAging: false, yearEnd: { permanentIncome: true, inflation: true, harvestVis: true, skipVis: [], clearSundry: true }, rng: fives }).state.characters[0];
    const [e] = loggedThisSeason(m, 1220, 'Spring');
    expect(e.gains['art:Cr']).toBeGreaterThan(0);
    expect(m.warpingPoints).toBe(before);
    expect(m.owed ?? []).toHaveLength(0);
    expect(e.undo?.owed).toBeUndefined();
  });

  it('a living covenant’s magus gains the points, and nothing is owed (no player resolves it)', () => {
    const st = sagaWith(6, { living: true });
    const before = st.characters[0].warpingPoints;
    const m = advanceSeason(st, data, { fillUnplanned: true, rollAging: false, yearEnd: { permanentIncome: true, inflation: true, harvestVis: true, skipVis: [], clearSundry: true }, rng: zeros }).state.characters[0];
    expect(m.warpingPoints).toBe(before + 2);
    expect(m.owed ?? []).toHaveLength(0);
  });
});

describe('a double botch studying vis, in a season logged by hand', () => {
  // as the sheet's Advancement tab logs it: the botch's points on the entry, applied, then what follows owed
  const logByHand = (c: Character, botches: number) => {
    const e = newSeasonEntry(1220, 'Summer', 'study-vis', 'Studied Creo vis: botch', {});
    e.visUsed = [{ art: 'Cr', pawns: 2 }];
    if (botches) e.warpingPoints = botches;
    applySeason(c, e, 1);
    const follows = seasonWarping(c, derive(c), e, 'from studying vis');
    c.seasonLog.push(e);
    return { e, follows };
  };

  it('owes Twilight, adds the points once, and Unlog takes back both', () => {
    const c = newCharacter('magus', 's');
    c.warpingPoints = 3;
    const { e, follows } = logByHand(c, 2);
    expect(c.warpingPoints).toBe(5);
    expect(follows).toMatch(/Wizard’s Twilight follows/);
    expect(owedTwilight(c)).toHaveLength(1);
    // Twilight's roll counts the points gained (DE, Entering Twilight)
    expect(owedTwilight(c)[0].points).toBe(2);
    unlogSeason(c, e.uid);
    expect(c.warpingPoints).toBe(3);
    expect(c.owed).toBeUndefined();
  });

  it('a season logged with no botch owes nothing', () => {
    const c = newCharacter('magus', 's');
    const { follows } = logByHand(c, 0);
    expect(follows).toBeUndefined();
    expect(c.warpingPoints).toBe(newCharacter('magus', 's').warpingPoints);
    expect(c.owed).toBeUndefined();
  });

  it('Unlog leaves a reaction owed by something else alone', () => {
    const c = newCharacter('magus', 's');
    gainWarping(c, derive(c), { points: 2, why: 'from a botched casting', botch: true, year: 1220, season: 'Spring' });
    const { e } = logByHand(c, 2);
    expect(owedTwilight(c)).toHaveLength(2);
    unlogSeason(c, e.uid);
    expect(owedTwilight(c).map((o) => o.text)).toEqual([expect.stringMatching(/botched casting/)]);
  });
});

describe('points already counted', () => {
  it('owe a folk witch’s Witch Moon on a new Warping Score without adding the points again', () => {
    const c = newCharacter('companion', 'w');
    addVirtue(c, data, 'folk-witch', 'Free');
    addVirtue(c, data, 'the-gift', 'Free');
    c.warpingPoints = 6; // the points are on the sheet already: Score 0 → 1 at 5
    expect(warpingScoreFromPoints(6)).toBe(1);
    gainWarping(c, derive(c), { points: 2, why: 'from the season', year: 1220, season: 'Spring', counted: true });
    expect(c.warpingPoints).toBe(6);
    expect(c.owed?.map((o) => o.kind)).toEqual(['witch-moon']);
  });
});

describe('a lab season that brings Twilight', () => {
  it('keeps the reaction on its undo, so Unlog takes it back with the points', () => {
    const before = newCharacter('magus', 's');
    const after = structuredClone(before);
    gainWarping(after, derive(after), { points: 2, why: 'from the lab', year: 1220, season: 'Spring' });
    expect(owedUndo(before, after).owed).toEqual([after.owed![0].uid]);
    expect(owedUndo(after, after)).toEqual({});
    const e = newSeasonEntry(1220, 'Spring', 'other', 'Lab: a project', {});
    e.undo = labUndo(before, after, 'none');
    expect(e.undo.warping).toBe(2);
    applySeason(after, e, 1);
    after.seasonLog.push(e);
    unlogSeason(after, e.uid);
    expect(after.warpingPoints).toBe(before.warpingPoints);
    expect(after.owed).toBeUndefined();
  });
});
