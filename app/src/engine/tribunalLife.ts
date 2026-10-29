// The Tribunal's life beyond each magus's seasons, for the living covenants built from its book: the
// motions put to each gathering and how the sigils fall (the Rhine's proxy sigils by rank, House
// Tremere's held by its exarchs, each gild's stand, the players' magi as the troupe sets them);
// promotions to master and archmage, conferred at the gathering before the votes; certamen between
// magi of covenants at odds; apprentices taken, taught a season a year and brought to the Gauntlet;
// and the magi who belong to no covenant, moving from host to host under the Rhine's guest-laws.
// The Rhine's own customs (proxy sigils by rank, the gilds' stands, promotions, a journeyman's
// apprentice being no filius, the guest's fee) follow its optional rule, Ranks, gilds and voting
// sigils; with it off every magus has one sigil and votes their covenant's way or their own.

import { ARTS, ART_NAMES, FORMS, TECHNIQUES, type Form, type Technique } from '../data';
import { bookCovenant, tribunalBook, type BookMotion, type TribunalBook } from '../data/livingCovenants';
import { deriveCharacter, type DerivedCharacter } from './character/derive';
import { covenantOf } from './context';
import { stressDie, type Rng } from './dice';
import { foundingAtGathering } from './founding';
import { freshName } from './generate/names';
import { newLab } from './lab';
import { magiTarget, otherMagus, type LivingContext } from './living';
import { certamenFatigue, certamenTotals } from './magic';
import { optionOn } from './optional';
import { RHINE_RANKS } from './tribunal';
import type { Character, Covenant, Saga, Season, TribunalNews, TribunalVote } from './types';
import { addVis, purseOf, takeVis, visText } from './vis';
import { uid } from '../util/id';

type Line = { who: string; text: string; tribunal: string };
interface State {
  saga: Saga;
  characters: Character[];
  covenants: Covenant[];
}

const news = (year: number, season: Season, x: Omit<TribunalNews, 'uid' | 'year' | 'season'>): TribunalNews => ({ uid: uid(), year, season, ...x });
const alive = (c: Character) => !c.wounds.dead && !c.retired;
const MASTERLY = new Set(['master', 'archmage']);
const pick = <T,>(rng: Rng, xs: T[]): T => xs[Math.floor(rng() * xs.length)];

/** Years since the Gauntlet. */
export function yearsSinceGauntlet(c: Character): number {
  return Math.max(0, c.age - c.creation.apprenticeshipStartAge - 15);
}

/** A magus's best Art score. */
function bestArt(d: DerivedCharacter): number {
  return Math.max(...ARTS.map((a) => d.arts[a].score));
}

// ================================================================ sigils and votes

/** The Rhine's customs are in play (the optional rule Ranks, gilds and voting sigils). */
export function rhineCustoms(saga: Saga): boolean {
  return optionOn(saga, 'rhineGilds');
}

/** A magus's voting sigils at a gathering: their own and, under the Rhine's customs, those of retired magi held by proxy (a master one, an archmage two). */
export function sigilsOf(c: Character, customs = true): number {
  if (!c.rhine || !customs) return 1;
  return RHINE_RANKS.find((r) => r.id === c.rhine!.rank)?.sigils ?? 1;
}

export interface Voter {
  c: Character;
  /** the covenant they vote from (none for a wanderer) */
  cov?: Covenant;
  /** one of the players' magi: votes as the troupe sets it */
  players: boolean;
  sigils: number;
  /** the magus who casts their sigils (House Tremere's exarchs hold the sigils of the rest of the House) */
  heldBy?: string;
}

/** Has a covenant that was not yet a member of the Tribunal (Heorot) been admitted? */
export function admitted(cov: Covenant, votes: TribunalVote[] = []): boolean {
  const joins = cov.living ? bookCovenant(cov.living.key)?.cov.joins : undefined;
  return !joins || votes.some((v) => v.motionId === joins && v.passed);
}

/**
 * Who votes at a gathering, and with how many sigils: every magus of a living covenant (but one that
 * is not yet admitted, and those inactive in all but name), the wanderers, and the players' magi.
 */
