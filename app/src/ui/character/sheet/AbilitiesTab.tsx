import { useState } from 'react';
import { PARAMETERIZED_ABILITIES } from '../../../data';
import { ensureAbility } from '../../../engine/character/factory';
import { Card, Stepper, Total } from '../../kit';
import type { CharEditor } from '../useChar';

export default function AbilitiesTab({ ed }: { ed: CharEditor }) {
  const { c, d, data, update } = ed;
  const [add, setAdd] = useState('');
  const [param, setParam] = useState('');
  if (!c || !d) return null;
  const groups = ['General', 'Academic', 'Arcane', 'Martial', 'Supernatural', 'Mystery', 'Heroic', 'Special', 'Social', 'Spell Mastery'];
  return (
    <Card title="Abilities" className="accent">
      <p className="small muted" style={{ marginTop: 0 }}>
        Scores include Affinity. "Adjust" adds or removes experience directly (for corrections or story awards); use the Seasons tab for normal advancement. A score in
        parentheses is experience towards the next level.
      </p>
      {groups.map((g) => {
        const list = d.abilities.filter((a) => a.type === g).sort((a, b) => a.name.localeCompare(b.name));
        if (!list.length) return null;
        return (
          <div key={g} style={{ marginBottom: 10 }}>
            <h4>{g}</h4>
            <table className="compact">
              <thead>
                <tr>
                  <th>Ability</th>
                  <th>Specialty</th>
                  <th className="num">Score</th>
                  <th className="num">Total</th>
                  <th>Adjust xp</th>
                  <th>Override</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => {
                  const ab = c.abilities.find((x) => x.uid === a.uid)!;
                  return (
                    <tr key={a.uid}>
                      <td>
                        {a.name} {a.affinity && <span className="badge info">Aff</span>}
                      </td>
                      <td>
                        <input value={ab.specialty ?? ''} style={{ width: 150 }} onChange={(e) => update((x) => void (x.abilities.find((y) => y.uid === a.uid)!.specialty = e.target.value))} />
                      </td>
                      <td className="num">
                        <Total value={`${a.score}${a.remainder ? ` (${a.remainder})` : ''}`} parts={Object.entries(ab.xp).map(([k, v]) => ({ label: k, value: v ?? 0 }))} label={`${a.effectiveXp} effective xp`} />
                      </td>
                      <td className="num">
                        <b>{a.total}</b>
                        {a.bonus ? <span className="small muted"> (+{a.bonus})</span> : null}
                      </td>
                      <td>
                        <Stepper value={ab.xp.adjust ?? 0} step={5} width={46} onChange={(v) => update((x) => { const y = x.abilities.find((z) => z.uid === a.uid)!; if (v) y.xp.adjust = v; else delete y.xp.adjust; })} />
                      </td>
                      <td>
                        <input
                          type="number"
                          style={{ width: 54 }}
                          placeholder="—"
                          value={c.overrides[`ability:${a.uid}`] ?? ''}
                          title="Force a score (house ruling)"
                          onChange={(e) => update((x) => { if (e.target.value === '') delete x.overrides[`ability:${a.uid}`]; else x.overrides[`ability:${a.uid}`] = Number(e.target.value); })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
      <div className="row">
        <select value={add} onChange={(e) => setAdd(e.target.value)}>
          <option value="">+ Add an Ability…</option>
          {data.abilities
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type})
              </option>
            ))}
        </select>
        {add && PARAMETERIZED_ABILITIES[add] && <input value={param} onChange={(e) => setParam(e.target.value)} placeholder={PARAMETERIZED_ABILITIES[add]} />}
        <button
          disabled={!add}
          onClick={() => {
            update((x) => void ensureAbility(x, add, {}, param || undefined));
            setAdd('');
            setParam('');
          }}
        >
          Add
        </button>
      </div>
    </Card>
  );
}
