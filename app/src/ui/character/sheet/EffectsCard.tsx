// What magic is doing to a character: effects still working, and changes made for good.

import { useState } from 'react';
import { CHAR_NAMES, CHARACTERISTICS, type Characteristic } from '../../../data';
import { applyEffect, effectExpiry, endEffect, undoEffect } from '../../../engine/effects';
import type { ActiveEffect } from '../../../engine/types';
import { Card, Field, Stepper } from '../../kit';
import type { CharEditor } from '../useChar';

export function EffectsCard({ ed }: { ed: CharEditor }) {
  const { c, data, update, saga } = ed;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState<ActiveEffect['duration']>('year');
  const [ch, setCh] = useState<Characteristic | ''>('');
  const [amount, setAmount] = useState(1);
  const [soak, setSoak] = useState(0);
  const [warping, setWarping] = useState(0);
  const [constant, setConstant] = useState(false);
  if (!c || !saga) return null;
  const list = c.activeEffects ?? [];
  if (!list.length && !open)
    return (
      <div className="row small">
        <span className="muted">No spells or powers working on this character.</span>
        <button className="small ghost" onClick={() => setOpen(true)}>
          + Record one
        </button>
      </div>
    );
  const add = () =>
    update((x) =>
      void applyEffect(
        x,
        {
          name: name || 'A spell', duration, constant,
          warping: warping || undefined,
          raise: ch ? { chars: [ch], amount, max: duration === 'permanent' ? 5 : 99 } : undefined,
          bonuses: soak ? [{ type: 'soak', amount: soak }] : undefined,
        },
        saga.currentYear, saga.currentSeason, data,
      ),
    );
  return (
    <Card title="Magic on this character">
      {list.map((e) => {
        const end = effectExpiry(e);
        return (
          <div key={e.uid} className="list-row small">
            <b>{e.name}</b>
            {e.source && <span className="muted">({e.source})</span>}
            <span className="badge">{e.duration === 'permanent' ? `for good, ${e.season} ${e.year}` : end ? `until ${end.season} ${end.year}` : 'until ended'}</span>
            {e.raised && <span>{Object.entries(e.raised).map(([k, n]) => `${CHAR_NAMES[k as Characteristic]} +${n}`).join(', ')}</span>}
            {e.bonuses?.length ? <span>{e.bonuses.map((b) => ('char' in b ? `${b.char} ${b.amount > 0 ? '+' : ''}${b.amount}` : `${b.type} ${'amount' in b ? b.amount : ''}`)).join(', ')}</span> : null}
            {e.virtueUid && <span>gives {data.vfById.get(c.virtues.find((v) => v.uid === e.virtueUid)?.defId ?? '')?.name ?? 'a Virtue'}</span>}
            {e.constant && <span className="badge warn">constant: a Warping Point a year</span>}
            <span style={{ flex: 1 }} />
            {e.duration !== 'permanent' && (
              <button className="small ghost" onClick={() => update((x) => void endEffect(x, e.uid))}>
                End
              </button>
            )}
            <button className="small ghost" title="Take it back as if it never happened (a mistake): its Characteristics, Virtue and Warping go" onClick={() => window.confirm(`Undo ${e.name} entirely?`) && update((x) => undoEffect(x, e.uid))}>
              Undo
            </button>
          </div>
        );
      })}
      <button className="small ghost" onClick={() => setOpen((v) => !v)}>
        {open ? 'Close' : '+ Record a spell or power on this character'}
      </button>
      {open && (
        <div className="row small" style={{ marginTop: 6 }}>
          <input value={name} placeholder="Name of the spell or power" onChange={(e) => setName(e.target.value)} style={{ width: 180 }} />
          <Field label="Duration">
            <select value={duration} onChange={(e) => setDuration(e.target.value as ActiveEffect['duration'])}>
              <option value="permanent">Momentary Ritual: for good</option>
              <option value="year">Year</option>
              <option value="moon">Moon (the season)</option>
              <option value="indefinite">Until ended</option>
            </select>
          </Field>
          <Field label="Characteristic">
            <span className="row tight">
              <select value={ch} onChange={(e) => setCh(e.target.value as Characteristic | '')}>
                <option value="">—</option>
                {CHARACTERISTICS.map((k) => (
                  <option key={k} value={k}>
                    {CHAR_NAMES[k]}
                  </option>
                ))}
              </select>
              {ch && <Stepper value={amount} min={-5} max={5} width={30} onChange={setAmount} />}
            </span>
          </Field>
          <Field label="Soak">
            <Stepper value={soak} min={-10} max={20} width={30} onChange={setSoak} />
          </Field>
          <Field label="Warping now">
            <Stepper value={warping} min={0} max={10} width={30} onChange={setWarping} />
          </Field>
          <label className="inline" title="Under it at least half the time: a Warping Point a year (DE)">
            <input type="checkbox" checked={constant} onChange={(e) => setConstant(e.target.checked)} /> constant
          </label>
          <button className="small" onClick={add}>
            Record
          </button>
        </div>
      )}
      <p className="small muted" style={{ margin: 0 }}>
        To cast on several people at once (a covenant-wide Creo ritual, Grant Virtue), use the covenant page&apos;s <b>Magic on the covenant</b>. Effects with a Duration end by
        themselves as the saga&apos;s seasons pass.
      </p>
    </Card>
  );
}
