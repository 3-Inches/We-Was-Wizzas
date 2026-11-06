// Unlogging a season: a season logged by mistake taken back, whole. Its experience and Warping come
// off (applySeason), and whatever else it recorded in its `undo`: the Labor Points it earned and the
// workshop's counts, a lab project's progress and the vis the work spent, the purse's pounds, a Virtue
// an Initiation gave, a Discovery, a season taught to the apprentice. A season whose work finished
// something (a spell learned, an item made, a familiar bound) is final: what it made is on the sheet,
// so it is not unlogged (Undo at the top takes back the last change instead).

import { applySeason } from './longterm';
import { PROJECT_KINDS } from './projects';
import type { Art } from '../data';
import type { Character, Covenant, SeasonLogEntry, SeasonUndo, VisStock } from './types';
import { addVis, purseOf } from './vis';

/** The vis gone from one set of stocks to another, by Art (and pair): what a season spent. */
function visGone(before: VisStock[], after: VisStock[]): { art: Art; pawns: number; pair?: Art }[] {
  const key = (v: VisStock) => `${v.art}|${v.pair ?? ''}`;
  const sum = (xs: VisStock[]) => xs.reduce((m, v) => m.set(key(v), (m.get(key(v)) ?? 0) + v.pawns), new Map<string, number>());
  const a = sum(before);
  const b = sum(after);
  const out: { art: Art; pawns: number; pair?: Art }[] = [];
  for (const [k, n] of a) {
    const left = b.get(k) ?? 0;
    if (n > left) {
      const [art, pair] = k.split('|');
      out.push({ art: art as Art, pawns: n - left, ...(pair ? { pair: pair as Art } : {}) });
    }
  }
  return out;
}

/**
 * What a season's work on a lab project changed, worked out from the character (and its covenant)
 * before and after: the project as it was, the vis it spent, the Warping it brought. A project the
 * season finished is final: what it made (a spell, an enchantment, a bond) is on the sheet.
 */
export function labUndo(before: Character, after: Character, projectUid: string, covBefore?: Covenant, covAfter?: Covenant): SeasonUndo {
  const was = before.projects?.find((p) => p.uid === projectUid);
  const now = after.projects?.find((p) => p.uid === projectUid);
  const u: SeasonUndo = {};
  if (was) u.project = structuredClone(was);
  const fromPurse = visGone(before.purse?.vis ?? [], after.purse?.vis ?? []);
  const fromCov = covBefore && covAfter ? visGone(covBefore.visStocks, covAfter.visStocks) : [];
  if (fromCov.length) u.vis = { from: 'covenant', covenantId: covAfter!.id, taken: fromCov };
  else if (fromPurse.length) u.vis = { from: 'purse', taken: fromPurse };
  const wp = after.warpingPoints - before.warpingPoints;
  if (wp > 0) u.warping = wp;
  if (now?.done && !was?.done) {
    const what = PROJECT_KINDS.find((k) => k.id === now.kind)?.label.toLowerCase() ?? 'the work';
    u.final = `This season finished ${now.name || what}: what it made is on the sheet, so the season stays logged (remove what it made by hand if it must go).`;
  }
  return u;
}

export interface Unlogged {
  ok: boolean;
  /** why it could not be unlogged */
  why?: string;
  /** covenants it gave vis back to */
  covenants: Covenant[];
}

/** Whether a logged season can be unlogged, and why not. */
export function canUnlog(e: SeasonLogEntry): { ok: boolean; why?: string } {
  if (e.undo?.final) return { ok: false, why: e.undo.final };
  return { ok: true };
}

/**
 * Take a logged season back on a character (changed in place), giving vis back to the covenant it
 * came from (changed in place, and returned so the caller saves it).
 */
export function unlogSeason(c: Character, entryUid: string, covs: Covenant[] = []): Unlogged {
  const e = c.seasonLog.find((x) => x.uid === entryUid);
  if (!e) return { ok: false, why: 'That season is not on the log.', covenants: [] };
  const can = canUnlog(e);
  if (!can.ok) return { ok: false, why: can.why, covenants: [] };
  const changed: Covenant[] = [];
  if (e.applied) applySeason(c, e, -1);
  const u = e.undo;
  if (u) {
    if (c.workshop) {
      if (u.laborPoints) c.workshop.laborPoints -= u.laborPoints;
      if (u.workshop) {
        const { wonder, ...counts } = u.workshop;
        Object.assign(c.workshop, counts);
        if (wonder === null) delete c.workshop.wonder;
        else if (wonder) c.workshop.wonder = wonder;
      }
    }
    if (u.writing) for (const w of c.writing ?? []) {
      const was = u.writing.find((x) => x.uid === w.uid);
      if (was) w.points = was.points;
    }
    if (u.project) c.projects = (c.projects ?? []).map((p) => (p.uid === u.project!.uid ? structuredClone(u.project!) : p));
    if (u.vis?.taken.length) {
      if (u.vis.from === 'covenant') {
        const cov = covs.find((x) => x.id === u.vis!.covenantId);
        if (cov) {
          for (const v of u.vis.taken) addVis(cov.visStocks, v.art, v.pawns, v.pair);
          changed.push(cov);
        }
      } else for (const v of u.vis.taken) addVis(purseOf(c).vis, v.art, v.pawns, v.pair);
    }
    if (u.pounds) {
      const p = purseOf(c);
      p.pounds = Math.round((p.pounds + u.pounds) * 1000) / 1000;
    }
    if (u.warping) c.warpingPoints = Math.max(0, c.warpingPoints - u.warping);
    if (u.virtueUids?.length) c.virtues = c.virtues.filter((v) => !u.virtueUids!.includes(v.uid));
    if (u.initiationUid) c.initiations = (c.initiations ?? []).filter((i) => i.uid !== u.initiationUid);
    if (u.discoveryUid && c.research) c.research.discoveries = c.research.discoveries.filter((d) => d.uid !== u.discoveryUid);
    if (u.apprentice && c.apprentice) c.apprentice.seasons = Math.max(0, c.apprentice.seasons - 1);
    if (u.tractatus) {
      const cov = covs.find((x) => x.id === u.tractatus!.covenantId);
      const b = cov?.library.find((x) => x.uid === u.tractatus!.bookUid);
      if (cov && b?.readBy?.includes(c.id)) {
        b.readBy = b.readBy.filter((id) => id !== c.id);
        if (!changed.includes(cov)) changed.push(cov);
      }
    }
  }
  c.seasonLog = c.seasonLog.filter((x) => x.uid !== entryUid);
  return { ok: true, covenants: changed };
}
