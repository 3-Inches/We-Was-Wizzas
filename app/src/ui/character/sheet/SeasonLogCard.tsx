// The season log: every season a character has spent, the latest first. On the sheet it is the record;
// at the Game Table (Seasons) a season can be unlogged.

import { ART_NAMES, SEASONS, type Art } from '../../../data';
import { Card } from '../../kit';
import { RollAtTable, useAtTable } from '../../play';
import { Unlog } from '../Unlog';
import type { CharEditor } from '../useChar';

export function SeasonLogCard({ ed }: { ed: CharEditor }) {
  const { c, d, saga } = ed;
  const atTable = useAtTable();
  if (!c || !d || !saga) return null;
  const latest = c.seasonLog.slice().sort((a, b) => b.year - a.year || SEASONS.indexOf(b.season) - SEASONS.indexOf(a.season))[0];
  return (
    <Card title="Season log" tour="season-log" fold="season-log" summary={latest ? `${c.seasonLog.length} logged; the latest, ${latest.season} ${latest.year}: ${latest.summary.length > 90 ? `${latest.summary.slice(0, 90)}…` : latest.summary}` : 'No seasons logged yet.'}>
      {c.seasonLog.length === 0 && <div className="small muted">No seasons logged yet.</div>}
      {!atTable && c.seasonLog.length > 0 && <RollAtTable sagaId={saga.id} who={c.id} where="seasons" what="A season logged ahead of time is unlogged (its experience taken off)" />}
      {c.seasonLog
        .slice()
        .sort((a, b) => b.year - a.year || SEASONS.indexOf(b.season) - SEASONS.indexOf(a.season))
        .map((e) => (
          <div key={e.uid} className="list-row">
            <span className="badge">
              {e.season} {e.year}
            </span>
            <span style={{ flex: 1 }}>
              {e.summary}
              {Object.keys(e.gains).length > 0 && <span className="small muted"> — {Object.entries(e.gains).map(([k, v]) => `${labelFor(k, c, d)} +${v}`).join(', ')}</span>}
              {e.warpingPoints ? <span className="small warn-text"> — {e.warpingPoints} Warping</span> : null}
              {!e.applied && <span className="badge warn">not applied</span>}
            </span>
            {atTable && <Unlog c={c} uid={e.uid} />}
          </div>
        ))}
    </Card>
  );
}

function labelFor(key: string, c: NonNullable<CharEditor['c']>, d: NonNullable<CharEditor['d']>): string {
  const [k, id] = key.split(':');
  if (k === 'art') return ART_NAMES[id as Art] ?? id;
  if (k === 'ability') return d.abilityByUid.get(id)?.name ?? 'ability';
  if (k === 'mastery') return `Mastery: ${c.spells.find((s) => s.uid === id)?.spell.name ?? 'spell'}`;
  return key;
}

