// A season priority list: what a character does with a season nobody planned, in order of
// preference, when its standing activity is to follow the list. Each entry is a season a year
// (list one twice for two seasons); each season the first entry not yet used up this year that can
// be done is taken: service to the covenant, politics, travel, writing for the library, the
// library's best book for the character's Arts, study from vis, a new spell in its Arts, an
// improvement to its laboratory. A Longevity Ritual comes whenever a magus of 35 or more has none,
// and lab work or practice fills any season the list leaves. The living covenants built from a
// Tribunal book run on these; any character can be set to follow one.

import { ARTS, ART_NAMES, FORMS, TECHNIQUES, type Art, type GameData, type SpellDef } from '../data';
import type { DerivedCharacter } from './character/derive';
import { ensureAbility } from './character/factory';
import { labAuraFor, type CharacterContext } from './context';
import { auraModifier } from './magic';
import type { Rng } from './dice';
import { computeStudy, visForStudy } from './longterm';
import { abilityScoreFromXp } from './xp';
import { longevityVisCost } from './enchant';
import { newProject, planProject, visShort } from './projects';
import { planBook } from './books';
import { FREQUENCY, chargedItemCharges, investEffect, openingCost } from './enchant';
import { purseOf, visAvailable } from './vis';
import { MAX_IMPROVEMENTS, spareVis, visShortfall } from './livingEconomy';
import { specAbilities, specChar } from './covenantRules';
import { teaches } from './covenfolk';
import { CALAMITY_BY_ID, worstTrouble } from './calamity';
import type { Character, Covenant, EnchantedItem, LabProject, PriorityKind, Season, SeasonPriority, StandingActivity, WritingProject } from './types';
import { uid } from '../util/id';

export const PRIORITY_KINDS: { id: PriorityKind; label: string; yearly: boolean; text: string }[] = [
  { id: 'longevity', label: 'Longevity Ritual', yearly: false, text: 'Whenever it is needed: from 35, or when an aging crisis ends one, a season in the lab to make a Longevity Ritual with the covenant’s vis.' },
  { id: 'apprentice', label: 'Teach the apprentice', yearly: true, text: 'A season a year with the apprentice, while there is one (Exposure in Teaching).' },
  { id: 'house', label: 'House duties', yearly: true, text: 'What the magus’s House or office asks of a season: a Quaesitor’s investigations, a season a year (Exposure in Code of Hermes); a Gifted Mercere’s season carrying messages as the Redcaps do, one in seven years (Exposure in Area Lore).' },
  { id: 'service', label: 'Service to the covenant', yearly: true, text: 'The covenant’s business: vis extracted from its aura when it lacks what its Aegis and Longevity Rituals need, else its duties (Exposure in Order of Hermes Lore).' },
  { id: 'politics', label: 'Hermetic politics', yearly: true, text: 'Letters, visits and gild business: Exposure in Intrigue.' },
  { id: 'travel', label: 'Travel', yearly: true, text: 'On the road or at sea: Exposure in Area Lore.' },
  { id: 'write', label: 'Write a book', yearly: true, text: 'A tractatus on the character’s best subject, for the covenant’s library.' },
  { id: 'read', label: 'Study the best book or teacher', yearly: true, text: 'The covenant library’s best summa or unread tractatus for the character’s Arts (or Abilities), or a season with one of the covenant’s teachers, whichever teaches more, if it is 5 xp or more.' },
  { id: 'vis', label: 'Study from vis', yearly: true, text: 'An Art studied from vis: the purse’s, or the covenant’s if it has twice what the season needs.' },
  { id: 'invent', label: 'Invent a spell', yearly: true, text: 'A new spell in the character’s Arts, as high as the Lab Total allows five points a season; or the one in hand.' },
  { id: 'enchant', label: 'Enchant an item', yearly: true, text: 'A lesser enchanted device with one of the character’s spells, in a season, when the Lab Total is twice the effect’s level (vis from the covenant); else a charged item, as many charges as the Lab Total gives. Or the one in hand.' },
  { id: 'lab', label: 'Improve the laboratory', yearly: true, text: 'Refine the laboratory, when its Refinement can rise.' },
  { id: 'practice', label: 'Lab work or practice', yearly: false, text: 'Any season the list leaves: a magus works in the lab (Exposure in Magic Theory, or the first project that can be worked); anyone else practices their work.' },
];
export const PRIORITY_BY_ID = new Map(PRIORITY_KINDS.map((k) => [k.id, k]));

