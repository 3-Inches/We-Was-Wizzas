import { ARTS, CHARACTERISTICS, type Art, type CharType, type GameData, type VFSize, type Characteristic } from '../../data';
import { HOUSE_BY_ID, EX_MISC_TRADITIONS } from '../../data/houses';
import { SCHEMA_VERSION, type CharAbility, type Character, type CharVirtue, type XpSource } from '../types';
import { uid } from '../../util/id';
import { needMet } from './restrictions';

export function newCharacter(type: CharType, sagaId: string, year = 1220): Character {
  const now = new Date().toISOString();
  const age = type === 'magus' ? 25 : type === 'grog' ? 22 : 25;
  const c: Character = {
    id: uid(),
    sagaId,
    schemaVersion: SCHEMA_VERSION,
    type,
    name: '',
    player: '',
    gender: '',
    society: 'Western Christendom',
    nationality: '',
    birthYear: year - age,
    age,
    description: '',
    virtues: [],
    characteristics: Object.fromEntries(CHARACTERISTICS.map((c) => [c, 0])) as Record<Characteristic, number>,
    agingPoints: {},
    abilities: [],
    arts: Object.fromEntries(ARTS.map((a) => [a, {}])) as Record<Art, Record<string, number>>,
    spells: [],
    personality: [],
    reputations: [],
    confidence: type === 'grog' ? { score: 0, points: 0 } : { score: 1, points: 3 },
    warpingPoints: 0,
    decrepitudePoints: 0,
    equipment: { weapons: [], armorCoverage: 'none', other: '' },
    items: [],
    wounds: { light: 0, medium: 0, heavy: 0, incapacitating: 0 },
    fatigueLost: 0,
    longTermFatigueLost: 0,
    twilightScars: [],
    overrides: {},
    acknowledgedIssues: [],
    seasonLog: [],
    creation: {
      step: 0,
      apprenticeshipStartAge: 10,
      yearsPostGauntlet: 0,
      postGauntletLabSeasons: 0,
      finalized: false,
      extraPools: [],
    },
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
  // Mandatory Virtues for magi
  if (type === 'magus') {
    c.virtues.push({ uid: uid(), defId: 'the-gift', size: 'Free', free: true, freeReason: 'Magus' });
    c.virtues.push({ uid: uid(), defId: 'hermetic-magus', size: 'Free', free: true, freeReason: 'Magus' });
    c.age = c.creation.apprenticeshipStartAge + 15;
    c.birthYear = year - c.age;
  }
  if (type === 'grog') {
    c.virtues.push({ uid: uid(), defId: 'covenfolk', size: 'Free' });
    c.personality.push({ uid: uid(), trait: 'Loyal', score: 1 });
  }
  return c;
}

/** Add a Virtue/Flaw and any Virtues it implies (as free). */
export function addVirtue(c: Character, data: GameData, defId: string, size?: VFSize, param?: string, extra: Partial<CharVirtue> = {}): CharVirtue {
  const def = data.vfById.get(defId);
  const cv: CharVirtue = { uid: uid(), defId, size: size ?? def?.sizes[0] ?? 'Minor', param, ...extra };
  c.virtues.push(cv);
  for (const e of def?.effects ?? []) {
    if (e.type === 'implies' && !c.virtues.some((v) => v.defId === e.virtue)) {
      const idef = data.vfById.get(e.virtue);
      if (idef) c.virtues.push({ uid: uid(), defId: e.virtue, size: idef.sizes[0], free: true, freeReason: `from ${def?.name}` });
    }
    if (e.type === 'grantAbility') ensureAbility(c, e.ability === '$param' ? param ?? '' : e.ability, { free: 5 * ((e.score * (e.score + 1)) / 2) });
  }
  // Virtues and Flaws that this one makes the character take (e.g. Blood of the Nephilim -> Greedy)
  for (const n of def?.needs ?? []) {
    if (!n.auto || needMet(n, c.virtues, data)) continue;
    const adef = data.vfById.get(n.auto.id);
    if (adef) c.virtues.push({ uid: uid(), defId: n.auto.id, size: n.auto.size ?? adef.sizes[0], noPoints: n.auto.noPoints || undefined, requiredBy: cv.uid });
  }
  syncMerinitaWarping(c, data);
  return cv;
}

/** A faerie-related Virtue or Flaw, other than the Merinita House Virtue itself (DE p.44). */
export function hasFaerieVirtue(c: Character, data: GameData): boolean {
  return c.virtues.some((v) => v.freeReason !== 'House Virtue' && /faerie|\bfae\b|\bfay\b|fairy/i.test(data.vfById.get(v.defId)?.name ?? ''));
}

/**
 * Merinita magi without a faerie-related Virtue or Flaw start with a Warping Point. Keep that
 * point in step with the Virtues while the character is being created.
 */
export function syncMerinitaWarping(c: Character, data: GameData) {
  if (c.house !== 'merinita' || c.type !== 'magus' || c.creation.finalized) return;
  const faerie = hasFaerieVirtue(c, data);
  if (!faerie && c.warpingPoints < 1) c.warpingPoints = 1;
  if (faerie && c.warpingPoints === 1) c.warpingPoints = 0;
}

export function removeVirtue(c: Character, data: GameData, uidToRemove: string) {
  const cv = c.virtues.find((v) => v.uid === uidToRemove);
  if (!cv) return;
  const def = data.vfById.get(cv.defId);
  c.virtues = c.virtues.filter((v) => v.uid !== uidToRemove);
  // remove implied freebies that came only from this virtue, and the Flaws it made the character take
  c.virtues = c.virtues.filter((v) => !(v.free && v.freeReason === `from ${def?.name}`) && v.requiredBy !== uidToRemove);
  // remove granted free xp
  for (const e of def?.effects ?? []) {
    if (e.type === 'grantAbility') {
      const ab = c.abilities.find((a) => a.abilityId === (e.ability === '$param' ? cv.param : e.ability));
      if (ab) {
        delete ab.xp.free;
        if (Object.values(ab.xp).every((x) => !x)) c.abilities = c.abilities.filter((a) => a !== ab);
      }
    }
  }
  // xp spent from a pool this Virtue gave (Educated, Warrior, Book Learner mastery...) goes with it
  const key = `pool:${cv.uid}` as XpSource;
  for (const ab of c.abilities) delete ab.xp[key];
  for (const a of Object.values(c.arts)) if (a) delete a[key];
  for (const s of c.spells) delete s.masteryXp[key];
  syncMerinitaWarping(c, data);
}

export function ensureAbility(c: Character, abilityId: string, xp: Partial<Record<XpSource, number>> = {}, param?: string): CharAbility {
  let ab = c.abilities.find((a) => a.abilityId === abilityId && (a.param ?? '') === (param ?? ''));
  if (!ab) {
    ab = { uid: uid(), abilityId, param, xp: {} };
    c.abilities.push(ab);
  }
  for (const [k, v] of Object.entries(xp)) ab.xp[k as XpSource] = Math.max(ab.xp[k as XpSource] ?? 0, v ?? 0);
  return ab;
}

/** Set the House and apply its free benefit. */
export function setHouse(c: Character, data: GameData, houseId: string, benefitIndex = 0, jerbitonChoice?: { defId: string; param?: string }) {
  // remove previous house freebies
  const prevHouse = c.virtues.filter((v) => v.freeReason === 'House Virtue' || v.freeReason === 'Ex Miscellanea');
  for (const v of prevHouse) removeVirtue(c, data, v.uid);
  // leaving Merinita during creation takes back its Warping Point
  if (c.house === 'merinita' && houseId !== 'merinita' && !c.creation.finalized && !hasFaerieVirtue(c, data) && c.warpingPoints === 1) c.warpingPoints = 0;
  c.house = houseId;
  c.creation.houseBenefit = benefitIndex;
  const h = HOUSE_BY_ID[houseId];
  if (!h) return;
  if (h.benefitOptions.length) {
    const opt = h.benefitOptions[Math.min(benefitIndex, h.benefitOptions.length - 1)];
    addVirtue(c, data, opt.virtueId, 'Minor', opt.param, { free: true, freeReason: 'House Virtue' });
  } else if (h.freeChoiceFrom && jerbitonChoice) {
    addVirtue(c, data, jerbitonChoice.defId, 'Minor', jerbitonChoice.param, { free: true, freeReason: 'House Virtue' });
  }
  syncMerinitaWarping(c, data);
}

export function applyExMiscTradition(c: Character, data: GameData, traditionId: string, picks?: { major?: string; minor?: string; minorParam?: string; flaw?: string; flawParam?: string }) {
  for (const v of c.virtues.filter((v) => v.freeReason === 'Ex Miscellanea')) removeVirtue(c, data, v.uid);
  c.creation.exMiscTradition = traditionId;
  const t = EX_MISC_TRADITIONS.find((x) => x.id === traditionId);
  if (!t) return;
  const major = picks?.major ?? t.majorNonHermetic;
  const minor = picks?.minor ?? t.minorHermetic;
  const flaw = picks?.flaw ?? t.majorHermeticFlaw;
  if (major) addVirtue(c, data, major, 'Major', undefined, { free: true, freeReason: 'Ex Miscellanea' });
  if (minor) addVirtue(c, data, minor, 'Minor', picks?.minorParam ?? (traditionId === 'tempestaria' ? 'Au' : traditionId === 'beast-masters' ? 'animals' : undefined), { free: true, freeReason: 'Ex Miscellanea' });
  if (flaw) addVirtue(c, data, flaw, 'Major', picks?.flawParam ?? t.majorHermeticFlawParam, { free: true, freeReason: 'Ex Miscellanea', noPoints: true });
}

export const MYTHIC_TYPES: Record<string, { label: string; virtue: string; requiredVirtues: string[]; requiredFlaws: string[]; minAbilities: Record<string, number>; freeMinor: string }> = {
  'devil-child': {
    label: 'Devil Child', virtue: 'devil-child', requiredVirtues: ['demonic-blood', 'puissant-ability'], requiredFlaws: ['tragic-life-flaw'],
    minAbilities: {}, freeMinor: 'demonic-might',
  },
  'faerie-doctor': {
    label: 'Faerie Doctor', virtue: 'faerie-doctor', requiredVirtues: ['wise-one', 'curse-throwing'], requiredFlaws: ['faerie-friend-flaw', 'dutybound-flaw'],
    minAbilities: { 'curse-throwing': 4, dowsing: 1, 'faerie-lore': 3, 'profession-type': 1 }, freeMinor: 'dowsing',
  },
  nephilim: {
    label: 'Nephilim', virtue: 'nephilim', requiredVirtues: ['blood-of-the-nephilim', 'greater-immunity', 'great-characteristic', 'improved-characteristics', 'sense-holiness-and-unholiness'], requiredFlaws: [],
    minAbilities: { 'dominion-lore': 4, penetration: 1, 'sense-holiness-and-unholiness': 3 }, freeMinor: 'strong-angelic-heritage',
  },
  'spirit-votary': {
    label: 'Spirit Votary', virtue: 'spirit-votary', requiredVirtues: ['spiritual-pact'], requiredFlaws: ['pagan-flaw'],
    minAbilities: { 'area-lore': 1, 'magic-lore': 4, penetration: 1, 'second-sight': 3 }, freeMinor: 'second-sight',
  },
};

export function applyMythicType(c: Character, data: GameData, typeId: string) {
  // clear previous
  for (const v of c.virtues.filter((v) => v.freeReason === 'Mythic Companion' || v.freeReason === 'Mythic Companion free Minor Virtue')) removeVirtue(c, data, v.uid);
  const t = MYTHIC_TYPES[typeId];
  if (!t) return;
  c.virtues.push({ uid: uid(), defId: t.virtue, size: 'Free', free: true, freeReason: 'Mythic Companion' });
  if (!c.virtues.some((v) => v.defId === t.freeMinor)) addVirtue(c, data, t.freeMinor, 'Minor', undefined, { free: true, freeReason: 'Mythic Companion free Minor Virtue' });
  for (const v of t.requiredVirtues) {
    if (c.virtues.some((x) => x.defId === v)) continue;
    const def = data.vfById.get(v);
    const param = v === 'puissant-ability' ? 'guile' : v === 'greater-immunity' ? 'Disease' : undefined;
    addVirtue(c, data, v, def?.sizes[0], param);
    if (v === 'great-characteristic') addVirtue(c, data, v, 'Minor', 'Str');
  }
  for (const f of t.requiredFlaws) if (!c.virtues.some((x) => x.defId === f)) addVirtue(c, data, f, data.vfById.get(f)?.sizes[0]);
}

export function totalCharCost(values: Record<Characteristic, number>): number {
  const cost: Record<number, number> = { 3: 6, 2: 3, 1: 1, 0: 0, [-1]: -1, [-2]: -3, [-3]: -6 };
  return CHARACTERISTICS.reduce((s, c) => s + (cost[values[c]] ?? 0), 0);
}

export function setAllocation(c: Character, target: { kind: 'ability'; uid: string } | { kind: 'art'; art: Art } | { kind: 'mastery'; uid: string }, source: XpSource, xp: number) {
  const v = Math.max(0, Math.round(xp));
  if (target.kind === 'ability') {
    const ab = c.abilities.find((a) => a.uid === target.uid);
    if (!ab) return;
    if (v === 0) delete ab.xp[source];
    else ab.xp[source] = v;
  } else if (target.kind === 'art') {
    const alloc = c.arts[target.art] ?? (c.arts[target.art] = {});
    if (v === 0) delete alloc[source];
    else alloc[source] = v;
  } else {
    const s = c.spells.find((x) => x.uid === target.uid);
    if (!s) return;
    if (v === 0) delete s.masteryXp[source];
    else s.masteryXp[source] = v;
  }
}

export function recomputeAge(c: Character, currentYear: number) {
  if (c.type === 'magus') {
    c.age = c.creation.apprenticeshipStartAge + 15 + c.creation.yearsPostGauntlet;
  }
  c.birthYear = currentYear - c.age;
}
