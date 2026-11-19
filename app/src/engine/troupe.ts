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
 * problems waved through as troupe rulings. Then every other field a rule reads, by its name
 * (CHANGE_FIELDS): Sympathy Traits, charms, rune scripts, Devotion Points, the holy and the rest.
 * What no rule reads (a description, a portrait) is said in one line of other details, and so is
 * anything else that differs, so the page never says nothing changed when something did. The
 * storyguide reads it before the new version takes the old one's place.
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
    // one at 0 counts too: a hedge Art held at 0 is still one the character works
    if (!x) out.push({ kind: 'added', text: `${y.name} ${y.score}` });
    else if (x.score !== y.score || x.effectiveXp !== y.effectiveXp) changed(`${y.name} ${x.score} → ${y.score}${x.score === y.score ? ` (${x.effectiveXp} → ${y.effectiveXp} xp)` : ''}`);
    const sx = before.abilities.find((z) => z.uid === x?.uid)?.specialty ?? '';
    const sy = after.abilities.find((z) => z.uid === y.uid)?.specialty ?? '';
    if (x && sx !== sy) changed(`${y.name}: specialty ${sx || '(none)'} → ${sy || '(none)'}`);
  }
  for (const [k, x] of aa) if (!ab.has(k)) out.push({ kind: 'removed', text: `${x.name} ${x.score}` });
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
  // what else a spell keeps that a rule reads: its Mastery abilities, Magical Focus, Potency and casting tool
  const kept = (c: Character) => new Map(c.spells.map((s) => [`${s.spell.name}|${s.spell.level}`, JSON.stringify([s.masteryAbilities, s.inFocus, s.potency, s.castingTool, s.source, s.spell])]));
  const ka = kept(before);
  for (const [k, v] of kept(after)) if (ka.has(k) && ka.get(k) !== v) changed(`Spell: ${sb.get(k)}: its Mastery abilities, Focus, Potency, casting tool or design`);
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
  // every other field a rule reads, by name (CHANGE_FIELDS below)
  const fields = fieldChanges(before, after);
  out.push(...fields.lines);
  // what no rule reads, in one line; and whatever else differs, so that "nothing differs" is only said when it is true
  const other = fields.other;
  const rest = (c: Character) => JSON.stringify({ ...c, updatedAt: undefined, createdAt: undefined, sagaId: undefined, covenantId: undefined, schemaVersion: undefined });
  if (other || (!out.length && rest(before) !== rest(after))) changed('Other details of the sheet differ');
  return out;
}

/** How a field is named in the list of changes: a label, its items' labels, and the labels of its parts. */
export interface Named {
  label: string;
  /** a list: each item named by this, matched by its uid (or by the name it is given) */
  item?: (x: never) => string;
  /** an object: its parts named one by one ('shown' above, 'other' read by no rule); a part not listed is named by the whole's label */
  parts?: Record<string, Named | 'shown' | 'other'>;
}

const plus = (n: number) => `${n >= 0 ? '+' : ''}${n}`;
const named = (label: string, item?: (x: never) => string): Named => ({ label, item });

/**
 * Every field of a character, and how the list of changes names it. 'shown': compared line by line in
 * `characterChanges` itself. A label: a field some rule reads, named when it differs. 'other': no rule
 * reads it (a description, a portrait), and it goes in the one line of other details. 'meta': the
 * record's own bookkeeping, never compared. A field added to `Character` must be placed here, or the
 * typecheck fails.
 */
