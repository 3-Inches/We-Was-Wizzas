// Unlogging a season: a season logged by mistake taken back, whole. Its experience and Warping come
// off (applySeason), and whatever else it recorded in its `undo`: what it left owed on the Resolve list
// (Twilight from a botch), the Labor Points it earned and the workshop's counts, a lab project's
// progress and the vis the work spent, the purse's pounds, a Virtue an Initiation gave, a Discovery, a
// season taught to the apprentice, a covenant teacher's seasons taught, a great building's progress, a holy
// work's progress and the Fatigue it cost, the parts of a tradition's record it changed, an Ability it began, a roll its work left still waiting. A
// roll already made stands: what it did is not taken back (`undo.rolled`). A season whose work finished something
// (a spell learned, an item made, a familiar bound) is final: what it made is on the sheet, so it is not
// unlogged (Undo at the top takes back the last change instead).

import { seasonIndex } from './effects';
import { applySeason } from './longterm';
import { dropSeasonRoll, seasonRollOf } from './seasonRolls';
import { PROJECT_KINDS } from './projects';
import type { Art } from '../data';
import type { SeasonRecordField } from './seasonLogTypes';
import type { Character, Covenant, Season, SeasonLogEntry, SeasonUndo, VisStock } from './types';
import { addVis, purseOf, takeVis, visAvailable } from './vis';

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
 * What a season did to the vis in the purse and the covenant's stores, from both before and after: the
 * pawns it took, from one place (the covenant's when it took from both), and the pawns it put in.
 */
export function visUndo(before: Character, after: Character, covBefore?: Covenant, covAfter?: Covenant): Pick<SeasonUndo, 'vis' | 'visAdded'> {
  const u: Pick<SeasonUndo, 'vis' | 'visAdded'> = {};
  const purseB = before.purse?.vis ?? [];
  const purseA = after.purse?.vis ?? [];
  const fromPurse = visGone(purseB, purseA);
  const fromCov = covBefore && covAfter ? visGone(covBefore.visStocks, covAfter.visStocks) : [];
  if (fromCov.length) u.vis = { from: 'covenant', covenantId: covAfter!.id, taken: fromCov };
  else if (fromPurse.length) u.vis = { from: 'purse', taken: fromPurse };
  const toPurse = visGone(purseA, purseB);
  const toCov = covBefore && covAfter ? visGone(covAfter.visStocks, covBefore.visStocks) : [];
  if (toCov.length) u.visAdded = { to: 'covenant', covenantId: covAfter!.id, added: toCov };
  else if (toPurse.length) u.visAdded = { to: 'purse', added: toPurse };
  return u;
}

/** The tradition records a season card's work may change. */
const RECORD_FIELDS: SeasonRecordField[] = ['learned', 'folkWitch', 'gruagach', 'vitki', 'pilgrimage', 'spiritualPath'];

/**
 * The parts of each tradition record a season's work changed, as they were before it, from the
 * character before and after: Unlog puts back those parts only, so a later change to another part stays.
 */
export function recordsUndo(before: Character, after: Character): Pick<SeasonUndo, 'records'> {
  const out: NonNullable<SeasonUndo['records']> = [];
  for (const field of RECORD_FIELDS) {
    const b = (before[field] ?? {}) as Record<string, unknown>;
    const a = (after[field] ?? {}) as Record<string, unknown>;
    for (const key of new Set([...Object.keys(b), ...Object.keys(a)]))
      if (JSON.stringify(b[key]) !== JSON.stringify(a[key])) out.push({ field, key, ...(b[key] === undefined ? {} : { was: structuredClone(b[key]) }) });
  }
  return out.length ? { records: out } : {};
}

/** The Abilities a season's work began, from the character before and after. */
export function begunUndo(before: Pick<Character, 'abilities'>, after: Pick<Character, 'abilities'>): Pick<SeasonUndo, 'abilities'> {
  const had = new Set(before.abilities.map((a) => a.uid));
  const begun = after.abilities.filter((a) => !had.has(a.uid)).map((a) => a.uid);
  return begun.length ? { abilities: begun } : {};
}

/** What a season's work left owed on the Resolve list (a Warping reaction), from the character before and after. */
export function owedUndo(before: Character, after: Character): Pick<SeasonUndo, 'owed'> {
  const had = new Set((before.owed ?? []).map((o) => o.uid));
  const raised = (after.owed ?? []).filter((o) => !had.has(o.uid)).map((o) => o.uid);
  return raised.length ? { owed: raised } : {};
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
  const { vis } = visUndo(before, after, covBefore, covAfter);
  if (vis) u.vis = vis;
  const wp = after.warpingPoints - before.warpingPoints;
  if (wp > 0) u.warping = wp;
  Object.assign(u, owedUndo(before, after));
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

/**
 * The records a season's `undo` puts back as they were (a project, a tradition's record, a holy work, a
 * great building): putting one back under a later season's work on it would take that work too.
 */
function snapshots(u: SeasonUndo | undefined): string[] {
  if (!u) return [];
  return [
    ...(u.project ? [`project ${u.project.uid}`] : []),
    ...(u.holyWork ? [`holy ${u.holyWork.uid}`] : []),
    ...(u.building ? [`building ${u.building.covenantId} ${u.building.uid}`] : []),
    ...(u.records ?? []).map((r) => `record ${r.field} ${r.key}`),
  ];
}

/**
 * Whether a logged season can be unlogged, and why not; and `stands`, what a roll already made at its end
 * did, which Unlog leaves (owner.md, point 2: a roll already made stands; Turn back undoes everything).
 * With the character (and the troupe, for a covenant's building), a season that a later season's work
 * on the same record follows is unlogged after that one, not before.
 */
export function canUnlog(e: SeasonLogEntry, c?: Character, troupe: Character[] = []): { ok: boolean; why?: string; stands?: string } {
  if (e.undo?.final) return { ok: false, why: e.undo.final };
  const mine = snapshots(e.undo);
  if (mine.length && c) {
    const at = seasonIndex(e.year, e.season);
    const pos = c.seasonLog.indexOf(e);
    const later = [...c.seasonLog.map((x, i) => ({ x, i, who: c })), ...troupe.filter((t) => t.id !== c.id).flatMap((t) => t.seasonLog.map((x) => ({ x, i: -1, who: t })))].find(
      ({ x, i, who }) => x !== e && (seasonIndex(x.year, x.season) > at || (who === c && seasonIndex(x.year, x.season) === at && i > pos)) && snapshots(x.undo).some((k) => mine.includes(k)),
    );
    if (later) return { ok: false, why: `${later.who === c ? '' : `${later.who.name || 'Another'}’s `}${later.x.season} ${later.x.year} (${later.x.summary}) worked on the same thing after this season: unlog that one first.` };
  }
  return { ok: true, ...(e.undo?.rolled ? { stands: e.undo.rolled } : {}) };
}

/**
 * Take a logged season back on a character (changed in place), giving vis back to the covenant it
 * came from (changed in place, and returned so the caller saves it).
 */
export function unlogSeason(c: Character, entryUid: string, covs: Covenant[] = [], o: { now?: { year: number; season: Season }; troupe?: Character[] } = {}): Unlogged {
  const e = c.seasonLog.find((x) => x.uid === entryUid);
  if (!e) return { ok: false, why: 'That season is not on the log.', covenants: [] };
  const can = canUnlog(e, c, o.troupe);
  if (!can.ok) return { ok: false, why: can.why, covenants: [] };
  const changed: Covenant[] = [];
  if (e.applied) applySeason(c, e, -1);
  // a roll its work left, not yet made: set aside with the season (what it kept, and the Resolve line, by `undo.owed`)
  const waiting = seasonRollOf(c, e.uid);
  if (waiting) {
    dropSeasonRoll(c, waiting);
    // a save from before the roll's Resolve line was kept on the season: its line goes too
    c.owed = c.owed?.filter((x) => !(x.kind === waiting && x.year === e.year && x.season === e.season));
    if (c.owed && !c.owed.length) delete c.owed;
  }
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
    // vis the season put in the stores comes out again, as far as it is still there
    if (u.visAdded?.added.length) {
      const cov = u.visAdded.to === 'covenant' ? covs.find((x) => x.id === u.visAdded!.covenantId) : undefined;
      const stocks = u.visAdded.to === 'covenant' ? cov?.visStocks : purseOf(c).vis;
      if (stocks) {
        for (const v of u.visAdded.added) takeVis(stocks, [v.art], Math.min(v.pawns, visAvailable(stocks, [v.art])));
        if (cov && !changed.includes(cov)) changed.push(cov);
      }
    }
    if (u.pounds) {
      const p = purseOf(c);
      p.pounds = Math.round((p.pounds + u.pounds) * 1000) / 1000;
    }
    if (u.warping) c.warpingPoints = Math.max(0, c.warpingPoints - u.warping);
    // the reaction its Warping brought, if not yet settled
    if (u.owed?.length && c.owed) {
      c.owed = c.owed.filter((o) => !u.owed!.includes(o.uid));
      if (!c.owed.length) delete c.owed;
    }
    if (u.virtueUids?.length) c.virtues = c.virtues.filter((v) => !u.virtueUids!.includes(v.uid));
    if (u.initiationUid) c.initiations = (c.initiations ?? []).filter((i) => i.uid !== u.initiationUid);
    if (u.discoveryUid && c.research) {
      c.research.discoveries = c.research.discoveries.filter((d) => d.uid !== u.discoveryUid);
      // the record this season began with its first Discovery, with nothing in it now
      if (u.research && !c.research.discoveries.length) delete c.research;
    }
    if (u.apprentice && c.apprentice) c.apprentice.seasons = Math.max(0, c.apprentice.seasons - 1);
    if (u.tractatus) {
      const cov = covs.find((x) => x.id === u.tractatus!.covenantId);
      const b = cov?.library.find((x) => x.uid === u.tractatus!.bookUid);
      if (cov && b?.readBy?.includes(c.id)) {
        b.readBy = b.readBy.filter((id) => id !== c.id);
        if (!changed.includes(cov)) changed.push(cov);
      }
    }
    for (const r of u.records ?? []) {
      const rec = { ...((c[r.field] ?? {}) as Record<string, unknown>) };
      if (r.was === undefined) delete rec[r.key];
      else rec[r.key] = structuredClone(r.was);
      (c as unknown as Record<string, unknown>)[r.field] = Object.keys(rec).length ? rec : undefined;
    }
    if (u.specialist) {
      const cov = covs.find((x) => x.id === u.specialist!.covenantId);
      const sp = cov?.specialists.find((x) => x.uid === u.specialist!.uid);
      if (cov && sp?.taught?.year === e.year) {
        // a season fewer taught that year: other lessons the teacher gave since stay counted
        const was = u.specialist.taught;
        if (sp.taught.seasons > 1) sp.taught = { ...sp.taught, seasons: sp.taught.seasons - 1 };
        else if (was) sp.taught = { ...was };
        else delete sp.taught;
        if (!changed.includes(cov)) changed.push(cov);
      }
    }
    if (u.holyWork) {
      const was = structuredClone(u.holyWork);
      const works = c.holy?.works ?? [];
      c.holy = { ...(c.holy ?? {}), works: works.some((w) => w.uid === was.uid) ? works.map((w) => (w.uid === was.uid ? was : w)) : [...works, was] };
    }
    // Fatigue comes back as each season ends: given back only within the season that cost it
    if (u.fatigue && (!o.now || (o.now.year === e.year && o.now.season === e.season))) c.longTermFatigueLost = Math.max(0, c.longTermFatigueLost - u.fatigue);
    if (u.building) {
      const cov = covs.find((x) => x.id === u.building!.covenantId);
      if (cov) {
        const { uid: id, before } = u.building;
        const rest = (cov.buildings ?? []).filter((b) => b.uid !== id);
        cov.buildings = before ? (cov.buildings ?? []).map((b) => (b.uid === id ? structuredClone(before) : b)) : rest;
        if (before && !cov.buildings.some((b) => b.uid === id)) cov.buildings.push(structuredClone(before));
        if (!changed.includes(cov)) changed.push(cov);
      }
    }
  }
  // an Ability the season began (Worship's Church Lore, a language first taught) goes again while it has no experience
  const begun = e.undo?.abilities ?? [];
  c.abilities = c.abilities.filter((a) => !begun.includes(a.uid) || Object.values(a.xp).some((v) => v));
  c.seasonLog = c.seasonLog.filter((x) => x.uid !== entryUid);
  return { ok: true, covenants: changed };
}

/** The seasons logged with this one on other characters (a lesson's teacher and students, a lab's helpers): one `link`. */
export function linkedSeasons(e: SeasonLogEntry, c: Character, troupe: Character[]): { who: Character; entry: SeasonLogEntry }[] {
  if (!e.link) return [];
  return troupe.filter((t) => t.id !== c.id).flatMap((t) => t.seasonLog.filter((x) => x.link === e.link).map((entry) => ({ who: t, entry })));
}

/**
 * Whether a season can be unlogged with the seasons linked to it (owner.md, Decided, 19 November 2026:
 * Unlog takes back a linked season with its own, and says whose). A linked one that cannot be unlogged
 * holds this one too.
 */
export function canUnlogLinked(e: SeasonLogEntry, c: Character, troupe: Character[] = []): { ok: boolean; why?: string; stands?: string; with: string[] } {
  const own = canUnlog(e, c, troupe);
  const linked = linkedSeasons(e, c, troupe);
  const names = linked.map((l) => l.who.name || 'another character');
  if (!own.ok) return { ...own, with: names };
  for (const l of linked) {
    const can = canUnlog(l.entry, l.who, troupe);
    if (!can.ok) return { ok: false, why: `It was logged with ${l.who.name || 'another character'}’s season, which cannot be unlogged yet: ${can.why}`, with: names };
  }
  const stands = [own.stands, ...linked.map((l) => canUnlog(l.entry, l.who, troupe).stands)].filter(Boolean).join(' ');
  return { ok: true, with: names, ...(stands ? { stands } : {}) };
}

/**
 * Unlog a season and the seasons linked to it on the other characters (changed in place: `troupe` holds
 * the copies to change and save). Returns the characters changed, the covenants, and whose seasons went with it.
 */
export function unlogLinked(c: Character, entryUid: string, covs: Covenant[], troupe: Character[], o: { now?: { year: number; season: Season } } = {}): Unlogged & { characters: Character[]; with: string[] } {
  const e = c.seasonLog.find((x) => x.uid === entryUid);
  if (!e) return { ok: false, why: 'That season is not on the log.', covenants: [], characters: [], with: [] };
  const can = canUnlogLinked(e, c, troupe);
  if (!can.ok) return { ok: false, why: can.why, covenants: [], characters: [], with: can.with };
  const linked = linkedSeasons(e, c, troupe);
  const r = unlogSeason(c, entryUid, covs, { ...o, troupe });
  if (!r.ok) return { ...r, characters: [], with: can.with };
  const covenants = [...r.covenants];
  for (const l of linked) {
    const rr = unlogSeason(l.who, l.entry.uid, covs, { ...o, troupe });
    for (const cv of rr.covenants) if (!covenants.includes(cv)) covenants.push(cv);
  }
  return { ok: true, covenants, characters: [c, ...linked.map((l) => l.who).filter((w, i, a) => a.indexOf(w) === i)], with: can.with };
}
