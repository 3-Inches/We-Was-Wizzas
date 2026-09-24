// Laboratory personalization (DE p.286-297, Covenants ch.9).

import type { GameData, LabCharacteristic } from '../data';
import type { Laboratory } from './types';

export interface DerivedLab {
  lab: Laboratory;
  size: number;
  refinement: number;
  virtuePoints: number;
  flawPoints: number;
  freeSpace: number; // Size + Refinement − (V − F)
  occupiedSize: number;
  characteristics: Record<LabCharacteristic, number>;
  specializations: Record<string, number>;
  droppedSpecs: string[];
  specWarnings: string[];
  upkeepPoints: number; // for covenant expenditure
  yearlyCost: number; // pounds per year, adjusted for use
  buildPoints: number; // cost in covenant build points
  issues: string[];
  emptyFlawsNeeded: number;
}

const SPEC_ACTIVITIES = ['Experimentation', 'Familiar', 'Items', 'Longevity Rituals', 'Spells', 'Teaching', 'Texts', 'Vis Extraction'];
const TECHS = ['Cr', 'In', 'Mu', 'Pe', 'Re'];

export function upkeepPoints(upkeep: number): number {
  const table: Record<number, number> = { [-5]: 1, [-4]: 2, [-3]: 3, [-2]: 5, [-1]: 7, 0: 10, 1: 15, 2: 30, 3: 60, 4: 100, 5: 150 };
  if (upkeep <= -5) return 1;
  if (upkeep in table) return table[upkeep];
  // beyond +5: 10 × xp cost of an Art equal to Upkeep
  return 10 * ((upkeep * (upkeep + 1)) / 2);
}

export function deriveLab(lab: Laboratory, data: GameData): DerivedLab {
  const issues: string[] = [];
  const chars: Record<LabCharacteristic, number> = {
    Size: lab.size, Refinement: lab.refinement, 'General Quality': 0, Upkeep: 0, Safety: 0, Warping: 0, Health: 0, Aesthetics: 0,
  };
  const specs: Record<string, number> = {};
  let vp = 0;
  let fp = 0;
  let size = lab.size;
  let bp = 0;
  for (const v of lab.virtues) {
    const def = data.labVFById.get(v.defId);
    if (!def) continue;
    const pts = def.size === 'Major' ? 3 : def.size === 'Minor' ? 1 : 0;
    if (def.kind === 'virtue') {
      vp += pts;
      bp += def.size === 'Major' ? 20 : def.size === 'Minor' ? 10 : 0;
    } else fp += pts;
    for (const [k, val] of Object.entries(def.mods.characteristics)) {
      if (k === 'Size') size += val ?? 0;
      else chars[k as LabCharacteristic] += val ?? 0;
    }
    for (const [k, val] of Object.entries(def.mods.specializations)) specs[k] = (specs[k] ?? 0) + val;
    for (const [k, val] of Object.entries(v.choice ?? {})) specs[k] = (specs[k] ?? 0) + val;
  }
  chars.Size = size;
  for (const [k, val] of Object.entries(lab.customMods)) chars[k as LabCharacteristic] += val ?? 0;
  for (const [k, val] of Object.entries(lab.customSpecs)) specs[k] = (specs[k] ?? 0) + val;
  const net = vp - fp;
  const capacity = size + lab.refinement;
  const occupiedSize = net - lab.refinement;
  const freeSpace = capacity - net;
  if (freeSpace < 0) issues.push(`Virtues exceed space: Virtue points − Flaw points (${net}) must not exceed Size + Refinement (${capacity}).`);
  chars.Safety += lab.refinement - Math.max(0, occupiedSize);
  if (lab.size < -3) issues.push('A lab cannot be smaller than Size –3.');
  const emptyFlawsNeeded = Math.max(0, Math.floor((size - Math.max(occupiedSize, -99)) / 2));
  if (emptyFlawsNeeded > 0 && !lab.virtues.some((v) => v.defId === 'empty-flaw')) issues.push(`Size exceeds occupied Size by ${size - occupiedSize}: take the Empty Flaw ${emptyFlawsNeeded} time(s).`);
  if (chars.Warping < 0) chars.Warping = 0;
  if (chars.Warping > 0 && lab.personalityTraits.reduce((s, p) => s + p.score, 0) !== chars.Warping) issues.push(`A lab with Warping ${chars.Warping} should have Personality Traits totaling ${chars.Warping}.`);

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
    characteristics: chars, specializations: finalSpecs, droppedSpecs: [...dropped], specWarnings,
    upkeepPoints: up, yearlyCost: (up / 10) * mult, buildPoints: bp, issues, emptyFlawsNeeded,
  };
}

export function newLab(name: string, ownerId?: string): Laboratory {
  return {
    uid: Math.random().toString(16).slice(2, 14), name, ownerId, size: 0, refinement: 0, virtues: [],
    customMods: {}, customSpecs: {}, droppedSpecs: [], personalityTraits: [], use: 'typical',
  };
}
