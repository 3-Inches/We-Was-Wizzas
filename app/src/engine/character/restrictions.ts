// Who may take a Virtue or Flaw. One checker serves both the Virtue picker (before taking it)
// and the rules check (for Virtues already on the character), so a restriction that hides an
// entry from the list also flags it when it was taken anyway, imported, or made illegal by a
// later change (a new House, a lower Presence, a removed prerequisite...).

import { CHAR_NAMES, type CharType, type GameData, type VFNeed, type VFSize, type VirtueFlawDef } from '../../data';
import { HOUSE_BY_ID } from '../../data/houses';
import type { CharVirtue, HouseRules } from '../types';
import type { DerivedCharacter } from './derive';

export type VFSeverity = 'error' | 'warning' | 'info';

export interface VFProblem {
  /** stable issue id (used to remember troupe rulings) */
  id: string;
  /** the kind of problem, used to offer fixes */
  code: string;
  severity: VFSeverity;
  /** a few words for the Virtue picker */
  short: string;
  message: string;
  ref?: string;
  fix?: string;
  /** the other Virtue/Flaw involved (prerequisite, incompatible one...) */
  other?: string;
  /** which of the Virtue's needs is missing */
  needIndex?: number;
  /** Virtues this one would replace when taken (a Social Status swap) */
  replaces?: string[];
}

export interface CheckOptions {
  /** the saga's creation limits; without them the point and count limits are not checked */
  rules?: HouseRules;
  /** the size being considered when taking it (defaults to the cheapest) */
  size?: VFSize;
}

const SIZE_POINTS: Record<VFSize, number> = { Major: 3, Minor: 1, Free: 0 };

/** The size that costs (or gives) the fewest points. */
export function cheapestSize(def: VirtueFlawDef): VFSize {
  return [...def.sizes].sort((a, b) => SIZE_POINTS[a] - SIZE_POINTS[b])[0] ?? 'Minor';
}

/**
 * May a character have both Social Statuses? Only when a description says they are compatible
 * (DE p.63). Paid Rights works with statuses restricted to men; Male Guild Sponsor with any.
 */
export function statusesCompatible(a: VirtueFlawDef, b: VirtueFlawDef): boolean {
  const says = (x: VirtueFlawDef, y: VirtueFlawDef) => {
    if (x.compatibleStatuses?.includes(y.id) || x.compatibleStatuses?.includes('*')) return true;
    const name = y.name.replace(/\s*\(.*\)$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`compatible[^.]*${name}`, 'i').test(x.text);
  };
  if (says(a, b) || says(b, a)) return true;
  if ((a.id === 'paid-rights' && b.maleOnly) || (b.id === 'paid-rights' && a.maleOnly)) return true;
  return a.id === 'male-guild-sponsor' || b.id === 'male-guild-sponsor';
}

const TYPE_PLURAL: Record<CharType, string> = { grog: 'grogs', companion: 'companions', mythic: 'Mythic Companions', magus: 'magi' };

/** Free Virtues the app grants as part of a package; type and House limits do not apply to them. */
export function isPackageFreebie(cv?: CharVirtue): boolean {
  if (!cv?.free) return false;
  const r = cv.freeReason ?? '';
  return ['Magus', 'House Virtue', 'Ex Miscellanea', 'Mythic Companion', 'Mythic Companion free Minor Virtue'].includes(r) || r.startsWith('from ');
}

export function genderOf(gender: string): 'male' | 'female' | undefined {
  const g = gender.trim().toLowerCase();
  if (/^(f|woman|girl|lady|maga\b)/.test(g)) return 'female';
  if (/^(m|man|boy)/.test(g)) return 'male';
  return undefined;
}

/** Is a need met by these Virtues? Tokens ('$gift'...) need the derived character. */
export function needMet(need: VFNeed, virtues: CharVirtue[], data: GameData, d?: DerivedCharacter): boolean {
  const token = (t: string): boolean => {
    if (!d) return false;
    if (t === '$gift') return d.hasGift;
    if (t === '$academic') return d.isMagus || d.abilityAccess.types.has('Academic');
    if (t === '$arcane') return d.isMagus || d.abilityAccess.types.has('Arcane');
    if (t === '$martial') return d.isMagus || d.abilityAccess.types.has('Martial');
    if (t === '$supernaturalAbility') return d.abilities.some((a) => a.type === 'Supernatural' && (a.score > 0 || a.granted > 0));
    return false;
  };
  if (need.anyOf?.some((id) => (id.startsWith('$') ? token(id) : virtues.some((v) => v.defId === id)))) return true;
  const m = need.match;
  if (m) {
    return virtues.some((v) => {
      const def = data.vfById.get(v.defId);
      if (!def) return false;
      return (!m.category || def.categories.includes(m.category)) && (!m.size || v.size === m.size) && (!m.kind || def.kind === m.kind);
    });
  }
  return false;
}

