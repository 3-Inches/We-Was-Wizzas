// The holy side of play (Realms of Power: The Divine): miraculous effects worked with a Method and a
// Power, prayers for miracles, God's aid, the saints and holy forbears, holy influence and tempers,
// the Divine Ascent, and the Magic Resistance of the commanding aura, relics and the Divine Form.
// Every total carries its parts, as in engine/magic.ts. The data is data/divine.ts.

import {
  DIVINE_AID_TABLE, HOLY_METHODS, HOLY_POWERS, HOLY_RITUAL_MAGNITUDES, METHOD_POWERS, SAINT_POWERS, TEMPERS,
  type HolyMethod, type HolyPower, type MethodKind, type Saint, type SaintPower, type TragedyKind,
} from '../data/divine';
import type { DerivedCharacter } from './character/derive';
import { auraModifier, type AuraState, type Part, type TotalResult } from './magic';
import { DURATIONS, RANGES, TARGETS, addMagnitudes, findOpt } from './spellDesign';
import type { Character, Season } from './types';
import { warpingScoreFromPoints } from './xp';

// ------------------------------------------------------------------------------------------------
// Who has what

const ability = (d: DerivedCharacter, id: string) => d.abilities.find((a) => a.abilityId === id && a.total > 0);
const score = (d: DerivedCharacter, id: string) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0);
const has = (d: DerivedCharacter, id: string) => d.virtues.some((v) => v.cv.defId === id && !v.held);

export type OwnMethod = HolyMethod & { score: number; specialty?: string };
export type OwnPower = HolyPower & { score: number; specialty?: string };

/** The Methods a character can call holy effects with: a score of 1 or more (none works at 0). */
export function holyMethodsOf(d: DerivedCharacter): OwnMethod[] {
  return HOLY_METHODS.flatMap((m) => {
    const a = ability(d, m.id);
    return a ? [{ ...m, score: a.total, specialty: a.specialty }] : [];
  });
}

/** The Powers a character has a score in. */
export function holyPowersOf(d: DerivedCharacter): OwnPower[] {
  return HOLY_POWERS.flatMap((p) => {
    const a = ability(d, p.id);
    return a ? [{ ...p, score: a.total, specialty: a.specialty }] : [];
  });
}

/** A Method and a Power that work together (Invocation with Adjuration, Blessing, Cursing or Wonders…). */
export function methodWorksWith(m: MethodKind, power: string): boolean {
  return METHOD_POWERS[m].includes(power);
}

/** Whether a character works miracles of their own: a Method and a Power that go together. */
export function worksHolyEffects(d: DerivedCharacter): boolean {
  const ps = holyPowersOf(d);
  return holyMethodsOf(d).some((m) => ps.some((p) => methodWorksWith(m.as, p.id)));
}

/** A holy magus: magic designed with Holy Magic in place of Magic Theory (the Virtue, or Karaite Magic). */
export const isHolyMagus = (d: DerivedCharacter) => d.theoryAbility === 'holy-magic';

/** A "holy character" in the book's sense: a holy power or Miraculous Ability (they undergo the Divine Ascent). */
export function isHolyCharacter(d: DerivedCharacter): boolean {
  return holyMethodsOf(d).length > 0 || holyPowersOf(d).length > 0 || isHolyMagus(d) || score(d, 'ars-notoria') > 0;
}

/** Whether any of the holy page's cards is for this character: holy powers, True Faith, Faith Points, a relic, Confidence to invoke God or a saint. */
export function takesPartInHoly(c: Character, d: DerivedCharacter): boolean {
  return isHolyCharacter(d) || d.trueFaith > 0 || d.faithPoints > 0 || d.relicFaith > 0 || c.type !== 'grog';
}

/**
 * Whether a powerful Divine aura warps this character. It does not warp one with holy powers, a
 * Virtue from a Divine source or Faith Points (Divine Warping), a holy magus (attuned to the Dominion),
 * nor one under a Ring of Solomon (Ars Notoria).
 */
export function divineAuraWarps(c: Character, d: DerivedCharacter): boolean {
  if (isHolyCharacter(d) || d.trueFaith > 0 || d.faithPoints > 0 || d.relicFaith > 0) return false;
  if (d.virtues.some((v) => !v.held && v.def?.kind === 'virtue' && v.def.tags?.includes('divine'))) return false;
  return !c.holy?.notoria?.active;
}

// ------------------------------------------------------------------------------------------------
// An effect's level (Powers and Effects: Hermetic Range, Duration and Target; no Rituals)

export interface HolyLevelInput {
  base: number;
  range: string;
  duration: string;
  target: string;
  /** what would need a Ritual in Hermetic magic: four magnitudes more instead */
  asRitual?: boolean;
  /** more senses, a larger target, an intricate effect */
  extra?: number;
}

export function holyEffectLevel(i: HolyLevelInput): { level: number; magnitude: number; design: string } {
  const parts: string[] = [`Base ${i.base}`];
  let mags = 0;
  const add = (n: number | undefined, label: string) => {
    if (!n) return;
    mags += n;
    parts.push(`${n > 0 ? '+' : ''}${n} ${label}`);
  };
  add(findOpt(RANGES, i.range)?.magnitude, i.range);
  add(findOpt(DURATIONS, i.duration)?.magnitude, i.duration);
  add(findOpt(TARGETS, i.target)?.magnitude, i.target);
  add(i.extra, 'more');
  if (i.asRitual) add(HOLY_RITUAL_MAGNITUDES, 'as a Ritual would be');
  const level = addMagnitudes(i.base, mags);
  return { level, magnitude: Math.max(1, Math.ceil(level / 5)), design: `(${parts.join(', ')})` };
}

