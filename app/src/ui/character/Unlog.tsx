// Unlogging a season at the Game Table: the season taken off the log, with everything it changed
// (engine/unlog.ts). One button, used wherever a logged season is listed at the table.

import { canUnlog, unlogSeason } from '../../engine/unlog';
import type { Character } from '../../engine/types';
import { useSagaCovenants } from '../../store/hooks';
import { useStore } from '../../store/store';

export function Unlog({ c, uid }: { c: Character; uid: string }) {
  const putRecords = useStore((s) => s.putRecords);
  const covs = useSagaCovenants(c.sagaId);
  const e = c.seasonLog.find((y) => y.uid === uid);
  const can = e ? canUnlog(e) : { ok: false, why: 'Not on the log.' };
  return (
    <button
      className="small ghost"
      disabled={!can.ok}
      title={can.ok ? 'Take this season off the log: its experience and whatever else it changed (Labor Points, a project’s progress, the vis it spent) come back, and the season is free again' : can.why}
      onClick={() => {
        const x = structuredClone(c);
        const cs = structuredClone(covs);
        const r = unlogSeason(x, uid, cs);
        if (r.ok) putRecords({ characters: [x], covenants: r.covenants }, `Unlog ${e?.season ?? ''} ${e?.year ?? ''} for ${c.name || 'a character'}`);
      }}
    >
      Unlog
    </button>
  );
}
