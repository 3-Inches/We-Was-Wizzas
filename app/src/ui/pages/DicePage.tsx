import { useState } from 'react';
import { describeStress, simpleDie, stressDie } from '../../engine/dice';
import { ITEM_CHECK_MODS, ITEM_QUALITY_MOD, LOCK_PICK_EASE, itemDamageLevels, itemStressCheck, repairNeeds, type ItemQuality } from '../../engine/workshop';
import { Card, Field, Stepper, signed } from '../kit';
import { RulesNote } from '../RulesNote';

// Grogs' optional equipment bonuses: the right tool for a task lowers its Ease Factor.
const EQUIPMENT = { none: 0, minor: 1, major: 3 } as const;
type Equipment = keyof typeof EQUIPMENT;
const EQUIPMENT_EXAMPLES: [string, string, 'minor' | 'major'][] = [
  ['Whip or crop', 'Animal Handling (obedience)', 'major'],
  ['Map', 'Area Lore (planning route)', 'major'],
  ['Astronomical tables', 'Artes Liberales (astronomy)', 'minor'],
  ['Rope', 'Athletics (climbing)', 'major'],
  ['Pole (at least 10 foot)', 'Athletics (distance jumping)', 'major'],
  ['Fine wine', 'Folk Ken (getting information)', 'minor'],
  ['Flickering light', 'Concentration (meditation)', 'minor'],
  ['Good clothing', 'Charm (making a good impression)', 'minor'],
  ['Guild badge', 'Guild Lore (gaining favors)', 'minor'],
  ['Makeup', 'Guile (disguise)', 'minor'],
  ['Bird lime', 'Hunt (birds)', 'major'],
  ['Concealed blade', 'Legerdemain (slitting pouches)', 'major'],
  ['Watchglass', 'Medicine (diagnosis)', 'minor'],
  ['Cantled saddle', 'Ride (resisting a charge)', 'major'],
  ['Flawless crystal', 'Second Sight (seeing regio boundaries)', 'minor'],
  ['Lampblack', 'Stealth (hiding)', 'minor'],
];

