// The troupe: who plays which character, how far along each one is, and what changed when a player
// sends a character again. Used by the Saga Overview's Troupe card and the Import page.

import type { GameData } from '../data';
import { ART_NAMES, ARTS, CHARACTERISTICS, CHAR_NAMES } from '../data';
import { deriveCharacter, type DerivedCharacter } from './character/derive';
import { validateCharacter } from './character/validate';
import type { Character, HouseRules, Saga } from './types';

export type CharacterStanding = 'creation' | 'fix' | 'finished';

export interface TroupeCharacter {
  c: Character;
  standing: CharacterStanding;
  /** what the rules check counts against it */
  errors: number;
  warnings: number;
}

export interface TroupePlayer {
  /** the name as the characters give it; '' for characters nobody has claimed */
  name: string;
  characters: TroupeCharacter[];
}

/** How far along a character is: still in creation, finished with rules to fix, or finished. */
export function standingOf(c: Character, data: GameData, rules: HouseRules): TroupeCharacter {
  let errors = 0;
  let warnings = 0;
  try {
    const issues = validateCharacter(deriveCharacter(c, data, rules), data, rules);
    errors = issues.filter((i) => i.severity === 'error').length;
    warnings = issues.filter((i) => i.severity === 'warning').length;
  } catch {
    errors = 1;
  }
  const standing: CharacterStanding = !c.creation.finalized ? 'creation' : errors ? 'fix' : 'finished';
  return { c, standing, errors, warnings };
}

/**
 * The saga's players and their characters: everyone named as a player on a character, and the
 * names on the Seasons page's turn order who have none yet (not started). The storyguide's own
 * characters (marked as theirs) are left out; characters with no player come last, under ''.
 */
export function troupeOf(saga: Saga, chars: Character[], data: GameData): TroupePlayer[] {
  const rules = saga.houseRules;
  const byName = new Map<string, TroupeCharacter[]>();
  const key = (n: string) => n.trim().toLowerCase();
  const shown = new Map<string, string>();
  for (const name of saga.playerOrder ?? []) {
    if (!name.trim()) continue;
    byName.set(key(name), byName.get(key(name)) ?? []);
    shown.set(key(name), name.trim());
  }
  for (const c of chars) {
    if (c.npc) continue;
    const k = key(c.player ?? '');
    if (!shown.has(k)) shown.set(k, (c.player ?? '').trim());
    byName.set(k, [...(byName.get(k) ?? []), standingOf(c, data, rules)]);
  }
  const order = (saga.playerOrder ?? []).map(key);
  const rank = (k: string) => (k === '' ? Infinity : order.includes(k) ? order.indexOf(k) : order.length);
  return [...byName.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([k, list]) => ({ name: shown.get(k) ?? '', characters: list.sort((x, y) => x.c.name.localeCompare(y.c.name)) }));
}

/** A line of what changed between two versions of one character. */
export interface ChangeLine {
  kind: 'added' | 'removed' | 'changed';
  text: string;
}

// a Virtue or Flaw that changed size (Minor to Major) is one removed and one added
const vfLabel = (d: DerivedCharacter) => new Map(d.virtues.map((v) => [`${v.cv.defId}|${v.cv.param ?? ''}|${v.cv.size}`, `${v.name} (${v.cv.size})`]));

/**
 * What a character sent again changes, against the copy already here: name, age, Characteristics,
 * Virtues and Flaws, Ability and Art scores and experience, spells and their mastery, Confidence,
 * Personality Traits, Reputations, what they carry and own, wounds, Warping, Decrepitude, the
 * seasons logged, and the two things a storyguide most wants to see: numbers set by hand and rules
 * problems waved through as troupe rulings. Anything else that differs is said in one line, so the
 * page never says nothing changed when something did. The storyguide reads it before the new
 * version takes the old one's place.
 */
