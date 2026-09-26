import type { CharType } from '../../data';
import type { Step } from '../../engine/character/validate';

export interface StepDef {
  id: Step | 'review';
  label: string;
  show: (t: CharType) => boolean;
}

export const STEPS: StepDef[] = [
  { id: 'basics', label: '1 · Concept', show: () => true },
  { id: 'house', label: '2 · House', show: (t) => t === 'magus' || t === 'mythic' },
  { id: 'virtues', label: 'Virtues & Flaws', show: () => true },
  { id: 'characteristics', label: 'Characteristics', show: () => true },
  { id: 'abilities', label: 'Abilities', show: () => true },
  { id: 'arts', label: 'Arts', show: (t) => t === 'magus' },
  { id: 'spells', label: 'Spells', show: (t) => t === 'magus' },
  { id: 'personality', label: 'Personality & Gear', show: () => true },
  { id: 'review', label: 'Review', show: () => true },
];

/** The wizard steps this kind of character goes through, numbered. */
export function visibleSteps(type: CharType): StepDef[] {
  return STEPS.filter((s) => s.show(type)).map((s, i) => ({
    ...s,
    label: s.id === 'house' && type === 'mythic' ? `${i + 1} · Mythic type` : s.label.replace(/^\d+ · /, `${i + 1} · `),
  }));
}

/** Index of a step in the wizard (equipment issues live on the Personality & Gear step). */
export function stepIndex(type: CharType, step: Step | 'review'): number {
  const id = step === 'equipment' ? 'personality' : step;
  const i = visibleSteps(type).findIndex((s) => s.id === id);
  return i < 0 ? 0 : i;
}
