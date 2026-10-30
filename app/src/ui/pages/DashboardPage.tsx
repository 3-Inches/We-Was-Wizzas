// The game table: one page to run a session from. What needs attention, what everyone does this season
// (changed here), the covenants' money and loyalty at a glance, ending the season, a quick die, and a
// list of what comes up in play with a link straight to where it is done.

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { deriveCharacter, type DerivedCharacter } from '../../engine/character/derive';
import { validateCharacter } from '../../engine/character/validate';
import { deriveCovenant, type DerivedCovenant } from '../../engine/covenant';
import { DEFAULT_YEAR_END, loyaltyAttitude, planYearEnd } from '../../engine/covenantYear';
import { onStrike, teaches } from '../../engine/covenfolk';
import { covenantOf } from '../../engine/context';
import { describeStress, simpleDie, stressDie } from '../../engine/dice';
import { lsd } from '../../engine/economy';
import { DEFAULT_ADVANCE, advanceSeasons, describeStanding, inPlay, loggedThisSeason, resolveStanding } from '../../engine/time';
import type { Character, Covenant, TimeReport } from '../../engine/types';
import { visText } from '../../engine/vis';
import { useGameData, usePlayerCharacters, usePlayerCovenants, useSaga, useSagaCharacters, useSagaCovenants } from '../../store/hooks';
import { tribunalBook } from '../../data/livingCovenants';
import { NewsCard } from './TribunalPage';
import { useStore } from '../../store/store';
import { StandingEditor } from '../character/StandingEditor';
import { LoyaltyEvent } from '../covenant/FinancesTab';
import { TravelTradeCard } from './TravelTradeCard';
import { AfterStoryCard } from './AfterStoryCard';
import { ARTS, ART_NAMES, type Art } from '../../data';
import { addVis } from '../../engine/vis';
import { uid } from '../../util/id';
import { Card, Empty, Field, Stepper } from '../kit';

interface Attention {
  level: 'bad' | 'warn' | 'info';
  text: string;
  to: string;
  go: string;
}

