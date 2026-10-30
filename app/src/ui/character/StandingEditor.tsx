// What a character does in a season nobody planned (and while time is fast-forwarded).

import { ARTS, ART_NAMES, type GameData } from '../../data';
import type { DerivedCharacter } from '../../engine/character/derive';
import { covenantOf } from '../../engine/context';
import { describeStanding, inPlay, resolveStanding } from '../../engine/time';
import type { Character, Covenant, LibraryBook, Specialist, StandingActivity } from '../../engine/types';
import { teacherQuality } from '../../engine/covenantRules';
import { bestLesson, lessonStudy, teachableSubjects, type Learner } from '../../engine/teaching';
import { cannotHelp, helpValue } from '../../engine/labHelp';

const KINDS: { id: StandingActivity['kind']; label: string }[] = [
  { id: 'auto', label: 'Automatic' },
  { id: 'priorities', label: 'Follow the priority list' },
  { id: 'exposure', label: 'Exposure (2 xp)' },
  { id: 'practice', label: 'Practice an Ability' },
  { id: 'vis', label: 'Study an Art from vis (own purse)' },
  { id: 'read', label: 'Read a book from the library' },
  { id: 'lab', label: 'Lab work / a lab project' },
  { id: 'assist', label: 'Help in a covenant-mate’s lab' },
  { id: 'work', label: 'Work in the workshop' },
  { id: 'taught', label: 'Be taught' },
  { id: 'teach', label: 'Teach covenant-mates' },
  { id: 'worship', label: 'Worship (a church’s Dominion)' },
  { id: 'write', label: 'Write or copy a book' },
  { id: 'none', label: 'Nothing' },
];

/** The covenant's other characters, for teaching and help in the lab. */
export interface Team {
  data: GameData;
  mates: Learner[];
}

/** A character's covenant-mates in play (with no covenant, the others with none), each derived. */
export function teamOf(c: Character, chars: Character[], covs: Covenant[], data: GameData, derive: (x: Character) => DerivedCharacter): Team {
  const home = covenantOf(c, covs)?.id;
  const mates = chars.filter((x) => x.id !== c.id && inPlay(x) && covenantOf(x, covs)?.id === home);
  return { data, mates: mates.map((x) => ({ c: x, d: derive(x) })) };
}