export function gatheringVoters(book: TribunalBook, characters: Character[], covenants: Covenant[], votes: TribunalVote[] = [], customs = true): Voter[] {
  const out: Voter[] = [];
  for (const c of characters) {
    if (c.type !== 'magus' || !alive(c) || c.rhine?.rank === 'apprentice') continue;
    const cov = covenantOf(c, covenants);
    const living = !!cov?.living || !!c.wanderer;
    if (living && c.standing?.kind === 'none') continue;
    if (cov?.living && !c.wanderer && (cov.living.paused || !admitted(cov, votes))) continue;
    if (!living && !cov) continue;
    out.push({ c, cov: c.wanderer ? undefined : cov, players: !living, sigils: sigilsOf(c, customs) });
  }
  // House Tremere: the exarchs hold the sigils of the House's other magi (first those at their covenants, then the rest)
  const holders = new Set((book.heldSigils ?? []).map((h) => h.holder));
  for (const h of book.heldSigils ?? []) {
    const holder = out.find((v) => v.c.name === h.holder && !v.players);
    if (!holder) continue;
    for (const v of out)
      if (!v.players && !v.heldBy && !holders.has(v.c.name) && v.c.house === h.house && (!h.covenants || h.covenants.includes(v.cov?.living?.key ?? ''))) v.heldBy = holder.c.id;
  }
  return out;
}

export type Stand = 'for' | 'against' | 'abstain';

/** How a voter stands on a motion: the players' as set; else their covenant's stand, else their gild's (under the Rhine's customs), now and then going against it (the Oath forbids binding a vote). */
export function standOn(m: BookMotion, v: Voter, saga: Saga, rng: Rng, customs = true): Stand {
  if (v.players) return saga.playerVotes?.[m.id]?.[v.c.id] ?? 'abstain';
  const as = (s: 'for' | 'against' | 'split' | undefined): Stand | undefined => (s === 'split' ? (rng() < 0.5 ? 'for' : 'against') : s);
  const key = v.cov?.living?.key;
  const gild = customs ? v.c.rhine?.gild : undefined;
  let s = as(key ? m.covenants?.[key] : undefined) ?? as(gild ? m.gilds[gild] : undefined);
  if (!s) {
    const r = rng();
    return r < 0.35 ? 'for' : r < 0.7 ? 'against' : 'abstain';
  }
  if (rng() < 0.08) s = s === 'for' ? 'against' : 'for';
  return s;
}

/** The motions that come before a gathering: those the book has for this year, and now and then one that failed (or came before the saga began) again. */
export function motionsDue(book: TribunalBook, votes: TribunalVote[], year: number, rng: Rng): BookMotion[] {
  return (book.motions ?? []).filter((m) => {
    if (votes.some((v) => v.motionId === m.id && (v.passed || v.year === year))) return false;
    if (m.year === year) return true;
    return m.year < year && rng() * 100 < (m.again ?? 0);
  });
}

/** A motion put to the vote: each voter's stand (a held sigil goes with its holder), and the sigils counted. */
export function voteOn(m: BookMotion, voters: Voter[], saga: Saga, year: number, rng: Rng, customs = true): TribunalVote {
  const stands = new Map<string, Stand>();
  for (const v of voters) if (!v.heldBy) stands.set(v.c.id, standOn(m, v, saga, rng, customs));
  const tally = { for: 0, against: 0, abstain: 0 };
  const byCovenant: TribunalVote['byCovenant'] = {};
  for (const v of voters) {
    const s = stands.get(v.heldBy ?? v.c.id) ?? 'abstain';
    tally[s] += v.sigils;
    const k = v.cov?.id ?? 'wanderers';
    byCovenant[k] ??= { for: 0, against: 0 };
    if (s !== 'abstain') byCovenant[k][s] += v.sigils;
  }
  return { uid: uid(), motionId: m.id, year, title: m.title, ...tally, passed: tally.for > tally.against, byCovenant };
}

// ================================================================ promotions

/**
 * The Rhine's promotions, conferred at the gathering: a journeyman twenty years or more from the
 * Gauntlet with a name for magical prowess (an Art of 15, a summa, or spells of their own) becomes a
 * master when three masters of three other covenants, Houses and gilds give their marks (thirty or
 * forty years is the norm); a master sixty years from the Gauntlet with an Art of 25 may now and then
 * become an archmage, meeting a challenge one sets them.
 * The players' magi are left to the troupe.
 */
