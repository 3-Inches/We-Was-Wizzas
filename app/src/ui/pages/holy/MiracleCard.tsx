// A prayer for a miracle.

import { useState } from 'react';
import { HOLY_GUIDELINES, HOLY_POWERS, MIRACLE_NEED, MIRACLE_TIMELINESS } from '../../../data/divine';
import { holyMethodsOf, miracleLevel, miracleTotal, type CeremonyGroup } from '../../../engine/holy';
import { describeStress, stressDie } from '../../../engine/dice';
import type { AuraState } from '../../../engine/magic';
import { Card, Field, Stepper, Total, signed } from '../../kit';
import type { CharEditor } from '../../character/useChar';
import { score, type Fellow, useLines, Lines, CeremonyPicker } from './shared';

export function MiracleCard({ ed, aura, fellows }: { ed: CharEditor; aura: AuraState; fellows: Fellow[] }) {
  const { c, d, update } = ed;
  const [effLevel, setEffLevel] = useState(15);
  const [time, setTime] = useState<string>('week');
  const [need, setNeed] = useState<string>('beneficial');
  const [method, setMethod] = useState('');
  const [faithExtra, setFaithExtra] = useState(0);
  const [conf, setConf] = useState(0);
  const [ceremony, setCeremony] = useState<CeremonyGroup>();
  const [lines, show] = useLines();
  if (!c || !d) return null;
  const t = MIRACLE_TIMELINESS.find((x) => x.id === time)!;
  const n = MIRACLE_NEED.find((x) => x.id === need)!;
  const level = miracleLevel(effLevel, t.mod, n.mod);
  const faithCap = Math.max(0, Math.min(d.faithPoints - 1, Math.max(1, d.trueFaith) - 1));
  const confCap = c.type === 'grog' ? 0 : Math.min(c.confidence.score, c.confidence.points);
  const total = miracleTotal(d, { aura, method: method || undefined, faithExtra: Math.min(faithExtra, faithCap), confidence: Math.min(conf, confCap), ceremony });
  const pray = () => {
    const fx = Math.min(faithExtra, faithCap);
    const cx = Math.min(conf, confCap);
    const r = stressDie(1);
    update((x) => {
      x.faith = { score: d.trueFaith, points: Math.max(0, d.faithPoints - 1 - fx) };
      x.confidence.points = Math.max(0, x.confidence.points - cx);
    });
    const tot = total.total + r.value;
    const why = [`the effect ${effLevel}`, ...(t.mod ? [`${signed(t.mod)} ${t.label.split(' (')[0].toLowerCase()}`] : []), ...(n.mod ? [`${signed(n.mod)} ${n.label.split(':')[0].toLowerCase()}`] : [])].join(', ');
    const out = [`A Faith Point spent in prayer${fx ? `, and ${fx} more` : ''}${cx ? `, ${cx} Confidence` : ''}. Stress die ${describeStress(r)}: ${total.total} + ${r.value} = ${tot} against level ${level} (${why}).`];
    if (r.botches) {
      const weeks = r.botches;
      update((x) => {
        x.faith = { score: d.trueFaith, points: 0 };
        x.holy = { ...(x.holy ?? {}), faithLost: { points: Math.max(0, d.faithPoints - 1 - fx), weeks, text: 'a botched prayer' } };
      });
      out.push(`BOTCH (${r.botches}): all Faith Points are lost for ${weeks} week${weeks > 1 ? 's' : ''}; a tragedy of hubris may follow.`);
    } else if (tot >= level) {
      out.push('God answers: the miracle comes, in its time. It cannot be resisted, undone or altered.');
      if (level >= 30) out.push('A miracle of level 30 or more: those who only witness it gain a Warping Point (not those it is for).');
    } else out.push('No miracle, though the storyguide may send some lesser aid the roll allows.');
    show(out);
  };
  return (
    <Card title="Pray for a miracle" tour="holy-miracle" fold="holy-miracle" summary={`True Faith + Concentration + aura + stress die, a Faith Point spent (${d.faithPoints} left)`}>
      <p className="small muted">Optional rules: anyone with a Faith Point may pray. Infinite Penetration; the storyguide has the last word on what is prayed for.</p>
      <div className="row">
        <Field label="The effect’s level" hint="From the holy powers’ guidelines, or the Hermetic ones">
          <div className="row tight">
            <Stepper value={effLevel} min={1} max={100} width={44} onChange={setEffLevel} />
            <select value="" onChange={(e) => e.target.value && setEffLevel(Number(e.target.value))} aria-label="A guideline's level">
              <option value="">a guideline…</option>
              {HOLY_POWERS.map((pw) => (
                <optgroup key={pw.id} label={pw.name}>
                  {HOLY_GUIDELINES.filter((g) => g.power === pw.id && !g.general).map((g, i) => (
                    <option key={i} value={g.level}>
                      {g.level}: {g.text.length > 70 ? `${g.text.slice(0, 68)}…` : g.text}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </Field>
        <Field label="How soon">
          <select value={time} onChange={(e) => setTime(e.target.value)}>
            {MIRACLE_TIMELINESS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label} ({signed(x.mod)})
              </option>
            ))}
          </select>
        </Field>
        <Field label="The need">
          <select value={need} onChange={(e) => setNeed(e.target.value)}>
            {MIRACLE_NEED.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label} ({signed(x.mod)})
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="row small">
        {d.trueFaith > 0 && holyMethodsOf(d).length > 0 && (
          <Field label="In place of Concentration">
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="">Concentration</option>
              {holyMethodsOf(d).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} {x.score}
                </option>
              ))}
            </select>
          </Field>
        )}
        {faithCap > 0 && (
          <Field label={`More Faith Points (+${d.trueFaith >= 3 ? 6 : 3} each)`}>
            <Stepper value={faithExtra} min={0} max={faithCap} width={34} onChange={setFaithExtra} />
          </Field>
        )}
        {confCap > 0 && (
          <Field label="Confidence (+3 each)">
            <Stepper value={conf} min={0} max={confCap} width={34} onChange={setConf} />
          </Field>
        )}
      </div>
      <CeremonyPicker focus={d} fellows={fellows.filter((f) => f.d.faithPoints > 0)} value={ceremony} onChange={setCeremony} adds={(f) => f.d.trueFaith + Math.max(score(f.d, 'concentration'), ...holyMethodsOf(f.d).map((x) => x.score))} />
      <div className="row">
        <span>
          Total <Total value={total.total} parts={total.parts} notes={total.notes} label="Prayer" /> + stress die against <b>{level}</b>
        </span>
        <button onClick={pray} disabled={d.faithPoints < 1}>
          Pray
        </button>
      </div>
      <Lines lines={lines} />
    </Card>
  );
}
