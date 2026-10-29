// A season priority list: what a character does with a season nobody planned, in order of
// preference, when its standing activity is to follow the list. Each entry is a season a year
// (list one twice for two seasons); each season the first entry not yet used up this year that can
// be done is taken: service to the covenant, politics, travel, writing for the library, the
// library's best book for the character's Arts, study from vis, a new spell in its Arts, an
// improvement to its laboratory. A Longevity Ritual comes whenever a magus of 35 or more has none,
// and lab work or practice fills any season the list leaves. The living covenants built from a
// Tribunal book run on these; any character can be set to follow one.

import { ARTS, ART_NAMES, FORMS, TECHNIQUES, type Art, type GameData } from '../data';
import type { DerivedCharacter } from './character/derive';
import { ensureAbility } from './character/factory';
import type { CharacterContext } from './context';
import type { Rng } from './dice';
import { computeStudy, visForStudy } from './longterm';
import { newProject, planProject, visShort } from './projects';
import { planBook } from './books';
import { purseOf, visAvailable } from './vis';
import type { Character, Covenant, LabProject, LibraryBook, PriorityKind, Season, SeasonPriority, StandingActivity, WritingProject } from './types';
import { uid } from '../util/id';

export const PRIORITY_KINDS: { id: PriorityKind; label: string; yearly: boolean; text: string }[] = [
  { id: 'longevity', label: 'Longevity Ritual', yearly: false, text: 'Whenever it is needed: from 35, or when an aging crisis ends one, a season in the lab to make a Longevity Ritual with the covenant’s vis.' },
  { id: 'service', label: 'Service to the covenant', yearly: true, text: 'The covenant’s business: vis extracted from its aura when its stores run low, else its duties (Exposure in Order of Hermes Lore).' },
  { id: 'politics', label: 'Hermetic politics', yearly: true, text: 'Letters, visits and gild business: Exposure in Intrigue.' },
  { id: 'travel', label: 'Travel', yearly: true, text: 'On the road or at sea: Exposure in Area Lore.' },
  { id: 'write', label: 'Write a book', yearly: true, text: 'A tractatus on the character’s best subject, for the covenant’s library.' },
  { id: 'read', label: 'Read the best book', yearly: true, text: 'The covenant library’s best summa or unread tractatus for the character’s Arts (or Abilities), if it teaches 5 xp or more.' },
  { id: 'vis', label: 'Study from vis', yearly: true, text: 'An Art studied from vis: the purse’s, or the covenant’s if it has twice what the season needs.' },
  { id: 'invent', label: 'Invent a spell', yearly: true, text: 'A new spell in the character’s Arts, as high as the Lab Total allows five points a season; or the one in hand.' },
  { id: 'lab', label: 'Improve the laboratory', yearly: true, text: 'Refine the laboratory, when its Refinement can rise.' },
  { id: 'practice', label: 'Lab work or practice', yearly: false, text: 'Any season the list leaves: a magus works in the lab (Exposure in Magic Theory, or the first project that can be worked); anyone else practices their work.' },
];
export const PRIORITY_BY_ID = new Map(PRIORITY_KINDS.map((k) => [k.id, k]));

/** A sensible list by what the character is: a magus’ by its archetype (role), a Redcap’s, anyone else’s. */
export function defaultPriorities(c: Character, o: { role?: string; arts?: Art[]; ungifted?: boolean } = {}): SeasonPriority[] {
  const arts = o.arts?.length ? o.arts : undefined;
  const list = (...kinds: PriorityKind[]): SeasonPriority[] => kinds.map((kind) => (arts && ['read', 'vis', 'invent'].includes(kind) ? { kind, arts } : { kind }));
  // a Redcap is on the road; anyone else without the Gift reads when there is a book for them, and practices
  if (o.ungifted) return list('travel', 'travel', 'travel', 'read', 'practice');
  if (c.type !== 'magus') return list('read', 'practice');
  switch (o.role) {
    case 'politician':
    case 'social':
      return list('longevity', 'service', 'politics', 'read', 'invent', 'vis', 'read', 'practice');
    case 'scholar':
      return list('longevity', 'service', 'read', 'write', 'read', 'vis', 'invent', 'practice');
    case 'explorer':
      return list('longevity', 'service', 'travel', 'read', 'vis', 'invent', 'practice');
    case 'lab':
    case 'enchanter':
      return list('longevity', 'service', 'invent', 'read', 'invent', 'vis', 'lab', 'practice');
    default:
      return list('longevity', 'service', 'read', 'vis', 'invent', 'read', 'practice');
  }
}

