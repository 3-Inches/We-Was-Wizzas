// The simulator (design spec, section 9): answers the quiz with a scripted profile, follows the
// tree as a player would, and reports what happened. Every acceptance test runs through it.

import type { Question } from './questions';
import { evaluate, shortlist, tieBreaker, visibleQuestions, type Evaluation, type GuidedContext, type GuidedState, type Scored, type TieBreak } from './score';

export interface Profile {
  name: string;
  /** the answer to a question, or undefined to skip it */
  answer: (q: Question) => number | undefined;
  /** tie-breaker re-rating of a tag (default: keep the top half at 10, the rest at 0) */
  tieBreak?: (tag: string, rank: number) => number;
  /** "Still interested?" for an option that needed an explainer (default: skip) */
  stillInterested?: (s: Scored) => number | undefined;
}

export interface SimResult {
  state: GuidedState;
  answered: number;
  asked: string[];
  tieBreak: TieBreak | null;
  tieBreakTriggered: boolean;
  evaluation: Evaluation;
  virtues: Scored[];
  flaws: Scored[];
}

export function simulate(profile: Profile, ctx: GuidedContext, maxRounds = 20): SimResult {
  const st: GuidedState = { answers: {}, declined: [] };
  const asked: string[] = [];
  let triggered = false;
  let tb: TieBreak | null = null;
  for (let round = 0; round < maxRounds; round++) {
    let changed = false;
    for (const v of visibleQuestions(st, ctx)) {
      if (v.source === 'covenant' || v.q.id in st.answers) continue;
      if (asked.includes(v.q.id)) continue;
      asked.push(v.q.id);
      const a = profile.answer(v.q);
      if (a === undefined) continue;
      st.answers[v.q.id] = a;
      changed = true;
    }
    const ev = evaluate(st, ctx);
    tb = tieBreaker(st, ev, ctx);
    if (tb) {
      triggered = true;
      tb.tags.forEach((t, i) => {
        if (`tb:${t.tag}` in st.answers) return;
        st.answers[`tb:${t.tag}`] = profile.tieBreak ? profile.tieBreak(t.tag, i) : i < Math.ceil(tb!.tags.length / 2) ? 10 : 0;
        changed = true;
      });
    }
    if (profile.stillInterested) {
      for (const s of shortlist(ev).slice(0, 12)) {
        if (!(s.rec.flags.complexity || s.rec.flags.otherBook || s.rec.flags.spellLike) || `vf:${s.def.id}` in st.answers) continue;
        const a = profile.stillInterested(s);
        if (a === undefined) continue;
        st.answers[`vf:${s.def.id}`] = a;
        changed = true;
      }
    }
    if (!changed) break;
  }
  const ev = evaluate(st, ctx);
  const answered = Object.keys(st.answers).length;
  return { state: st, answered, asked, tieBreak: tb, tieBreakTriggered: triggered, evaluation: ev, virtues: shortlist(ev, 'virtue'), flaws: shortlist(ev, 'flaw') };
}

/** A profile from a list of answers by question id (anything else is skipped). */
export function fixedProfile(name: string, answers: Record<string, number>, rest?: number): Profile {
  return { name, answer: (q) => answers[q.id] ?? rest };
}