/** Would Hermetic magic need a Ritual for this? (A Boundary or Dominion Target, a Year or Grace Duration.) */
export function wouldBeRitual(target: string, duration: string): boolean {
  return !!findOpt(TARGETS, target)?.ritual || !!findOpt(DURATIONS, duration)?.ritual;
}

// ------------------------------------------------------------------------------------------------
// Calling a holy effect: simple die + Characteristic + Method + Power + aura

/** One who joins a ceremony (the Ceremony Ability): what they add to the focus character's total. */
export interface CeremonyMember {
  name: string;
  /** their Characteristic + Method (or + Ability), or the Characteristic alone */
  adds: number;
  /** their Ceremony score */
  ceremony: number;
}

export interface CeremonyGroup {
  members: CeremonyMember[];
  /** the leader's Ceremony score: so many others count (no leader: the group modifier instead) */
  leaderCeremony?: number;
  /** the leader, when it is one of those joining and not the focus character (who has the Method and Power) */
  leaderName?: string;
  /** the focus character's own Ceremony score, counted in the group modifier */
  focusCeremony?: number;
}

/**
 * The Ceremony bonus (Blessed by God, Ceremony). The focus character is the one with the Ability
 * being used; anyone with Ceremony may lead. Led, the leader's score is how many others may add
 * their (Characteristic + Method): the focus character is one of those others when someone else
 * leads. Unled, everyone adds, and (total Ceremony − participants) is added too.
 */
export function ceremonyParts(g: CeremonyGroup | undefined): Part[] {
  if (!g || !g.members.length) return [];
  const parts: Part[] = [];
  if (g.leaderCeremony !== undefined) {
    const leader = g.leaderName ? g.members.find((m) => m.name === g.leaderName) : undefined;
    const rest = g.members.filter((m) => m !== leader);
    // another's leading takes one of the leader's places for the focus character
    const places = Math.max(0, g.leaderCeremony - (leader ? 1 : 0));
    const counted = rest.slice(0, places);
    if (leader) parts.push({ label: `Ceremony: ${leader.name}, leading`, value: leader.adds });
    for (const m of counted) parts.push({ label: `Ceremony: ${m.name}`, value: m.adds });
    const left = rest.length - counted.length;
    if (left > 0) parts.push({ label: `${left} more join in but do not count (the leader’s Ceremony ${g.leaderCeremony})`, value: 0 });
    return parts;
  }
  // the group modifier counts the focus character among the participants
  const total = g.members.reduce((s, m) => s + m.ceremony, g.focusCeremony ?? 0);
  // it is the Ceremony Ability that joins the prayers: with nobody who has it, each prays alone
  if (total <= 0) return [{ label: 'Ceremony: nobody praying has the Ability, so their prayers do not join', value: 0 }];
  for (const m of g.members) parts.push({ label: `Ceremony: ${m.name}`, value: m.adds });
  parts.push({ label: `Group modifier (Ceremony ${total} − ${g.members.length + 1} praying)`, value: total - (g.members.length + 1) });
  return parts;
}

export interface HolyEffectOptions {
  method: string;
  power: string;
  aura?: AuraState;
  /** a specialty applies: +1 each */
  methodSpecialty?: boolean;
  powerSpecialty?: boolean;
  /** Gematria: the Quality of the text studied (the lower of it and Gematria counts) */
  textQuality?: number;
  ceremony?: CeremonyGroup;
  /** Confidence or Faith Points spent for +3 each (Faith at True Faith 3: +6) */
  confidenceSpent?: number;
  faithSpent?: number;
  other?: number;
  extra?: Part[];
}

/** Faith Points spent like Confidence: +3 each, +6 with a True Faith Score of 3 or more (Embodying the Light, Hope). */
export const faithPointValue = (d: DerivedCharacter) => (d.trueFaith >= 3 ? 6 : 3);

/** How many Confidence and Faith Points a roll may take: no more than the Confidence Score, and the True Faith Score (one without it). */
export function spendingCaps(d: DerivedCharacter, c: Character): { confidence: number; faith: number } {
  return { confidence: Math.min(c.confidence.points, c.confidence.score), faith: Math.min(d.faithPoints, Math.max(1, d.trueFaith)) };
}

