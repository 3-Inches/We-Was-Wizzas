// The Saga Overview: everything set for the saga as a whole, in tabs. The saga itself (its name,
// Tribunal, when it began, the guided build's settings), its books, optional rules, the troupe's
// creation numbers and rulings, its own content, overrides of a Virtue's or Flaw's mechanics, and its
// journal. Play happens on the Game Table; characters and covenants have their own pages.

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore, exportCharacters, exportSaga, exportSagaRules } from '../../store/store';
import { useGameData, usePlayerCharacters, usePlayerCovenants, useSaga, useSagaCovenants } from '../../store/hooks';
import { troupeOf, type CharacterStanding, type TroupePlayer } from '../../engine/troupe';
import { sagaStart } from '../../engine/time';
import type { Saga } from '../../engine/types';
import { SEASONS } from '../../data';
import { TRIBUNALS } from '../../data/lists';
import { Card, Empty, Field, SelectOrType, Stepper, Tabs } from '../kit';
import { bundleToShareLink, downloadJson, isBundle, pickJsonFile, safeFilename, setPendingImport } from '../../util/files';
import ShareCard from '../ShareCard';
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
  const [invite, setInvite] = useState('');
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
        <SagaFiles saga={saga} onInvite={() => setInvite(bundleToShareLink(exportSagaRules(saga.id)))} />
      </div>
      {invite && (
        <ShareCard title="Invite players: the saga's rules" link={invite} onClose={() => setInvite('')} onDownload={() => downloadJson(`${safeFilename(saga.name)}.arm5rules.json`, exportSagaRules(saga.id))}>
          <p className="small">
            Send this to each player. It holds the saga's books, creation rules and rulings, optional rules and custom content, so the character they build on their own is built under the same rules.
            It holds <b>none</b> of the saga's characters, covenants, journal or Tribunal. Changed a rule later? Send it again: their copy of the saga takes the change and keeps their characters.
          </p>
          <p className="small soft">When a character comes back, open the link or use <b>Import character / covenant…</b> above.</p>
        </ShareCard>
      )}
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

/** Exporting the saga, sending its rules to the players, and bringing a player's character or a covenant into it. */
function SagaFiles({ saga, onInvite }: { saga: Saga; onInvite: () => void }) {
  const nav = useNavigate();
  const [msg, setMsg] = useState('');
  return (
    <span className="row tight">
      <button onClick={onInvite} data-tour="saga-invite" title="Send your players the saga's books and rules, so the characters they build on their own fit it">
        Invite players
      </button>
      <button
        title="A player's character, or a covenant, from a file the toolkit exported"
        data-tour="saga-import"
        onClick={async () => {
          try {
            const b = await pickJsonFile();
            if (!isBundle(b)) throw new Error('that file is not one the toolkit exported (a saga, character or covenant)');
            setPendingImport(b);
            nav(`/import?into=${saga.id}`);
          } catch (e) {
            setMsg(`Import failed: ${(e as Error).message}`);
          }
        }}
      >
        Import character / covenant…
      </button>
      <button onClick={() => downloadJson(`${safeFilename(saga.name)}.arm5saga.json`, exportSaga(saga.id))} data-tour="saga-export" title="The whole saga as a file: a backup, or to move it to another browser">
        Export saga
      </button>
      {msg && <span className="small">{msg}</span>}
    </span>
  );
}

const STANDING: Record<CharacterStanding, { label: string; cls: string }> = {
  creation: { label: 'in creation', cls: 'warn' },
  fix: { label: 'rules to fix', cls: 'bad' },
  finished: { label: 'finished', cls: 'good' },
};

/**
 * The troupe: each player, their characters and how far along each is, with their sheets to save
 * and send back after a session. Players named on the Seasons page's turn order with no character
 * yet show as not started.
 */
function TroupeCard({ saga, update }: { saga: Saga; update: (fn: (s: Saga) => void) => void }) {
  const chars = usePlayerCharacters(saga.id);
  const data = useGameData(saga);
  const troupe = useMemo(() => troupeOf(saga, chars, data), [saga, chars, data]);
  const [name, setName] = useState('');
  const save = (p: TroupePlayer) => downloadJson(`${safeFilename(saga.name)}_${safeFilename(p.name || 'unclaimed')}.arm5char.json`, exportCharacters(p.characters.map((x) => x.c.id)));
  const withSheets = troupe.filter((p) => p.name && p.characters.length);
  const saveAll = async () => {
    for (const p of withSheets) {
      save(p);
      // one file a player; a short pause keeps the browser from dropping a download
      await new Promise((r) => setTimeout(r, 400));
    }
  };
  const addPlayer = () => {
    const n = name.trim();
    if (!n) return;
    update((s) => void (s.playerOrder = [...(s.playerOrder ?? []).filter((x) => x.trim().toLowerCase() !== n.toLowerCase()), n]));
    setName('');
  };
  return (
    <Card title="The troupe" tour="troupe-card" fold="saga-troupe" summary={`${troupe.filter((p) => p.name).length} players, ${chars.filter((c) => !c.npc).length} characters`}>
      {troupe.length === 0 && <Empty>No players yet. Add their names below, or set a player on each character&apos;s first step.</Empty>}
      {troupe.map((p) => (
        <div key={p.name || '__none'} className="list-row" style={{ alignItems: 'flex-start' }} data-tour="troupe-player">
          <div style={{ flex: 1 }}>
            <b>{p.name || 'No player named'}</b>
            {p.characters.length === 0 ? (
              <div className="small muted">Not started. Send them the saga&apos;s rules with Invite players.</div>
            ) : (
              <div className="chip-row" style={{ marginTop: 3 }}>
                {p.characters.map((x) => (
                  <Link key={x.c.id} to={R.character(saga.id, x.c)} className="small" title={x.errors || x.warnings ? `${x.errors} to fix, ${x.warnings} to look at` : undefined}>
                    {x.c.name || 'Unnamed'} <span className="muted">({x.c.type === 'mythic' ? 'Mythic Companion' : x.c.type})</span> <span className={`badge ${STANDING[x.standing].cls}`}>{STANDING[x.standing].label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          {p.name && p.characters.length > 0 && (
            <button className="small" onClick={() => save(p)} title={`Save ${p.name}'s characters as one file, to send back to them`}>
              Save their sheets
            </button>
          )}
          {p.name && p.characters.length === 0 && (
            <button className="small ghost" onClick={() => update((s) => void (s.playerOrder = (s.playerOrder ?? []).filter((x) => x.trim().toLowerCase() !== p.name.toLowerCase())))} aria-label={`Remove ${p.name}`}>
              ✕
            </button>
          )}
        </div>
      ))}
      <div className="row" style={{ marginTop: 8 }}>
        <input value={name} placeholder="A player's name" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPlayer()} aria-label="A player's name" style={{ flex: '1 1 160px' }} />
        <button onClick={addPlayer} disabled={!name.trim()}>
          Add player
        </button>
        {withSheets.length > 1 && (
          <button onClick={saveAll} data-tour="troupe-save-all" title="One file for each player, named for them: their sheets as they stand after the session">
            Save every player&apos;s sheets
          </button>
        )}
      </div>
      <p className="small muted" style={{ marginBottom: 0 }}>
        After a session, save each player&apos;s sheets and send them back: opening the file replaces their copies with yours, and shows them what changed. A character&apos;s player is set
        on its first step; the order here is the turn order on the Seasons page.
      </p>
    </Card>
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
      <TroupeCard saga={saga} update={update} />
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