function promotions(voters: Voter[], state: State, g: LivingContext, year: number, season: Season, rng: Rng): { lines: Line[]; news: TribunalNews[] } {
  const lines: Line[] = [];
  const out: TribunalNews[] = [];
  const authors = new Set(state.covenants.flatMap((cov) => cov.library.filter((b) => b.kind === 'summa' && b.authorId).map((b) => b.authorId!)));
  for (const v of voters) {
    const c = v.c;
    if (v.players || !c.rhine) continue;
    const pg = yearsSinceGauntlet(c);
    const where = v.cov?.name ?? 'the road';
    if (c.rhine.rank === 'journeyman') {
      if (pg < 20 || rng() >= (pg >= 40 ? 0.4 : pg >= 30 ? 0.25 : 0.08)) continue;
      const d = deriveCharacter(c, g.data, g.rules);
      const prowess = bestArt(d) >= 15 || authors.has(c.id) || c.spells.filter((s) => s.source === 'play').length >= 4;
      if (!prowess) continue;
      const pool = voters.filter((o) => o !== v && !o.players && MASTERLY.has(o.c.rhine?.rank ?? '') && o.c.house !== c.house && (!v.cov || o.cov?.id !== v.cov.id)).sort(() => rng() - 0.5);
      const marks: Voter[] = [];
      for (const o of pool) {
        if (marks.some((p) => (p.cov && p.cov.id === o.cov?.id) || p.c.house === o.c.house || (!!p.c.rhine?.gild && p.c.rhine.gild === o.c.rhine?.gild))) continue;
        marks.push(o);
        if (marks.length === 3) break;
      }
      if (marks.length < 3) continue;
      c.rhine.rank = 'master';
      c.rhine.sponsors = marks.map((m) => m.c.name);
      c.reputations.push({ uid: uid(), text: 'Master of the Rhine', scope: 'Hermetic', score: 2 });
      v.sigils = sigilsOf(c);
      const text = `${c.name} of ${where} is made a master of the Rhine, with the marks of ${marks.map((m) => m.c.name).join(', ')}: a retired magus’s sigil is placed in their care.`;
      lines.push({ who: c.name, text, tribunal: v.cov?.id ?? 'wanderers' });
      out.push(news(year, season, { kind: 'event', covenantId: v.cov?.id, characterId: c.id, text }));
    } else if (c.rhine.rank === 'master') {
      if (pg < 60 || rng() >= 0.04) continue;
      const d = deriveCharacter(c, g.data, g.rules);
      const setters = voters.filter((o) => o !== v && o.c.rhine?.rank === 'archmage' && o.cov?.id !== v.cov?.id);
      if (bestArt(d) < 25 || !setters.length) continue;
      const setter = pick(rng, setters);
      c.rhine.rank = 'archmage';
      c.reputations.push({ uid: uid(), text: 'Archmage', scope: 'Hermetic', score: 4 });
      v.sigils = sigilsOf(c);
      const text = `${c.name} of ${where} meets the challenge ${setter.c.name} set them and is named an archmage: a second proxy sigil is theirs.`;
      lines.push({ who: c.name, text, tribunal: v.cov?.id ?? 'wanderers' });
      out.push(news(year, season, { kind: 'event', covenantId: v.cov?.id, characterId: c.id, text }));
    }
  }
  return { lines, news: out };
}

// ================================================================ certamen

export interface CertamenResult {
  winner: Character;
  loser: Character;
  technique: Technique;
  form: Form;
  rounds: number;
  how: 'unconscious' | 'surrender' | 'time';
  /** Fatigue levels each lost (challenger, defender) */
  lost: [number, number];
}

/** Fatigue penalties by levels lost: Fresh, Winded, Weary, Tired, Dazed; the fifth level lost is unconsciousness. */
const FATIGUE_PENALTY = [0, 0, -1, -3, -5];

/**
 * A certamen duel played out (DE, Certamen): the challenger chooses the Technique, the defender the
 * Form (each their best); initiative once; each round each attacks with the stronger Art and defends
 * with the other, and loses a Fatigue level for every five points (or part) of the other's Weakening
 * Total (with the Attack Advantage) over their Resistance. The first to fall unconscious loses; one
 * worn and well behind may concede; after thirty rounds the less worn has it.
 */
