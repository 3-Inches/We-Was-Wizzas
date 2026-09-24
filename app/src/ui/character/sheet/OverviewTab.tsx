import { useState } from 'react';
import { CHARACTERISTICS, CHAR_NAMES } from '../../../data';
import { BookBadge, Card, Field, Markdown, Stepper, signed } from '../../kit';
import type { CharEditor } from '../useChar';
import { useSagaCovenants } from '../../../store/hooks';
import { useStore } from '../../../store/store';

export default function OverviewTab({ ed }: { ed: CharEditor }) {
  const { c, d, update, saga } = ed;
  const [openVf, setOpenVf] = useState<string | null>(null);
  const covs = useSagaCovenants(saga?.id);
  const updateCovenant = useStore((s) => s.updateCovenant);
  if (!c || !d || !saga) return null;
  return (
    <div className="stack">
      <div className="grid grid-2">
        <Card title="Characteristics" className="accent">
          <div className="char-grid">
            {CHARACTERISTICS.map((k) => (
              <div key={k} className="stat" title={d.characteristics[k].notes.join(', ')}>
                <span className="v">{signed(d.characteristics[k].value)}</span>
                <span className="l">{CHAR_NAMES[k]}</span>
                {c.characteristicNotes?.[k] && <span className="small muted">{c.characteristicNotes[k]}</span>}
                {(c.agingPoints[k] ?? 0) > 0 && <span className="small warn-text">{c.agingPoints[k]} aging pt</span>}
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <div className="stat">
              <span className="v">{signed(d.size)}</span>
              <span className="l">Size</span>
            </div>
            <div className="stat">
              <span className="v">{c.age}</span>
              <span className="l">Age</span>
            </div>
            <div className="stat">
              <span className="v">{d.warpingScore}</span>
              <span className="l">Warping ({d.warpingPoints})</span>
            </div>
            <div className="stat">
              <span className="v">{d.decrepitude}</span>
              <span className="l">Decrepitude</span>
            </div>
            {c.type !== 'grog' && (
              <div className="stat">
                <span className="v">
                  {c.confidence.score} ({c.confidence.points})
                </span>
                <span className="l">Confidence</span>
              </div>
            )}
          </div>
        </Card>
        <Card title="Standing">
          <Field label="Covenant">
            <select
              value={c.covenantId ?? ''}
              onChange={(e) => {
                const id = e.target.value || undefined;
                for (const cv of covs) if (cv.memberIds.includes(c.id) && cv.id !== id) updateCovenant(cv.id, (x) => void (x.memberIds = x.memberIds.filter((m) => m !== c.id)));
                if (id) updateCovenant(id, (x) => void (!x.memberIds.includes(c.id) && x.memberIds.push(c.id)));
                update((x) => void (x.covenantId = id));
              }}
            >
              <option value="">— none —</option>
              {covs.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.name}
                </option>
              ))}
            </select>
          </Field>
          {c.type !== 'grog' && (
            <div className="row" style={{ marginTop: 8 }}>
              <span>Confidence points:</span>
              <Stepper value={c.confidence.points} min={0} max={99} onChange={(v) => update((x) => void (x.confidence.points = v))} />
              <button className="small" disabled={c.confidence.points < 1} onClick={() => update((x) => void (x.confidence.points -= 1))} title="Spend a point for +3 to a roll (max Confidence Score points per roll)">
                Spend 1 (+3)
              </button>
              <span className="small muted">Score {c.confidence.score}</span>
            </div>
          )}
          <div className="small" style={{ marginTop: 8 }}>
            <b>Personality:</b> {c.personality.map((p) => `${p.trait} ${signed(p.score)}`).join(', ') || '—'}
          </div>
          <div className="small">
            <b>Reputations:</b> {d.reputations.map((r) => `${r.text} ${r.score} (${r.scope})`).join(', ') || '—'}
          </div>
          {d.giftType !== 'none' && (
            <div className="small">
              <b>The Gift:</b> {d.giftType}
              {d.socialPenalty ? ` — ${d.socialPenalty} to social rolls with mundanes and animals` : ' — no social penalty'}
            </div>
          )}
          {c.sigil && (
            <div className="small">
              <b>Sigil:</b> {c.sigil}
            </div>
          )}
        </Card>
      </div>
      <Card title="Virtues & Flaws">
        <div className="grid grid-2">
          {(['virtue', 'flaw'] as const).map((k) => (
            <div key={k}>
              <h4>{k === 'virtue' ? 'Virtues' : 'Flaws'}</h4>
              {d.virtues
                .filter((v) => (v.def?.kind ?? 'virtue') === k)
                .map((v) => (
                  <div key={v.cv.uid} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div className="row">
                      <span className="clickable" onClick={() => setOpenVf(openVf === v.cv.uid ? null : v.cv.uid)}>
                        <b>{v.name}</b>
                      </span>
                      <span className="badge">{v.cv.size}</span>
                      {v.def?.categories.map((cat) => (
                        <span key={cat} className="badge">
                          {cat}
                        </span>
                      ))}
                      {v.def && <BookBadge book={v.def.source.book} anchor={v.def.source.anchor} line={v.def.source.line} />}
                    </div>
                    {openVf === v.cv.uid && v.def && <Markdown text={v.def.text} />}
                    {v.def?.effects?.filter((e) => e.type === 'note').map((e, i) => (
                      <div key={i} className="small soft">
                        {(e as { text: string }).text}
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </Card>
      <Card title="Notes">
        <textarea value={c.notes} rows={6} onChange={(e) => update((x) => void (x.notes = e.target.value))} placeholder="Session notes, goals, secrets…" />
      </Card>
    </div>
  );
}
