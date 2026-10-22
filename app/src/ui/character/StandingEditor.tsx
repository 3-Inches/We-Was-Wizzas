// What a character does in a season nobody planned (and while time is fast-forwarded).

import { ARTS, ART_NAMES } from '../../data';
import type { DerivedCharacter } from '../../engine/character/derive';
import { describeStanding, resolveStanding } from '../../engine/time';
import type { Character, Season, Specialist, StandingActivity } from '../../engine/types';
import { teacherQuality } from '../../engine/covenantRules';

const KINDS: { id: StandingActivity['kind']; label: string }[] = [
  { id: 'auto', label: 'Automatic' },
  { id: 'exposure', label: 'Exposure (2 xp)' },
  { id: 'practice', label: 'Practice an Ability' },
  { id: 'vis', label: 'Study an Art from vis (own purse)' },
  { id: 'lab', label: 'Lab work / a lab project' },
  { id: 'work', label: 'Work in the workshop' },
  { id: 'taught', label: 'Taught by a covenant teacher' },
  { id: 'none', label: 'Nothing' },
];

export function StandingEditor({ c, d, season, onChange, teachers = [] }: { c: Character; d: DerivedCharacter; season: Season; onChange: (s: StandingActivity) => void; teachers?: Specialist[] }) {
  const s = c.standing ?? { kind: 'auto' };
  const resolved = resolveStanding(c, d, season);
  const needsTarget = s.kind === 'exposure' || s.kind === 'practice' || s.kind === 'vis' || s.kind === 'taught';
  const open = (c.projects ?? []).filter((p) => !p.done);
  return (
    <span className="row tight" style={{ flexWrap: 'wrap' }}>
      <select value={s.kind} onChange={(e) => onChange({ ...s, kind: e.target.value as StandingActivity['kind'] })} aria-label="Standing activity">
        {KINDS.filter((k) => (k.id !== 'work' || c.workshop) && (k.id !== 'lab' || d.isMagus) && (k.id !== 'vis' || d.isMagus) && (k.id !== 'taught' || teachers.length > 0)).map((k) => (
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
      {s.kind === 'auto' && <span className="small muted">→ {describeStanding(c, d, resolved)}</span>}
    </span>
  );
}
