import { ARTS, ART_NAMES, CHARACTERISTICS, type Art, type CharType, type GameData, type VFSize, type Characteristic } from '../../data';
import { HOUSE_BY_ID, EX_MISC_TRADITIONS } from '../../data/houses';
import { SCHEMA_VERSION, type CharAbility, type Character, type CharVirtue, type CreatureQuality, type XpSource } from '../types';
import { uid } from '../../util/id';
import { needMet } from './restrictions';
import { QUALITY_RULES } from './magicCharacter';

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
  const cv = addVirtueOnly(c, data, defId, size, param, extra);
  syncImpliedVirtues(c, data);
  syncMerinitaWarping(c, data);
  return cv;
}

function addVirtueOnly(c: Character, data: GameData, defId: string, size?: VFSize, param?: string, extra: Partial<CharVirtue> = {}): CharVirtue {
  const def = data.vfById.get(defId);
  const cv: CharVirtue = { uid: uid(), defId, size: size ?? def?.sizes[0] ?? 'Minor', param, ...extra };
  c.virtues.push(cv);
  for (const e of def?.effects ?? []) {
    if (e.type === 'grantAbility') ensureAbility(c, e.ability === '$param' ? param ?? '' : e.ability, { free: 5 * ((e.score * (e.score + 1)) / 2) });
  }
  // Virtues and Flaws that this one makes the character take (e.g. Blood of the Nephilim -> Greedy)
  for (const n of def?.needs ?? []) {
    if (!n.auto || needMet(n, c.virtues, data)) continue;
    const adef = data.vfById.get(n.auto.id);
    if (adef) c.virtues.push({ uid: uid(), defId: n.auto.id, size: n.auto.size ?? adef.sizes[0], ...(n.auto.param ? { param: n.auto.param } : {}), noPoints: n.auto.noPoints || undefined, requiredBy: cv.uid });
  }
  return cv;
}

/**
 * The Virtues a Virtue gives at no cost, with its chosen parameter and size: Strong Faerie Blood
 * gives Second Sight, Magical Blood of a magic spirit gives that spirit's Supernatural Virtue.
 */
export function impliedVirtues(cv: CharVirtue, data: GameData): string[] {
  const def = data.vfById.get(cv.defId);
  if (!def) return [];
  const byParam = (cv.param && def.paramEffects?.[cv.param]) || [];
  return [...(def.effects ?? []), ...byParam, ...(def.sizeEffects?.[cv.size] ?? [])].flatMap((e) => (e.type === 'implies' ? [e.virtue] : []));
}

/**
 * Keep the Virtues other Virtues give for free in step with them: add what is missing (a copy the
 * character already bought becomes free), and take away what no longer applies, after any change
 * (a new Virtue, a removed one, a different parameter). Returns notes for the player.
 */
export function syncImpliedVirtues(c: Character, data: GameData): string[] {
  const notes: string[] = [];
  const nameOf = (id: string) => data.vfById.get(id)?.name ?? id;
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    // saves from before grantedBy: "from <name>" freebies belong to the Virtue of that name
    for (const v of c.virtues) {
      if (v.grantedBy || !v.free || !v.freeReason?.startsWith('from ')) continue;
      const src = c.virtues.find((s) => s !== v && `from ${nameOf(s.defId)}` === v.freeReason && impliedVirtues(s, data).includes(v.defId));
      if (src) v.grantedBy = src.uid;
    }
    for (const v of [...c.virtues]) {
      if (!v.grantedBy) continue;
      const src = c.virtues.find((s) => s.uid === v.grantedBy);
      if (src && impliedVirtues(src, data).includes(v.defId)) continue;
      if (v.wasTaken) {
        delete v.grantedBy;
        delete v.wasTaken;
        delete v.free;
        delete v.freeReason;
        notes.push(`${nameOf(v.defId)} is no longer free, and costs its points again.`);
      } else {
        removeVirtueOnly(c, data, v.uid);
        notes.push(`${nameOf(v.defId)} went with it.`);
      }
      changed = true;
    }
    for (const src of [...c.virtues]) {
      const srcName = nameOf(src.defId);
      for (const id of impliedVirtues(src, data)) {
        const idef = data.vfById.get(id);
        if (!idef || c.virtues.some((v) => v.grantedBy === src.uid && v.defId === id)) continue;
        // one copy is enough unless the Virtue can be taken several times (Lesser Power)
        if (!idef.repeatable && c.virtues.some((v) => v.defId === id && (v.free || v.grantedBy))) continue;
        const bought = !idef.repeatable && c.virtues.find((v) => v.defId === id && !v.free && !v.grantedBy && !v.requiredBy);
        if (bought) {
          Object.assign(bought, { free: true, freeReason: `from ${srcName}`, grantedBy: src.uid, wasTaken: true });
          notes.push(`${idef.name} is now free with ${srcName}, and its points come back.`);
        } else {
          addVirtueOnly(c, data, id, idef.sizes[0], undefined, { free: true, freeReason: `from ${srcName}`, grantedBy: src.uid });
          notes.push(`${srcName} gives ${idef.name} free.`);
        }
        changed = true;
      }
    }
    if (!changed) break;
  }
  return notes;
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
  removeVirtueOnly(c, data, uidToRemove);
  syncImpliedVirtues(c, data);
  syncMerinitaWarping(c, data);
}

