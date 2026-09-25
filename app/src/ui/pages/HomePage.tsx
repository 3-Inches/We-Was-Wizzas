import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, exportSaga } from '../../store/store';
import { Card, Confirm, Empty } from '../kit';
import { downloadJson, isBundle, pickJsonFile, safeFilename } from '../../util/files';

export default function HomePage() {
  const sagas = useStore((s) => s.sagas);
  const characters = useStore((s) => s.characters);
  const covenants = useStore((s) => s.covenants);
  const createSaga = useStore((s) => s.createSaga);
  const deleteSaga = useStore((s) => s.deleteSaga);
  const setActive = useStore((s) => s.setActiveSaga);
  const importBundle = useStore((s) => s.importBundle);
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');

  const list = Object.values(sagas).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div>
      <div className="hero">
        <h1>Ars Magica Saga Toolkit</h1>
        <p className="soft" style={{ maxWidth: 780 }}>
          Build magi, companions, grogs and Mythic Companions step by step with every Definitive Edition rule checked as you go. Found covenants with Build
          Points, Hooks and Boons; personalize laboratories; design spells and enchantments; track seasons, aging, vis and finances — all linked together,
          with 960+ Virtues & Flaws, 1200+ spells and the full text of the 5th Edition books one click away.
        </p>
        <div className="row">
          <input placeholder="Name of a new saga (e.g. The Covenant of Semita Errabunda)" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: '1 1 320px' }} />
          <button
            className="primary"
            onClick={() => {
              const s = createSaga(name.trim() || 'New Saga');
              setName('');
              nav(`/saga/${s.id}`);
            }}
          >
            Begin a new saga
          </button>
          <button
            onClick={async () => {
              try {
                const b = await pickJsonFile();
                if (!isBundle(b)) throw new Error('Not an Ars Magica Toolkit file');
                const r = importBundle(b);
                setMsg(`Imported ${r.characters} character(s) and ${r.covenants} covenant(s).`);
                if (r.sagaId) nav(`/saga/${r.sagaId}`);
              } catch (e) {
                setMsg(`Import failed: ${(e as Error).message}`);
              }
            }}
          >
            Import file…
          </button>
        </div>
        {msg && <p className="small">{msg}</p>}
      </div>

      <Card title="Your sagas">
        {list.length === 0 && <Empty>No sagas yet. Name one above to begin — or open the Rules reference to browse.</Empty>}
        {list.map((s) => {
          const nChar = Object.values(characters).filter((c) => c.sagaId === s.id).length;
          const nCov = Object.values(covenants).filter((c) => c.sagaId === s.id).length;
          return (
            <div key={s.id} className="list-row">
              <div style={{ flex: 1 }}>
                <a
                  href={`#/saga/${s.id}`}
                  onClick={() => setActive(s.id)}
                  style={{ fontFamily: 'var(--font-head)', fontSize: '1.05em' }}
                >
                  {s.name}
                </a>
                <div className="small muted">
                  {s.tribunal} Tribunal · {s.currentSeason} {s.currentYear} · {nChar} characters · {nCov} covenants
                </div>
              </div>
              <button className="small" onClick={() => downloadJson(`${safeFilename(s.name)}.arm5saga.json`, exportSaga(s.id))}>
                Export
              </button>
              <Confirm className="small" danger message={`Delete the saga "${s.name}" and all its characters and covenants? This cannot be undone (export first!).`} onYes={() => deleteSaga(s.id)} />
            </div>
          );
        })}
      </Card>

      <div className="grid grid-3" style={{ marginTop: 14 }}>
        <Card title="For players">
          <p>Your storyguide can send you a link or file. Build your character here, then use <b>Share</b> on the character sheet to send it back.</p>
          <p className="small muted">Everything is stored in this browser. Export regularly to keep backups.</p>
        </Card>
        <Card title="For storyguides">
          <p>Create a saga, set its books and house rules, found the covenant, and import your players' characters. Turn on <b>Stream mode</b> to share your screen on Discord.</p>
        </Card>
        <Card title="Rules fidelity">
          <p>Totals show their full calculation when clicked, every Virtue links to its source text, and any rule can be overridden as a troupe ruling.</p>
        </Card>
      </div>
    </div>
  );
}
