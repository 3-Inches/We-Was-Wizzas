// Enchantments printed in the books (Hermetic Projects' devices, and the item effects other books
// set out like spells: see tools/extract/extract_spells.py), as effects an item can take:
// the effect level is rebuilt from the book's design (its base and the magnitudes before the item
// modifiers), and the uses, Penetration and triggers from what the book says of the item.

import enchantmentsJson from '../data/generated/enchantments.json';
import type { Art, Form, SourceRef, Technique } from '../data/types';
import { modifiedEffectLevel } from './enchant';
import { addMagnitudes } from './spellDesign';
import type { EnchantedEffectRecord } from './types';
import { uid } from '../util/id';

export interface BookEnchantment {
  id: string;
  name: string;
  technique: Technique;
  form: Form;
  requisites: Art[];
  /** the book's final level, item modifiers included */
  level: number | null;
  range: string;
  duration: string;
  target: string;
  text: string;
  design: string | null;
  penetration: number;
  /** '1' … '50', 'unlimited', or 'constant' */
  uses: string | null;
  itemNotes: string;
  source: SourceRef;
}

export const BOOK_ENCHANTMENTS = enchantmentsJson as unknown as BookEnchantment[];

/** The effect level before the item modifiers: the base and the magnitudes listed before the “;” of the design. */
export function effectLevelOf(e: Pick<BookEnchantment, 'design' | 'level'>): number {
  const design = e.design ?? '';
  const m = design.match(/^Base\s+(\d+)/i);
  if (!m) return e.level ?? 1;
  const spell = design.split(';')[0];
  const mags = [...spell.matchAll(/\+\s*(\d+)\s+(?!levels?\b)([A-Za-z])/g)].reduce((s, x) => s + Number(x[1]), 0);
  return addMagnitudes(Number(m[1]), mags);
}

/** As an effect of an item: a constant effect is two uses a day with an environmental trigger (+4 levels). */
export function enchantmentToEffect(e: BookEnchantment): EnchantedEffectRecord {
  const d = `${e.design ?? ''} ${e.itemNotes}`.toLowerCase();
  const constant = e.uses === 'constant';
  const baseLevel = effectLevelOf(e);
  const effect: EnchantedEffectRecord = {
    uid: uid(),
    name: e.name,
    technique: e.technique,
    form: e.form,
    requisites: [...e.requisites],
    baseLevel,
    range: e.range,
    duration: e.duration,
    target: e.target,
    usesPerDay: constant ? '2' : (e.uses ?? '1'),
    penetration: e.penetration,
    concentration: /maintains? concentration/.test(d),
    effectUse: /restricted use|effect use/.test(d),
    environmentalTrigger: constant || /environmental trigger/.test(d),
    fastTrigger: /fast trigger/.test(d),
    linkedTrigger: /linked trigger/.test(d),
    expiry: 'none',
    modifiedLevel: e.level ?? baseLevel,
    description: `${e.text}${e.design ? ` (${e.design})` : ''}`.trim(),
  };
  // where the design is not printed, or has modifiers the toolkit does not list (more triggers,
  // Penetration counted in levels), the effect level is worked back from the book's total
  const total = modifiedEffectLevel(effect).level;
  if (e.level && total !== e.level) effect.baseLevel = Math.max(1, e.level - (total - effect.baseLevel));
  effect.modifiedLevel = modifiedEffectLevel(effect).level;
  return effect;
}