function removeVirtueOnly(c: Character, data: GameData, uidToRemove: string) {
  const cv = c.virtues.find((v) => v.uid === uidToRemove);
  if (!cv) return;
  const def = data.vfById.get(cv.defId);
  c.virtues = c.virtues.filter((v) => v.uid !== uidToRemove);
  // the Flaws it made the character take go with it (the Virtues it gave free: syncImpliedVirtues)
  c.virtues = c.virtues.filter((v) => v.requiredBy !== uidToRemove);
  // a Virtue or Flaw a Magic Quality or Inferiority brought takes the Quality with it, so its points go too
  const mcq = c.creature?.magicCharacter;
  if (mcq?.qualities.some((q) => q.virtueUid === uidToRemove)) removeQualityCopies(c, data, mcq.qualities.filter((q) => q.virtueUid === uidToRemove));
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

export function recomputeAge(c: Character, currentYear: number) {
  if (c.type === 'magus') {
    c.age = c.creation.apprenticeshipStartAge + 15 + c.creation.yearsPostGauntlet;
  }
  c.birthYear = currentYear - c.age;
}

/**
 * Add copies of a Magic Quality or Inferiority (RoP: Magic). Improved Confidence raises a finished
 * character's stored Confidence too, and Magical Meditation or (Form) Resistance gives its
 * Supernatural Ability at 1.
 */
export function addQualities(c: Character, data: GameData, id: string, count = 1, param?: string): CreatureQuality[] {
  const mc = c.creature?.magicCharacter;
  if (!mc) return [];
  const r = QUALITY_RULES[id] ?? {};
  const added: CreatureQuality[] = [];
  for (let i = 0; i < count; i++) {
    const q: CreatureQuality = { uid: uid(), id, param };
    mc.qualities.push(q);
    added.push(q);
    if (r.confidence && (c.creation.finalized || c.creation.confidenceSet)) {
      c.confidence = { score: c.confidence.score + r.confidence.score, points: c.confidence.points + r.confidence.points };
    }
  }
  syncQualityAbilities(c, data);
  return added;
}

/** Remove the last `count` copies of a Quality (with a given Characteristic, Form or weapon). */
export function removeQualities(c: Character, data: GameData, id: string, param: string | undefined, count: number) {
  const mc = c.creature?.magicCharacter;
  if (!mc) return;
  const copies = mc.qualities.filter((q) => q.id === id && (q.param ?? '') === (param ?? ''));
  removeQualityCopies(c, data, copies.slice(Math.max(0, copies.length - count)));
}

/** Remove one Quality by its uid (with the Virtue or Flaw it brought). */
export function removeQualityUid(c: Character, data: GameData, quid: string) {
  removeQualityCopies(c, data, (c.creature?.magicCharacter?.qualities ?? []).filter((q) => q.uid === quid));
}

function removeQualityCopies(c: Character, data: GameData, qs: CreatureQuality[]) {
  const mc = c.creature?.magicCharacter;
  if (!mc || !qs.length) return;
  const gone = new Set(qs.map((q) => q.uid));
  mc.qualities = mc.qualities.filter((q) => !gone.has(q.uid));
  for (const q of qs) {
    const r = QUALITY_RULES[q.id] ?? {};
    if (r.confidence && (c.creation.finalized || c.creation.confidenceSet)) {
      c.confidence = { score: Math.max(0, c.confidence.score - r.confidence.score), points: Math.max(0, c.confidence.points - r.confidence.points) };
    }
    // the Virtue or Flaw it brought goes with it
    if (q.virtueUid) removeVirtue(c, data, q.virtueUid);
  }
  syncQualityAbilities(c, data);
}

/** The free score of 1 a Quality gives in its Supernatural Ability, kept in step with the Qualities. */
export function syncQualityAbilities(c: Character, _data: GameData) {
  const qs = c.creature?.magicCharacter?.qualities ?? [];
  const want = new Set<string>();
  for (const q of qs) {
    const g = QUALITY_RULES[q.id]?.grantAbility;
    if (!g) continue;
    const param = g === 'form-resistance' ? (q.param ? ART_NAMES[q.param as Art] : undefined) : undefined;
    if (g === 'form-resistance' && !param) continue;
    want.add(`${g}|${param ?? ''}`);
    const ab = ensureAbility(c, g, {}, param);
    ab.xp.quality = 5;
  }
  for (const ab of [...c.abilities]) {
    if (ab.xp.quality === undefined || want.has(`${ab.abilityId}|${ab.param ?? ''}`)) continue;
    delete ab.xp.quality;
    if (Object.values(ab.xp).every((x) => !x)) c.abilities = c.abilities.filter((a) => a !== ab);
  }
}

/** The abilities mastery points can become experience in (RoP: Magic, Improved Powers). */
export const MASTERY_XP_ABILITIES = ['penetration', 'concentration', 'finesse'] as const;

/**
 * Put `points` mastery points into an Ability as experience (5 each), and keep the character's
 * total of mastery points taken as experience in step.
 */
export function setMasteryXp(c: Character, abilityId: (typeof MASTERY_XP_ABILITIES)[number], points: number) {
  const mc = c.creature?.magicCharacter;
  if (!mc) return;
  const key = 'pool:mastery' as XpSource;
  if (points > 0) ensureAbility(c, abilityId).xp[key] = 5 * points;
  else {
    const ab = c.abilities.find((a) => a.abilityId === abilityId && !a.param);
    if (ab) {
      delete ab.xp[key];
      if (Object.values(ab.xp).every((x) => !x)) c.abilities = c.abilities.filter((a) => a !== ab);
    }
  }
  const total = c.abilities.reduce((s, a) => s + (a.xp[key] ?? 0), 0) / 5;
  mc.masteryXp = total || undefined;
}
