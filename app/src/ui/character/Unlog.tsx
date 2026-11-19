// Unlogging a season at the Game Table: the season taken off the log, with everything it changed
// (engine/unlog.ts). One button, used wherever a logged season is listed at the table. A roll the season
// left, once made, stands: the button says so beside it.

import { canUnlog, unlogSeason } from '../../engine/unlog';
import type { Character } from '../../engine/types';
import { useSaga, useSagaCharacters, useSagaCovenants } from '../../store/hooks';
import { useStore } from '../../store/store';

export function Unlog({ c, uid }: { c: Character; uid: string }) {
  const putRecords = useStore((s) => s.putRecords);
  const covs = useSagaCovenants(c.sagaId);
  const troupe = useSagaCharacters(c.sagaId);
  const saga = useSaga(c.sagaId);
  const e = c.seasonLog.find((y) => y.uid === uid);
  const can = e ? canUnlog(e, c, troupe) : { ok: false, why: 'Not on the log.' };
  // a roll its work left, already made, stands: Unlog leaves what it did (owner.md, point 2)
  const stands = 'stands' in can ? can.stands : undefined;
  const button = (
    <button
      className="small ghost"
      disabled={!can.ok}
      title={can.ok ? `Take this season off the log: its experience and whatever else it changed (Labor Points, a project’s progress, the vis it spent) come back, and the season is free again.${stands ? ` ${stands} Turn back undoes it.` : ''}` : can.why}
      onClick={() => {
        const x = structuredClone(c);
        const cs = structuredClone(covs);
        const r = unlogSeason(x, uid, cs, { troupe, now: saga ? { year: saga.currentYear, season: saga.currentSeason } : undefined });
        if (r.ok) putRecords({ characters: [x], covenants: r.covenants }, `Unlog ${e?.season ?? ''} ${e?.year ?? ''} for ${c.name || 'a character'}`);
      }}
    >
      Unlog
    </button>
  );
  if (!stands) return button;
  return (
    <span className="row tight">
      {button}
      <span className="small muted" title={stands}>
        the roll stands
      </span>
    </span>
  );
}
