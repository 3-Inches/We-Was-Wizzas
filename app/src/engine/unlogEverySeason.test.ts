// Unlog takes back a season whole (roadmap Batch A, 5.12 and the check after it; audit 3, B1). Each
// kind of season the clock logs is worked on each character of the practice sagas and of a populated
// test saga, then unlogged: the character and the covenants must be as they were. It tests what the
// season did, not the source text, so a new kind of season, or a new record one changes, is caught
// the first time a character can do it. The cards' own seasons are checked the same way, by pressing
// their buttons, in src/ui/pages/unlogEverySeason.test.tsx.
import { unlogLinked } from './unlog';
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { deriveCharacter } from './character/derive';
import { characterContext, covenantOf } from './context';
import { seeded } from './generate/random';
import { buildTestSaga } from './testing/sagaFixture';
import { runStanding, type SagaState } from './time';
import type { Character, Covenant, StandingActivity } from './types';
import { canUnlog, unlogSeason } from './unlog';
import { differences, sagaFixtures } from './testing/unlogCheck';
import { isTrade, newWorkshop } from './workshop';
import { bestLesson, giveLesson } from './teaching';

const data = buildGameData();

/** Each standing activity a character could be set to, filled in from what they have (a workshop for one with a trade). */
function activities(c: Character, cov: Covenant | undefined): StandingActivity[] {
  const ability = c.abilities.find((a) => a.abilityId !== 'living-language')?.uid;
  const art = c.type === 'magus' ? 'art:Cr' : undefined;
  const project = c.projects?.find((p) => !p.done)?.uid;
  const spec = cov?.specialists.find((s) => s.role === 'teacher' || s.teaching)?.uid;
  const writing = c.writing?.find((w) => !w.done)?.uid;
  const out: StandingActivity[] = [{ kind: 'auto' }, { kind: 'priorities' }, { kind: 'worship' }, { kind: 'work' }];
  for (const target of [ability && `ability:${ability}`, art].filter(Boolean) as string[]) {
    out.push({ kind: 'exposure', target }, { kind: 'practice', target }, ...(spec ? [{ kind: 'taught' as const, teacher: `spec:${spec}`, target }] : []));
  }
  if (art) out.push({ kind: 'vis', target: art }, { kind: 'vis', target: art, visFrom: 'covenant' });
  for (const b of cov?.library ?? []) {
    const target = b.subjectType === 'art' ? `art:${b.subject}` : c.abilities.find((a) => a.abilityId === b.subject)?.uid;
    if (target) out.push({ kind: 'read', bookUid: b.uid, target: target.startsWith('art:') ? target : `ability:${target}` });
  }
  out.push({ kind: 'lab', projectUid: project });
  if (writing) out.push({ kind: 'write', projectUid: writing });
  return out;
}

function check(name: string, st: SagaState): { problems: string[]; seasons: Set<string> } {
  const problems: string[] = [];
  const seasons = new Set<string>();
  const { currentYear: year, currentSeason: season } = st.saga;
  for (const c0 of st.characters.filter((c) => c.creation.finalized && !c.wounds.dead)) {
    for (const s of activities(c0, covenantOf(c0, st.covenants))) {
      const x: SagaState = structuredClone(st);
      const c = x.characters.find((y) => y.id === c0.id)!;
      c.standing = s;
      const trade = c.abilities.find((a) => isTrade(a.abilityId));
      if (s.kind === 'work' && !c.workshop && trade) c.workshop = newWorkshop(trade.uid, trade.abilityId !== 'craft-type');
      const before = structuredClone({ c, covenants: x.covenants });
      const d = deriveCharacter(c, data, x.saga.houseRules);
      runStanding(c, d, characterContext(c, x.covenants, data), covenantOf(c, x.covenants), data, year, season, seeded(7), x.characters);
      const logged = c.seasonLog.filter((e) => !before.c.seasonLog.some((b) => b.uid === e.uid));
      const what = `${name}: ${c.name} (${c.type}), ${s.kind}${s.target ? ` ${s.target}` : ''}`;
      if (!logged.length) continue;
      for (const e of logged) seasons.add(`${s.kind}: ${e.activity}`);
      if (logged.some((e) => !canUnlog(e).ok)) continue;
      for (const e of [...logged].reverse()) {
        const r = unlogSeason(c, e.uid, x.covenants);
        if (!r.ok) problems.push(`${what}: Unlog refused (${r.why})`);
      }
      problems.push(...differences(before, { c, covenants: x.covenants }).map((p) => `${what}: ${p}`));
    }
  }
  return { problems, seasons };
}

