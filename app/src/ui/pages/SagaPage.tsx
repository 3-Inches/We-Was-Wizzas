// The Saga Overview: everything set for the saga as a whole, in tabs. The saga itself (its name,
// Tribunal, when it began, the guided build's settings), its books, optional rules, the troupe's
// creation numbers and rulings, its own content, overrides of a Virtue's or Flaw's mechanics, and its
// journal. Play happens on the Game Table; characters and covenants have their own pages.

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore, exportSaga } from '../../store/store';
import { usePlayerCharacters, usePlayerCovenants, useSaga, useSagaCovenants } from '../../store/hooks';
import { sagaStart } from '../../engine/time';
import type { Saga } from '../../engine/types';
import { SEASONS } from '../../data';
import { TRIBUNALS } from '../../data/lists';
import { Card, Empty, Field, SelectOrType, Stepper, Tabs } from '../kit';
import { downloadJson, isBundle, pickJsonFile, safeFilename } from '../../util/files';
import { uid } from '../../util/id';
import { OptionalRulesPanel, SagaOptionsCard } from '../OptionalRules';
import { BooksTab, CustomTab, GuidedSettingsCard, MechanicsTab, RulesTab } from './SagaRules';
import { useTabParam } from '../useTabParam';
import { Hint } from '../Hint';
import { R, SAGA_TABS, type SagaTab } from '../routes';

const TAB_LABEL: Record<SagaTab, string> = {
  saga: 'Saga',
  books: 'Books',
  optional: 'Optional rules',
  rules: 'Creation rules & rulings',
  custom: 'Custom content',
  mechanics: 'Virtue/Flaw mechanics',
  journal: 'Journal',
};

export default function SagaPage() {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const updateSaga = useStore((s) => s.updateSaga);
  const setActive = useStore((s) => s.setActiveSaga);
  const [tab, setTab] = useTabParam<SagaTab>('saga');
  useEffect(() => {
    if (sagaId) setActive(sagaId);
  }, [sagaId, setActive]);
  if (!saga) return <Empty>Saga not found. <Link to="/">Back</Link></Empty>;
  const update = (fn: (s: Saga) => void) => updateSaga(saga.id, fn);
  const t = (SAGA_TABS as readonly string[]).includes(tab) ? tab : 'saga';
  return (
    <div className="stack">
      <div className="breadcrumbs">
        <Link to="/">Sagas</Link> ›
      </div>
      <div className="topbar">
        <h1>{saga.name}</h1>
        <SagaFiles saga={saga} />
      </div>
      <Hint id="saga-next">A saga holds everything else. Set its Tribunal and when it begins here, its books and optional rules in the tabs, then found the covenant (Covenants) and create the characters (People).</Hint>
      <Tabs tabs={SAGA_TABS.map((id) => ({ id, label: id === 'books' ? `Books (${saga.enabledBooks.length ? saga.enabledBooks.length : 'all'})` : TAB_LABEL[id] }))} value={t} onChange={setTab} />
      {t === 'saga' && <SagaSettings saga={saga} update={update} />}
      {t === 'books' && <BooksTab saga={saga} update={update} />}
      {t === 'optional' && (
        <Card title="Optional rules" tour="optional-rules">
          <p className="small muted" style={{ marginTop: 0 }}>
            Rules from the supplements that add detail. Turn off what your troupe does not want and it disappears from the sheets and pages.
          </p>
          <OptionalRulesPanel saga={saga} />
        </Card>
      )}
      {t === 'rules' && <RulesTab saga={saga} update={update} />}
      {t === 'custom' && <CustomTab saga={saga} update={update} />}
      {t === 'mechanics' && <MechanicsTab saga={saga} update={update} />}
      {t === 'journal' && <Journal saga={saga} update={update} />}
    </div>
  );
}

/** Exporting the saga, and bringing a player's character or a covenant into it. */
function SagaFiles({ saga }: { saga: Saga }) {
  const importBundle = useStore((s) => s.importBundle);
  const [msg, setMsg] = useState('');
  return (
    <span className="row tight">
      <button onClick={() => downloadJson(`${safeFilename(saga.name)}.arm5saga.json`, exportSaga(saga.id))} data-tour="saga-export">
        Export saga
      </button>
      <button
        title="A player's finished character, or a covenant, from a file the toolkit exported"
        onClick={async () => {
          try {
            const b = await pickJsonFile();
            if (!isBundle(b)) throw new Error('that file is not one the toolkit exported (a saga, character or covenant)');
            const r = importBundle({ ...b, saga: undefined }, { intoSagaId: saga.id });
            setMsg(`Imported ${r.characters} character(s), ${r.covenants} covenant(s) into this saga.`);
          } catch (e) {
            setMsg(`Import failed: ${(e as Error).message}`);
          }
        }}
      >
        Import character / covenant…
      </button>
      {msg && <span className="small">{msg}</span>}
    </span>
  );
}