export const CHANGE_FIELDS: { [K in keyof Required<Character>]: 'shown' | 'other' | 'meta' | Named } = {
  id: 'meta',
  sagaId: 'meta',
  schemaVersion: 'meta',
  createdAt: 'meta',
  updatedAt: 'meta',
  covenantId: 'meta',
  name: 'shown',
  age: 'shown',
  house: 'shown',
  creation: { label: 'Creation choices', parts: { finalized: 'shown', step: 'other', guidedWhy: 'other', agingLog: 'other', apprenticeshipStartAge: named('Age apprenticeship began'), yearsPostGauntlet: named('Years since the Gauntlet'), postGauntletLabSeasons: named('Lab seasons since the Gauntlet'), extraPools: named('Extra experience pools', (x: { label: string; amount: number }) => `${x.label} ${x.amount}`) } },
  characteristics: 'shown',
  virtues: 'shown',
  abilities: 'shown',
  arts: 'shown',
  spells: 'shown',
  overrides: 'shown',
  acknowledgedIssues: 'shown',
  confidence: 'shown',
  faith: 'shown',
  personality: 'shown',
  reputations: 'shown',
  items: 'shown',
  possessions: 'shown',
  equipment: 'shown',
  familiar: 'shown',
  wounds: 'shown',
  fatigueLost: 'shown',
  longTermFatigueLost: 'shown',
  agingPoints: 'shown',
  twilightScars: 'shown',
  warpingPoints: 'shown',
  decrepitudePoints: 'shown',
  seasonLog: 'shown',
  player: 'shown',
  description: 'shown',
  notes: 'shown',
  // what no rule reads
  gender: 'other',
  society: 'other',
  nationality: 'other',
  apparentAge: 'other',
  guided: 'other',
  npc: 'other',
  characteristicNotes: 'other',
  sigil: 'other',
  portrait: 'other',
  fromBook: 'other',
  // what the rules read, by name
  type: named('Kind of character'),
  birthYear: named('Year of birth'),
  creature: named('Might, Size or kind of creature'),
  session: named('All According to Plan used this session'),
  owed: named('Waiting in Resolve', (x: { text: string }) => x.text),
  insight: named('Secondary Insight’s Arts'),
  hungerLost: named('Long-Term Fatigue lost to Hunger for Magic'),
  storiesTold: named('Story and Personality Flaws last in play'),
  powers: named('Supernatural power', (x: { name: string }) => x.name),
  holy: {
    label: 'The holy',
    parts: {
      ascent: named('The Divine Ascent'),
      unity: named('Divine Unity'),
      commandingAura: named('A commanding aura'),
      temper: named('A holy temper'),
      aid: named('God’s aid'),
      tradition: named('Holy tradition'),
      faithLost: named('Faith Points lost to a botched prayer'),
      silent: named('Saints who will not answer'),
      tragedies: named('Tragedies of hubris'),
      notoria: named('The Rings of Solomon'),
      recitation: named('A Ring of Solomon being recited'),
      search: named('The search for the Book of Solomon'),
      works: named('Holy work', (x: { name: string; progress: number; target: number; done?: boolean }) => `${x.name} ${x.done ? 'done' : `${x.progress} of ${x.target}`}`),
      shinnui: named('Shinnui Shem'),
      trueNames: named('True Names'),
    },
  },
  agingLoss: named('Characteristics lost to aging'),
  auraTime: named('Time spent in the covenant’s aura'),
  awayFromCovenant: named('Away from the covenant'),
  warpingNoted: named('Warping Score whose effects were reported'),
  warpingAttuned: named('Realm the Warping Score is attuned to'),
  talismanUid: named('The talisman'),
  workshop: named('The workshop'),
  longevity: named('Longevity Ritual'),
  longevityLapsed: named('A lapsed Longevity Ritual'),
  sympathy: named('Sympathy Trait', (x: { trait: string; score: number; xp?: number }) => `${x.trait || '(unnamed)'} ${plus(x.score)}${x.xp ? ` (${x.xp} xp)` : ''}`),
  learned: {
    label: 'Learned magic',
    parts: {
      trainingYears: named('Years under a master'),
      charms: named('Charm', (x: { name: string; tf: string; level: number }) => `${x.name} (${x.tf} ${x.level})`),
      inventing: named('Charm being invented'),
    },
  },
  folkWitch: {
    label: 'Folk witch',
    parts: {
      apprenticeYears: named('Years of a folk witch’s apprenticeship'),
      things: named('Potion or fetish', (x: { name: string; kind: string; doses?: number }) => `${x.name} (${x.kind}${x.doses !== undefined ? `, ${x.doses} doses` : ''})`),
      witchMoon: named('The Witch Moon'),
      curse: named('A woven curse'),
    },
  },
  gruagach: {
    label: 'Gruagach',
    parts: {
      apprenticeYears: named('Years of a gruagach’s apprenticeship'),
      spells: named('Gruagach spell', (x: { name: string; tf: string; level: number }) => `${x.name} (${x.tf} ${x.level})`),
      inventing: named('Gruagach spell being invented'),
    },
  },
  vitki: {
    label: 'Vitki',
    parts: {
      apprenticeYears: named('Years of a vitki’s apprenticeship'),
      scripts: named('Rune script', (x: { name: string; level: number }) => `${x.name} (level ${x.level})`),
    },
  },
  devotions: named('Devotion Points', (x: { saint: string; points: number }) => `${x.saint} ${x.points}`),
  pilgrimage: named('A pilgrimage'),
  spiritualPath: named('A Spiritual Path'),
  greatElixir: named('The Great Elixir'),
  activeEffects: named('Effect on the character', (x: { name: string }) => x.name),
  magicGain: named('Characteristics raised by magic'),
  purse: named('The purse'),
  projects: named('Lab project', (x: { kind: string; name?: string }) => x.name || x.kind),
  agents: named('Agent', (x: { name: string }) => x.name),
  initiations: named('Mystery Initiation', (x: { virtueName: string }) => x.virtueName),
  criamonPath: named('Criamon Path'),
  heartbeast: named('Heartbeast'),
  rhine: named('Rank in the Rhine'),
  forestPacts: named('Pact with a forest spirit', (x: { spirit: string }) => x.spirit),
  theban: named('Theban citizenship, tokens and shards'),
  privilege: named('Transylvanian privilege'),
  guild: named('Guild membership'),
  illnesses: named('Illness', (x: { name: string }) => x.name),
  recovery: named('Recovery'),
  research: named('Original research'),
  labRoutines: named('Seasons under a lab routine'),
  writing: named('Book being written', (x: { title: string }) => x.title),
  standing: named('Standing activity'),
  priorities: named('Season priorities'),
  apprentice: named('The apprentice'),
  wanderer: named('Wandering the Tribunal'),
  redcap: named('A Redcap’s device levels'),
  labAuraUse: named('Seasons under the lab’s aura'),
  seasons: named('Seasons a year'),
  inhuman: named('Inhuman nature'),
  lastAgedYear: named('Last year aged'),
  rations: named('Rations'),
  hazards: named('Hazards to aging'),
  retired: named('Retired or dismissed'),
};

