// The Chronicle: the saga's seasons told as a story, newest first, to read aloud at the table: the
// weather and the feast days, what each character did, who came up the road, the year's harvest and
// vis, and the news a Redcap brought. Beneath each, folded, the full record of what the clock did.

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { TimeReport } from '../../engine/types';
import { useSaga } from '../../store/hooks';
import { Card, Empty } from '../kit';
import { R } from '../routes';

const KIND_BADGE: Record<string, string> = { aging: 'aging', crisis: 'bad', warping: 'warn', reminder: 'warn' };

/** The full record of a season: the players' lines, and the Tribunal's apart. */
export function ReportLines({ r }: { r: TimeReport }) {
  const own = r.lines.filter((l) => !l.tribunal);
  const tribunal = r.lines.filter((l) => l.tribunal);
  const line = (l: TimeReport['lines'][number], i: number) => (
    <div key={i} className="small list-row">
      {l.who && <b style={{ minWidth: 120 }}>{l.who}</b>}
      {l.kind && KIND_BADGE[l.kind] && <span className={`badge ${KIND_BADGE[l.kind]}`}>{l.kind}</span>}
      <span>{l.text}</span>
    </div>
  );
  return (
    <>
      {own.map(line)}
      {tribunal.length > 0 && (
        <details style={{ marginLeft: 12 }}>
          <summary className="small">The Tribunal’s living covenants ({tribunal.length} lines)</summary>
          {tribunal.map(line)}
        </details>
      )}
    </>
  );
}

/** One season told: its story, and the record folded beneath. */
export function ChronicleEntry({ r, open }: { r: TimeReport; open?: boolean }) {
  const [first, ...rest] = r.story ?? [];
  const crisis = r.lines.some((l) => l.kind === 'crisis' && !l.tribunal);
  return (
    <article className="chronicle-entry" data-tour="chronicle-entry">
      <h3 className="chronicle-title">
        {r.season} {r.year}
        {r.season === 'Winter' && <span className="small muted"> · the year’s end</span>}
        {crisis && <span className="badge bad" style={{ marginLeft: 6 }}>crisis</span>}
      </h3>
      {first ? (
        <>
          <p className="chronicle-opening">{first.text}</p>
          {rest.map((s, i) => (
            <section key={i}>
              <h4>{s.title}</h4>
              <p>{s.text}</p>
            </section>
          ))}
        </>
      ) : (
        <p className="small muted">This season passed before the Chronicle was kept: only its record remains.</p>
      )}
      <details open={open || !first} className="chronicle-record">
        <summary className="small">The record in full ({r.lines.filter((l) => !l.tribunal).length} lines)</summary>
        <ReportLines r={r} />
      </details>
    </article>
  );
}

export default function ChroniclePage() {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const reports = saga?.timeLog ?? [];
  const years = [...new Set(reports.map((r) => r.year))];
  const [year, setYear] = useState<number | 'all'>('all');
  if (!saga) return <Empty>Saga not found.</Empty>;
  const shown = year === 'all' ? reports.slice(0, 12) : reports.filter((r) => r.year === year);
  return (
    <div className="stack">
      <Card title={`The Chronicle of ${saga.name || 'the saga'}`} className="accent" tour="chronicle">
        <p className="small muted" style={{ marginTop: 0 }}>
          Each season as the covenant lived it, written as it ends on the <Link to={R.seasons(saga.id)}>Seasons</Link> page: to read aloud at the table. The numbers and every roll are
          folded beneath each, in the record.
        </p>
        {years.length > 1 && (
          <div className="row tight small">
            <span>Year:</span>
            <button className={`small ${year === 'all' ? 'primary' : 'ghost'}`} onClick={() => setYear('all')}>
              the latest
            </button>
            {years.map((y) => (
              <button key={y} className={`small ${year === y ? 'primary' : 'ghost'}`} onClick={() => setYear(y)}>
                {y}
              </button>
            ))}
          </div>
        )}
      </Card>
      {shown.length === 0 && <Empty>No season has passed yet. End one on the Seasons page, and its story is told here.</Empty>}
      {shown.map((r) => (
        <ChronicleEntry key={r.id} r={r} />
      ))}
    </div>
  );
}
