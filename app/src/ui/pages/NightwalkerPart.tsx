// The Nightwalkers (Hedge Magic, Revised Edition, Chapter Six) at the Game Table: straying to a place
// and leading others, the chapter's other rolls, and a fertility battle's outcome set as the year's
// harvest on the covenant's land.

import { useState } from 'react';
import { describeStress, stressDie } from '../../engine/dice';
import { BATTLE_OUTCOMES, HARVEST_INCOME, NIGHTWALKER_ROLLS, STRAY_DESTINATIONS, leadEase, leadTotal, strayEase, strayTotal } from '../../engine/nightwalker';
import type { Character } from '../../engine/types';
import { useStore } from '../../store/store';
import { Card, Field, Stepper } from '../kit';
import type { CharEditor } from '../character/useChar';

const IDS = ['nightwalker', 'versatile-phantasticum', 'half-taltos', 'hamr', 'sleepwalker'];
export const hasNightwalker = (c: Character) => c.virtues.some((v) => IDS.includes(v.defId));

export function NightwalkerCard({ ed }: { ed: CharEditor }) {
  const { c, d, update } = ed;
  const [dest, setDest] = useState(0);
  const [objects, setObjects] = useState(0);
  const [outcome, setOutcome] = useState(3);
  const [lines, setLines] = useState<string[]>([]);
  const covenant = useStore((s) => (c?.covenantId ? s.covenants[c.covenantId] : undefined));
  const updateCovenant = useStore((s) => s.updateCovenant);
  if (!c || !d) return null;
  const strays = c.virtues.some((v) => v.defId === 'nightwalker');
  const ease = strayEase(STRAY_DESTINATIONS[dest].ease, objects);
  const roll = (what: string, total: number, ef: number, onFail?: () => void) => {
    const r = stressDie(1);
    const t = total + r.value;
    const ok = !(r.zero && r.botches) && t >= ef;
    if (!ok && onFail) onFail();
    setLines([`${what}: ${total} + stress die ${describeStress(r)} = ${t} against ${ef}: ${ok ? 'done.' : r.zero && r.botches ? 'a botch.' : 'it fails.'}`]);
  };
  const harvest = covenant?.income.filter((s) => HARVEST_INCOME.includes(s.type) && s.level !== 'None') ?? [];
  const setHarvest = () => {
    if (!covenant) return;
    const o = BATTLE_OUTCOMES[outcome];
    updateCovenant(covenant.id, (x) => {
      for (const s of x.income) if (HARVEST_INCOME.includes(s.type) && s.level !== 'None') ((s.modification = o.mod), (s.rolled = false));
    });
    setLines([`${o.text}: ${harvest.map((s) => s.name).join(', ')} set to ${o.mod} for the year (in place of the year-end roll).`]);
  };
  return (
    <Card title="Straying and the night battles" tour="nightwalker" fold="nightwalker" summary={strays ? 'A nightwalker' : 'A straying tradition'}>
      <p className="small muted" style={{ marginTop: 0 }}>
        A nightwalker sends their spirit out while insensible; the body seems dead and is helpless meanwhile, and wounds taken in spirit show on it. Straying has no score: it does not
        improve with practice. The spirit causes drowsiness, and is seen by Second Sight (9).
      </p>
      {strays && (
        <>
          <div className="row">
            <Field label="Destination">
              <select value={dest} onChange={(e) => setDest(Number(e.target.value))}>
                {STRAY_DESTINATIONS.map((x, i) => (
                  <option key={x.ease} value={i}>{x.text} ({x.ease})</option>
                ))}
              </select>
            </Field>
            <Field label="Other objects carried" hint="+3 each, beyond the tradition's own">
              <Stepper value={objects} min={0} max={6} width={32} onChange={setObjects} />
            </Field>
          </div>
          <div className="row">
            <button onClick={() => roll('Spirit travel (Stamina + Athletics)', strayTotal(d), ease, () => update((x) => void (x.longTermFatigueLost = Math.min(5, x.longTermFatigueLost + 1))))}>
              Stray there (against {ease})
            </button>
            <button className="small" onClick={() => roll('Leading a willing person along (Stamina + Leadership)', leadTotal(d), leadEase(ease))}>
              Lead someone along ({leadEase(ease)})
            </button>
            <button className="small" onClick={() => roll('Drawing a willing person out of their body (Stamina + Leadership)', leadTotal(d), leadEase())}>
              Draw someone out ({leadEase()})
            </button>
          </div>
          <p className="small muted">A failed journey wakes the nightwalker exhausted (a long-term Fatigue level here). Travel to one&apos;s caul, to a summoned battle or procession, to one&apos;s true love, or along a known route at walking pace needs no roll. Speaking to a group in corporeal form costs another long-term Fatigue level.</p>
        </>
      )}
      <details className="small">
        <summary>The chapter&apos;s other rolls</summary>
        {NIGHTWALKER_ROLLS.map((r) => (
          <div key={r.what}>
            {r.what}: {r.roll} against {r.ease}.
          </div>
        ))}
      </details>
      {strays && (
        <div className="row" style={{ marginTop: 8 }}>
          <Field label="A fertility battle's outcome" hint="It sets the year's harvest on the Income Modification table (Covenants)">
            <select value={outcome} onChange={(e) => setOutcome(Number(e.target.value))} style={{ maxWidth: 380 }}>
              {BATTLE_OUTCOMES.map((o, i) => (
                <option key={o.mod} value={i}>{o.text} ({o.mod})</option>
              ))}
            </select>
          </Field>
          <button className="small" onClick={setHarvest} disabled={!harvest.length} title={harvest.length ? undefined : 'The covenant has no farms, herds, fishing or forestry'}>
            Set the covenant&apos;s harvest
          </button>
        </div>
      )}
      <LinesView lines={lines} />
    </Card>
  );
}

function LinesView({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <div className="log small" aria-live="polite">
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}