export function holyEffectTotal(d: DerivedCharacter, o: HolyEffectOptions): TotalResult & { method?: HolyMethod; power?: HolyPower; works: boolean; stress: boolean } {
  const parts: Part[] = [];
  const notes: string[] = [];
  const m = HOLY_METHODS.find((x) => x.id === o.method);
  const p = HOLY_POWERS.find((x) => x.id === o.power);
  const ms = score(d, o.method);
  const ps = score(d, o.power);
  const works = !!m && !!p && ms > 0 && ps > 0 && methodWorksWith(m.as, p.id);
  if (!m || !p) return { total: 0, parts, halved: false, notes: ['Choose a Method and a Power.'], works: false, stress: false };
  if (!works) notes.push(ms <= 0 ? `No score in ${m.name}: it cannot be used at all.` : ps <= 0 ? `No score in ${p.name}: it cannot be used at all.` : `${m.name} does not call ${p.name}.`);
  parts.push({ label: m.char === 'Com' ? 'Communication' : m.char === 'Int' ? 'Intelligence' : m.char === 'Sta' ? 'Stamina' : m.char === 'Pre' ? 'Presence' : m.char, value: d.characteristics[m.char].value });
  let mv = ms;
  if (m.id === 'gematria' && o.textQuality !== undefined && o.textQuality < ms) {
    mv = o.textQuality;
    notes.push(`Gematria: the text’s Quality ${o.textQuality} is lower than Gematria ${ms}, so it counts.`);
  }
  parts.push({ label: m.name, value: mv });
  if (o.methodSpecialty) parts.push({ label: `${m.name} specialty`, value: 1 });
  parts.push({ label: p.name, value: ps });
  if (o.powerSpecialty) parts.push({ label: `${p.name} specialty`, value: 1 });
  // Kabbalah totals: Astrological Magic adds Artes Liberales, Philosophic Magic Philosophiae (Mythic Judaism)
  if (m.id === 'kabbalah') {
    if (has(d, 'astrological-magic')) parts.push({ label: 'Astrological Magic (Artes Liberales)', value: score(d, 'artes-liberales') });
    if (has(d, 'philosophic-magic')) parts.push({ label: 'Philosophic Magic (Philosophiae)', value: score(d, 'philosophiae') });
  }
  const aura = auraModifier('Divine', o.aura);
  if (aura.mod) parts.push({ label: `Aura (${o.aura?.realm} ${o.aura?.strength})`, value: aura.mod });
  parts.push(...ceremonyParts(o.ceremony));
  if (o.confidenceSpent) parts.push({ label: `Confidence (${o.confidenceSpent} × 3)`, value: 3 * o.confidenceSpent });
  if (o.faithSpent) parts.push({ label: `Faith Points (${o.faithSpent} × ${faithPointValue(d)})`, value: faithPointValue(d) * o.faithSpent });
  if (d.currentWoundPenalty) parts.push({ label: 'Wounds', value: d.currentWoundPenalty });
  if (d.currentFatiguePenalty) parts.push({ label: 'Fatigue', value: d.currentFatiguePenalty });
  if (d.currentDiseasePenalty) parts.push({ label: 'Disease', value: d.currentDiseasePenalty });
  if (o.other) parts.push({ label: 'Other modifier', value: o.other });
  for (const x of o.extra ?? []) parts.push(x);
  if (aura.note) notes.push(`${aura.note}: +${aura.botch} botch dice on a stress die`);
  if (m.as === 'invocation') notes.push('Invocation: a Confidence (or Faith) Point is spent to bring the effect into being; a stress die may be rolled instead of a simple one.');
  return { total: parts.reduce((s, x) => s + x.value, 0), parts, halved: false, notes, method: m, power: p, works, stress: m.as === 'invocation', botchDice: aura.botch };
}

export interface HolyOutcome {
  works: boolean;
  /** by how much the total fell short */
  short: number;
  tragedy?: TragedyKind;
  /** True Faith kept a tragedy away (Faith × 10 counted in place of the total) */
  faithSaved?: boolean;
  /** Warping Points: one for each 0 on the botch dice; a level 30 effect warps its target */
  warping: number;
  warpsTarget: boolean;
}

/** Whether the effect happens, and the tragedy of hubris if it fails (True Faith: Faith × 10 counts for the tragedy, if higher). */
export function holyOutcome(total: number, level: number, trueFaith: number, botches = 0): HolyOutcome {
  const works = botches === 0 && total >= level;
  const short = Math.max(0, level - total);
  if (works) return { works, short, warping: 0, warpsTarget: level >= 30 };
  // the gap that decides the tragedy: the total, or Faith × 10 if that is higher; a botch is at least a minor one
  const judged = Math.max(total, trueFaith * 10);
  const gap = level - judged;
  const tragedy: TragedyKind | undefined = gap > 0 ? tragedyOf(gap) : botches ? 'minor' : undefined;
  const faithSaved = trueFaith > 0 && short > 0 && tragedyOf(short) !== tragedy;
  return { works, short, tragedy, faithSaved, warping: botches, warpsTarget: false };
}

const tragedyOf = (gap: number): TragedyKind => (gap <= 10 ? 'minor' : gap <= 20 ? 'major' : 'ultimate');

// ------------------------------------------------------------------------------------------------
// Praying for a miracle (Blessed by God, Miracles: optional rules)

export interface MiracleOptions {
  aura?: AuraState;
  /** a Holy Method's score used in place of Concentration */
  method?: string;
  /** Faith Points spent beyond the one the prayer costs, for +3 each (+6 at True Faith 3) */
  faithExtra?: number;
  confidence?: number;
  ceremony?: CeremonyGroup;
  other?: number;
}

export function miracleTotal(d: DerivedCharacter, o: MiracleOptions = {}): TotalResult {
  const parts: Part[] = [];
  const notes: string[] = [];
  if (d.trueFaith) parts.push({ label: 'True Faith Score', value: d.trueFaith });
  else notes.push('No True Faith Score: only the aura (and what is spent) is added.');
  if (d.trueFaith) {
    const conc = score(d, 'concentration');
    const meth = o.method ? score(d, o.method) : 0;
    const mName = HOLY_METHODS.find((m) => m.id === o.method)?.name;
    if (meth > conc && mName) parts.push({ label: `${mName} (in place of Concentration)`, value: meth });
    else parts.push({ label: 'Concentration', value: conc });
  }
  const aura = auraModifier('Divine', o.aura);
  if (aura.mod) parts.push({ label: `Aura (${o.aura?.realm} ${o.aura?.strength})`, value: aura.mod });
  parts.push(...ceremonyParts(o.ceremony));
  if (o.faithExtra) parts.push({ label: `Faith Points (${o.faithExtra} × ${faithPointValue(d)})`, value: o.faithExtra * faithPointValue(d) });
  if (o.confidence) parts.push({ label: `Confidence (${o.confidence} × 3)`, value: 3 * o.confidence });
  if (o.other) parts.push({ label: 'Other modifier', value: o.other });
  notes.push('A miracle has unlimited Penetration and cannot be undone, altered or resisted. One of level 30 or more Warps those who only witness it.');
  return { total: parts.reduce((s, x) => s + x.value, 0), parts, halved: false, notes, botchDice: aura.botch };
}

