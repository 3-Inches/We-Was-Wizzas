// Aging: age, apparent age and Decrepitude, and the aging roll out of turn at the Game Table (Seasons).
// Aging is rolled for everyone when the saga's year ends; the sheet shows where it stands.

import { useState } from 'react';
import { CHARACTERISTICS, CHAR_NAMES, type Characteristic } from '../../../data';
import { agingRoll, applyAgingPoint, crisisRoll, lapseLongevity, type AgingResult } from '../../../engine/longterm';
import { abilityXpForScore } from '../../../engine/xp';
import { HAZARDS, hazardPenalty } from '../../../engine/disease';
import { longevityModifier } from '../../../engine/hermeticMysteries';
import { Card, Field, Stepper, signed } from '../../kit';
import { RollAtTable, useAtTable } from '../../play';
import type { CharEditor } from '../useChar';

export function AgingCard({ ed }: { ed: CharEditor }) {
  const { c, d, update, saga, ctx } = ed;
  const atTable = useAtTable();
  const [aging, setAging] = useState<AgingResult | null>(null);
  const [lcOverride, setLcOverride] = useState<number | null>(null);
  const [agingText, setAgingText] = useState<string[]>([]);
  const [anyChar, setAnyChar] = useState<Characteristic>('Sta');
  if (!c || !d || !saga) return null;
  const year = saga.currentYear;
  const cov = ctx.covenant;

  // Living conditions: DE p.391 table (covenant magus +1/+2, mundane +1/0) + covenant finances + Virtues + half lab Health.
  const baseLc = cov ? (cov.season === 'Summer' || cov.season === 'Autumn' ? (d.isMagus ? 2 : 1) : d.isMagus ? 1 : 0) : 0;
  const labHealth = ctx.lab ? Math.floor(ctx.lab.characteristics.Health / 2) : 0;
  const autoLc = baseLc + (cov?.finances.livingConditions ?? 0) + d.livingConditionsMod + labHealth - hazardPenalty(c);
  const lc = lcOverride ?? autoLc;
  const lr = longevityModifier(c.longevity);

  const rollAging = () => {
    const r = agingRoll(c.age, lc, lr, d.agingRollParts, undefined, !!c.longevity && c.age < 35);
    setAging(r);
    setAgingText([]);
  };
  const agedThisYear = c.lastAgedYear === year;

  const applyAging = () => {
    if (!aging) return;
    const out: string[] = [];
    update((x) => {
      x.lastAgedYear = year;
      if (aging.apparentAging) x.apparentAge = (x.apparentAge ?? x.age) + 1;
      for (const p of aging.agingPoints) out.push(applyAgingPoint(x, p.char as Characteristic, p.points));
      if (aging.anyChar) out.push(applyAgingPoint(x, anyChar, aging.anyChar));
      if (aging.crisis) {
        const nextLevel = abilityXpForScore(d.decrepitude + 1);
        const need = Math.max(1, nextLevel - x.decrepitudePoints);
        for (let i = 0; i < need; i++) out.push(applyAgingPoint(x, anyChar, 1));
        if (x.longevity) {
          out.push('The crisis ends the Longevity Ritual; it can be performed again from its Laboratory Text (Lab & items).');
          lapseLongevity(x, year);
        }
      }
    });
    setAgingText(out);
    setAging(null);
  };

  const rollCrisis = () => {
    const r = crisisRoll(c.age, d.decrepitude);
    setAgingText((t) => [...t, `Crisis roll ${r.roll}: ${r.text}`]);
  };

  return (
    <Card title="Aging" tour="aging" fold="aging" summary={`Age ${c.age}${c.apparentAge !== undefined && c.apparentAge !== c.age ? ` (looks ${c.apparentAge})` : ''}, Decrepitude ${d.decrepitude}; ${agedThisYear ? `aged for ${year}` : c.age < d.agingStartAge && !c.longevity ? `aging rolls start at ${d.agingStartAge}` : 'aging is rolled at the year’s end'}.`}>
      <div className="row">
        <div className="stat">
          <span className="v">{c.age}</span>
          <span className="l">Age</span>
        </div>
        <div className="stat">
          <span className="v">{c.apparentAge ?? c.age}</span>
          <span className="l">Apparent</span>
        </div>
        <div className="stat">
          <span className="v">
            {d.decrepitude} ({c.decrepitudePoints})
          </span>
          <span className="l">Decrepitude</span>
        </div>
        {atTable && (
          <button className="small" onClick={() => update((x) => void (x.age += 1))} title="Without an aging roll: the year ends for everyone on the Seasons page">
            Age +1 year
          </button>
        )}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        {!atTable ? (
          <span className="small">
            Living Conditions {signed(autoLc)}
            {c.hazards?.length ? `; hazards: ${c.hazards.map((h) => HAZARDS.find((x) => x.id === h)?.label ?? h).join(', ')}` : ''}
          </span>
        ) : <>
        <Field label={`Living Conditions (auto ${signed(autoLc)})`}>
          <div className="row tight">
            <Stepper value={lc} width={36} onChange={(v) => setLcOverride(v)} />
            {lcOverride !== null && (
              <button className="small ghost" onClick={() => setLcOverride(null)}>
                auto
              </button>
            )}
          </div>
        </Field>
        <div className="small stack" style={{ gap: 2 }}>
          {HAZARDS.map((h) => (
            <label key={h.id} className="inline" title="−1 to Living Conditions on the aging roll (City & Guild)">
              <input
                type="checkbox"
                checked={!!c.hazards?.includes(h.id)}
                onChange={(e) => update((x) => void (x.hazards = e.target.checked ? [...(x.hazards ?? []), h.id] : (x.hazards ?? []).filter((y) => y !== h.id)))}
              />{' '}
              {h.label}
            </label>
          ))}
        </div>
        </>}
        <div className="small">
          Longevity Ritual: <b>{lr ? `−${lr}` : 'none'}</b>
          {d.agingRollParts.map((m) => (
            <span key={m.label}>
              <br />
              {m.label}: {signed(m.value)}
            </span>
          ))}
        </div>
        {d.magicChar && <p className="small muted">A magic character does not age (RoP: Magic), so it makes no aging rolls.</p>}
        {/* the roll is offered only to one who ages, and not twice in a year; the lines around say why when it is not */}
        {atTable && agedThisYear ? (
          <span className="small muted">Aged for {year}.</span>
        ) : atTable && !d.magicChar && (c.age >= d.agingStartAge || c.longevity) ? (
          <button onClick={rollAging} title="Aging is rolled for everyone when the saga's year ends; roll here only out of turn">
            Roll aging now
          </button>
        ) : atTable ? null : (
          <span className="small muted">{agedThisYear ? `Aged for ${year}.` : 'Aging is rolled for everyone when the year ends.'}</span>
        )}
      </div>
      {c.age < d.agingStartAge && !c.longevity && <p className="small muted">Aging rolls start at age {d.agingStartAge} (or earlier with a Longevity Ritual).</p>}
      <RollAtTable sagaId={saga.id} who={c.id} where="seasons" what="Aging is rolled at the year's end (or out of turn), its hazards and Living Conditions set," />
      {aging && (
        <div className="issue info" style={{ marginTop: 8 }}>
          <div className="msg">
            Aging roll <b>{aging.roll}</b> (die {aging.die} {aging.mods.map((m) => `${signed(m.value)} ${m.label}`).join(' ')}): {aging.text}
            {(aging.anyChar > 0 || aging.crisis) && (
              <div className="row tight">
                Aging Points go to:
                <select value={anyChar} onChange={(e) => setAnyChar(e.target.value as Characteristic)}>
                  {CHARACTERISTICS.map((k) => (
                    <option key={k} value={k}>
                      {CHAR_NAMES[k]}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button className="small" onClick={applyAging}>
            Apply
          </button>
        </div>
      )}
      {atTable && (
        <div className="row" style={{ marginTop: 8 }}>
          <button className="small" onClick={rollCrisis}>
            Roll on Crisis table
          </button>
          <span className="small muted">Simple die + age/10 + Decrepitude</span>
        </div>
      )}
      {agingText.map((t, i) => (
        <div key={i} className="small">
          {t}
        </div>
      ))}
    </Card>

  );
}
