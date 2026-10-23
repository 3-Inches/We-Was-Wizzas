// Rituals and powers cast on a whole covenant: raising Characteristics (Creo Corpus and Creo Mentem
// guidelines) or granting a Virtue (RoP: Magic, Grant Virtue), reaching the characters, the
// specialists, teachers and craftsmen, and the covenfolk at large.

import { CHAR_NAMES, type Characteristic, type GameData, type VFSize } from '../data';
import { applyEffect, powerfulEffectWarping, undoEffect } from './effects';
import { specChar } from './covenantRules';
import type { ActiveEffect, CastRecord, Character, Covenant, Season, TimeReport, VisStock } from './types';
import { addVis, purseOf, visText } from './vis';
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
 * included), which the ritual's limit is measured against; `mightOf` its Might Score, which spares it
 * the Warping.
 */
export function applyRitual(
  plan: RitualPlan, cov: Covenant, chars: Character[], casterId: string | undefined, source: string, year: number, season: Season, data: GameData,
  current?: (c: Character) => Partial<Record<Characteristic, number>>,
  mightOf?: (c: Character) => number,
): { lines: Line[]; done: CastRecord['done'] } {
  const lines: Line[] = [];
  const done: CastRecord['done'] = { effects: [], specialists: [] };
  for (const c of chars.filter((x) => plan.targets.characterIds.includes(x.id))) {
    // "Creatures with a Might score are absolutely immune to warping" (DE, Warping and Non-Humans)
    const would = powerfulEffectWarping(plan.level, c.id === casterId, !!plan.designedFor);
    const spared = would > 0 && (mightOf?.(c) ?? 0) > 0;
    const warping = spared ? 0 : would;
    const r = applyEffect(
      c,
      {
        name: plan.name, source, duration: plan.duration, warping,
        raise: plan.effect.kind === 'raise' ? { chars: plan.effect.chars, amount: 1, max: plan.effect.max, current: current?.(c) } : undefined,
        virtue: plan.effect.kind === 'virtue' ? { defId: plan.effect.defId, size: plan.effect.size, param: plan.effect.param } : undefined,
      },
      year, season, data,
    );
    done.effects.push({ characterId: c.id, effectUid: r.effect.uid });
    lines.push({ who: c.name || 'Unnamed', kind: 'effect', text: [...r.lines, ...(spared ? ['No Warping: its Might makes it immune.'] : [])].join(' ') || 'No change.' });
  }
  for (const s of cov.specialists.filter((x) => plan.targets.specialistUids.includes(x.uid))) {
    const out: string[] = [];
    const raised: Partial<Record<Characteristic, number>> = {};
    if (plan.effect.kind === 'raise' && plan.duration === 'permanent') {
      for (const ch of plan.effect.chars) {
        const cur = specChar(s, ch);
        const delta = Math.max(0, Math.min(1, plan.effect.max - cur));
        if (!delta) continue;
        s.chars = { Com: s.com, Pre: s.pre, ...(s.chars ?? {}), [ch]: cur + delta };
        s.magicGain = { ...(s.magicGain ?? {}), [ch]: (s.magicGain?.[ch] ?? 0) + delta };
        raised[ch] = delta;
        out.push(`${CHAR_NAMES[ch]} → ${cur + delta >= 0 ? '+' : ''}${cur + delta}`);
      }
    } else if (plan.effect.kind === 'raise') out.push(`${plan.effect.chars.map((ch) => CHAR_NAMES[ch]).join(', ')} +1 while it lasts`);
    else out.push(`gains ${data.vfById.get(plan.effect.defId)?.name ?? plan.effect.defId}`);
    const wp = powerfulEffectWarping(plan.level, false, !!plan.designedFor) * countOfOne(s.count);
    if (wp) s.warpingPoints = (s.warpingPoints ?? 0) + 1;
    done.specialists.push({ uid: s.uid, raised, warping: wp ? 1 : 0 });
    s.history = [...(s.history ?? []), { year, season, text: `${plan.name}: ${out.join(', ') || 'no change'}${wp ? ', 1 Warping Point' : ''}` }];
    const n = s.count && s.count > 1 ? ` (all ${s.count})` : '';
    lines.push({ who: `${s.name || s.role}${n}`, kind: 'effect', text: `${out.join(', ') || 'no change (already at the limit)'}${wp ? '; 1 Warping Point' : ''}.` });
  }
  if (plan.targets.covenfolk) {
    const what = plan.effect.kind === 'raise' ? `${plan.effect.chars.map((ch) => CHAR_NAMES[ch]).join(', ')} +1 (to no more than ${plan.effect.max >= 0 ? '+' : ''}${plan.effect.max})` : `gain ${data.vfById.get(plan.effect.defId)?.name ?? plan.effect.defId}`;
    const fx: ActiveEffect = { uid: uid(), name: plan.name, source, year, season, duration: plan.duration, notes: `The covenfolk: ${what}.` };
    cov.effects = [...(cov.effects ?? []), fx];
    done.covenfolkEffectUid = fx.uid;
    lines.push({ who: cov.name, kind: 'effect', text: `The covenfolk (grogs, servants, laborers…): ${what}.${powerfulEffectWarping(plan.level, false, !!plan.designedFor) ? ' Each gains a Warping Point.' : ''}` });
  }
  cov.log.push({ uid: uid(), year, season, text: `${plan.name} (${source}): ${lines.map((l) => `${l.who}: ${l.text}`).join(' ')}` });
  return { lines, done };
}