export function certamenDuel(a: Character, da: DerivedCharacter, b: Character, db: DerivedCharacter, rng: Rng): CertamenResult {
  const technique = [...TECHNIQUES].sort((x, y) => da.arts[y].score - da.arts[x].score)[0];
  const form = [...FORMS].sort((x, y) => db.arts[y].score - db.arts[x].score)[0];
  const side = (d: DerivedCharacter) => {
    const t = certamenTotals(d, technique, form);
    const byTechnique = t.attack.technique.total >= t.attack.form.total;
    return {
      init: t.initiative.total,
      attack: byTechnique ? t.attack.technique.total : t.attack.form.total,
      defense: byTechnique ? t.defense.form.total : t.defense.technique.total,
      weakening: t.weakening.total,
      resistance: t.resistance.total,
    };
  };
  const s = [side(da), side(db)];
  const who = [a, b];
  const roll = () => stressDie(1, rng).value;
  const lost: [number, number] = [0, 0];
  const done = (i: number, how: CertamenResult['how'], rounds: number): CertamenResult => ({ winner: who[i], loser: who[1 - i], technique, form, rounds, how, lost });
  const order = s[0].init + roll() >= s[1].init + roll() ? [0, 1] : [1, 0];
  for (let round = 1; round <= 30; round++) {
    for (const i of order) {
      const j = 1 - i;
      const attack = s[i].attack + FATIGUE_PENALTY[Math.min(4, lost[i])] + roll();
      const defense = s[j].defense + FATIGUE_PENALTY[Math.min(4, lost[j])] + roll();
      if (attack > defense) lost[j] += certamenFatigue(s[i].weakening + attack - defense, s[j].resistance);
      if (lost[j] >= 5) return done(i, 'unconscious', round);
      if (lost[j] >= 3 && lost[j] - lost[i] >= 2 && rng() < 0.5) return done(i, 'surrender', round);
    }
  }
  return done(lost[0] <= lost[1] ? 0 : 1, 'time', 30);
}

/** What magi of covenants at odds fall out over at a gathering; some stakes are vis, which the loser's covenant pays. */
const ISSUES: { text: string; vis?: number }[] = [
  { text: 'a vis source both covenants claim', vis: 3 },
  { text: 'precedence on the Tribunal field' },
  { text: 'an insult given in the Forum' },
  { text: 'the right to copy a book of the Great Library first' },
  { text: 'a disputed boundary between their lands', vis: 2 },
];

/**
 * Certamen at a gathering: between magi of living covenants the book sets against each other
 * (enemies half the time, hostile ones a quarter), of the same rank (in the Rhine a higher rank
 * simply has priority); and a challenge for the players' magi from a covenant that has grown to
 * dislike them, for the troupe to play out.
 */
function gatheringCertamen(voters: Voter[], state: State, g: LivingContext, year: number, season: Season, rng: Rng): { lines: Line[]; news: TribunalNews[] } {
  const lines: Line[] = [];
  const out: TribunalNews[] = [];
  const living = state.covenants.filter((c) => c.living && !c.living.paused);
  const magiOf = (cov: Covenant) => voters.filter((v) => !v.players && v.cov?.id === cov.id);
  const seen = new Set<string>();
  for (const A of living) {
    const found = bookCovenant(A.living!.key);
    for (const r of found?.cov.relations ?? []) {
      if (r.attitude !== 'enemy' && r.attitude !== 'hostile') continue;
      const B = living.find((x) => x.living!.key === r.with);
      const key = [A.id, B?.id].sort().join('|');
      if (!B || seen.has(key)) continue;
      seen.add(key);
      if (rng() >= (r.attitude === 'enemy' ? 0.5 : 0.25)) continue;
      // a challenger, and a defender of the same rank
      let pair: [Voter, Voter] | undefined;
      for (const x of magiOf(A).sort(() => rng() - 0.5)) {
        const ys = magiOf(B).filter((y) => (y.c.rhine?.rank ?? '') === (x.c.rhine?.rank ?? ''));
        if (ys.length) {
          pair = [x, pick(rng, ys)];
          break;
        }
      }
      if (!pair) continue;
      const [x, y] = pair;
      const res = certamenDuel(x.c, deriveCharacter(x.c, g.data, g.rules), y.c, deriveCharacter(y.c, g.data, g.rules), rng);
      const issue = pick(rng, ISSUES);
      const [win, lose] = res.winner === x.c ? [A, B] : [B, A];
      let paid = '';
      if (issue.vis) {
        const t = takeVis(lose.visStocks, [...ARTS], Math.min(issue.vis, lose.visStocks.reduce((n, s) => n + s.pawns, 0)));
        if (t.taken.length) {
          for (const v of t.taken) addVis(win.visStocks, v.art, v.pawns, v.pair);
          paid = ` ${lose.name} pays ${visText(t.taken)} vis.`;
          lose.log.push({ uid: uid(), year, season, text: `Lost a certamen at the gathering: paid ${visText(t.taken)} vis to ${win.name}.`, visDelta: t.taken.map((v) => ({ ...v, pawns: -v.pawns })) });
          win.log.push({ uid: uid(), year, season, text: `Won a certamen at the gathering: ${visText(t.taken)} vis from ${lose.name}.`, visDelta: t.taken });
        }
      }
      const how = res.how === 'unconscious' ? 'leaving them senseless' : res.how === 'surrender' ? 'who concedes' : 'on points, after a long duel';
      const text = `${x.c.name} of ${A.name} challenges ${y.c.name} of ${B.name} to certamen over ${issue.text}, in ${ART_NAMES[res.technique]} and ${ART_NAMES[res.form]}: ${res.winner.name} defeats ${res.loser.name} in ${res.rounds} round${res.rounds === 1 ? '' : 's'}, ${how}.${paid}`;
      lines.push({ who: x.c.name, text, tribunal: A.id });
      out.push(news(year, season, { kind: 'certamen', covenantId: win.id, characterId: res.winner.id, text }));
    }
  }
  // a challenge for the players' magi from a covenant that dislikes them
  const players = voters.filter((v) => v.players);
  if (players.length)
    for (const A of living) {
      const att = A.living!.attitude;
      if ((att !== 'hostile' && att !== 'enemy') || rng() >= (att === 'enemy' ? 0.5 : 0.3)) continue;
      const mine = magiOf(A);
      if (!mine.length) continue;
      const x = pick(rng, mine);
      const d = deriveCharacter(x.c, g.data, g.rules);
      const t = [...TECHNIQUES].sort((p, q) => d.arts[q].score - d.arts[p].score)[0];
      const issue = pick(rng, ISSUES);
      out.push(news(year, season, {
        kind: 'certamen', covenantId: A.id, characterId: x.c.id, approachKind: 'trouble',
        text: `${x.c.name} of ${A.name} challenges one of your magi to certamen at the gathering, over ${issue.text}${issue.vis ? ` (${issue.vis} pawns of vis at stake)` : ''}. ${x.c.name} chooses ${ART_NAMES[t]} as the Technique; your magus chooses the Form. Play it out on the magus’s sheet (Magic tab, Certamen), or refuse and concede.`,
      }));
    }
  return { lines, news: out };
}