/** A lesson between characters, as the clock gives it before the season's work: every teacher, to whom they teach best. */
function checkLessons(name: string, st: SagaState): { problems: string[]; lessons: number } {
  const problems: string[] = [];
  let lessons = 0;
  const people = st.characters.filter((c) => c.creation.finalized && !c.wounds.dead);
  for (const t0 of people) {
    const x: SagaState = structuredClone(st);
    const learner = (c: Character) => ({ c, d: deriveCharacter(c, data, x.saga.houseRules) });
    const t = learner(x.characters.find((c) => c.id === t0.id)!);
    const pool = x.characters.filter((c) => c.id !== t0.id && c.creation.finalized && !c.wounds.dead).map(learner);
    const { plan } = bestLesson(t, pool, data);
    if (!plan) continue;
    const before = structuredClone(x.characters);
    giveLesson(t, plan, x.saga.currentYear, x.saga.currentSeason);
    lessons++;
    // the teacher's season alone is unlogged: the students' go with it (owner.md, Decided: Unlog takes back a linked season)
    const te = t.c.seasonLog[t.c.seasonLog.length - 1];
    const r = unlogLinked(t.c, te.uid, x.covenants, x.characters);
    if (!r.ok) problems.push(`${name}: ${t0.name}'s lesson could not be unlogged: ${r.why}`);
    if (r.with.length !== plan.students.length) problems.push(`${name}: ${t0.name}'s lesson named ${r.with.length} students, not ${plan.students.length}`);
    problems.push(...differences(before, x.characters).map((p) => `${name}: ${t0.name} taught ${plan.label}: ${p}`));
  }
  return { problems, lessons };
}

describe('every season the clock logs, unlogged, leaves the character and covenant as they were', () => {
  const sagas: [string, SagaState][] = [...sagaFixtures(), ['test saga', buildTestSaga(data, { seed: 3, allOptional: true })]];

  it('on each practice saga and a populated test saga', () => {
    const problems: string[] = [];
    const seasons = new Set<string>();
    for (const [name, st] of sagas) {
      const r = check(name, st);
      problems.push(...r.problems);
      r.seasons.forEach((k) => seasons.add(k));
    }
    expect(problems.slice(0, 30)).toEqual([]);
    let lessons = 0;
    for (const [name, st] of sagas) {
      const r = checkLessons(name, st);
      problems.push(...r.problems);
      lessons += r.lessons;
    }
    expect(problems.slice(0, 30)).toEqual([]);
    expect(lessons).toBeGreaterThan(5);
    // the kinds of season reached, so a change that stops reaching one is noticed
    for (const k of ['exposure: exposure', 'practice: practice', 'vis: study-vis', 'read: study-book', 'lab: other', 'worship: worship', 'taught: taught', 'write: write-book', 'work: work'])
      expect([...seasons], k).toContain(k);
  }, 120000);

  // an Initiation and After a story are pressed on their cards: src/ui/pages/unlogEverySeason.test.tsx

  it('catches a season that leaves something behind', () => {
    const [, st] = sagas.find(([n]) => n === 'tmre')!;
    const x: SagaState = structuredClone(st);
    const c = x.characters.find((y) => y.type === 'magus' && y.creation.finalized)!;
    c.purse = { pounds: 0, vis: [{ art: 'Cr', pawns: 20 }] };
    c.standing = { kind: 'vis', target: 'art:Cr' };
    const before = structuredClone({ c, covenants: x.covenants });
    runStanding(c, deriveCharacter(c, data, x.saga.houseRules), characterContext(c, x.covenants, data), covenantOf(c, x.covenants), data, x.saga.currentYear, x.saga.currentSeason, seeded(7), x.characters);
    const e = c.seasonLog.at(-1)!;
    delete e.undo; // as if the season forgot the vis it spent
    unlogSeason(c, e.uid, x.covenants);
    expect(differences(before, { c, covenants: x.covenants }).join(' ')).toMatch(/c\.purse\.vis/);
  });
});
