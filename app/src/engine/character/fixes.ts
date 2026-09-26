// One-click fixes for rules-check issues. Each issue kind offers one or more fixes:
//   apply  – change the character (add/remove a Virtue, set a value, move or trim xp)
//   choose – pick from a list, then apply (which Flaw to drop, which status to take...)
//   param  – fill in a Virtue's sub-choice with the same dropdown as the Virtue list
//   goto   – open the step (or sheet tab) where the troupe has to decide
// The first fix is the one a click on the issue performs. Fixes marked `auto` are safe for
// "Resolve all": they never need a choice and never make another budget overspend.

import { ART_NAMES, CHAR_NAMES, type Art, type Characteristic, type GameData, type ParamSpec, type VFSize, type VirtueFlawDef } from '../../data';
import type { Character, HouseRules, XpSource } from '../types';
import { deriveCharacter, canSpend, type DerivedCharacter, type XpBudget } from './derive';
import { addVirtue, applyMythicType, MYTHIC_TYPES, removeVirtue } from './factory';
import { validateCharacter, type Issue, type Step } from './validate';
import { vfAvailability } from './restrictions';
import { describeChanges, lowerAbilityTo, moveXp, raiseAbilityTo, rawForAbilityScore, trimPool } from './xpops';

export type Fix =
  | { kind: 'apply'; label: string; auto?: boolean; apply: (c: Character) => string | void }
  | { kind: 'choose'; label: string; options: { value: string; label: string }[]; apply: (c: Character, value: string) => string | void }
  | { kind: 'param'; label: string; spec: ParamSpec; apply: (c: Character, value: string) => string | void }
  | { kind: 'goto'; label: string; step: Step; tab?: string };

export const STEP_LABEL: Record<Step, string> = {
  basics: 'Concept', house: 'House', virtues: 'Virtues & Flaws', characteristics: 'Characteristics', abilities: 'Abilities', arts: 'Arts', spells: 'Spells',
  personality: 'Personality & Gear', equipment: 'Personality & Gear', sheet: 'the sheet',
};

const goto = (step: Step, label?: string): Fix => ({ kind: 'goto', label: label ?? `Go to ${STEP_LABEL[step]}`, step });

