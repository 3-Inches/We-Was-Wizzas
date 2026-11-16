// An elementalist's Elemental Traits (Hedge Magic, Elemental Warping), kept on the sheet: one
// Personality Trait for each Elementalist Form held, the Warping Score + the Form ÷ 5 (rounded up). Each
// adds to Soak against its element and comes off Recovery from an illness of its humor; at +3 it acts as a
// Minor Personality Flaw, at +6 a Major one, at +10 the player loses control in its circumstances.

import { ELEMENTS } from '../../data/hedgeElemental';
import { elementalSoak, elementalTraits, humoralRecovery } from '../../engine/elementalMagic';
import { Card, signed } from '../kit';
import type { CharEditor } from './useChar';

const WEIGHT = { none: '', minor: 'as a Minor Personality Flaw', major: 'as a Major Personality Flaw', lost: 'the player no longer controls the character in its circumstances' } as const;

export function ElementalTraitsCard({ ed }: { ed: CharEditor }) {
  const { c, d } = ed;
  if (!c || !d) return null;
  const traits = elementalTraits(c, d);
  if (!traits.length) return null;
  return (
    <Card title="Elemental Traits" tour="elemental-traits" fold="elemental-traits" summary={traits.map((t) => `${t.trait} ${signed(t.score)}`).join(', ')}>
      <p className="small muted" style={{ marginTop: 0 }}>
        An elementalist&apos;s Warping shows in the four temperaments: each Form held brings a Trait of the Warping Score + the Form ÷ 5 (rounded up). It adds to Soak against its element, and
        comes off Recovery from an illness of its humor (the opposing Trait adds). The traits never cancel each other out.
      </p>
      {traits.map((t) => {
        const e = ELEMENTS.find((x) => x.id === t.element)!;
        return (
          <div key={t.element} className="row small">
            <b>
              {t.trait} {signed(t.score)}
            </b>
            <span>
              Soak {signed(elementalSoak(c, traits, t.element))} against {e.soak}; Recovery {signed(humoralRecovery(traits, t.element))} from a {t.trait.toLowerCase()} illness.
            </span>
            {t.weight !== 'none' && <span className="warn-text">{WEIGHT[t.weight]}</span>}
          </div>
        );
      })}
    </Card>
  );
}
