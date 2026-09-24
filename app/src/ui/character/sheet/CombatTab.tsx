import { useState } from 'react';
import { RECOVERY, allCombatLines, woundFromDamage } from '../../../engine/combat';
import { describeStress, stressDie } from '../../../engine/dice';
import type { WoundState } from '../../../engine/types';
import { Card, Field, Stepper, signed } from '../../kit';
import EquipmentEditor from '../EquipmentEditor';
import type { CharEditor } from '../useChar';

const WOUND_KEYS: { key: keyof Omit<WoundState, 'dead'>; label: string; pen: number }[] = [
  { key: 'light', label: 'Light', pen: -1 },
  { key: 'medium', label: 'Medium', pen: -3 },
  { key: 'heavy', label: 'Heavy', pen: -5 },
  { key: 'incapacitating', label: 'Incapacitated', pen: 0 },
];

const FATIGUE_RECOVERY = ['—', '2 minutes', '10 minutes', '30 minutes', '1 hour', '2 hours'];

export default function CombatTab({ ed }: { ed: CharEditor }) {
  const { c, d, data, update } = ed;
  const [damage, setDamage] = useState(0);
  const [msg, setMsg] = useState<string[]>([]);
  const [medic, setMedic] = useState(0);
  const [aid, setAid] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);
  if (!c || !d) return null;
  const lines = allCombatLines(d, data);
  const line = lines[Math.min(lineIdx, lines.length - 1)];
  const push = (s: string) => setMsg((m) => [s, ...m].slice(0, 20));
  const lost = Math.min(5, c.fatigueLost + c.longTermFatigueLost);

  const applyDamage = () => {
    const excess = damage - d.soak;
    const w = woundFromDamage(d, excess);
    if (w === 'none') {
      push(`Damage ${damage} vs Soak ${d.soak}: no wound.`);
      return;
    }
    push(`Damage ${damage} − Soak ${d.soak} = ${excess}: ${w} wound.`);
    update((x) => {
      if (w === 'dead') x.wounds.dead = true;
      else x.wounds[w] += 1;
    });
  };

  const roll = (label: string, bonus: number, botch = 1) => {
    const r = stressDie(botch);
    push(`${label}: ${signed(bonus)} + ${describeStress(r)} = ${r.botches ? 'BOTCH' : bonus + r.value}`);
  };

  const recover = (key: 'light' | 'medium' | 'heavy') => {
    const r = stressDie(1);
    const total = r.botches ? 0 : d.characteristics.Sta.value + medic + aid + r.value;
    const rec = RECOVERY[key];
    let text: string;
    if (total >= rec.improve) {
      text = 'improves one level';
      update((x) => {
        x.wounds[key] -= 1;
        if (key === 'medium') x.wounds.light += 1;
        if (key === 'heavy') x.wounds.medium += 1;
      });
    } else if (total >= rec.stable) text = 'stable (+3 to future rolls for this wound)';
    else {
      text = 'worsens one level (infection)';
      update((x) => {
        x.wounds[key] -= 1;
        if (key === 'light') x.wounds.medium += 1;
        if (key === 'medium') x.wounds.heavy += 1;
        if (key === 'heavy') x.wounds.incapacitating += 1;
      });
    }
    push(`Recovery (${key}, ${rec.interval}): Sta ${d.characteristics.Sta.value} + medic ${medic} + aid ${aid} + ${describeStress(r)} = ${total} vs ${rec.stable}/${rec.improve}: ${text}.`);
  };

  const recoverIncap = () => {
    const r = stressDie(1);
    const total = r.botches ? 0 : d.characteristics.Sta.value + medic + aid + r.value;
    let text: string;
    if (total <= 0) {
      text = 'the character dies';
      update((x) => void (x.wounds.dead = true));
    } else if (total >= 9) {
      text = 'Incapacitating wounds become Heavy';
      update((x) => {
        x.wounds.heavy += x.wounds.incapacitating;
        x.wounds.incapacitating = 0;
      });
    } else text = 'condition worsens: cumulative −1 to later rolls';
    push(`Incapacitation recovery: ${total}: ${text}.`);
  };

  return (
    <div className="stack">
      <div className="grid grid-2">
        <Card title="Wounds" className="accent">
          <div className="row" style={{ marginBottom: 8 }}>
            <div className="stat">
              <span className="v">{signed(d.soak)}</span>
              <span className="l">Soak</span>
            </div>
            <div className="stat">
              <span className="v">{d.currentWoundPenalty}</span>
              <span className="l">Wound penalty</span>
            </div>
            <div className="stat">
              <span className="v">{d.currentFatiguePenalty}</span>
              <span className="l">Fatigue penalty</span>
            </div>
            {c.wounds.dead && <span className="badge bad">DEAD</span>}
          </div>
          <table className="compact">
            <thead>
              <tr>
                <th>Wound</th>
                <th>Range (damage − soak)</th>
                <th className="num">Penalty</th>
                <th>Count</th>
                <th>Recovery</th>
              </tr>
            </thead>
            <tbody>
              {WOUND_KEYS.map((w) => {
                const range = w.key === 'incapacitating' ? d.woundRanges.incap : d.woundRanges[w.key];
                return (
                  <tr key={w.key}>
                    <td>{w.label}</td>
                    <td>{range.join('–')}</td>
                    <td className="num">{w.pen || '—'}</td>
                    <td>
                      <Stepper value={c.wounds[w.key]} min={0} width={36} onChange={(v) => update((x) => void (x.wounds[w.key] = v))} />
                    </td>
                    <td>
                      {w.key === 'incapacitating' ? (
                        <button className="small" disabled={!c.wounds.incapacitating} onClick={recoverIncap} title="Twice daily; 0 or less dies, 9+ becomes Heavy">
                          Roll
                        </button>
                      ) : (
                        <button className="small" disabled={!c.wounds[w.key]} onClick={() => recover(w.key as 'light' | 'medium' | 'heavy')} title={`${RECOVERY[w.key as 'light'].interval}; stable ${RECOVERY[w.key as 'light'].stable}, improve ${RECOVERY[w.key as 'light'].improve}`}>
                          Roll ({RECOVERY[w.key as 'light'].interval.toLowerCase()})
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td>Dead</td>
                <td>{d.woundRanges.dead}+</td>
                <td />
                <td>
                  <input type="checkbox" checked={!!c.wounds.dead} onChange={(e) => update((x) => void (x.wounds.dead = e.target.checked))} />
                </td>
                <td />
              </tr>
            </tbody>
          </table>
          <div className="row" style={{ marginTop: 10 }}>
            <Field label="Damage total taken">
              <Stepper value={damage} min={0} width={50} onChange={setDamage} />
            </Field>
            <button onClick={applyDamage}>Apply damage</button>
            <Field label="Medic's Chirurgy / Medicine">
              <Stepper value={medic} min={0} width={36} onChange={setMedic} />
            </Field>
            <Field label="Magical aid">
              <Stepper value={aid} min={0} width={36} onChange={setAid} />
            </Field>
          </div>
          <p className="small muted">Recovery Total = Stamina + medic's Ability + magical aid + stress die. Wound penalties do not apply (DE p.405).</p>
        </Card>

        <Card title="Fatigue">
          <table className="compact">
            <tbody>
              {d.fatigueLevels.map((f, i) => (
                <tr key={f.name} className={i === lost ? 'selected' : ''}>
                  <td>{i === lost ? '▶' : ''}</td>
                  <td>{f.name}</td>
                  <td className="num">{f.penalty === null ? '—' : f.penalty}</td>
                  <td className="small muted">{FATIGUE_RECOVERY[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row" style={{ marginTop: 8 }}>
            <Field label="Short-term levels lost">
              <Stepper value={c.fatigueLost} min={0} max={5} width={36} onChange={(v) => update((x) => void (x.fatigueLost = v))} />
            </Field>
            <Field label="Long-term levels lost">
              <Stepper value={c.longTermFatigueLost} min={0} max={5} width={36} onChange={(v) => update((x) => void (x.longTermFatigueLost = v))} />
            </Field>
            <button className="small" onClick={() => update((x) => void (x.fatigueLost = Math.max(0, x.fatigueLost - 1)))}>
              Recover one
            </button>
            <button className="small" onClick={() => update((x) => { x.fatigueLost = 0; x.longTermFatigueLost = 0; })} title="A good night's sleep restores long-term Fatigue">
              Night's sleep
            </button>
          </div>
          <p className="small muted">Short-term Fatigue recovers with rest (times above, doubled if active). Long-term Fatigue (Ritual spells, forced march) needs a good night's sleep.</p>
        </Card>
      </div>

      <Card title="Combat rolls">
        {lines.length > 0 && line && (
          <div className="row">
            <select value={lineIdx} onChange={(e) => setLineIdx(Number(e.target.value))}>
              {lines.map((l, i) => (
                <option key={i} value={i}>
                  {l.name}
                </option>
              ))}
            </select>
            <button onClick={() => roll(`${line.name} Initiative`, line.init)}>Initiative {signed(line.init)}</button>
            {line.atk !== null && <button onClick={() => roll(`${line.name} Attack`, line.atk!)}>Attack {signed(line.atk)}</button>}
            <button onClick={() => roll(`${line.name} Defense`, line.dfn)}>Defense {signed(line.dfn)}</button>
            <button onClick={() => roll('Soak (fixed)', d.soak, 0)} title="Soak is not rolled; this just logs it">
              Soak {signed(d.soak)}
            </button>
            {line.dam !== null && <span className="small">Damage on a hit: Attack Advantage + {signed(line.dam)}</span>}
          </div>
        )}
        <p className="small muted">Attack Advantage = Attack Total − Defense Total. Damage Total = Attack Advantage + weapon damage + Strength; subtract target Soak and look up the wound.</p>
        {msg.map((m, i) => (
          <div key={i} className="small list-row">
            {m}
          </div>
        ))}
      </Card>

      <EquipmentEditor ed={ed} />
    </div>
  );
}