/** What a caster has that casting spends: taken before and after paying, the difference is the cost. */
export function casterTally(c: Character, stocks: VisStock[]) {
  return {
    pool: c.creature?.poolSpent ?? 0,
    confidence: c.confidence.points,
    mightScore: c.creature?.mightLost ?? 0,
    fatigue: c.fatigueLost,
    longTermFatigue: c.longTermFatigueLost,
    warping: c.warpingPoints,
    vis: structuredClone(stocks),
  };
}

/** The cost of a cast: what the caster's tally lost between before and after paying. */
export function castCost(before: ReturnType<typeof casterTally>, after: ReturnType<typeof casterTally>, visFrom: 'covenant' | 'purse'): CastRecord['paid'] {
  const vis: VisStock[] = [];
  for (const v of before.vis) {
    const now = after.vis.find((x) => x.art === v.art && x.pair === v.pair)?.pawns ?? 0;
    if (v.pawns > now) vis.push({ art: v.art, pawns: v.pawns - now, ...(v.pair ? { pair: v.pair } : {}) });
  }
  return {
    visFrom, vis,
    pool: after.pool - before.pool,
    confidence: before.confidence - after.confidence,
    mightScore: after.mightScore - before.mightScore,
    fatigue: after.fatigue - before.fatigue,
    longTermFatigue: after.longTermFatigue - before.longTermFatigue,
    warping: after.warping - before.warping,
  };
}

