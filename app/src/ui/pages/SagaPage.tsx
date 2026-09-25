import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore, exportSaga } from '../../store/store';
import { useGameData, useSaga, useSagaCharacters, useSagaCovenants } from '../../store/hooks';
import { newCharacter } from '../../engine/character/factory';
import { newCovenant } from '../../engine/covenant';
import { deriveCharacter } from '../../engine/character/derive';
import { validateCharacter, summarize } from '../../engine/character/validate';
import { Card, Confirm, Empty, Field, Stepper } from '../kit';
import { downloadJson, isBundle, pickJsonFile, safeFilename } from '../../util/files';
import { HOUSE_BY_ID } from '../../data/houses';
import type { CharType } from '../../data';
import { uid } from '../../util/id';

const TYPE_INFO: Record<CharType, { label: string; blurb: string }> = {
  magus: { label: 'Magus', blurb: 'A Hermetic wizard of one of the twelve Houses.' },
  companion: { label: 'Companion', blurb: 'A central non-magus character: knight, scholar, priest, rogue…' },
  mythic: { label: 'Mythic Companion', blurb: 'A companion of magus-level power: Nephilim, Devil Child, Faerie Doctor, Spirit Votary.' },
  grog: { label: 'Grog', blurb: 'A minor character: soldier, servant, craftsman of the covenant.' },
};