interface Roll {
  id: number;
  label: string;
  kind: 'simple' | 'stress';
  mod: number;
  ease: number | null;
  equipment: Equipment;
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
  const [equipment, setEquipment] = useState<Equipment>('none');
  const target = Math.max(0, ease - EQUIPMENT[equipment]);
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
    setLog((l) => [{ id: ++seq, label: label || (kind === 'simple' ? 'Simple die' : 'Stress die'), kind, mod, ease: useEase ? target : null, equipment, total, text, botch }, ...l].slice(0, 50));
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
          <div className="row" style={{ marginTop: 8 }}>
            <Field label="Equipment that helps (optional rule)">
              <select value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
                <option value="none">None</option>
                <option value="minor">Minor bonus: Ease Factor −1</option>
                <option value="major">Major bonus: Ease Factor −3</option>
              </select>
            </Field>
            {useEase && equipment !== 'none' && <span className="small muted">Ease Factor {ease} → {target}</span>}
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
                {last.ease !== null && ` vs ${last.ease}${last.equipment !== 'none' ? ` (${last.equipment} equipment)` : ''} — ${outcome(last)}`}
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
      <Card title="Equipment bonuses">
        <RulesNote book="Grogs" line={1722} endLine={1731}>
          Equipment that suits the task lowers its Ease Factor: by 1 for a minor bonus, by 3 for a major one. Some examples:
        </RulesNote>
        <table className="compact">
          <tbody>
            {EQUIPMENT_EXAMPLES.map(([item, use, size]) => (
              <tr key={item}>
                <td>{item}</td>
                <td>{use}</td>
                <td>{size === 'major' ? 'Major (−3)' : 'Minor (−1)'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <ItemCheck />
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

/** Damaged goods (City & Guild ch.4): an item's damage levels and the stress check when a botch or misuse puts it at risk. */
function ItemCheck() {
  const [quality, setQuality] = useState<ItemQuality>('standard');
  const [size, setSize] = useState(-1);
  const [lock, setLock] = useState(false);
  const [ability, setAbility] = useState(0);
  const [magnitudes, setMagnitudes] = useState(0);
  const [mods, setMods] = useState<string[]>([]);
  const [left, setLeft] = useState<number | undefined>();
  const [result, setResult] = useState('');
  const levels = itemDamageLevels(quality, size, lock);
  const total = ability + ITEM_QUALITY_MOD[quality] + magnitudes + ITEM_CHECK_MODS.filter((m) => mods.includes(m.id)).reduce((t, m) => t + m.value, 0);
  const now = Math.min(left ?? levels, levels);
  const roll = () => {
    const r = itemStressCheck(total);
    const after = Math.max(0, now - r.lost);
    setLeft(after);
    setResult(`${r.text}${r.lost ? ` ${after ? `${after} of ${levels} damage levels left.` : 'It is broken.'}` : ''}`);
  };
  return (
    <Card title="Item stress check (City & Guild)" tour="item-check">
      <RulesNote
        book="CG"
        line={2140}
        endLine={2225}
        detail={
          <>
            When a botch or an unnatural use puts a valued item at risk: a stress die + modifiers against 15. A failure costs a damage level, a botch one more per botch; it works as normal until the
            last is gone. Superior and excellent items keep their bonuses while damaged; a craftsman&apos;s wondrous item stops working at the first damage.
          </>
        }
      >
        When a botch puts a valued item at risk of damage.
      </RulesNote>
      <div className="row small">
        <Field label="Quality">
          <select value={quality} onChange={(e) => (setQuality(e.target.value as ItemQuality), setLeft(undefined))}>
            {(Object.keys(ITEM_QUALITY_MOD) as ItemQuality[]).map((q) => (
              <option key={q} value={q}>
                {q === 'supernatural' ? 'wondrous or magical' : q} ({signed(ITEM_QUALITY_MOD[q])})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Size" hint="Most items −1, great weapons 0, a house +5, a ship up to +8, a castle +10">
          <Stepper value={size} min={-5} max={12} width={34} onChange={(v) => (setSize(v), setLeft(undefined))} />
        </Field>
        <label className="inline" title="Locks have twice the damage levels of other items their Size">
          <input type="checkbox" checked={lock} onChange={(e) => (setLock(e.target.checked), setLeft(undefined))} /> a lock
        </label>
        <Field label="Ability of the user" hint="Trained to use it: + the Ability score">
          <Stepper value={ability} min={0} max={15} width={30} onChange={setAbility} />
        </Field>
        <Field label="Enchantment magnitudes" hint="A Hermetic item: + the magnitudes of its instilled effects">
          <Stepper value={magnitudes} min={0} max={30} width={30} onChange={setMagnitudes} />
        </Field>
      </div>
      <div className="row small" style={{ marginTop: 4 }}>
        {ITEM_CHECK_MODS.map((m) => (
          <label key={m.id} className="inline">
            <input type="checkbox" checked={mods.includes(m.id)} onChange={(e) => setMods((xs) => (e.target.checked ? [...xs, m.id] : xs.filter((x) => x !== m.id)))} /> {m.label} ({signed(m.value)})
          </label>
        ))}
      </div>
      <div className="row small" style={{ marginTop: 6 }}>
        <span className="badge">
          {now} of {levels} damage levels
        </span>
        <span>Modifiers {signed(total)}</span>
        <button className="small" disabled={now === 0} onClick={roll}>
          Roll the check
        </button>
        {left !== undefined && (
          <button className="small ghost" onClick={() => (setLeft(undefined), setResult(''))}>
            Repaired
          </button>
        )}
      </div>
      {result && <div className="small" style={{ marginTop: 4 }}>{result}</div>}
      <p className="small muted" style={{ margin: '4px 0 0' }}>
        Repair: {repairNeeds(quality).text}
        {lock && LOCK_PICK_EASE[quality] !== undefined ? ` Picking it: Dexterity + Legerdemain + a stress die against ${LOCK_PICK_EASE[quality]}, with tools.` : ''}
      </p>
    </Card>
  );
}