function signed(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

function houseNames(ids: string[]) {
  return ids.map((h) => HOUSE_BY_ID[h]?.name ?? h).join(' or ');
}

/**
 * Problems with a Virtue/Flaw for this character. Pass `cv` for one already taken (checked
 * against the character's other choices); omit it to ask whether it can be taken now. With
 * `opts.rules`, taking it is also checked against the creation limits (Flaw points, Minor
 * Flaws, Major Hermetic Virtues, affordable Virtue points, one Social Status).
 */
export function vfProblems(d: DerivedCharacter, data: GameData, def: VirtueFlawDef, cv?: CharVirtue, opts: CheckOptions = {}): VFProblem[] {
  const c = d.char;
  const type = c.type;
  const adding = !cv;
  const key = cv?.uid ?? def.id;
  const others = cv ? c.virtues.filter((v) => v.uid !== cv.uid) : c.virtues;
  const packaged = isPackageFreebie(cv);
  const ref = `${def.source.book}, ${def.name}`;
  const quote = def.restrictionText ? ` (“${def.restrictionText}”)` : '';
  const out: VFProblem[] = [];
  const push = (code: string, severity: VFSeverity, short: string, message: string, extra: Partial<VFProblem> & { idPart?: string } = {}) => {
    const { idPart, ...rest } = extra;
    out.push({ id: `${idPart ?? code}-${key}`, code, severity, short, message, ref, ...rest });
  };
  const vfName = (id: string) => data.vfById.get(id)?.name ?? id;

  // ---------------------------------------------------------------- character type
  if (!packaged) {
    if (def.forTypes && !def.forTypes.includes(type)) {
      push('fortype', 'error', `Only for ${def.forTypes.map((t) => TYPE_PLURAL[t]).join(' / ')}`, `${def.name} is only available to ${def.forTypes.map((t) => TYPE_PLURAL[t]).join(' and ')}.${quote}`);
    } else if (def.notForTypes?.includes(type)) {
      push('fortype', 'error', `Not for ${TYPE_PLURAL[type]}`, `${def.name} is not available to ${TYPE_PLURAL[type]}.${quote}`);
    }
    if (def.categories.includes('Mythic Companion') && type !== 'mythic') {
      push('mythic-only', 'error', 'Mythic Companions only', `Only Mythic Companions may take a Mythic Companion Virtue (${def.name}).`, { ref: 'DE p.55' });
    }
  }
  if (type === 'grog' && !cv?.free) {
    const size = cv?.size ?? opts.size;
    const major = size ? size === 'Major' : !def.sizes.includes('Minor') && !def.sizes.includes('Free');
    if (major) push('grog-major', 'error', 'Grogs take only Minor Virtues/Flaws', `Grogs may not take Major Virtues or Flaws (${def.name}).`, { ref: 'DE p.63' });
    if (def.categories.includes('Hermetic')) push('grog-hermetic', 'error', 'Grogs cannot take Hermetic Virtues/Flaws', `Grogs may not take Hermetic Virtues or Flaws (${def.name}).`, { ref: 'DE p.63' });
    if (def.categories.includes('Story') && def.kind === 'flaw') push('grog-story', 'warning', 'Grogs should not take Story Flaws', `Grogs should not take Story Flaws (${def.name}).`, { ref: 'DE p.63' });
  }

  // ---------------------------------------------------------------- The Gift
  if (adding && def.id === 'the-gift' && type === 'grog') push('grog-gift', 'error', 'Grogs cannot have The Gift', 'Grogs may not have The Gift.', { ref: 'DE p.63' });
  const needsGift = def.requiresGift || (def.categories.includes('Hermetic') && !def.categories.includes('General'));
  if (needsGift && def.id !== 'the-gift' && !d.hasGift) {
    const hermetic = def.categories.includes('Hermetic');
    push('gift', 'error', 'Requires The Gift', hermetic ? `${def.name} is Hermetic; only characters with The Gift may take Hermetic Virtues and Flaws.` : `${def.name} requires The Gift.${quote}`, hermetic ? { ref: 'DE p.63–64' } : {});
  }
  if (def.noGift && d.hasGift) push('nogift', 'error', 'Not with The Gift', `${def.name} cannot be taken by a character with The Gift.${quote}`);

  // ---------------------------------------------------------------- Houses
  if (def.houses?.length && !packaged) {
    const names = houseNames(def.houses);
    if (type !== 'magus') push('house-only', 'error', `Magi of House ${names} only`, `${def.name} is only available to magi of House ${names}.${quote}`);
    else if (c.house && !def.houses.includes(c.house)) {
      push('house-only', def.houseSeverity ?? 'error', `House ${names} only`, `${def.name} is only available to magi of House ${names}; this magus is of House ${HOUSE_BY_ID[c.house]?.name ?? c.house}.${quote}`);
    }
  } else if (def.house && c.house && def.house !== c.house && !cv?.free) {
    push('house-only', 'warning', `House ${houseNames([def.house])} only`, `${def.name} is normally only available to House ${houseNames([def.house])}.`);
  }

  // ---------------------------------------------------------------- gender
  const g = genderOf(c.gender);
  if (def.maleOnly && g === 'female' && !others.some((v) => v.defId === 'paid-rights')) {
    push('male-only', 'warning', 'Male characters only', `${def.name} is only available to characters perceived by society as male, unless she takes Paid Rights.${quote}`, { ref: 'DE, Paid Rights' });
  }
  if (def.femaleOnly && g === 'male') push('female-only', 'warning', 'Female characters only', `${def.name} is only available to female characters.${quote}`);

  // ---------------------------------------------------------------- combinations
  for (const ex of def.excludes ?? []) {
    if (others.some((o) => o.defId === ex)) {
      out.push({ id: `excl-${[def.id, ex].sort().join('-')}`, code: 'excl', other: ex, severity: 'error', short: `Incompatible with ${vfName(ex)}`, message: `${def.name} cannot be combined with ${vfName(ex)}.`, ref });
    }
  }
  for (const r of def.requires ?? []) {
    if (!others.some((o) => o.defId === r)) push('req', 'error', `Requires ${vfName(r)}`, `${def.name} requires ${vfName(r)}.${quote}`, { idPart: `req-${r}`, other: r, fix: `Add ${vfName(r)}.` });
  }
  (def.needs ?? []).forEach((n, i) => {
    if (needMet(n, others, data, d)) return;
    if (adding && n.auto) return; // it is added along with this Virtue
    const auto = n.auto ? vfName(n.auto.id) : undefined;
    // quote the need's own wording; the Virtue's restriction text only when it is about this need
    const q = n.quote ? ` (“${n.quote}”)` : def.forTypes || def.notForTypes || def.houses ? '' : quote;
    push('need', n.severity ?? 'error', `Requires ${n.label}`, `${def.name} requires ${n.label}.${q}`, { idPart: `need${i}`, needIndex: i, other: n.auto?.id, ...(auto ? { fix: `Add ${auto}.` } : {}) });
  });

  // ---------------------------------------------------------------- Characteristics & age
  const charCheck = (ch: keyof typeof CHAR_NAMES, ok: (v: number) => boolean, want: string) => {
    const val = d.characteristics[ch].value;
    if (ok(val)) return;
    if (adding) push('char', 'warning', `Needs ${CHAR_NAMES[ch]} ${want}`, `${def.name} needs ${CHAR_NAMES[ch]} ${want} (currently ${signed(val)}); set it on the Characteristics step.`, { idPart: `char-${ch}`, other: ch });
    else push('char', 'error', `Needs ${CHAR_NAMES[ch]} ${want}`, `${def.name} needs ${CHAR_NAMES[ch]} ${want}; the character has ${signed(val)}.${quote}`, { idPart: `char-${ch}`, other: ch });
  };
  for (const [ch, min] of Object.entries(def.minChar ?? {})) charCheck(ch as keyof typeof CHAR_NAMES, (v) => v >= min, min === 1 ? 'above 0' : `of ${signed(min)} or more`);
  for (const [ch, max] of Object.entries(def.maxChar ?? {})) charCheck(ch as keyof typeof CHAR_NAMES, (v) => v <= max, max === 0 ? 'of 0 or less' : `of ${signed(max)} or less`);
  if (def.minAge && c.age < def.minAge) push('age', 'error', `Age ${def.minAge}+ only`, `${def.name} needs a character at least ${def.minAge} years old (age ${c.age}).${quote}`);

  // ---------------------------------------------------------------- beings & traditions
  if (def.beings && !cv?.free) {
    push('being', 'error', `For ${def.beings.replace(/ \(.*\)$/, '')} only`, `${def.name} is for ${def.beings}, not for characters built with the normal character-creation rules.`);
  }
  if (def.tradition && type === 'magus' && !cv?.free) {
    push('tradition', 'warning', `${def.tradition.replace(/ \(.*\)$/, '')} tradition`, `${def.name} belongs to the ${def.tradition} tradition; Hermetic magi do not normally take it.`);
  }

  // ---------------------------------------------------------------- special cases from the text
  if (def.id === 'academic-concentration-subject' && others.some((o) => o.defId === 'puissant-ability' && o.param === 'artes-liberales')) {
    push('excl-puissant', 'error', 'Incompatible with Puissant Artes Liberales', `${def.name} is incompatible with Puissant Artes Liberales.`, { idPart: 'excl-puissant-al' });
  }
  if (def.id === 'student-of-realm' && cv?.param) {
    const lore = `${cv.param.toLowerCase().replace('divine', 'dominion')}-lore`;
    if (others.some((o) => o.defId === 'puissant-ability' && o.param === lore)) push('excl-puissant', 'error', 'Not with Puissant (same Lore)', `You may not take Student of (Realm) and Puissant Ability for the same Lore (${cv.param}).`, { idPart: 'excl-puissant-lore' });
  }
  if (def.id === 'arcane-lore' && cv && d.hasGift && type !== 'magus' && c.abilities.some((a) => a.abilityId === 'parma-magica' && Object.values(a.xp).some((x) => x))) {
    if (!others.some((o) => o.defId === 'enemies-flaw')) {
      push('arcane-parma', 'warning', 'Needs Enemies: Order of Hermes', 'A Gifted character who is not a Hermetic magus and knows Parma Magica must take the Major Story Flaw Enemies (the entire Order of Hermes).', { other: 'enemies-flaw', fix: 'Add Enemies (Order of Hermes), or drop Parma Magica.' });
    }
  }

  // ---------------------------------------------------------------- picker-only
  if (adding) {
    if (!data.isBookEnabled(def.source.book)) push('book', 'error', 'Book not enabled for this saga', `${def.source.book} is not enabled for this saga.`);
    if (!def.repeatable && !def.param && c.virtues.some((x) => x.defId === def.id)) push('taken', 'error', 'Already taken', `${def.name} is already taken.`);
    if (def.categories.includes('Social Status')) statusSwap(d, def, push);
    if (opts.rules && !c.creation.finalized) limitChecks(d, def, opts.size ?? cheapestSize(def), opts.rules, push);
  }
  return out;
}

type Push = (code: string, severity: VFSeverity, short: string, message: string, extra?: Partial<VFProblem> & { idPart?: string }) => void;

/** Taking a Social Status replaces an incompatible one, except Hermetic Magus, which magi must keep. */
function statusSwap(d: DerivedCharacter, def: VirtueFlawDef, push: Push) {
  const clash = d.virtues.filter((v) => v.def?.categories.includes('Social Status') && v.def.id !== def.id && !statusesCompatible(v.def, def));
  if (!clash.length) return;
  if (clash.some((v) => v.cv.defId === 'hermetic-magus')) {
    push('status-extra', 'error', 'Magi keep Hermetic Magus', `Magi must keep the Hermetic Magus Social Status, and ${def.name} is not described as compatible with it.`, { ref: 'DE p.63' });
    return;
  }
  const names = clash.map((v) => v.name).join(', ');
  push('status-replace', 'info', `Replaces ${names}`, `A character has one Social Status unless the descriptions say they are compatible, so ${def.name} replaces ${names}.`, { ref: 'DE p.63', replaces: clash.map((v) => v.cv.uid) });
}

/** Creation limits a new Virtue/Flaw would break (DE p.61–63). */
function limitChecks(d: DerivedCharacter, def: VirtueFlawDef, size: VFSize, rules: HouseRules, push: Push) {
  const t = d.tally;
  const type = d.char.type;
  const pts = SIZE_POINTS[size];
  const maxFlaws = type === 'grog' ? rules.grogMaxFlawPoints : rules.maxFlawPoints;
  if (def.kind === 'flaw') {
    if (pts && t.flawPoints + pts > maxFlaws) push('limit-flaws', 'error', `Over the ${maxFlaws} Flaw-point limit`, `${def.name} would take the character to ${t.flawPoints + pts} points of Flaws; the limit is ${maxFlaws}.`, { ref: 'DE p.61' });
    if (type !== 'grog' && size === 'Minor' && t.minorFlaws + 1 > rules.maxMinorFlaws) push('limit-minor', 'error', `Already ${rules.maxMinorFlaws} Minor Flaws`, `No more than ${rules.maxMinorFlaws} Minor Flaws.`, { ref: 'DE p.61' });
    if (def.categories.includes('Personality') && size === 'Major' && t.majorPersonalityFlaws >= 1) push('limit-major-personality', 'error', 'Already has a Major Personality Flaw', 'A character may not have more than one Major Personality Flaw.', { ref: 'DE p.63' });
    if (def.categories.includes('Personality') && t.personalityFlaws + 1 > (type === 'grog' ? 1 : rules.maxPersonalityFlaws)) push('limit-personality', 'warning', 'Too many Personality Flaws', 'Characters should not have more Personality Flaws than this.', { ref: 'DE p.63' });
    if (def.categories.includes('Story') && t.storyFlaws + 1 > rules.maxStoryFlaws) push('limit-story', 'warning', 'Already has a Story Flaw', `Characters should not have more than ${rules.maxStoryFlaws} Story Flaw without the troupe's agreement.`, { ref: 'DE p.63' });
    return;
  }
  if (type === 'magus' && def.categories.includes('Hermetic') && size === 'Major' && t.majorHermeticVirtues >= rules.maxMajorHermeticVirtues) {
    push('limit-major-hermetic', 'error', 'Already has a Major Hermetic Virtue', `Magi may not have more than ${rules.maxMajorHermeticVirtues} Major Hermetic Virtue.`, { ref: 'DE p.63' });
  }
  if (def.categories.includes('Mythic Companion') && d.virtues.some((v) => v.def?.categories.includes('Mythic Companion'))) {
    push('limit-mythic', 'error', 'Already has a Mythic Companion Virtue', 'Mythic Companion Virtues are incompatible with each other.', { ref: 'DE p.55' });
  }
  if (!pts) return;
  const ratio = type === 'mythic' ? rules.mythicVirtueRatio : 1;
  const left = t.allowedVirtuePoints - t.virtuePoints;
  const reachable = maxFlaws * ratio - t.virtuePoints;
  if (pts > reachable) {
    push('afford', 'error', 'Not enough Virtue points', `${def.name} costs ${pts}; even with the most Flaws allowed the character would have only ${Math.max(0, reachable)} Virtue point(s) left.`, { ref: 'DE p.61' });
  } else if (pts > left) {
    const need = Math.ceil((pts - left) / ratio);
    push('afford', 'info', `Needs ${need} more Flaw point${need === 1 ? '' : 's'}`, `${def.name} costs ${pts} Virtue points and ${Math.max(0, left)} are left; add ${need} more point(s) of Flaws to pay for it.`, { ref: 'DE p.61' });
  }
}

/** The most serious problem for the picker, or null if the Virtue can be taken. */
export function vfAvailability(d: DerivedCharacter, data: GameData, def: VirtueFlawDef, opts: CheckOptions = {}): VFProblem | null {
  const ps = vfProblems(d, data, def, undefined, opts);
  return ps.find((p) => p.severity === 'error') ?? ps.find((p) => p.severity === 'warning') ?? ps.find((p) => p.severity === 'info') ?? null;
}

/** Problems per size, for the picker's "+ Major" / "+ Minor" buttons. */
export function vfSizeProblems(d: DerivedCharacter, data: GameData, def: VirtueFlawDef, rules?: HouseRules): Partial<Record<VFSize, VFProblem[]>> {
  const out: Partial<Record<VFSize, VFProblem[]>> = {};
  for (const size of def.sizes) out[size] = vfProblems(d, data, def, undefined, { rules, size });
  return out;
}
