import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BASE_COVENANTS, POWER_LEVELS } from '../../engine/covenant';
import type { Covenant } from '../../engine/types';
import { exportCovenant, useStore } from '../../store/store';
import { useDerivedCovenant, useGameData, useSaga, useSagaCharacters } from '../../store/hooks';
import { bundleToShareLink, downloadJson, safeFilename } from '../../util/files';
import { uid } from '../../util/id';
import { Card, Empty, Field, Meter, Stepper, Tabs } from '../kit';
import ItemsEditor from '../items/ItemEditor';
import HooksTab from './HooksTab';
import LibraryTab from './LibraryTab';
import LabsTab from './LabsTab';
import FinancesTab from './FinancesTab';
import type { CovTabProps } from './shared';

type TabId = 'overview' | 'hooks' | 'library' | 'labs' | 'folk' | 'items' | 'log';

export default function CovenantPage() {
  const { sagaId, covId } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as TabId) || 'overview';
  const setTab = (t: TabId) => setParams({ tab: t }, { replace: true });
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  const cov = useStore((s) => (covId ? s.covenants[covId] : undefined));
  const updateCovenant = useStore((s) => s.updateCovenant);
  const deleteCovenant = useStore((s) => s.deleteCovenant);
  const dc = useDerivedCovenant(cov, data);
  const nav = useNavigate();
  const [share, setShare] = useState('');
  if (!cov || !saga || !dc) return <Empty>Covenant not found.</Empty>;
  const update = (fn: (c: Covenant) => void) => updateCovenant(cov.id, fn);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview & Build Points' },
    { id: 'hooks', label: `Hooks & Boons (${dc.boonPoints}/${dc.hookPoints})` },
    { id: 'library', label: 'Library & Vis' },
    { id: 'labs', label: `Laboratories (${cov.labs.length})` },
    { id: 'folk', label: 'Covenfolk, Finances & Loyalty' },
    { id: 'items', label: `Enchanted items (${cov.items.length})` },
    { id: 'log', label: 'Chronicle' },
  ];

  return (
    <div>
      <div className="breadcrumbs no-print">
        <Link to="/">Sagas</Link> › <Link to={`/saga/${saga.id}`}>{saga.name}</Link> ›
      </div>
      <div className="topbar">
        <h1>
          {cov.name || 'Unnamed covenant'} <span className="badge">{cov.season}</span> <span className="badge">{cov.powerLevel}</span>
        </h1>
        <div className="row no-print">
          <button onClick={() => downloadJson(`${safeFilename(cov.name)}.arm5cov.json`, exportCovenant(cov.id))}>Export</button>
          <button onClick={() => setShare(bundleToShareLink(exportCovenant(cov.id)))}>Share link</button>
          <button onClick={() => window.print()}>Print</button>
          <button
            className="danger"
            onClick={() => {
              if (window.confirm(`Delete ${cov.name || 'this covenant'}? Characters are kept.`)) {
                deleteCovenant(cov.id);
                nav(`/saga/${saga.id}`);
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>
      {share && (
        <Card title="Share this covenant" actions={<button className="small ghost" onClick={() => setShare('')}>✕</button>}>
          <div className="row">
            <input readOnly value={share} style={{ flex: 1 }} onFocus={(e) => e.target.select()} />
            <button onClick={() => navigator.clipboard?.writeText(share)}>Copy</button>
          </div>
          <p className="small muted">{share.length.toLocaleString()} characters. For big covenants use Export and send the file.</p>
        </Card>
      )}
      <div className="row" style={{ marginBottom: 10 }}>
        <div style={{ flex: '1 1 300px' }}>
          <Meter label="Build Points spent" value={dc.bpSpent} max={cov.buildPoints} />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <Meter label="Boon points vs Hook points" value={dc.boonPoints} max={dc.hookPoints} />
        </div>
        <span className="badge">Aura {dc.aura} ({cov.auraRealm})</span>
        <span className={`badge ${dc.finances.balance < 0 ? 'bad' : 'good'}`}>
          {dc.finances.balance >= 0 ? '+' : ''}
          {dc.finances.balance} £/year
        </span>
        <span className="badge">Loyalty {dc.loyalty.score}</span>
        {dc.issues.length > 0 && <span className="badge warn">{dc.issues.length} issue(s)</span>}
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'overview' && <OverviewTab cov={cov} update={update} dc={dc} sagaId={saga.id} />}
      {tab === 'hooks' && <HooksTab cov={cov} update={update} dc={dc} data={data} />}
      {tab === 'library' && <LibraryTab cov={cov} update={update} dc={dc} data={data} />}
      {tab === 'labs' && <LabsTab cov={cov} update={update} dc={dc} data={data} />}
      {tab === 'folk' && <FinancesTab cov={cov} update={update} dc={dc} data={data} />}
      {tab === 'items' && (
        <>
          <ItemsEditor items={cov.items} onChange={(fn) => update((x) => fn(x.items))} data={data} title="Covenant enchanted items" />
          <p className="small muted">
            Enchanted items cost 2 Build Points per 5 levels of effects (DE p.180). No single effect may exceed level {dc.powerLevel.maxItemLevel === Infinity ? '—' : dc.powerLevel.maxItemLevel} at the{' '}
            {dc.powerLevel.level} power level.
          </p>
        </>
      )}
      {tab === 'log' && <LogTab cov={cov} update={update} />}
    </div>
  );
}

type TabProps = Omit<CovTabProps, 'data'>;

function OverviewTab({ cov, update, dc, sagaId }: TabProps & { sagaId: string }) {
  const chars = useSagaCharacters(sagaId);
  const updateCharacter = useStore((s) => s.updateCharacter);
  const byCat = new Map<string, number>();
  for (const l of dc.bpLines) byCat.set(l.category, (byCat.get(l.category) ?? 0) + l.cost);
  const toggleMember = (id: string, on: boolean) => {
    update((x) => void (x.memberIds = on ? [...new Set([...x.memberIds, id])] : x.memberIds.filter((m) => m !== id)));
    updateCharacter(id, (c) => void (c.covenantId = on ? cov.id : c.covenantId === cov.id ? undefined : c.covenantId));
  };
  const applyBase = (k: keyof typeof BASE_COVENANTS) => {
    const b = BASE_COVENANTS[k];
    if (!window.confirm(`Apply the DE "${k}" covenant package? This sets Build Points to ${b.buildPoints} and adds its generic library, lab texts and vis (subjects to be chosen).`)) return;
    update((x) => {
      x.buildPoints = b.buildPoints;
      x.powerLevel = b.power;
      for (const bk of b.library) {
        const isAbility = bk.kind === 'abilitySumma';
        x.library.push({
          uid: uid(), title: `${isAbility ? 'Ability summa' : bk.kind === 'summa' ? 'Art summa' : 'Tractatus'} (choose subject)`, kind: isAbility ? 'summa' : (bk.kind as 'summa' | 'tractatus'),
          subjectType: isAbility ? 'ability' : 'art', subject: isAbility ? '' : 'Cr', level: 'level' in bk ? (bk.level as number) : 0, quality: bk.quality, language: 'Latin',
        });
      }
      if (b.labTextLevels) x.library.push({ uid: uid(), title: `Lab texts (${b.labTextLevels} levels, max ${b.maxLabText === Infinity ? 'any' : b.maxLabText})`, kind: 'labText', subjectType: 'other', subject: 'various', level: b.labTextLevels, quality: 0, language: 'Latin' });
      if (b.visPerYear) x.visSources.push({ uid: uid(), name: 'Vis sources (to detail)', art: 'Vi', pawnsPerYear: b.visPerYear });
      if (b.visStock) x.visStocks.push({ art: 'Vi', pawns: b.visStock });
    });
  };
  return (
    <div className="stack">
      <div className="grid grid-2">
        <Card title="The covenant" className="accent">
          <div className="grid grid-2">
            <Field label="Name">
              <input value={cov.name} onChange={(e) => update((x) => void (x.name = e.target.value))} />
            </Field>
            <Field label="Tribunal">
              <input value={cov.tribunal} onChange={(e) => update((x) => void (x.tribunal = e.target.value))} placeholder="e.g. Stonehenge" />
            </Field>
            <Field label="Season" hint="Affects inhabitant points and living conditions">
              <select value={cov.season} onChange={(e) => update((x) => void (x.season = e.target.value as Covenant['season']))}>
                {['Spring', 'Summer', 'Autumn', 'Winter'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Founded (year)">
              <Stepper value={cov.foundedYear} width={60} onChange={(v) => update((x) => void (x.foundedYear = v))} />
            </Field>
            <Field label="Base aura" hint="DE default 3; each Minor Aura Boon adds +1">
              <div className="row tight">
                <Stepper value={cov.aura} min={0} max={10} width={36} onChange={(v) => update((x) => void (x.aura = v))} />
                <select value={cov.auraRealm} onChange={(e) => update((x) => void (x.auraRealm = e.target.value as Covenant['auraRealm']))}>
                  {['Magic', 'Faerie', 'Divine', 'Infernal'].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="Power level">
              <select value={cov.powerLevel} onChange={(e) => update((x) => void (x.powerLevel = e.target.value as Covenant['powerLevel']))}>
                {POWER_LEVELS.map((p) => (
                  <option key={p.level} value={p.level}>
                    {p.level} ({p.min}–{p.max === Infinity ? '∞' : p.max} BP)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Build Points">
              <Stepper value={cov.buildPoints} min={0} step={50} width={60} onChange={(v) => update((x) => void (x.buildPoints = v))} />
            </Field>
          </div>
          <Field label="Description">
            <textarea rows={4} value={cov.description} onChange={(e) => update((x) => void (x.description = e.target.value))} />
          </Field>
          <div className="row small" style={{ marginTop: 8 }}>
            Quick start with a DE base package:
            {(Object.keys(BASE_COVENANTS) as (keyof typeof BASE_COVENANTS)[]).map((k) => (
              <button key={k} className="small" onClick={() => applyBase(k)}>
                {k}
              </button>
            ))}
          </div>
        </Card>
        <Card title="Build Points">
          <table className="compact">
            <tbody>
              {[...byCat.entries()].map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td className="num">{v}</td>
                </tr>
              ))}
              <tr>
                <td>
                  <b>Total spent</b>
                </td>
                <td className={`num ${dc.bpSpent > cov.buildPoints ? 'bad-text' : ''}`}>
                  <b>
                    {dc.bpSpent} / {cov.buildPoints}
                  </b>
                </td>
              </tr>
              {dc.hiddenResourcesBP > 0 && (
                <tr>
                  <td>Hidden Resources (not yet available)</td>
                  <td className="num">{dc.hiddenResourcesBP}</td>
                </tr>
              )}
            </tbody>
          </table>
          <h4>Rules check</h4>
          {dc.issues.length === 0 ? (
            <div className="small good-text">No problems found.</div>
          ) : (
            dc.issues.map((i, k) => (
              <div key={k} className="issue warning">
                <span className="badge warn">check</span>
                <div className="msg">{i}</div>
              </div>
            ))
          )}
          <p className="small muted">
            Costs (DE p.178–180): Art summa level + quality; Ability summa quality + 3 × level; tractatus = quality; lab texts 1 BP / 5 levels; casting tablets 2 BP / 5 levels; vis
            sources 5 BP per pawn per year; vis stocks 1 BP per 5 pawns; items 2 BP / 5 levels; specialists = score (teachers: + Com + Teaching); labs 20 × Size, Virtues 10/20.
          </p>
        </Card>
      </div>
      <Card title="Members">
        {chars.length === 0 && <div className="small muted">No characters in this saga yet.</div>}
        <div className="grid grid-3">
          {chars.map((c) => {
            const on = cov.memberIds.includes(c.id);
            return (
              <label key={c.id} className="inline">
                <input type="checkbox" checked={on} onChange={(e) => toggleMember(c.id, e.target.checked)} />
                <Link to={`/saga/${sagaId}/character/${c.id}`}>{c.name || '(unnamed)'}</Link> <span className="badge">{c.type}</span>
                {on && c.type === 'magus' && !cov.labs.some((l) => l.ownerId === c.id) && <span className="badge warn">no lab</span>}
              </label>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function LogTab({ cov, update }: { cov: Covenant; update: (fn: (c: Covenant) => void) => void }) {
  const [text, setText] = useState('');
  const [year, setYear] = useState(cov.foundedYear);
  return (
    <div className="stack">
      <Card title="Chronicle">
        <div className="row">
          <Stepper value={year} width={60} onChange={setYear} />
          <input style={{ flex: 1 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="What happened?" />
          <button
            disabled={!text}
            onClick={() => {
              update((x) => void x.log.push({ uid: uid(), year, text }));
              setText('');
            }}
          >
            Add
          </button>
        </div>
        {cov.log
          .slice()
          .sort((a, b) => b.year - a.year)
          .map((l) => (
            <div key={l.uid} className="list-row">
              <span className="badge">
                {l.season ? `${l.season} ` : ''}
                {l.year}
              </span>
              <span style={{ flex: 1 }}>{l.text}</span>
              {l.treasuryDelta !== undefined && <span className="small muted">{l.treasuryDelta >= 0 ? '+' : ''}{l.treasuryDelta} £</span>}
              <button className="small ghost" onClick={() => update((x) => void (x.log = x.log.filter((y) => y.uid !== l.uid)))}>
                ✕
              </button>
            </div>
          ))}
      </Card>
      <Card title="Notes">
        <textarea rows={8} value={cov.notes} onChange={(e) => update((x) => void (x.notes = e.target.value))} />
      </Card>
    </div>
  );
}

