// A short hint for a new player at a place people get stuck. Shown while hints are on (sidebar →
// Display) until dismissed with "Got it"; the Guide page can bring dismissed hints back. A
// tutorial explains the same places, so hints step aside while one runs.

import type { ReactNode } from 'react';
import { useStore } from '../store/store';

export function Hint({ id, children }: { id: string; children: ReactNode }) {
  const on = useStore((s) => s.ui.hints && !s.ui.tour && !s.ui.dismissedHints.includes(id));
  const dismiss = useStore((s) => s.dismissHint);
  if (!on) return null;
  return (
    <div className="hint no-print" role="note">
      <span className="hint-mark" aria-hidden>
        ?
      </span>
      <div className="hint-text">{children}</div>
      <button className="small ghost" onClick={() => dismiss(id)} title="Hide this hint (hints can be turned off in the sidebar)">
        Got it
      </button>
    </div>
  );
}
