// The Game Table's Seasons page, the saga's clock: what every character does this season, the
// covenants' year, aging and Warping, all moved on together.

import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/store';
import { SeasonPlanner } from './SeasonPlanner';
import { useGameData, usePlayerCharacters, usePlayerCovenants, useSaga, useSagaCharacters, useSagaCovenants } from '../../store/hooks';
import { deriveCharacter } from '../../engine/character/derive';
import { deriveCovenant } from '../../engine/covenant';
import { DEFAULT_YEAR_END, accountsForecast, planYearEnd, type YearEndOptions } from '../../engine/covenantYear';
import { optionOn } from '../../engine/optional';
import { DEFAULT_ADVANCE, REPORTS_IN_FULL, advanceSeasons } from '../../engine/time';
import { allowanceRecipients } from '../../engine/economy';
import type { Character, Covenant, TimeReport } from '../../engine/types';
import { Card, Empty, Field, Stepper } from '../kit';
import { CovenantEffects } from '../covenant/CovenantEffects';
import { Hint } from '../Hint';
import { timeMayMove } from '../advanceGuard';
import { AtTable, PeopleOptions, canPlay, groupPeople, useLandOn } from '../play';
import { useCharEditor } from '../character/useChar';
import AdvancementTab from '../character/sheet/AdvancementTab';
import { LabProjects } from '../character/sheet/LabProjects';
import { LongevityCard } from '../character/sheet/LabItemsTab';
import { OriginalResearch } from '../character/sheet/OriginalResearch';
import { ApprenticeCard } from '../character/sheet/ApprenticeCard';
import { SpellMasteryCard } from '../character/sheet/SpellMastery';
import { R } from '../routes';

const KIND_BADGE: Record<string, string> = { aging: 'aging', crisis: 'bad', warping: 'warn', covenant: '', lab: '', effect: '', reminder: 'warn', money: '', season: '', year: '' };

