// Laboratory personalization (DE p.286–296, Covenants ch.9).

import { ARTS, ART_NAMES, type GameData, type LabCharacteristic, type LabVFDef } from '../data';
import { FREE_FORM_CHARS, LAB_OPTIONS } from '../data/labOptions';
import type { Part } from './magic';
import type { LabVirtueEntry, Laboratory } from './types';

export interface DerivedLab {
  lab: Laboratory;
  size: number;
  refinement: number;
  virtuePoints: number;
  flawPoints: number;
  freeSpace: number; // Size + Refinement − (V − F)
  occupiedSize: number;
  characteristics: Record<LabCharacteristic, number>;
  /** how each Characteristic was worked out */
  parts: Record<LabCharacteristic, Part[]>;
  specializations: Record<string, number>;
  droppedSpecs: string[];
  specWarnings: string[];
  upkeepPoints: number; // for covenant expenditure
  yearlyCost: number; // pounds per year, adjusted for use
  buildPoints: number; // cost in covenant build points
  issues: string[];
  emptyFlawsNeeded: number;
}

export const SPEC_ACTIVITIES = ['Experimentation', 'Familiar', 'Items', 'Longevity Rituals', 'Spells', 'Teaching', 'Texts', 'Vis Extraction'];
const TECHS = ['Cr', 'In', 'Mu', 'Pe', 'Re'];

export function upkeepPoints(upkeep: number): number {
  const table: Record<number, number> = { [-5]: 1, [-4]: 2, [-3]: 3, [-2]: 5, [-1]: 7, 0: 10, 1: 15, 2: 30, 3: 60, 4: 100, 5: 150 };
  if (upkeep <= -5) return 1;
  if (upkeep in table) return table[upkeep];
  // beyond +5: 10 × xp cost of an Art equal to Upkeep
  return 10 * ((upkeep * (upkeep + 1)) / 2);
}

/** Where a lab Virtue's Specialization points may go. */
export function labChoiceOptions(defId: string, lab: Laboratory, data: GameData): string[] {
  const opt = LAB_OPTIONS[defId]?.choiceOptions ?? 'all';
  if (Array.isArray(opt)) return opt;
  if (opt === 'arts') return [...ARTS];
  if (opt === 'forms') return ARTS.filter((a) => !TECHS.includes(a));
  if (opt === 'activities') return SPEC_ACTIVITIES;
  if (opt === 'feature') {
    const names = lab.virtues.filter((v) => /feature/.test(v.defId) && v.note).map((v) => v.note!);
    const specs = data.labFeatures.filter((f) => names.includes(f.name)).flatMap((f) => f.specializations);
    const known = specs.map((s) => SPEC_ALIASES[s.toLowerCase()] ?? s).filter((s) => SPEC_KEYS.includes(s));
    if (known.length) return [...new Set(known)];
  }
  return SPEC_KEYS;
}

const SPEC_KEYS = [...SPEC_ACTIVITIES, ...ARTS];
const SPEC_ALIASES: Record<string, string> = Object.fromEntries([
  ...Object.entries(ART_NAMES).map(([k, n]) => [n.toLowerCase(), k]),
  ...SPEC_ACTIVITIES.map((a) => [a.toLowerCase(), a]),
  ['longevity', 'Longevity Rituals'], ['vis', 'Vis Extraction'], ['texts', 'Texts'],
]);

