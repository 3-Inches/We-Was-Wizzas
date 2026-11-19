// Seasons of holy work: Major amulets, golems, True Names, Shinnui Shem (Mythic Judaism). The card is
// on Game Table › Seasons.

import { useState } from 'react';
import {
  holyMethodsOf, holyPowersOf, holyWorkLabel, holyWorkPlan, holyWorksOpen, workHolySeason, type HolyWork, type HolyWorkKind,
} from '../../../engine/holy';
import { holyWorkTold } from '../../../engine/seasonTold';
import { useSeasonWork } from '../../seasonWork';
import type { AuraState } from '../../../engine/magic';
import { Card, Field, Stepper, Total } from '../../kit';
import { uid } from '../../../util/id';
import type { CharEditor } from '../../character/useChar';
import { useLines, Lines } from './shared';

const WORK_ABILITY: Record<HolyWorkKind, string> = { amulet: 'craft-amulets', golem: 'kabbalah', empower: 'kabbalah', trueName: 'merkavah', shinnui: 'gematria' };

export function HolyWorksCard({ ed, aura }: { ed: CharEditor; aura: AuraState }) {
  const { c, d, update } = ed;
  const [kind, setKind] = useState<HolyWorkKind | ''>('');
  const [name, setName] = useState('');
  const [target, setTarget] = useState(10);
  const [lines, show] = useLines();
  // a season's work is the season: one already logged leaves none for this (as lab work)
  const { year, season, busy, work: spend } = useSeasonWork(ed);
  if (!c || !d) return null;
  const open = holyWorksOpen(d);
  const works = c.holy?.works ?? [];
  const start = () => {
    if (!kind) return;
    const w: HolyWork = {
      uid: uid(), kind, progress: 0, seasons: 0,
      name: name.trim() || (kind === 'trueName' ? 'True Name: an angel' : holyWorkLabel(kind)[0].toUpperCase() + holyWorkLabel(kind).slice(1)),
      target: kind === 'golem' ? 0 : kind === 'shinnui' ? 1 : target,
    };
    if (kind === 'amulet') {
      w.method = holyMethodsOf(d)[0]?.id;
      w.power = holyPowersOf(d)[0]?.id;
    }
    if (kind === 'shinnui') w.quality = 10;
    update((x) => void (x.holy = { ...(x.holy ?? {}), works: [...(x.holy?.works ?? []), w] }));
    setKind('');
    setName('');
  };
  const set = (u: string, patch: Partial<HolyWork>) => update((x) => void (x.holy = { ...(x.holy ?? {}), works: (x.holy?.works ?? []).map((w) => (w.uid === u ? { ...w, ...patch } : w)) }));
  // logged as one change that Unlog takes back whole: the work's progress and seasons, and Merkavah's
  // Fatigue; a work finished (an amulet made, a golem awakened, a True Name learned) makes the season final
  const work = (w: HolyWork, finish?: boolean) =>
    show(
      spend(`Holy work: ${w.name}`, WORK_ABILITY[w.kind], (x) => {
        const fatigue = x.longTermFatigueLost;
        const out = workHolySeason(x, d, w.uid, aura, { finish });
        const after = x.holy?.works?.find((y) => y.uid === w.uid);
        const spent = x.longTermFatigueLost - fatigue;
        return {
          lines: out,
          // the name the player gave it, not the default the card set ("A Major amulet")
          told: holyWorkTold(w.kind, w.name.toLowerCase() === holyWorkLabel(w.kind).toLowerCase() ? undefined : w.name, !!after?.done),
          made: after?.done ? w.name : undefined,
          undo: { holyWork: structuredClone(w), ...(spent > 0 ? { fatigue: spent } : {}) },
        };
      }),
    );
  return (
    <Card title="Seasons of holy work" tour="holy-works" fold="holy-works" summary={works.filter((w) => !w.done).map((w) => w.name).join(' · ') || 'Major amulets, golems, True Names, Shinnui Shem'}>
      {works.map((w) => {
        const plan = holyWorkPlan(d, w, aura);
        return (
          <div key={w.uid} className="card-row" style={{ borderTop: '1px solid var(--line)', paddingTop: 6, marginTop: 6 }}>
            <div className="row small">
              <b>{w.name}</b>
              <span className="muted">
                ({holyWorkLabel(w.kind)}, {w.seasons} season{w.seasons === 1 ? '' : 's'})
              </span>
              {!w.done && (
                <span>
                  total <Total value={plan.total.total} parts={plan.total.parts} notes={plan.total.notes} label={w.name} />
                </span>
              )}
              {w.done ? <span className="ok">{w.result}</span> : <span>{plan.text}</span>}
            </div>
            {!w.done && (
              <div className="row small">
                {(w.kind === 'amulet' || w.kind === 'empower') && (
                  <Field label="Level">
                    <Stepper value={w.target} min={1} max={100} width={40} onChange={(v) => set(w.uid, { target: v })} />
                  </Field>
                )}
                {w.kind === 'trueName' && (
                  <Field label="The being’s Might">
                    <Stepper value={w.target} min={1} max={100} width={40} onChange={(v) => set(w.uid, { target: v })} />
                  </Field>
                )}
                {w.kind === 'amulet' && (
                  <>
                    <select value={w.method ?? ''} onChange={(e) => set(w.uid, { method: e.target.value || undefined })} aria-label="Method">
                      <option value="">no Method</option>
                      {holyMethodsOf(d).map((m) => (
                        <option key={m.id} value={m.id}>{m.name} {m.score}</option>
                      ))}
                    </select>
                    <select value={w.power ?? ''} onChange={(e) => set(w.uid, { power: e.target.value || undefined })} aria-label="Power">
                      <option value="">no Power</option>
                      {holyPowersOf(d).map((p) => (
                        <option key={p.id} value={p.id}>{p.name} {p.score}</option>
                      ))}
                    </select>
                    <Field label="Shape and material">
                      <Stepper value={w.materials ?? 0} min={0} max={30} width={34} onChange={(v) => set(w.uid, { materials: v })} />
                    </Field>
                  </>
                )}
                {w.kind === 'shinnui' && (
                  <Field label="The text’s Quality">
                    <Stepper value={w.quality ?? 0} min={0} max={30} width={34} onChange={(v) => set(w.uid, { quality: v })} />
                  </Field>
                )}
                {w.kind !== 'shinnui' && w.kind !== 'amulet' && (
                  <>
                    <Field label="Others praying with" hint={w.kind === 'trueName' ? 'Each adds Stamina + Merkavah (Ceremony)' : 'Each adds Intelligence + Kabbalah (Ceremony); each adds a botch die'}>
                      <Stepper value={w.helpers ?? 0} min={0} max={20} width={34} onChange={(v) => set(w.uid, { helpers: v })} />
                    </Field>
                    {(w.helpers ?? 0) > 0 && (
                      <Field label="Their bonus">
                        <Stepper value={w.ceremonyBonus ?? 0} min={0} max={100} width={40} onChange={(v) => set(w.uid, { ceremonyBonus: v })} />
                      </Field>
                    )}
                  </>
                )}
                <button className="small" disabled={busy} title={busy ? `${season} ${year} is already spent: the next season, then` : undefined} onClick={() => work(w)}>
                  Work a season
                </button>
                {w.kind === 'golem' && w.bodyFormed && (
                  <button className="small primary" disabled={busy} onClick={() => work(w, true)} title={busy ? `${season} ${year} is already spent` : 'The last season: a stress die is added and the golem awakens'}>
                    Last season: awaken it
                  </button>
                )}
                <button className="small ghost" onClick={() => update((x) => void (x.holy = { ...(x.holy ?? {}), works: (x.holy?.works ?? []).filter((y) => y.uid !== w.uid) }))} aria-label="Remove the work">
                  ✕
                </button>
              </div>
            )}
          </div>
        );
      })}
      <div className="row small" style={{ marginTop: 8 }}>
        <select value={kind} onChange={(e) => setKind(e.target.value as HolyWorkKind | '')} aria-label="A new work">
          <option value="">begin a work…</option>
          {open.map((k) => (
            <option key={k} value={k}>{holyWorkLabel(k)}</option>
          ))}
        </select>
        {kind && (
          <>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'trueName' ? 'the being (e.g. Raphael)' : 'its name'} />
            {kind !== 'golem' && kind !== 'shinnui' && (
              <Field label={kind === 'trueName' ? 'Its Might' : 'Level'}>
                <Stepper value={target} min={1} max={100} width={40} onChange={setTarget} />
              </Field>
            )}
            <button className="small" onClick={start}>Begin</button>
          </>
        )}
      </div>
      {busy && works.some((w) => !w.done) && <p className="small muted">{season} {year} is already spent; the works go on next season.</p>}
      {c.holy?.trueNames?.length ? <p className="small">True Names known: {c.holy.trueNames.join(', ')}.</p> : null}
      {c.holy?.shinnui ? <p className="small">Shinnui Shem: −{c.holy.shinnui} to Aging rolls until the next Aging Point.</p> : null}
      <Lines lines={lines} />
    </Card>
  );
}
