import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore, exportSaga } from '../../store/store';
import { Card, Confirm, Empty } from '../kit';
import { downloadJson, isBundle, pickJsonFile, safeFilename, setPendingImport } from '../../util/files';
import { Hint } from '../Hint';

export default function HomePage() {
  const sagas = useStore((s) => s.sagas);
  const characters = useStore((s) => s.characters);
  const covenants = useStore((s) => s.covenants);
  const createSaga = useStore((s) => s.createSaga);
  const deleteSaga = useStore((s) => s.deleteSaga);
  const setActive = useStore((s) => s.setActiveSaga);
    const nav = useNavigate();
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');

  const list = Object.values(sagas).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div>
      <div className="hero" data-tour="new-saga">
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
                if (!isBundle(b)) throw new Error('that file is not one the toolkit exported (a saga, its rules for players, a character or a covenant)');
                // shown before anything is brought in: what it holds, where it goes, what it would replace
                setPendingImport(b);
                nav('/import');
              } catch (e) {
                setMsg(`Import failed: ${(e as Error).message}`);
              }
            }}
          >
            Import file…
          </button>
        </div>
        {msg && <p className="small">{msg}</p>}
        <Hint id="home-start">New here? Name a saga and press <b>Begin a new saga</b>, or follow a guided tutorial on the <Link to="/help">Guide</Link> page. Everything stays in this browser: export now and then to keep a backup.</Hint>
      </div>

      <Card title="Your sagas">
        {list.length === 0 && <Empty>No sagas yet. Name one above to begin — or open the Rules reference to browse.</Empty>}
        {list.map((s) => {
          // the players' side; the Tribunal's living covenants are counted apart
          const covs = Object.values(covenants).filter((c) => c.sagaId === s.id);
          const living = covs.filter((c) => c.living);
          const npc = new Set(living.flatMap((c) => c.memberIds));
          const nChar = Object.values(characters).filter((c) => c.sagaId === s.id && !npc.has(c.id)).length;
          const nCov = covs.length - living.length;
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
                  {living.length > 0 && ` · ${living.length} living covenant${living.length > 1 ? 's' : ''} of the Tribunal`}
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
          <ol className="small steps">
            <li>Open the link or file your storyguide sent: it adds the saga with its books and rules. (None sent? Begin a saga of your own.)</li>
            <li>Create your character on the saga's <b>People</b> page. The guided build asks what you want to play and drafts it with you.</li>
            <li>On the character sheet press <b>Share</b> and send the file to your storyguide.</li>
          </ol>
          <p className="small muted">Everything is stored in this browser. Export regularly to keep backups.</p>
        </Card>
        <Card title="For storyguides">
          <ol className="small steps">
            <li>Create a saga, set its books and house rules, and found the covenant.</li>
            <li>On the Saga Overview press <b>Invite players</b> and send them the saga's rules.</li>
            <li>Import each character they send back: you see it before it joins, and it can go straight into the covenant. Or build one for a player with <b>Quick build</b> or the guided build, and Share it to them.</li>
          </ol>
          <p className="small muted">Turn on <b>Stream mode</b> to share your screen on Discord.</p>
        </Card>
        <Card title="Rules fidelity">
          <p>Totals show their full calculation when clicked, every Virtue links to its source text, and any rule can be overridden as a troupe ruling.</p>
        </Card>
      </div>
    </div>
  );
}
