import { useNavigate } from 'react-router-dom';
import { summarize } from '../../../engine/character/validate';
import { Card, IssueList } from '../../kit';
import type { CharEditor } from '../useChar';
import SheetSummary from '../SheetSummary';

export default function ReviewStep({ ed }: { ed: CharEditor }) {
  const { c, d, issues, update, saga, acknowledge } = ed;
  const nav = useNavigate();
  if (!c || !d || !saga) return null;
  const s = summarize(issues);
  return (
    <>
      <Card title="Final check" className="accent">
        <p>
          {s.errors === 0 ? (
            <span className="good-text">No rule violations.</span>
          ) : (
            <span className="bad-text">{s.errors} rule violation(s) remain.</span>
          )}{' '}
          {s.warnings} warning(s), {s.infos} note(s). You can finalize anyway — issues you have not fixed stay visible on the sheet, and any you
          <i> Allow</i> are recorded as troupe rulings.
        </p>
        <IssueList issues={issues} onAcknowledge={acknowledge} />
        <div className="row" style={{ marginTop: 10 }}>
          <button
            className="primary"
            onClick={() => {
              update((x) => {
                x.creation.finalized = true;
                x.confidence = { ...d.confidence };
                // bake virtue-granted warping points into the stored total
                const extra = d.effects.filter((e) => e.type === 'warpingPoints').reduce((t, e) => t + ((e as { amount: number }).amount ?? 0), 0);
                x.warpingPoints = Math.max(x.warpingPoints, extra);
              });
              nav(`/saga/${saga.id}/character/${c.id}`);
            }}
          >
            Finalize character
          </button>
          <span className="small muted">After finalizing, advance the character with seasons on the sheet. You can reopen creation at any time.</span>
        </div>
      </Card>
      <SheetSummary ed={ed} />
    </>
  );
}
