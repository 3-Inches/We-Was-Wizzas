import { CHARACTERISTICS, CHAR_NAMES, charCost, type Characteristic } from '../../../data';
import { Card, Meter, Stepper, signed } from '../../kit';
import type { CharEditor } from '../useChar';

const DESCRIPTIONS: Record<Characteristic, string> = {
  Int: 'Reasoning and memory. Central to Lab Totals.',
  Per: 'Senses and noticing things; finding apprentices; Rego craft magic.',
  Str: 'Raw muscle: damage, lifting, encumbrance.',
  Sta: 'Endurance: Soak, Fatigue, Concentration, and every Casting Total.',
  Pre: 'Force of personality, looks, leadership.',
  Com: 'Expressing yourself: books, teaching, persuasion.',
  Dex: 'Precision: attacks, crafts, sleight of hand.',
  Qik: 'Speed: initiative, defense, fast casting.',
};

export default function CharacteristicsStep({ ed }: { ed: CharEditor }) {
  const { c, d, update } = ed;
  if (!c || !d) return null;
  return (
    <Card title="Characteristics" className="accent">
      <Meter label="Points spent" value={d.charPointsSpent} max={d.charPointsBudget} />
      <p className="small muted">
        Buy each Characteristic from –3 to +3. Costs: +1 = 1, +2 = 3, +3 = 6; –1 gives 1, –2 gives 3, –3 gives 6. You have {d.charPointsBudget} points (7
        {d.charPointsBudget !== 7 ? ` ${signed(d.charPointsBudget - 7)} from Virtues/Flaws` : ''}).
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Characteristic</th>
              <th>Bought</th>
              <th className="num">Cost</th>
              <th className="num">Final</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {CHARACTERISTICS.map((k) => {
              const v = c.characteristics[k];
              const fin = d.characteristics[k];
              return (
                <tr key={k}>
                  <td>
                    <b>{CHAR_NAMES[k]}</b>
                    <div className="small muted">{DESCRIPTIONS[k]}</div>
                  </td>
                  <td>
                    <Stepper value={v} min={-3} max={3} onChange={(nv) => update((x) => void (x.characteristics[k] = nv))} />
                  </td>
                  <td className="num">{charCost(v)}</td>
                  <td className="num">
                    <b>{signed(fin.value)}</b>
                    {fin.notes.length > 0 && <div className="small muted">{fin.notes.join(', ')}</div>}
                  </td>
                  <td>
                    <input
                      value={c.characteristicNotes?.[k] ?? ''}
                      placeholder={v >= 2 ? 'e.g. keen, brawny, graceful…' : v <= -2 ? 'e.g. frail, dull, awkward…' : ''}
                      onChange={(e) => update((x) => void (x.characteristicNotes = { ...(x.characteristicNotes ?? {}), [k]: e.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        Great (Characteristic) raises a +3 Characteristic by one (max +5); Poor (Characteristic) lowers a –3 by one. Size: {signed(d.size)}.
      </p>
    </Card>
  );
}
