// Mythic (Characteristic) (Houses of Hermes: True Lineages): a specialty for a positive Characteristic.
// When the circumstance applies to a roll of that Characteristic, the score counts one higher and the
// roll takes one botch die fewer. The roll's own card shows a box for each such specialty it uses.

import { CHAR_NAMES, type Characteristic } from '../data';
import type { DerivedCharacter } from '../engine/character/derive';

/** The specialties a character has for these Characteristics. */
export const mythicFor = (d: DerivedCharacter | undefined, chars: Characteristic[]) => (d?.charSpecialties ?? []).filter((s) => chars.includes(s.char as Characteristic));

/** +1 for each Characteristic whose specialty is ticked as applying to this roll. */
export const mythicBonus = (d: DerivedCharacter | undefined, on: string[], char: Characteristic) => (on.includes(char) && mythicFor(d, [char]).length ? 1 : 0);

export function MythicToggle({ d, chars, on, onChange }: { d?: DerivedCharacter; chars: Characteristic[]; on: string[]; onChange: (on: string[]) => void }) {
  const specs = mythicFor(d, chars);
  if (!specs.length) return null;
  return (
    <span className="row tight small" style={{ flexWrap: 'wrap' }} data-tour="mythic-toggle">
      {specs.map((s) => (
        <label key={s.char} className="inline good-text" title={`${s.from}: when its specialty applies to the roll, the Characteristic counts one higher and the roll takes one botch die fewer`}>
          <input type="checkbox" checked={on.includes(s.char)} onChange={(e) => onChange(e.target.checked ? [...on, s.char] : on.filter((x) => x !== s.char))} /> Mythic{' '}
          {CHAR_NAMES[s.char as Characteristic]}
          {s.text ? ` (${s.text})` : ''} applies: +1, one botch die fewer
        </label>
      ))}
    </span>
  );
}
