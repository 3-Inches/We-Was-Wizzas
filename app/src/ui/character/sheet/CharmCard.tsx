// Greater Charm (Realms of Power: Faerie): the one charm that rules a Virtue, and who has it. Taken
// by another (stolen, overheard), the Virtue goes with it; retrieved or destroyed, it comes back.
import { useState } from 'react';
import { charmsOf, passCharm } from '../../../engine/charms';
import { vfDisplayName } from '../../../engine/character/derive';
import { useSagaCharacters, useSagaCovenants } from '../../../store/hooks';
import { useStore } from '../../../store/store';
import { Card, Field } from '../../kit';
import { PeopleOptions, groupPeople } from '../../play';
import type { CharEditor } from '../useChar';

export function CharmCard({ ed }: { ed: CharEditor }) {
  const { c, data, saga } = ed;
  const chars = useSagaCharacters(saga?.id);
  const covs = useSagaCovenants(saga?.id);
  const putSagaState = useStore((s) => s.putSagaState);
  const [to, setTo] = useState<Record<string, string>>({});
  const [log, setLog] = useState<string[]>([]);
  if (!c || !saga) return null;
  // the charms this character owns, and those of others they hold now
  const mine = charmsOf(chars, data).filter((x) => x.owner.id === c.id || x.holder?.id === c.id);
  if (!mine.length) return null;
  const groups = groupPeople(chars.filter((x) => !x.wounds.dead), covs);
  const pass = (ownerId: string, flawUid: string, toId: string) => {
    const state = structuredClone({ saga, characters: chars, covenants: covs });
    const lines = passCharm(state.characters, ownerId, flawUid, toId, data);
    const touched = state.characters.filter((x) => JSON.stringify(x.virtues) !== JSON.stringify(chars.find((y) => y.id === x.id)?.virtues));
    putSagaState({ saga: state.saga, characters: touched, covenants: [] });
    setLog((l) => [...lines, ...l].slice(0, 8));
  };
  return (
    <Card title="Greater Charm" tour="greater-charm">
      {mine.map(({ owner, flaw, virtue, holder }) => {
        const vname = virtue ? vfDisplayName(data.vfById.get(virtue.defId), virtue, data) : flaw.param || 'its Virtue';
        const away = holder && holder.id !== owner.id;
        const key = flaw.uid;
        return (
          <div key={key} className="list-row" style={{ flexWrap: 'wrap' }}>
            <span>
              {owner.id === c.id ? 'Your' : `${owner.name || 'Someone'}’s`} charm of <b>{vname}</b>:{' '}
              {away ? <span className="warn-text">with {holder.id === c.id ? 'you' : holder.name || 'another'}, who has the Virtue{owner.id === c.id ? ', not you' : ''}</span> : <span className="good-text">the owner has it</span>}
              {!virtue && <span className="bad-text"> (name the Virtue it rules on the Flaw)</span>}
            </span>
            <Field label="Taken by">
              <select value={to[key] ?? ''} onChange={(e) => setTo({ ...to, [key]: e.target.value })} aria-label="Who takes the charm">
                <option value="">— whom —</option>
                <PeopleOptions groups={groups} />
              </select>
            </Field>
            <button className="small" disabled={!to[key] || to[key] === (holder?.id ?? owner.id) || !virtue} onClick={() => pass(owner.id, flaw.uid, to[key])} title="Stolen, given or overheard: the Virtue goes with the charm">
              The charm passes
            </button>
            {away && (
              <button className="small ghost" onClick={() => pass(owner.id, flaw.uid, owner.id)} title="Retrieved, or destroyed: the owner has the Virtue again">
                {owner.name || 'The owner'} recovers it
              </button>
            )}
          </div>
        );
      })}
      {log.map((l, i) => (
        <div key={i} className="small">
          {l}
        </div>
      ))}
      <p className="small muted" style={{ margin: '6px 0 0' }}>
        Only one copy of the charm exists: whoever steals it (the object, or by overhearing a charm-poem or ritual) has the Virtue, and its owner has it again only by retrieving or
        destroying it. A verbal or performed charm is forgotten when stolen: the owner must see the thief use it before stealing it back (RoP: Faerie, Greater Charm).
      </p>
    </Card>
  );
}