export interface PriorityChoice {
  kind: PriorityKind;
  standing: StandingActivity;
  /** what it is, in a few words (“Read Principles of Rego”) */
  what: string;
}

export interface PriorityTry {
  kind: PriorityKind;
  why: string;
}

interface Ctx {
  c: Character;
  d: DerivedCharacter;
  ctx: CharacterContext;
  cov?: Covenant;
  data: GameData;
  year: number;
  season: Season;
  rng: Rng;
  chars: Character[];
}

/** The Arts an entry favors: its own, else the character's two best. */
export function focusArts(d: DerivedCharacter, p?: SeasonPriority): Art[] {
  if (p?.arts?.length) return p.arts;
  return [...ARTS].sort((a, b) => d.arts[b].score - d.arts[a].score || d.arts[b].effectiveXp - d.arts[a].effectiveXp).slice(0, 2);
}

/**
 * The season's choice from the list: the first entry that applies and can be done, with why each
 * one before it was passed over. Makes the project or book to work on when it needs one.
 */
export function choosePriority(c: Character, d: DerivedCharacter, ctx: CharacterContext, cov: Covenant | undefined, data: GameData, year: number, season: Season, rng: Rng, chars: Character[] = []): { choice?: PriorityChoice; tried: PriorityTry[] } {
  const x: Ctx = { c, d, ctx, cov, data, year, season, rng, chars };
  const list = (c.priorities ?? []).filter((p) => !p.off);
  const tried: PriorityTry[] = [];
  const listed = (k: PriorityKind) => list.filter((p) => p.kind === k).length;
  const used = (k: PriorityKind) => c.seasonLog.filter((e) => e.year === year && e.priority === k && !e.extra).length;
  for (const p of list) {
    const meta = PRIORITY_BY_ID.get(p.kind);
    if (!meta) continue;
    if (meta.yearly && used(p.kind) >= listed(p.kind)) {
      tried.push({ kind: p.kind, why: `done this year (${used(p.kind)} season${used(p.kind) === 1 ? '' : 's'})` });
      continue;
    }
    const r = TRY[p.kind](x, p);
    if (typeof r === 'string') tried.push({ kind: p.kind, why: r });
    else return { choice: { kind: p.kind, ...r }, tried };
  }
  // a season the list leaves goes to lab work or practice
  const fallback = TRY.practice(x, { kind: 'practice' });
  return typeof fallback === 'string' ? { tried } : { choice: { kind: 'practice', ...fallback }, tried };
}

type Try = (x: Ctx, p: SeasonPriority) => { standing: StandingActivity; what: string } | string;

const workable = (x: Ctx, p: LabProject): string | undefined => {
  const plan = planProject(p, x.c, x.d, x.ctx, { subject: x.c, data: x.data });
  return plan.problems[0] ?? visShort(p, x.c, x.ctx, plan);
};
const labSeason = (p: LabProject, what: string) => ({ standing: { kind: 'lab' as const, projectUid: p.uid }, what });

