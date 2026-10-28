// Diseases a character suffers (Art & Academe): catching one, its stage and Disease Penalty, a
// physician's Prognosis, and the Disease Recovery roll at the end of each interval.

import { useState } from 'react';
import { auraRecovery } from '../../../engine/aura';
import { DISEASES, STAGES, STAGE_PENALTY, avoidanceRoll, currentSeverity, illnessFrom, prognosisTotal, recoveryRoll } from '../../../engine/disease';
import { livingConditions } from '../../../engine/time';
import type { Illness } from '../../../engine/types';
import { uid } from '../../../util/id';
import { Card, Field, Stepper } from '../../kit';
import { RulesNote } from '../../RulesNote';
import type { CharEditor } from '../useChar';
import { optionOn } from '../../../engine/optional';

export function IllnessCard({ ed }: { ed: CharEditor }) {
  const { c, d, update, ctx, saga } = ed;
  const [pick, setPick] = useState(DISEASES[0]?.id ?? '');
  const [log, setLog] = useState<string[]>([]);
  const [doc, setDoc] = useState({ int: 2, medicine: 4, apothecary: 0, chirurgy: 0 });
  const [other, setOther] = useState(0);
  const [atHome, setAtHome] = useState(true);
  if (!c || !d) return null;
  // turned off for the saga: still shown while the character is ill, so an illness can be cured
  if (!optionOn(saga, 'illness') && !(c.illnesses ?? []).length) return null;
  const living = livingConditions(d, ctx);
  const def = DISEASES.find((x) => x.id === pick);
  const ills = c.illnesses ?? [];
  const note = (t: string) => setLog((l) => [t, ...l].slice(0, 10));

  const catchIt = () => {
    if (!def) return;
    const r = avoidanceRoll(d, living, def);
    if (!r.caught) return note(`Disease Avoidance for ${def.name}: ${r.text}. Avoided.`);
    update((x) => {
      const ill = illnessFrom(def);
      if (r.worse && ill.stage !== 'Critical') ill.stage = STAGES[STAGES.indexOf(ill.stage) + 1];
      x.illnesses = [...(x.illnesses ?? []), ill];
    });
    note(`Disease Avoidance for ${def.name}: ${r.text}. Caught${r.worse ? ', a stage worse (a botch)' : ''}; the symptoms show within half an interval.`);
  };
  const add = (ill: Illness) => update((x) => void (x.illnesses = [...(x.illnesses ?? []), ill]));
  const recover = (ill: Illness) => {
    const progTotal = prognosisTotal({ ...doc, living });
    const medicine = progTotal > currentSeverity(ill) ? doc.medicine : 0;
    let text = '';
    update((x) => {
      text = recoveryRoll(x, d, ill.uid, { medicine, other, aura: atHome ? ctx.aura : undefined }).text;
    });
    note(`${ill.name}: ${text}${medicine ? '' : doc.medicine ? ` (the physician's Prognosis Total ${progTotal} does not beat Severity ${currentSeverity(ill)}, so no Medicine)` : ''}`);
  };

  return (
    <Card title="Illness">
      <RulesNote book="AA" line={1700} endLine={1800}>
        A disease&apos;s penalty counts like a Wound Penalty; roll for recovery at the end of each interval.
      </RulesNote>
      {ills.map((ill) => (
        <div key={ill.uid} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="row">
            <b>{ill.name}</b>
            <select value={ill.stage} onChange={(e) => update((x) => { const i = x.illnesses?.find((y) => y.uid === ill.uid); if (i) i.stage = e.target.value as Illness['stage']; })}>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className={`badge ${ill.stage === 'Critical' ? 'bad' : 'warn'}`}>
              {ill.stage === 'Critical' ? 'Crisis: no action' : ill.flawInstead ? 'a Flaw instead of a penalty' : `${STAGE_PENALTY[ill.stage]} Disease Penalty`}
            </span>
            <span className="small muted">
              Severity {currentSeverity(ill)} · Stable {ill.stable} · Improve {ill.improve ?? '—'} · every {ill.interval.toLowerCase()}
              {ill.bonus ? ` · next roll ${ill.bonus > 0 ? '+' : ''}${ill.bonus}` : ''}
            </span>
            <label className="inline small">
              <input type="checkbox" checked={!!ill.flawInstead} onChange={(e) => update((x) => { const i = x.illnesses?.find((y) => y.uid === ill.uid); if (i) i.flawInstead = e.target.checked || undefined; })} /> a Flaw instead
            </label>
            <button className="small primary" onClick={() => recover(ill)} disabled={ill.interval === 'Lifelong'}>
              Recovery roll
            </button>
            <button className="small ghost" onClick={() => update((x) => void (x.illnesses = (x.illnesses ?? []).filter((y) => y.uid !== ill.uid)))} title="Cured by magic or the storyguide">
              Cured
            </button>
          </div>
          {DISEASES.find((x) => x.id === ill.diseaseId)?.symptoms && <div className="small muted">Symptoms: {DISEASES.find((x) => x.id === ill.diseaseId)!.symptoms}</div>}
        </div>
      ))}
      <div className="row" style={{ marginTop: 8 }}>
        <Field label="A disease from the books">
          <select value={pick} onChange={(e) => setPick(e.target.value)}>
            {DISEASES.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} ({x.stage}, Severity {x.severity})
              </option>
            ))}
          </select>
        </Field>
        <button className="small" onClick={catchIt} title="Stamina + Living Conditions + Corpus/5 + Wound Penalty + stress die against its Stable Ease Factor">
          Exposed: roll to avoid it
        </button>
        <button className="small ghost" onClick={() => def && add(illnessFrom(def))}>
          + Has it
        </button>
        <button className="small ghost" onClick={() => add({ uid: uid(), name: 'A disease', stage: 'Minor', startStage: 'Minor', severity: 6, stable: 6, improve: 12, interval: 'Week', bonus: 0 })}>
          + Another disease
        </button>
      </div>
      {def && ills.length === 0 && <div className="small muted">{def.cause}</div>}
      {ills.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary className="small" style={{ cursor: 'pointer' }}>
            Physician and aid (Prognosis Total {prognosisTotal({ ...doc, living })}){other ? `, other ${other > 0 ? '+' : ''}${other}` : ''}
          </summary>
        <div className="row" style={{ marginTop: 8 }}>
          <Field label="Physician: Int + Medicine" hint="Their Prognosis Total must beat the Severity for their Medicine to count">
            <span className="row tight">
              <Stepper value={doc.int} min={-5} max={10} width={32} onChange={(v) => setDoc({ ...doc, int: v })} />
              <Stepper value={doc.medicine} min={0} max={20} width={32} onChange={(v) => setDoc({ ...doc, medicine: v })} />
            </span>
          </Field>
          <Field label="Apothecary / Chirurgy" hint="Help of each, at most +3">
            <span className="row tight">
              <Stepper value={doc.apothecary} min={0} max={10} width={32} onChange={(v) => setDoc({ ...doc, apothecary: v })} />
              <Stepper value={doc.chirurgy} min={0} max={10} width={32} onChange={(v) => setDoc({ ...doc, chirurgy: v })} />
            </span>
          </Field>
          <Field label="Magical aid, other">
            <Stepper value={other} min={-10} max={20} width={36} onChange={setOther} />
          </Field>
          {auraRecovery(ctx.aura).parts.map((p) => (
            <label key={p.label} className="inline small" title={auraRecovery(ctx.aura).noImprovement ? 'No disease tended in an Infernal aura improves: an Improvement counts as Stable (Realms of Power: The Infernal)' : undefined}>
              <input type="checkbox" checked={atHome} onChange={(e) => setAtHome(e.target.checked)} /> tended at the covenant: {p.label} ({p.value > 0 ? '+' : ''}
              {p.value}
              {auraRecovery(ctx.aura).noImprovement ? ', and no improvement' : ''})
            </label>
          ))}
          <span className="small muted">Prognosis Total {prognosisTotal({ ...doc, living })} (with Living Conditions {living}).</span>
        </div>
        </details>
      )}
      {log.map((l, i) => (
        <div key={i} className="small list-row">
          {l}
        </div>
      ))}
    </Card>
  );
}
