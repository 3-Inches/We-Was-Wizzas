import { uid } from '../../../util/id';
import { Card, Field, Stepper } from '../../kit';
import type { CharEditor } from '../useChar';
import EquipmentEditor from '../EquipmentEditor';

export default function DetailsStep({ ed }: { ed: CharEditor }) {
  const { c, d, update } = ed;
  if (!c || !d) return null;
  return (
    <>
      <Card title="Personality Traits" className="accent">
        <p className="small muted" style={{ marginTop: 0 }}>
          A few words, each scored –3 to +3. Represent a Minor Personality Flaw with ±3 and a Major one with ±6. Grogs should have Loyal; warriors should have Brave.
        </p>
        {c.personality.map((p) => (
          <div key={p.uid} className="row" style={{ marginBottom: 4 }}>
            <input value={p.trait} onChange={(e) => update((x) => void (x.personality.find((y) => y.uid === p.uid)!.trait = e.target.value))} placeholder="Trait" />
            <Stepper value={p.score} min={-6} max={6} onChange={(v) => update((x) => void (x.personality.find((y) => y.uid === p.uid)!.score = v))} />
            <button className="small ghost" onClick={() => update((x) => void (x.personality = x.personality.filter((y) => y.uid !== p.uid)))}>
              ✕
            </button>
          </div>
        ))}
        <div className="row">
          <button className="small" onClick={() => update((x) => void x.personality.push({ uid: uid(), trait: '', score: 1 }))}>
            + Trait
          </button>
          {['Brave', 'Loyal', 'Pious', 'Curious', 'Proud', 'Kind'].map((t) => (
            <button key={t} className="small ghost" onClick={() => update((x) => void x.personality.push({ uid: uid(), trait: t, score: 1 }))}>
              {t}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-2">
        <Card title="Reputations">
          {d.reputations.filter((r) => r.fromVirtue).map((r, i) => (
            <div key={i} className="small">
              <b>{r.text}</b> {r.score} ({r.scope}) <span className="muted">— from {r.fromVirtue}</span>
            </div>
          ))}
          {c.reputations.map((r) => (
            <div key={r.uid} className="row" style={{ marginBottom: 4 }}>
              <input value={r.text} placeholder="Reputation" onChange={(e) => update((x) => void (x.reputations.find((y) => y.uid === r.uid)!.text = e.target.value))} />
              <input value={r.scope} placeholder="Type (Local, Hermetic…)" style={{ width: 120 }} onChange={(e) => update((x) => void (x.reputations.find((y) => y.uid === r.uid)!.scope = e.target.value))} />
              <Stepper value={r.score} min={-10} max={10} onChange={(v) => update((x) => void (x.reputations.find((y) => y.uid === r.uid)!.score = v))} />
              <button className="small ghost" onClick={() => update((x) => void (x.reputations = x.reputations.filter((y) => y.uid !== r.uid)))}>
                ✕
              </button>
            </div>
          ))}
          <button className="small" onClick={() => update((x) => void x.reputations.push({ uid: uid(), text: '', scope: 'Local', score: 1 }))}>
            + Reputation
          </button>
        </Card>
        <Card title="Confidence & more">
          {c.type === 'grog' ? (
            <p className="small muted">Grogs do not have Confidence.</p>
          ) : (
            <div className="row">
              <Field label="Confidence Score">
                <Stepper value={d.confidence.score} min={0} max={10} onChange={(v) => update((x) => void (x.confidence = { ...d.confidence, score: v }))} />
              </Field>
              <Field label="Confidence Points">
                <Stepper value={d.confidence.points} min={0} max={30} onChange={(v) => update((x) => void (x.confidence = { ...d.confidence, points: v }))} />
              </Field>
            </div>
          )}
          <Field label="Starting Warping Points" hint="Merinita without a faerie Virtue/Flaw start with 1; Warped by Magic gives 5.">
            <Stepper value={c.warpingPoints} min={0} max={200} onChange={(v) => update((x) => void (x.warpingPoints = v))} />
          </Field>
          {c.type === 'magus' && (
            <Field label="Wizard's sigil" hint="A recurring quirk in all your spells (DE p.224).">
              <input value={c.sigil ?? ''} onChange={(e) => update((x) => void (x.sigil = e.target.value))} placeholder="e.g. a faint smell of roses" />
            </Field>
          )}
        </Card>
      </div>

      <EquipmentEditor ed={ed} />
    </>
  );
}
