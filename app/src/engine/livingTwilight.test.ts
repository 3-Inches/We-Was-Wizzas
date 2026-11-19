// A living covenant's magus rolls Wizard's Twilight as the players' magi do (owner.md, point 5; roadmap
// Batch A, 5.9). DE, Wizard's Twilight: Entering Twilight (line 9755), Comprehending Twilight, its time
// and its effects, and the Twilight Example (Darius of Flambeau).
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newSaga } from '../store/store';
import { ensureAbility, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { newCovenant } from './covenant';
import { twilightAvoidance } from './longterm';
import { livingTwilight } from './livingTwilight';
import { DEFAULT_ADVANCE, advanceSeason, seasonBusy } from './time';
import { DEFAULT_HOUSE_RULES, type Character } from './types';
import { gainWarping } from './warping';

const data = buildGameData();
const derive = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
/** Dice that land on these faces, in turn (0 to 9). */
const faces = (...f: number[]) => {
  let i = 0;
  return () => (f[i++ % f.length] + 0.5) / 10;
};
/** Warping Points for a Warping Score: 5 × (1 + 2 + … + score), as for an Ability. */
const pointsFor = (score: number) => (5 * score * (score + 1)) / 2;

/** A magus with Sta 0, no Concentration, Vim 0 and Int 0, who owes a Twilight from `gained` points. */
function owing(gained: number, warpingScore: number): Character {
  const c = newCharacter('magus', 's1');
  c.name = 'Ulla';
  c.creation.finalized = true;
  c.characteristics = { Int: 0, Per: 0, Str: 0, Sta: 0, Pre: 0, Com: 0, Dex: 0, Qik: 0 };
  c.arts.Cr = { apprenticeship: 15 }; // Creo 5, the Art the magus knows best
  c.warpingPoints = pointsFor(warpingScore);
  c.owed = [{ uid: 'tw1', year: 1220, season: 'Spring', kind: 'twilight', text: '', points: gained }];
  return c;
}

describe('the Twilight Example (DE): Darius cannot avoid it', () => {
  it('Sta 0 + Concentration 3 + Vim bonus 2 + 6 is 11, against 6 + 2 + aura 4 + a die', () => {
    const c = newCharacter('magus', 's1');
    c.characteristics = { Int: 3, Per: 0, Str: 0, Sta: 0, Pre: 0, Com: 0, Dex: 0, Qik: 0 };
    ensureAbility(c, 'concentration', { apprenticeship: 30 }); // Concentration 3
    c.arts.Vi = { apprenticeship: 36 }; // Vim 8: a Form bonus of 2 (Vim ÷ 5, rounded up)
    c.warpingPoints = pointsFor(6) + 2; // the 2 points gained are added first
    // his die is a 6; the storyguide's is a 0, the least it can be
    const r = twilightAvoidance(derive(c), 2, 4, faces(6, 0), true);
    expect(r.my).toBe(11);
    expect(r.tw).toBe(12);
    expect(r.success).toBe(false);
  });
});

describe('a living magus’s Twilight, rolled when the season ends', () => {
  it('avoided: the Twilight owed is settled, and nothing else changes', () => {
    const c = owing(2, 0);
    const before = c.warpingPoints;
    // the magus rolls 9; the Twilight 0: 9 against 0 + 2 + 0
    const r = livingTwilight(c, derive, 0, 'cov', 1220, 'Spring', faces(9, 0));
    expect(c.owed).toEqual([]);
    expect(c.warpingPoints).toBe(before);
    expect(r.lines[0]).toMatch(/avoided Wizard’s Twilight \(9 vs 2\)/);
    expect(r.news).toEqual([]);
  });

  it('entered and comprehended: a simple die more of points, twice the points in experience, a good scar, and the news', () => {
    const c = owing(2, 0);
    const before = c.warpingPoints;
    // avoid: 2 against 2 + 9, failed; comprehend: 9 against 0 + 2, made by 7, a moment; the simple die 3
    const r = livingTwilight(c, derive, 0, 'cov', 1220, 'Spring', faces(2, 9, 9, 2, 3));
    expect(c.warpingPoints).toBe(before + 3);
    expect(c.arts.Cr?.play).toBe(2 * (2 + 3));
    expect(c.twilightScars.at(-1)).toMatch(/beneficial Twilight Scar/);
    expect(c.seasonLog).toEqual([]);
    expect(r.lines[0]).toMatch(/comprehended it, and gained 10 experience in Creo/);
    expect(r.news[0]).toMatchObject({ kind: 'event', covenantId: 'cov', characterId: c.id });
    expect(r.news[0].text).toMatch(/lost to the world for a moment, and came back wiser/);
  });

  it('not comprehended at Warping Score 6: a season lost, knowledge lost, an annoying scar (the Example’s outcome)', () => {
    const c = owing(2, 6);
    // avoid fails; comprehend: 2 against 6 + 9, failed, so the base time, a Season; the simple die 1
    const r = livingTwilight(c, derive, 0, 'cov', 1220, 'Spring', faces(2, 9, 2, 9, 1));
    // two experience lost for each of the three points (as Darius loses six in Corpus)
    expect(c.arts.Cr).toEqual({ apprenticeship: 9 });
    expect(c.twilightScars.at(-1)).toMatch(/annoying Twilight Scar/);
    expect(r.news[0].text).toMatch(/lost to the world for a season, marked by it/);
    // the next season is spent in Twilight: the clock runs no work in it
    expect(seasonBusy(c, 1220, 'Summer')).toBe(true);
    expect(seasonBusy(c, 1220, 'Autumn')).toBe(false);
  });

  it('a botched roll to avoid it cannot be comprehended (DE)', () => {
    const c = owing(2, 0);
    // avoid: a 0 and a botch die of 0; comprehend: 9 against 2 would succeed, but cannot
    const r = livingTwilight(c, derive, 0, 'cov', 1220, 'Spring', faces(0, 0, 9, 2, 3));
    expect(r.lines[0]).toMatch(/botched the roll to avoid it, did not comprehend it/);
    expect(c.twilightScars.at(-1)).toMatch(/annoying/);
  });

  it('Warping Score 10: Final Twilight takes the magus from play', () => {
    const c = owing(2, 10);
    const r = livingTwilight(c, derive, 0, 'cov', 1220, 'Spring', faces(2, 9, 2, 9, 1));
    expect(c.wounds.dead).toBe(true);
    expect(r.news[0]).toMatchObject({ kind: 'death' });
    expect(r.news[0].text).toMatch(/Final Twilight/);
  });

  it('only Twilight follows for a living covenant’s people: nothing else waits on a Resolve list nobody reads', () => {
    const m = owing(0, 0);
    m.owed = [];
    expect(gainWarping(m, derive(m), { points: 2, why: 'from the lab', year: 1220, season: 'Spring', living: true })).toMatch(/the toolkit rolls it as the season ends/);
    expect(m.owed).toHaveLength(1);
    const w = newCharacter('companion', 's1');
    w.creation.finalized = true;
    w.folkWitch = { witchMoon: undefined } as NonNullable<Character['folkWitch']>;
    gainWarping(w, derive(w), { points: 6, why: 'from the aura', year: 1220, season: 'Winter', living: true });
    expect(w.warpingPoints).toBe(6);
    expect(w.owed ?? []).toEqual([]);
  });
});

describe('the clock rolls it for a living covenant’s magus, and not for the players’', () => {
  function sagaOwing(living: boolean) {
    const s = newSaga('Test');
    s.currentYear = 1220;
    s.currentSeason = 'Spring';
    const cov = newCovenant(s.id, 1220);
    if (living) cov.living = { book: 'gotf', key: 'test', tribunal: 'rhine', addedYear: 1220 } as NonNullable<typeof cov.living>;
    const m = owing(2, 0);
    m.covenantId = cov.id;
    m.standing = { kind: 'none' };
    cov.memberIds.push(m.id);
    return { saga: s, characters: [m], covenants: [cov] };
  }
  const opts = { ...DEFAULT_ADVANCE, rollAging: false, rng: faces(9, 0) };

  it('a living magus’s Twilight is settled as the season ends, and told in the Tribunal’s report', () => {
    const { state, report } = advanceSeason(sagaOwing(true), data, opts);
    expect(state.characters[0].owed ?? []).toEqual([]);
    expect(report.lines.some((l) => /avoided Wizard’s Twilight/.test(l.text) && l.tribunal === state.covenants[0].id)).toBe(true);
  });

  it('a player’s magus keeps it waiting in Resolve', () => {
    const { state } = advanceSeason(sagaOwing(false), data, opts);
    expect(state.characters[0].owed).toHaveLength(1);
  });
});
