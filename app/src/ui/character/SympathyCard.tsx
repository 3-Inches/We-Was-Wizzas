// Sympathy Traits (Realms of Power: Faerie, Sympathy): kept on the character's sheet with its Faerie Rank.
// A trait is a subject the Faerie realm ties the character to, positive (attraction) or negative
// (opposition). They come from Faerie Sympathy, Antipathy and Background, and from Faerie Calling; the
// rolls that change them in play are on the Game Table, Dice › Faerie.

import { expectedTraits, faerieRank, hasSympathy, sympathyCap, sympathyStep } from '../../engine/faerieWizardry';
import { uid } from '../../util/id';
import type { SympathyTrait } from '../../engine/types';
import { Card, Field, Stepper, signed } from '../kit';
import type { CharEditor } from './useChar';

export function SympathyCard({ ed }: { ed: CharEditor }) {
  const { c, d, update } = ed;
  if (!c || !d || !hasSympathy(c)) return null;
  const traits = c.sympathy ?? [];
  const cap = sympathyCap(c, d);
  const want = expectedTraits(c);
  const missing = want.length - traits.length;
  const rank = faerieRank(traits);
  const set = (u: string, fn: (t: SympathyTrait) => void) => update((x) => { const t = x.sympathy?.find((y) => y.uid === u); if (t) fn(t); });
  return (
    <Card title="Sympathy Traits" tour="sympathy" fold="sympathy" summary={`${traits.map((t) => `${t.trait || '…'} ${signed(t.score)}`).join(', ') || 'none yet'} · Faerie Rank ${signed(rank)}`}>
      <p className="small muted" style={{ marginTop: 0 }}>
        A subject the Faerie realm ties this character to, narrower than a Form (Dawn, Hounds, Iron). A positive trait can stand in for an Ability&apos;s specialty, adding its score; the
        worst negative one that applies comes off the Ability and adds a botch die. Raised by experience up to {cap} here (the Warping Score, with Faerie Blood or Upbringing and Faerie
        Sympathy). <b>Faerie Rank {signed(rank)}</b>: the highest positive trait with the lowest negative one.
      </p>
      {traits.map((t) => (
        <div key={t.uid} className="row">
          <Field label="Trait">
            <input value={t.trait} onChange={(e) => set(t.uid, (y) => void (y.trait = e.target.value))} placeholder="e.g. Winter" style={{ width: 140 }} />
          </Field>
          <Field label="Score">
            <Stepper value={t.score} min={-10} max={10} width={36} onChange={(v) => set(t.uid, (y) => void ((y.score = v), (y.xp = 0)))} />
          </Field>
          <span className="small muted">
            {t.xp ?? 0}/{sympathyStep(t.score)} xp to {signed(t.score + 1)}
          </span>
          {Math.abs(t.score) > cap && t.score > 0 && <span className="small warn-text">above {cap}: experience will not raise it further</span>}
          <button className="small ghost" aria-label="Remove the trait" onClick={() => update((x) => void (x.sympathy = x.sympathy?.filter((y) => y.uid !== t.uid)))}>
            ✕
          </button>
        </div>
      ))}
      <div className="row">
        <button className="small" onClick={() => update((x) => void (x.sympathy = [...(x.sympathy ?? []), { uid: uid(), trait: '', score: want[traits.length]?.score ?? 1 }]))}>
          + Sympathy Trait{want[traits.length] ? ` (${want[traits.length].from}, ${signed(want[traits.length].score)})` : ''}
        </button>
        {missing > 0 && <span className="small warn-text">Its Virtues and Flaws give {want.length} trait{want.length === 1 ? '' : 's'}: {missing} still to add.</span>}
      </div>
    </Card>
  );
}
