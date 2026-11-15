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

const vfLabel = (d: DerivedCharacter) => new Map(d.virtues.map((v) => [`${v.cv.defId}|${v.cv.param ?? ''}`, `${v.name} (${v.cv.size})`]));

/**
 * What a character sent again changes, against the copy already here: name, age, Characteristics,
 * Virtues and Flaws, Ability and Art scores, spells, Warping, Decrepitude and the seasons logged.
 * The storyguide reads it before the new version takes the old one's place.
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
  }
  const spells = (c: Character) => new Map(c.spells.map((s) => [`${s.spell.name}|${s.spell.level}`, `${s.spell.name} (${s.spell.technique}${s.spell.form} ${s.spell.level ?? 'gen'})`]));
  const sa = spells(before);
  const sb = spells(after);
  for (const [k, label] of sb) if (!sa.has(k)) out.push({ kind: 'added', text: `Spell: ${label}` });
  for (const [k, label] of sa) if (!sb.has(k)) out.push({ kind: 'removed', text: `Spell: ${label}` });
  if (before.warpingPoints !== after.warpingPoints) changed(`Warping Points ${before.warpingPoints} → ${after.warpingPoints}`);
  if (before.decrepitudePoints !== after.decrepitudePoints) changed(`Decrepitude Points ${before.decrepitudePoints} → ${after.decrepitudePoints}`);
  if (before.seasonLog.length !== after.seasonLog.length) changed(`Seasons logged ${before.seasonLog.length} → ${after.seasonLog.length}`);
  return out;
}
