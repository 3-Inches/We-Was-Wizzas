// Original research toward a Breakthrough (Houses of Hermes: True Lineages): the Discoveries a magus
// has stabilized, the points they add up to, and the stabilization season with its Warping.

import { useState } from 'react';
import { BREAKTHROUGH_GUIDE, researchRiskLimit, rollStabilization } from '../../../engine/experiment';
import { uid } from '../../../util/id';
import { Card, Field, Stepper } from '../../kit';
import { RulesNote } from '../../RulesNote';
import type { CharEditor } from '../useChar';
import { optionOn } from '../../../engine/optional';

export function OriginalResearch({ ed, magicTheory }: { ed: CharEditor; magicTheory: number }) {
  const { c, update, ctx, saga } = ed;
  const [name, setName] = useState('');
  const [magnitude, setMagnitude] = useState(1);
  const [risk, setRisk] = useState(1);
  const [adjust, setAdjust] = useState(0);
  const [log, setLog] = useState<string[][]>([]);
  if (!c) return null;
  if (!optionOn(saga, 'originalResearch') && !c.research) return null;
  const r = c.research;
  const maxRisk = researchRiskLimit(magicTheory);
  const points = (r?.discoveries ?? []).reduce((t, x) => t + x.magnitude, 0);
  const when = saga ? { year: saga.currentYear, season: saga.currentSeason } : {};

  const add = (fromText: boolean) =>
    update((x) => {
      x.research ??= { goal: '', kind: 'minor', discoveries: [] };
      x.research.discoveries.push({ uid: uid(), name: name || (fromText ? 'Another magus’s Lab Text' : 'A stabilized Discovery'), magnitude, fromText: fromText || undefined, ...when });
    });

  const stabilize = () => {
    const res = rollStabilization({ risk: Math.min(risk, maxRisk), adjust, magnitude, auraStrength: ctx.aura.strength, originalResearch: true, safety: ctx.lab?.characteristics.Safety ?? 0 });
    const lines = [...res.lines];
    update((x) => {
      x.warpingPoints += res.warpingPoints;
      if (res.stable) {
        x.research ??= { goal: '', kind: 'minor', discoveries: [] };
        x.research.discoveries.push({ uid: uid(), name: name || 'A stabilized Discovery', magnitude, ...when });
      }
    });
    lines.push(res.stable ? `Stabilized: +${magnitude} toward the Breakthrough, and a Laboratory Text of the discovery.` : 'Not stabilized: you may try again next season.');
    if (res.warpingPoints) lines.push(`${res.warpingPoints} Warping Point${res.warpingPoints > 1 ? 's' : ''} added.${res.warpingPoints >= 2 ? " Roll for Wizard's Twilight on the Advancement tab." : ''}`);
    setLog((l) => [lines, ...l].slice(0, 8));
  };

  return (
    <Card title="Original research" tour="original-research">
      <RulesNote book="HoH_TL" line={849} endLine={943}>
        Experiment until a Discovery, then stabilize it the next season: its magnitude counts toward the Breakthrough, at a cost in Warping.
      </RulesNote>
      <div className="row">
        <Field label="The Breakthrough sought">
          <input value={r?.goal ?? ''} placeholder="e.g. break the Limit of Vis" onChange={(e) => update((x) => void ((x.research ??= { goal: '', kind: 'minor', discoveries: [] }).goal = e.target.value))} />
        </Field>
        <Field label="Kind">
          <select value={r?.kind ?? 'minor'} onChange={(e) => update((x) => void ((x.research ??= { goal: '', kind: 'minor', discoveries: [] }).kind = e.target.value as 'minor'))}>
            {Object.entries(BREAKTHROUGH_GUIDE).map(([k, g]) => (
              <option key={k} value={k}>
                {g.label} (about {g.points} points)
              </option>
            ))}
          </select>
        </Field>
        <Field label="Storyguide's target" hint="Set by the storyguide, best kept from the player; the book's guide is in brackets">
          <Stepper value={r?.target ?? 0} min={0} max={200} width={44} onChange={(v) => update((x) => void ((x.research ??= { goal: '', kind: 'minor', discoveries: [] }).target = v || undefined))} />
        </Field>
        <span className="stat">
          <span className="v">{points}</span>
          <span className="l">points</span>
        </span>
        {r?.target ? <span className={`badge ${points >= r.target ? 'good' : ''}`}>{points >= r.target ? 'Breakthrough reached' : 'not yet'}</span> : null}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <Field label="The discovery (its spell or enchantment)">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wizard's Reach (Ignem)" />
        </Field>
        <Field label="Magnitude">
          <Stepper value={magnitude} min={1} max={20} width={36} onChange={setMagnitude} />
        </Field>
        <Field label="Risk" hint={`Up to +${maxRisk} with Magic Theory ${magicTheory}`}>
          <Stepper value={Math.min(risk, maxRisk)} min={0} max={maxRisk} width={36} onChange={setRisk} />
        </Field>
        <Field label="Moved for the Discovery" hint="The amount of risk added (+) or taken off (−) to reach the Discovery">
          <Stepper value={adjust} min={-maxRisk} max={maxRisk} width={36} onChange={setAdjust} />
        </Field>
        <button className="primary" onClick={stabilize}>
          Stabilize (a season)
        </button>
        <button className="small ghost" onClick={() => add(true)} title="Points from another magus's Lab Text on the same Breakthrough, once worked through (no Warping)">
          + from a Lab Text
        </button>
      </div>
      {log.map((lines, i) => (
        <div key={log.length - i} className="list-row small" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          {lines.map((l, k) => (
            <div key={k}>{l}</div>
          ))}
        </div>
      ))}
      {(r?.discoveries.length ?? 0) > 0 && (
        <table className="compact" style={{ marginTop: 8 }}>
          <tbody>
            {r!.discoveries.map((x) => (
              <tr key={x.uid}>
                <td>{x.name}</td>
                <td className="num">{x.magnitude}</td>
                <td className="small muted">
                  {x.fromText ? 'from a Lab Text' : 'stabilized'}
                  {x.year ? `, ${x.season} ${x.year}` : ''}
                </td>
                <td>
                  <button className="small ghost" onClick={() => update((y) => void (y.research!.discoveries = y.research!.discoveries.filter((d) => d.uid !== x.uid)))}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
