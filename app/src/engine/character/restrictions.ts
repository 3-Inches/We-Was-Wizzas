// Who may take a Virtue or Flaw. One checker serves both the Virtue picker (before taking it)
// and the rules check (for Virtues already on the character), so a restriction that hides an
// entry from the list also flags it when it was taken anyway, imported, or made illegal by a
// later change (a new House, a lower Presence, a removed prerequisite...).

import { CHAR_NAMES, type CharType, type GameData, type VFNeed, type VirtueFlawDef } from '../../data';
import { HOUSE_BY_ID } from '../../data/houses';
import type { CharVirtue } from '../types';
import type { DerivedCharacter } from './derive';

export type VFSeverity = 'error' | 'warning' | 'info';

export interface VFProblem {
  /** stable issue id (used to remember troupe rulings) */
  id: string;
  severity: VFSeverity;
  /** a few words for the Virtue picker */
  short: string;
  message: string;
  ref?: string;
  fix?: string;
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
 * against the character's other choices); omit it to ask whether it can be taken now.
 */
export function vfProblems(d: DerivedCharacter, data: GameData, def: VirtueFlawDef, cv?: CharVirtue): VFProblem[] {
  const c = d.char;
  const type = c.type;
  const adding = !cv;
  const key = cv?.uid ?? def.id;
  const others = cv ? c.virtues.filter((v) => v.uid !== cv.uid) : c.virtues;
  const packaged = isPackageFreebie(cv);
  const ref = `${def.source.book}, ${def.name}`;
  const quote = def.restrictionText ? ` (“${def.restrictionText}”)` : '';
  const out: VFProblem[] = [];
  const push = (code: string, severity: VFSeverity, short: string, message: string, extra: Partial<VFProblem> = {}) =>
    out.push({ id: `${code}-${key}`, severity, short, message, ref, ...extra });
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
    const major = cv ? cv.size === 'Major' : !def.sizes.includes('Minor') && !def.sizes.includes('Free');
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
      out.push({ id: `excl-${[def.id, ex].sort().join('-')}`, severity: 'error', short: `Incompatible with ${vfName(ex)}`, message: `${def.name} cannot be combined with ${vfName(ex)}.`, ref });
    }
  }
  for (const r of def.requires ?? []) {
    if (!others.some((o) => o.defId === r)) push(`req-${r}`, 'error', `Requires ${vfName(r)}`, `${def.name} requires ${vfName(r)}.${quote}`, { fix: `Add ${vfName(r)}.` });
  }
  (def.needs ?? []).forEach((n, i) => {
    if (needMet(n, others, data, d)) return;
    if (adding && n.auto) return; // it is added along with this Virtue
    const auto = n.auto ? vfName(n.auto.id) : undefined;
    // quote the need's own wording; the Virtue's restriction text only when it is about this need
    const q = n.quote ? ` (“${n.quote}”)` : def.forTypes || def.notForTypes || def.houses ? '' : quote;
    push(`need${i}`, n.severity ?? 'error', `Requires ${n.label}`, `${def.name} requires ${n.label}.${q}`, auto ? { fix: `Add ${auto}.` } : {});
  });

  // ---------------------------------------------------------------- Characteristics & age
  const charCheck = (ch: keyof typeof CHAR_NAMES, ok: (v: number) => boolean, want: string) => {
    const val = d.characteristics[ch].value;
    if (ok(val)) return;
    if (adding) push(`char-${ch}`, 'warning', `Needs ${CHAR_NAMES[ch]} ${want}`, `${def.name} needs ${CHAR_NAMES[ch]} ${want} (currently ${signed(val)}); set it on the Characteristics step.`);
    else push(`char-${ch}`, 'error', `Needs ${CHAR_NAMES[ch]} ${want}`, `${def.name} needs ${CHAR_NAMES[ch]} ${want}; the character has ${signed(val)}.${quote}`);
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
    push('excl-puissant-al', 'error', 'Incompatible with Puissant Artes Liberales', `${def.name} is incompatible with Puissant Artes Liberales.`);
  }
  if (def.id === 'student-of-realm' && cv?.param) {
    const lore = `${cv.param.toLowerCase().replace('divine', 'dominion')}-lore`;
    if (others.some((o) => o.defId === 'puissant-ability' && o.param === lore)) push('excl-puissant-lore', 'error', 'Not with Puissant (same Lore)', `You may not take Student of (Realm) and Puissant Ability for the same Lore (${cv.param}).`);
  }
  if (def.id === 'arcane-lore' && cv && d.hasGift && type !== 'magus' && c.abilities.some((a) => a.abilityId === 'parma-magica' && Object.values(a.xp).some((x) => x))) {
    if (!others.some((o) => o.defId === 'enemies-flaw')) {
      push('arcane-parma', 'warning', 'Needs Enemies: Order of Hermes', 'A Gifted character who is not a Hermetic magus and knows Parma Magica must take the Major Story Flaw Enemies (the entire Order of Hermes).', { fix: 'Add Enemies (Order of Hermes), or drop Parma Magica.' });
    }
  }

  // ---------------------------------------------------------------- picker-only
  if (adding) {
    if (!data.isBookEnabled(def.source.book)) push('book', 'error', 'Book not enabled for this saga', `${def.source.book} is not enabled for this saga.`);
    if (!def.repeatable && !def.param && c.virtues.some((x) => x.defId === def.id)) push('taken', 'error', 'Already taken', `${def.name} is already taken.`);
  }
  return out;
}

/** The most serious problem for the picker, or null if the Virtue can be taken. */
export function vfAvailability(d: DerivedCharacter, data: GameData, def: VirtueFlawDef): VFProblem | null {
  const ps = vfProblems(d, data, def);
  return ps.find((p) => p.severity === 'error') ?? ps.find((p) => p.severity === 'warning') ?? null;
}