export default function DashboardPage() {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  // the players' characters and covenants; the Tribunal's living covenants move with the clock but are shown on their own
  const allChars = useSagaCharacters(sagaId);
  const allCovs = useSagaCovenants(sagaId);
  const chars = usePlayerCharacters(sagaId);
  const covs = usePlayerCovenants(sagaId);
  const putSagaState = useStore((s) => s.putSagaState);
  const updateCharacter = useStore((s) => s.updateCharacter);
  const setNotice = useStore((s) => s.setNotice);
  const [report, setReport] = useState<TimeReport[]>([]);
  const [roll, setRoll] = useState('');
  const derived = useMemo(() => (saga ? new Map(chars.map((c) => [c.id, deriveCharacter(c, data, saga.houseRules)])) : new Map<string, DerivedCharacter>()), [chars, data, saga]);
  const dcs = useMemo(() => new Map(covs.map((cov) => [cov.id, deriveCovenant(cov, data, chars)])), [covs, data, chars]);
  if (!saga) return <Empty>Saga not found.</Empty>;
  const S = `/saga/${saga.id}`;
  const { currentYear: year, currentSeason: season } = saga;
  const playing = chars.filter(inPlay);
  // the players' covenant: the one with the most magi, then the most characters in play
  const weight = (c: Covenant) => playing.filter((p) => c.memberIds.includes(p.id)).reduce((t, p) => t + (p.type === 'magus' ? 100 : 1), 0);
  const home = [...covs].sort((a, b) => weight(b) - weight(a))[0];
  const sheet = (c: Character, tab?: string) => `${S}/character/${c.id}${c.creation.finalized ? '' : '/create'}${tab ? `?tab=${tab}` : ''}`;
  const covLink = (cov: Covenant | undefined, tab?: string) => (cov ? `${S}/covenant/${cov.id}${tab ? `?tab=${tab}` : ''}` : S);

  // ---------------------------------------------------------------- what needs attention
  const attention: Attention[] = [];
  for (const cov of covs) {
    const dc = dcs.get(cov.id) as DerivedCovenant;
    const plan = planYearEnd(cov, dc, DEFAULT_YEAR_END);
    const name = cov.name || 'The covenant';
    if (cov.finances.treasury + plan.balance < 0) attention.push({ level: 'bad', text: `${name} runs short by the year's end: ${lsd(cov.finances.treasury)} in the treasury, ${lsd(plan.balance)} for the year.`, to: covLink(cov, 'folk'), go: 'Finances' });
    if (dc.loyalty.score <= -3) attention.push({ level: 'bad', text: `${name}: Prevailing Loyalty ${dc.loyalty.score}, crises of faithfulness come like a Hook.`, to: covLink(cov, 'folk'), go: 'Loyalty' });
    if (onStrike(cov)) attention.push({ level: 'warn', text: `${name}: the covenfolk's guild is on strike; laborers and craftsmen save nothing.`, to: covLink(cov, 'hooks'), go: 'Guild Hook' });
    for (const i of dc.issueList.slice(0, 3)) attention.push({ level: 'warn', text: `${name}: ${i.message}`, to: covLink(cov, 'overview'), go: 'Covenant' });
    if (dc.issueList.length > 3) attention.push({ level: 'info', text: `${name}: ${dc.issueList.length - 3} more to look at.`, to: covLink(cov, 'overview'), go: 'Covenant' });
  }
  for (const c of chars) {
    const d = derived.get(c.id);
    const who = c.name || 'Unnamed';
    if (!c.creation.finalized) {
      attention.push({ level: 'info', text: `${who} is still being made; time does not move them.`, to: sheet(c), go: 'Finish' });
      continue;
    }
    if (c.wounds.dead) continue;
    const w = c.wounds;
    const hurt = [w.light && `${w.light} Light`, w.medium && `${w.medium} Medium`, w.heavy && `${w.heavy} Heavy`, w.incapacitating && `${w.incapacitating} Incapacitating`].filter(Boolean);
    if (hurt.length) attention.push({ level: w.heavy || w.incapacitating ? 'bad' : 'warn', text: `${who}: ${hurt.join(', ')} wound${hurt.length > 1 || (w.light ?? 0) > 1 ? 's' : ''} to recover from.`, to: sheet(c, 'combat'), go: 'Combat & Health' });
    if (c.longTermFatigueLost > 0) attention.push({ level: 'warn', text: `${who}: ${c.longTermFatigueLost} Long-Term Fatigue level${c.longTermFatigueLost > 1 ? 's' : ''} lost.`, to: sheet(c, 'combat'), go: 'Combat & Health' });
    if (c.illnesses?.length) attention.push({ level: 'warn', text: `${who} is ill.`, to: sheet(c, 'combat'), go: 'Illness' });
    if (c.workshop && c.workshop.laborPoints < 0) attention.push({ level: 'warn', text: `${who}'s workshop is short of Labor Points (${c.workshop.laborPoints}).`, to: sheet(c, 'advancement'), go: 'Workshop' });
    if (d) {
      const errs = validateCharacter(d, data, saga.houseRules).filter((i) => i.severity === 'error').length;
      if (errs) attention.push({ level: 'warn', text: `${who}: ${errs} rules problem${errs > 1 ? 's' : ''} on the sheet.`, to: sheet(c, 'rules'), go: 'Rules check' });
      if (!loggedThisSeason(c, year, season).length && resolveStanding(c, d, year).kind === 'none') attention.push({ level: 'info', text: `${who} does nothing this season.`, to: sheet(c, 'advancement'), go: 'Plan' });
    }
  }

  // the Tribunal's approaches waiting for an answer
  const approaches = (saga.tribunalNews ?? []).filter((n) => n.kind === 'approach' && !n.done);
  for (const n of approaches.slice(0, 3)) attention.push({ level: 'warn', text: `${allCovs.find((c) => c.id === n.covenantId)?.name ?? 'The Tribunal'}: ${n.text}`, to: `${S}/tribunal`, go: 'Tribunal' });
  if (approaches.length > 3) attention.push({ level: 'info', text: `${approaches.length - 3} more from the Tribunal.`, to: `${S}/tribunal`, go: 'Tribunal' });

  // ---------------------------------------------------------------- moving time on
  const advance = () => {
    const before = { saga: structuredClone(saga), characters: structuredClone(allChars), covenants: structuredClone(allCovs) };
    const { state, reports } = advanceSeasons(before, data, 1, DEFAULT_ADVANCE);
    putSagaState(state);
    setReport(reports);
    setNotice(`${season} ${year} is over: it is now ${state.saga.currentSeason} ${state.saga.currentYear}.`, () => putSagaState(before));
  };
  // the living covenants' lines are folded apart from the players'
  const all = report.flatMap((r) => r.lines);
  const lines = all.filter((l) => !l.tribunal);
  const tribunalLines = all.filter((l) => l.tribunal);
  const urgent = lines.filter((l) => l.kind === 'crisis' || l.kind === 'warping' || l.kind === 'reminder');
  const living = allCovs.some((c) => c.living);

  return (
    <div className="stack">
      <div className="breadcrumbs">
        <Link to={S}>{saga.name}</Link> ›
      </div>
      <div className="topbar">
        <h1>
          Game table · {season} {year}
        </h1>
        <span className="row tight">
          <button className="primary" onClick={advance} title={`Everyone does what they planned or their standing activity${season === 'Winter' ? '; the year closes: books, aging, Warping' : ''}`} data-tour="table-advance">
            End {season} {year}
          </button>
          <Link className="btn" to={`${S}/seasons`}>
            Seasons page (options, several years)
          </Link>
        </span>
      </div>
      {all.length > 0 && (
        <Card title={`What happened in ${report[0]?.season ?? ''} ${report[0]?.year ?? ''}`.trim()}>
          {urgent.map((l, i) => (
            <div key={i} className="small warn-text">
              <b>{l.who}:</b> {l.text}
            </div>
          ))}
          <details>
            <summary className="small">All {lines.length} lines of the report</summary>
            {lines.map((l, i) => (
              <div key={i} className="small">
                <b>{l.who}:</b> {l.text}
              </div>
            ))}
          </details>
          {tribunalLines.length > 0 && (
            <details>
              <summary className="small">The Tribunal’s living covenants: {tribunalLines.length} lines</summary>
              {tribunalLines.map((l, i) => (
                <div key={i} className="small">
                  <b>{l.who}:</b> {l.text}
                </div>
              ))}
            </details>
          )}
        </Card>
      )}

      <div className="grid grid-2">
        <Card title={`Needs attention${attention.length ? ` (${attention.length})` : ''}`} className="accent" tour="table-attention">
          {attention.length === 0 && <div className="small muted">Nothing: everyone is well, the treasury holds and the rules check is clean.</div>}
          {attention.map((a, i) => (
            <div key={i} className="list-row small">
              <span className={`badge ${a.level === 'bad' ? 'bad' : a.level === 'warn' ? 'warn' : ''}`}>{a.level === 'bad' ? '!' : a.level === 'warn' ? '•' : 'i'}</span>
              <span style={{ flex: '1 1 200px' }}>{a.text}</span>
              <Link to={a.to}>{a.go} →</Link>
            </div>
          ))}
        </Card>

        <Card title="At the table" tour="table-quick">
          <div className="row tight">
            <button className="small" onClick={() => setRoll(`Stress die: ${describeStress(stressDie(1))}`)}>
              Stress die
            </button>
            <button className="small" onClick={() => setRoll(`Simple die: ${simpleDie().value}`)}>
              Simple die
            </button>
            <button className="small" onClick={() => setRoll(`Stress die (no botch): ${describeStress(stressDie(0))}`)}>
              No botch
            </button>
            {roll && <b className="small">{roll}</b>}
          </div>
          <details style={{ marginTop: 6 }}>
            <summary className="small">When something comes up in play: where to go</summary>
            <PlayIndex S={S} home={home} first={playing[0]} sheet={sheet} covLink={covLink} />
          </details>
        </Card>
      </div>

      <Card title={`This season: ${season} ${year}`} tour="table-season">
        <p className="small muted" style={{ marginTop: 0 }}>
          What each character will do this season: what is planned on their sheet, or else their usual activity, which you can change here. A particular book, teacher or lab
          project is planned on their sheet.
        </p>
        {playing.length === 0 && <Empty>No finished characters yet.</Empty>}
        {playing.map((c) => {
          const d = derived.get(c.id);
          if (!d) return null;
          const logged = loggedThisSeason(c, year, season);
          const cov = covenantOf(c, covs);
          return (
            <div key={c.id} className="list-row" style={{ flexWrap: 'wrap' }}>
              <Link to={sheet(c)} style={{ minWidth: 120 }}>
                <b>{c.name || 'Unnamed'}</b>
              </Link>
              <span className="badge">{c.type}</span>
              {logged.length ? (
                <span className="small">{logged.map((e) => e.summary).join('; ')}</span>
              ) : (
                <StandingEditor c={c} d={d} year={year} teachers={cov?.specialists.filter((s) => teaches(s)) ?? []} library={cov?.library} onChange={(s) => updateCharacter(c.id, (x) => void (x.standing = s))} />
              )}
              <span className="row tight small" style={{ marginLeft: 'auto' }}>
                <Link to={sheet(c, 'advancement')}>Plan</Link>
                <Link to={sheet(c, 'combat')}>Health</Link>
                {d.isMagus && <Link to={sheet(c, 'magic')}>Cast</Link>}
                {d.isMagus && <Link to={sheet(c, 'lab')}>Lab</Link>}
              </span>
              {!logged.length && (c.standing?.kind ?? 'auto') !== 'auto' && <div className="small muted" style={{ flexBasis: '100%' }}>→ {describeStanding(c, d, resolveStanding(c, d, year))}</div>}
            </div>
          );
        })}
      </Card>

      {[...covs].sort((a, b) => weight(b) - weight(a)).map((cov) => (
        <CovenantGlance key={cov.id} cov={cov} dc={dcs.get(cov.id) as DerivedCovenant} covLink={covLink} S={S} />
      ))}

      {(living || tribunalBook(saga.tribunal)) && <NewsCard saga={saga} covs={allCovs} chars={allChars} compact />}

      {covs.length > 0 && <QuickChanges covs={covs} home={home} year={year} season={season} />}

      {playing.length > 0 && <AfterStoryCard people={playing} derived={derived} year={year} season={season} />}

      {playing.length > 0 && <TravelTradeCard people={playing} derived={derived} home={home} year={year} season={season} />}
    </div>
  );
}

