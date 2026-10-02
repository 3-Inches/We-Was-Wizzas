import { useState } from 'react';
import type { DerivedCharacter } from '../../engine/character/derive';
import { conditionalBonuses } from '../../engine/magic';
import { Field, Stepper } from '../kit';

export interface Conditions {
  focus: boolean;
  circumstance: string[];
  other: number;
}

export function useConditions(): [Conditions, (c: Conditions) => void] {
  const [c, set] = useState<Conditions>({ focus: false, circumstance: [], other: 0 });
  return [c, set];
}

/** One-click switches for bonuses that only apply sometimes: a Magical Focus, Special Circumstances, Cyclic Magic, and anything else. */
export function ConditionsBar({ d, value, onChange }: { d: DerivedCharacter; value: Conditions; onChange: (c: Conditions) => void }) {
  const conditional = conditionalBonuses(d);
  return (
    <div className="row small" style={{ margin: '4px 0' }}>
      {d.magicalFocus !== 'none' && (
        <label className="inline">
          <input type="checkbox" checked={value.focus} onChange={(e) => onChange({ ...value, focus: e.target.checked })} /> Inside my Magical Focus ({d.focusText ?? d.magicalFocus})
        </label>
      )}
      {conditional.map((b) => (
        <label key={b.uid} className="inline">
          <input
            type="checkbox"
            checked={value.circumstance.includes(b.uid)}
            onChange={(e) => onChange({ ...value, circumstance: e.target.checked ? [...value.circumstance, b.uid] : value.circumstance.filter((x) => x !== b.uid) })}
          />{' '}
          {b.label}
        </label>
      ))}
      <Field label="Other modifier">
        <Stepper value={value.other} min={-30} max={30} width={40} onChange={(v) => onChange({ ...value, other: v })} />
      </Field>
    </div>
  );
}
