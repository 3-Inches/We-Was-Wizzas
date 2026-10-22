// Rituals and powers cast on a whole covenant: raising Characteristics (Creo Corpus and Creo Mentem
// guidelines) or granting a Virtue (RoP: Magic, Grant Virtue), reaching the characters, the
// specialists, teachers and craftsmen, and the covenfolk at large.

import { CHAR_NAMES, type Characteristic, type GameData, type VFSize } from '../data';
import { applyEffect, powerfulEffectWarping } from './effects';
import { specChar } from './covenantRules';
import type { ActiveEffect, Character, Covenant, Season, TimeReport } from './types';
import { uid } from '../util/id';

type Line = TimeReport['lines'][number];

/**
 * DE, Creo Corpus and Creo Mentem guidelines: raising a Characteristic by one point to no more than
 * 0 is level 30, +1 level 35, and so on to +5 at level 55 (no higher: further increases are not
 * natural to human beings). The base level before Range, Duration and Target.
 */
export function guidelineLevel(max: number): number {
  return 30 + 5 * Math.max(0, Math.min(5, max));
}

export function capForGuideline(level: number): number {
  return Math.max(0, Math.min(5, Math.floor((level - 30) / 5)));
}

export interface RitualPlan {
  name: string;
  /** the effect's level: a Warping Point for each target if 30 or more and not designed for them (DE) */
  level: number;
  effect: { kind: 'raise'; chars: Characteristic[]; max: number } | { kind: 'virtue'; defId: string; size: VFSize; param?: string };
  duration: ActiveEffect['duration'];
  /** a special version designed for these targets: no Warping from a powerful effect */
  designedFor?: boolean;
  targets: { characterIds: string[]; specialistUids: string[]; covenfolk: boolean };
}

/**
 * Put a ritual's effect on everyone it reaches. Changes the characters and the covenant; returns what
 * happened. `current` gives a character's Characteristics as they stand (Virtues, Qualities and Size
 * included), which the ritual's limit is measured against.
 */
export function applyRitual(
  plan: RitualPlan, cov: Covenant, chars: Character[], casterId: string | undefined, source: string, year: number, season: Season, data: GameData,
  current?: (c: Character) => Partial<Record<Characteristic, number>>,
): Line[] {
  const lines: Line[] = [];
  for (const c of chars.filter((x) => plan.targets.characterIds.includes(x.id))) {
    const warping = powerfulEffectWarping(plan.level, c.id === casterId, !!plan.designedFor);
    const r = applyEffect(
      c,
      {
        name: plan.name, source, duration: plan.duration, warping,
        raise: plan.effect.kind === 'raise' ? { chars: plan.effect.chars, amount: 1, max: plan.effect.max, current: current?.(c) } : undefined,
        virtue: plan.effect.kind === 'virtue' ? { defId: plan.effect.defId, size: plan.effect.size, param: plan.effect.param } : undefined,
      },
      year, season, data,
    );
    lines.push({ who: c.name || 'Unnamed', kind: 'effect', text: r.lines.join(' ') || 'No change.' });
  }
  for (const s of cov.specialists.filter((x) => plan.targets.specialistUids.includes(x.uid))) {
    const out: string[] = [];
    if (plan.effect.kind === 'raise' && plan.duration === 'permanent') {
      for (const ch of plan.effect.chars) {
        const cur = specChar(s, ch);
        const delta = Math.max(0, Math.min(1, plan.effect.max - cur));
        if (!delta) continue;
        s.chars = { Com: s.com, Pre: s.pre, ...(s.chars ?? {}), [ch]: cur + delta };
        s.magicGain = { ...(s.magicGain ?? {}), [ch]: (s.magicGain?.[ch] ?? 0) + delta };
        out.push(`${CHAR_NAMES[ch]} → ${cur + delta >= 0 ? '+' : ''}${cur + delta}`);
      }
    } else if (plan.effect.kind === 'raise') out.push(`${plan.effect.chars.map((ch) => CHAR_NAMES[ch]).join(', ')} +1 while it lasts`);
    else out.push(`gains ${data.vfById.get(plan.effect.defId)?.name ?? plan.effect.defId}`);
    const wp = powerfulEffectWarping(plan.level, false, !!plan.designedFor) * countOfOne(s.count);
    if (wp) s.warpingPoints = (s.warpingPoints ?? 0) + 1;
    s.history = [...(s.history ?? []), { year, season, text: `${plan.name}: ${out.join(', ') || 'no change'}${wp ? ', 1 Warping Point' : ''}` }];
    const n = s.count && s.count > 1 ? ` (all ${s.count})` : '';
    lines.push({ who: `${s.name || s.role}${n}`, kind: 'effect', text: `${out.join(', ') || 'no change (already at the limit)'}${wp ? '; 1 Warping Point' : ''}.` });
  }
  if (plan.targets.covenfolk) {
    const what = plan.effect.kind === 'raise' ? `${plan.effect.chars.map((ch) => CHAR_NAMES[ch]).join(', ')} +1 (to no more than ${plan.effect.max >= 0 ? '+' : ''}${plan.effect.max})` : `gain ${data.vfById.get(plan.effect.defId)?.name ?? plan.effect.defId}`;
    const fx: ActiveEffect = { uid: uid(), name: plan.name, source, year, season, duration: plan.duration, notes: `The covenfolk: ${what}.` };
    cov.effects = [...(cov.effects ?? []), fx];
    lines.push({ who: cov.name, kind: 'effect', text: `The covenfolk (grogs, servants, laborers…): ${what}.${powerfulEffectWarping(plan.level, false, !!plan.designedFor) ? ' Each gains a Warping Point.' : ''}` });
  }
  cov.log.push({ uid: uid(), year, season, text: `${plan.name} (${source}): ${lines.map((l) => `${l.who}: ${l.text}`).join(' ')}` });
  return lines;
}

const countOfOne = (n?: number) => (n === 0 ? 0 : 1);