/**
 * The duty a magus's House or office lays on a season, if any: a Quaesitor investigates the
 * complaints brought to them, keeping three seasons a year their own (HoH:TL, Guernicus); a Gifted
 * Mercere spends a season every seven years carrying messages as the Redcaps do (HoH:TL, Mercere).
 * Most magi of House Guernicus hold the office, so the toolkit takes any of them for a Quaesitor;
 * one of another House is one by a Quaesitor Reputation.
 */
export function houseDuty(c: Character): { what: string; ability: string; param?: string; everyYears: number } | undefined {
  if (c.type !== 'magus') return undefined;
  const quaesitor = c.house === 'guernicus' || c.reputations.some((r) => /^(senior |honorary )?quaesitor\b/i.test(r.text.trim()));
  if (quaesitor) return { what: 'investigations for the Order, as a Quaesitor', ability: 'code-of-hermes', everyYears: 1 };
  if (c.house === 'mercere') return { what: 'a season carrying messages, as the Redcaps do', ability: 'area-lore', everyYears: 7 };
  return undefined;
}

/** A sensible list by what the character is: a magus’ by its archetype (role), a Redcap’s, anyone else’s. */
export function defaultPriorities(c: Character, o: { role?: string; arts?: Art[]; ungifted?: boolean } = {}): SeasonPriority[] {
  const arts = o.arts?.length ? o.arts : undefined;
  const list = (kinds: PriorityKind[]): SeasonPriority[] => kinds.map((kind) => (arts && ['read', 'vis', 'invent', 'enchant'].includes(kind) ? { kind, arts } : { kind }));
  // a Redcap is on the road; anyone else without the Gift reads when there is a book for them, and practices
  if (o.ungifted) return list(['travel', 'travel', 'travel', 'read', 'practice']);
  if (c.type !== 'magus') return list(['read', 'practice']);
  const kinds = ROLE_PRIORITIES[o.role ?? ''] ?? ROLE_PRIORITIES.default;
  // a House duty comes after the Longevity Ritual
  return list(houseDuty(c) ? [kinds[0], 'house', ...kinds.slice(1)] : kinds);
}

/** A magus's list by archetype (role), from the Longevity Ritual on. */
const ROLE_PRIORITIES: Record<string, PriorityKind[]> = {
  politician: ['longevity', 'service', 'politics', 'read', 'invent', 'vis', 'read', 'practice'],
  social: ['longevity', 'service', 'politics', 'read', 'invent', 'vis', 'read', 'practice'],
  scholar: ['longevity', 'service', 'read', 'write', 'read', 'vis', 'invent', 'practice'],
  explorer: ['longevity', 'service', 'travel', 'read', 'vis', 'invent', 'practice'],
  lab: ['longevity', 'service', 'invent', 'read', 'enchant', 'vis', 'lab', 'practice'],
  enchanter: ['longevity', 'service', 'enchant', 'invent', 'read', 'vis', 'lab', 'practice'],
  default: ['longevity', 'service', 'read', 'vis', 'invent', 'read', 'practice'],
};

