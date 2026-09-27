import { useMemo, useState } from 'react';
import { ART_NAMES, type PowerKind, type SpellDef } from '../../data';
import { POWER_KINDS, POWER_KIND_ORDER, powerCost, powerSpending, powerStats } from '../../engine/character/powers';
import type { CharPower } from '../../engine/types';
import { uid } from '../../util/id';
import { Card, Meter, SearchInput, Stepper, signed } from '../kit';
import type { CharEditor } from './useChar';

/**
 * The powers bought with Greater/Lesser/Personal/Ritual Power and Heroes' Birthright: each kind
 * has a pool of levels, spent on powers designed like Hermetic spells (or copied from one).
 */
export default function PowersCard({ ed }: { ed: CharEditor }) {
  const { c, d, update } = ed;
  if (!c || !d) return null;
  const spent = powerSpending(c.powers);
  const kinds = POWER_KIND_ORDER.filter((k) => (d.powerBudgets[k] ?? 0) > 0 || (spent[k] ?? 0) > 0);
  if (!kinds.length) return null;
  const qik = c.characteristics.Qik;
  const edit = (uidOf: string, fn: (p: CharPower) => void) => update((x) => void fn((x.powers ?? []).find((p) => p.uid === uidOf)!));
  return (
    <Card title="Supernatural powers" className="accent">
      <p className="small muted" style={{ marginTop: 0 }}>
        Each power is designed like a Hermetic spell. Levels may also buy Penetration one for one (not for Heroes&apos; Birthright). Pick a spell from the list to copy its
        level, or add a power and describe it yourself.
      </p>
      {kinds.map((kind) => {
        const info = POWER_KINDS[kind];
        const budget = d.powerBudgets[kind] ?? 0;
        const used = spent[kind] ?? 0;
        const powers = (c.powers ?? []).filter((p) => p.kind === kind);
        return (
          <div key={kind} style={{ marginBottom: 14 }}>
            <div className="row">
              <h4 style={{ margin: 0 }}>{info.label}</h4>
              <span className="small muted">{info.rule}</span>
            </div>
            <Meter label={`${used} of ${budget} levels`} value={used} max={budget} />
            {powers.length > 0 && (
              <table className="compact">
                <thead>
                  <tr>
                    <th>Power</th>
                    <th className="num">Level</th>
                    {info.penetration && <th className="num">Penetration</th>}
                    <th className="num">Mag.</th>
                    {kind !== 'birthright' && <th className="num">Init</th>}
                    {kind !== 'birthright' && <th className="num">Fatigue</th>}
                    {kind === 'ritual' && <th className="num">Confidence</th>}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {powers.map((p) => {
                    const st = powerStats(p, qik);
                    const spell = p.spellId ? ed.data.spellById.get(p.spellId) : undefined;
                    const tooHigh = info.maxLevel !== undefined && p.level > info.maxLevel;
                    return (
                      <tr key={p.uid}>
                        <td>
                          <input value={p.name} placeholder="Name the power" aria-label="Power name" onChange={(e) => edit(p.uid, (x) => void (x.name = e.target.value))} />
                          {spell && (
                            <div className="small muted">
                              as {spell.name} ({ART_NAMES[spell.technique]} {ART_NAMES[spell.form]} {spell.level}; {spell.range}/{spell.duration}/{spell.target})
                            </div>
                          )}
                          <input className="small" value={p.notes ?? ''} placeholder="effect, limits, realm…" aria-label="Power notes" onChange={(e) => edit(p.uid, (x) => void (x.notes = e.target.value || undefined))} />
                        </td>
                        <td className={`num ${tooHigh ? 'bad-text' : ''}`}>
                          <Stepper value={p.level} min={1} max={info.maxLevel ?? 100} onChange={(v) => edit(p.uid, (x) => void (x.level = v))} title={tooHigh ? `No more than level ${info.maxLevel}` : 'Level'} />
                        </td>
                        {info.penetration && (
                          <td className="num">
                            <Stepper value={p.penetration} min={0} onChange={(v) => edit(p.uid, (x) => void (x.penetration = v))} title="Penetration (costs levels one for one)" />
                          </td>
                        )}
                        <td className="num">{st.magnitude}</td>
                        {kind !== 'birthright' && <td className="num">{signed(st.init)}</td>}
                        {kind !== 'birthright' && <td className="num">{st.fatigue}</td>}
                        {kind === 'ritual' && <td className="num">{st.confidence}</td>}
                        <td>
                          <span className="small muted">{powerCost(p)} lv</span>{' '}
                          <button className="small ghost" title="Remove" onClick={() => update((x) => void (x.powers = (x.powers ?? []).filter((y) => y.uid !== p.uid)))}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <AddPower ed={ed} kind={kind} left={budget - used} />
          </div>
        );
      })}
    </Card>
  );
}

function AddPower({ ed, kind, left }: { ed: CharEditor; kind: PowerKind; left: number }) {
  const { data, update } = ed;
  const info = POWER_KINDS[kind];
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [anyRange, setAnyRange] = useState(false);
  const cap = Math.min(left, info.maxLevel ?? Infinity);
  const spells = useMemo(() => {
    if (!open) return [];
    const qq = q.trim().toLowerCase();
    return data.spells
      .filter((s): s is SpellDef & { level: number } => s.level !== null && !s.general && s.level <= cap)
      .filter((s) => kind !== 'personal' || anyRange || /personal/i.test(s.range) || /constant|sun|moon|year|ring/i.test(s.duration))
      .filter((s) => kind === 'ritual' || !s.ritual || anyRange)
      .filter((s) => !qq || `${s.name} ${s.technique}${s.form} ${ART_NAMES[s.technique]} ${ART_NAMES[s.form]}`.toLowerCase().includes(qq))
      .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))
      .slice(0, 40);
  }, [open, q, data.spells, cap, kind, anyRange]);
  const add = (p: Partial<CharPower>) =>
    update((x) => void (x.powers ??= []).push({ uid: uid(), name: '', kind, level: Math.max(1, Math.min(cap, 5)), penetration: 0, ...p }));
  return (
    <div style={{ marginTop: 6 }}>
      <div className="row">
        <button className="small" disabled={cap < 1} onClick={() => add({})}>
          + Power
        </button>
        <button className="small" disabled={cap < 1} onClick={() => setOpen((o) => !o)}>
          {open ? 'Close spell list' : 'From a spell…'}
        </button>
        <span className="small muted">{cap >= 1 ? `up to level ${cap}` : 'no levels left'}</span>
      </div>
      {open && (
        <div className="stack" style={{ marginTop: 6 }}>
          <div className="row">
            <SearchInput value={q} onChange={setQ} placeholder={`Spells of level ${cap} or less`} />
            <label className="inline small">
              <input type="checkbox" checked={anyRange} onChange={(e) => setAnyRange(e.target.checked)} /> {kind === 'personal' ? 'any Range and Duration' : 'include Rituals'}
            </label>
          </div>
          {spells.map((s) => (
            <div key={s.id} className="row small">
              <button className="small" onClick={() => { add({ name: s.name, level: s.level, spellId: s.id }); setOpen(false); setQ(''); }}>
                + {s.level}
              </button>
              <span>
                <b>{s.name}</b> <span className="muted">({s.technique}{s.form}; {s.range}/{s.duration}/{s.target})</span>
              </span>
            </div>
          ))}
          {!spells.length && <div className="small muted">No spells match.</div>}
        </div>
      )}
    </div>
  );
}