/** A miracle's level: the effect's level, with how soon it is wanted and how great the need. */
export function miracleLevel(effectLevel: number, timeliness: number, need: number): number {
  return Math.max(1, effectLevel + timeliness + need);
}

// ------------------------------------------------------------------------------------------------
// God's aid, holy influence and tempers (one table: 9 / 15 / 24)

export function divineAidBonus(total: number): number {
  return DIVINE_AID_TABLE.find((r) => total >= r.atLeast)?.bonus ?? 0;
}

/** Invoking God's aid: stress die + Communication + Dominion Lore (a zero rolls at least three botch dice). */
export function godsAidTotal(d: DerivedCharacter, ceremony?: CeremonyGroup): TotalResult {
  const parts: Part[] = [
    { label: 'Communication', value: d.characteristics.Com.value },
    { label: 'Dominion Lore', value: score(d, 'dominion-lore') },
    ...ceremonyParts(ceremony),
  ];
  if (d.currentWoundPenalty) parts.push({ label: 'Wounds', value: d.currentWoundPenalty });
  if (d.currentFatiguePenalty) parts.push({ label: 'Fatigue', value: d.currentFatiguePenalty });
  return { total: parts.reduce((s, x) => s + x.value, 0), parts, halved: false, notes: ['A Confidence Point is spent (a Faith Point with True Faith); it does not add +3.'], botchDice: 3 };
}

/** Who may invoke God's aid: one who can spend a Confidence Point (not a grog, not Low Self-Esteem), or a Faith Point with True Faith. */
export function canInvokeGodsAid(c: Character, d: DerivedCharacter): { ok: boolean; why?: string } {
  if (d.trueFaith > 0 && d.faithPoints > 0) return { ok: true };
  if (c.type === 'grog') return { ok: false, why: 'A grog has no Confidence to spend.' };
  if (has(d, 'low-self-esteem-flaw')) return { ok: false, why: 'Low Self-Esteem: no Confidence to spend.' };
  if (c.confidence.points < 1) return { ok: false, why: 'No Confidence Points left.' };
  return { ok: true };
}

/** Holy influence (simple die) and tempering an aura (stress die): Presence + Leadership. */
export function influenceTotal(d: DerivedCharacter, ceremony?: CeremonyGroup): TotalResult {
  const parts: Part[] = [
    { label: 'Presence', value: d.characteristics.Pre.value },
    { label: 'Leadership', value: score(d, 'leadership') },
    ...ceremonyParts(ceremony),
  ];
  return { total: parts.reduce((s, x) => s + x.value, 0), parts, halved: false, notes: [] };
}

export interface ActiveTemper {
  temper: string;
  value: number;
  how: 'ceremonial' | 'personal';
  place: string;
  year: number;
  season: Season;
}

/** A temper fades by one a day (ceremonial influence) or a season (personal); at 0 the aura is itself again. */
export function fadeTemper(t: ActiveTemper, steps = 1): ActiveTemper | undefined {
  const value = t.value - steps;
  return value > 0 ? { ...t, value } : undefined;
}

export function temperName(id: string): string {
  const t = TEMPERS.find((x) => x.id === id);
  return t ? `${t.name} (against ${t.vice})` : id;
}

/** Tempers invoked in the same aura by two holy characters cancel where they clash: schism. */
export function schism(tempers: ActiveTemper[]): string[] {
  const out: string[] = [];
  const byPlace = new Map<string, ActiveTemper[]>();
  for (const t of tempers) byPlace.set(t.place.trim().toLowerCase(), [...(byPlace.get(t.place.trim().toLowerCase()) ?? []), t]);
  for (const ts of byPlace.values()) if (new Set(ts.map((t) => t.temper)).size > 1) out.push(`${ts[0].place}: ${ts.map((t) => temperName(t.temper)).join(' and ')} — schism; where they clash, bonus and penalty cancel.`);
  return out;
}

// ------------------------------------------------------------------------------------------------
// The saints and holy forbears (Mythic Christianity, Saints; Mythic Islam, Holy Forbears)

export interface SaintRollOptions {
  aura?: AuraState;
  mods: Part[];
  /** a Muslim's highest Muslim Personality Trait (it is added, in place of True Faith) */
  muslimTrait?: number;
}

/** Invoking a saint: Communication + Charm + modifiers + a simple die, against 15 + a simple die the storyguide rolls unseen. */
export function invokeSaintTotal(d: DerivedCharacter, saint: Saint, o: SaintRollOptions): TotalResult {
  const parts: Part[] = [
    { label: 'Communication', value: d.characteristics.Com.value },
    { label: 'Charm', value: score(d, 'charm') },
    ...o.mods,
  ];
  if (o.aura?.realm === 'Divine' && o.aura.strength > 0) parts.push({ label: `In a Divine aura (${o.aura.strength})`, value: o.aura.strength });
  if (saint.faith === 'christian' && d.trueFaith) parts.push({ label: `True Faith (${d.trueFaith})`, value: d.trueFaith });
  if (saint.faith === 'muslim' && o.muslimTrait) parts.push({ label: 'Highest Muslim Personality Trait', value: o.muslimTrait });
  const notes = saint.faith === 'muslim'
    ? ['A Muslim must be at the forbear’s shrine (the Qur’an may be invoked anywhere), and never threatens a forbear.']
    : ['Once a day. A failure may be tried again tomorrow, or the saint threatened.'];
  return { total: parts.reduce((s, x) => s + x.value, 0), parts, halved: false, notes };
}

/** Threatening a saint who refused: Presence + Leadership + modifiers + a stress die, against 9 + Might ÷ 5 (Confidence may be spent, not Faith). */
export function threatenSaintTotal(d: DerivedCharacter, mods: Part[]): TotalResult {
  const parts: Part[] = [
    { label: 'Presence', value: d.characteristics.Pre.value },
    { label: 'Leadership', value: score(d, 'leadership') },
    ...mods,
  ];
  return { total: parts.reduce((s, x) => s + x.value, 0), parts, halved: false, notes: ['Confidence may be spent on this roll, not Faith Points.'] };
}

