// The saga's clock: every character's season, the covenants' year, aging and Warping, all moved on
// together from one page.

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../../store/store';
import { useGameData, useSaga, useSagaCharacters, useSagaCovenants } from '../../store/hooks';
import { deriveCharacter } from '../../engine/character/derive';
import { deriveCovenant } from '../../engine/covenant';
import { DEFAULT_YEAR_END, planYearEnd, type YearEndOptions } from '../../engine/covenantYear';
import { DEFAULT_ADVANCE, advanceSeasons, describeStanding, inPlay, loggedThisSeason, resolveStanding } from '../../engine/time';
import { allowanceRecipients } from '../../engine/economy';
import type { Character, Covenant, TimeReport } from '../../engine/types';
import { Card, Empty, Field, Stepper } from '../kit';
import { StandingEditor } from '../character/StandingEditor';
import { covenantOf } from '../../engine/context';
import { CovenantEffects } from '../covenant/CovenantEffects';

const KIND_BADGE: Record<string, string> = { aging: 'aging', crisis: 'bad', warping: 'warn', covenant: '', lab: '', effect: '', reminder: 'warn', money: '', season: '', year: '' };

export default function SeasonsPage() {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  const chars = useSagaCharacters(sagaId);
  const covs = useSagaCovenants(sagaId);
  const putSagaState = useStore((s) => s.putSagaState);
  const updateCharacter = useStore((s) => s.updateCharacter);
  const updateCovenant = useStore((s) => s.updateCovenant);
  const setNotice = useStore((s) => s.setNotice);
  const [fill, setFill] = useState(true);
  const [aging, setAging] = useState(true);
  const [ye, setYe] = useState<YearEndOptions>(DEFAULT_YEAR_END);
  const [years, setYears] = useState(1);
  const [last, setLast] = useState<TimeReport[]>([]);
  const derived = useMemo(() => (saga ? new Map(chars.map((c) => [c.id, deriveCharacter(c, data, saga.houseRules)])) : new Map()), [chars, data, saga]);
  if (!saga) return <Empty>Saga not found.</Empty>;
  const { currentYear: year, currentSeason: season } = saga;
  const playing = chars.filter(inPlay);
  const drafts = chars.filter((c) => !c.creation.finalized);
  const toNextYear = ['Spring', 'Summer', 'Autumn', 'Winter'].length - ['Spring', 'Summer', 'Autumn', 'Winter'].indexOf(season);

  const advance = (n: number) => {
    const before = { saga: structuredClone(saga), characters: structuredClone(chars), covenants: structuredClone(covs) };
    const { state, reports } = advanceSeasons(before, data, n, { ...DEFAULT_ADVANCE, fillUnplanned: fill, rollAging: aging, yearEnd: ye });
    putSagaState(state);
    setLast(reports);
    const crises = reports.flatMap((r) => r.lines).filter((l) => l.kind === 'crisis').length;
    setNotice(`${n === 1 ? `${season} ${year} is over` : `${n} seasons have passed`}: it is now ${state.saga.currentSeason} ${state.saga.currentYear}.${crises ? ` ${crises} aging crisis${crises > 1 ? 'es' : ''}: see below.` : ''}`, () => putSagaState(before));
  };

  return (
    <div className="stack">
      <div className="breadcrumbs">
        <Link to={`/saga/${saga.id}`}>{saga.name}</Link> ›
      </div>
      <div className="topbar">
        <h1>
          {season} {year}
        </h1>
      </div>
      <p className="small muted" style={{ marginTop: 0 }}>
        Time passes here for the whole saga at once. Each character&apos;s season is what they logged on their sheet (Seasons &amp; Aging tab) for {season} {year}, or else their standing
        activity. The turn of the year closes every covenant&apos;s books, pays allowances, renews wards, rolls aging and adds the year&apos;s Warping.
      </p>

      <Card title="Move time on" className="accent">
        <div className="row">
          <button className="primary" onClick={() => advance(1)}>
            End {season} {year} ›
          </button>
          <button onClick={() => advance(toNextYear)} title="Every season up to the next Spring, the year's end included">
            To Spring {year + 1} ({toNextYear} season{toNextYear > 1 ? 's' : ''}) »
          </button>
          <Field label="Years">
            <Stepper value={years} min={1} max={50} width={40} onChange={setYears} />
          </Field>
          <button onClick={() => advance(years * 4)} title="Fast-forward: everyone follows their standing activity">
            Pass {years} year{years > 1 ? 's' : ''} »»
          </button>
        </div>
        <div className="row small" style={{ marginTop: 6 }}>
          <label className="inline">
            <input type="checkbox" checked={fill} onChange={(e) => setFill(e.target.checked)} /> Unplanned seasons follow each character&apos;s standing activity
          </label>
          <label className="inline">
            <input type="checkbox" checked={aging} onChange={(e) => setAging(e.target.checked)} /> Roll aging at the year&apos;s end
          </label>
          <label className="inline">
            <input type="checkbox" checked={ye.harvestVis} onChange={(e) => setYe({ ...ye, harvestVis: e.target.checked })} /> Gather the year&apos;s vis
          </label>
          <label className="inline">
            <input type="checkbox" checked={ye.inflation} onChange={(e) => setYe({ ...ye, inflation: e.target.checked })} /> Inflation rises
          </label>
          <label className="inline">
            <input type="checkbox" checked={ye.permanentIncome} onChange={(e) => setYe({ ...ye, permanentIncome: e.target.checked })} /> Income changes last
          </label>
        </div>
        {last.length > 0 && <Reports reports={last} />}
      </Card>

      <Card title={`This season: ${season} ${year}`}>
        {playing.length === 0 && <Empty>No finished characters yet.</Empty>}
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr>
                <th>Character</th>
                <th>{season} {year}</th>
                <th>Standing activity (when nothing is logged)</th>
              </tr>
            </thead>
            <tbody>
              {playing.map((c) => {
                const d = derived.get(c.id);
                if (!d) return null;
                const logged = loggedThisSeason(c, year, season);
                return (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/saga/${saga.id}/character/${c.id}?tab=advancement`}>
                        <b>{c.name || 'Unnamed'}</b>
                      </Link>
                      <div className="small muted">
                        {c.type}, age {c.age}
                      </div>
                    </td>
                    <td className="small">
                      {logged.length ? (
                        logged.map((e) => (
                          <div key={e.uid}>
                            <span className="badge good">logged</span> {e.summary}
                          </div>
                        ))
                      ) : (
                        <span className="muted">{fill ? `→ ${describeStanding(c, d, resolveStanding(c, d, season))}` : 'nothing'}</span>
                      )}
                    </td>
                    <td>
                      <StandingEditor
                        c={c}
                        d={d}
                        season={season}
                        teachers={covenantOf(c, covs)?.specialists.filter((s) => s.role === 'teacher' && !s.characterId) ?? []}
                        onChange={(s) => updateCharacter(c.id, (x) => void (x.standing = s))}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {drafts.length > 0 && <p className="small muted">Still in creation, so time does not move them: {drafts.map((c) => c.name || 'Unnamed').join(', ')}.</p>}
      </Card>

      {covs.map((cov) => (
        <CovenantYear key={cov.id} cov={cov} chars={chars} />
      ))}

      {(saga.timeLog ?? []).length > 0 && (
        <Card title="Chronicle of time">
          <Reports reports={(saga.timeLog ?? []).slice(0, 12)} collapsed />
        </Card>
      )}
    </div>
  );

  function CovenantYear({ cov, chars }: { cov: Covenant; chars: Character[] }) {
    const dc = deriveCovenant(cov, data, chars);
    const plan = planYearEnd(cov, dc, { ...ye, skipVis: cov.yearEnd?.skipVis ?? [] });
    const a = cov.allowance;
    const who = allowanceRecipients(cov, chars);
    return (
      <Card title={`${cov.name}: the year's end`}>
        <ul className="small" style={{ marginTop: 0 }}>
          {plan.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
          {a && a.mode !== 'none' && (
            <li>
              Allowance: {a.mode === 'flat' ? `${a.amount} £ each` : `${a.amount}% of the surplus, split`}
              {a.visShare ? ` and ${a.visShare}% of the vis gathered` : ''} to {who.length} {a.to === 'magi' ? 'magi' : 'members'}.
            </li>
          )}
        </ul>
        <div className="row small">
          {cov.visSources.length > 0 && <span>Not gathered this year:</span>}
          {cov.visSources.map((s) => (
            <label key={s.uid} className="inline">
              <input
                type="checkbox"
                checked={cov.yearEnd?.skipVis?.includes(s.uid) ?? false}
                onChange={(e) =>
                  updateCovenant(cov.id, (x) => {
                    const skip = new Set(x.yearEnd?.skipVis ?? []);
                    if (e.target.checked) skip.add(s.uid);
                    else skip.delete(s.uid);
                    x.yearEnd = { ...(x.yearEnd ?? {}), skipVis: [...skip] };
                  })
                }
              />{' '}
              {s.name} <span className="muted">({s.pawnsPerYear} {s.art})</span>
              {s.contested ? ' (contested)' : ''}
            </label>
          ))}
          <Link to={`/saga/${saga!.id}/covenant/${cov.id}?tab=folk`}>Finances &amp; allowance ›</Link>
        </div>
        <HookStories cov={cov} />
        <CovenantEffects cov={cov} chars={chars} />
      </Card>
    );
  }

  function HookStories({ cov }: { cov: Covenant }) {
    const hooks = cov.hooksBoons.filter((h) => h.kind === 'hook' && /indiscreet resource|dark secret|itinerants|flickering aura|faerie aura|contested resource/i.test(h.name));
    if (!hooks.length) return null;
    return (
      <div className="row small" style={{ marginTop: 6 }}>
        Stories the Hooks call for:
        {hooks.map((h) => (
          <span key={h.uid} className="row tight">
            {h.name} (last {cov.hookStories?.[h.uid] ?? 'never'})
            <button className="small ghost" onClick={() => updateCovenant(cov.id, (x) => void (x.hookStories = { ...(x.hookStories ?? {}), [h.uid]: year }))}>
              played this year
            </button>
          </span>
        ))}
      </div>
    );
  }
}

function Reports({ reports, collapsed }: { reports: TimeReport[]; collapsed?: boolean }) {
  return (
    <div className="stack" style={{ marginTop: 8 }}>
      {reports.map((r) => (
        <details key={r.id} open={!collapsed}>
          <summary>
            <b>
              {r.season} {r.year}
            </b>{' '}
            <span className="small muted">
              {r.lines.length} line{r.lines.length === 1 ? '' : 's'}
              {r.lines.some((l) => l.kind === 'crisis') ? ' · crisis!' : ''}
            </span>
          </summary>
          {r.lines.map((l, i) => (
            <div key={i} className="small list-row">
              {l.who && <b style={{ minWidth: 120 }}>{l.who}</b>}
              {l.kind && KIND_BADGE[l.kind] !== undefined && KIND_BADGE[l.kind] !== '' && <span className={`badge ${KIND_BADGE[l.kind]}`}>{l.kind}</span>}
              <span>{l.text}</span>
            </div>
          ))}
        </details>
      ))}
    </div>
  );
}
