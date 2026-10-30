// Calamities and the troubles they leave (engine/calamity.ts): what weighs on a covenant now, and a
// way to strike it with plague, fire, a monster, faeries, the Church, politics or a noble's lawsuit,
// by nature or by someone's hand. Folded to a line while there is no trouble.

import { useState } from 'react';
import { CALAMITIES, CALAMITY_BY_ID, SEVERITY_LABEL, strike, type Severity } from '../../engine/calamity';
import type { Covenant } from '../../engine/types';
import { useSagaCharacters, useSagaCovenants } from '../../store/hooks';
import { useStore } from '../../store/store';
import { uid } from '../../util/id';
import { Card, Field } from '../kit';

export function TroublesCard({ cov, compact }: { cov: Covenant; compact?: boolean }) {
  const saga = useStore((s) => s.sagas[cov.sagaId]);
  const chars = useSagaCharacters(cov.sagaId);
  const covs = useSagaCovenants(cov.sagaId);
  const putSagaState = useStore((s) => s.putSagaState);
  const updateCovenant = useStore((s) => s.updateCovenant);
  const setNotice = useStore((s) => s.setNotice);
  const [kind, setKind] = useState('plague');
  const [severity, setSeverity] = useState<Severity>(1);
  const [by, setBy] = useState('');
  const [byPlayers, setByPlayers] = useState(false);
  const [known, setKnown] = useState(false);
  const [open, setOpen] = useState(false);
  if (!saga) return null;
  const troubles = (cov.troubles ?? []).filter((t) => t.yearsLeft > 0 || t.lost);
  const players = covs.filter((c) => !c.living);
  const playersName = players.map((c) => c.name).filter(Boolean)[0] ?? 'your covenant';
  const def = CALAMITY_BY_ID.get(kind)!;

  const doStrike = () => {
    const before = { saga: structuredClone(saga), characters: structuredClone(chars), covenants: structuredClone(covs) };
    const next = structuredClone(before);
    const target = next.covenants.find((c) => c.id === cov.id)!;
    const members = next.characters.filter((c) => target.memberIds.includes(c.id));
    const hand = byPlayers ? playersName : by.trim() || undefined;
    const lines = strike(target, members, kind, severity, { year: saga.currentYear, season: saga.currentSeason, by: hand, byPlayers, known: byPlayers && known });
    target.log.push({ uid: uid(), year: saga.currentYear, season: saga.currentSeason, text: lines.join(' ') });
    // a living covenant that knows the players did it demands redress
    if (target.living && byPlayers && known)
      next.saga.tribunalNews = [
        {
          uid: uid(), year: saga.currentYear, season: saga.currentSeason, kind: 'approach', approachKind: 'trouble', covenantId: target.id,
          text: `${target.name} accuses ${playersName} of the ${def.label.split(' (')[0].toLowerCase()} and demands redress (vis, silver or a service), or it will bring charges before the Tribunal.`,
        },
        ...(next.saga.tribunalNews ?? []),
      ];
    putSagaState(next);
    setNotice(lines.join(' '), () => putSagaState(before));
    setOpen(false);
  };

  const body = (
    <>
      {troubles.map((t) => (
        <div key={t.uid} className="list-row small" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
          <span style={{ flex: 1, minWidth: 220 }}>
            <b>{t.label.split(' (')[0]}</b> ({SEVERITY_LABEL[t.severity]}, {t.season} {t.year}
            {t.by ? `, by ${t.by}'s hand${t.known ? ', and known' : ''}` : ''}):{' '}
            {t.yearsLeft > 0 ? `${t.yearsLeft} year${t.yearsLeft > 1 ? 's' : ''} left` : 'over'}
            {t.incomeMult ? `; income ×${t.incomeMult}` : ''}
            {t.skipVis?.length ? `; ${t.skipVis.length} vis source${t.skipVis.length > 1 ? 's' : ''} closed` : ''}
            {t.lost ? `; ${Object.values(t.lost).reduce((a, n) => a + (n ?? 0), 0)} covenfolk not yet replaced` : ''}.
            <details>
              <summary className="muted">What it did</summary>
              <span className="muted">{t.text}</span>
            </details>
          </span>
          {t.yearsLeft > 0 && (
            <button className="small" onClick={() => updateCovenant(cov.id, (x) => void (x.troubles = (x.troubles ?? []).map((y) => (y.uid === t.uid ? { ...y, yearsLeft: 0, lost: undefined } : y)).filter((y) => y.uid !== t.uid)))} title="A story has put it right">
              It is over
            </button>
          )}
        </div>
      ))}
      {troubles.length === 0 && <div className="small muted">Nothing weighs on {cov.name || 'the covenant'} now.</div>}
      {!open ? (
        <button className="small" style={{ marginTop: 6 }} onClick={() => setOpen(true)}>
          Something strikes {cov.name || 'the covenant'}…
        </button>
      ) : (
        <div className="stack small" style={{ marginTop: 6, borderTop: '1px solid var(--line)', paddingTop: 6 }}>
          <div className="row">
            <Field label="What">
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                {CALAMITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="How bad">
              <select value={severity} onChange={(e) => setSeverity(Number(e.target.value) as Severity)}>
                {([1, 2, 3] as Severity[]).map((s) => (
                  <option key={s} value={s}>
                    {SEVERITY_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <span className="muted">{def.text}</span>
          <div className="row">
            {cov.living && (
              <label className="inline">
                <input type="checkbox" checked={byPlayers} onChange={(e) => setByPlayers(e.target.checked)} /> {playersName} did this
              </label>
            )}
            {cov.living && byPlayers && (
              <label className="inline">
                <input type="checkbox" checked={known} onChange={(e) => setKnown(e.target.checked)} /> and they know it
              </label>
            )}
            {!byPlayers && (
              <Field label="By whose hand (if anyone's)">
                <input value={by} onChange={(e) => setBy(e.target.value)} placeholder="nature" style={{ width: 160 }} />
              </Field>
            )}
          </div>
          <div className="row">
            <button className="small danger" onClick={doStrike}>
              Strike
            </button>
            <button className="small ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
  if (compact) return <div style={{ marginTop: 6 }}>{body}</div>;
  return <Card title={`Troubles${troubles.length ? ` (${troubles.length})` : ''}`}>{body}</Card>;
}