const TRY: Record<PriorityKind, Try> = {
  longevity: (x) => {
    const { c, d } = x;
    if (!d.isMagus) return 'only a magus makes a Longevity Ritual in the lab';
    if (c.longevity) return 'has one';
    if (c.age < 35 && !c.longevityLapsed) return 'not yet 35';
    if (!x.ctx.lab) return 'no laboratory';
    let p = c.projects?.find((q) => q.kind === 'longevity' && !q.done && (!q.subjectId || q.subjectId === c.id));
    if (!p) {
      p = { ...newProject('longevity'), name: 'Longevity Ritual', visFrom: x.cov ? 'covenant' : undefined };
      c.projects = [...(c.projects ?? []), p];
    }
    const problem = workable(x, p);
    return problem ? `the ritual cannot be made yet: ${problem}` : labSeason(p, 'a Longevity Ritual');
  },
  service: (x) => {
    const { c, d, cov } = x;
    // vis for the covenant when its stores run low (under five pawns a member), else its duties
    const low = cov && cov.visStocks.reduce((t, v) => t + v.pawns, 0) < 5 * Math.max(1, cov.memberIds.length);
    if (low && d.isMagus && x.ctx.lab && cov && x.ctx.aura.realm === 'Magic' && x.ctx.aura.strength > 0) {
      let p = c.projects?.find((q) => q.kind === 'extract' && !q.done && q.visFrom === 'covenant');
      if (!p) {
        p = { ...newProject('extract'), name: `Extract vis for ${cov.name || 'the covenant'}`, visFrom: 'covenant' };
        c.projects = [...(c.projects ?? []), p];
      }
      if (!workable(x, p)) return labSeason(p, `vis extracted for ${cov.name || 'the covenant'}`);
    }
    // a duty: the covenant's business (Exposure in its Lore, or the character's work)
    const lore = ensureAbility(c, 'organization-lore', {}, 'Order of Hermes');
    return { standing: { kind: 'exposure', target: `ability:${lore.uid}` }, what: `duties for ${cov?.name || 'the covenant'}` };
  },
  politics: (x) => {
    const a = ensureAbility(x.c, 'intrigue', {});
    return { standing: { kind: 'exposure', target: `ability:${a.uid}` }, what: 'Hermetic politics' };
  },
  travel: (x) => {
    const where = `${x.cov?.tribunal || x.ctx.covenant?.tribunal || 'Rhine'} Tribunal`;
    const a = ensureAbility(x.c, 'area-lore', {}, where);
    return { standing: { kind: 'exposure', target: `ability:${a.uid}` }, what: `travel in the ${where}` };
  },
  write: (x) => {
    const { c, d, cov } = x;
    if (!cov) return 'no covenant library to write for';
    const open = c.writing?.find((w) => !w.done && (w.kind === 'tractatus' || w.kind === 'summa') && w.points < w.needed);
    if (open) return { standing: { kind: 'write', projectUid: open.uid }, what: `writing ${open.title}` };
    const latin = d.abilities.filter((a) => a.abilityId === 'dead-language' && /latin/i.test(a.name)).sort((a, b) => b.total - a.total)[0];
    const lang = latin ?? d.abilities.filter((a) => a.abilityId === 'living-language').sort((a, b) => b.total - a.total)[0];
    if (!lang || lang.total < 5) return 'no language at 5 to write in';
    const written = (subject: string) => cov.library.filter((b) => b.authorId === c.id && b.kind === 'tractatus' && b.subject === subject).length;
    // the best subject the author may still write a tractatus on: an Art (5 or more) or an Ability (2 or more)
    const subjects = [
      ...(d.isMagus ? focusArts(d).map((a) => ({ isArt: true, subject: a as string, score: d.arts[a].score, label: ART_NAMES[a], exposure: `art:${a}` })) : []),
      ...d.abilities.filter((a) => !['living-language', 'dead-language'].includes(a.abilityId)).sort((a, b) => b.total - a.total).slice(0, 3).map((a) => ({ isArt: false, subject: a.abilityId, score: a.score, label: a.name, exposure: `ability:${a.uid}` })),
    ];
    for (const s of subjects) {
      const r = planBook(d, { kind: 'tractatus', isArt: s.isArt, score: s.score, com: d.characteristics.Com.value, language: lang.total, written: written(s.subject) });
      if (r.problems.length) continue;
      const w: WritingProject = {
        uid: uid(), kind: 'tractatus', title: `${pickTitle(x.rng)} ${s.label}`, subjectType: s.isArt ? 'art' : 'ability', subject: s.subject, exposure: s.exposure, language: c.abilities.find((a) => a.uid === lang.uid)?.param || 'Latin',
        level: 0, quality: r.quality, textQuality: r.textQuality, points: 0, needed: r.needed || 1, rate: Math.max(1, r.perSeason), authorScore: s.score, covenantId: cov.id, started: { year: x.year, season: x.season },
      };
      c.writing = [...(c.writing ?? []), w];
      return { standing: { kind: 'write', projectUid: w.uid }, what: `writing ${w.title}` };
    }
    return 'nothing more to write a tractatus on';
  },
  read: (x, p) => {
    const { c, d, cov } = x;
    if (!cov?.library.length) return 'no library';
    const inUse = new Set(x.chars.filter((o) => o.id !== c.id).flatMap((o) => o.seasonLog.filter((e) => e.year === x.year && e.season === x.season && e.bookId).map((e) => e.bookId!)));
    const focus = d.isMagus ? focusArts(d, p) : [];
    let best: { b: LibraryBook; target: string; xp: number; value: number } | undefined;
    for (const b of cov.library) {
      if ((b.kind !== 'summa' && b.kind !== 'tractatus') || b.corrupt || inUse.has(b.uid)) continue;
      if (b.kind === 'tractatus' && b.readBy?.includes(c.id)) continue;
      if (b.ownerId && b.ownerId !== c.id) continue;
      const src = b.kind === 'summa'
        ? { kind: 'summa' as const, quality: b.quality, level: b.level, isArt: b.subjectType === 'art', subject: b.title }
        : { kind: 'tractatus' as const, quality: b.quality, isArt: b.subjectType === 'art', subject: b.title };
      if (b.subjectType === 'art') {
        if (!d.isMagus || !(ARTS as readonly string[]).includes(b.subject)) continue;
        const art = b.subject as Art;
        const r = computeStudy(d, src, { art });
        const value = r.xp * (focus.includes(art) ? 1.5 : 1);
        if (!best || value > best.value) best = { b, target: `art:${art}`, xp: r.xp, value };
      } else if (b.subjectType === 'ability') {
        const mine = c.abilities.find((a) => a.abilityId === b.subject && (!b.param || a.param === b.param));
        if (!mine) continue;
        const r = computeStudy(d, src, { abilityUid: mine.uid });
        const value = r.xp * (d.isMagus ? 0.8 : 1.2);
        if (!best || value > best.value) best = { b, target: `ability:${mine.uid}`, xp: r.xp, value };
      }
    }
    if (!best || best.xp < 5) return best ? `the best book teaches only ${best.xp} xp` : 'no book it can learn from';
    return { standing: { kind: 'read', bookUid: best.b.uid, target: best.target }, what: `reading ${best.b.title}` };
  },
  vis: (x, p) => {
    const { c, d, cov } = x;
    if (!d.isMagus) return 'only a magus studies from vis';
    for (const art of focusArts(d, p)) {
      const pawns = visForStudy(d.arts[art].score);
      if (visAvailable(purseOf(c).vis, [art]) >= pawns) return { standing: { kind: 'vis', target: `art:${art}` }, what: `studying ${ART_NAMES[art]} vis` };
      if (cov && visAvailable(cov.visStocks, [art]) >= 2 * pawns) return { standing: { kind: 'vis', target: `art:${art}`, visFrom: 'covenant' }, what: `studying ${ART_NAMES[art]} vis from the covenant’s stores` };
    }
    return `no ${focusArts(d, p).map((a) => ART_NAMES[a]).join(' or ')} vis to spare`;
  },
  invent: (x, p) => {
    const { c, d, data } = x;
    if (!d.isMagus) return 'only a magus invents spells';
    if (!x.ctx.lab) return 'no laboratory';
    const open = c.projects?.find((q) => q.kind === 'invent' && !q.done && !q.fromText);
    if (open) {
      const problem = workable(x, open);
      if (!problem) return labSeason(open, `inventing ${open.spell?.name ?? open.name}`);
    }
    const known = new Set(c.spells.map((s) => s.spellId ?? s.spell.id));
    const focus = focusArts(d, p);
    const pairs: [Art, Art][] = [];
    for (const t of TECHNIQUES) for (const f of FORMS) if (focus.includes(t) || focus.includes(f)) pairs.push([t, f]);
    const totals = new Map<string, number>();
    const totalOf = (t: Art, f: Art) => {
      const k = t + f;
      if (!totals.has(k)) {
        const probe = { ...newProject('invent'), technique: t, form: f, level: 1 } as LabProject;
        totals.set(k, planProject(probe, c, d, x.ctx, { data }).total?.total ?? 0);
      }
      return totals.get(k)!;
    };
    const candidates = data.spells.filter((s) => s.level && !s.ritual && !s.general && !known.has(s.id) && SPELL_NAME.test(s.name) && !NOT_A_SPELL.test(s.name) && pairs.some(([t, f]) => t === s.technique && f === s.form) && s.level <= totalOf(s.technique, s.form) - 5);
    if (!candidates.length) return 'no spell in its Arts within reach of its Lab Total';
    // among the highest five levels within reach, one at random
    const top = [...candidates].sort((a, b) => (b.level ?? 0) - (a.level ?? 0)).slice(0, 5);
    const sp = top[Math.floor(x.rng() * top.length)];
    const proj: LabProject = { ...newProject('invent'), spell: sp, technique: sp.technique, form: sp.form, requisites: sp.requisites, level: sp.level!, name: `Invent ${sp.name}` };
    c.projects = [...(c.projects ?? []).filter((q) => !(q.kind === 'invent' && !q.done && !q.progress && !q.fromText)), proj];
    const problem = workable(x, proj);
    return problem ? `${sp.name}: ${problem}` : labSeason(proj, `inventing ${sp.name}`);
  },
  lab: (x) => {
    const { c, d } = x;
    if (!d.isMagus || !x.ctx.lab) return 'no laboratory';
    let p = c.projects?.find((q) => q.kind === 'refine' && !q.done);
    if (!p) {
      p = { ...newProject('refine'), name: 'Refine the laboratory' };
      const problem = workable(x, p);
      if (problem) return problem;
      c.projects = [...(c.projects ?? []), p];
    }
    const problem = workable(x, p);
    return problem ?? labSeason(p, 'refining the laboratory');
  },
  practice: (x) => {
    if (x.d.isMagus) return { standing: { kind: 'lab' }, what: 'lab work' };
    return { standing: { kind: 'practice' }, what: 'practice' };
  },
};

/** Spells by name: the books' lists also hold item effects and powers ("Pen +30, 6/day") that are not spells to invent. */
const SPELL_NAME = /^[A-Z][^+/0-9]{2,46}$/;
const NOT_A_SPELL = /^(Enchanted Item|As the|The character)|\.$/;

const TITLES = ['Notes on', 'Observations of', 'Questions on', 'A Discourse upon', 'Reflections on', 'Of the Nature of'];
function pickTitle(rng: Rng): string {
  return TITLES[Math.floor(rng() * TITLES.length)];
}

export function priorityLabel(kind: PriorityKind): string {
  return PRIORITY_BY_ID.get(kind)?.label ?? kind;
}