/** The effects a lab Virtue or Flaw has, given the player's choices for it. */
export function labEntryEffects(v: LabVirtueEntry, def: LabVFDef): { characteristics: Partial<Record<LabCharacteristic, number>>; specializations: Record<string, number> } {
  const opt = LAB_OPTIONS[v.defId];
  const chars: Partial<Record<LabCharacteristic, number>> = {};
  const specs: Record<string, number> = {};
  const add = (c: Partial<Record<LabCharacteristic, number>>) => {
    for (const [k, n] of Object.entries(c)) if (n) chars[k as LabCharacteristic] = (chars[k as LabCharacteristic] ?? 0) + n;
  };
  const addSpecs = (c: Record<string, number> | undefined) => {
    for (const [k, n] of Object.entries(c ?? {})) if (n) specs[k] = (specs[k] ?? 0) + n;
  };
  const alt = opt?.alts ? opt.alts.find((a) => a.id === v.alt) ?? opt.alts[0] : undefined;
  if (alt) {
    add(alt.characteristics);
    addSpecs(alt.specializations);
  } else if (opt?.fix) {
    add(opt.fix.characteristics);
    addSpecs(opt.fix.specializations ?? def.mods.specializations);
  } else {
    add(def.mods.characteristics);
    addSpecs(def.mods.specializations);
  }
  if (opt?.formula) {
    const n: Record<string, number> = {};
    for (const i of opt.inputs ?? []) n[i.key] = v.inputs?.[i.key] ?? i.def;
    add(opt.formula(n));
  }
  for (const t of opt?.toggles ?? []) if (v.toggles?.[t.key] ?? t.def) add(t.characteristics);
  if (opt?.freeForm) for (const k of FREE_FORM_CHARS) add({ [k]: v.inputs?.[k] ?? 0 });
  addSpecs(v.choice);
  return { characteristics: chars, specializations: specs };
}

