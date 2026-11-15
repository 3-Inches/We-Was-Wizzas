// A Bjornaer's statistics in heartbeast form: the core book's beast with the magus's Characteristics
// folded in (Houses of Hermes: Mystery Cults, Statistics of Shapechangers).

import { CHAR_NAMES } from '../../../data';
import { HEARTBEASTS } from '../../../data/houses';
import { beastFor, heartbeastForm } from '../../../engine/heartbeast';
import { BookBadge, Card, signed } from '../../kit';
import type { CharEditor } from '../useChar';

const ORDER = ['Int', 'Per', 'Pre', 'Com', 'Str', 'Sta', 'Dex', 'Qik'] as const;

export function HeartbeastFormCard({ ed }: { ed: CharEditor }) {
  const { c, d } = ed;
  if (!c || !d || c.house !== 'bjornaer') return null;
  const form = heartbeastForm(d);
  return (
    <Card title={<h3>In heartbeast form{c.heartbeast ? `: ${c.heartbeast}` : ''} <BookBadge book="HoH_MC" line={818} /></h3>} tour="heartbeast-form" fold="heartbeast-form">
      {!form ? (
        <p className="small" style={{ margin: 0 }}>
          {c.heartbeast ? `The core book gives no statistics for “${c.heartbeast}”.` : 'No heartbeast chosen yet (the House step).'} The toolkit folds the magus’s statistics into the
          beasts it does give: {HEARTBEASTS.filter((h) => beastFor(h)).join(', ')} (the wildcat on the cat’s, the aurochs on the bull’s, the wild horse on the courser’s). For another, work the beast out with the storyguide from <i>Creating Mundane Beasts</i> (DE) or the
          appendix of <i>Houses of Hermes: Mystery Cults</i>.
        </p>
      ) : (
        <>
          <p className="small soft" style={{ marginTop: 0 }}>
            The {form.beast.name.toLowerCase()} of the core book <BookBadge book="DE" line={form.beast.line} /> with {c.name || 'the magus'}’s own Characteristics folded in: Intelligence is kept;
            for the rest, both negative takes the lower, both positive the higher, otherwise the two are added. Wounds carry over between forms.
          </p>
          <div className="row small" style={{ flexWrap: 'wrap', gap: 10 }} data-tour="heartbeast-chars">
            {ORDER.map((k) => (
              <span key={k} title={form.notes[k]}>
                <b>{CHAR_NAMES[k as keyof typeof CHAR_NAMES] ?? k}</b> {signed(form.characteristics[k])}
              </span>
            ))}
            <span title={form.sizeNote}>
              <b>Size</b> {signed(form.size)}
              {form.sizeNote ? ` (${form.sizeNote})` : ''}
            </span>
            <span title={form.soakFrom.length ? `with the magus's own ${form.soakFrom.join(', ')}` : undefined}>
              <b>Soak</b> {signed(form.soak)}
              {form.soakFrom.length ? ` (with ${form.soakFrom.join(', ')})` : ''}
            </span>
          </div>
          <table className="small" style={{ marginTop: 6 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Attack</th>
                <th>Init</th>
                <th>Atk</th>
                <th>Def</th>
                <th>Dam</th>
              </tr>
            </thead>
            <tbody>
              {form.combat.map((a) => (
                <tr key={a.name}>
                  <td>{a.name}</td>
                  <td>{signed(a.init)}</td>
                  <td>{signed(a.attack)}</td>
                  <td>{signed(a.defense)}</td>
                  <td>{a.damage === null ? 'n/a' : signed(a.damage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="small" style={{ marginTop: 6 }}>
            <div>
              <b>Abilities (the beast’s General ones; the magus keeps languages, lores, and Academic, Arcane and Supernatural Abilities):</b> {form.beast.abilities}
            </div>
            <div>
              <b>Virtues and Flaws (the beast’s, and the magus’s own that still apply, each once: a Lame magus is a lame beast):</b> {form.beast.virtues}
            </div>
            <div>
              <b>Qualities:</b> {form.beast.qualities}
            </div>
            <div className="muted">
              Fatigue: {form.beast.fatigue}. Wound Penalties by the beast’s Size: {form.beast.wounds}. Casting without words or gestures costs −15; Animal spells affect the magus, not Corpus or
              Mentem.
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