/**
 * A Tribunal gathering's business, in the season it meets: promotions are conferred, the motions due
 * are voted on, and magi at odds settle matters by certamen. The votes go into the saga's record.
 */
export function tribunalGathering(state: State, g: LivingContext, year: number, season: Season, rng: Rng): { lines: Line[]; news: TribunalNews[] } {
  const book = tribunalBook(state.saga.tribunal);
  if (!book) return { lines: [], news: [] };
  const votes = state.saga.tribunalVotes ?? [];
  const customs = rhineCustoms(state.saga);
  const voters = gatheringVoters(book, state.characters, state.covenants, votes, customs);
  if (!voters.some((v) => !v.players)) return { lines: [], news: [] };
  const lines: Line[] = [];
  const out: TribunalNews[] = [];
  if (customs) {
    const p = promotions(voters, state, g, year, season, rng);
    lines.push(...p.lines);
    out.push(...p.news);
  }
  // the players' bid for a new covenant's recognition, with a sponsor from every other covenant, as
  // the covenants stand when the gathering opens (one admitted at it, as Heorot may be, is not asked)
  const founded = foundingAtGathering(book, state.saga, state.covenants, year);
  if (founded) {
    lines.push({ who: `The ${book.tribunal} Tribunal`, text: founded, tribunal: 'gathering' });
    out.push(news(year, season, { kind: 'vote', text: founded }));
  }
  for (const m of motionsDue(book, votes, year, rng)) {
    const v = voteOn(m, voters, state.saga, year, rng, customs);
    state.saga.tribunalVotes = [v, ...(state.saga.tribunalVotes ?? [])].slice(0, 60);
    const text = `${m.title}: ${v.passed ? 'carried' : 'defeated'}, ${v.for} sigil${v.for === 1 ? '' : 's'} for to ${v.against} against${v.abstain ? ` (${v.abstain} not cast)` : ''}. ${v.passed ? m.passed : m.failed}`;
    lines.push({ who: `The ${book.tribunal} Tribunal`, text, tribunal: 'gathering' });
    out.push(news(year, season, { kind: 'vote', text }));
  }
  const c = gatheringCertamen(voters, state, g, year, season, rng);
  lines.push(...c.lines);
  out.push(...c.news);
  return { lines, news: out };
}

// ================================================================ apprentices

/** May this magus take an apprentice? Under the Rhine's customs only a master or archmage (a journeyman's would be a hedge wizard); else one fifteen years from the Gauntlet. */
export function mayTeach(c: Character, customs = true): boolean {
  return c.type === 'magus' && (c.rhine && customs ? MASTERLY.has(c.rhine.rank) : yearsSinceGauntlet(c) >= 15);
}

const NAME_REGION: Record<string, string> = { Rhine: 'german' };