/**
 * The changes to the fields CHANGE_FIELDS names, each by its name; and whether a field no rule reads
 * differs (`other`), for the one line of other details.
 */
export function fieldChanges(before: Character, after: Character): { lines: ChangeLine[]; other: boolean } {
  const lines: ChangeLine[] = [];
  let other = false;
  for (const k of Object.keys(CHANGE_FIELDS) as (keyof Character)[]) {
    const how = CHANGE_FIELDS[k];
    if (typeof how === 'object') other = compareField(how, before[k], after[k], lines) || other;
    else if (how === 'other') other ||= !sameJson(before[k], after[k]);
  }
  return { lines, other };
}

const sameJson = (x: unknown, y: unknown) => JSON.stringify(x ?? null) === JSON.stringify(y ?? null);
const shownValue = (v: unknown) => (v === undefined || v === null || v === '' ? 'none' : typeof v === 'object' ? undefined : String(v));

/** One field's changes, by the name CHANGE_FIELDS gives it. True when a part no rule reads differs. */
function compareField(how: Named, x: unknown, y: unknown, out: ChangeLine[]): boolean {
  if (sameJson(x, y)) return false;
  if (how.item && (Array.isArray(x) || Array.isArray(y))) {
    const item = how.item as (v: unknown) => string;
    const keyed = (xs: unknown) => new Map(((xs as Record<string, unknown>[] | undefined) ?? []).map((v, i) => [String(v.uid ?? item(v) ?? i), v]));
    const a = keyed(x);
    const b = keyed(y);
    for (const [k, v] of b) {
      const w = a.get(k);
      if (!w) out.push({ kind: 'added', text: `${how.label}: ${item(v)}` });
      else if (!sameJson(w, v)) out.push({ kind: 'changed', text: item(w) === item(v) ? `${how.label}: ${item(v)}` : `${how.label}: ${item(w)} → ${item(v)}` });
    }
    for (const [k, v] of a) if (!b.has(k)) out.push({ kind: 'removed', text: `${how.label}: ${item(v)}` });
    return false;
  }
  if (how.parts && (typeof x === 'object' || typeof y === 'object')) {
    const xo = (x ?? {}) as Record<string, unknown>;
    const yo = (y ?? {}) as Record<string, unknown>;
    let unnamed = false;
    let other = false;
    for (const k of new Set([...Object.keys(xo), ...Object.keys(yo)])) {
      const part = how.parts[k];
      if (part === 'shown' || sameJson(xo[k], yo[k])) continue;
      if (part === 'other') other = true;
      else if (part) other = compareField(part, xo[k], yo[k], out) || other;
      else unnamed = true;
    }
    if (unnamed) out.push({ kind: 'changed', text: how.label });
    return other;
  }
  const [sx, sy] = [shownValue(x), shownValue(y)];
  out.push({ kind: 'changed', text: sx !== undefined && sy !== undefined ? `${how.label}: ${sx} → ${sy}` : how.label });
  return false;
}