export function fixesFor(issue: Issue, d: DerivedCharacter, data: GameData, rules: HouseRules): Fix[] {
  const c = d.char;
  const code = issue.code ?? issue.id;
  const cv = issue.vf ? c.virtues.find((v) => v.uid === issue.vf) : undefined;
  const def = cv ? data.vfById.get(cv.defId) : undefined;
  const name = (id: string) => data.vfById.get(id)?.name ?? id;
  const cvName = cv ? d.virtues.find((v) => v.cv.uid === cv.uid)?.name ?? name(cv.defId) : '';
  const remove = (uid: string, label: string, auto = true): Fix => ({ kind: 'apply', label: `Remove ${label}`, auto, apply: (x) => removeVirtue(x, data, uid) });
  const removeThis = (auto = true) => (cv ? [remove(cv.uid, cvName, auto)] : []);
  const add = (id: string, opts: { size?: VFSize; param?: string; free?: string; noPoints?: boolean; auto?: boolean } = {}): Fix => {
    const vd = data.vfById.get(id);
    return {
      kind: 'apply', label: `Add ${name(id)}${opts.param ? ` (${opts.param})` : ''}${opts.free ? ' (free)' : ''}`, auto: opts.auto ?? false,
      apply: (x) => void addVirtue(x, data, id, opts.size ?? vd?.sizes[0], opts.param, opts.free ? { free: true, freeReason: opts.free } : opts.noPoints ? { noPoints: true } : {}),
    };
  };
  // adding a Flaw or a free Virtue never costs Virtue points, so it is safe to do automatically
  const costsNothing = (id: string) => {
    const vd = data.vfById.get(id);
    return !!vd && (vd.kind === 'flaw' || vd.sizes.includes('Free'));
  };
  const available = (pred: (v: VirtueFlawDef) => boolean) =>
    data.virtuesFlaws.filter((v) => pred(v) && vfAvailability(d, data, v, { rules })?.severity !== 'error').map((v) => ({ value: v.id, label: `${v.name} (${v.sizes.join('/')})` }));
  const chooseRemove = (label: string, pred: (v: (typeof d.virtues)[number]) => boolean): Fix | null => {
    const opts = d.virtues.filter((v) => pred(v) && !v.cv.free).map((v) => ({ value: v.cv.uid, label: v.name }));
    return opts.length ? { kind: 'choose', label, options: opts, apply: (x, uid) => removeVirtue(x, data, uid) } : null;
  };
  const list = (...xs: (Fix | null | undefined | false)[]) => xs.filter(Boolean) as Fix[];

  switch (code) {
    // -------------------------------------------------------------- one Virtue/Flaw is not allowed
    case 'fortype': case 'mythic-only': case 'grog-hermetic': case 'being': case 'nogift': case 'excl-puissant': case 'unknown':
      return removeThis();
    case 'grog-story': case 'tradition':
      return removeThis(false);
    case 'grog-major':
      return def?.sizes.includes('Minor') && cv
        ? list({ kind: 'apply', label: `Take ${cvName} as Minor`, auto: true, apply: (x) => void (x.virtues.find((v) => v.uid === cv.uid)!.size = 'Minor') }, ...removeThis())
        : removeThis();
    case 'gift':
      return list(...removeThis(), c.type === 'companion' && add('the-gift', { size: 'Free' }));
    case 'house-only':
      return list(...removeThis(issue.severity === 'error'), c.type === 'magus' && goto('house', 'Change House'));
    case 'male-only':
      return list(...removeThis(false), add('paid-rights'));
    case 'female-only':
      return removeThis(false);
    case 'excl': {
      if (!cv || !issue.other) return [];
      const otherCv = c.virtues.find((v) => v.defId === issue.other && v.uid !== cv.uid);
      const later = otherCv && c.virtues.indexOf(otherCv) > c.virtues.indexOf(cv) ? otherCv : cv;
      const fixes = [remove(later.uid, name(later.defId))];
      const earlier = later === cv ? otherCv : cv;
      if (earlier) fixes.push(remove(earlier.uid, name(earlier.defId), false));
      return fixes;
    }
    case 'req': {
      const r = issue.other!;
      return list(add(r, { auto: costsNothing(r) }), ...removeThis());
    }
    case 'need': {
      const n = def?.needs?.[issue.needIndex ?? -1];
      if (!n) return removeThis();
      if (n.auto) return list(add(n.auto.id, { size: n.auto.size, noPoints: n.auto.noPoints, auto: true }), ...removeThis(false));
      const ids = (n.anyOf ?? []).filter((x) => !x.startsWith('$') && data.vfById.has(x));
      const fixes: Fix[] = [];
      if (n.anyOf?.includes('$gift') && c.type === 'companion') fixes.push(add('the-gift', { size: 'Free' }));
      if (ids.length === 1) fixes.push(add(ids[0], { auto: costsNothing(ids[0]) }));
      else if (ids.length > 1) fixes.push({ kind: 'choose', label: `Add ${n.label}`, options: ids.map((x) => ({ value: x, label: name(x) })), apply: (x, id) => void addVirtue(x, data, id) });
      if (n.match) {
        const m = n.match;
        const opts = available((v) => (!m.category || v.categories.includes(m.category)) && (!m.kind || v.kind === m.kind) && (!m.size || v.sizes.includes(m.size)));
        if (opts.length) fixes.push({ kind: 'choose', label: `Add ${n.label}`, options: opts, apply: (x, id) => void addVirtue(x, data, id, m.size) });
      }
      if (n.anyOf?.some((x) => x === '$academic' || x === '$arcane' || x === '$martial')) fixes.push(goto('virtues', 'Find a Virtue that gives access'));
      return [...fixes, ...removeThis(n.severity !== 'warning')];
    }
    case 'char':
      return list(goto('characteristics', `Raise ${CHAR_NAMES[issue.other as Characteristic] ?? 'the Characteristic'}`), ...removeThis());
    case 'age':
      return list(goto('basics', 'Change age'), ...removeThis());
    case 'arcane-parma':
      return [add('enemies-flaw', { size: 'Major', param: 'the Order of Hermes', auto: true })];
    case 'param':
      return def?.param && cv
        ? [{ kind: 'param', label: `Choose the ${def.param.label}`, spec: def.param, apply: (x, val) => void (x.virtues.find((v) => v.uid === cv.uid)!.param = val || undefined) }]
        : [];
    case 'size':
      return def && cv ? [{ kind: 'apply', label: `Take it as ${def.sizes[0]}`, auto: true, apply: (x) => void (x.virtues.find((v) => v.uid === cv.uid)!.size = def.sizes[0]) }] : [];
    case 'dup': {
      const [defId, param] = (issue.other ?? '').split('|');
      const dups = c.virtues.filter((v) => v.defId === defId && (v.param ?? '') === (param ?? ''));
      const last = dups[dups.length - 1];
      return last ? [remove(last.uid, `the extra ${name(defId)}`)] : [];
    }
    case 'great': case 'poorchar': {
      const ch = issue.other as Characteristic;
      const val = code === 'great' ? 3 : -3;
      return list(
        ch && { kind: 'apply', label: `Buy ${CHAR_NAMES[ch]} at ${val > 0 ? '+' : ''}${val}`, auto: true, apply: (x) => void (x.characteristics[ch] = val) },
        goto('characteristics'),
        ...removeThis(false),
      );
    }

    // -------------------------------------------------------------- status & type
    case 'house': return [goto('house', 'Choose a House')];
    case 'magus-gift': return [add('the-gift', { size: 'Free', free: 'Magus', auto: true })];
    case 'magus-status': return [add('hermetic-magus', { size: 'Free', free: 'Magus', auto: true })];
    case 'grog-gift': case 'mythic-gift': {
      const gift = c.virtues.find((v) => v.defId === 'the-gift');
      return gift ? [remove(gift.uid, 'The Gift')] : [];
    }
    case 'status-none': {
      const opts = available((v) => v.categories.includes('Social Status'));
      return list(
        c.type === 'grog' && add('covenfolk', { size: 'Free', auto: true }),
        opts.length > 0 && { kind: 'choose', label: 'Take a Social Status', options: opts, apply: (x, id) => void addVirtue(x, data, id) },
      );
    }
    case 'status-many':
      return list(chooseRemove('Drop a Social Status', (v) => !!v.def?.categories.includes('Social Status') && v.cv.defId !== 'hermetic-magus'));
    case 'mythic-type':
      return list(
        { kind: 'choose', label: 'Choose the Mythic Companion type', options: Object.entries(MYTHIC_TYPES).map(([id, t]) => ({ value: id, label: t.label })), apply: (x, id) => applyMythicType(x, data, id) },
        goto('house', 'Go to Mythic type'),
      );
    case 'mythic-type-many':
      return list(chooseRemove('Keep one type: drop', (v) => !!v.def?.categories.includes('Mythic Companion')));
    case 'house-virtue': case 'exmisc-package':
      return [goto('house')];
    case 'merinita-warping':
      return [{ kind: 'apply', label: 'Set Warping Points to 1', auto: true, apply: (x) => void (x.warpingPoints = 1) }];
    case 'merinita-warping-faerie':
      return [{ kind: 'apply', label: 'Set Warping Points to 0', auto: true, apply: (x) => void (x.warpingPoints = 0) }];
    case 'bjornaer-familiar':
      return [{ kind: 'apply', label: 'Release the familiar', apply: (x) => void (x.familiar = undefined) }, { kind: 'goto', label: 'Open Lab & familiar', step: 'sheet', tab: 'lab' }];

    // -------------------------------------------------------------- Virtue & Flaw totals
    case 'grog-flaws': case 'max-flaws':
      return list(chooseRemove('Drop a Flaw', (v) => v.def?.kind === 'flaw'), goto('virtues'));
    case 'max-minor-flaws':
      return list(chooseRemove('Drop a Minor Flaw', (v) => v.def?.kind === 'flaw' && v.cv.size === 'Minor'), goto('virtues'));
    case 'vf-balance':
      return list(chooseRemove('Drop a Virtue', (v) => v.def?.kind === 'virtue' && v.points > 0), goto('virtues', 'Add Flaws or drop Virtues'));
    case 'story-flaws':
      return list(chooseRemove('Drop a Story Flaw', (v) => !!v.def?.categories.includes('Story') && v.def.kind === 'flaw'));
    case 'major-personality':
      return list(chooseRemove('Drop a Major Personality Flaw', (v) => !!v.def?.categories.includes('Personality') && v.cv.size === 'Major'));
    case 'personality-flaws': case 'grog-personality':
      return list(chooseRemove('Drop a Personality Flaw', (v) => !!v.def?.categories.includes('Personality') && v.def.kind === 'flaw'));
    case 'major-hermetic':
      return list(chooseRemove('Drop a Major Hermetic Virtue', (v) => !!v.def?.categories.includes('Hermetic') && v.def.kind === 'virtue' && v.cv.size === 'Major'));
    case 'tainted-v': case 'tainted-f':
      return list(chooseRemove('Drop a Tainted Virtue or Flaw', (v) => !!v.def?.tainted));
    case 'hermetic-flaw': case 'vf-unspent':
      return [goto('virtues')];

    // -------------------------------------------------------------- Characteristics
    case 'char-over': case 'char-under': case 'magus-int': case 'magus-sta':
      return [goto('characteristics')];
    case 'char-range': {
      const ch = issue.other as Characteristic;
      return [{ kind: 'apply', label: `Bring ${CHAR_NAMES[ch]} within –3…+3`, auto: true, apply: (x) => void (x.characteristics[ch] = Math.max(-3, Math.min(3, x.characteristics[ch]))) }];
    }

    // -------------------------------------------------------------- experience
    case 'budget': {
      const b = d.budgets.find((x) => x.id === issue.pool);
      if (!b) return [];
      const over = b.spent - b.total;
      return list(
        { kind: 'apply', label: `Take back ${over} xp from ${b.label}`, auto: true, apply: (x) => `Took back ${describeChanges(trimPool(x, b.id, over, data))}.` },
        goto(b.id === 'apprenticeship' || b.id === 'postGauntlet' ? 'arts' : 'abilities'),
      );
    }
    case 'spell-levels': case 'spell-limit': case 'mastery-pool': {
      const s = issue.spell ? c.spells.find((x) => x.uid === issue.spell) : undefined;
      const spells = c.spells.filter((x) => x.source === issue.pool).map((x) => ({ value: x.uid, label: `${x.spell.name} (${x.spell.technique}${x.spell.form} ${x.spell.level})` }));
      return list(
        s && { kind: 'apply', label: `Remove ${s.spell.name}`, auto: true, apply: (x) => void (x.spells = x.spells.filter((y) => y.uid !== s.uid)) },
        code === 'spell-levels' && spells.length > 0 && { kind: 'choose', label: 'Drop a spell', options: spells, apply: (x, uid) => void (x.spells = x.spells.filter((y) => y.uid !== uid)) },
        goto('spells'),
      );
    }
    case 'orphan': case 'illegal': case 'art-src': {
      const from = issue.pool as XpSource;
      const target = issue.ability ? { ability: issue.ability } : { art: issue.art as Art };
      const alloc = issue.ability ? c.abilities.find((a) => a.uid === issue.ability)?.xp : c.arts[issue.art as Art];
      const xp = alloc?.[from] ?? 0;
      const ab = issue.ability ? c.abilities.find((a) => a.uid === issue.ability) : undefined;
      const what = ab ? d.abilityByUid.get(ab.uid)?.name ?? ab.abilityId : ART_NAMES[issue.art as Art] ?? issue.art;
      const legal = (b: XpBudget) => b.id !== from && b.total - b.spent >= xp && (ab ? canSpend(d, data, b, ab).ok : b.id === 'apprenticeship' || b.id === 'postGauntlet' || !!b.arts);
      const pools = d.budgets.filter(legal);
      const drop: Fix = { kind: 'apply', label: `Remove the ${xp} xp`, auto: pools.length === 0, apply: (x) => {
        const al = issue.ability ? x.abilities.find((a) => a.uid === issue.ability)?.xp : x.arts[issue.art as Art];
        if (al) delete al[from];
      } };
      return list(
        pools[0] && { kind: 'apply', label: `Move ${what}'s ${xp} xp to ${pools[0].label}`, auto: true, apply: (x) => moveXp(x, target, from, pools[0].id) },
        pools.length > 1 && { kind: 'choose', label: 'Move it to', options: pools.map((b) => ({ value: b.id, label: `${b.label} (${b.total - b.spent} left)` })), apply: (x, to) => moveXp(x, target, from, to as XpSource) },
        drop,
      );
    }
    case 'cap': {
      const da = issue.ability ? d.abilityByUid.get(issue.ability) : undefined;
      return da ? [{ kind: 'apply', label: `Lower ${da.name} to ${da.cap}`, auto: true, apply: (x) => `Took back ${describeChanges(lowerAbilityTo(x, data, rules, da.uid, da.cap))}.` }] : [];
    }
    case 'native-lang': return [goto('abilities', 'Choose a native language')];
    case 'min-parma': case 'min-mt': case 'min-latin': case 'rec-latin': case 'rec-al': case 'rec-mt': {
      const spec: Record<string, [string, string | undefined, number, string]> = {
        'min-parma': ['parma-magica', undefined, 1, 'Parma Magica'], 'min-mt': ['magic-theory', undefined, 1, 'Magic Theory'], 'min-latin': ['dead-language', 'Latin', 1, 'Latin'],
        'rec-latin': ['dead-language', 'Latin', 4, 'Latin'], 'rec-al': ['artes-liberales', undefined, 1, 'Artes Liberales'], 'rec-mt': ['magic-theory', undefined, 3, 'Magic Theory'],
      };
      const [id, param, score, label] = spec[code];
      const pools = (['apprenticeship', 'postGauntlet'] as XpSource[]).map((p) => d.budgets.find((b) => b.id === p)).filter(Boolean) as XpBudget[];
      const cost = (b: XpBudget) => {
        const probe = structuredClone(c);
        const ab = probe.abilities.find((a) => a.abilityId === id && (param ? (a.param ?? '').toLowerCase() === param.toLowerCase() : true));
        if (!ab) return 5 * ((score * (score + 1)) / 2);
        return rawForAbilityScore(probe, data, rules, ab.uid, b.id, score) - (ab.xp[b.id] ?? 0);
      };
      const room = pools.find((b) => b.total - b.spent >= cost(b));
      return list(
        room && { kind: 'apply', label: `Raise ${label} to ${score} with ${room.label} xp`, auto: code.startsWith('min-'), apply: (x) => void raiseAbilityTo(x, data, rules, id, param, score, room.id) },
        goto('abilities'),
      );
    }
    case 'name': case 'aging':
      return [goto('basics')];
    default:
      return issue.step && issue.step !== 'sheet' ? [goto(issue.step)] : [];
  }
}

