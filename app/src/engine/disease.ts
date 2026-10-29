// Disease (Art & Academe, Disease and Treatment of Disease): catching a disease, its stages and
// Disease Penalty, the Disease Recovery roll at each interval, crises, and a physician's Prognosis.

import diseasesJson from '../data/generated/diseases.json';
import { auraRecovery } from './aura';
import type { DerivedCharacter } from './character/derive';
import { defaultRng, describeStress, stressDie, type Rng } from './dice';
import type { AuraState } from './magic';
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
  /** the aura the patient is tended in: a Healing aura helps, an Infernal one hinders and stops any improvement */
  aura?: AuraState;
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
  const rec = auraRecovery(o.aura);
  const parts = [
    { label: 'Stamina', value: d.characteristics.Sta.value },
    ...(o.medicine ? [{ label: 'Medicine', value: o.medicine }] : []),
    ...(corpusBonus(d) ? [{ label: 'Corpus / 5', value: corpusBonus(d) }] : []),
    ...(d.currentWoundPenalty ? [{ label: 'Wounds', value: d.currentWoundPenalty }] : []),
    ...(ill.bonus ? [{ label: ill.stage === 'Critical' ? 'Worsening crisis' : 'Earlier stable rolls', value: ill.bonus }] : []),
    ...(o.other ? [{ label: 'Other', value: o.other }] : []),
    ...rec.parts,
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
  if (ill.improve !== null && total >= ill.improve && rec.noImprovement) {
    ill.bonus += 3;
    return { outcome: 'same', text: `${roll}, at the Improvement Ease Factor ${ill.improve}, but no disease improves in an Infernal aura: stable, and +3 to the next roll (now +${ill.bonus}).` };
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

// ------------------------------------------------------------------------------ Disease in towns (City & Guild ch.1)

/** Where a character lives and works that worsens the aging roll (City & Guild, Living Condition Modifier): −1 each. */
export const HAZARDS: { id: 'colony' | 'bad-air' | 'mine'; label: string }[] = [
  { id: 'bad-air', label: 'works in a bad-air trade (tanner, dyer, butcher…)' },
  { id: 'mine', label: 'works in a mine' },
  { id: 'colony', label: 'lives in a leper colony' },
];
export const hazardPenalty = (c: Pick<Character, 'hazards'>) => (c.hazards ?? []).length;

/**
 * Catching a disease from a town's sources of humoral imbalance (City & Guild): a Stamina roll against the Ease
 * Factor, and on failure the wound it does. A newcomer is tested once or twice in the first season.
 */
export type WoundKind = 'light' | 'medium' | 'heavy' | 'incapacitating';
export const TOWN_DISEASES: { id: string; label: string; eases: number[]; wounds: WoundKind[]; resisted?: boolean; hint: string }[] = [
  { id: 'ague', label: 'The ague (bad air: sewage, tanneries)', eases: [3, 6, 9], wounds: ['light', 'medium', 'heavy'], hint: 'Chills and fever; a continual fever (phlegm) always a Heavy Wound, the quotidian, tertian and quartan fevers a Light or Medium one.' },
  { id: 'flux', label: 'The bloody flux (cold, wet conditions)', eases: [3, 6, 9], wounds: ['medium', 'heavy', 'incapacitating'], hint: 'A Medium, Heavy or Incapacitating Wound by the excess of phlegm.' },
  { id: 'worms', label: 'Worms (an excess of blood)', eases: [6], wounds: [], hint: 'Nothing at once, but a Stamina roll against 6 every season after, or a Medium Wound.' },
  { id: 'anthony', label: 'St. Anthony’s fire (a disease demon)', eases: [9], wounds: ['light'], resisted: true, hint: 'A demon of Might 10 (Corpus) in the intestines: a Light Wound this season, worse each season to a Fatal Wound in the fifth, unless exorcised (the Hospitalers of St. Anthony).' },
  { id: 'tarantism', label: 'Tarantism (a faerie tarantula’s bite)', eases: [9], wounds: [], hint: 'Each season after, a Stamina roll against 3 (6 in summer), or the whole season is spent dancing to exhaustion; the tarantella cures it.' },
  { id: 'childbed', label: 'Childbed fever (at a birth)', eases: [6], wounds: ['heavy'], resisted: true, hint: 'A demon of Might 10 (Corpus): a Heavy Wound, or Incapacitating after complications.' },
];

export function townExposure(stamina: number, id: string, level: number, rng: Rng = defaultRng): { caught: boolean; wound?: WoundKind; text: string } {
  const t = TOWN_DISEASES.find((x) => x.id === id);
  if (!t) return { caught: false, text: '' };
  const i = Math.max(0, Math.min(t.eases.length - 1, level));
  const ease = t.eases[i];
  const r = stressDie(1, rng);
  const total = r.botches ? 0 : r.value + stamina;
  const caught = r.botches > 0 || total < ease;
  const wound = caught ? t.wounds[Math.min(i, t.wounds.length - 1)] : undefined;
  return { caught, wound, text: `Stamina ${stamina} + ${describeStress(r)} = ${r.botches ? 'botch' : total} vs ${ease}: ${caught ? `caught${wound ? `, a${wound === 'incapacitating' ? 'n' : ''} ${wound[0].toUpperCase()}${wound.slice(1)} Wound` : ''}. ${t.hint}` : 'it passes them by.'}` };
}