export function characterChanges(before: Character, after: Character, data: GameData, rules: HouseRules): ChangeLine[] {
  const out: ChangeLine[] = [];
  const a = deriveCharacter(before, data, rules);
  const b = deriveCharacter(after, data, rules);
  const changed = (text: string) => out.push({ kind: 'changed', text });
  if ((before.name ?? '') !== (after.name ?? '')) changed(`Name: ${before.name || '(none)'} → ${after.name || '(none)'}`);
  if (before.age !== after.age) changed(`Age ${before.age} → ${after.age}`);
  if (before.house !== after.house) changed(`House: ${before.house ?? 'none'} → ${after.house ?? 'none'}`);
  if (!!before.creation.finalized !== !!after.creation.finalized) changed(after.creation.finalized ? 'Creation finished' : 'Back in creation');
  for (const k of CHARACTERISTICS) {
    const x = a.characteristics[k].value;
    const y = b.characteristics[k].value;
    if (x !== y) changed(`${CHAR_NAMES[k]} ${x} → ${y}`);
  }
  const va = vfLabel(a);
  const vb = vfLabel(b);
  for (const [k, label] of vb) if (!va.has(k)) out.push({ kind: 'added', text: label });
  for (const [k, label] of va) if (!vb.has(k)) out.push({ kind: 'removed', text: label });
  const abil = (d: DerivedCharacter) => new Map(d.abilities.map((x) => [`${x.abilityId}|${d.char.abilities.find((y) => y.uid === x.uid)?.param ?? ''}`, x]));
  const aa = abil(a);
  const ab = abil(b);
  for (const [k, y] of ab) {
    const x = aa.get(k);
    if (!x && y.score > 0) out.push({ kind: 'added', text: `${y.name} ${y.score}` });
    else if (x && (x.score !== y.score || x.effectiveXp !== y.effectiveXp)) changed(`${y.name} ${x.score} → ${y.score}${x.score === y.score ? ` (${x.effectiveXp} → ${y.effectiveXp} xp)` : ''}`);
  }
  for (const [k, x] of aa) if (!ab.has(k) && x.score > 0) out.push({ kind: 'removed', text: `${x.name} ${x.score}` });
  for (const art of ARTS) {
    const x = a.arts[art];
    const y = b.arts[art];
    if (x.score !== y.score) changed(`${ART_NAMES[art]} ${x.score} → ${y.score}`);
    else if (x.effectiveXp !== y.effectiveXp) changed(`${ART_NAMES[art]} ${x.score} (${x.effectiveXp} → ${y.effectiveXp} xp)`);
  }
  const spells = (c: Character) => new Map(c.spells.map((s) => [`${s.spell.name}|${s.spell.level}`, `${s.spell.name} (${s.spell.technique}${s.spell.form} ${s.spell.level ?? 'gen'})`]));
  const sa = spells(before);
  const sb = spells(after);
  for (const [k, label] of sb) if (!sa.has(k)) out.push({ kind: 'added', text: `Spell: ${label}` });
  for (const [k, label] of sa) if (!sb.has(k)) out.push({ kind: 'removed', text: `Spell: ${label}` });
  // spell mastery
  const mastery = (c: Character) => new Map(c.spells.map((sp) => [`${sp.spell.name}|${sp.spell.level}`, Object.values(sp.masteryXp ?? {}).reduce<number>((t, v) => t + (v ?? 0), 0)]));
  const ma = mastery(before);
  for (const [k, y] of mastery(after)) {
    const x = ma.get(k);
    if (x !== undefined && x !== y) changed(`Mastery of ${k.split('|')[0]}: ${x} → ${y} xp`);
  }
  // numbers set by hand, and rules problems allowed as troupe rulings
  const label = (path: string) => {
    const [kind, id] = path.split(':');
    if (kind === 'ability') return b.abilityByUid.get(id)?.name ?? a.abilityByUid.get(id)?.name ?? 'an Ability';
    if (kind === 'art') return ART_NAMES[id as keyof typeof ART_NAMES] ?? id;
    return path;
  };
  for (const k of new Set([...Object.keys(before.overrides ?? {}), ...Object.keys(after.overrides ?? {})])) {
    const x = before.overrides?.[k];
    const y = after.overrides?.[k];
    if (x === y) continue;
    if (x === undefined) out.push({ kind: 'added', text: `Set by hand: ${label(k)} = ${y}` });
    else if (y === undefined) out.push({ kind: 'removed', text: `No longer set by hand: ${label(k)} (was ${x})` });
    else changed(`Set by hand: ${label(k)} ${x} → ${y}`);
  }
  const ackA = new Set(before.acknowledgedIssues ?? []);
  const ackB = new Set(after.acknowledgedIssues ?? []);
  const newAck = [...ackB].filter((k) => !ackA.has(k)).length;
  const goneAck = [...ackA].filter((k) => !ackB.has(k)).length;
  if (newAck) out.push({ kind: 'added', text: `${newAck} rules problem${newAck > 1 ? 's' : ''} allowed as a troupe ruling on the sender's copy` });
  if (goneAck) out.push({ kind: 'removed', text: `${goneAck} troupe ruling${goneAck > 1 ? 's' : ''} you allowed here ${goneAck > 1 ? 'are' : 'is'} not on the sender's copy` });
  // Confidence and Faith
  const conf = (c: Character) => `${c.confidence?.score ?? 0} (${c.confidence?.points ?? 0})`;
  if (conf(before) !== conf(after)) changed(`Confidence ${conf(before)} → ${conf(after)}`);
  const faith = (c: Character) => (c.faith ? `${c.faith.score} (${c.faith.points})` : 'none');
  if (faith(before) !== faith(after)) changed(`Faith ${faith(before)} → ${faith(after)}`);
  // Personality Traits and Reputations
  const listed = <T,>(xs: T[] | undefined, key: (x: T) => string, show: (x: T) => string) => new Map((xs ?? []).map((x) => [key(x), show(x)]));
  const compare = (what: string, x: Map<string, string>, y: Map<string, string>) => {
    for (const [k, v] of y) {
      if (!x.has(k)) out.push({ kind: 'added', text: `${what}: ${v}` });
      else if (x.get(k) !== v) changed(`${what}: ${x.get(k)} → ${v}`);
    }
    for (const [k, v] of x) if (!y.has(k)) out.push({ kind: 'removed', text: `${what}: ${v}` });
  };
  compare('Personality Trait', listed(before.personality, (t) => t.trait.trim().toLowerCase(), (t) => `${t.trait} ${t.score >= 0 ? '+' : ''}${t.score}`), listed(after.personality, (t) => t.trait.trim().toLowerCase(), (t) => `${t.trait} ${t.score >= 0 ? '+' : ''}${t.score}`));
  compare('Reputation', listed(before.reputations, (r) => `${r.text}|${r.scope}`.toLowerCase(), (r) => `${r.text} ${r.score} (${r.scope})`), listed(after.reputations, (r) => `${r.text}|${r.scope}`.toLowerCase(), (r) => `${r.text} ${r.score} (${r.scope})`));
  // enchanted items and other possessions, by name
  compare('Enchanted item', listed(before.items, (i) => i.uid, (i) => `${i.name} (${i.effects.length} effect${i.effects.length === 1 ? '' : 's'})`), listed(after.items, (i) => i.uid, (i) => `${i.name} (${i.effects.length} effect${i.effects.length === 1 ? '' : 's'})`));
  compare('Possession', listed(before.possessions, (x) => x.uid, (x) => x.name), listed(after.possessions, (x) => x.uid, (x) => x.name));
  const same = (x: unknown, y: unknown) => JSON.stringify(x ?? null) === JSON.stringify(y ?? null);
  if (!same(before.equipment, after.equipment)) changed('Weapons, armor or other equipment');
  if (!same(before.familiar, after.familiar)) changed(after.familiar ? (before.familiar ? 'The familiar' : 'A familiar bound') : 'The familiar is gone');
  if (!same(before.wounds, after.wounds) || before.fatigueLost !== after.fatigueLost || before.longTermFatigueLost !== after.longTermFatigueLost) changed('Wounds or Fatigue');
  if (!same(before.agingPoints, after.agingPoints)) changed('Aging Points');
  if (!same(before.twilightScars, after.twilightScars)) changed(`Twilight scars ${before.twilightScars?.length ?? 0} → ${after.twilightScars?.length ?? 0}`);
  if (before.warpingPoints !== after.warpingPoints) changed(`Warping Points ${before.warpingPoints} → ${after.warpingPoints}`);
  if (before.decrepitudePoints !== after.decrepitudePoints) changed(`Decrepitude Points ${before.decrepitudePoints} → ${after.decrepitudePoints}`);
  if (before.seasonLog.length !== after.seasonLog.length) changed(`Seasons logged ${before.seasonLog.length} → ${after.seasonLog.length}`);
  else if (!same(before.seasonLog, after.seasonLog)) changed('A logged season was changed');
  if ((before.player ?? '') !== (after.player ?? '')) changed(`Player: ${before.player || '(none)'} → ${after.player || '(none)'}`);
  if ((before.description ?? '') !== (after.description ?? '')) changed('Description');
  if ((before.notes ?? '') !== (after.notes ?? '')) changed('Notes');
  // whatever else differs, so that "nothing differs" is only said when it is true
  if (!out.length) {
    const rest = (c: Character) => JSON.stringify({ ...c, updatedAt: undefined, createdAt: undefined, sagaId: undefined, covenantId: undefined, schemaVersion: undefined });
    if (rest(before) !== rest(after)) changed('Other details of the sheet differ (nothing the rules count)');
  }
  return out;
}