/**
 * The living magi's apprentices at the turn of the year: a master now and then takes one (seven to
 * thirteen years old) and teaches them a season a year from the priority list; after fifteen years
 * the apprentice passes the Gauntlet and becomes a journeyman of the master's House, who joins the
 * covenant (or one short of magi) or goes on the road as a peregrinator. An apprentice whose master
 * dies is taken in by another of the House at the covenant, or goes home.
 */
export function apprenticesYearEnd(state: State, g: LivingContext, year: number, rng: Rng): { lines: Line[]; news: TribunalNews[] } {
  const lines: Line[] = [];
  const out: TribunalNews[] = [];
  const living = state.covenants.filter((c) => c.living && !c.living.paused);
  const names = () => state.characters.map((c) => c.name);
  const magiAt = (cov: Covenant) => state.characters.filter((c) => cov.memberIds.includes(c.id) && c.type === 'magus' && alive(c)).length;
  const customs = rhineCustoms(state.saga);
  for (const cov of living) {
    const found = bookCovenant(cov.living!.key);
    if (!found) continue;
    const members = state.characters.filter((c) => cov.memberIds.includes(c.id) && c.type === 'magus');
    for (const c of members) {
      const ap = c.apprentice;
      if (!alive(c)) {
        if (!ap) continue;
        // an orphaned apprentice
        const next = members.find((o) => o !== c && alive(o) && o.house === c.house && mayTeach(o, customs) && !o.apprentice);
        c.apprentice = undefined;
        if (next) {
          next.apprentice = ap;
          ensureTeaching(next);
          out.push(news(year, 'Winter', { kind: 'apprentice', covenantId: cov.id, characterId: next.id, text: `${next.name} of ${cov.name} takes in ${ap.name}, the late ${c.name}’s apprentice.` }));
        } else out.push(news(year, 'Winter', { kind: 'apprentice', covenantId: cov.id, text: `${ap.name}, the late ${c.name}’s apprentice, has no one at ${cov.name} to finish their training, and goes home.` }));
        continue;
      }
      if (c.standing?.kind === 'none') continue;
      if (ap) {
        ap.seasons += c.seasonLog.filter((e) => e.year === year && e.priority === 'apprentice').length;
        if (year + 1 - ap.since < 15) continue;
        // the Gauntlet
        const age = ap.age + (year + 1 - ap.since);
        const fresh = otherMagus(c.house ?? 'ex-miscellanea', 'journeyman', found.book, found.cov, cov, { ...g, saga: state.saga }, rng, Math.floor(rng() * 1e9), names(), `the apprentices trained in play`, { pg: 0 });
        fresh.name = ap.name;
        fresh.gender = ap.gender;
        fresh.creation.apprenticeshipStartAge = Math.max(5, age - 15);
        fresh.age = age;
        fresh.birthYear = year + 1 - age;
        if (fresh.rhine) fresh.rhine.gild = c.rhine?.gild;
        fresh.notes = `Apprenticed to ${c.name} of ${cov.name} from ${ap.since}; passed the Gauntlet in ${year + 1}.${fresh.rhine && customs ? ' Introduced to the Tribunal at its next gathering.' : ''}`;
        c.apprentice = undefined;
        state.characters.push(fresh);
        const home = magiAt(cov) <= magiTarget(found.cov) ? cov : living.find((x) => x !== cov && magiAt(x) < magiTarget(bookCovenant(x.living!.key)?.cov ?? found.cov));
        let where: string;
        if (home) {
          home.memberIds.push(fresh.id);
          home.labs.push(newLab(`${fresh.name}’s laboratory`, fresh.id));
          fresh.covenantId = home.id;
          where = home === cov ? `stays at ${cov.name}` : `joins ${home.name}`;
        } else {
          // no place: on the road, a guest of the master's covenant to begin with
          fresh.wanderer = { wanders: 'peregrinator', since: year + 1, stay: 3, favors: 'any', book: found.book.book, key: fresh.name, visited: [cov.id] };
          cov.labs.push(newLab(`${fresh.name}’s laboratory`, fresh.id));
          fresh.covenantId = cov.id;
          where = `finds no covenant with a place and takes to the road as a peregrinator`;
        }
        const text = `${ap.name}, apprentice of ${c.name} of ${cov.name}, passes the Gauntlet and ${where}.`;
        lines.push({ who: cov.name, text, tribunal: cov.id });
        out.push(news(year, 'Winter', { kind: 'apprentice', covenantId: home?.id ?? cov.id, characterId: fresh.id, text }));
      } else if (mayTeach(c, customs) && c.age < 160 && rng() < 0.03) {
        const female = rng() < 0.5;
        const name = freshName(rng, NAME_REGION[found.book.tribunal] ?? 'english', female, names());
        const age = 7 + Math.floor(rng() * 7);
        c.apprentice = { name, gender: female ? 'Female' : 'Male', since: year + 1, age, seasons: 0 };
        ensureTeaching(c);
        const text = `${c.name} of ${cov.name} takes an apprentice: ${name}, aged ${age}.`;
        lines.push({ who: cov.name, text, tribunal: cov.id });
        out.push(news(year, 'Winter', { kind: 'apprentice', covenantId: cov.id, characterId: c.id, text }));
      }
    }
  }
  return { lines, news: out };
}

