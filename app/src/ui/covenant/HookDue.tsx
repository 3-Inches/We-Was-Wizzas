// When a Natural Disaster strikes or a Flawed Resource is lost (Covenants ch.2): the time it comes,
// chosen or picked at random within the saga's first five years, and the Flawed Resource's story roll.

import { useState } from 'react';
import { SEASONS, seasonIndex } from '../../engine/effects';
import { isDue, randomDue, rollFlawedStory, settleFlawedStory } from '../../engine/hookEvents';
import type { CovResource } from '../../engine/covenantRules';
import type { Covenant, CovenantHookBoon, Season } from '../../engine/types';
import { useStore } from '../../store/store';
import { Field, Stepper } from '../kit';

export function HookDue({ hb, cov, edit }: { hb: CovenantHookBoon; cov: Covenant; edit: (fn: (h: CovenantHookBoon) => void) => void }) {
  const saga = useStore((s) => s.sagas[cov.sagaId]);
  const now = { year: saga?.currentYear ?? cov.foundedYear, season: saga?.currentSeason ?? ('Spring' as Season) };
  const disaster = /disaster/i.test(hb.name);
  const done = disaster ? hb.active : hb.outcome && hb.outcome !== 'pending';
  const due = hb.due;
  const past = due && seasonIndex(due.year, due.season) <= seasonIndex(now.year, now.season);
  return (
    <div className="row small">
      <Field label={disaster ? 'It strikes in' : 'Its story comes in'}>
        <span className="row tight">
          <select value={due?.season ?? ''} onChange={(e) => edit((h) => void (h.due = e.target.value ? { year: h.due?.year ?? now.year, season: e.target.value as Season } : undefined))} aria-label="Season">
            <option value="">— not set —</option>
            {SEASONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {due && <Stepper value={due.year} width={52} onChange={(v) => edit((h) => void (h.due = { ...h.due!, year: v }))} />}
        </span>
      </Field>
      {!done && (
        <button className="small" onClick={() => edit((h) => void (h.due = randomDue({ year: Math.max(cov.foundedYear, now.year), season: now.season })))} title="The book: within the first five years of the saga">
          Pick a time for me
        </button>
      )}
      {due && !done && (
        <span className={past ? 'warn-text' : 'muted'}>
          {past
            ? disaster
              ? 'Its time has come.'
              : 'Its time has come: play the story, then roll it below.'
            : `On the calendar; the toolkit ${disaster ? 'strikes' : 'reminds you'} when ${due.season} ${due.year} begins.`}
        </span>
      )}
      {disaster && due && isDue(hb, now.year, now.season) && (
        <button className="small danger" onClick={() => edit((h) => void (h.active = true))}>
          Strike now
        </button>
      )}
    </div>
  );
}

/** The Flawed Resource's story: the deciding character's total and a stress die against an Ease Factor. */
export function FlawedStoryRoll({ hb, cov, edit, resources }: { hb: CovenantHookBoon; cov: Covenant; edit: (fn: (h: CovenantHookBoon) => void) => void; resources: CovResource[] }) {
  const saga = useStore((s) => s.sagas[cov.sagaId]);
  const [total, setTotal] = useState(6);
  const [ease, setEase] = useState(9);
  const [botch, setBotch] = useState(1);
  const when = { year: saga?.currentYear ?? cov.foundedYear, season: saga?.currentSeason ?? ('Spring' as Season) };
  if (hb.outcome && hb.outcome !== 'pending') return hb.rolled ? <div className="small muted">Rolled {hb.rolled}</div> : null;
  return (
    <div className="row small">
      <Field label="The deciding total" hint="Of whoever decides the story: e.g. Per + Awareness to catch the fire, Pre + Leadership to stop the mutiny">
        <Stepper value={total} width={40} onChange={setTotal} />
      </Field>
      <Field label="Ease Factor" hint="9 Average, 12 Hard, 15 Very Hard">
        <Stepper value={ease} min={0} width={36} onChange={setEase} />
      </Field>
      <Field label="Botch dice">
        <Stepper value={botch} min={0} max={10} width={36} onChange={setBotch} />
      </Field>
      <button className="small primary" onClick={() => edit((h) => settleFlawedStory(h, rollFlawedStory(total, ease, botch), resources, when))}>
        Roll the story
      </button>
    </div>
  );
}
