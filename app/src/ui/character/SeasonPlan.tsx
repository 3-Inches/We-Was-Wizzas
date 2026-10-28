// How a character's year is spent: free seasons, working seasons, Worship and the extra seasons of
// one who needs no sleep (DE, Assigning Seasons), what this year has used, and the choices the
// troupe makes for a character the rules do not cover.

import type { DerivedCharacter } from '../../engine/character/derive';
import { seasonsOf, seasonsUsed } from '../../engine/seasons';
import type { Character, Specialist } from '../../engine/types';
import { Stepper } from '../kit';
import { StandingEditor } from './StandingEditor';

export function SeasonPlan({ c, d, year, update, teachers }: { c: Character; d: DerivedCharacter; year: number; update: (fn: (c: Character) => void) => void; teachers: Specialist[] }) {
  const plan = seasonsOf(c, d);
  const used = seasonsUsed(c, year);
  const noFatigue = !!c.creature?.magicCharacter?.qualities.some((q) => q.id === 'no-fatigue');
  const set = (fn: (s: NonNullable<Character['seasons']>) => void) =>
    update((x) => {
      const s = { ...(x.seasons ?? {}) };
      fn(s);
      x.seasons = Object.values(s).some((v) => v !== undefined) ? s : undefined;
    });
  return (
    <div className="stack" style={{ gap: 4 }} data-tour="season-plan">
      <div className="row small">
        <b>Seasons a year:</b>
        <span title={plan.parts.join('; ')}>
          {plan.free - plan.worship} free{plan.worship ? `, ${plan.worship} in Worship` : ''}
          {plan.work ? `, ${plan.work} working (Exposure)` : ''}
          {plan.extra ? `, and ${plan.extra} extra for study (needs no sleep)` : ''}
        </span>
        <span className="muted">
          — {year} so far: {used.free} free, {used.work} working{plan.worship ? `, ${used.worship} Worship` : ''}
          {plan.extra ? `, ${used.extra} extra` : ''}
        </span>
      </div>
      <div className="small muted">{plan.parts.join('. ')}.</div>
      <div className="row small">
        <label className="inline" title="For a character the rules leave open: a servant who works all year, a lord with no time to spare">
          <input type="checkbox" checked={c.seasons?.free !== undefined} onChange={(e) => set((s) => void (s.free = e.target.checked ? plan.free : undefined))} /> set the free seasons by hand
        </label>
        {c.seasons?.free !== undefined && <Stepper value={c.seasons.free} min={0} max={4} width={30} onChange={(v) => set((s) => void (s.free = v))} />}
        {!noFatigue && (
          <label className="inline" title="Two more seasons a year for study or adventure, never lab work (the Becoming enchantment Transforming the Mind, or the like)">
            <input type="checkbox" checked={!!c.seasons?.sleepless} onChange={(e) => set((s) => void (s.sleepless = e.target.checked || undefined))} /> needs no sleep
          </label>
        )}
        {plan.extra > 0 && (
          <span className="row tight">
            Extra seasons (Spring and Autumn):
            <StandingEditor c={c} d={d} year={year} teachers={teachers} extra value={c.seasons?.extra ?? { kind: 'auto' }} onChange={(st) => set((s) => void (s.extra = st.kind === 'auto' && !st.target ? undefined : st))} />
          </span>
        )}
      </div>
    </div>
  );
}