export interface PriorityChoice {
  kind: PriorityKind;
  standing: StandingActivity;
  /** what it is, in a few words (“Read Principles of Rego”) */
  what: string;
  /** done for the covenant once the season is run: an enchantment that raises its income (Magical Improvement), or dealing with a calamity */
  after?: 'improve-income' | 'face-trouble';
  troubleUid?: string;
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
  /** the aura would cost lab work dearly this season (Lübeck's Divine aura, with no magestone free) */
  hostile?: string;
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
  // lab work is planned in the aura it would be done in: under a magestone when one is free; in an
  // aura that costs the Lab Total dearly with none, it waits for a season that has one
  const faerieMagic = d.virtues.some((v) => v.cv.defId === 'faerie-magic');
  const labCtx = labAuraFor(c, cov, ctx, year, season, { faerieMagic }) ?? ctx;
  const mod = auraModifier('Magic', labCtx.aura, { faerieMagic }).mod;
  const hostile = d.isMagus && mod < 0 ? `the ${labCtx.aura.realm} aura of ${labCtx.aura.strength} would take ${-mod} from its Lab Totals${cov?.labAura ? `, and ${cov.labAura.name} are taken this season` : ''}` : undefined;
  const x: Ctx = { c, d, ctx: labCtx, cov, data, year, season, rng, chars, hostile };
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

type Try = (x: Ctx, p: SeasonPriority) => { standing: StandingActivity; what: string; after?: PriorityChoice['after']; troubleUid?: string } | string;

const workable = (x: Ctx, p: LabProject): string | undefined => {
  const plan = planProject(p, x.c, x.d, x.ctx, { subject: x.c, data: x.data });
  return plan.problems[0] ?? visShort(p, x.c, x.ctx, plan);
};
const labSeason = (p: LabProject, what: string) => ({ standing: { kind: 'lab' as const, projectUid: p.uid }, what });

/** A magus's Magic Theory score, from the sheet (no derivation needed). */
function theoryScore(c: Character): number {
  const a = c.abilities.find((x) => x.abilityId === 'magic-theory');
  return a ? abilityScoreFromXp(Object.values(a.xp).reduce((t: number, v) => t + (v ?? 0), 0)) : 0;
}

/** The library's best Magic Theory book for a magus who cannot yet handle a ritual's vis. */
function theoryBook(x: Ctx): { standing: StandingActivity; what: string } | undefined {
  const { c, d, cov } = x;
  const mt = c.abilities.find((a) => a.abilityId === d.theoryAbility);
  if (!cov || !mt) return undefined;
  let best: { uid: string; title: string; xp: number } | undefined;
  for (const b of cov.library) {
    if ((b.kind !== 'summa' && b.kind !== 'tractatus') || b.corrupt || b.subjectType !== 'ability' || b.subject !== mt.abilityId) continue;
    if (b.kind === 'tractatus' && b.readBy?.includes(c.id)) continue;
    const src = b.kind === 'summa' ? { kind: 'summa' as const, quality: b.quality, level: b.level, isArt: false, subject: b.title } : { kind: 'tractatus' as const, quality: b.quality, isArt: false, subject: b.title };
    const xp = computeStudy(d, src, { abilityUid: mt.uid }).xp;
    if (xp >= 5 && (!best || xp > best.xp)) best = { uid: b.uid, title: b.title, xp };
  }
  return best && { standing: { kind: 'read', bookUid: best.uid, target: `ability:${mt.uid}` }, what: `reading ${best.title}, to handle the vis of a Longevity Ritual` };
}

/** A Longevity Ritual for a covenant-mate who cannot make their own (too little Magic Theory for its vis), if this magus can. */
function ritualForMate(x: Ctx): { standing: StandingActivity; what: string } | undefined {
  const { c, d, cov } = x;
  if (!cov) return undefined;
  const taken = (id: string) => x.chars.some((z) => z.projects?.some((q) => q.kind === 'longevity' && !q.done && q.subjectId === id && z.id !== c.id));
  const mates = x.chars
    .filter((y) => y.id !== c.id && cov.memberIds.includes(y.id) && y.type === 'magus' && !y.wounds.dead && !y.retired && !y.longevity && y.age >= 35 && !taken(y.id))
    .filter((y) => longevityVisCost(y.age, y.longevityLapsed?.extraVis ?? 0) > 2 * theoryScore(y))
    .sort((a, b) => b.age - a.age);
  for (const y of mates) {
    let p = c.projects?.find((q) => q.kind === 'longevity' && !q.done && q.subjectId === y.id);
    const fresh = !p;
    p ??= { ...newProject('longevity'), name: `Longevity Ritual for ${y.name}`, subjectId: y.id, visFrom: 'covenant' };
    const plan = planProject(p, c, d, x.ctx, { subject: y, data: x.data });
    if (plan.problems.length || visShort(p, c, x.ctx, plan)) continue;
    if (fresh) c.projects = [...(c.projects ?? []), p];
    return labSeason(p, `a Longevity Ritual for ${y.name}`);
  }
  return undefined;
}

const TRY: Record<PriorityKind, Try> = {
  longevity: (x) => {
    const { c, d } = x;
    if (!d.isMagus) return 'only a magus makes a Longevity Ritual in the lab';
    if (!x.ctx.lab) return 'no laboratory';
    if (x.hostile) return x.hostile;
    const needs = !c.longevity && (c.age >= 35 || !!c.longevityLapsed);
    let own: string | undefined;
    if (needs) {
      let p = c.projects?.find((q) => q.kind === 'longevity' && !q.done && (!q.subjectId || q.subjectId === c.id));
      if (!p) {
        p = { ...newProject('longevity'), name: 'Longevity Ritual', visFrom: x.cov ? 'covenant' : undefined };
        c.projects = [...(c.projects ?? []), p];
      }
      const problem = workable(x, p);
      if (!problem) return labSeason(p, 'a Longevity Ritual');
      own = `the ritual cannot be made yet: ${problem}`;
      // more vis than Magic Theory lets the magus handle: a Magic Theory book in the library helps
      if (/more than you can handle/.test(problem)) {
        const book = theoryBook(x);
        if (book) return book;
      }
    }
    // a covenant-mate whose Magic Theory cannot handle the vis of their own ritual: make it for them
    const mate = ritualForMate(x);
    if (mate) return mate;
    return own ?? (c.longevity ? 'has one' : 'not yet 35');
  },
  apprentice: (x) => {
    const ap = x.c.apprentice;
    if (!ap) return 'no apprentice';
    const a = ensureAbility(x.c, 'teaching', {});
    return { standing: { kind: 'exposure', target: `ability:${a.uid}` }, what: `teaching ${ap.name}, the apprentice` };
  },
  house: (x) => {
    const duty = houseDuty(x.c);
    if (!duty) return 'no House duty';
    const last = Math.max(-Infinity, ...x.c.seasonLog.filter((e) => e.priority === 'house').map((e) => e.year));
    if (duty.everyYears > 1 && x.year - last < duty.everyYears) return `done within ${duty.everyYears} years (${last})`;
    const where = duty.ability === 'area-lore' ? `${x.cov?.tribunal || 'Rhine'} Tribunal` : undefined;
    const a = ensureAbility(x.c, duty.ability, {}, where);
    return { standing: { kind: 'exposure', target: `ability:${a.uid}` }, what: duty.what };
  },
  service: (x) => {
    const { c, d, cov } = x;
    // a calamity still weighing on the covenant: one magus a season deals with the worst of it
    const trouble = cov && d.isMagus ? worstTrouble(cov, x.year, x.season) : undefined;
    if (trouble) {
      const lore = ensureAbility(c, 'organization-lore', {}, 'Order of Hermes');
      return { standing: { kind: 'exposure', target: `ability:${lore.uid}` }, what: `${CALAMITY_BY_ID.get(trouble.kind)?.remedy ?? 'deals with'} (${trouble.label.split(' (')[0].toLowerCase()} at ${cov!.name})`, after: 'face-trouble', troubleUid: trouble.uid };
    }
    // a living covenant short of money: an enchantment or ritual to raise its income (Covenants ch.5, Magical Improvement)
    if (cov?.living?.needs?.money && d.isMagus && x.ctx.lab && !x.hostile && (cov.living.improved ?? 0) < MAX_IMPROVEMENTS && cov.living.improvedYear !== x.year) {
      const mt = c.abilities.find((a) => a.abilityId === d.theoryAbility);
      if (mt && cov.visStocks.some((v) => !v.pair && v.pawns >= 2))
        return { standing: { kind: 'exposure', target: `ability:${mt.uid}` }, what: `an enchantment to raise ${cov.name}’s income (Magical Improvement)`, after: 'improve-income' };
    }
    // vis for the covenant when its stores run low (under five pawns a member, or short of what it must hold back), else its duties
    // (a living covenant keeps five pawns a member as well; the players' covenant only what its Aegis and Longevity Rituals need)
    const low = cov && (cov.living ? cov.visStocks.reduce((t, v) => t + v.pawns, 0) < 5 * Math.max(1, cov.memberIds.length) || (cov.living.needs?.vis ?? 0) > 0 : visShortfall(cov, x.chars.filter((m) => cov.memberIds.includes(m.id))).length > 0);
    if (low && d.isMagus && x.ctx.lab && cov && !x.hostile && x.ctx.aura.realm === 'Magic' && x.ctx.aura.strength > 0) {
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
      // a title the library does not have yet
      const taken = new Set([...cov.library.map((b) => b.title), ...(c.writing ?? []).map((w) => w.title)]);
      const titles = TITLES.map((t) => `${t} ${s.label}`).filter((t) => !taken.has(t));
      const title = titles.length ? titles[Math.floor(x.rng() * titles.length)] : `${pickTitle(x.rng)} ${s.label}, ${written(s.subject) + 1}`;
      const w: WritingProject = {
        uid: uid(), kind: 'tractatus', title, subjectType: s.isArt ? 'art' : 'ability', subject: s.subject, exposure: s.exposure, language: c.abilities.find((a) => a.uid === lang.uid)?.param || 'Latin',
        level: 0, quality: r.quality, textQuality: r.textQuality, points: 0, needed: r.needed || 1, rate: Math.max(1, r.perSeason), authorScore: s.score, covenantId: cov.id, started: { year: x.year, season: x.season },
      };
      c.writing = [...(c.writing ?? []), w];
      return { standing: { kind: 'write', projectUid: w.uid }, what: `writing ${w.title}` };
    }
    return 'nothing more to write a tractatus on';
  },
  read: (x, p) => {
    const best = bestStudy(x.c, x.d, x.cov, x.year, x.season, x.chars, focusArts(x.d, p));
    if (!best || best.xp < 5) return best ? `the best book or teacher teaches only ${best.xp} xp` : x.cov?.library.length ? 'no book or teacher it can learn from' : 'no library or teacher';
    return { standing: best.standing, what: best.what };
  },
  vis: (x, p) => {
    const { c, d, cov } = x;
    if (!d.isMagus) return 'only a magus studies from vis';
    for (const art of focusArts(d, p)) {
      const pawns = visForStudy(d.arts[art].score);
      if (visAvailable(purseOf(c).vis, [art]) >= pawns) return { standing: { kind: 'vis', target: `art:${art}` }, what: `studying ${ART_NAMES[art]} vis` };
      // the covenant's vis beyond what it holds back for its Aegis and its magi's Longevity Rituals
      if (cov && visAvailable(spareVis(cov, x.chars.filter((m) => cov.memberIds.includes(m.id))), [art]) >= 2 * pawns) return { standing: { kind: 'vis', target: `art:${art}`, visFrom: 'covenant' }, what: `studying ${ART_NAMES[art]} vis from the covenant’s stores` };
    }
    return `no ${focusArts(d, p).map((a) => ART_NAMES[a]).join(' or ')} vis to spare`;
  },
  invent: (x, p) => {
    const { c, d, data } = x;
    if (!d.isMagus) return 'only a magus invents spells';
    if (!x.ctx.lab) return 'no laboratory';
    if (x.hostile) return x.hostile;
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
  enchant: (x, p) => {
    const { c, d } = x;
    if (!d.isMagus) return 'only a magus enchants items';
    if (!x.ctx.lab) return 'no laboratory';
    if (x.hostile) return x.hostile;
    const open = c.projects?.find((q) => q.kind === 'instill' && !q.done && !q.failed);
    if (open) {
      const problem = workable(x, open);
      if (!problem) return labSeason(open, open.name.replace(/^./, (ch) => ch.toLowerCase()));
    }
    if (c.items.filter((i) => i.creatorId === c.id).length >= MAX_ITEMS) return `has made ${MAX_ITEMS} enchanted items already`;
    // one of its own spells in its Arts, the strongest it can put in an item this season
    const focus = focusArts(d, p);
    const spells = c.spells.map((s) => s.spell).filter((s) => s.level && !s.ritual && !s.general && (focus.includes(s.technique) || focus.includes(s.form)));
    const made = new Set(c.items.flatMap((i) => i.effects.map((e) => e.name)));
    const tried: string[] = [];
    const top = [...spells].sort((a, b) => (b.level ?? 0) - (a.level ?? 0)).filter((s) => !made.has(s.name)).slice(0, 4);
    // a lasting device first, the strongest it can make; charms only when none can be
    for (const charged of [false, true])
      for (const sp of top) {
        const r = enchantProject(x, sp, charged);
        if (typeof r !== 'string') return labSeason(r.p, r.what);
        if (charged) tried.push(`${sp.name}: ${r}`);
      }
    return tried.length ? tried[0] : `no spell of its own in ${focus.map((a) => ART_NAMES[a]).join(' or ')} to put in an item`;
  },
  lab: (x) => {
    const { c, d } = x;
    if (!d.isMagus || !x.ctx.lab) return 'no laboratory';
    if (x.hostile) return x.hostile;
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
    // in an aura that costs it dearly, a magus reads up on Magic Theory instead of working a project
    if (x.d.isMagus && x.hostile) {
      const mt = x.c.abilities.find((a) => a.abilityId === x.d.theoryAbility);
      if (mt) return { standing: { kind: 'exposure', target: `ability:${mt.uid}` }, what: 'study of Magic Theory, away from the lab' };
    }
    if (x.d.isMagus) return { standing: { kind: 'lab' }, what: 'lab work' };
    return { standing: { kind: 'practice' }, what: 'practice' };
  },
};

/**
 * The best a season of study can do for a character from what its covenant has: the library's books
 * (a summa below its Level, a tractatus not yet read, not one another member reads this season) and
 * the covenant's teachers with a season left this year (an Ability the character has, which the
 * teacher knows better). A magus weighs its favored Arts above its Abilities.
 */
export function bestStudy(c: Character, d: DerivedCharacter, cov: Covenant | undefined, year: number, season: Season, chars: Character[], focus: Art[] = []): { standing: StandingActivity; what: string; xp: number } | undefined {
  if (!cov) return undefined;
  const inUse = new Set(chars.filter((o) => o.id !== c.id).flatMap((o) => o.seasonLog.filter((e) => e.year === year && e.season === season && e.bookId).map((e) => e.bookId!)));
  let best: { standing: StandingActivity; what: string; xp: number; value: number } | undefined;
  const weigh = (xp: number, isArt: boolean, art?: Art) => xp * (isArt ? (art && focus.includes(art) ? 1.5 : 1) : d.isMagus ? 0.8 : 1.2);
  const consider = (standing: StandingActivity, what: string, xp: number, value: number) => {
    if (xp > 0 && (!best || value > best.value)) best = { standing, what, xp, value };
  };
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
      const xp = computeStudy(d, src, { art }).xp;
      consider({ kind: 'read', bookUid: b.uid, target: `art:${art}` }, `reading ${b.title}`, xp, weigh(xp, true, art));
    } else if (b.subjectType === 'ability') {
      const mine = c.abilities.find((a) => a.abilityId === b.subject && (!b.param || a.param === b.param));
      if (!mine) continue;
      const xp = computeStudy(d, src, { abilityUid: mine.uid }).xp;
      consider({ kind: 'read', bookUid: b.uid, target: `ability:${mine.uid}` }, `reading ${b.title}`, xp, weigh(xp, false));
    }
  }
  // the covenant's teachers: two seasons a year each (DE), the drill sergeant's one for the turb aside
  for (const sp of cov.specialists.filter((x) => teaches(x) && x.role !== 'drill-sergeant' && !(x.taught?.year === year && x.taught.seasons >= 2))) {
    for (const t of specAbilities(sp)) {
      const mine = c.abilities.find((a) => a.abilityId === t.id && (a.param ?? '') === (t.param ?? ''));
      if (!mine || (d.abilityByUid.get(mine.uid)?.score ?? 0) >= t.score) continue;
      const xp = computeStudy(d, { kind: 'teacher', com: specChar(sp, 'Com'), teaching: sp.teaching ?? 0, teacherScore: t.score, students: 1, goodTeacher: !!sp.goodTeacher, isArt: false, subject: t.label ?? '' }, { abilityUid: mine.uid }).xp;
      consider({ kind: 'taught', teacher: `spec:${sp.uid}`, target: `ability:${mine.uid}` }, `taught ${d.abilityByUid.get(mine.uid)?.name ?? t.label} by ${sp.name || 'the covenant’s teacher'}`, xp, weigh(xp, false));
    }
  }
  return best && { standing: best.standing, what: best.what, xp: best.xp };
}