export function deriveLab(lab: Laboratory, data: GameData): DerivedLab {
  const issues: string[] = [];
  const chars: Record<LabCharacteristic, number> = {
    Size: lab.size, Refinement: lab.refinement, 'General Quality': 0, Upkeep: 0, Safety: 0, Warping: 0, Health: 0, Aesthetics: 0,
  };
  const parts = Object.fromEntries(Object.keys(chars).map((k) => [k, [] as Part[]])) as Record<LabCharacteristic, Part[]>;
  parts.Size.push({ label: 'Size built', value: lab.size });
  if (lab.refinement) parts.Refinement.push({ label: 'Refinement', value: lab.refinement });
  const specs: Record<string, number> = {};
  let vp = 0;
  let fp = 0;
  let size = lab.size;
  let bp = 0;
  let aestheticsMax = Infinity;
  let halveAesthetics = false;
  let reduceHighSpecs = false;
  for (const v of lab.virtues) {
    const def = data.labVFById.get(v.defId);
    if (!def) continue;
    const opt = LAB_OPTIONS[v.defId];
    const pts = def.size === 'Major' ? 3 : def.size === 'Minor' ? 1 : 0;
    if (def.kind === 'virtue') {
      vp += pts;
      bp += def.size === 'Major' ? 20 : def.size === 'Minor' ? 10 : 0;
    } else fp += pts;
    const eff = labEntryEffects(v, def);
    for (const [k, val] of Object.entries(eff.characteristics)) {
      if (!val) continue;
      if (k === 'Size') size += val;
      else chars[k as LabCharacteristic] += val;
      parts[k as LabCharacteristic].push({ label: def.name, value: val });
    }
    for (const [k, val] of Object.entries(eff.specializations)) specs[k] = (specs[k] ?? 0) + val;
    const want = def.mods.choicePoints ?? 0;
    const used = Object.values(v.choice ?? {}).reduce((s, n) => s + n, 0);
    if (want && used < want) issues.push(`${def.name}: assign ${want - used} more Specialization point(s).`);
    if (opt?.aestheticsMax !== undefined) aestheticsMax = Math.min(aestheticsMax, opt.aestheticsMax);
    if (opt?.halveAesthetics) halveAesthetics = true;
    if (opt?.reduceHighSpecs) reduceHighSpecs = true;
  }
  chars.Size = size;
  for (const [k, val] of Object.entries(lab.customMods)) {
    if (!val) continue;
    chars[k as LabCharacteristic] += val;
    parts[k as LabCharacteristic].push({ label: 'Custom adjustment', value: val });
  }
  for (const [k, val] of Object.entries(lab.customSpecs)) specs[k] = (specs[k] ?? 0) + val;
  const net = vp - fp;
  const capacity = size + lab.refinement;
  const occupiedSize = net - lab.refinement;
  const freeSpace = capacity - net;
  if (freeSpace < 0) issues.push(`Virtues exceed space: Virtue points − Flaw points (${net}) must not exceed Size + Refinement (${capacity}).`);
  // DE: base Safety = Refinement − occupied Size (only when the occupied Size is above 0)
  if (lab.refinement) parts.Safety.unshift({ label: 'Refinement', value: lab.refinement });
  if (occupiedSize > 0) parts.Safety.unshift({ label: `Occupied Size ${occupiedSize} (Virtue points ${vp} − Flaw points ${fp} − Refinement ${lab.refinement})`, value: -occupiedSize });
  chars.Safety += lab.refinement - Math.max(0, occupiedSize);
  if (lab.size < -3) issues.push('A lab cannot be smaller than Size –3.');
  const emptyFlawsNeeded = Math.max(0, Math.floor((size - Math.max(occupiedSize, -99)) / 2));
  const emptyTaken = lab.virtues.filter((v) => v.defId === 'empty-flaw').length;
  if (emptyFlawsNeeded > emptyTaken) issues.push(`Size exceeds occupied Size by ${size - occupiedSize}: take the Empty Flaw ${emptyFlawsNeeded} time(s) (${emptyTaken} taken).`);
  if (halveAesthetics) {
    const half = Math.trunc(chars.Aesthetics / 2);
    if (half !== chars.Aesthetics) parts.Aesthetics.push({ label: 'Halved (Invisible / Shrouded)', value: half - chars.Aesthetics });
    chars.Aesthetics = half;
  }
  if (chars.Aesthetics > aestheticsMax) {
    parts.Aesthetics.push({ label: `Lightless: at most ${aestheticsMax}`, value: aestheticsMax - chars.Aesthetics });
    chars.Aesthetics = aestheticsMax;
  }
  if (chars.Warping < 0) chars.Warping = 0;
  if (chars.Warping > 0 && lab.personalityTraits.reduce((s, p) => s + p.score, 0) !== chars.Warping) issues.push(`A lab with Warping ${chars.Warping} should have Personality Traits totaling ${chars.Warping}.`);
  if (reduceHighSpecs) for (const k of Object.keys(specs)) if (specs[k] >= 2) specs[k] -= 1;

  // specialization caps: 2 activity, 4 art (max 2 techniques)
  const dropped = new Set(lab.droppedSpecs);
  const specWarnings: string[] = [];
  const act = Object.keys(specs).filter((k) => SPEC_ACTIVITIES.includes(k) && specs[k] > 0 && !dropped.has(k));
  const artSpecs = Object.keys(specs).filter((k) => !SPEC_ACTIVITIES.includes(k) && specs[k] > 0 && !dropped.has(k));
  const techSpecs = artSpecs.filter((k) => TECHS.includes(k));
  if (act.length > 2) specWarnings.push(`Too many activity Specializations (${act.join(', ')}); max 2 — drop some.`);
  if (artSpecs.length > 4) specWarnings.push(`Too many Art Specializations (${artSpecs.join(', ')}); max 4 — drop some.`);
  if (techSpecs.length > 2) specWarnings.push(`Too many Technique Specializations (${techSpecs.join(', ')}); max 2.`);
  const finalSpecs: Record<string, number> = {};
  for (const [k, v] of Object.entries(specs)) if (!dropped.has(k) && v !== 0) finalSpecs[k] = v;
  // Teaching bonus capped at 3
  if ((finalSpecs.Teaching ?? 0) > 3) finalSpecs.Teaching = 3;

  const up = upkeepPoints(chars.Upkeep);
  const mult = lab.use === 'light' ? 0.5 : lab.use === 'heavy' ? 1.5 : 1;
  bp += (lab.size) * 20;
  return {
    lab, size, refinement: lab.refinement, virtuePoints: vp, flawPoints: fp, freeSpace, occupiedSize,
    characteristics: chars, parts, specializations: finalSpecs, droppedSpecs: [...dropped], specWarnings,
    upkeepPoints: up, yearlyCost: (up / 10) * mult, buildPoints: bp, issues, emptyFlawsNeeded,
  };
}

export function newLab(name: string, ownerId?: string): Laboratory {
  return {
    uid: Math.random().toString(16).slice(2, 14), name, ownerId, size: 0, refinement: 0, virtues: [],
    customMods: {}, customSpecs: {}, droppedSpecs: [], personalityTraits: [], use: 'typical',
  };
}