export default function SeasonsPage() {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  // time moves for the whole saga, the Tribunal's living covenants with it; the page shows the players'
  const allChars = useSagaCharacters(sagaId);
  const allCovs = useSagaCovenants(sagaId);
  const chars = usePlayerCharacters(sagaId);
  const covs = usePlayerCovenants(sagaId);
  const putSagaState = useStore((s) => s.putSagaState);
  const updateCovenant = useStore((s) => s.updateCovenant);
  const setNotice = useStore((s) => s.setNotice);
  const [fill, setFill] = useState(true);
  const [aging, setAging] = useState(true);
  const [ye, setYe] = useState<YearEndOptions>(DEFAULT_YEAR_END);
  const [years, setYears] = useState(1);
  const [last, setLast] = useState<TimeReport[]>([]);
  // the character whose season is planned in full below (?who=)
  const [params, setParams] = useSearchParams();
  const who = params.get('who') ?? '';
  const plan = (id: string) => {
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.set('who', id);
      return n;
    }, { replace: true });
    requestAnimationFrame(() => document.querySelector('[data-tour="table-plan"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  // a link from elsewhere (?to=) lands on the card it names, in the season in full: a lab project planned on Possessions
  useLandOn(['table-plan']);
  const derived = useMemo(() => (saga ? new Map(chars.map((c) => [c.id, deriveCharacter(c, data, saga.houseRules)])) : new Map()), [chars, data, saga]);
  if (!saga) return <Empty>Saga not found.</Empty>;
  const { currentYear: year, currentSeason: season } = saga;
  const toNextYear = ['Spring', 'Summer', 'Autumn', 'Winter'].length - ['Spring', 'Summer', 'Autumn', 'Winter'].indexOf(season);

  const advance = (n: number) => {
    if (!timeMayMove()) return;
    const before = { saga: structuredClone(saga), characters: structuredClone(allChars), covenants: structuredClone(allCovs) };
    const { state, reports } = advanceSeasons(before, data, n, { ...DEFAULT_ADVANCE, fillUnplanned: fill, rollAging: aging, yearEnd: ye });
    putSagaState(state);
    setLast(reports);
    const crises = reports.flatMap((r) => r.lines).filter((l) => l.kind === 'crisis').length;
    setNotice(`${n === 1 ? `${season} ${year} is over` : `${n} seasons have passed`}: it is now ${state.saga.currentSeason} ${state.saga.currentYear}.${crises ? ` ${crises} aging crisis${crises > 1 ? 'es' : ''}: see below.` : ''}`, () => putSagaState(before));
  };

  return (
    <div className="stack">
      <p className="small muted" style={{ marginTop: 0 }}>
        Time moves on here, for everyone at once. Each character spends {season} {year} as planned (below, in full), or else on their usual activity. At the end of a year the
        toolkit also does the covenants&apos; accounts, allowances, wards, aging and Warping.
      </p>
      <Hint id="seasons-how">Set what each character does this season below (or plan a particular book, teacher or project in full), then end the season here for everyone at once.</Hint>

      <Card title="Move time on" className="accent" tour="seasons-advance">
        <div className="row">
          <button className="primary" onClick={() => advance(1)} data-tour="table-advance">
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
          {optionOn(saga, 'inflation') && (
            <label className="inline">
              <input type="checkbox" checked={ye.inflation} onChange={(e) => setYe({ ...ye, inflation: e.target.checked })} /> Inflation rises
            </label>
          )}
          <label className="inline">
            <input type="checkbox" checked={ye.permanentIncome} onChange={(e) => setYe({ ...ye, permanentIncome: e.target.checked })} /> Income changes last
          </label>
        </div>
        {last.length > 0 && <Reports reports={last} />}
      </Card>

      <SeasonPlanner saga={saga} data={data} chars={chars} covs={covs} derived={derived} fill={fill} onPlan={plan} />

      <PlanInFull sagaId={saga.id} chars={allChars} covs={allCovs} who={who} onPick={plan} season={`${season} ${year}`} />

      {covs.map((cov) => (
        <CovenantYear key={cov.id} cov={cov} chars={chars} />
      ))}

      {(saga.timeLog ?? []).length > 0 && (
        <Card title="Chronicle of time">
          <Reports reports={(saga.timeLog ?? []).slice(0, REPORTS_IN_FULL)} collapsed />
        </Card>
      )}
    </div>
  );

  function CovenantYear({ cov, chars }: { cov: Covenant; chars: Character[] }) {
    const dc = deriveCovenant(cov, data, chars);
    const plan = planYearEnd(cov, dc, { ...ye, inflation: ye.inflation && optionOn(saga, 'inflation'), skipVis: cov.yearEnd?.skipVis ?? [] });
    const a = cov.allowance;
    const who = allowanceRecipients(cov, chars);
    return (
      <Card title={`${cov.name}: the year's end`}>
        <ul className="small" style={{ marginTop: 0 }}>
          {plan.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
          {plan.inflationRise > 0 && <ForecastLine treasury={cov.finances.treasury} income={plan.income} expenditure={plan.expenditure} />}
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
          <Link to={`/saga/${saga!.id}/covenant/${cov.id}?tab=folk&sub=money`}>Finances &amp; allowance ›</Link>
        </div>
        <HookStories cov={cov} />
        <CovenantEffects cov={cov} chars={chars} />
      </Card>
    );
  }

  /** Where the accounts are heading as inflation rises, in a line (nothing when that is more than fifty years off). */
  function ForecastLine({ treasury, income, expenditure }: { treasury: number; income: number; expenditure: number }) {
    const f = accountsForecast(treasury, income, expenditure);
    if (f.lossIn === undefined) return null;
    const years = (n: number) => `${n} year${n === 1 ? '' : 's'}`;
    return (
      <li className={f.emptyIn !== undefined && f.emptyIn <= 5 ? 'warn-text' : undefined}>
        {f.lossIn === 0 ? 'It already spends more than it earns' : `As inflation rises, it will spend more than it earns in about ${years(f.lossIn)}`}
        {f.emptyIn !== undefined ? `, and the treasury runs out in about ${years(f.emptyIn)}` : ''}. More income (Magical Improvement), cost savings (craftsmen, laborers,
        magic) or a good year without inflation put that off.
      </li>
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
      {reports.map((r) => {
        // the living covenants' lines are folded apart from the players'
        const own = r.lines.filter((l) => !l.tribunal);
        const tribunal = r.lines.filter((l) => l.tribunal);
        const line = (l: TimeReport['lines'][number], i: number) => (
          <div key={i} className="small list-row">
            {l.who && <b style={{ minWidth: 120 }}>{l.who}</b>}
            {l.kind && KIND_BADGE[l.kind] !== undefined && KIND_BADGE[l.kind] !== '' && <span className={`badge ${KIND_BADGE[l.kind]}`}>{l.kind}</span>}
            <span>{l.text}</span>
          </div>
        );
        return (
          <details key={r.id} open={!collapsed}>
            <summary>
              <b>
                {r.season} {r.year}
              </b>{' '}
              <span className="small muted">
                {own.length} line{own.length === 1 ? '' : 's'}
                {own.some((l) => l.kind === 'crisis') ? ' · crisis!' : ''}
                {tribunal.length ? ` · the Tribunal: ${tribunal.length}` : ''}
              </span>
            </summary>
            {own.map(line)}
            {tribunal.length > 0 && (
              <details style={{ marginLeft: 12 }}>
                <summary className="small">The Tribunal’s living covenants ({tribunal.length} lines)</summary>
                {tribunal.map(line)}
              </details>
            )}
          </details>
        );
      })}
    </div>
  );
}

/**
 * One character's season in full, as the sheet once had it: a book, a teacher, training, vis, a lab
 * project, writing or copying, an Initiation, their standing activity and priorities, and aging out of
 * turn. What is planned is logged in their season log; the season ends for everyone above.
 */
function PlanInFull({ sagaId, chars, covs, who, onPick, season }: { sagaId: string; chars: Character[]; covs: Covenant[]; who: string; onPick: (id: string) => void; season: string }) {
  // the players' people first; the Tribunal's magi too, for their priorities
  const groups = groupPeople(chars.filter(canPlay), covs);
  const all = groups.flatMap((g) => g.people);
  const c = all.find((x) => x.id === who) ?? all[0];
  return (
    <Card title={c ? `${c.name || 'Unnamed'}: ${season} in full` : 'A season in full'} tour="table-plan" fold="table-plan" summary="One character's season: a book, a teacher, a lab project, writing, an Initiation; aging out of turn.">
      {!c ? (
        <Empty>No character in play yet.</Empty>
      ) : (
        <>
          <div className="row small">
            <Field label="Whose season">
              <select value={c.id} onChange={(e) => onPick(e.target.value)}>
                <PeopleOptions groups={groups} note={(x) => ` (${x.type})`} />
              </select>
            </Field>
            <Link to={R.character(sagaId, c, 'advancement')}>Their season log ›</Link>
          </div>
          <SeasonFor key={c.id} sagaId={sagaId} charId={c.id} />
        </>
      )}
    </Card>
  );
}

function SeasonFor({ sagaId, charId }: { sagaId: string; charId: string }) {
  const ed = useCharEditor({ sagaId, charId });
  if (!ed.c || !ed.d) return null;
  const mt = ed.d.abilities.find((a) => a.abilityId === ed.d!.theoryAbility)?.total ?? 0;
  return (
    <AtTable>
      <AdvancementTab ed={ed} />
      <SpellMasteryCard ed={ed} />
      {ed.d.isMagus && <LabProjects ed={ed} />}
      {ed.d.isMagus && <OriginalResearch ed={ed} magicTheory={mt} />}
      <LongevityCard ed={ed} />
      <ApprenticeCard ed={ed} />
    </AtTable>
  );
}
