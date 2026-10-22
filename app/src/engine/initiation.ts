// Mystery Initiation (DE Mystery Initiation; Houses of Hermes: Mystery Cults, Introduction): the
// Mystagogue's Initiation Total against the target for the Virtue, the Script and its bonuses, Ordeals
// and how they ease later Initiations, varying a Script, and the Criamon stations.

import type { DerivedCharacter } from './character/derive';
import { addVirtue } from './character/factory';
import { defaultRng, describeStress, stressDie, type Rng } from './dice';
import type { Character, InitiationRecord, Season } from './types';
import type { GameData } from '../data';
import type { VFSize } from '../data/types';
import { CRIAMON_STATIONS, type CriamonStation } from '../data/mysteries';
import { HOUSE_BY_ID } from '../data/houses';
import { uid } from '../util/id';

export type OrdealTier = 'Minor' | 'Medium' | 'Major';

/** The Ordeals a Script may impose, with the bonus each adds (DE Example Elements of an Initiation Script). */
export const ORDEALS: { id: string; label: string; tier: OrdealTier; bonus: number; flaw?: VFSize; lose?: VFSize; worsen?: boolean }[] = [
  { id: 'minor-flaw', label: 'gains a Minor Flaw', tier: 'Minor', bonus: 3, flaw: 'Minor' },
  { id: 'minor-virtue', label: 'loses a Minor Virtue', tier: 'Minor', bonus: 3, lose: 'Minor' },
  { id: 'worsen', label: 'a Minor Flaw becomes Major', tier: 'Medium', bonus: 6, worsen: true },
  { id: 'major-flaw', label: 'gains a Major Flaw', tier: 'Major', bonus: 9, flaw: 'Major' },
  { id: 'major-virtue', label: 'loses a Major Virtue', tier: 'Major', bonus: 9, lose: 'Major' },
];

/** The common elements of a Script (DE). A great symbolic Sacrifice is worth +3 to +6. */
export const SCRIPT_ELEMENTS: { id: string; label: string; bonus: number }[] = [
  { id: 'place', label: 'special place and time', bonus: 3 },
  { id: 'quest', label: 'a Quest', bonus: 3 },
  { id: 'time', label: 'Sacrifice of time (serving the cult)', bonus: 1 },
  { id: 'wealth', label: 'Sacrifice of wealth', bonus: 1 },
  { id: 'symbol', label: 'Sacrifice of something of great symbolic value', bonus: 3 },
];

/** First, second and third Initiation after an Ordeal: how much the target drops. */
const REDUCTION: Record<OrdealTier, number[]> = { Minor: [3, 2, 1], Medium: [6, 4, 2], Major: [9, 6, 3] };

/** 15 for a Minor Virtue the Mystagogue knows, 21 for a Major one; 18 and 30 for one the Mystagogue lacks. */
export function baseTarget(size: VFSize, known: boolean): number {
  return size === 'Major' ? (known ? 21 : 30) : known ? 15 : 18;
}

/**
 * The best reduction a past Ordeal gives the next Initiation (only one Ordeal counts). The records are
 * in order, so an Ordeal's nth Initiation after it is the number of records since, plus one.
 */
export function ordealReduction(history: InitiationRecord[], earlier?: { tier: OrdealTier; nth: number }): { amount: number; text: string } {
  let best = { amount: 0, text: '' };
  const nth = ['first', 'second', 'third'];
  history.forEach((h, i) => {
    if (!h.ordeal) return;
    const n = history.length - i;
    const amount = REDUCTION[h.ordeal][n - 1] ?? 0;
    if (amount > best.amount) best = { amount, text: `${nth[n - 1]} Initiation after the ${h.ordeal} Ordeal of ${h.virtueName}` };
  });
  if (earlier) {
    const amount = REDUCTION[earlier.tier][earlier.nth - 1] ?? 0;
    if (amount > best.amount) best = { amount, text: `${nth[earlier.nth - 1]} Initiation after an earlier ${earlier.tier} Ordeal` };
  }
  return best;
}

/** The Initiation Target Level, never below 9. */
export function initiationTarget(size: VFSize, known: boolean, history: InitiationRecord[], earlier?: { tier: OrdealTier; nth: number }) {
  const base = baseTarget(size, known);
  const r = ordealReduction(history, earlier);
  return { base, reduction: r.amount, reductionText: r.text, target: Math.max(9, base - r.amount) };
}

/** Initiation Total = Presence + (House) Lore + Script bonus. No die is rolled. */
export function initiationTotal(presence: number, lore: number, scriptBonus: number): number {
  return presence + lore + scriptBonus;
}

/**
 * Varying a Script: Intelligence + (House) Lore + stress die against 9 to add a component, 12 to change
 * one. Only one change an Initiation; on a failure the Initiation fails this season, with nothing lost.
 */
