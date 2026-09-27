import { CHARACTERISTICS, CHAR_NAMES, type Characteristic } from '../../data';
import { ageYears, decrepitudeScore } from '../../engine/longterm';
import { Card, Field, Stepper, signed } from '../kit';
import type { CharEditor } from './useChar';

/**
 * Aging before play (DE p.50): characters older than 35 make an aging roll for each year before
 * the saga starts. Roll one year at a time, or all remaining years at once; everything can be undone.
 */
export default function AgingBeforePlay({ ed }: { ed: CharEditor }) {
  const { c, d, change, update, ctx } = ed;
  if (!c || !d) return null;
  const start = d.agingStartAge;
  const last = c.age - 1;
  if (last < start && !(c.creation.agingLog?.length)) return null;
  const done = c.creation.agedThrough ?? start - 1;
  const next = Math.max(start, done + 1);
  const remaining = Math.max(0, last - next + 1);
  // DE p.50: a magus's covenant gives Living Conditions +1; companions and grogs default to 0
  const autoLc = (d.isMagus ? (ctx.covenant ? (ctx.covenant.season === 'Summer' || ctx.covenant.season === 'Autumn' ? 2 : 1) : 1) : 0) + d.livingConditionsMod;
  const lc = c.creation.agingLivingConditions ?? autoLc;
  const anyChar: Characteristic = c.creation.agingAnyChar ?? 'Qik';
  const renew = c.creation.renewLongevity ?? d.isMagus;
  const lr = c.longevity?.bonus ?? 0;

  const roll = (to: number) =>
    change((x) => {
      if (!x.creation.preAging) {
        x.creation.preAging = structuredClone({
          characteristics: x.characteristics, agingPoints: x.agingPoints, decrepitudePoints: x.decrepitudePoints,
          agingLoss: x.agingLoss, apparentAge: x.apparentAge, longevity: x.longevity,
        });
      }
      const r = ageYears(x, next, to, { livingConditions: lc, longevity: lr, extra: d.agingRollMod, anyChar, renewLongevity: renew });
      const summary = r.years.length ? `Aged ${r.years.length} year${r.years.length > 1 ? 's' : ''} (to ${r.years[r.years.length - 1].age}).` : '';
      if (r.died) x.creation.agingLog = [...(x.creation.agingLog ?? []), r.died.text];
      return [summary, r.died?.text].filter(Boolean).join(' ');
    });
  const undoAll = () =>
    change((x) => {
      const p = x.creation.preAging;
      if (p) Object.assign(x, structuredClone(p));
      x.creation.preAging = undefined;
      x.creation.agedThrough = undefined;
      x.creation.agingLog = [];
    }, 'All aging before play undone.');

  return (
    <Card title="Aging before play">
      <p className="small muted" style={{ marginTop: 0 }}>
        A character over {start} makes an aging roll for each year of age from {start} before the saga begins (DE p.50): a stress die + age/10 (rounded up) − Living Conditions −
        Longevity Ritual bonus{d.agingRollMod ? ` ${signed(d.agingRollMod)} from Virtues and Flaws` : ''}. A result that would kill the character is not applied, so that year can be
        rolled again.
      </p>
      <div className="row">
        <Field label="Living Conditions" hint={`Default ${signed(autoLc)}${d.isMagus ? ' (covenant)' : ''}${d.livingConditionsMod ? ', with Virtues' : ''}.`}>
          <Stepper value={lc} min={-5} max={5} onChange={(v) => update((x) => void (x.creation.agingLivingConditions = v))} />
        </Field>
        <Field label="Longevity Ritual bonus" hint={d.isMagus ? 'Most magi have one by 35 (DE p.50).' : 'Made by a magus for the character.'}>
          <Stepper
            value={lr}
            min={0}
            max={30}
            onChange={(v) => update((x) => void (x.longevity = v ? { ...(x.longevity ?? { labTotal: v * 5, extraVis: 0 }), bonus: v } : undefined))}
          />
        </Field>
        <Field label="Aging Points you may place go to">
          <select value={anyChar} onChange={(e) => update((x) => void (x.creation.agingAnyChar = e.target.value as Characteristic))}>
            {CHARACTERISTICS.map((k) => (
              <option key={k} value={k}>
                {CHAR_NAMES[k]}
              </option>
            ))}
          </select>
        </Field>
        {lr > 0 && (
          <label className="inline small" title="After a crisis the ritual stops working until it is performed again with fresh vis">
            <input type="checkbox" checked={renew} onChange={(e) => update((x) => void (x.creation.renewLongevity = e.target.checked))} /> Renew the ritual after a crisis
          </label>
        )}
      </div>
      <div className="row" style={{ margin: '8px 0' }}>
        {remaining > 0 ? (
          <>
            <button onClick={() => roll(next)}>Roll age {next}</button>
            {remaining > 1 && (
              <button className="primary" onClick={() => roll(last)}>
                Roll all {remaining} years ({next}–{last})
              </button>
            )}
          </>
        ) : (
          <span className="small good-text">All aging rolls up to age {last} are made.</span>
        )}
        {c.creation.preAging && (
          <button className="small ghost" onClick={undoAll} title="Put the Characteristics, Decrepitude and Longevity Ritual back as they were before aging">
            Undo all aging
          </button>
        )}
        <span className="small muted">
          Decrepitude {decrepitudeScore(c.decrepitudePoints)} ({c.decrepitudePoints} points){c.apparentAge ? ` · looks ${c.apparentAge}` : ''}
        </span>
      </div>
      {(c.creation.agingLog?.length ?? 0) > 0 && (
        <details open={(c.creation.agingLog?.length ?? 0) <= 12}>
          <summary className="small">Aging log ({c.creation.agingLog!.length})</summary>
          <ul className="small" style={{ margin: '4px 0', paddingLeft: 18 }}>
            {c.creation.agingLog!.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
