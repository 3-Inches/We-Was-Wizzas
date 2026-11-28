// Unlogging a season at the Game Table: the season taken off the log, with everything it changed
// (engine/unlog.ts). One button, used wherever a logged season is listed at the table. A roll the season
// left, once made, stands: the button says so beside it.

import { canUnlogLinked, unlogLinked } from '../../engine/unlog';
import type { Character } from '../../engine/types';
import { useSaga, useSagaCharacters, useSagaCovenants } from '../../store/hooks';
import { useStore } from '../../store/store';

export function Unlog({ c, uid }: { c: Character; uid: string }) {
  const putRecords = useStore((s) => s.putRecords);
  const covs = useSagaCovenants(c.sagaId);
  const troupe = useSagaCharacters(c.sagaId);
  const saga = useSaga(c.sagaId);
  const e = c.seasonLog.find((y) => y.uid === uid);
  // a season logged with another's (a lesson, help in the lab) is taken back with it, and the button says whose
  const can = e ? canUnlogLinked(e, c, troupe) : { ok: false, why: 'Not on the log.', with: [] as string[] };
  const withWhom = can.with.length ? ` ${can.with.join(' and ')}’s season${can.with.length > 1 ? 's' : ''} logged with it go${can.with.length > 1 ? '' : 'es'} too.` : '';
  // a roll its work left, already made, stands: Unlog leaves what it did (owner.md, point 2)
  const stands = 'stands' in can ? can.stands : undefined;
  const button = (
    <button
      className="small ghost"
      disabled={!can.ok}
      title={can.ok ? `Take this season off the log: its experience and whatever else it changed (Labor Points, a project’s progress, the vis it spent) come back, and the season is free again.${withWhom}${stands ? ` ${stands} Turn back undoes it.` : ''}` : can.why}
      onClick={() => {
        const x = structuredClone(c);
        const cs = structuredClone(covs);
        const others = structuredClone(troupe.filter((t) => t.id !== c.id));
        const r = unlogLinked(x, uid, cs, others, { now: saga ? { year: saga.currentYear, season: saga.currentSeason } : undefined });
        if (r.ok) putRecords({ characters: r.characters, covenants: r.covenants }, `Unlog ${e?.season ?? ''} ${e?.year ?? ''} for ${c.name || 'a character'}${r.with.length ? `, with ${r.with.join(' and ')}’s` : ''}`);
      }}
    >
      Unlog
    </button>
  );
  if (!stands && !can.with.length) return button;
  return (
    <span className="row tight">
      {button}
      {can.with.length > 0 && <span className="small muted">with {can.with.join(' and ')}’s</span>}
      {stands && (
        <span className="small muted" title={stands}>
          the roll stands
        </span>
      )}
    </span>
  );
}