export const threatEase = (saint: Saint) => 9 + Math.floor(saint.might / 5);

export type ThreatResult = 'granted' | 'annoyed' | 'cursed' | 'botched';

export function threatResult(total: number, saint: Saint, botched: boolean): ThreatResult {
  if (botched) return 'botched';
  const ease = threatEase(saint);
  if (total >= ease) return 'granted';
  return ease - total >= 10 ? 'cursed' : 'annoyed';
}

export function threatText(r: ThreatResult, saint: Saint): string {
  const curses = saint.powers.map(saintPower).filter((p): p is SaintPower => !!p?.curse);
  const minor = curses.find((p) => p.cost <= 1) ?? SAINT_POWERS.find((p) => p.curse && p.cost === 1)!;
  return {
    granted: `${saint.name} grants the miracle at once (a power from its list).`,
    annoyed: `${saint.name} is annoyed and answers none of the petitioner’s prayers for a month.`,
    cursed: `${saint.name} punishes the petitioner with a minor curse (${minor.name}: ${minor.text}) and grants no aid for a whole season.`,
    botched: `${saint.name} lays its curse on the petitioner${curses.length ? ` (${curses.map((c) => c.name).join(' or ')})` : ''}.`,
  }[r];
}

export function saintPower(name: string): SaintPower | undefined {
  const n = name.toLowerCase().replace(/ignem domini/, 'ignis domini').replace(/acknowledgement/, 'acknowledgment').replace(/labor's|labor’s/, 'laborer’s');
  return SAINT_POWERS.find((p) => p.name.toLowerCase() === n || p.name.toLowerCase().replace(/’/g, "'") === n);
}

/** A saint's miracles cost Might, which comes back at dawn: what is left after the uses so far. */
export function saintMightLeft(saint: Saint, used: string[]): number {
  return saint.might - used.reduce((s, n) => s + (saintPower(n)?.cost ?? 0), 0);
}

// ------------------------------------------------------------------------------------------------
// The Divine Ascent (Divine Warping)

export interface AscentCheck {
  resist: TotalResult;
  /** what the resisting roll is against, before the storyguide's stress die */
  against: TotalResult;
  /** the resisting total before any Meditation subtracted to welcome the Ascent: the margin of failure is counted from it */
  plain: number;
  /** the Meditation score that may be subtracted (0 with none) */
  meditation: number;
}

/**
 * Two or more Warping Points at once: Presence + Concentration (or Meditation) + stress die against
 * Warping Score + the points gained + True Faith Score + the local aura + a stress die (no botch).
 * One with Meditation may subtract it from the roll to welcome the Ascent; that does not add to the
 * Warping Points the Ascent brings (Meditation).
 */
export function ascentCheck(d: DerivedCharacter, gained: number, aura?: AuraState, welcome = false): AscentCheck {
  const conc = score(d, 'concentration');
  const med = Math.max(score(d, 'meditation'), score(d, 'holy-music'), score(d, 'dream-interpretation'), score(d, 'gematria'));
  const resistParts: Part[] = [
    { label: 'Presence', value: d.characteristics.Pre.value },
    med > conc ? { label: 'Meditation', value: med } : { label: 'Concentration', value: conc },
  ];
  const sum = (ps: Part[]) => ps.reduce((s, x) => s + x.value, 0);
  const plain = sum(resistParts);
  if (welcome && med > 0) resistParts.push({ label: 'Welcoming the Ascent (Meditation subtracted)', value: -med });
  const ws = warpingScoreFromPoints(d.warpingPoints + gained);
  const againstParts: Part[] = [
    { label: `Warping Score (with the ${gained} points)`, value: ws },
    { label: 'Warping Points gained', value: gained },
  ];
  if (d.trueFaith) againstParts.push({ label: 'True Faith Score', value: d.trueFaith });
  if (aura && aura.strength > 0 && aura.realm !== 'None') againstParts.push({ label: `${aura.realm} aura`, value: aura.strength });
  return {
    resist: { total: sum(resistParts), parts: resistParts, halved: false, notes: welcome && med > 0 ? ['Meditation is subtracted to welcome the Ascent; the Warping Points it brings are counted without that.'] : [] },
    against: { total: sum(againstParts), parts: againstParts, halved: false, notes: ['The storyguide adds a stress die (it cannot botch).'] },
    plain,
    meditation: med,
  };
}

/**
 * What the Ascension roll comes to. The character is held to the world on a total that reaches the
 * other; else ascends, with as many more Warping Points as the margin of failure (a botched die
 * counts 0; Meditation subtracted to welcome the Ascent does not add to the margin).
 */
export function ascentOutcome(check: AscentCheck, die: { value: number; botches: number }, theirs: number): { ascends: boolean; margin: number; mine: number; against: number } {
  const rolled = die.botches ? 0 : die.value;
  const mine = check.resist.total + rolled;
  const against = check.against.total + theirs;
  const ascends = die.botches > 0 || mine < against;
  // the margin from the roll as it stood before Meditation was subtracted: none when only the welcome tipped it
  const margin = ascends ? Math.max(check.plain === check.resist.total ? 1 : 0, against - (check.plain + rolled)) : 0;
  return { ascends, margin, mine, against };
}

/** How long the Ascent lasts: (Warping Score + the points gained) days, less the True Faith Score, at least one; months at Warping Score 6 or more. */
export function ascentDuration(scoreBefore: number, gained: number, trueFaith: number): { n: number; unit: 'days' | 'months' } {
  return { n: Math.max(1, scoreBefore + gained - trueFaith), unit: scoreBefore >= 6 ? 'months' : 'days' };
}

export const ASCENT_FORMS = {
  gloom: 'Divine Gloom: each time Warping Points are gained, as many experience points go to Dominion Lore, holy Powers and holy Virtues’ Abilities, and as many are lost from mundane Abilities; a beacon to the invisible world.',
  form: 'Divine Form: Magic Resistance and Penetration of a commanding aura equal to the Warping Score (with True Faith’s on top, and Faith × 5 more Penetration); an impious act rolls Warping Score × 3 more botch dice; a venial sin is a Light Wound, a mortal sin a Medium Wound, neither soaked.',
  unity: 'Divine Unity: one virtue personified; the Warping Score is added to its Personality Trait; those who spend a season with the character are influenced, and the aura takes its temper.',
} as const;
export type AscentForm = keyof typeof ASCENT_FORMS;

// ------------------------------------------------------------------------------------------------
// Holy state kept on a character

export interface HolyState {
  /** the form of the Divine Ascent, chosen once for life */
  ascent?: AscentForm;
  /** Divine Unity: the virtue personified and the Personality Trait it raises */
  unity?: { virtue: string; trait: string };
  /** the Magic Resistance of a commanding aura (10, 20 or 25) from investiture */
  commandingAura?: number;
  /** the temper the character last invoked (one at a time) */
  temper?: ActiveTemper;
  /** God's aid, invoked for a scene: the bonus and the objective, until a roll fails */
  aid?: { bonus: number; objective: string };
  /** the holy tradition the character belongs to */
  tradition?: string;
  /** a botched prayer: Faith Points lost for weeks */
  faithLost?: { points: number; weeks: number; text: string };
  /** saints or forbears that will not answer for now (their id → until when) */
  silent?: Record<string, string>;
  /** tragedies of hubris suffered */
  tragedies?: { year: number; season: Season; kind: TragedyKind; text: string }[];
  /** the Rings of Solomon learned (1–7) and the one in effect */
  notoria?: { learned: number; active?: { ring: number; untilYear: number; untilSeason: Season; disease?: string } };
  /** seasonal holy works under way or done: Major amulets, golems, True Names (Mythic Judaism) */
  works?: HolyWork[];
  /** Shinnui Shem: a bonus to aging rolls until the next Aging Point */
  shinnui?: number;
  /** True Names learned through Merkavah: a holy connection and +5 to the Penetration multiplier against the being */
  trueNames?: string[];
}

export type HolyWorkKind = 'amulet' | 'golem' | 'empower' | 'trueName' | 'shinnui';

export interface HolyWork {
  uid: string;
  kind: HolyWorkKind;
  name: string;
  /** an amulet's or a golem power's level; a being's Might for a True Name */
  target: number;
  progress: number;
  seasons: number;
  done?: boolean;
  /** an amulet: the Method and Power, and its shape and material bonus */
  method?: string;
  power?: string;
  materials?: number;
  /** a golem: the body has been formed (its first season) */
  bodyFormed?: boolean;
  /** others praying with the leader: their Ceremony bonus (Intelligence + Kabbalah, or Stamina + Merkavah, of each) and how many they are */
  ceremonyBonus?: number;
  helpers?: number;
  /** Shinnui Shem: the Quality of the text */
  quality?: number;
  /** Merkavah alone: a failed Disciplined roll binds the next season to the same study, without benefit */
  obsessed?: boolean;
  result?: string;
}

const WORK_LABELS: Record<HolyWorkKind, string> = {
  amulet: 'a Major amulet',
  golem: 'awaken a golem',
  empower: 'empower a golem',
  trueName: 'a True Name through Merkavah',
  shinnui: 'Shinnui Shem',
};
export const holyWorkLabel = (k: HolyWorkKind) => WORK_LABELS[k];

/** The works a character can undertake: Craft Amulets for amulets, Kabbalah for golems, Merkavah for True Names, Gematria for Shinnui Shem. */
export function holyWorksOpen(d: DerivedCharacter): HolyWorkKind[] {
  const out: HolyWorkKind[] = [];
  if (score(d, 'craft-amulets') > 0) out.push('amulet');
  if (score(d, 'kabbalah') > 0) out.push('golem', 'empower');
  if (score(d, 'merkavah') > 0) out.push('trueName');
  if (score(d, 'gematria') > 0) out.push('shinnui');
  return out;
}

/** The season's total for a work, with its parts (Mythic Judaism: Craft Amulets, Golems, Merkavah, Shinnui Shem). */
export function holyWorkTotal(d: DerivedCharacter, w: HolyWork, aura?: AuraState): TotalResult {
  const parts: Part[] = [];
  const notes: string[] = [];
  const divine = aura?.realm === 'Divine' && aura.strength > 0 ? aura.strength : 0;
  const ch = (k: 'Int' | 'Sta' | 'Dex', label: string) => parts.push({ label, value: d.characteristics[k].value });
  if (w.kind === 'amulet') {
    ch('Dex', 'Dexterity');
    const ca = score(d, 'craft-amulets');
    parts.push({ label: 'Craft Amulets', value: ca });
    const m = w.method ? HOLY_METHODS.find((x) => x.id === w.method) : undefined;
    const p = w.power ? HOLY_POWERS.find((x) => x.id === w.power) : undefined;
    if (m) parts.push({ label: m.name, value: score(d, m.id) });
    if (p) parts.push({ label: p.name, value: score(d, p.id) });
    if (!m || !p) notes.push('A Major amulet adds a Holy Method and a Holy Power.');
    if (w.materials) parts.push({ label: `Shape and material${w.materials > ca ? ` (held to Craft Amulets ${ca})` : ''}`, value: Math.min(w.materials, ca) });
  } else if (w.kind === 'golem' || w.kind === 'empower') {
    ch('Int', 'Intelligence');
    parts.push({ label: 'Kabbalah', value: score(d, 'kabbalah') });
    parts.push({ label: 'Wonders', value: score(d, 'wonders') });
    if (has(d, 'astrological-magic')) parts.push({ label: 'Astrological Magic (Artes Liberales)', value: score(d, 'artes-liberales') });
    if (has(d, 'philosophic-magic')) parts.push({ label: 'Philosophic Magic (Philosophiae)', value: score(d, 'philosophiae') });
  } else if (w.kind === 'trueName') {
    ch('Sta', 'Stamina');
    parts.push({ label: 'Merkavah', value: score(d, 'merkavah') });
    parts.push({ label: 'Adjuration', value: score(d, 'adjuration') });
  } else {
    ch('Int', 'Intelligence');
    parts.push({ label: 'Gematria', value: score(d, 'gematria') });
    parts.push({ label: 'Understanding', value: score(d, 'understanding') });
    parts.push({ label: 'The text’s Quality', value: w.quality ?? 0 });
  }
  if (w.ceremonyBonus) parts.push({ label: `Ceremony (${w.helpers ?? 0} praying with)`, value: w.ceremonyBonus });
  if (divine) parts.push({ label: `Dominion aura ${divine}`, value: divine });
  return { total: parts.reduce((t, x) => t + x.value, 0), parts, halved: false, notes };
}

/** Where a work stands: the points it needs and what one season with this total would bring. */
export function holyWorkPlan(d: DerivedCharacter, w: HolyWork, aura?: AuraState): { total: TotalResult; need: number; gain: number; text: string } {
  const total = holyWorkTotal(d, w, aura);
  const t = total.total;
  switch (w.kind) {
    case 'amulet': {
      const gain = Math.max(0, t - w.target);
      return { total, need: w.target, gain, text: gain ? `+${gain} a season toward level ${w.target} (${w.progress}/${w.target}).` : `The total must beat the level (${w.target}).` };
    }
    case 'golem': {
      if (!w.bodyFormed) return { total, need: 0, gain: 0, text: 'The first season forms the body of clay, with earth from beneath a synagogue, and inscribes its symbols.' };
      const gain = Math.max(0, t - 30);
      const cap = 5 * score(d, 'kabbalah');
      return { total, need: cap, gain, text: `${gain ? `+${gain}` : 'Nothing'} toward its Might this season (${w.progress} so far; the total must beat 30). The last season adds a stress die; Might is held to Kabbalah × 5 = ${cap}.` };
    }
    case 'empower': {
      const gain = Math.max(0, t - w.target);
      return { total, need: w.target, gain, text: gain ? `+${gain} a season toward the power’s level ${w.target} (${w.progress}/${w.target}).` : `The total must beat the power’s level (${w.target}).` };
    }
    case 'trueName': {
      const gain = Math.max(0, t - w.target);
      return { total, need: w.target, gain, text: `${gain ? `+${gain}` : 'Nothing'} a season (the total must beat its Might ${w.target}); the name comes when the points pass it (${w.progress} so far). Each season costs a long-term Fatigue level, not regained until it ends.` };
    }
    case 'shinnui':
      return { total, need: 1, gain: 1, text: 'A season: a simple die is added, and a fifth of it (rounded down) is a bonus to Aging rolls until the next Aging Point.' };
  }
}

/**
 * A season of holy work (Mythic Judaism). Returns what happened; the character is changed: the work's
 * points, Fatigue for Merkavah, the True Name, the aging bonus, the golem's Might when awakened.
 */
export function workHolySeason(c: Character, d: DerivedCharacter, uid: string, aura: AuraState | undefined, opts: { finish?: boolean; rng?: () => number } = {}): string[] {
  const w = c.holy?.works?.find((x) => x.uid === uid);
  if (!w || w.done) return ['Nothing to work on.'];
  const rng = opts.rng ?? Math.random;
  const d10 = () => Math.floor(rng() * 10);
  const plan = holyWorkPlan(d, w, aura);
  const out: string[] = [];
  w.seasons += 1;
  if (w.obsessed) {
    w.obsessed = false;
    return [`${w.name}: the season is spent on the same study, obsessed, without benefit.`];
  }
  switch (w.kind) {
    case 'amulet':
    case 'empower': {
      w.progress = Math.min(w.target, w.progress + plan.gain);
      out.push(`${w.name}: total ${plan.total.total}, ${plan.gain ? `+${plan.gain}` : 'nothing'} (${w.progress}/${w.target}).`);
      if (w.progress >= w.target) {
        w.done = true;
        w.result = w.kind === 'amulet' ? `The amulet is made (level ${w.target}, Penetration 0 unless designed in: a level for 2 points).` : `The golem gains the power (level ${w.target}, magnitude ${Math.ceil(w.target / 5)}: its Might Points to use, Initiative its Quickness).`;
        out.push(w.result);
      }
      break;
    }
    case 'golem': {
      if (!w.bodyFormed) {
        w.bodyFormed = true;
        out.push(`${w.name}: the body is formed of clay and inscribed.`);
        break;
      }
      w.progress += plan.gain;
      out.push(`${w.name}: total ${plan.total.total} against 30, ${plan.gain ? `+${plan.gain}` : 'nothing'} (${w.progress} gathered).`);
      if (opts.finish) {
        // the last season's stress die, with a botch die for each kabbalist at the work
        let f = d10();
        let mult = 1;
        let botches = 0;
        if (f === 0) {
          for (let i = 0; i < 1 + (w.helpers ?? 0); i++) if (d10() === 0) botches++;
        }
        while (f === 1) {
          mult *= 2;
          f = d10();
        }
        const die = f === 0 ? (mult > 1 ? 10 * mult : 0) : f * mult;
        if (botches) {
          w.done = true;
          w.result = `BOTCH (${botches}): the awakening fails, and a tragedy of hubris may fall on those who led it.`;
        } else {
          const cap = 5 * score(d, 'kabbalah');
          const might = Math.min(cap, w.progress + die);
          w.done = true;
          w.result = `The golem awakens with Divine Might ${might}${w.progress + die > cap ? ` (held to Kabbalah × 5)` : ''}: living flesh, Unaging, Improved Characteristics, Weak-Willed; (Area) Lore 5, Awareness 1, Brawl 5, Charm 3, Concentration 1, Hebrew 5; Loyal to its Community +3, Trusting +3, Vengeful −3. Make it as a companion on the People page.`;
        }
        out.push(`The final season’s stress die: ${die}. ${w.result}`);
      }
      break;
    }
    case 'trueName': {
      c.longTermFatigueLost = Math.min(5, c.longTermFatigueLost + 1);
      w.progress += plan.gain;
      out.push(`${w.name}: total ${plan.total.total} against Might ${w.target}, ${plan.gain ? `+${plan.gain}` : 'nothing'} (${w.progress}); a long-term Fatigue level spent on fasting and prayer.`);
      if (w.progress > w.target) {
        w.done = true;
        w.result = `Visions reveal the True Name: a holy connection, and +5 to the Penetration multiplier against the being.`;
        c.holy = { ...(c.holy ?? {}), trueNames: [...(c.holy?.trueNames ?? []), w.name.replace(/^True Name: /, '')] };
        out.push(w.result);
      }
      if (!w.helpers) {
        // studying Merkavah alone: a Disciplined stress roll of 9 or more
        const disciplined = c.personality.find((t) => /disciplined/i.test(t.trait))?.score ?? 0;
        let f = d10();
        let mult = 1;
        while (f === 1) {
          mult *= 2;
          f = d10();
        }
        const botch = f === 0 && mult === 1 && d10() === 0;
        const roll = (f === 0 ? (mult > 1 ? 10 * mult : 0) : f * mult) + disciplined;
        if (botch) out.push('The Disciplined roll botches: Infernal spirits mark the search — the Plagued by Supernatural Entity Story Flaw.');
        else if (roll < 9) {
          if (!w.done) w.obsessed = true;
          out.push(`Disciplined ${disciplined} + die = ${roll} against 9: drawn to obsession; the next season goes to the same study, without benefit.`);
        }
      }
      break;
    }
    case 'shinnui': {
      const die = (d10() || 10);
      const bonus = Math.floor((plan.total.total + die) / 5);
      c.holy = { ...(c.holy ?? {}), shinnui: bonus };
      w.done = true;
      w.result = `The name is changed: every Arcane Connection to the old one is severed, and −${bonus} to Aging rolls until the next Aging Point (not with a Longevity Ritual's).`;
      out.push(`${w.name}: ${plan.total.total} + ${die} = ${plan.total.total + die}, ÷ 5 = ${bonus}. ${w.result}`);
      break;
    }
  }
  // the work's state back on the character
  c.holy = { ...(c.holy ?? {}), works: (c.holy?.works ?? []).map((x) => (x.uid === w.uid ? w : x)) };
  return out;
}


const SEASON_ORDER: Season[] = ['Spring', 'Summer', 'Autumn', 'Winter'];
const seasonNo = (year: number, season: Season) => year * 4 + SEASON_ORDER.indexOf(season);

/** The season a ring recited now for so many seasons runs to (its last season). */
export function ringUntil(year: number, season: Season, seasons: number): { untilYear: number; untilSeason: Season } {
  const n = seasonNo(year, season) + Math.max(1, seasons) - 1;
  return { untilYear: Math.floor(n / 4), untilSeason: SEASON_ORDER[n % 4] };
}

/**
 * Into a new season: a Ring of Solomon whose time is up ends, a personal temper fades by one (a
 * ceremonial one has long gone), God's aid ends with its scene, and Faith Points lost to a botched
 * prayer come back once their weeks are past (a season is about thirteen).
 */
export function holySeason(c: Character, year: number, season: Season): string[] {
  const h = c.holy;
  if (!h) return [];
  const out: string[] = [];
  const now = seasonNo(year, season);
  const ring = h.notoria?.active;
  if (ring && seasonNo(ring.untilYear, ring.untilSeason) < now) {
    out.push(`The ${['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh'][ring.ring - 1]} Ring of Solomon has run its course: its benefits end.`);
    h.notoria = { learned: h.notoria!.learned };
  }
  if (h.temper) {
    const t = h.temper.how === 'ceremonial' ? undefined : fadeTemper(h.temper);
    out.push(t ? `The ${temperName(h.temper.temper)} temper in ${h.temper.place} fades to +${t.value}.` : `The ${temperName(h.temper.temper)} temper in ${h.temper.place} has faded.`);
    h.temper = t;
  }
  if (h.aid) h.aid = undefined;
  if (h.faithLost) {
    const weeks = h.faithLost.weeks - 13;
    if (weeks <= 0) {
      c.faith = { score: c.faith?.score ?? 0, points: (c.faith?.points ?? 0) + h.faithLost.points };
      out.push(`The Faith Points lost to a botched prayer return (${h.faithLost.points}).`);
      h.faithLost = undefined;
    } else h.faithLost = { ...h.faithLost, weeks };
  }
  if (h.silent) {
    for (const [k, v] of Object.entries(h.silent)) if (v === 'a month') delete h.silent[k];
    for (const [k, v] of Object.entries(h.silent)) if (v === 'a season') h.silent[k] = 'a month';
  }
  return out;
}
