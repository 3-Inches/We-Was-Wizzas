// A magic being's Essential Traits (RoP: Magic): its true form, typically +3; every Personality Trait
// of a being of Magic Might; and those its Essential Virtues and Flaws give. They do not change easily,
// it cannot act against them, and magic cannot force it to.

import { useState } from 'react';
import { CHARACTERISTICS, CHAR_NAMES } from '../../data';
import { essentialTraits, hasMagicMight, trueFormName, trueFormTrait, withCharacterTrait } from '../../engine/character/magicCharacter';
import { uid } from '../../util/id';
import { BookBadge, Card, signed } from '../kit';
import type { CharEditor } from './useChar';

/** Does this character have, or ought to have, Essential Traits? */
export function hasEssentialTraits(c: CharEditor['c']): boolean {
  return !!c && (hasMagicMight(c) || !!c.creature?.magicCharacter || c.virtues.some((v) => v.defId === 'essential-virtue' || v.defId === 'essential-flaw-flaw'));
}

export function EssentialTraitsCard({ ed }: { ed: CharEditor }) {
  const { c, d, data, update } = ed;
  const [form, setForm] = useState('');
  if (!c || !d || !hasEssentialTraits(c)) return null;
  const magic = hasMagicMight(c) || !!c.creature?.magicCharacter;
  const suggested = form || trueFormName(c.creature?.kind === 'human' ? 'Person' : c.name);
  const traits = essentialTraits(c, (id) => data.vfById.get(id)?.name ?? id);
  // a trait naming a Characteristic in its words (“Sure-footed (Dex)”) shows what it makes of it
  const tiedTo = (t: string) => CHARACTERISTICS.find((k) => new RegExp(`\\b(${k}|${CHAR_NAMES[k]})\\b`, 'i').test(t));
  return (
    <Card title={<h3>Essential Traits <BookBadge book="RoP_M" line={2894} /></h3>}>
      <p className="small" style={{ marginTop: 0 }}>
        Part of what the character is, not how it feels today: it cannot act against them, they hardly ever change, and magic that would force it to go against one simply fails.
        They are marked with an asterisk.
      </p>
      {magic && !trueFormTrait(c) && (
        <div className="row small warn-text" style={{ flexWrap: 'wrap', marginBottom: 6 }}>
          <span>Every magic character has one for its true form, typically +3 (Raven*, Person*, Tree*).</span>
          <input value={suggested} onChange={(e) => setForm(e.target.value)} placeholder="Raven" style={{ width: 120 }} aria-label="Its true form" />
          <button className="small" disabled={!suggested.trim()} onClick={() => update((x) => void x.personality.unshift({ uid: uid(), trait: `${trueFormName(suggested)}*`, score: 3 }))}>
            Add {trueFormName(suggested) || 'it'}* +3
          </button>
        </div>
      )}
      {traits.length ? (
        traits.map((t, i) => {
          const k = tiedTo(t.trait);
          return (
            <div key={i} className="list-row small" style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
              <b>
                {t.trait} {signed(t.score)}
              </b>
              <span className="muted">{t.source}</span>
              {k && (
                <span>
                  {CHAR_NAMES[k]} {signed(d.characteristics[k].value)} becomes {signed(withCharacterTrait(d.characteristics[k].value, t.score))} when it applies
                </span>
              )}
            </div>
          );
        })
      ) : (
        <div className="small muted">None yet.</div>
      )}
      <details className="small" style={{ marginTop: 6 }}>
        <summary>How a trait tied to a Characteristic works</summary>
        <p style={{ margin: '4px 0' }}>
          A trait such as Sure-footed (Dexterity) or Shy (Presence) changes that Characteristic whenever it applies. If both are good, use the better of the two; if both are bad, use the
          worse; otherwise add them together. So Dexterity +1 with Sure-footed* +3 rolls +3, and Presence −1 with Shy* −3 rolls −3.
        </p>
        {magic && (
          <p style={{ margin: '4px 0' }}>
            A being of Magic Might has all its Personality Traits Essential, and a Personality Flaw gives it one too. Essential Virtue (+3 Minor, +6 Major) and Essential Flaw (−3, −6)
            add more: take them on the Virtues step.
          </p>
        )}
      </details>
    </Card>
  );
}
