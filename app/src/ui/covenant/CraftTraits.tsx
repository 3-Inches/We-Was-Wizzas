// The Virtues and Flaws that matter at a craftsman's work, shown where the craftsman is: green for what
// helps, red for what holds them back, each with what it does (craftTraits.ts). On the covenant's
// craftsmen they can be added (as the troupe learns them) and taken off once got over in play.

import { useState } from 'react';
import { SPECIALIST_TRAITS, TRAIT_NAMES, traitApplies, workMod, type CraftTraitNote } from '../../engine/craftTraits';
import type { Specialist } from '../../engine/types';

const sign = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);

/** What a trait does, short: "−2 to the work", "+3 on fine work by eye". */
export function traitEffect(t: CraftTraitNote): string {
  if (t.work) return `${sign(t.work)} to the work`;
  if (t.when) return `${sign(t.when.mod)} on ${t.when.work.replace(/ \(.*\)$/, '')}`;
  if (t.cannot) return 'cannot work most crafts';
  return t.text.split(/[:;(]/)[0].trim();
}

/** Badges for the traits, each saying what it does at the work (and where the rule is, on hover). */
export function TraitBadges({ traits, onRemove }: { traits: CraftTraitNote[]; onRemove?: (id: string) => void }) {
  if (!traits.length) return null;
  return (
    <>
      {traits.map((t) => (
        <span key={t.id} className={`badge ${t.good ? 'good' : 'bad'}`} title={`${t.text} (${t.ref})`}>
          {t.name}: {traitEffect(t)}
          {onRemove && (
            <button className="small ghost" style={{ padding: '0 2px', minHeight: 0 }} aria-label={`${t.name} no longer counts`} title={t.good ? 'Remove it' : 'Got over it in play (healed by magic, or a story): it no longer counts'} onClick={() => onRemove(t.id)}>
              ✕
            </button>
          )}
        </span>
      ))}
    </>
  );
}

/** "Works at 4 (Craft 6)", or nothing when the traits do not change the score. */
export function worksAt(traits: CraftTraitNote[], score: number): string {
  const m = workMod(traits);
  return m ? `works at ${Math.max(0, score + m)} (Craft ${score} ${sign(m)})` : '';
}

/**
 * A covenant craftsman's traits, editable: each a badge, ✕ when got over; and a list to add one the
 * troupe learns of. A single person only: a group of craftsmen counts as ordinary ones.
 */
export function SpecialistTraitsEditor({ s, set, traits }: { s: Specialist; set: (fn: (x: Specialist) => void) => void; traits: CraftTraitNote[] }) {
  const [pick, setPick] = useState('');
  const craft = s.ability.replace(/^Craft \((.*)\)$/, '$1');
  const have = new Set(s.traits ?? []);
  const options = SPECIALIST_TRAITS.filter((t) => !have.has(t.id) && traitApplies(t, craft) && (!t.id.includes('puissant') || !have.has('puissant-ability')));
  return (
    <span className="row tight small" style={{ flexBasis: '100%', flexWrap: 'wrap' }}>
      <TraitBadges traits={traits.filter((t) => have.has(t.id))} onRemove={(id) => set((x) => void ((x.traits = (x.traits ?? []).filter((y) => y !== id)), !x.traits.length && (x.traits = undefined)))} />
      {(s.count ?? 1) === 1 && (
        <select
          value={pick}
          aria-label="A Virtue or Flaw that matters at their work"
          onChange={(e) => {
            const id = e.target.value;
            setPick('');
            if (id) set((x) => void (x.traits = [...(x.traits ?? []), id]));
          }}
        >
          <option value="">+ a Virtue or Flaw at the work…</option>
          <optgroup label="Helps">
            {options.filter((t) => t.good).map((t) => (
              <option key={t.id} value={t.id}>
                {(TRAIT_NAMES[t.id] ?? t.id).replace(/ Craft$/, ` ${craft}`)}: {t.work ? `${sign(t.work)} to the work` : t.when ? `${sign(t.when.mod)} on ${t.when.work.replace(/ \(.*\)$/, '')}` : t.text.split(/[:;(]/)[0]}
              </option>
            ))}
          </optgroup>
          <optgroup label="Holds them back">
            {options.filter((t) => !t.good).map((t) => (
              <option key={t.id} value={t.id}>
                {TRAIT_NAMES[t.id] ?? t.id}: {t.work ? `${sign(t.work)} to the work` : t.when ? `${sign(t.when.mod)} on ${t.when.work.replace(/ \(.*\)$/, '')}` : t.text.split(/[:;(]/)[0]}
              </option>
            ))}
          </optgroup>
        </select>
      )}
    </span>
  );
}
