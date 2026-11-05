// People: the saga's characters, made here and found here, by kind (magi, companions, Mythic
// Companions, grogs) with the storyguide's characters apart; each opens their sheet. The Tribunal's
// living covenants keep their people on the Tribunal page.

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { CharType } from '../../data';
import { HOUSE_BY_ID } from '../../data/houses';
import { newCharacter } from '../../engine/character/factory';
import { deriveCharacter } from '../../engine/character/derive';
import { summarize, validateCharacter } from '../../engine/character/validate';
import type { Character } from '../../engine/types';
import { useGameData, usePlayerCharacters, usePlayerCovenants, useSaga } from '../../store/hooks';
import { useStore } from '../../store/store';
import { Card, Confirm, Empty, SearchInput } from '../kit';
import { R } from '../routes';

export const TYPE_INFO: Record<CharType, { label: string; plural: string; blurb: string }> = {
  magus: { label: 'Magus', plural: 'Magi', blurb: 'A Hermetic wizard of one of the twelve Houses.' },
  companion: { label: 'Companion', plural: 'Companions', blurb: 'A central non-magus character: knight, scholar, priest, rogue…' },
  mythic: { label: 'Mythic Companion', plural: 'Mythic Companions', blurb: 'A companion of magus-level power: Nephilim, Devil Child, Faerie Doctor, Spirit Votary.' },
  grog: { label: 'Grog', plural: 'Grogs', blurb: 'A minor character: soldier, servant, craftsman of the covenant.' },
};
const ORDER: CharType[] = ['magus', 'companion', 'mythic', 'grog'];

export default function PeoplePage() {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  const chars = usePlayerCharacters(sagaId);
  const covs = usePlayerCovenants(sagaId);
  const putCharacter = useStore((s) => s.putCharacter);
  const deleteCharacter = useStore((s) => s.deleteCharacter);
  const setActive = useStore((s) => s.setActiveSaga);
  const nav = useNavigate();
  const [q, setQ] = useState('');
  useEffect(() => {
    if (sagaId) setActive(sagaId);
  }, [sagaId, setActive]);
  if (!saga) return <Empty>Saga not found.</Empty>;

  const create = (type: CharType) => {
    const c = newCharacter(type, saga.id, saga.currentYear);
    if (covs.length === 1) c.covenantId = covs[0].id;
    putCharacter(c);
    if (covs.length === 1) useStore.getState().updateCovenant(covs[0].id, (cv) => cv.memberIds.push(c.id));
    nav(R.character(saga.id, c));
  };
  const found = (c: Character) => {
    const n = q.trim().toLowerCase();
    return !n || [c.name, c.player, c.house && HOUSE_BY_ID[c.house]?.name, c.creation.concept].some((x) => (x ?? '').toLowerCase().includes(n));
  };
  const players = chars.filter((c) => !c.npc && found(c));
  const npcs = chars.filter((c) => c.npc && found(c));
  const covName = (c: Character) => covs.find((x) => x.id === c.covenantId)?.name;

  const Row = ({ c }: { c: Character }) => {
    const d = deriveCharacter(c, data, saga.houseRules);
    const s = summarize(validateCharacter(d, data, saga.houseRules));
    const w = c.wounds;
    const hurt = w.dead ? 'dead' : (w.incapacitating ?? 0) + (w.heavy ?? 0) + (w.medium ?? 0) + (w.light ?? 0) > 0 ? 'wounded' : '';
    return (
      <div className="list-row">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link to={R.character(saga.id, c)}>
            <b>{c.name || '(unnamed)'}</b>
          </Link>
          <div className="small muted">
            {[c.house ? HOUSE_BY_ID[c.house]?.name : '', c.creation.concept && c.type !== 'magus' ? c.creation.concept : '', `age ${c.age}`, covName(c), c.player ? `played by ${c.player}` : '', c.familiar?.name ? `familiar: ${c.familiar.name}` : '']
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
        {!c.creation.finalized && <span className="badge warn">in creation</span>}
        {hurt && <span className={`badge ${hurt === 'dead' ? 'bad' : 'warn'}`}>{hurt}</span>}
        {s.errors > 0 && <span className="badge bad">{s.errors} error{s.errors === 1 ? '' : 's'}</span>}
        {s.errors === 0 && s.warnings > 0 && <span className="badge warn">{s.warnings} warning{s.warnings === 1 ? '' : 's'}</span>}
        <Confirm className="small ghost" message={`Delete ${c.name || 'this character'}?`} onYes={() => deleteCharacter(c.id)} label="✕" />
      </div>
    );
  };

  return (
    <div className="stack">
      <div className="topbar">
        <h1>People</h1>
        <SearchInput value={q} onChange={setQ} placeholder="Find by name, House, player, concept…" />
      </div>
      <Card title="Create a character" fold="people-create" summary="A magus, companion, Mythic Companion or grog.">
        <div className="grid grid-2">
          {ORDER.map((t) => (
            <button key={t} onClick={() => create(t)} data-tour={`create-${t}`} style={{ flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', gap: 2 }}>
              <b>{TYPE_INFO[t].label}</b>
              <span className="small soft">{TYPE_INFO[t].blurb}</span>
            </button>
          ))}
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>
          Or let the toolkit make them: <Link to={`/saga/${saga.id}/build`}>Quick build ›</Link>. A player&apos;s finished sheet can be brought in with Import on the Saga Overview.
        </p>
      </Card>
      {ORDER.map((t) => {
        const list = players.filter((c) => c.type === t);
        return (
          <Card key={t} title={`${TYPE_INFO[t].plural} (${list.length})`} fold={`people-${t}`} summary={list.map((c) => c.name || '(unnamed)').join(', ') || 'None yet.'} tour={`people-${t}`}>
            {list.length === 0 && <Empty>None yet.</Empty>}
            {list.map((c) => (
              <Row key={c.id} c={c} />
            ))}
          </Card>
        );
      })}
      {npcs.length > 0 && (
        <Card title={`The storyguide's characters (${npcs.length})`} fold="people-npcs" summary={npcs.map((c) => c.name || '(unnamed)').join(', ')}>
          {ORDER.map((t) => {
            const list = npcs.filter((c) => c.type === t);
            return list.length ? (
              <div key={t}>
                <h4 style={{ margin: '6px 0 2px' }}>{TYPE_INFO[t].plural}</h4>
                {list.map((c) => (
                  <Row key={c.id} c={c} />
                ))}
              </div>
            ) : null;
          })}
        </Card>
      )}
      <p className="small muted">
        The people of the Tribunal&apos;s other covenants are on <Link to={R.tribunal(saga.id)}>The Tribunal</Link> page.
      </p>
    </div>
  );
}
