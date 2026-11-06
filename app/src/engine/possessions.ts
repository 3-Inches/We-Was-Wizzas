// What a character owns, in one list: weapons and shields, armor, enchanted items and their other
// possessions (tools, a cart, a craftsman's wondrous item, goods bought). Each item keeps its own damage
// (City & Guild, Damaged Goods), so it goes with the item when it is given to someone else.

import type { GameData } from '../data';
import type { Character, ItemCondition, Possession } from './types';
import { itemDamageLevels, type ItemQuality } from './workshop';

/** Kinds of thing whose damage is worth tracking (City & Guild, Damaged Goods: most items Size −1, great weapons 0, a house +5, a ship up to +8, a castle +10). */
export const ITEM_KINDS: { id: string; label: string; size: number; lock?: boolean; ability?: string }[] = [
  { id: 'weapon', label: 'A sword, axe or other single weapon', size: -1, ability: 'single-weapon' },
  { id: 'great', label: 'A great weapon (two-handed)', size: 0, ability: 'great-weapon' },
  { id: 'bow', label: 'A bow or crossbow', size: -1, ability: 'bows' },
  { id: 'shield', label: 'A shield', size: -1, ability: 'single-weapon' },
  { id: 'armor', label: 'A suit of armor', size: -1 },
  { id: 'tool', label: 'A tool, instrument or other small thing', size: -1 },
  { id: 'clothing', label: 'Clothing, a cloak, boots', size: -1 },
  { id: 'lock', label: 'A lock (twice the damage levels)', size: -1, lock: true },
  { id: 'cart', label: 'A cart or wagon', size: 2 },
  { id: 'house', label: 'A house', size: 5 },
  { id: 'ship', label: 'A ship', size: 8 },
  { id: 'castle', label: 'A castle', size: 10 },
];
export const kindOf = (id: string) => ITEM_KINDS.find((k) => k.id === id) ?? ITEM_KINDS.find((k) => k.id === 'tool')!;

export const qualityOf = (q?: number): ItemQuality => (q === undefined || q === 0 ? 'standard' : q < 0 ? 'shoddy' : q >= 3 ? 'excellent' : 'superior');

export interface OwnedItem {
  /** w:<loadout> a weapon, s:<loadout> its shield, armor, i:<uid> an enchanted item, p:<uid> a possession */
  key: string;
  what: 'weapon' | 'shield' | 'armor' | 'enchanted' | 'possession';
  name: string;
  kind: string;
  quality: ItemQuality;
  size: number;
  lock: boolean;
  /** the Ability used with it (its stress checks add it) */
  ability?: string;
  /** a Hermetic item: the magnitudes of its instilled effects */
  magnitudes: number;
  levels: number;
  condition: ItemCondition;
  wonder?: string;
}

const fresh = (): ItemCondition => ({ lost: 0 });
/** A weapon's Ability, named in the weapon tables ("Single Weapon"), as an Ability id ("single-weapon"). */
export const abilityIdOf = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

/** Everything a character owns that can be put at risk. */
export function ownedItems(c: Character, data: GameData): OwnedItem[] {
  const item = (o: Omit<OwnedItem, 'size' | 'lock' | 'levels' | 'condition'> & { condition?: ItemCondition }): OwnedItem => {
    const k = kindOf(o.kind);
    return { ...o, size: k.size, lock: !!k.lock, levels: itemDamageLevels(o.quality, k.size, !!k.lock), condition: o.condition ?? fresh() };
  };
  const out: OwnedItem[] = [];
  for (const w of c.equipment.weapons) {
    const def = data.weaponById.get(w.weaponId);
    const ab = def ? abilityIdOf(def.ability) : undefined;
    if (def) out.push(item({ key: `w:${w.uid}`, what: /shield/i.test(def.name) ? 'shield' : 'weapon', name: w.name || def.name, kind: /shield/i.test(def.name) ? 'shield' : ab === 'great-weapon' ? 'great' : def.kind === 'missile' ? 'bow' : 'weapon', quality: qualityOf(w.quality), ability: ab, magnitudes: 0, condition: w.condition }));
    const sh = w.shieldId ? data.weaponById.get(w.shieldId) : undefined;
    if (sh) out.push(item({ key: `s:${w.uid}`, what: 'shield', name: sh.name, kind: 'shield', quality: 'standard', ability: ab, magnitudes: 0, condition: w.shieldCondition }));
  }
  if (c.equipment.armorId && c.equipment.armorCoverage !== 'none')
    out.push(item({ key: 'armor', what: 'armor', name: `${data.armorById.get(c.equipment.armorId)?.name ?? 'Armor'} (${c.equipment.armorCoverage})`, kind: 'armor', quality: 'standard', magnitudes: 0, condition: c.equipment.armorCondition }));
  for (const it of c.items)
    out.push(item({ key: `i:${it.uid}`, what: 'enchanted', name: it.name || 'Enchanted device', kind: 'tool', quality: 'standard', magnitudes: it.effects.reduce((t, e) => t + Math.ceil((e.modifiedLevel ?? 0) / 5), 0), condition: it.condition }));
  for (const p of c.possessions ?? [])
    out.push(item({ key: `p:${p.uid}`, what: 'possession', name: p.name || kindOf(p.kind).label, kind: p.kind, quality: p.quality, ability: p.ability ?? kindOf(p.kind).ability, magnitudes: 0, condition: p.condition, wonder: p.wonder }));
  return out;
}

