// A list of a roll's modifiers to tick (invoking a saint, threatening one, a recitation of Ars Notoria),
// shared by the Faith & miracles page and the Seasons page's Seasons of devotion.

import type { InvocationMod } from '../../data/divine';
import type { Part } from '../../engine/magic';
import { Stepper, signed } from '../kit';

export function ModList({ mods, value, onChange }: { mods: InvocationMod[]; value: Record<string, number>; onChange: (v: Record<string, number>) => void }) {
  return (
    <div className="row small" style={{ flexWrap: 'wrap', gap: '2px 12px' }}>
      {mods.map((m) => (
        <label key={m.id} className="inline">
          <input type="checkbox" checked={m.id in value} onChange={(e) => {
            const v = { ...value };
            if (e.target.checked) v[m.id] = m.mod;
            else delete v[m.id];
            onChange(v);
          }} />{' '}
          {m.label} ({m.min !== undefined ? `${signed(m.min)} to ${signed(m.max!)}` : signed(m.mod)})
          {m.id in value && m.min !== undefined && <Stepper value={value[m.id]} min={m.min} max={m.max} width={30} onChange={(n) => onChange({ ...value, [m.id]: n })} />}
        </label>
      ))}
    </div>
  );
}

export const modParts = (mods: InvocationMod[], v: Record<string, number>): Part[] => mods.filter((m) => m.id in v).map((m) => ({ label: m.label, value: v[m.id] }));
