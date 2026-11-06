// The Seasons page's three steps around the clock: what to expect before the season ends (Plan), the
// choices the seasons left (Resolve), kept on the characters until they are made, each with its quick
// resolution, and turning the saga back a season or a year. The order of play (each player in turn,
// their magi then companions, then the grogs) is set here too.

import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { GameData } from '../../data';
import { addVirtue } from '../../engine/character/factory';
import { owedInOrder, playersInOrder, settle, type PlanNote } from '../../engine/seasonPlan';
import type { Character, Owed, Saga } from '../../engine/types';
import { useStore } from '../../store/store';
import { Card } from '../kit';
import { R } from '../routes';
import { forgetFrom, turnBacks, type TurnBack } from '../turnBack';

/** Where a forecast line is dealt with. */
function noteLink(saga: Saga, n: PlanNote): { to?: string; go: string; scroll?: string } {
  const cov = (tab: string, sub?: string) => (n.covenantId ? R.covenant(saga.id, n.covenantId, tab, sub) : undefined);
  switch (n.to) {
    case 'finances': return { to: cov('folk', 'money'), go: 'Finances' };
    case 'hooks': return { to: cov('hooks'), go: 'Hooks' };
    case 'covenant': return { to: cov('overview'), go: 'Covenant' };
    case 'tribunal': return { to: R.tribunal(saga.id), go: 'Tribunal' };
    case 'workshop': return { to: R.seasonsFor(saga.id, n.charId, 'workshop-season'), go: 'Workshop' };
    case 'lab': return { to: R.seasonsFor(saga.id, n.charId, 'lab-projects'), go: 'Lab' };
    case 'plan': return { to: R.seasonsFor(saga.id, n.charId, 'table-plan'), go: 'Plan' };
    case 'resolve': return { scroll: 'seasons-resolve', go: 'Settle' };
    default: return { go: '' };
  }
}

