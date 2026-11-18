// Game Table › Dice › Hedge magic: Mythic Herbalism (Hedge Magic, Revised Edition, the learned magicians'
// Virtues). A cure, a poison or a potion of vigor, brewed over days and rolled on Intelligence + Mythic
// Herbalism against the Ease Factor of the chosen effect.

import { useState } from 'react';
import { HERBALISM_TABLE } from '../../data/hedgeLearned';
import { describeStress, stressDie } from '../../engine/dice';
import { herbalismBrew } from '../../engine/learnedMagic';
import { Card, Field, Stepper } from '../kit';
import type { CharEditor } from '../character/useChar';

/** Someone who brews: the Mythic Herbalism Virtue or Ability. */
export { hasHerbalism } from '../../engine/hedgeTraditions';

type Kind = 'healing' | 'poison' | 'physical';
const KINDS: { v: Kind; label: string }[] = [
  { v: 'healing', label: 'a cure (unguent or poultice)' },
  { v: 'poison', label: 'a poison or antidote' },
  { v: 'physical', label: 'a potion of vigor (lasts a day)' },
];

export function HerbalismCard({ ed }: { ed: CharEditor }) {
  const { d } = ed;
  const [kind, setKind] = useState<Kind>('healing');
  const [row, setRow] = useState(2);
  const [doses, setDoses] = useState(1);
  const [contact, setContact] = useState(false);
  const [line, setLine] = useState('');
  if (!d) return null;
  const r = HERBALISM_TABLE[row];
  const b = herbalismBrew(d, r.ease, doses, kind === 'poison' && contact);
  const roll = () => {
    const die = stressDie(1);
    const t = b.total + die.value;
    const botch = die.botches > 0;
    setLine(
      `Intelligence + Mythic Herbalism ${b.total} + stress die ${describeStress(die)} = ${t} against ${b.ease}: ${
        botch ? 'BOTCH: the concoction may poison its maker or whoever takes it (the storyguide decides).' : t >= b.ease ? `${doses} dose${doses === 1 ? '' : 's'} made. Unused, it loses its power after a season.` : 'it fails, and the brew is useless.'
      }`,
    );
  };
  return (
    <Card title="Mythic Herbalism" tour="herbalism" fold="herbalism" summary={`${r[kind]}: Ease Factor ${b.ease}, ${b.days} days`}>
      <p className="small muted" style={{ marginTop: 0 }}>
        Cures, poisons and potions brewed from herbs of a Magic aura, with a few tools and a fire. An apothecary can gather the herbs. Choose the effect, then roll at the end of the brewing.
      </p>
      <div className="row">
        <Field label="Brew">
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            {KINDS.map((k) => (
              <option key={k.v} value={k.v}>{k.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Effect">
          <select value={row} onChange={(e) => setRow(Number(e.target.value))} style={{ maxWidth: 360 }}>
            {HERBALISM_TABLE.map((x, i) => (
              <option key={x.ease} value={i}>{x.ease}: {x[kind]}</option>
            ))}
          </select>
        </Field>
        <Field label="Doses" hint="Each dose past the first adds 1 to the Ease Factor, but no time">
          <Stepper value={doses} min={1} max={20} width={32} onChange={setDoses} />
        </Field>
        {kind === 'poison' && (
          <label className="inline small">
            <input type="checkbox" checked={contact} onChange={(e) => setContact(e.target.checked)} /> works on the skin (+3)
          </label>
        )}
      </div>
      <p className="small">
        Ease Factor <b>{b.ease}</b>; {b.days} days of brewing. Intelligence + Mythic Herbalism {b.total} + stress die.
        {kind === 'physical' ? ' Potions do not add up: one bonus of each kind at a time.' : ''}
        {kind === 'healing' && r.ease >= 9 && r.ease <= 15 ? ' A poultice lasts a month; with a spell, only the larger Recovery bonus counts.' : ''}
      </p>
      <button onClick={roll}>Roll Mythic Herbalism</button>
      {line && (
        <div className="log small" aria-live="polite">
          {line}
        </div>
      )}
    </Card>
  );
}