export function StandingEditor({ c, d, year, onChange, teachers = [], value, extra, library = [], team }: { c: Character; d: DerivedCharacter; year: number; onChange: (s: StandingActivity) => void; teachers?: Specialist[]; value?: StandingActivity; extra?: boolean; library?: LibraryBook[]; team?: Team }) {
  const s = value ?? c.standing ?? { kind: 'auto' };
  const resolved = resolveStanding(c, d, year);
  const fromMate = s.kind === 'taught' && s.teacher?.startsWith('char:');
  const needsTarget = s.kind === 'exposure' || s.kind === 'practice' || s.kind === 'vis' || (s.kind === 'taught' && !fromMate);
  const open = (c.projects ?? []).filter((p) => !p.done);
  const writing = (c.writing ?? []).filter((p) => !p.done);
  const mates = (team?.mates ?? []).filter((m) => m.c.id !== c.id);
  const me: Learner = { c, d };
  // books the character can read: summae and tractatus on an Art (a magus) or an Ability they have
  const readable = library.filter((b) => (b.kind === 'summa' || b.kind === 'tractatus') && !b.corrupt && (b.subjectType === 'art' ? d.isMagus : b.subjectType === 'ability' && c.abilities.some((a) => a.abilityId === b.subject)));
  const readTarget = (b: LibraryBook) => (b.subjectType === 'art' ? `art:${b.subject}` : `ability:${c.abilities.find((a) => a.abilityId === b.subject && (!b.param || a.param === b.param))?.uid ?? ''}`);
  const shown = KINDS.filter(
    (k) =>
      (k.id !== 'work' || (c.workshop && !extra)) &&
      (k.id !== 'lab' || (d.isMagus && !extra)) &&
      (k.id !== 'vis' || d.isMagus) &&
      (k.id !== 'taught' || teachers.length > 0 || mates.length > 0 || s.kind === 'taught') &&
      ((k.id !== 'teach' && k.id !== 'assist') || mates.length > 0 || s.kind === k.id) &&
      (k.id !== 'read' || readable.length > 0 || s.kind === 'read') &&
      (k.id !== 'priorities' || !extra),
  );
  const mateTeacher = fromMate ? mates.find((m) => m.c.id === s.teacher!.slice(5)) : undefined;
  const helps = s.kind === 'assist' ? mates.find((m) => m.c.id === s.helps) : undefined;
  return (
    <span className="row tight" style={{ flexWrap: 'wrap' }}>
      <select value={s.kind} onChange={(e) => onChange({ ...s, kind: e.target.value as StandingActivity['kind'] })} aria-label="Standing activity">
        {shown.map((k) => (
          <option key={k.id} value={k.id}>
            {k.label}
          </option>
        ))}
      </select>
      {needsTarget && (
        <select value={s.target ?? ''} onChange={(e) => onChange({ ...s, target: e.target.value || undefined })} aria-label="Subject">
          <option value="">— subject —</option>
          {s.kind !== 'practice' && s.kind !== 'taught' && (
            <optgroup label="Arts">
              {ARTS.map((a) => (
                <option key={a} value={`art:${a}`}>
                  {ART_NAMES[a]} {d.arts[a].score}
                </option>
              ))}
            </optgroup>
          )}
          {s.kind !== 'vis' && (
            <optgroup label="Abilities">
              {d.abilities.map((a) => (
                <option key={a.uid} value={`ability:${a.uid}`}>
                  {a.name} {a.total}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      )}
      {s.kind === 'taught' && (
        <select value={s.teacher ?? ''} onChange={(e) => onChange({ kind: 'taught', teacher: e.target.value || undefined, target: e.target.value.startsWith('spec:') && !fromMate ? s.target : undefined })} aria-label="Teacher">
          <option value="">— teacher —</option>
          {mates.length > 0 && (
            <optgroup label="Covenant-mates">
              {mates.map((m) => (
                <option key={m.c.id} value={`char:${m.c.id}`}>
                  {m.c.name || 'Unnamed'}
                </option>
              ))}
            </optgroup>
          )}
          {teachers.length > 0 && (
            <optgroup label="The covenant’s teachers">
              {teachers.map((t) => (
                <option key={t.uid} value={`spec:${t.uid}`}>
                  {t.name || 'Teacher'} (Quality {teacherQuality(t)})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      )}
      {mateTeacher && team && <MateLesson teacher={mateTeacher} me={me} data={team.data} s={s} onChange={onChange} />}
      {s.kind === 'teach' && team && <TeachPicker me={me} mates={mates} data={team.data} s={s} onChange={onChange} />}
      {s.kind === 'assist' && (
        <>
          <select value={s.helps ?? ''} onChange={(e) => onChange({ kind: 'assist', helps: e.target.value || undefined })} aria-label="Magus to help">
            <option value="">— magus —</option>
            {mates
              .filter((m) => m.c.type === 'magus')
              .map((m) => (
                <option key={m.c.id} value={m.c.id}>
                  {m.c.name || 'Unnamed'}
                </option>
              ))}
          </select>
          {helps && <span className="small muted">→ {cannotHelp(c, d, helps.c) ?? `+${helpValue(d)} to ${helps.c.name || 'their'}’s Lab Totals when they work a project (Int + Magic Theory); Exposure in Magic Theory`}</span>}
        </>
      )}
      {s.kind === 'lab' && open.length > 0 && (
        <select value={s.projectUid ?? ''} onChange={(e) => onChange({ ...s, projectUid: e.target.value || undefined })} aria-label="Lab project">
          <option value="">— no project (Exposure) —</option>
          {open.map((p) => (
            <option key={p.uid} value={p.uid}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      {s.kind === 'write' &&
        (writing.length ? (
          <select value={s.projectUid ?? ''} onChange={(e) => onChange({ ...s, projectUid: e.target.value || undefined })} aria-label="Writing project">
            <option value="">— the first unfinished —</option>
            {writing.map((p) => (
              <option key={p.uid} value={p.uid}>
                {p.title} ({p.points}/{p.needed})
              </option>
            ))}
          </select>
        ) : (
          <span className="small muted">→ begin a book on the sheet’s Advancement tab (Writing and copying) first</span>
        ))}
      {s.kind === 'read' && (
        <select
          value={s.bookUid ?? ''}
          onChange={(e) => {
            const b = readable.find((x) => x.uid === e.target.value);
            onChange({ ...s, bookUid: b?.uid, target: b ? readTarget(b) : undefined });
          }}
          aria-label="Book"
        >
          <option value="">— book —</option>
          {readable.map((b) => (
            <option key={b.uid} value={b.uid}>
              {b.title} ({b.kind === 'summa' ? `L${b.level} ` : ''}Q{b.quality})
            </option>
          ))}
        </select>
      )}
      {s.kind === 'priorities' && <span className="small muted">→ the first entry of {c.priorities?.length ? 'its' : 'a'} priority list that can be done (Advancement tab)</span>}
      {s.kind === 'auto' && <span className="small muted">→ {extra ? (d.magicChar && d.magicChar.might > 0 && !c.creature?.familiarOf ? 'practice, unless its Might cancels it: then nothing' : 'practice of their best Ability') : `${describeStanding(c, d, resolved)}${!c.creature && (resolved.kind === 'practice' || (resolved.kind === 'lab' && !resolved.projectUid)) ? ', or the covenant’s best book or teacher if it teaches more' : ''}`}</span>}
    </span>
  );
}

/** Taught by a covenant-mate: what they can teach this character, and what a lesson would give. */
function MateLesson({ teacher, me, data, s, onChange }: { teacher: Learner; me: Learner; data: GameData; s: StandingActivity; onChange: (s: StandingActivity) => void }) {
  const r = teachableSubjects(teacher, me, data);
  const pick = r.subjects.find((x) => x.key === s.target);
  const best = bestLesson(teacher, [me], data, { subject: s.target }).plan;
  return (
    <>
      {r.subjects.length > 0 && (
        <select value={s.target ?? ''} onChange={(e) => onChange({ ...s, target: e.target.value || undefined })} aria-label="Subject taught">
          <option value="">— what teaches the most —</option>
          {r.subjects.map((x) => (
            <option key={x.key} value={x.key}>
              {x.label} ({x.studentScore} → up to {x.teacherScore}){x.newAbility ? ', new' : ''}
            </option>
          ))}
        </select>
      )}
      <span className="small muted">
        →{' '}
        {r.why ??
          (best
            ? `${best.label}: +${(pick ? lessonStudy(teacher, me, pick, 1) : best.students[0].result).xp} xp taught alone (less with others), in ${teacher.c.name || 'the teacher'}’s season (an extra one if they need no sleep)`
            : r.subjects.length && me.d.magicChar && me.d.magicChar.might > 0
              ? `${me.c.name || 'This character'} would learn nothing: its Might ${me.d.magicChar.might} comes off the lesson (bound as a familiar, it would learn as a human does)`
              : `${teacher.c.name || 'They'} know${teacher.c.name ? 's' : ''} nothing more than ${me.c.name || 'this character'} does that could be taught${r.blocked.length ? ` (${r.blocked.map((b) => `${b.label}: ${b.why}`).join('; ')})` : ''}`)}
      </span>
    </>
  );
}

/** Teaching: the students, the subject (or what teaches the most in all), and the lesson that gives. */
function TeachPicker({ me, mates, data, s, onChange }: { me: Learner; mates: Learner[]; data: GameData; s: StandingActivity; onChange: (s: StandingActivity) => void }) {
  // the students chosen, and those who asked to be taught by this character
  const chosen = mates.filter((m) => s.students?.includes(m.c.id) || (m.c.standing?.kind === 'taught' && m.c.standing.teacher === `char:${me.c.id}`));
  const subjects = new Map<string, string>();
  for (const m of chosen.length ? chosen : mates) for (const x of teachableSubjects(me, m, data).subjects) subjects.set(x.key, x.label);
  const wants = new Map(chosen.filter((m) => m.c.standing?.kind === 'taught').map((m) => [m.c.id, m.c.standing!.target]));
  const r = chosen.length ? bestLesson(me, chosen, data, { subject: s.target, wants }) : undefined;
  const toggle = (id: string, on: boolean) => {
    const next = on ? [...(s.students ?? []), id] : (s.students ?? []).filter((x) => x !== id);
    onChange({ ...s, students: next.length ? next : undefined });
  };
  return (
    <>
      <select value={s.target ?? ''} onChange={(e) => onChange({ ...s, target: e.target.value || undefined })} aria-label="Subject to teach">
        <option value="">— what teaches the most —</option>
        {[...subjects].map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
      <span className="row tight small" style={{ flexWrap: 'wrap' }} aria-label="Students">
        {mates.map((m) => {
          const asked = m.c.standing?.kind === 'taught' && m.c.standing.teacher === `char:${me.c.id}`;
          return (
            <label key={m.c.id} className="inline" title={asked ? `${m.c.name || 'They'} asked to be taught by ${me.c.name || 'this character'}` : undefined}>
              <input type="checkbox" checked={asked || !!s.students?.includes(m.c.id)} disabled={asked} onChange={(e) => toggle(m.c.id, e.target.checked)} /> {m.c.name || 'Unnamed'}
              {asked ? ' (asked)' : ''}
            </label>
          );
        })}
      </span>
      <span className="small muted" style={{ flexBasis: '100%' }}>
        →{' '}
        {!r
          ? 'choose the students (those who chose to be taught by them join too)'
          : r.plan
            ? `${r.plan.label} to ${r.plan.students.map((w) => `${w.s.c.name || 'Unnamed'} (+${w.result.xp})`).join(', ')}: ${r.plan.total} xp in all${r.why.size ? `. ${[...r.why.values()].join(' ')}` : ''}`
            : [...r.why.values()].join(' ') || 'no lesson'}
      </span>
    </>
  );
}