const split = (key: string) => {
  const i = key.indexOf(':');
  return i < 0 ? { kind: key, id: '' } : { kind: key.slice(0, i), id: key.slice(i + 1) };
};

/** Put an item's damage on it (or clear it). Changes the character. */
export function setCondition(c: Character, key: string, cond: ItemCondition | undefined) {
  const { kind, id } = split(key);
  const keep = cond && (cond.lost > 0 || cond.repaired) ? cond : undefined;
  if (kind === 'w' || kind === 's') {
    const w = c.equipment.weapons.find((x) => x.uid === id);
    if (w) w[kind === 'w' ? 'condition' : 'shieldCondition'] = keep;
  } else if (kind === 'armor') c.equipment.armorCondition = keep;
  else if (kind === 'i') {
    const it = c.items.find((x) => x.uid === id);
    if (it) it.condition = keep;
  } else if (kind === 'p') {
    const p = c.possessions?.find((x) => x.uid === id);
    if (p) p.condition = keep;
  }
}

/** Take an item off a character, to give or discard. Returns what was taken, ready to put on another. */
function take(c: Character, key: string): ((to: Character) => string | undefined) | undefined {
  const { kind, id } = split(key);
  if (kind === 'w') {
    const i = c.equipment.weapons.findIndex((x) => x.uid === id);
    if (i < 0) return undefined;
    const w = c.equipment.weapons[i];
    // the shield stays in the hand that holds it, as its own
    if (w.shieldId) c.equipment.weapons[i] = { uid: w.uid, weaponId: w.shieldId, condition: w.shieldCondition };
    else c.equipment.weapons.splice(i, 1);
    const moved = { ...w, shieldId: undefined, shieldCondition: undefined };
    return (to) => void to.equipment.weapons.push({ ...moved, uid: `${moved.uid}-${to.id.slice(0, 4)}` });
  }
  if (kind === 's') {
    const w = c.equipment.weapons.find((x) => x.uid === id);
    if (!w?.shieldId) return undefined;
    const shield = { uid: `${w.uid}-s`, weaponId: w.shieldId, condition: w.shieldCondition };
    delete w.shieldId;
    delete w.shieldCondition;
    return (to) => void to.equipment.weapons.push({ ...shield, uid: `${shield.uid}-${to.id.slice(0, 4)}` });
  }
  if (kind === 'armor') {
    if (!c.equipment.armorId) return undefined;
    const armor = { id: c.equipment.armorId, coverage: c.equipment.armorCoverage, condition: c.equipment.armorCondition };
    c.equipment.armorId = undefined;
    c.equipment.armorCoverage = 'none';
    delete c.equipment.armorCondition;
    return (to) => {
      if (to.equipment.armorId && to.equipment.armorCoverage !== 'none') return `${to.name || 'They'} already wear armor`;
      to.equipment.armorId = armor.id;
      to.equipment.armorCoverage = armor.coverage;
      to.equipment.armorCondition = armor.condition;
    };
  }
  if (kind === 'i') {
    const i = c.items.findIndex((x) => x.uid === id);
    if (i < 0) return undefined;
    const [it] = c.items.splice(i, 1);
    // a talisman is attuned to its magus: given away, it is no longer theirs
    if (c.talismanUid === it.uid) delete c.talismanUid;
    return (to) => void to.items.push(it);
  }
  if (kind === 'p') {
    const i = (c.possessions ?? []).findIndex((x) => x.uid === id);
    if (i < 0) return undefined;
    const [p] = c.possessions!.splice(i, 1);
    return (to) => void (to.possessions = [...(to.possessions ?? []), p]);
  }
  return undefined;
}

/** Give an item to another character, its damage with it. Changes both; returns why not, if it cannot be done. */
export function giveItem(from: Character, to: Character, key: string): string | undefined {
  if (from.id === to.id) return 'They already have it';
  if (key === 'armor' && to.equipment.armorId && to.equipment.armorCoverage !== 'none') return `${to.name || 'They'} already wear armor`;
  const put = take(from, key);
  if (!put) return 'Nothing to give';
  return put(to);
}

/** Throw an item away (a broken one cannot be repaired). Changes the character. */
export function discardItem(c: Character, key: string): boolean {
  return !!take(c, key);
}

/** A possession to add: a kind of thing, its quality and name. */
export function newPossession(uid: string, kind: string, quality: Possession['quality'], name = '', more: Partial<Possession> = {}): Possession {
  return { uid, name, kind, quality, ...more };
}
