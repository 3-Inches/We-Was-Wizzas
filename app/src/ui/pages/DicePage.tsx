import { useState } from 'react';
import { describeStress, simpleDie, stressDie } from '../../engine/dice';
import { Card, Field, Stepper, signed } from '../kit';

interface Roll {
  id: number;
  label: string;
  kind: 'simple' | 'stress';
  mod: number;
  ease: number | null;
  total: number;
  text: string;
  botch: boolean;
}

let seq = 0;

export default function DicePage() {
  const [label, setLabel] = useState('');
  const [mod, setMod] = useState(0);
  const [botchDice, setBotchDice] = useState(1);
  const [ease, setEase] = useState(6);
  const [useEase, setUseEase] = useState(true);
  const [log, setLog] = useState<Roll[]>([]);
  const last = log[0];

  const roll = (kind: 'simple' | 'stress') => {
    let total: number;
    let text: string;
    let botch = false;
    if (kind === 'simple') {
      const r = simpleDie();
      total = r.value + mod;
      text = `${r.value}`;
    } else {
      const r = stressDie(botchDice);
      botch = r.botches > 0;
      total = r.zero ? mod : r.value + mod;
      text = describeStress(r);
    }
    setLog((l) => [{ id: ++seq, label: label || (kind === 'simple' ? 'Simple die' : 'Stress die'), kind, mod, ease: useEase ? ease : null, total, text, botch }, ...l].slice(0, 50));
  };

  const outcome = (r: Roll) => (r.botch ? 'BOTCH' : r.ease === null ? '' : r.total >= r.ease ? 'success' : 'failure');

  return (
    <div className="stack">
      <h1>Dice</h1>
      <div className="grid grid-2">
        <Card title="Roll" className="accent">
          <Field label="What is this roll for?">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Per + Awareness, Casting Pilum of Fire" />
          </Field>
          <div className="row" style={{ marginTop: 8 }}>
            <Field label="Modifier (Characteristic + Ability …)">
              <Stepper value={mod} width={46} onChange={setMod} />
            </Field>
            <Field label="Botch dice">
              <Stepper value={botchDice} min={0} max={20} width={36} onChange={setBotchDice} />
            </Field>
            <Field label={<label className="inline"><input type="checkbox" checked={useEase} onChange={(e) => setUseEase(e.target.checked)} /> Ease Factor</label>}>
              <Stepper value={ease} min={0} width={36} onChange={setEase} />
            </Field>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="primary big" onClick={() => roll('stress')}>
              Stress die
            </button>
            <button className="big" onClick={() => roll('simple')}>
              Simple die
            </button>
          </div>
          {last && (
            <div className={`dice-result ${last.botch ? 'bad' : outcome(last) === 'success' ? 'good' : outcome(last) === 'failure' ? 'warn' : ''}`}>
              <div className="dice-total">{last.botch ? 'BOTCH' : last.total}</div>
              <div className="small">
                {last.label}: {last.text} {signed(last.mod)}
                {last.ease !== null && ` vs ${last.ease} — ${outcome(last)}`}
              </div>
            </div>
          )}
          <p className="small muted">
            Stress die: a 1 means roll again and double (repeatedly); a 0 counts as zero and you roll the botch dice — any 0 on them is a botch. Simple die: 1–10, a 0 counts as 10 (DE
            p.7).
          </p>
        </Card>
        <Card title="History" actions={<button className="small ghost" onClick={() => setLog([])}>Clear</button>}>
          {log.length === 0 && <div className="small muted">No rolls yet.</div>}
          {log.map((r) => (
            <div key={r.id} className="list-row small">
              <b style={{ minWidth: 40 }}>{r.botch ? '✖' : r.total}</b>
              <span style={{ flex: 1 }}>
                {r.label} ({r.kind}: {r.text} {signed(r.mod)})
              </span>
              {outcome(r) && <span className={`badge ${r.botch ? 'bad' : outcome(r) === 'success' ? 'good' : 'warn'}`}>{outcome(r)}</span>}
            </div>
          ))}
        </Card>
      </div>
      <Card title="Ease Factors (DE)">
        <table className="compact">
          <tbody>
            {[
              [0, 'Trivial'],
              [3, 'Simple'],
              [6, 'Easy'],
              [9, 'Average'],
              [12, 'Hard'],
              [15, 'Very Hard'],
              [18, 'Impressive'],
              [21, 'Remarkable'],
              [24, 'Almost Impossible'],
            ].map(([n, t]) => (
              <tr key={n}>
                <td className="num">{n}+</td>
                <td>{t}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