const scrollTo = (tour: string) => document.querySelector(`[data-tour="${tour}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/** What to expect when the season ends: the warnings first. */
export function ForecastList({ saga, notes }: { saga: Saga; notes: PlanNote[] }) {
  if (!notes.length) return <div className="small muted">Nothing to warn of: the work is planned, the stores and the treasury will hold.</div>;
  return (
    <div className="stack" style={{ gap: 2 }}>
      {notes.map((n, i) => {
        const l = noteLink(saga, n);
        return (
          <div key={i} className="list-row small">
            <span className={`badge ${n.level === 'bad' ? 'bad' : n.level === 'warn' ? 'warn' : ''}`}>{n.level === 'bad' ? '!' : n.level === 'warn' ? '•' : 'i'}</span>
            <span style={{ flex: '1 1 220px' }}>{n.text}</span>
            {l.to && <Link to={l.to}>{l.go} →</Link>}
            {l.scroll && (
              <button className="small ghost" onClick={() => scrollTo(l.scroll!)}>
                {l.go} ↑
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The players' order of play, changed with arrows. */
export function PlayerOrder({ saga, chars }: { saga: Saga; chars: Character[] }) {
  const updateSaga = useStore((s) => s.updateSaga);
  const players = playersInOrder(saga, chars);
  if (players.length < 2) return null;
  const move = (i: number, by: number) => {
    const next = [...players];
    const [p] = next.splice(i, 1);
    next.splice(i + by, 0, p);
    updateSaga(saga.id, (x) => void (x.playerOrder = next));
  };
  return (
    <div className="row tight small" style={{ flexWrap: 'wrap' }} data-tour="seasons-order">
      <span className="muted">Order of play:</span>
      {players.map((p, i) => (
        <span key={p} className="badge row tight" style={{ gap: 2 }}>
          {i + 1}. {p}
          <button className="small ghost" style={{ padding: '0 4px' }} disabled={i === 0} aria-label={`${p} earlier`} onClick={() => move(i, -1)}>
            ‹
          </button>
          <button className="small ghost" style={{ padding: '0 4px' }} disabled={i === players.length - 1} aria-label={`${p} later`} onClick={() => move(i, 1)}>
            ›
          </button>
        </span>
      ))}
      <span className="muted">then the grogs.</span>
    </div>
  );
}

/** One choice owed, with its quick resolution. */
function OwedRow({ saga, data, c, o }: { saga: Saga; data: GameData; c: Character; o: Owed }) {
  const updateCharacter = useStore((s) => s.updateCharacter);
  const [pick, setPick] = useState('');
  const done = (fn?: (x: Character) => void) => updateCharacter(c.id, (x) => void (fn?.(x), settle(x, o.uid)));
  const want = o.want;
  const options = want
    ? data.virtuesFlaws
        .filter((v) => v.kind === want.kind && v.sizes.includes(want.size) && (!want.supernatural || v.categories.includes('Supernatural')) && !c.virtues.some((x) => x.defId === v.id && !v.repeatable))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  // by category, the Supernatural first (what a strong aura most often brings), the Story Flaws last
  const CAT_ORDER = ['Supernatural', 'General', 'Personality', 'Social Status', 'Hermetic', 'Story'];
  const rank = (cat: string) => (CAT_ORDER.includes(cat) ? CAT_ORDER.indexOf(cat) : CAT_ORDER.length - 1);
  const groups = [...options.reduce((m, v) => m.set(v.categories[0] ?? 'Other', [...(m.get(v.categories[0] ?? 'Other') ?? []), v]), new Map<string, typeof options>())].sort((a, b) => rank(a[0]) - rank(b[0]));
  return (
    <div className="list-row small" style={{ flexWrap: 'wrap' }}>
      <Link to={R.character(saga.id, c)} style={{ minWidth: 110 }}>
        <b>{c.name || 'Unnamed'}</b>
      </Link>
      <span className={`badge ${o.kind === 'dying' ? 'bad' : 'warn'}`}>{o.kind === 'warping' ? 'Warping' : o.kind === 'twilight' ? 'Twilight' : 'dying'}</span>
      <span style={{ flex: '1 1 220px' }}>
        {o.text} <span className="muted">({o.season} {o.year})</span>
      </span>
      {o.kind === 'warping' && want && (
        <span className="row tight">
          <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label={`The ${want.size} ${want.kind} for ${c.name}`}>
            <option value="">— the {want.size} {want.supernatural ? 'Supernatural ' : ''}{want.kind === 'virtue' ? 'Virtue' : 'Flaw'} —</option>
            {groups.map(([cat, vs]) => (
              <optgroup key={cat} label={cat}>
                {vs.map((v) => (
                  <option key={v.id} value={v.id} title={v.text.slice(0, 300)}>
                    {v.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            className="small primary"
            disabled={!pick}
            onClick={() => done((x) => void addVirtue(x, data, pick, want.size, undefined, { free: true, freeReason: `Warping (${o.year})`, noPoints: true, note: o.text }))}
          >
            Take it
          </button>
        </span>
      )}
      {o.kind === 'twilight' && <Link to={R.dice(saga.id, 'magic', c.id)}>Roll it (Warping &amp; Twilight) →</Link>}
      {o.kind === 'dying' && (
        <>
          <button className="small" title="A Creo Corpus ritual, or another magic, saved them" onClick={() => done((x) => void (x.wounds.dead = false))}>
            Saved by magic
          </button>
          <button className="small danger" onClick={() => done()}>
            They die
          </button>
        </>
      )}
      {o.kind !== 'dying' && (
        <button className="small ghost" title={o.kind === 'warping' ? 'Chosen and added on the sheet by hand' : 'Rolled and settled'} onClick={() => done()}>
          Done
        </button>
      )}
    </div>
  );
}

/**
 * What the seasons left to settle, kept until it is: in order of play, with the quickest way to settle
 * each. Shown at the top of the Seasons page (and on the Overview) whenever there is any.
 */
export function ResolveCard({ saga, data, chars, extra }: { saga: Saga; data: GameData; chars: Character[]; extra?: ReactNode }) {
  const owed = owedInOrder(saga, chars);
  if (!owed.length && !extra) return null;
  return (
    <Card title={owed.length ? `Resolve: ${owed.length} thing${owed.length === 1 ? '' : 's'} to settle` : 'Resolve'} className="accent" tour="seasons-resolve">
      <p className="small muted" style={{ marginTop: 0 }}>
        What the seasons left for the troupe to decide. It stays here, and on the Overview, until it is settled.
      </p>
      {owed.map(({ c, o }) => (
        <OwedRow key={o.uid} saga={saga} data={data} c={c} o={o} />
      ))}
      {extra}
    </Card>
  );
}

/** Turn the saga back to before a season (or several) passed: two years are kept. */
export function TurnBackControl({ saga, onTurned }: { saga: Saga; onTurned?: (label: string) => void }) {
  const replaceSagaState = useStore((s) => s.replaceSagaState);
  const [points, setPoints] = useState<TurnBack[]>([]);
  const [pick, setPick] = useState('');
  const stamp = `${saga.currentSeason}${saga.currentYear}`;
  useEffect(() => {
    let live = true;
    turnBacks(saga.id).then((p) => live && setPoints(p));
    return () => void (live = false);
  }, [saga.id, stamp]);
  if (!points.length) return null;
  const chosen = points.find((p) => p.at === pick) ?? points[0];
  const label = (p: TurnBack) => `${p.season} ${p.year}${p.seasons > 1 ? ` (before ${p.seasons} seasons passed)` : ''}`;
  return (
    <div className="row tight small" data-tour="seasons-turnback">
      <span>Turn back to</span>
      <select value={chosen.at} onChange={(e) => setPick(e.target.value)} aria-label="Turn back to">
        {points.map((p) => (
          <option key={p.at} value={p.at}>
            {label(p)}
          </option>
        ))}
      </select>
      <button
        className="small"
        onClick={async () => {
          if (!window.confirm(`Turn the saga back to ${label(chosen)}? Everything done since, by the clock and by hand, is taken back (Undo at the top brings it back).`)) return;
          replaceSagaState(structuredClone(chosen.state), `turning back to ${label(chosen)}`);
          await forgetFrom(saga.id, chosen.at);
          setPoints(await turnBacks(saga.id));
          onTurned?.(label(chosen));
        }}
      >
        Turn back
      </button>
    </div>
  );
}