const MAX_ITEMS = 8;
/** What a lesser enchantment can be made in, by the pawns of vis it takes (DE, Opening the Enchantment: material × size). */
const VESSELS: { material: string; size: EnchantedItem['size']; noun: string }[] = [
  { material: 'wood', size: 'small', noun: 'Wand' },
  { material: 'silver', size: 'tiny', noun: 'Ring' },
  { material: 'hard stone', size: 'small', noun: 'Amulet' },
  { material: 'base metal', size: 'small', noun: 'Rod' },
  { material: 'semi-precious gem', size: 'tiny', noun: 'Stone' },
  { material: 'base metal', size: 'medium', noun: 'Bell' },
  { material: 'silver', size: 'medium', noun: 'Cup' },
  { material: 'gold', size: 'small', noun: 'Circlet' },
];

/**
 * An item for a spell: a lesser enchanted device when the Lab Total reaches twice the effect's level
 * (as many uses a day as that allows), else a charged item when it reaches the level (DE, Lesser
 * Enchanted Items, Charged Items). The item and the project are added when the season can be worked.
 */
function enchantProject(x: Ctx, sp: SpellDef, charged: boolean): { p: LabProject; what: string } | string {
  const { c, d } = x;
  const level = sp.level ?? 0;
  const effect = {
    uid: uid(), name: sp.name, technique: sp.technique, form: sp.form, requisites: sp.requisites ?? [], baseLevel: level, range: sp.range, duration: sp.duration, target: sp.target,
    usesPerDay: '1', penetration: 0, concentration: false, effectUse: false, environmentalTrigger: false, fastTrigger: false, linkedTrigger: false, expiry: 'none' as const, modifiedLevel: level, pending: true,
  };
  const item: EnchantedItem = { uid: uid(), name: sp.name, kind: 'lesser', material: 'wood', size: 'small', shapeMaterialIds: [], openedPawns: 0, effects: [effect], attunements: [], creatorId: c.id };
  const p: LabProject = { ...newProject('instill'), itemUid: item.uid, effectUid: effect.uid, technique: sp.technique, form: sp.form, level, name: '', visFrom: x.cov ? 'covenant' : 'purse' };
  c.items.push(item);
  const total = planProject(p, c, d, x.ctx, { data: x.data }).total?.total ?? 0;
  // as many uses a day as still leave the Lab Total twice the level
  const uses = charged ? undefined : [...FREQUENCY].reverse().find((f) => f.value !== 'unlimited' && investEffect(total, level + f.mod, 'lesser').possible);
  if (!charged && !uses) {
    c.items.pop();
    return `the Lab Total (${total}) is not twice its level (${level})`;
  }
  if (uses) {
    effect.usesPerDay = uses.value;
    effect.modifiedLevel = level + uses.mod;
    const pawns = Math.ceil(effect.modifiedLevel / 10);
    // one of the smaller things that can take the vis
    const fit = VESSELS.filter((v) => openingCost(v.material, v.size) >= pawns).slice(0, 4);
    const vessel = fit.length ? fit[Math.floor(x.rng() * fit.length)] : VESSELS[VESSELS.length - 1];
    Object.assign(item, { material: vessel.material, size: vessel.size, name: `${vessel.noun} of ${sp.name}` });
    p.name = `Enchant the ${item.name.replace(/^./, (ch) => ch.toLowerCase())}`;
  } else if (chargedItemCharges(total, level)) {
    Object.assign(item, { kind: 'charged', material: 'cloth', size: 'tiny', name: `Charm of ${sp.name}`, charges: 0 });
    p.name = `Make charms of ${sp.name}`;
  } else {
    c.items.pop();
    return `the Lab Total (${total}) does not reach its level (${level})`;
  }
  const problem = workable(x, p);
  if (problem) {
    c.items.pop();
    return problem;
  }
  c.projects = [...(c.projects ?? []), p];
  return { p, what: item.kind === 'charged' ? `charms of ${sp.name}` : `enchanting the ${item.name.replace(/^./, (ch) => ch.toLowerCase())} (${effect.usesPerDay} use${effect.usesPerDay === '1' ? '' : 's'} a day)` };
}

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
