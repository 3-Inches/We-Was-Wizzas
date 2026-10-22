// Disease (Art & Academe, Disease and Treatment of Disease): catching a disease, its stages and
// Disease Penalty, the Disease Recovery roll at each interval, crises, and a physician's Prognosis.

import diseasesJson from '../data/generated/diseases.json';
import type { DerivedCharacter } from './character/derive';
import { defaultRng, describeStress, stressDie, type Rng } from './dice';
import type { Character, Illness, IllnessStage } from './types';
import { uid } from '../util/id';

export interface DiseaseDef {
  id: string;
  name: string;
  stage: IllnessStage;
  humor: string;
  severity: number;
  stable: number;
  /** null for a lifelong disease */
  improve: number | null;
  interval: Illness['interval'];
  cause: string;
  symptoms: string;
  source: { book: string; line: number };
}

export const DISEASES = diseasesJson as unknown as DiseaseDef[];
export const STAGES: IllnessStage[] = ['Minor', 'Serious', 'Major', 'Critical'];
/** The Disease Penalty of each stage; a Critical disease allows no action at all. */
export const STAGE_PENALTY: Record<IllnessStage, number | null> = { Minor: -1, Serious: -3, Major: -5, Critical: null };

export function illnessFrom(def: DiseaseDef): Illness {
  return { uid: uid(), name: def.name, diseaseId: def.id, stage: def.stage, severity: def.severity, stable: def.stable, improve: def.improve, interval: def.interval, bonus: 0 };
}

/** Severity moves with the stage: three for every step from where the disease began (Disease Table). */
export function currentSeverity(ill: Illness): number {
  const start = DISEASES.find((d) => d.id === ill.diseaseId)?.stage ?? ill.startStage ?? ill.stage;
  return ill.severity + 3 * (STAGES.indexOf(ill.stage) - STAGES.indexOf(start));
}

const corpusBonus = (d: DerivedCharacter) => (d.isMagus ? Math.floor((d.arts.Co?.score ?? 0) / 5) : 0);

/** Disease Avoidance: Stamina + Living Conditions + Corpus/5 + Wound Penalty + stress die against the Stable Ease Factor; a botch catches it a stage worse. */
export function avoidanceRoll(d: DerivedCharacter, livingConditions: number, def: { stable: number }, rng: Rng = defaultRng) {
  const r = stressDie(1, rng);
  const parts = [
    { label: 'Stamina', value: d.characteristics.Sta.value },
    { label: 'Living Conditions', value: livingConditions },
    ...(corpusBonus(d) ? [{ label: 'Corpus / 5', value: corpusBonus(d) }] : []),
    ...(d.currentWoundPenalty ? [{ label: 'Wounds', value: d.currentWoundPenalty }] : []),
  ];
  const total = r.botches ? 0 : r.value + parts.reduce((t, p) => t + p.value, 0);
  const caught = !!r.botches || total < def.stable;
  return { total, parts, caught, worse: !!r.botches, text: `${describeStress(r)} + ${parts.map((p) => `${p.label} ${p.value}`).join(', ')} = ${r.botches ? 'botch' : total} against ${def.stable}` };
}

/** A physician's Prognosis Total: Intelligence + Medicine + Living Conditions + Apothecary and Chirurgy help (each at most 3). Over the Severity, the patient adds the physician's Medicine. */
export function prognosisTotal(p: { int: number; medicine: number; living: number; apothecary: number; chirurgy: number }): number {
  return p.int + p.medicine + p.living + Math.min(3, p.apothecary) + Math.min(3, p.chirurgy);
}

export interface RecoveryOptions {
  /** the physician's Medicine, added when their Prognosis Total beats the Severity */
  medicine?: number;
  /** magical aid and any other modifier */
  other?: number;
}

/**
 * The Disease Recovery roll at the end of an interval: Stamina + Medicine + Corpus/5 + Wound Penalty +
 * the cumulative bonus + stress die. Below the Stable Ease Factor the disease worsens a stage; at the
 * Improvement Ease Factor it improves (a Minor disease ends); between, +3 to the next roll. At a
 * crisis (Critical), a total of 0 or less kills, the Stable Ease Factor brings it back to Major, and
 * anything else is a cumulative −1. Changes the illness; returns what happened.
 */
export function recoveryRoll(c: Character, d: DerivedCharacter, illUid: string, o: RecoveryOptions = {}, rng: Rng = defaultRng): { outcome: 'worse' | 'same' | 'better' | 'cured' | 'dead' | 'lifelong'; text: string } {
  const ill = c.illnesses?.find((x) => x.uid === illUid);
  if (!ill) return { outcome: 'same', text: '' };
  if (ill.interval === 'Lifelong') return { outcome: 'lifelong', text: `${ill.name} is lifelong: it neither improves nor worsens without supernatural aid.` };
  const r = stressDie(0, rng, true);
  const parts = [
    { label: 'Stamina', value: d.characteristics.Sta.value },
    ...(o.medicine ? [{ label: 'Medicine', value: o.medicine }] : []),
    ...(corpusBonus(d) ? [{ label: 'Corpus / 5', value: corpusBonus(d) }] : []),
    ...(d.currentWoundPenalty ? [{ label: 'Wounds', value: d.currentWoundPenalty }] : []),
    ...(ill.bonus ? [{ label: ill.stage === 'Critical' ? 'Worsening crisis' : 'Earlier stable rolls', value: ill.bonus }] : []),
    ...(o.other ? [{ label: 'Other', value: o.other }] : []),
  ];
  const total = r.value + parts.reduce((t, p) => t + p.value, 0);
  const roll = `${describeStress(r)} + ${parts.map((p) => `${p.label} ${p.value}`).join(', ')} = ${total}`;
  const i = STAGES.indexOf(ill.stage);
  if (ill.stage === 'Critical') {
    if (total <= 0) return { outcome: 'dead', text: `${roll}: the disease enters its terminal stage, and ${c.name || 'the character'} dies within a day.` };
    if (total >= ill.stable) {
      ill.stage = 'Major';
      ill.bonus = 0;
      return { outcome: 'better', text: `${roll}: the crisis passes; ${ill.name} is now a Major disease.` };
    }
    ill.bonus -= 1;
    return { outcome: 'same', text: `${roll}: still at the crisis, a little worse (−1 to later rolls). Roll again at sunrise and sunset.` };
  }
  if (total < ill.stable) {
    ill.stage = STAGES[i + 1];
    ill.bonus = 0;
    return { outcome: 'worse', text: `${roll}, under the Stable Ease Factor ${ill.stable}: ${ill.name} worsens to ${ill.stage}${ill.stage === 'Critical' ? ': a crisis, with two rolls a day' : ''}.` };
  }
  if (ill.improve !== null && total >= ill.improve) {
    if (i === 0) {
      c.illnesses = (c.illnesses ?? []).filter((x) => x.uid !== ill.uid);
      return { outcome: 'cured', text: `${roll}, at the Improvement Ease Factor ${ill.improve}: ${ill.name} is gone.` };
    }
    ill.stage = STAGES[i - 1];
    ill.bonus = 0;
    return { outcome: 'better', text: `${roll}, at the Improvement Ease Factor ${ill.improve}: ${ill.name} improves to ${ill.stage}.` };
  }
  ill.bonus += 3;
  return { outcome: 'same', text: `${roll}: no change, and +3 to the next roll (now +${ill.bonus}).` };
}