/** A season a year for the apprentice on the priority list, after the Longevity Ritual. */
function ensureTeaching(c: Character): void {
  const list = c.priorities ?? [];
  if (list.some((p) => p.kind === 'apprentice')) return;
  const at = list.findIndex((p) => p.kind !== 'longevity');
  list.splice(at < 0 ? list.length : at, 0, { kind: 'apprentice' });
  c.priorities = list;
}

// ================================================================ wanderers

/** Move a wanderer (and their laboratory) to a covenant, or onto the road. */
function moveWanderer(c: Character, to: Covenant | undefined, covenants: Covenant[], year: number): void {
  const w = c.wanderer!;
  const from = c.covenantId ? covenants.find((x) => x.id === c.covenantId) : undefined;
  if (from === to) return;
  if (from) {
    const i = from.labs.findIndex((l) => l.ownerId === c.id);
    if (i >= 0) w.lab = from.labs.splice(i, 1)[0];
  }
  c.covenantId = to?.id;
  if (to) {
    to.labs.push(w.lab ?? newLab(`${c.name}’s laboratory`, c.id));
    w.lab = undefined;
    w.visited = [...(w.visited ?? []), to.id].slice(-8);
  }
  w.since = year;
}

/**
 * A seasonal wanderer at the start of a season: to their winter host for the Winter (a players'
 * covenant that has welcomed them, else the book's, else any living covenant), onto the road for
 * the Summer and Autumn, and back to a host when the road is done.
 */
export function wanderersSeasonStart(state: State, year: number, season: Season, rng: Rng): Line[] {
  const lines: Line[] = [];
  for (const c of state.characters.filter((x) => x.wanderer?.wanders === 'seasonal' && alive(x))) {
    const w = c.wanderer!;
    const host = state.covenants.find((x) => x.id === c.covenantId);
    if (season === 'Summer' && host) {
      moveWanderer(c, undefined, state.covenants, year);
      lines.push({ who: c.name, text: `${c.name} leaves ${host.name} for the summer road.`, tribunal: 'wanderers' });
    } else if (season === 'Winter' && !host) {
      const welcome = w.welcome ? state.covenants.find((x) => x.id === w.welcome) : undefined;
      const living = state.covenants.filter((x) => x.living && !x.living.paused);
      const to = welcome ?? living.find((x) => x.living!.key === w.winters) ?? (living.length ? pick(rng, living) : undefined);
      if (!to) continue;
      moveWanderer(c, to, state.covenants, year);
      lines.push({ who: c.name, text: `${c.name} comes to ${to.name} to winter there.`, tribunal: to.living ? to.id : 'wanderers' });
    }
  }
  return lines;
}

/**
 * The wanderers at the turn of the year: each pays their host three pawns of vis (or a season's
 * service, by the later ruling); a peregrinator moves on after their stay (three years, sometimes
 * up to seven), favoring covenants of young magi; and now and then one asks the players' covenant to
 * take them in.
 */
