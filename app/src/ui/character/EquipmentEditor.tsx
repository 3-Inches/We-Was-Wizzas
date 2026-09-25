import { uid } from '../../util/id';
import { allCombatLines } from '../../engine/combat';
import { Card, Field, signed } from '../kit';
import type { CharEditor } from './useChar';

export default function EquipmentEditor({ ed }: { ed: CharEditor }) {
  const { c, d, data, update } = ed;
  if (!c || !d) return null;
  const weapons = data.weapons.filter((w) => !['dodge', 'fist', 'kick'].includes(w.id));
  const shields = data.weapons.filter((w) => /shield/i.test(w.name));
  const lines = allCombatLines(d, data);
  return (
    <Card title="Weapons, armor & combat">
      <div className="grid grid-2">
        <div>
          <Field label="Armor">
            <div className="row">
              <select value={c.equipment.armorId ?? ''} onChange={(e) => update((x) => { x.equipment.armorId = e.target.value || undefined; if (!e.target.value) x.equipment.armorCoverage = 'none'; else if (x.equipment.armorCoverage === 'none') x.equipment.armorCoverage = 'partial'; })}>
                <option value="">No armor</option>
                {data.armor.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.cost})
                  </option>
                ))}
              </select>
              <select value={c.equipment.armorCoverage} onChange={(e) => update((x) => void (x.equipment.armorCoverage = e.target.value as 'none' | 'partial' | 'full'))}>
                <option value="none">—</option>
                <option value="partial">partial</option>
                <option value="full">full</option>
              </select>
            </div>
          </Field>
          <div className="small" style={{ marginTop: 8 }}>
            <b>Weapons & loadouts</b>
          </div>
          {c.equipment.weapons.map((w) => (
            <div key={w.uid} className="row" style={{ marginBottom: 4 }}>
              <select value={w.weaponId} onChange={(e) => update((x) => void (x.equipment.weapons.find((y) => y.uid === w.uid)!.weaponId = e.target.value))}>
                {weapons.map((wd) => (
                  <option key={wd.id} value={wd.id}>
                    {wd.name} ({wd.ability})
                  </option>
                ))}
              </select>
              <select value={w.shieldId ?? ''} onChange={(e) => update((x) => void (x.equipment.weapons.find((y) => y.uid === w.uid)!.shieldId = e.target.value || undefined))}>
                <option value="">no shield</option>
                {shields.map((s) => (
                  <option key={s.id} value={s.id}>
                    + {s.name}
                  </option>
                ))}
              </select>
              <button className="small ghost" onClick={() => update((x) => void (x.equipment.weapons = x.equipment.weapons.filter((y) => y.uid !== w.uid)))}>
                ✕
              </button>
            </div>
          ))}
          <button className="small" onClick={() => update((x) => void x.equipment.weapons.push({ uid: uid(), weaponId: weapons[0]?.id ?? 'dagger' }))}>
            + Weapon
          </button>
          <Field label="Other possessions">
            <textarea value={c.equipment.other} onChange={(e) => update((x) => void (x.equipment.other = e.target.value))} rows={3} />
          </Field>
        </div>
        <div>
          <div className="row" style={{ marginBottom: 8 }}>
            <div className="stat">
              <span className="v">{signed(d.soak)}</span>
              <span className="l">Soak</span>
            </div>
            <div className="stat">
              <span className="v">{d.load}</span>
              <span className="l">Load</span>
            </div>
            <div className="stat">
              <span className="v">{d.burden}</span>
              <span className="l">Burden</span>
            </div>
            <div className="stat">
              <span className="v">{d.encumbrance}</span>
              <span className="l">Encumbrance</span>
            </div>
            <div className="stat">
              <span className="v">{signed(d.size)}</span>
              <span className="l">Size</span>
            </div>
          </div>
          <table className="compact">
            <thead>
              <tr>
                <th>Weapon</th>
                <th className="num">Init</th>
                <th className="num">Atk</th>
                <th className="num">Dfn</th>
                <th className="num">Dam</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    {l.name}
                    <span className="small muted">
                      {' '}
                      {l.ability} {l.abilityScore}
                      {l.specialty ? '*' : ''}
                    </span>
                    {l.notes.map((n, j) => (
                      <div key={j} className="small warn-text">
                        {n}
                      </div>
                    ))}
                  </td>
                  <td className="num">{signed(l.init)}</td>
                  <td className="num">{l.atk === null ? '—' : signed(l.atk)}</td>
                  <td className="num">{signed(l.dfn)}</td>
                  <td className="num">{l.dam === null ? '—' : signed(l.dam)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted">Totals exclude the stress die. Wound and Fatigue penalties are included when present.</p>
        </div>
      </div>
    </Card>
  );
}