export function varyScript(int: number, lore: number, change: 'extend' | 'change', rng: Rng = defaultRng) {
  const ease = change === 'extend' ? 9 : 12;
  const r = stressDie(1, rng);
  const total = int + lore + r.value;
  const ok = !r.botches && total >= ease;
  return { ok, total, ease, text: `Vary the Script (${change === 'extend' ? 'add a component' : 'change a component'}): Int ${int} + Lore ${lore} + ${describeStress(r)} = ${total} vs ${ease}: ${ok ? 'the variation works' : r.botches ? 'botch: it will not work this season' : 'it will not work this season'}.` };
}

const ability = (d: DerivedCharacter, ids: string[]) => d.abilities.filter((a) => ids.includes(a.abilityId));

/** The character's Lores that govern Mysteries, the House's own first: House Merinita Lore, (Mystery Cult) Lore: House Bjornaer… */
export function mysteryLores(d: DerivedCharacter, house?: string): { uid: string; name: string; score: number }[] {
  const houseName = house ? (HOUSE_BY_ID[house]?.name ?? house).toLowerCase() : '';
  const lores = ability(d, ['mystery-cult-lore', 'house-merinita-lore', 'organization-lore']).filter(
    (a) => a.abilityId !== 'organization-lore' || /house|cult/i.test(a.name),
  );
  const own = (n: string) => (houseName && n.toLowerCase().includes(houseName) ? 1 : 0);
  return lores.map((a) => ({ uid: a.uid, name: a.name, score: a.total })).sort((a, b) => own(b.name) - own(a.name) || b.score - a.score);
}

/** The Criamon stations of a Path, in order, with which ones the magus has reached. */
export function criamonProgress(c: Character, path: string): { station: CriamonStation; held: boolean }[] {
  return CRIAMON_STATIONS.filter((s) => s.path === path).map((s) => ({ station: s, held: c.virtues.some((v) => v.defId === s.id) }));
}

/** A station needs House Criamon Lore of at least one more than its place on the Path (6 for the last). */
export function stationLoreNeeded(s: CriamonStation): number {
  return s.order + 1;
}

export interface InitiationPlan {
  virtueId: string;
  size: VFSize;
  param?: string;
  mystagogue: string;
  total: number;
  target: number;
  ordeal?: { tier: OrdealTier; text: string; flawId?: string; flawSize?: VFSize; loseUid?: string; worsenUid?: string };
  station?: string;
  year: number;
  season: Season;
}

/**
 * The Initiation succeeds: the Virtue (no Virtue points: it was earned), the Ordeal's price, the record
 * that eases later Initiations, and the season in the log.
 */
export function applyInitiation(c: Character, data: GameData, p: InitiationPlan): string {
  const def = data.vfById.get(p.virtueId);
  const name = def?.name ?? p.virtueId;
  addVirtue(c, data, p.virtueId, p.size, p.param, { free: true, freeReason: 'Initiation' });
  const notes: string[] = [];
  const o = p.ordeal;
  if (o?.flawId) {
    addVirtue(c, data, o.flawId, o.flawSize, undefined, { free: true, freeReason: `Ordeal of ${name}` });
    notes.push(`Ordeal: ${data.vfById.get(o.flawId)?.name ?? o.flawId}`);
  }
  if (o?.loseUid) {
    const lost = c.virtues.find((v) => v.uid === o.loseUid);
    if (lost) {
      c.virtues = c.virtues.filter((v) => v.uid !== o.loseUid && v.requiredBy !== o.loseUid);
      notes.push(`Ordeal: lost ${data.vfById.get(lost.defId)?.name ?? lost.defId}`);
    }
  }
  if (o?.worsenUid) {
    const f = c.virtues.find((v) => v.uid === o.worsenUid);
    if (f) {
      f.size = 'Major';
      notes.push(`Ordeal: ${data.vfById.get(f.defId)?.name ?? f.defId} becomes Major`);
    }
  }
  const rec: InitiationRecord = {
    uid: uid(), year: p.year, season: p.season, virtueId: p.virtueId, virtueName: name, size: p.size, mystagogue: p.mystagogue,
    total: p.total, target: p.target, ...(o ? { ordeal: o.tier, ordealText: o.text } : {}), ...(p.station ? { station: p.station } : {}),
  };
  c.initiations = [...(c.initiations ?? []), rec];
  const summary = `Initiated into ${name} by ${p.mystagogue} (Initiation Total ${p.total} vs ${p.target})${notes.length ? `. ${notes.join('; ')}` : ''}.`;
  c.seasonLog.push({ uid: uid(), year: p.year, season: p.season, activity: 'other', summary, gains: {}, applied: true });
  return summary;
}
