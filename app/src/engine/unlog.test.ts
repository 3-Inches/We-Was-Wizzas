// Unlogging a season takes back all it changed: Labor Points and the workshop's count, the vis it
// spent, a lab project's progress; and a season that finished something stays logged.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { ensureAbility, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { newSeasonEntry, applySeason } from './longterm';
import { newProject } from './projects';
import { DEFAULT_HOUSE_RULES } from './types';
import { canUnlogLinked, labUndo, unlogLinked, unlogSeason } from './unlog';
import { purseOf } from './vis';
import { workshopSeason } from './workshop';
import { newCovenant } from './covenant';
import { buildSeason } from './greatProjects';

const data = buildGameData();

describe('unlogging a season', () => {
  it('takes back a season at the bench: its Labor Points, its count and its experience', () => {
    const c = newCharacter('companion', 's');
    const craft = ensureAbility(c, 'craft-type', { laterLife: 75 }, 'Blacksmith');
    c.workshop = { abilityUid: craft.uid, primary: 'Dex', innovation: 0, rawMaterials: 0, laborPoints: 10, assistants: [], manual: 0, craftLevelMod: 0, seasonsWorked: 0, reputationXp: 0, shoddyStreak: 0 };
    workshopSeason(c, deriveCharacter(c, data, DEFAULT_HOUSE_RULES), 1220, 'Spring');
    expect(c.workshop.laborPoints).toBeGreaterThan(10);
    expect(c.workshop.seasonsWorked).toBe(1);
    expect(craft.xp.play).toBe(2);
    const r = unlogSeason(c, c.seasonLog[0].uid);
    expect(r.ok).toBe(true);
    expect(c.workshop.laborPoints).toBe(10);
    expect(c.workshop.seasonsWorked).toBe(0);
    expect(craft.xp.play ?? 0).toBe(0);
    expect(c.seasonLog).toHaveLength(0);
  });

  it('puts a great building back as it was before a mason’s season, or takes away one the season began', () => {
    const c = newCharacter('companion', 's');
    const cov = newCovenant('s', 1220);
    const tower = { uid: 't', name: 'The tower', height: 40, weakest: 'standard' as const, latest: 'standard' as const, damage: 0 };
    cov.buildings = [buildSeason(tower, 5, 'shoddy').building!, { ...tower, uid: 'n' }];
    const e = newSeasonEntry(1220, 'Spring', 'other', 'Building: The tower');
    e.undo = { building: { covenantId: cov.id, uid: 't', before: tower } };
    const f = newSeasonEntry(1220, 'Summer', 'other', 'Building: a new one');
    f.undo = { building: { covenantId: cov.id, uid: 'n' } };
    c.seasonLog.push(e, f);
    expect(unlogSeason(c, f.uid, [cov]).covenants).toEqual([cov]);
    unlogSeason(c, e.uid, [cov]);
    expect(cov.buildings).toEqual([tower]);
  });

  it('gives back the vis a season spent and puts a lab project back as it was', () => {
    const before = newCharacter('magus', 's');
    const p = newProject('invent');
    before.projects = [p];
    purseOf(before).vis = [{ art: 'Cr', pawns: 6 }];
    const after = structuredClone(before);
    after.projects![0].progress = 12;
    after.projects![0].seasons = 1;
    purseOf(after).vis = [{ art: 'Cr', pawns: 2 }];
    after.warpingPoints = 1;
    const e = newSeasonEntry(1220, 'Spring', 'other', 'Lab: a spell');
    e.undo = labUndo(before, after, p.uid);
    applySeason(after, e, 1);
    after.seasonLog.push(e);
    expect(e.undo.vis).toEqual({ from: 'purse', taken: [{ art: 'Cr', pawns: 4 }] });
    expect(unlogSeason(after, e.uid).ok).toBe(true);
    expect(after.projects![0].progress).toBe(0);
    expect(after.projects![0].seasons).toBe(0);
    expect(purseOf(after).vis.find((v) => v.art === 'Cr')?.pawns).toBe(6);
    expect(after.warpingPoints).toBe(0);
  });

  it('leaves a season that finished its work on the log', () => {
    const before = newCharacter('magus', 's');
    const p = newProject('invent');
    before.projects = [p];
    const after = structuredClone(before);
    after.projects![0].done = true;
    const e = newSeasonEntry(1220, 'Spring', 'other', 'Lab: a spell');
    e.undo = labUndo(before, after, p.uid);
    after.seasonLog.push(e);
    const r = unlogSeason(after, e.uid);
    expect(r.ok).toBe(false);
    expect(r.why).toMatch(/finished/);
    expect(after.seasonLog).toHaveLength(1);
  });

  it('gives a covenant its vis back, and strikes a tractatus reader off again', () => {
    const c = newCharacter('magus', 's');
    const cov = { id: 'cv', visStocks: [] as { art: 'Vi'; pawns: number }[], library: [{ uid: 'b', readBy: [c.id] }] } as never as import('./types').Covenant;
    const e = newSeasonEntry(1220, 'Spring', 'study-vis', 'Studied Vim vis');
    e.undo = { vis: { from: 'covenant', covenantId: 'cv', taken: [{ art: 'Vi', pawns: 3 }] }, tractatus: { covenantId: 'cv', bookUid: 'b' } };
    c.seasonLog.push(e);
    const r = unlogSeason(c, e.uid, [cov]);
    expect(r.covenants).toEqual([cov]);
    expect(cov.visStocks).toEqual([{ art: 'Vi', pawns: 3 }]);
    expect(cov.library[0].readBy).toEqual([]);
  });
});

describe('a season logged with another’s is unlogged with it (owner.md, Decided, 19 November 2026)', () => {
  const pair = () => {
    const magus = newCharacter('magus', 's1');
    magus.name = 'Flavia';
    const helper = newCharacter('companion', 's1');
    helper.name = 'Bertram';
    const mt = ensureAbility(helper, 'magic-theory', {});
    const lab = newSeasonEntry(1220, 'Spring', 'other', 'Lab: a spell');
    lab.link = 'L1';
    magus.seasonLog.push(lab);
    const help = newSeasonEntry(1220, 'Spring', 'other', 'Helped Flavia in the lab', { [`ability:${mt.uid}`]: 2 });
    help.link = 'L1';
    applySeason(helper, help, 1);
    helper.seasonLog.push(help);
    return { magus, helper, lab, help, mt };
  };

  it('unlogging the helper’s season takes back the magus’s too, and says whose', () => {
    const { magus, helper, help, mt } = pair();
    const r = unlogLinked(helper, help.uid, [], [magus, helper]);
    expect(r.ok).toBe(true);
    expect(r.with).toEqual(['Flavia']);
    expect(helper.seasonLog).toHaveLength(0);
    expect(magus.seasonLog).toHaveLength(0);
    expect(helper.abilities.find((a) => a.uid === mt.uid)?.xp.play ?? 0).toBe(0);
    expect(r.characters.map((c) => c.name).sort()).toEqual(['Bertram', 'Flavia']);
  });

  it('a linked season that cannot be unlogged holds this one too', () => {
    const { magus, helper, lab, help } = pair();
    lab.undo = { final: 'The spell was learned.' };
    const can = canUnlogLinked(help, helper, [magus, helper]);
    expect(can.ok).toBe(false);
    expect(can.why).toMatch(/Flavia’s season/);
    expect(unlogLinked(helper, help.uid, [], [magus, helper]).ok).toBe(false);
    expect(helper.seasonLog).toHaveLength(1);
  });
});