/** The saga itself: its name, Tribunal, description, when it began, the guided build's settings, and what it holds. */
function SagaSettings({ saga, update }: { saga: Saga; update: (fn: (s: Saga) => void) => void }) {
  const chars = usePlayerCharacters(saga.id);
  const covs = usePlayerCovenants(saga.id);
  const living = useSagaCovenants(saga.id).filter((c) => c.living);
  const start = sagaStart(saga);
  // before play the start is set here and the clock with it; once a season has passed it is fixed
  const setStart = (year: number, season: Saga['currentSeason']) =>
    update((s) => {
      s.startYear = year;
      s.startSeason = season;
      s.currentYear = year;
      s.currentSeason = season;
    });
  return (
    <div className="grid grid-2">
      <Card title="The saga" className="accent" tour="saga-card">
        <Field label="Saga name">
          <input value={saga.name} onChange={(e) => update((s) => void (s.name = e.target.value))} />
        </Field>
        <Field label="Tribunal" hint="Region-specific Virtues and Flaws in the guided build follow it.">
          <SelectOrType value={saga.tribunal} options={TRIBUNALS} placeholder="— Tribunal —" otherLabel="Other (your own Tribunal)…" ariaLabel="Tribunal" onChange={(v) => update((s) => void (s.tribunal = v))} />
        </Field>
        <SagaOptionsCard saga={saga} />
        {start.begun ? (
          <p className="small" style={{ margin: '8px 0 0' }} data-tour="saga-start">
            Began in <b>{start.season} {start.year}</b>. It is now <b>{saga.currentSeason} {saga.currentYear}</b>; time moves on the Game Table&apos;s{' '}
            <Link to={R.seasons(saga.id)}>Seasons</Link> page.
          </p>
        ) : (
          <div className="row" data-tour="saga-start">
            <Field label="Starting year">
              <Stepper value={start.year} onChange={(v) => setStart(v, start.season)} min={500} max={2000} width={64} />
            </Field>
            <Field label="Starting season">
              <select value={start.season} onChange={(e) => setStart(start.year, e.target.value as Saga['currentSeason'])}>
                {SEASONS.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <span className="small muted">The saga begins here; once the first season passes on the Game Table&apos;s Seasons page, the start is fixed and the current season moves on.</span>
          </div>
        )}
        <Field label="Description">
          <textarea rows={4} value={saga.description} onChange={(e) => update((s) => void (s.description = e.target.value))} />
        </Field>
      </Card>
      <Card title="What the saga holds">
        <div className="list-row">
          <span style={{ flex: 1 }}>
            {chars.length} character{chars.length === 1 ? '' : 's'}
            {chars.some((c) => !c.creation.finalized) ? ` (${chars.filter((c) => !c.creation.finalized).length} in creation)` : ''}
          </span>
          <Link to={R.people(saga.id)}>People ›</Link>
        </div>
        <div className="list-row">
          <span style={{ flex: 1 }}>
            {covs.length} covenant{covs.length === 1 ? '' : 's'}
          </span>
          <Link to={R.covenants(saga.id)}>Covenants ›</Link>
        </div>
        <div className="list-row">
          <span style={{ flex: 1 }}>{living.length ? `${living.length} living covenants of the ${saga.tribunal} Tribunal` : `The ${saga.tribunal || 'saga’s'} Tribunal`}</span>
          <Link to={R.tribunal(saga.id)}>The Tribunal ›</Link>
        </div>
        <div className="list-row">
          <span style={{ flex: 1 }}>
            {saga.currentSeason} {saga.currentYear}: play, seasons, dice and the market
          </span>
          <Link className="btn primary" to={R.table(saga.id)}>
            Game Table ›
          </Link>
        </div>
      </Card>
      <GuidedSettingsCard saga={saga} update={update} />
    </div>
  );
}

/** The saga's journal: what happened, by season. */
function Journal({ saga, update }: { saga: Saga; update: (fn: (s: Saga) => void) => void }) {
  const [text, setText] = useState('');
  return (
    <Card title="Saga journal" className="accent" id="journal">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`What happened in ${saga.currentSeason} ${saga.currentYear}?`} style={{ flex: 1 }} />
        <button
          onClick={() => {
            if (!text.trim()) return;
            update((s) => void s.journal.unshift({ id: uid(), year: s.currentYear, season: s.currentSeason, title: text.split('\n')[0].slice(0, 80), text, characterIds: [] }));
            setText('');
          }}
        >
          Add entry
        </button>
      </div>
      {saga.journal.length === 0 && <Empty>Nothing written yet.</Empty>}
      {saga.journal.map((j) => (
        <div key={j.id} className="list-row" style={{ alignItems: 'flex-start' }}>
          <span className="badge">
            {j.season} {j.year}
          </span>
          <div style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{j.text}</div>
          <button className="small ghost" onClick={() => update((s) => void (s.journal = s.journal.filter((x) => x.id !== j.id)))}>
            ✕
          </button>
        </div>
      ))}
    </Card>
  );
}
