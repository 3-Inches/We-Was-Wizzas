// Unlogging a season takes back all it changed: Labor Points and the workshop's count, the vis it
// spent, a lab project's progress; and a season that finished something stays logged.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { ensureAbility, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { newSeasonEntry, applySeason } from './longterm';
import { newProject } from './projects';
import { DEFAULT_HOUSE_RULES } from './types';
import { labUndo, unlogSeason } from './unlog';
import { purseOf } from './vis';
import { workshopSeason } from './workshop';

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