export function wanderersYearEnd(state: State, year: number, rng: Rng): { lines: Line[]; news: TribunalNews[] } {
  const lines: Line[] = [];
  const out: TribunalNews[] = [];
  const living = state.covenants.filter((x) => x.living && !x.living.paused);
  const ours = playersCovenant(state.covenants, state.characters);
  const customs = rhineCustoms(state.saga);
  for (const c of state.characters.filter((x) => x.wanderer && alive(x))) {
    const w = c.wanderer!;
    const host = state.covenants.find((x) => x.id === c.covenantId);
    // the guest's fee, under the Rhine's guest-laws
    if (host && customs) {
      const t = takeVis(purseOf(c).vis, [...ARTS], 3);
      if (t.ok) {
        for (const v of t.taken) addVis(host.visStocks, v.art, v.pawns, v.pair);
        host.log.push({ uid: uid(), year, season: 'Winter', text: `${c.name} pays ${visText(t.taken)} vis for the year’s hospitality.`, visDelta: t.taken });
      } else host.log.push({ uid: uid(), year, season: 'Winter', text: `${c.name} repays the year’s hospitality with a season’s service.` });
    }
    // a peregrinator moves on
    if (w.wanders === 'peregrinator' && host) {
      const years = year + 1 - w.since;
      const stay = w.stay ?? 3;
      if (years >= 7 || (years >= stay && rng() < 0.7)) {
        const welcome = w.welcome && w.welcome !== host.id ? state.covenants.find((x) => x.id === w.welcome) : undefined;
        const choices = living.filter((x) => x !== host && !(w.visited ?? []).slice(-3).includes(x.id));
        const weight = (x: Covenant) => 1 + (w.favors === 'young' ? Math.max(0, 80 - (year - (bookCovenant(x.living!.key)?.cov.founded ?? 0))) / 10 : 0);
        let to = welcome;
        if (!to && choices.length) {
          let r = rng() * choices.reduce((t, x) => t + weight(x), 0);
          to = choices.find((x) => (r -= weight(x)) < 0) ?? choices[0];
        }
        if (to) {
          moveWanderer(c, to, state.covenants, year + 1);
          if (welcome) w.welcome = undefined;
          const text = `${c.name} leaves ${host.name} after ${years} year${years === 1 ? '' : 's'} as its guest, for ${to.name}.`;
          lines.push({ who: c.name, text, tribunal: 'wanderers' });
          // news of the book's wanderers, and of any coming to or leaving the players; the other peregrinatores' moves stay in the report
          const known = !!tribunalBook(state.saga.tribunal)?.wanderers?.some((x) => x.name === w.key);
          if (known || !to.living || !host.living) out.push(news(year, 'Winter', { kind: 'event', covenantId: to.living ? to.id : undefined, characterId: c.id, text }));
        }
      }
    }
    // asking the players' covenant to take them in: the book's own request, or any peregrinator's under the guest-laws
    const book = tribunalBook(state.saga.tribunal);
    const a = book?.wanderers?.find((x) => x.name === w.key)?.approach ?? (w.wanders === 'peregrinator' && customs ? guestRequest(c) : undefined);
    if (!a || !ours || c.covenantId === ours.id || w.welcome) continue;
    if (state.saga.tribunalNews?.some((n) => n.approach === a.id && n.year >= year - 1)) continue;
    if (rng() * 100 >= a.chance) continue;
    out.push(news(year + 1, 'Spring', { kind: 'approach', approach: a.id, approachKind: a.kind, page: a.page, characterId: c.id, text: a.text }));
  }
  return { lines, news: out };
}

/** The players' covenant: of those not living, the one with the most magi. */
export function playersCovenant(covenants: Covenant[], characters: Character[]): Covenant | undefined {
  const magi = (cov: Covenant) => characters.filter((c) => cov.memberIds.includes(c.id) && c.type === 'magus').length;
  return covenants.filter((x) => !x.living).sort((a, b) => magi(b) - magi(a))[0];
}

/** A peregrinator's request for hospitality at the players' covenant (GotF, Laws of Hospitality). */
function guestRequest(c: Character): { id: string; kind: 'request'; text: string; chance: number; page?: undefined } {
  return {
    id: `guest:${c.id}`, kind: 'request', chance: 6,
    text: `${c.name}, a peregrinator of House ${(c.house ?? '').replace(/(^|-)\w/g, (x) => x.toUpperCase()).replace('-', ' ')}, asks for hospitality at the covenant under the Rhine’s guest-laws: three to seven years, three pawns of vis a year or a season’s service, and a laboratory of their own.`,
  };
}

/**
 * The players' covenant takes a wanderer in: a peregrinator comes at once (for three years at
 * least, by the guest-laws), a seasonal wanderer for the winters. Returns what happened, for the
 * covenant's chronicle.
 */
export function welcomeWanderer(c: Character, ours: Covenant, covenants: Covenant[], year: number, season: Season): string {
  const w = c.wanderer;
  if (!w) return `${c.name} is not a wanderer.`;
  w.welcome = ours.id;
  const now = w.wanders === 'peregrinator' || season === 'Winter';
  if (now) moveWanderer(c, ours, covenants, year);
  const text = now ? `${c.name} comes to ${ours.name} as a guest${w.wanders === 'peregrinator' ? ', under the guest-laws: three pawns of vis a year, or a season’s service' : ''}.` : `${c.name} will winter at ${ours.name} as its guest.`;
  ours.log.push({ uid: uid(), year, season, text });
  return text;
}