/** A covenant at a glance: money, the year ahead, loyalty, vis, people; the detail a click away. */
function CovenantGlance({ cov, dc, covLink, S }: { cov: Covenant; dc: DerivedCovenant; covLink: (c: Covenant, tab?: string) => string; S: string }) {
  const plan = planYearEnd(cov, dc, DEFAULT_YEAR_END);
  const f = dc.finances;
  return (
    <Card title={cov.name || 'Covenant'} tour="table-covenant">
      <div className="row">
        <div className="stat">
          <span className="v">{lsd(cov.finances.treasury)}</span>
          <span className="l">Treasury</span>
        </div>
        <div className="stat">
          <span className={`v ${plan.balance < 0 ? 'warn-text' : ''}`}>{lsd(plan.balance)}</span>
          <span className="l">This year</span>
        </div>
        <div className="stat">
          <span className="v">{dc.loyalty.score}</span>
          <span className="l">Loyalty</span>
        </div>
        <div className="stat">
          <span className="v">{cov.visStocks.reduce((t, v) => t + v.pawns, 0)}</span>
          <span className="l">Pawns of vis</span>
        </div>
        <div className="stat">
          <span className="v">{f.inhabitantPoints}</span>
          <span className="l">Inhabitant points</span>
        </div>
      </div>
      <div className="row tight small" style={{ marginTop: 6 }}>
        <Link to={covLink(cov, 'overview')}>Overview</Link>
        <Link to={covLink(cov, 'folk')}>Covenfolk & finances</Link>
        <Link to={covLink(cov, 'library')}>Library & vis</Link>
        <Link to={covLink(cov, 'labs')}>Labs</Link>
        <Link to={covLink(cov, 'items')}>Items</Link>
        <Link to={`${S}/market`}>Buy something</Link>
      </div>
      <details style={{ marginTop: 6 }}>
        <summary className="small">The year's accounts, loyalty and stocks</summary>
        <div className="small">
          {plan.lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
          <div style={{ marginTop: 4 }}>
            <b>Loyalty {dc.loyalty.score}:</b> {loyaltyAttitude(dc.loyalty.score)}
          </div>
          <div style={{ marginTop: 4 }}>
            <b>Vis:</b> {cov.visStocks.length ? visText(cov.visStocks) : 'none'}; sources {cov.visSources.map((s) => `${s.name} (${s.pawnsPerYear})`).join(', ') || 'none'}
          </div>
          <div style={{ marginTop: 4 }}>
            <b>Library:</b> {cov.library.length} books{cov.scriptorium?.length ? `; ${cov.scriptorium.length} being copied` : ''}
            {cov.library.some((b) => b.clarifying) ? `; ${cov.library.filter((b) => b.clarifying).length} being clarified` : ''}
          </div>
        </div>
      </details>
    </Card>
  );
}

/** What comes up during a session, and where in the toolkit it is done. */
function PlayIndex({ S, home, first, sheet, covLink }: { S: string; home?: Covenant; first?: Character; sheet: (c: Character, tab?: string) => string; covLink: (c: Covenant | undefined, tab?: string) => string }) {
  const charTab = (tab: string) => (first ? sheet(first, tab) : S);
  const rows: { label: string; hint: string; to: string }[] = [
    { label: 'A fight, a wound, a disease', hint: 'Combat & Health on the character’s sheet: attacks, Soak, wounds, Fatigue, recovery, illness.', to: charTab('combat') },
    { label: 'A spell is cast', hint: 'Magic on the magus’s sheet: Casting Scores, Penetration, botch dice, Fatigue; vis to boost it.', to: charTab('magic') },
    { label: 'A spell is looked up or designed on the spot', hint: 'Spells & design: every spell, and the guidelines to build one.', to: `${S}/spells` },
    { label: 'Someone buys, sells, hires or haggles', hint: 'Market & treasury: price lists, vis for silver, books, covenfolk, teachers, haggling and bribes.', to: `${S}/market` },
    { label: 'Vis or a vis source is found', hint: 'The covenant’s Library & Vis tab: stocks, sources found in play (no Build Points).', to: covLink(home, 'library') },
    { label: 'The covenfolk are pleased or wronged', hint: 'Loyalty events on Covenfolk & finances: celebrations, punishments, wounds by magic, hardship.', to: covLink(home, 'folk') },
    { label: 'A grog is rewarded or punished, a watch is set', hint: 'The turb’s day, on Covenfolk & finances: watches, sentries, drill, rewards and punishments, retirement.', to: covLink(home, 'folk') },
    { label: 'A spell is cast on the whole covenant', hint: 'The covenant’s Overview: cast a spell, ritual or power on everyone at once.', to: covLink(home, 'overview') },
    { label: 'A book is read, written or copied', hint: 'Seasons & Aging on the sheet: plan a season of study; Writing and copying for books, copies and lab texts.', to: charTab('advancement') },
    { label: 'A craftsman earns from a story, invests, or works', hint: 'Seasons & Aging → Workshop (City & Guild): Labor Points, stories and investments, the guild.', to: charTab('advancement') },
    { label: 'A journey, a bribe, a crime, a rumor about a noble', hint: 'Travel, trade and intrigue, below on this page: days and cost of a journey, Area Lore, ships in a fight, bribes, hired criminals, sabotage, intrigue, largesse, a dowry.', to: '#travel-trade' },
    { label: 'An item may break', hint: 'Dice → Item stress check (City & Guild): damage levels, the check against 15, repair.', to: '/dice' },
    { label: 'Experience after a story', hint: 'After a story, below on this page: Adventure experience for everyone, and Labor Points for craftsmen and merchants. Reputations and Confidence are on the sheet.', to: '#after-story' },
    { label: 'Another covenant, a Redcap, the next Tribunal', hint: 'The Tribunal: its living covenants and their magi, what they have brought to your covenant, the coming gatherings, and the Great Library.', to: `${S}/tribunal` },
    { label: 'A rule is in question', hint: 'Game mechanics: every rule in the reviewed books, with the book’s text a click away.', to: '/mechanics' },
  ];
  return (
    <div className="small">
      {rows.map((r) => (
        <div key={r.label} className="list-row" title={r.hint}>
          <span style={{ flex: '1 1 180px' }}>
            {r.label}
            <div className="muted">{r.hint}</div>
          </span>
          {r.to.startsWith('#') ? (
            <button className="small ghost" onClick={() => document.getElementById(r.to.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              Go ↓
            </button>
          ) : (
            <Link to={r.to}>Go →</Link>
          )}
        </div>
      ))}
    </div>
  );
}

/** Changes that come up at the table, made here: a Loyalty event, money in or out of the treasury, vis found. */
function QuickChanges({ covs, home, year, season }: { covs: Covenant[]; home?: Covenant; year: number; season: Covenant['log'][number]['season'] }) {
  const updateCovenant = useStore((s) => s.updateCovenant);
  const [covId, setCovId] = useState(home?.id ?? covs[0].id);
  const [pounds, setPounds] = useState(0);
  const [why, setWhy] = useState('');
  const [art, setArt] = useState<Art>('Vi');
  const [pawns, setPawns] = useState(1);
  const cov = covs.find((c) => c.id === covId) ?? covs[0];
  const update = (fn: (c: Covenant) => void) => updateCovenant(cov.id, fn);
  const money = (sign: 1 | -1) =>
    update((x) => {
      const d = sign * Math.abs(pounds);
      x.finances.treasury = Math.round((x.finances.treasury + d) * 1000) / 1000;
      x.log.push({ uid: uid(), year, season, text: `${d > 0 ? 'Received' : 'Spent'} ${lsd(Math.abs(d))}${why ? `: ${why}` : ''}.`, treasuryDelta: d });
    });
  const vis = () =>
    update((x) => {
      addVis(x.visStocks, art, pawns);
      x.log.push({ uid: uid(), year, season, text: `Vis found: ${pawns} pawn${pawns > 1 ? 's' : ''} of ${ART_NAMES[art]}${why ? ` (${why})` : ''}.`, visDelta: [{ art, pawns }] });
    });
  return (
    <Card title="Quick changes" tour="table-changes">
      {covs.length > 1 && (
        <div className="row small">
          <Field label="Covenant">
            <select value={cov.id} onChange={(e) => setCovId(e.target.value)}>
              {covs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || 'Covenant'}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
      <LoyaltyEvent cov={cov} update={update} />
      <div className="row small" style={{ marginTop: 6, alignItems: 'flex-end' }}>
        <Field label="Pounds">
          <Stepper value={pounds} min={0} step={1} width={50} onChange={setPounds} />
        </Field>
        <Field label="What for (optional)">
          <input value={why} onChange={(e) => setWhy(e.target.value)} style={{ width: 160 }} />
        </Field>
        <button className="small" disabled={!pounds} onClick={() => money(1)}>
          Into the treasury
        </button>
        <button className="small" disabled={!pounds} onClick={() => money(-1)}>
          Out of the treasury
        </button>
        <span className="muted">now {lsd(cov.finances.treasury)}</span>
      </div>
      <div className="row small" style={{ marginTop: 6, alignItems: 'flex-end' }}>
        <Field label="Vis found">
          <select value={art} onChange={(e) => setArt(e.target.value as Art)}>
            {ARTS.map((a) => (
              <option key={a} value={a}>
                {ART_NAMES[a]}
              </option>
            ))}
          </select>
        </Field>
        <Stepper value={pawns} min={1} max={99} width={34} onChange={setPawns} />
        <button className="small" onClick={vis}>
          Add to the stocks
        </button>
        <span className="muted">Found, won or given in play: no Build Points. A vis source is added on the Library &amp; Vis tab.</span>
      </div>
    </Card>
  );
}