/** The first fix Resolve all may use for this issue, if any. */
export function autoFix(issue: Issue, d: DerivedCharacter, data: GameData, rules: HouseRules): Extract<Fix, { kind: 'apply' }> | undefined {
  return fixesFor(issue, d, data, rules).find((f): f is Extract<Fix, { kind: 'apply' }> => f.kind === 'apply' && !!f.auto);
}

export interface ResolveResult {
  applied: string[];
  /** errors left that need a choice */
  remaining: Issue[];
}

/**
 * Fix every error that has an automatic fix, re-checking after each change (removing one Virtue
 * can clear several issues). Mutates `c`. Run it on a copy to preview.
 */
export function resolveAll(c: Character, data: GameData, rules: HouseRules, maxSteps = 80): ResolveResult {
  const applied: string[] = [];
  const tries = new Map<string, number>();
  for (let step = 0; step < maxSteps; step++) {
    const d = deriveCharacter(c, data, rules);
    const errors = validateCharacter(d, data, rules).filter((i) => i.severity === 'error');
    let did = false;
    for (const issue of errors) {
      if ((tries.get(issue.id) ?? 0) >= 2) continue;
      const fix = autoFix(issue, d, data, rules);
      if (!fix) continue;
      tries.set(issue.id, (tries.get(issue.id) ?? 0) + 1);
      const note = fix.apply(c);
      applied.push(note ? `${fix.label}: ${note}` : fix.label);
      did = true;
      break;
    }
    if (!did) break;
  }
  const d = deriveCharacter(c, data, rules);
  return { applied, remaining: validateCharacter(d, data, rules).filter((i) => i.severity === 'error') };
}
