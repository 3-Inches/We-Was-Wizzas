// A character's own pounds and vis: the covenant's allowance, gifts, and what they bought.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { lsd } from '../../../engine/economy';
import { visText } from '../../../engine/vis';
import type { CharEditor } from '../useChar';

export function PurseCard({ ed }: { ed: CharEditor }) {
  const { c, saga } = ed;
  const [open, setOpen] = useState(false);
  if (!c || !saga) return null;
  const p = c.purse ?? { pounds: 0, vis: [] };
  const log = (p.log ?? []).slice(-8).reverse();
  return (
    <div className="small">
      <div className="row">
        <b>Purse:</b>
        <span>{lsd(p.pounds)}</span>
        <span className="muted">{p.vis.length ? `vis: ${visText(p.vis)}` : 'no vis'}</span>
        {log.length > 0 && (
          <span className="clickable muted" onClick={() => setOpen((v) => !v)}>
            {open ? 'hide record' : `record (${p.log!.length})`}
          </span>
        )}
        <Link to={`/saga/${saga.id}/market`}>Market &amp; treasury ›</Link>
      </div>
      {open && (
        <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
          {log.map((l, i) => (
            <li key={i}>
              <span className="muted">
                {l.season} {l.year}:
              </span>{' '}
              {l.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