export function costText(p: CastRecord['paid']): string {
  const parts = [
    p.vis.length && `${visText(p.vis)} vis${p.visFrom === 'purse' ? ' from the purse' : ''}`,
    p.pool > 0 && `${p.pool} Might Points`,
    p.mightScore > 0 && `${p.mightScore} Might Score`,
    p.confidence > 0 && `${p.confidence} Confidence`,
    p.fatigue + p.longTermFatigue > 0 && `${p.fatigue + p.longTermFatigue} Fatigue`,
    p.warping > 0 && `${p.warping} Warping (botch)`,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'nothing';
}

/**
 * Take a cast back: the Characteristics, Virtues and Warping it gave are taken away from everyone it
 * reached, and what the caster paid is given back. Returns what was done.
 */
export function undoCast(rec: CastRecord, cov: Covenant, chars: Character[], year: number, season: Season): string[] {
  const lines: string[] = [];
  for (const e of rec.done.effects) {
    const c = chars.find((x) => x.id === e.characterId);
    if (!c) continue;
    if (c.activeEffects?.some((x) => x.uid === e.effectUid)) {
      undoEffect(c, e.effectUid);
      lines.push(`${c.name || 'Unnamed'}: ${rec.name} taken back.`);
    } else lines.push(`${c.name || 'Unnamed'}: ${rec.name} had already ended or been removed.`);
  }
  for (const sp of rec.done.specialists) {
    const s = cov.specialists.find((x) => x.uid === sp.uid);
    if (!s) continue;
    for (const [ch, n] of Object.entries(sp.raised) as [Characteristic, number][]) {
      s.chars = { Com: s.com, Pre: s.pre, ...(s.chars ?? {}), [ch]: specChar(s, ch) - n };
      if (s.magicGain) s.magicGain[ch] = Math.max(0, (s.magicGain[ch] ?? 0) - n);
    }
    if (sp.warping) s.warpingPoints = Math.max(0, (s.warpingPoints ?? 0) - sp.warping);
    const i = (s.history ?? []).map((h) => h.text.startsWith(`${rec.name}:`) && h.year === rec.year && h.season === rec.season).lastIndexOf(true);
    if (i >= 0) s.history!.splice(i, 1);
  }
  if (rec.done.specialists.length) lines.push(`${rec.done.specialists.length} specialist${rec.done.specialists.length > 1 ? 's' : ''} back as they were.`);
  if (rec.done.covenfolkEffectUid) {
    cov.effects = (cov.effects ?? []).filter((x) => x.uid !== rec.done.covenfolkEffectUid);
    lines.push('The covenfolk back as they were.');
  }
  const caster = chars.find((x) => x.id === rec.casterId);
  const p = rec.paid;
  if (caster && !rec.legacy) {
    if (caster.creature) {
      caster.creature.poolSpent = Math.max(0, (caster.creature.poolSpent ?? 0) - p.pool);
      caster.creature.mightLost = Math.max(0, (caster.creature.mightLost ?? 0) - p.mightScore);
    }
    caster.confidence.points += p.confidence;
    caster.fatigueLost = Math.max(0, caster.fatigueLost - p.fatigue);
    caster.longTermFatigueLost = Math.max(0, caster.longTermFatigueLost - p.longTermFatigue);
    caster.warpingPoints = Math.max(0, caster.warpingPoints - p.warping);
    const stocks = p.visFrom === 'covenant' ? cov.visStocks : purseOf(caster).vis;
    for (const v of p.vis) addVis(stocks, v.art, v.pawns, v.pair);
    lines.push(`Given back to ${caster.name || 'the caster'}: ${costText(p)}.`);
  } else if (rec.legacy) lines.push('It was cast before casts were recorded, so what it cost is not known: give back by hand what was paid.');
  rec.undone = { year, season };
  cov.log.push({ uid: uid(), year, season, text: `Undone: ${rec.name} (${rec.source}). ${lines.join(' ')}`, ...(p.visFrom === 'covenant' && p.vis.length && !rec.legacy ? { visDelta: p.vis } : {}) });
  return lines;
}

const CHAR_BY_NAME = new Map(Object.entries(CHAR_NAMES).map(([k, v]) => [v, k as Characteristic]));

/**
 * Casts made before casts were recorded, pieced together from what they left: the effects on the
 * characters and the covenfolk, and the specialists' history, by name, source and season.
 */
export function legacyCasts(cov: Covenant, chars: Character[]): CastRecord[] {
  const known = new Set((cov.casts ?? []).flatMap((r) => [...r.done.effects.map((e) => e.effectUid), r.done.covenfolkEffectUid ?? '']));
  const out = new Map<string, CastRecord>();
  const rec = (name: string, source: string, year: number, season: Season) => {
    const key = `${name}|${source}|${year}|${season}`;
    if (!out.has(key)) {
      const casterName = source.split(',')[0].trim();
      out.set(key, {
        uid: `legacy-${key}`, name, source, year, season, legacy: true, lines: [],
        casterId: chars.find((c) => c.name === casterName)?.id ?? '',
        paid: { visFrom: 'covenant', vis: [], pool: 0, confidence: 0, mightScore: 0, fatigue: 0, longTermFatigue: 0, warping: 0 },
        done: { effects: [], specialists: [] },
      });
    }
    return out.get(key)!;
  };
  for (const c of chars.filter((x) => cov.memberIds.includes(x.id))) {
    for (const e of c.activeEffects ?? []) {
      if (!e.source || known.has(e.uid) || !/ritual|power|spell/i.test(e.source)) continue;
      rec(e.name, e.source, e.year, e.season).done.effects.push({ characterId: c.id, effectUid: e.uid });
    }
  }
  for (const e of cov.effects ?? []) {
    if (!e.source || e.renew || known.has(e.uid)) continue;
    rec(e.name, e.source, e.year, e.season).done.covenfolkEffectUid = e.uid;
  }
  // a specialist's history line reads "Name: Intelligence → +1, Presence → +2, 1 Warping Point"
  for (const r of out.values()) {
    for (const s of cov.specialists) {
      const h = (s.history ?? []).find((x) => x.year === r.year && x.season === r.season && x.text.startsWith(`${r.name}:`));
      if (!h) continue;
      const raised: Partial<Record<Characteristic, number>> = {};
      for (const m of h.text.matchAll(/([A-Z][a-z]+) → /g)) {
        const ch = CHAR_BY_NAME.get(m[1]);
        if (ch) raised[ch] = 1;
      }
      r.done.specialists.push({ uid: s.uid, raised, warping: /1 Warping Point/.test(h.text) ? 1 : 0 });
    }
  }
  return [...out.values()].filter((r) => r.done.effects.length || r.done.covenfolkEffectUid);
}

const countOfOne = (n?: number) => (n === 0 ? 0 : 1);
