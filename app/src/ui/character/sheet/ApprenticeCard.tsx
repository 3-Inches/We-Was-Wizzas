// A magus's apprentice, as a light record until the Gauntlet (DE, Apprentices): their name, age and
// the seasons of teaching given. The Code asks a season a year of the master; the Tribunal's living
// magi teach from their priority lists and bring their apprentices to the Gauntlet themselves.

import { useState } from 'react';
import { Card, Field, Stepper } from '../../kit';
import { RulesNote } from '../../RulesNote';
import type { CharEditor } from '../useChar';

export function ApprenticeCard({ ed }: { ed: CharEditor }) {
  const { c, saga, update } = ed;
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Female');
  if (!c || !saga || c.type !== 'magus' || !c.creation.finalized) return null;
  const ap = c.apprentice;
  const year = saga.currentYear;
  if (!ap)
    return (
      <Card title="Apprentice" tour="apprentice">
        <RulesNote book="DE" line={10985} endLine={11015}>
          An apprentice from seven years old, fifteen years of training, a season a year taught by the master; they help in the laboratory (Intelligence + Magic Theory).
        </RulesNote>
        <div className="row tight">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="the apprentice’s name" aria-label="Apprentice’s name" style={{ width: 180 }} />
          <select value={gender} onChange={(e) => setGender(e.target.value as 'Male' | 'Female')} aria-label="Apprentice’s gender">
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
          <button className="small" disabled={!name.trim()} onClick={() => update((x) => void (x.apprentice = { name: name.trim(), gender, since: year, age: 8, seasons: 0 }))}>
            Take an apprentice
          </button>
        </div>
      </Card>
    );
  const set = (fn: (a: NonNullable<typeof ap>) => void) => update((x) => x.apprentice && fn(x.apprentice));
  const left = ap.since + 15 - year;
  const taught = c.seasonLog.filter((e) => e.year === year && e.priority === 'apprentice').length;
  return (
    <Card title="Apprentice" tour="apprentice">
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <Field label="Name">
          <input value={ap.name} onChange={(e) => set((a) => void (a.name = e.target.value))} style={{ width: 150 }} />
        </Field>
        <Field label="Gender">
          <select value={ap.gender} onChange={(e) => set((a) => void (a.gender = e.target.value as 'Male' | 'Female'))}>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
        </Field>
        <Field label="Since">
          <Stepper value={ap.since} onChange={(v) => set((a) => void (a.since = v))} min={year - 20} max={year} />
        </Field>
        <Field label="Age then">
          <Stepper value={ap.age} onChange={(v) => set((a) => void (a.age = v))} min={5} max={25} />
        </Field>
        <Field label="Seasons taught">
          <Stepper value={ap.seasons} onChange={(v) => set((a) => void (a.seasons = v))} min={0} />
        </Field>
      </div>
      <div className="small">
        {ap.name || 'The apprentice'} is {ap.age + year - ap.since}, in year {year - ap.since + 1} of 15 of training;{' '}
        {left > 0 ? `the Gauntlet in ${left} year${left === 1 ? '' : 's'} (${ap.since + 15}).` : 'ready for the Gauntlet.'}
        {c.priorities?.some((p) => p.kind === 'apprentice') ? ` Taught from the priority list (${taught} season${taught === 1 ? '' : 's'} this year).` : ' The Code asks a season a year of teaching: add “Teach the apprentice” to the priority list, or plan it on the Seasons page.'}
      </div>
      {ap.note && <div className="small muted">{ap.note}</div>}
      <div className="row tight" style={{ marginTop: 6 }}>
        <button className="small" onClick={() => update((x) => void (x.apprentice = undefined))} title="Passed the Gauntlet (make their sheet as a new magus), passed to another master, or lost">
          No longer an apprentice
        </button>
      </div>
    </Card>
  );
}
