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
import { DEFAULT_ADVANCE, advanceSeasons } from '../../engine/time';
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
import { HolyWorksCard } from './HolyPart';
import { holyWorksOpen } from '../../engine/holy';
import { LongevityCard } from '../character/sheet/LabItemsTab';
import { OriginalResearch } from '../character/sheet/OriginalResearch';
import { ApprenticeCard } from '../character/sheet/ApprenticeCard';
import { WorkshopCard } from '../character/sheet/WorkshopCard';
import { SpellMasteryCard } from '../character/sheet/SpellMastery';
import { InsightCard } from '../character/sheet/InsightCard';
import { ComingsCard } from '../covenant/CovenfolkCards';
import { R } from '../routes';
import { owedInOrder, seasonForecast } from '../../engine/seasonPlan';
import { ForecastList, ResolveCard, TurnBackControl } from './SeasonResolve';
import { keepTurnBack } from '../turnBack';
import { ChronicleEntry } from './ChroniclePage';

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
  const replaceSagaState = useStore((s) => s.replaceSagaState);
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
  // what to expect when the season ends: what falls short, what comes due, what is left undone
  const notes = useMemo(
    () => (saga ? seasonForecast({ saga, characters: allChars, covenants: allCovs }, data, (c) => derived.get(c.id) ?? deriveCharacter(c, data, saga.houseRules)) : []),
    [saga, allChars, allCovs, data, derived],
  );
  if (!saga) return <Empty>Saga not found.</Empty>;
  const owed = owedInOrder(saga, chars).length;
  const warnings = notes.filter((n) => n.level !== 'info' && n.to !== 'resolve').length;
  const { currentYear: year, currentSeason: season } = saga;
  const toNextYear = ['Spring', 'Summer', 'Autumn', 'Winter'].length - ['Spring', 'Summer', 'Autumn', 'Winter'].indexOf(season);
  const go = (tour: string) => document.querySelector(`[data-tour="${tour}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const advance = async (n: number) => {
    if (!timeMayMove()) return;
    if (warnings && n === 1 && !window.confirm(`${warnings} warning${warnings > 1 ? 's' : ''} for this season (below, above the button). End ${season} ${year} all the same?`)) return;
    const before = { saga: structuredClone(saga), characters: structuredClone(allChars), covenants: structuredClone(allCovs) };
    const { state, reports } = advanceSeasons(structuredClone(before), data, n, { ...DEFAULT_ADVANCE, fillUnplanned: fill, rollAging: aging, yearEnd: ye });
    // kept so the saga can be turned back to this season, whatever is done after
    await keepTurnBack(before, n);
    putSagaState(state);
    setLast(reports);
    const crises = reports.flatMap((r) => r.lines).filter((l) => l.kind === 'crisis').length;
    const owedNow = state.characters.reduce((t, c) => t + (c.owed?.length ?? 0), 0);
    setNotice(
      `${n === 1 ? `${season} ${year} is over` : `${n} seasons have passed`}: it is now ${state.saga.currentSeason} ${state.saga.currentYear}.${crises ? ` ${crises} aging crisis${crises > 1 ? 'es' : ''}.` : ''}${owedNow ? ` ${owedNow} thing${owedNow > 1 ? 's' : ''} to settle, at the top.` : ''}`,
      () => replaceSagaState(before, 'the season that just ended'),
    );
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  return (
    <div className="stack">
      <div className="phase-bar" data-tour="seasons-phases">
        <button className="phase" onClick={() => go('table-season')}>
          <b>1</b> Plan {season} {year}
        </button>
        <span className="muted">›</span>
        <button className={`phase ${warnings ? 'warn' : ''}`} onClick={() => go('seasons-advance')}>
          <b>2</b> End the season{warnings ? ` (${warnings} warning${warnings > 1 ? 's' : ''})` : ''}
        </button>
        <span className="muted">›</span>
        <button className={`phase ${owed ? 'bad' : ''}`} onClick={() => go('seasons-resolve')} disabled={!owed && !last.length}>
          <b>3</b> Resolve{owed ? ` (${owed})` : ''}
        </button>
        <span style={{ marginLeft: 'auto' }}>
          <TurnBackControl saga={saga} onTurned={(l) => (setLast([]), setNotice(`Turned back to ${l}.`))} />
        </span>
      </div>
      <Hint id="seasons-how">Plan from the top down: the covenant first, then each player&apos;s characters in turn and the grogs. End the season at the bottom, after its warnings; what it leaves to decide waits at the top until it is settled.</Hint>

      <ResolveCard
        saga={saga}
        data={data}
        chars={chars}
        extra={
          last.length ? (
            <div className="stack" style={{ gap: 6, marginTop: 8 }}>
              {last.slice(-2).reverse().map((r) => (
                <ChronicleEntry key={r.id} r={r} />
              ))}
              {last.length > 2 && <span className="small muted">and {last.length - 2} season{last.length > 3 ? 's' : ''} before:</span>}
              <Link to={R.table(saga.id, 'chronicle')}>The whole Chronicle ›</Link>
            </div>
          ) : undefined
        }
      />

      {covs.map((cov) => (
        <CovenantYear key={cov.id} cov={cov} chars={chars} />
      ))}
      {covs.map((cov) => (
        <ComingsCard key={cov.id} cov={cov} year={year} update={(fn) => updateCovenant(cov.id, fn)} />
      ))}

      <SeasonPlanner saga={saga} data={data} chars={chars} covs={covs} derived={derived} fill={fill} onPlan={plan} />

      <PlanInFull sagaId={saga.id} chars={allChars} covs={allCovs} who={who} onPick={plan} season={`${season} ${year}`} />

      <Card title={`End ${season} ${year}`} className="accent" tour="seasons-advance">
        <p className="small muted" style={{ marginTop: 0 }}>
          Each character spends the season as planned above, or else on their usual activity. At the end of a year the toolkit also does the covenants&apos; accounts, allowances,
          wards, aging and Warping. What to expect:
        </p>
        <ForecastList saga={saga} notes={notes} />
        <div className="row" style={{ marginTop: 10 }}>
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
          <label className="inline" title="Each source of income the storyguide has not set rolls a stress die on the Income Modification table (Covenants ch.5); a rolled change is that year's only">
            <input type="checkbox" checked={!!ye.rollIncome} onChange={(e) => setYe({ ...ye, rollIncome: e.target.checked })} /> Each income source rolls its year
          </label>
          <label className="inline" title="A change the storyguide set on a source of income lasts into the coming years">
            <input type="checkbox" checked={ye.permanentIncome} onChange={(e) => setYe({ ...ye, permanentIncome: e.target.checked })} /> Income changes set by hand last
          </label>
        </div>
      </Card>

      {(saga.timeLog ?? []).length > 0 && (
        <p className="small">
          Every season so far, told as a story with its record beneath: <Link to={R.table(saga.id, 'chronicle')}>the Chronicle ›</Link>
        </p>
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
      <InsightCard ed={ed} />
      {ed.d.isMagus && <LabProjects ed={ed} />}
      {ed.d.isMagus && <OriginalResearch ed={ed} magicTheory={mt} />}
      {holyWorksOpen(ed.d).length > 0 && <HolyWorksCard ed={ed} aura={ed.ctx.aura} />}
      <LongevityCard ed={ed} />
      <ApprenticeCard ed={ed} />
      <WorkshopCard ed={ed} where="seasons" />
    </AtTable>
  );
}
