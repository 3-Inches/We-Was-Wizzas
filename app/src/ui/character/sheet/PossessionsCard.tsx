// Everything a character owns, on their Items tab: weapons and shields, armor, enchanted items and
// their other possessions (tools, a cart, a craftsman's wondrous item, goods bought), each with the
// damage it has taken (City & Guild, Damaged Goods). Things can be added, given to someone else with
// their damage, or thrown away once broken. The stress check itself is at the Game Table.

import { useState } from 'react';
import { ITEM_KINDS, discardItem, giveItem, newPossession, ownedItems } from '../../../engine/possessions';
import type { Possession } from '../../../engine/types';
import { ITEM_QUALITY_MOD, type ItemQuality } from '../../../engine/workshop';
import { useSagaCharacters, useSagaCovenants } from '../../../store/hooks';
import { useStore } from '../../../store/store';
import { uid } from '../../../util/id';
import { Card, Field, signed } from '../../kit';
import { PeopleOptions, RollAtTable, canPlay, groupPeople } from '../../play';
import type { CharEditor } from '../useChar';

const QUALITIES = Object.keys(ITEM_QUALITY_MOD) as ItemQuality[];
const qualityName = (q: ItemQuality) => (q === 'supernatural' ? 'wondrous' : q);
const WHAT = { weapon: 'weapon', shield: 'shield', armor: 'armor', enchanted: 'enchanted', possession: 'owned' } as const;

export function PossessionsCard({ ed }: { ed: CharEditor }) {
  const { c, data, update } = ed;
  const others = useSagaCharacters(c?.sagaId);
  const covs = useSagaCovenants(c?.sagaId);
  const putRecords = useStore((s) => s.putRecords);
  const [giveTo, setGiveTo] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<{ name: string; kind: string; quality: ItemQuality; wonder: string }>({ name: '', kind: 'tool', quality: 'standard', wonder: '' });
  const [msg, setMsg] = useState('');
  if (!c) return null;
  const items = ownedItems(c, data);
  const groups = groupPeople(others.filter((o) => o.id !== c.id && canPlay(o)), covs);
  const setP = (id: string, fn: (p: Possession) => void) => update((x) => void fn(x.possessions!.find((p) => p.uid === id)!));

  const give = (key: string, name: string) => {
    const to = others.find((o) => o.id === giveTo[key]);
    if (!to) return;
    const a = structuredClone(c);
    const b = structuredClone(to);
    const why = giveItem(a, b, key);
    if (why) return setMsg(`${name}: ${why}.`);
    putRecords({ characters: [a, b], covenants: [] }, `${name} given to ${to.name || 'another'}`);
    setMsg(`${name} given to ${to.name || 'them'}, with its damage. Undo takes it back.`);
  };

  return (
    <Card title={`Possessions (${items.length})`} tour="possessions">
      <p className="small muted" style={{ marginTop: 0 }}>
        What {c.name || 'they'} own{c.name ? 's' : ''}, and the damage each has taken. Weapons and armor are chosen on Combat &amp; Health, enchanted items below. When a botch puts one at
        risk, its stress check is made at the Game Table, and the damage stays here.
      </p>
      {items.length === 0 && <div className="small muted">Nothing yet.</div>}
      {items.map((it) => {
        const broken = it.condition.lost >= it.levels;
        const p = it.what === 'possession' ? c.possessions?.find((x) => `p:${x.uid}` === it.key) : undefined;
        return (
          <div key={it.key} className="list-row" style={{ flexWrap: 'wrap' }}>
            {p ? (
              <input value={p.name} placeholder={ITEM_KINDS.find((k) => k.id === p.kind)?.label} onChange={(e) => setP(p.uid, (x) => void (x.name = e.target.value))} style={{ flex: '1 1 140px' }} aria-label="What it is" />
            ) : (
              <b style={{ flex: '1 1 140px' }}>{it.name}</b>
            )}
            <span className="badge">{WHAT[it.what]}</span>
            {p ? (
              <select value={p.quality} onChange={(e) => setP(p.uid, (x) => void (x.quality = e.target.value as ItemQuality))} aria-label="Quality">
                {QUALITIES.map((q) => (
                  <option key={q} value={q}>
                    {qualityName(q)} ({signed(ITEM_QUALITY_MOD[q])})
                  </option>
                ))}
              </select>
            ) : (
              <span className="small muted">{qualityName(it.quality)}</span>
            )}
            <span className={`badge ${broken ? 'bad' : it.condition.lost ? 'warn' : ''}`} title={`${it.levels} damage levels before it breaks`}>
              {broken ? 'broken' : it.condition.lost ? `damaged: ${it.levels - it.condition.lost} of ${it.levels} left` : `sound (${it.levels} damage levels)`}
            </span>
            {it.condition.repaired && <span className="badge">repaired before (−1)</span>}
            {it.quality === 'supernatural' && it.condition.lost > 0 && !broken && <span className="badge warn">its wonder no longer works</span>}
            {groups.length > 0 && (
              <span className="row tight small">
                <select value={giveTo[it.key] ?? ''} onChange={(e) => setGiveTo({ ...giveTo, [it.key]: e.target.value })} aria-label={`Give ${it.name} to`}>
                  <option value="">give to…</option>
                  <PeopleOptions groups={groups} />
                </select>
                <button className="small" disabled={!giveTo[it.key]} onClick={() => give(it.key, it.name)}>
                  Give
                </button>
              </span>
            )}
            {(broken || p) && (
              <button
                className="small ghost"
                title={broken ? 'A broken item cannot be repaired: throw it away' : 'Remove it'}
                onClick={() => {
                  update((x) => void discardItem(x, it.key));
                  setMsg(`${it.name} ${broken ? 'thrown away' : 'removed'}. Undo puts it back.`);
                }}
              >
                {broken ? 'Discard' : '✕'}
              </button>
            )}
            {p && p.quality === 'supernatural' && (
              <input value={p.wonder ?? ''} placeholder="Its wonder: what the craftsman's item does" onChange={(e) => setP(p.uid, (x) => void (x.wonder = e.target.value || undefined))} style={{ flexBasis: '100%' }} />
            )}
          </div>
        );
      })}
      {msg && <div className="dice-result-lines small">{msg}</div>}
      <div className="row small" style={{ marginTop: 8 }}>
        <Field label="Something else they own">
          <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>
            {ITEM_KINDS.filter((k) => !['weapon', 'great', 'bow', 'shield', 'armor'].includes(k.id)).map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Quality">
          <select value={draft.quality} onChange={(e) => setDraft({ ...draft, quality: e.target.value as ItemQuality })}>
            {QUALITIES.map((q) => (
              <option key={q} value={q}>
                {qualityName(q)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Called">
          <input value={draft.name} placeholder="a lute, the mule cart…" onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={{ width: 150 }} />
        </Field>
        <button
          className="small"
          onClick={() => {
            update((x) => void (x.possessions = [...(x.possessions ?? []), newPossession(uid(), draft.kind, draft.quality, draft.name, draft.quality === 'supernatural' && draft.wonder ? { wonder: draft.wonder } : {})]));
            setDraft({ ...draft, name: '', wonder: '' });
          }}
        >
          + Add
        </button>
      </div>
      <RollAtTable sagaId={c.sagaId} who={c.id} where="guild" what="When one is put at risk, its stress check (and a repair) is made" />
    </Card>
  );
}
