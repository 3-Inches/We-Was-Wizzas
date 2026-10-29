// What a character does in a season nobody planned (and while time is fast-forwarded).

import { ARTS, ART_NAMES } from '../../data';
import type { DerivedCharacter } from '../../engine/character/derive';
import { describeStanding, resolveStanding } from '../../engine/time';
import type { Character, LibraryBook, Specialist, StandingActivity } from '../../engine/types';
import { teacherQuality } from '../../engine/covenantRules';

const KINDS: { id: StandingActivity['kind']; label: string }[] = [
  { id: 'auto', label: 'Automatic' },
  { id: 'priorities', label: 'Follow the priority list' },
  { id: 'exposure', label: 'Exposure (2 xp)' },
  { id: 'practice', label: 'Practice an Ability' },
  { id: 'vis', label: 'Study an Art from vis (own purse)' },
  { id: 'read', label: 'Read a book from the library' },
  { id: 'lab', label: 'Lab work / a lab project' },
  { id: 'work', label: 'Work in the workshop' },
  { id: 'taught', label: 'Taught by a covenant teacher' },
  { id: 'worship', label: 'Worship (a church’s Dominion)' },
  { id: 'write', label: 'Write or copy a book' },
  { id: 'none', label: 'Nothing' },
];

export function StandingEditor({ c, d, year, onChange, teachers = [], value, extra, library = [] }: { c: Character; d: DerivedCharacter; year: number; onChange: (s: StandingActivity) => void; teachers?: Specialist[]; value?: StandingActivity; extra?: boolean; library?: LibraryBook[] }) {
  const s = value ?? c.standing ?? { kind: 'auto' };
  const resolved = resolveStanding(c, d, year);
  const needsTarget = s.kind === 'exposure' || s.kind === 'practice' || s.kind === 'vis' || s.kind === 'taught';
  const open = (c.projects ?? []).filter((p) => !p.done);
  const writing = (c.writing ?? []).filter((p) => !p.done);
  // books the character can read: summae and tractatus on an Art (a magus) or an Ability they have
  const readable = library.filter((b) => (b.kind === 'summa' || b.kind === 'tractatus') && !b.corrupt && (b.subjectType === 'art' ? d.isMagus : b.subjectType === 'ability' && c.abilities.some((a) => a.abilityId === b.subject)));
  const readTarget = (b: LibraryBook) => (b.subjectType === 'art' ? `art:${b.subject}` : `ability:${c.abilities.find((a) => a.abilityId === b.subject && (!b.param || a.param === b.param))?.uid ?? ''}`);
  return (
    <span className="row tight" style={{ flexWrap: 'wrap' }}>
      <select value={s.kind} onChange={(e) => onChange({ ...s, kind: e.target.value as StandingActivity['kind'] })} aria-label="Standing activity">
        {KINDS.filter((k) => (k.id !== 'work' || (c.workshop && !extra)) && (k.id !== 'lab' || (d.isMagus && !extra)) && (k.id !== 'vis' || d.isMagus) && (k.id !== 'taught' || teachers.length > 0) && (k.id !== 'write' || writing.length > 0 || s.kind === 'write') && (k.id !== 'read' || readable.length > 0 || s.kind === 'read') && (k.id !== 'priorities' || !extra)).map((k) => (
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
        <select value={s.teacher ?? ''} onChange={(e) => onChange({ ...s, teacher: e.target.value || undefined })} aria-label="Teacher">
          <option value="">— teacher —</option>
          {teachers.map((t) => (
            <option key={t.uid} value={`spec:${t.uid}`}>
              {t.name || 'Teacher'} (Quality {teacherQuality(t)})
            </option>
          ))}
        </select>
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
      {s.kind === 'write' && (
        <select value={s.projectUid ?? ''} onChange={(e) => onChange({ ...s, projectUid: e.target.value || undefined })} aria-label="Writing project">
          <option value="">— the first unfinished —</option>
          {writing.map((p) => (
            <option key={p.uid} value={p.uid}>
              {p.title} ({p.points}/{p.needed})
            </option>
          ))}
        </select>
      )}
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
      {s.kind === 'auto' && <span className="small muted">→ {extra ? 'practice of their best Ability' : describeStanding(c, d, resolved)}</span>}
    </span>
  );
}
