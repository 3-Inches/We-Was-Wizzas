// The Rhine book's lore on the Tribunal page: the Courts of the Seasons month by month, and the
// players' bid for a new covenant with a sponsor from every other covenant.
import { describe, expect, it } from 'vitest';
import { RHINE } from '../data/livingCovenants/rhine';
import { SEASON_COURTS, courtInMonth } from '../data/livingCovenants/rhineForest';
import { RHINE_PLACES, RHINE_SEEDS, RHINE_TIMELINE } from '../data/livingCovenants/rhineLore';
import { newSaga } from '../store/store';
import { newCharacter } from './character/factory';
import { newCovenant } from './covenant';
import { enmityGilds, foundingAtGathering, foundingCovenants, foundingProgress, sponsorCandidates, sponsorOutlook } from './founding';
import type { Covenant } from './types';

const court = (id: string) => SEASON_COURTS.find((c) => c.id === id)!;

describe('the Courts of the Seasons', () => {
  it('follows the book’s month-by-month Might Pools', () => {
    // GotF, The Courts of the Seasons: the pools at each solstice and equinox and between
    const book: Record<number, Record<string, number>> = {
      12: { holly: 35, oak: 15, alder: 25, willow: 25 },
      1: { willow: 20, alder: 30 },
      3: { alder: 35, holly: 25, oak: 25 },
      4: { oak: 30, holly: 20 },
      6: { oak: 35, holly: 15, willow: 25, alder: 25 },
      7: { willow: 30, alder: 20 },
      9: { willow: 35, alder: 15, holly: 25, oak: 25 },
      10: { oak: 20, holly: 30 },
    };
    for (const [m, pools] of Object.entries(book)) for (const [id, pool] of Object.entries(pools)) expect(courtInMonth(court(id), +m).pool, `${id} in month ${m}`).toBe(pool);
  });
  it('keeps each pair of rivals at fifty, and the aura at 3 only at a court’s height', () => {
    for (let m = 1; m <= 12; m++) {
      expect(courtInMonth(court('holly'), m).pool + courtInMonth(court('oak'), m).pool).toBe(50);
      expect(courtInMonth(court('alder'), m).pool + courtInMonth(court('willow'), m).pool).toBe(50);
      for (const c of SEASON_COURTS) expect(courtInMonth(c, m).aura === 3).toBe(m === c.peak);
    }
    expect(courtInMonth(court('holly'), 6).aura).toBe(0);
    expect(courtInMonth(court('holly'), 3).aura).toBe(1);
  });
});

describe('the book’s places, seeds and timeline', () => {
  it('has them all, each with its line in the book', () => {
    expect(RHINE_PLACES.length).toBeGreaterThan(100);
    expect(RHINE_SEEDS.length).toBeGreaterThan(30);
    for (const x of [...RHINE_PLACES, ...RHINE_SEEDS, ...RHINE_TIMELINE]) expect(x.line).toBeGreaterThan(0);
    expect(RHINE_TIMELINE.some((e) => e.future && e.year >= 1220)).toBe(true);
  });
});

describe('founding a covenant in the Rhine', () => {
  const saga = () => {
    const s = newSaga('Founding');
    s.tribunal = 'Rhine';
    s.currentYear = 1220;
    return s;
  };
  it('needs a sponsor from every covenant, Heorot only once admitted', () => {
    const s = saga();
    expect(foundingCovenants(RHINE, s).map((d) => d.id)).not.toContain('heorot');
    expect(foundingCovenants(RHINE, s)).toHaveLength(RHINE.covenants.length - 1);
    s.tribunalVotes = [{ uid: 'v', motionId: 'heorot', year: 1221, title: '', for: 30, against: 10, abstain: 0, passed: true, byCovenant: {} }];
    expect(foundingCovenants(RHINE, s).map((d) => d.id)).toContain('heorot');
  });
  it('reads the outlook from the covenant’s attitude, and bars founders and an angered gild', () => {
    const living = (attitude?: NonNullable<Covenant['living']>['attitude']) => ({ ...newCovenant('s', 1220), living: { book: 'GotF', key: 'durenmar', tribunal: 'Rhine', addedYear: 1220, attitude } });
    expect(sponsorOutlook(living('friendly'))).toBe('easy');
    expect(sponsorOutlook(living())).toBe('modest');
    expect(sponsorOutlook(living('wary'))).toBe('steep');
    expect(sponsorOutlook(living('enemy'))).toBe('unlikely');
    const founder = newCharacter('magus', 's');
    founder.virtues.push({ uid: 'e', defId: 'gild-enmity', size: 'Minor', param: 'Ash Gild' });
    expect(enmityGilds([founder])).toEqual(['ash']);
    const ash = newCharacter('magus', 's');
    ash.rhine = { rank: 'master', gild: 'ash' };
    const oak = newCharacter('magus', 's');
    oak.rhine = { rank: 'master', gild: 'oak' };
    const apprentice = newCharacter('magus', 's');
    apprentice.rhine = { rank: 'apprentice' };
    const cov = { ...living('neutral'), memberIds: [ash.id, oak.id, apprentice.id, founder.id] };
    expect(sponsorCandidates(cov, [ash, oak, apprentice, founder], [founder]).map((c) => c.id)).toEqual([oak.id]);
  });
  it('recognizes the covenant at a gathering once every covenant has promised, and refuses it before', () => {
    const s = saga();
    const ours = { ...newCovenant(s.id, 1220), name: 'Rheinstein' };
    s.founding = { covenantId: ours.id, sponsors: {} };
    expect(foundingAtGathering(RHINE, s, [ours], 1221)).toBeUndefined();
    s.founding.sponsors.durenmar = { status: 'promised', name: 'Murion' };
    s.founding.sponsors.crintera = { status: 'refused' };
    expect(foundingAtGathering(RHINE, s, [ours], 1221)).toMatch(/refuses to recognize Rheinstein: no sponsor from Crintera/);
    expect(s.founding.recognizedYear).toBeUndefined();
    for (const d of foundingCovenants(RHINE, s)) s.founding.sponsors[d.id] = { status: 'promised' };
    expect(foundingProgress(RHINE, s).ready).toBe(true);
    expect(foundingAtGathering(RHINE, s, [ours], 1228)).toMatch(/Rheinstein is recognized/);
    expect(s.founding.recognizedYear).toBe(1228);
    expect(foundingAtGathering(RHINE, s, [ours], 1235)).toBeUndefined();
  });
});