export default function SagaPage() {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  const chars = useSagaCharacters(sagaId);
  const covs = useSagaCovenants(sagaId);
  const putCharacter = useStore((s) => s.putCharacter);
  const putCovenant = useStore((s) => s.putCovenant);
  const updateSaga = useStore((s) => s.updateSaga);
  const setActive = useStore((s) => s.setActiveSaga);
  const deleteCharacter = useStore((s) => s.deleteCharacter);
  const importBundle = useStore((s) => s.importBundle);
  const nav = useNavigate();
  const [msg, setMsg] = useState('');
  const [journalText, setJournalText] = useState('');

  useEffect(() => {
    if (sagaId) setActive(sagaId);
  }, [sagaId, setActive]);

  if (!saga) return <Empty>Saga not found. <Link to="/">Back</Link></Empty>;

  const create = (type: CharType) => {
    const c = newCharacter(type, saga.id, saga.currentYear);
    if (covs.length === 1) c.covenantId = covs[0].id;
    putCharacter(c);
    if (covs.length === 1) useStore.getState().updateCovenant(covs[0].id, (cv) => cv.memberIds.push(c.id));
    nav(`/saga/${saga.id}/character/${c.id}/create`);
  };

  const advanceSeason = () =>
    updateSaga(saga.id, (s) => {
      const order = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;
      const i = order.indexOf(s.currentSeason);
      if (i === 3) {
        s.currentSeason = 'Spring';
        s.currentYear += 1;
      } else s.currentSeason = order[i + 1];
    });

  const byType = (t: CharType) => chars.filter((c) => c.type === t);

  return (
    <div>
      <div className="breadcrumbs">
        <Link to="/">Sagas</Link> ›
      </div>
      <div className="topbar">
        <h1>{saga.name}</h1>
        <button onClick={() => downloadJson(`${safeFilename(saga.name)}.arm5saga.json`, exportSaga(saga.id))}>Export saga</button>
        <button
          onClick={async () => {
            try {
              const b = await pickJsonFile();
              if (!isBundle(b)) throw new Error('Not an Ars Magica Toolkit file');
              const r = importBundle({ ...b, saga: undefined }, { intoSagaId: saga.id });
              setMsg(`Imported ${r.characters} character(s), ${r.covenants} covenant(s) into this saga.`);
            } catch (e) {
              setMsg(`Import failed: ${(e as Error).message}`);
            }
          }}
        >
          Import character / covenant…
        </button>
      </div>
      {msg && <p className="small">{msg}</p>}

      <div className="grid grid-3">
        <Card title="Saga calendar">
          <div className="row">
            <Field label="Year">
              <Stepper value={saga.currentYear} onChange={(v) => updateSaga(saga.id, (s) => void (s.currentYear = v))} min={500} max={2000} width={64} />
            </Field>
            <Field label="Season">
              <select value={saga.currentSeason} onChange={(e) => updateSaga(saga.id, (s) => void (s.currentSeason = e.target.value as typeof s.currentSeason))}>
                {['Spring', 'Summer', 'Autumn', 'Winter'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <button onClick={advanceSeason} title="Move to the next season">
              Next season ›
            </button>
          </div>
          <Field label="Tribunal">
            <input value={saga.tribunal} onChange={(e) => updateSaga(saga.id, (s) => void (s.tribunal = e.target.value))} />
          </Field>
          <Field label="Saga name">
            <input value={saga.name} onChange={(e) => updateSaga(saga.id, (s) => void (s.name = e.target.value))} />
          </Field>
        </Card>
        <Card title="Create a character">
          <div className="stack">
            {(Object.keys(TYPE_INFO) as CharType[]).map((t) => (
              <button key={t} onClick={() => create(t)} style={{ justifyContent: 'flex-start', textAlign: 'left' }}>
                <b style={{ minWidth: 140 }}>{TYPE_INFO[t].label}</b>
                <span className="small soft">{TYPE_INFO[t].blurb}</span>
              </button>
            ))}
          </div>
        </Card>
        <Card
          title="Covenants"
          actions={
            <button
              className="small primary"
              onClick={() => {
                const c = newCovenant(saga.id, saga.currentYear);
                c.name = 'New Covenant';
                c.tribunal = saga.tribunal;
                c.memberIds = chars.map((x) => x.id);
                putCovenant(c);
                nav(`/saga/${saga.id}/covenant/${c.id}`);
              }}
            >
              Found a covenant
            </button>
          }
        >
          {covs.length === 0 && <Empty>No covenant yet.</Empty>}
          {covs.map((c) => (
            <div key={c.id} className="list-row">
              <Link to={`/saga/${saga.id}/covenant/${c.id}`} style={{ flex: 1 }}>
                {c.name || '(unnamed)'}
              </Link>
              <span className="badge">{c.season}</span>
              <span className="badge">{c.memberIds.length} members</span>
            </div>
          ))}
        </Card>
      </div>

      <div className="grid grid-2" style={{ marginTop: 14 }}>
        {(['magus', 'companion', 'mythic', 'grog'] as CharType[]).map((t) => (
          <Card key={t} title={`${TYPE_INFO[t].label}${t === 'magus' ? 'i' : t === 'grog' ? 's' : 's'}`}>
            {byType(t).length === 0 && <Empty>None yet.</Empty>}
            {byType(t).map((c) => {
              const d = deriveCharacter(c, data, saga.houseRules);
              const s = summarize(validateCharacter(d, data, saga.houseRules));
              return (
                <div key={c.id} className="list-row">
                  <div style={{ flex: 1 }}>
                    <Link to={`/saga/${saga.id}/character/${c.id}${c.creation.finalized ? '' : '/create'}`}>
                      <b>{c.name || '(unnamed)'}</b>
                    </Link>
                    <div className="small muted">
                      {c.house ? `${HOUSE_BY_ID[c.house]?.name} · ` : ''}age {c.age}
                      {c.player ? ` · played by ${c.player}` : ''}
                    </div>
                  </div>
                  {!c.creation.finalized && <span className="badge warn">in creation</span>}
                  {s.errors > 0 && <span className="badge bad">{s.errors} errors</span>}
                  {s.errors === 0 && s.warnings > 0 && <span className="badge warn">{s.warnings} warnings</span>}
                  <Confirm className="small ghost" message={`Delete ${c.name || 'this character'}?`} onYes={() => deleteCharacter(c.id)} label="✕" />
                </div>
              );
            })}
          </Card>
        ))}
      </div>

      <Card title="Saga journal" className="accent" id="journal">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <textarea value={journalText} onChange={(e) => setJournalText(e.target.value)} placeholder={`What happened in ${saga.currentSeason} ${saga.currentYear}?`} style={{ flex: 1 }} />
          <button
            onClick={() => {
              if (!journalText.trim()) return;
              updateSaga(saga.id, (s) => {
                s.journal.unshift({ id: uid(), year: s.currentYear, season: s.currentSeason, title: journalText.split('\n')[0].slice(0, 80), text: journalText, characterIds: [] });
              });
              setJournalText('');
            }}
          >
            Add entry
          </button>
        </div>
        {saga.journal.map((j) => (
          <div key={j.id} className="list-row" style={{ alignItems: 'flex-start' }}>
            <span className="badge">
              {j.season} {j.year}
            </span>
            <div style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{j.text}</div>
            <button className="small ghost" onClick={() => updateSaga(saga.id, (s) => void (s.journal = s.journal.filter((x) => x.id !== j.id)))}>
              ✕
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}
