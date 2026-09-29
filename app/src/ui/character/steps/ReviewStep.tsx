import { useNavigate } from 'react-router-dom';
import { summarize } from '../../../engine/character/validate';
import { ART_NAMES, CHAR_NAMES, type Art, type Characteristic } from '../../../data';
import { HOUSE_BY_ID } from '../../../data/houses';
import { Card } from '../../kit';
import { CharIssueList } from '../CharIssues';
import type { CharEditor } from '../useChar';
import SheetSummary from '../SheetSummary';

export default function ReviewStep({ ed }: { ed: CharEditor }) {
  const { c, d, issues, update, saga } = ed;
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
        <CharIssueList ed={ed} issues={issues} resolveAll />
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
      {c.guided && <WhyCard ed={ed} />}
      <SheetSummary ed={ed} />
    </>
  );
}

/** Why the guided build chose what it did: every choice with the answers behind it. */
function WhyCard({ ed }: { ed: CharEditor }) {
  const { c, d, data, saga } = ed;
  const nav = useNavigate();
  if (!c || !d || !saga) return null;
  const vfs = c.virtues.filter((v) => v.why);
  const abilities = c.abilities.filter((a) => a.why);
  const spells = c.spells.filter((s) => s.why);
  const other = Object.entries(c.creation.guidedWhy ?? {});
  if (!vfs.length && !abilities.length && !spells.length && !other.length) return null;
  return (
    <Card title="Why these choices" actions={<button className="small" onClick={() => nav(`/saga/${saga.id}/character/${c.id}/guided`)}>Back to the guided build</button>}>
      <p className="small muted" style={{ marginTop: 0 }}>
        From the guided build. Anything here can be changed on its step; the reason stays with it.
      </p>
      <ul className="small">
        {vfs.map((v) => (
          <li key={v.uid}>
            <b>{d.virtues.find((x) => x.cv.uid === v.uid)?.name ?? data.vfById.get(v.defId)?.name ?? v.defId}</b>: {v.why}
          </li>
        ))}
        {other.map(([k, why]) => (
          <li key={k}>
            <b>{k === 'house' ? `House ${HOUSE_BY_ID[c.house ?? '']?.name ?? ''}` : k.startsWith('art:') ? ART_NAMES[k.slice(4) as Art] : k.startsWith('char:') ? CHAR_NAMES[k.slice(5) as Characteristic] : k}</b>: {why}
          </li>
        ))}
        {abilities.map((a) => (
          <li key={a.uid}>
            <b>{d.abilityByUid.get(a.uid)?.name ?? a.abilityId}</b>: {a.why}
          </li>
        ))}
        {spells.map((s) => (
          <li key={s.uid}>
            <b>{s.spell.name}</b>: {s.why}
          </li>
        ))}
      </ul>
    </Card>
  );
}
