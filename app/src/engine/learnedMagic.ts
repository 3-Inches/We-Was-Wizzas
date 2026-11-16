// The Learned Magicians (Hedge Magic, Revised Edition, Chapter Four): casting a charm from memory or
// from a formulary, Entreat the Powers against a hostile aura, chartae and amulets with their
// horoscopes, inventing and learning charms, and the hazards of the tradition (Warping from botches,
// intervention on a double botch).

import { CHARM_PARAMS, DEVICE_PARAMS, LEARNED_FORMS, LEARNED_TECHNIQUES, learnedArtName, type LearnedArts, type LearnedForm, type LearnedParam, type LearnedTechnique } from '../data/hedgeLearned';
import type { DerivedCharacter } from './character/derive';
import { languageScore } from './books';
import { liberalArt } from './hermeticMysteries';
import { auraModifier, type AuraState, type Part, type Realm } from './magic';
import { addMagnitudes } from './spellDesign';
import type { Character, EnchantedItem, LearnedCharm } from './types';
import type { Form, Technique } from '../data/types';
import { uid } from '../util/id';

const score = (d: DerivedCharacter, id: string) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0);
const has = (c: Pick<Character, 'virtues'>, id: string) => c.virtues.some((v) => v.defId === id);

export interface LearnedArtScore {
  abbr: LearnedTechnique | LearnedForm;
  id: string;
  name: string;
  score: number;
}

/**
 * The Arts a magician may use: those on the sheet (from a Virtue, an Initiation or bought), and for a
 * Gifted mathematicus all six, whose Gift was opened to them at 0.
 */
export function learnedArts(c: Character, d: DerivedCharacter): { techniques: LearnedArtScore[]; forms: LearnedArtScore[] } {
  const all = has(c, 'mathematicus-of-bologna') && d.hasGift;
  const pick = <T extends { abbr: LearnedTechnique | LearnedForm; id: string; name: string }>(list: T[]) =>
    list.filter((x) => all || d.abilities.some((a) => a.abilityId === x.id)).map((x) => ({ abbr: x.abbr, id: x.id, name: x.name, score: score(d, x.id) }));
  return { techniques: pick(LEARNED_TECHNIQUES), forms: pick(LEARNED_FORMS) };
}

/** Someone who can work the magic: a Technique and a Form of the tradition. */
export function isLearnedMagician(c: Character, d: DerivedCharacter): boolean {
  const a = learnedArts(c, d);
  return a.techniques.length > 0 && a.forms.length > 0;
}

const artScore = (c: Character, d: DerivedCharacter, tf: LearnedArts) => {
  const a = learnedArts(c, d);
  const t = a.techniques.find((x) => x.abbr === tf.slice(0, 2));
  const f = a.forms.find((x) => x.abbr === tf.slice(2));
  return { t, f };
};

export interface LearnedTotal {
  total: number;
  parts: Part[];
  notes: string[];
  /** botch dice from a foreign aura */
  auraBotch: number;
}

/** The magic is of the Magic realm: an aura modifies it as it does Hermetic magic. */
export const learnedAura = (aura: AuraState | undefined) => auraModifier('Magic', aura);

/** Casting Score: Technique + Form + Communication + aura (+ an Entreat the Powers offset). */
export function castingScore(c: Character, d: DerivedCharacter, tf: LearnedArts, aura: AuraState | undefined, offset = 0): LearnedTotal {
  const { t, f } = artScore(c, d, tf);
  const notes: string[] = [];
  if (!t || !f) notes.push('The magician lacks this Technique or Form.');
  const a = learnedAura(aura);
  const parts: Part[] = [
    { label: t?.name ?? tf.slice(0, 2), value: t?.score ?? 0 },
    { label: f?.name ?? tf.slice(2), value: f?.score ?? 0 },
    { label: 'Communication', value: d.characteristics.Com.value },
  ];
  if (a.mod) parts.push({ label: a.note ?? 'Magic aura', value: a.mod });
  if (offset) parts.push({ label: 'Entreating the powers', value: offset });
  return { total: parts.reduce((s, p) => s + p.value, 0), parts, notes, auraBotch: a.botch };
}

/** What the Casting Score + die is divided by: 2 for a known charm, 5 read from a text; Strong Verbal Charms 1 and 2, Weak Verbal Charms always 5. */
export function charmDivisor(c: Pick<Character, 'virtues'>, fromText: boolean): number {
  if (has(c, 'weak-verbal-charms-flaw')) return 5;
  if (has(c, 'strong-verbal-charms')) return fromText ? 2 : 1;
  return fromText ? 5 : 2;
}

export type CharmOutcome = 'works' | 'fatigue' | 'fails';

/** At or above the level it works; up to 10 below it works and costs a Fatigue level; further below it fails, and still costs one. */
export function charmOutcome(total: number, level: number): CharmOutcome {
  if (total >= level) return 'works';
  if (total >= level - 10) return 'fatigue';
  return 'fails';
}

/** Can the magician cast this way? Laboratory Magician casts only from texts, No Text Casting never from them; reading needs Artes Liberales 1. */
export function canCast(c: Character, d: DerivedCharacter, fromText: boolean): string | undefined {
  if (fromText && has(c, 'no-text-casting-flaw')) return 'No Text Casting: this magician cannot cast from a text.';
  if (!fromText && has(c, 'laboratory-magician-flaw')) return 'Laboratory Magician: this magician casts only from a text.';
  if (fromText && score(d, 'artes-liberales') < 1) return 'Casting from a text needs Artes Liberales 1.';
  return undefined;
}

/** Latin, the language charms are written in. */
export const charmLanguage = (c: Character, d: DerivedCharacter) => languageScore(c, d, 'Latin');

/** Finding a charm in the formularies: Intelligence + Latin against 9, +1 for each formulary past the first; ten minutes, and ten more for each point short. */
export function formularySearch(c: Character, d: DerivedCharacter, formularies = 1): { total: number; ease: number } {
  return { total: d.characteristics.Int.value + charmLanguage(c, d), ease: 9 + Math.max(0, formularies - 1) };
}

/** Reading a charm: two minutes a magnitude, twice that below Latin 4, four times at 2 or less; a botch die for each point of Latin below 5. */
export function readingCharm(level: number, latin: number): { minutes: number; botch: number } {
  const mags = Math.max(1, Math.ceil(level / 5));
  const mult = latin <= 2 ? 4 : latin < 4 ? 2 : 1;
  return { minutes: 2 * mags * mult, botch: Math.max(0, 5 - latin) };
}

const REALM_LORE: Record<Exclude<Realm, 'None'>, string> = { Magic: 'magic-lore', Faerie: 'faerie-lore', Divine: 'dominion-lore', Infernal: 'infernal-lore' };

/** The realms a magician may call on: all four with Entreat the Powers, or the one realm of Entreat the (Realm) Powers. */
export function entreatRealms(c: Character): Exclude<Realm, 'None'>[] {
  if (has(c, 'entreat-the-powers')) return ['Magic', 'Faerie', 'Divine', 'Infernal'];
  const one = c.virtues.filter((v) => v.defId === 'entreat-the-realm-powers').map((v) => v.param as Exclude<Realm, 'None'>).filter((r) => r in REALM_LORE);
  return [...new Set(one)];
}

/**
 * Entreat the Powers: stress die + Presence + (Realm) Lore of each realm called, divided by the aura
 * when the aura's own realm is not among them; it offsets the aura's penalty and no more.
 */
export function entreatTotal(d: DerivedCharacter, called: Exclude<Realm, 'None'>[], aura: AuraState | undefined, die: number): { raw: number; offset: number; extraBotch: number; parts: Part[]; text: string } {
  const parts: Part[] = [{ label: 'Presence', value: d.characteristics.Pre.value }];
  for (const r of called) parts.push({ label: `${r === 'Divine' ? 'Dominion' : r} Lore`, value: score(d, REALM_LORE[r]) });
  const raw = die + parts.reduce((s, p) => s + p.value, 0);
  const penalty = Math.min(0, learnedAura(aura).mod);
  const strength = aura?.strength ?? 0;
  const own = !!aura && aura.realm !== 'None' && called.includes(aura.realm as Exclude<Realm, 'None'>);
  const divided = !own && strength > 0 ? Math.floor(raw / strength) : raw;
  const offset = Math.min(-penalty, Math.max(0, divided));
  const text = !penalty
    ? 'No hostile aura here: entreaty does nothing.'
    : `${raw}${own ? '' : ` ÷ ${strength} (the aura’s realm is not called) = ${divided}`}, offsetting ${offset} of the aura’s ${penalty}.`;
  return { raw, offset, extraBotch: called.length, parts, text };
}

/** Natural Magician: Philosophiae offsets a Divine or Infernal aura's penalty in season-long work, and no more. */
export function naturalMagicianOffset(c: Character, d: DerivedCharacter, aura: AuraState | undefined, already = 0): number {
  if (!has(c, 'natural-magician') || !aura || (aura.realm !== 'Divine' && aura.realm !== 'Infernal')) return 0;
  const penalty = -Math.min(0, learnedAura(aura).mod);
  return Math.max(0, Math.min(score(d, 'philosophiae'), penalty - already));
}

/** The botch dice of a charm: one, the aura's, a die for each realm entreated, and from a text one for each point of Latin below 5 (vis adds as for magi). */
export function charmBotchDice(o: { auraBotch: number; realms: number; fromText: boolean; latin: number; vis?: number }): number {
  return 1 + o.auraBotch + o.realms + (o.fromText ? Math.max(0, 5 - o.latin) : 0) + (o.vis ?? 0);
}

/** A double botch brings intervention, a single one for the Intervention Prone. */
export const interventionFollows = (c: Pick<Character, 'virtues'>, botches: number) => botches >= 2 || (botches >= 1 && has(c, 'intervention-prone-flaw'));

/** Avoiding intervention: Intelligence + Concentration + Magicam / 5 + stress die, against Warping Score + the points just gained + the aura + stress die. */
export function interventionAvoid(d: DerivedCharacter, warpingScore: number, gained: number, aura: AuraState | undefined): { total: number; against: number; parts: Part[] } {
  const parts: Part[] = [
    { label: 'Intelligence', value: d.characteristics.Int.value },
    { label: 'Concentration', value: score(d, 'concentration') },
    { label: 'Magicam ÷ 5', value: Math.floor(score(d, 'magicam') / 5) },
  ];
  return { total: parts.reduce((s, p) => s + p.value, 0), against: warpingScore + gained + (aura && aura.realm !== 'None' ? aura.strength : 0), parts };
}

export const INTERVENTION_BOONS = 'Boons: 2 experience points a Warping Point gained to the realm’s Lore or to the Form, or the Student of (Realm) Virtue.';
export const INTERVENTION_PUNISHMENTS = 'Punishments: Susceptibility to (Realm) Power (Warped Magic or Weird Magic for the Magic realm), Deleterious Circumstances, or Plagued by Supernatural Entity.';

// ------------------------------------------------------------------------------------------------
// Design

/** A charm's or device's level from its base and parameters (each magnitude as for Hermetic spells). */
export function learnedLevel(base: number, params: { range: string; duration: string; target: string; extra?: number }, device: boolean): { level: number; magnitude: number; design: string } {
  const set = device ? DEVICE_PARAMS : CHARM_PARAMS;
  const find = (list: LearnedParam[], name: string) => list.find((p) => p.name === name)?.magnitude ?? 0;
  const parts = [`Base ${base}`];
  let mags = 0;
  const add = (n: number, label: string) => {
    if (!n) return;
    mags += n;
    parts.push(`+${n} ${label}`);
  };
  add(find(set.ranges, params.range), params.range);
  add(find(set.durations, params.duration), params.duration);
  add(find(set.targets, params.target), params.target);
  add(params.extra ?? 0, 'more');
  const level = addMagnitudes(base, mags);
  return { level, magnitude: Math.max(1, Math.ceil(level / 5)), design: `(${parts.join(', ')})` };
}

// ------------------------------------------------------------------------------------------------
// The laboratory: chartae and amulets, charms invented and learned

export type DeviceKind = 'amulet' | 'charta' | 'charm';
export type Horoscope = 'none' | 'daily' | 'nativity';

/** A nativity horoscope's +10 holds only for an Individual, Group or Bloodline Target. */
export const nativityApplies = (target: string) => ['Individual', 'Group', 'Bloodline'].includes(target);

/** Casting a horoscope: Intelligence + Artes Liberales (astronomy) against 6 for the day (an hour), 9 for the nativity (a day's work, the place and time of birth known). */
export function horoscopeRoll(d: DerivedCharacter, kind: Exclude<Horoscope, 'none'>): { total: number; ease: number } {
  return { total: d.characteristics.Int.value + liberalArt(d, 'astronomy'), ease: kind === 'nativity' ? 9 : 6 };
}

/** Lab Total: Technique + Form + Intelligence + Artes Liberales + aura, the horoscope, Strong Amulet Magic and the Weak Flaws, a similar charm and other bonuses. */
export function learnedLabTotal(
  c: Character,
  d: DerivedCharacter,
  tf: LearnedArts,
  aura: AuraState | undefined,
  o: { kind: DeviceKind; horoscope?: Horoscope; target?: string; similar?: number; other?: number; offset?: number } = { kind: 'amulet' },
): LearnedTotal {
  const { t, f } = artScore(c, d, tf);
  const notes: string[] = [];
  if (!t || !f) notes.push('The magician lacks this Technique or Form.');
  const a = learnedAura(aura);
  const parts: Part[] = [
    { label: t?.name ?? tf.slice(0, 2), value: t?.score ?? 0 },
    { label: f?.name ?? tf.slice(2), value: f?.score ?? 0 },
    { label: 'Intelligence', value: d.characteristics.Int.value },
    { label: 'Artes Liberales', value: score(d, 'artes-liberales') },
  ];
  if (a.mod) parts.push({ label: a.note ?? 'Magic aura', value: a.mod });
  if (o.kind !== 'charm') {
    if (o.horoscope === 'daily') parts.push({ label: 'A daily horoscope', value: 5 });
    if (o.horoscope === 'nativity') {
      if (nativityApplies(o.target ?? 'Individual')) parts.push({ label: 'A nativity horoscope', value: 10 });
      else {
        parts.push({ label: 'A nativity horoscope (as a daily one: the Target is too wide)', value: 5 });
        notes.push('A nativity horoscope adds +10 only for an Individual, Group or Bloodline Target.');
      }
    }
    if (has(c, 'strong-amulet-magic')) parts.push({ label: 'Strong Amulet Magic', value: 10 });
    if (o.kind === 'amulet' && has(c, 'weak-amulets-flaw')) parts.push({ label: 'Weak Amulets', value: -5 });
    if (o.kind === 'charta' && has(c, 'weak-chartae-flaw')) parts.push({ label: 'Weak Chartae', value: -5 });
    if (o.kind === 'amulet' && has(c, 'charm-magician-flaw')) notes.push('Charm Magician: this magician makes no amulets.');
    if (o.kind === 'charta' && has(c, 'no-chartae-making-flaw')) notes.push('No Chartae Making: this magician makes no chartae.');
  }
  if (score(d, 'artes-liberales') < 1 && o.kind !== 'charm') notes.push('Amulets and chartae need Artes Liberales 1.');
  if (o.similar) parts.push({ label: 'A similar charm (its magnitude)', value: o.similar });
  if (o.offset) parts.push({ label: 'Entreating the powers', value: o.offset });
  if (o.other) parts.push({ label: 'Other bonuses', value: o.other });
  return { total: parts.reduce((s, p) => s + p.value, 0), parts, notes, auraBotch: a.botch };
}

/** An amulet's charges: one for every 5 points, or part of 5, the Lab Total beats its level by. */
export const amuletCharges = (labTotal: number, level: number) => (labTotal > level ? Math.ceil((labTotal - level) / 5) : 0);

/** A charta works when half the Lab Total reaches its level. */
export const chartaWorks = (labTotal: number, level: number) => labTotal / 2 >= level;

/** A charta's time: the horoscope (an hour for the day, a day for a nativity) and an hour a magnitude. */
export function chartaTime(level: number, horoscope: Horoscope): string {
  const mags = Math.max(1, Math.ceil(level / 5));
  if (horoscope === 'nativity') return `a day for the nativity horoscope and ${mags} hour${mags === 1 ? '' : 's'}`;
  return `${(horoscope === 'daily' ? 1 : 0) + mags} hour${(horoscope === 'daily' ? 1 : 0) + mags === 1 ? '' : 's'}`;
}

/** A season inventing a charm: the Lab Total × 5 less its level, gathered until the points reach the level (as ArM5 spells). */
export const inventGain = (labTotal: number, level: number) => Math.max(0, 5 * labTotal - level);

/** A season with a teacher: charms up to the teacher's Lab Total in their Arts × 5 in all. */
export const learnFromTeacher = (teacherLabTotal: number) => 5 * Math.max(0, teacherLabTotal);

/** A season writing Laboratory Texts: Latin × 100 levels of charms, or × 20 of devices; copying, Profession (Scribe) × 300 or × 60. */
export const labTextLevels = (latin: number, scribe: number) => ({ write: 100 * latin, writeDevices: 20 * latin, copy: 300 * scribe, copyDevices: 60 * scribe });

/** A charm's experience at creation: 5 levels a point. */
export const charmXp = (levels: number) => Math.ceil(levels / 5);

// ------------------------------------------------------------------------------------------------
// A season's work

const AS_TECHNIQUE: Record<string, Technique> = { Tu: 'Re', Su: 'Cr', Vu: 'Pe' };
const AS_FORM: Record<string, Form> = { Fa: 'Vi', Ma: 'Vi', Sa: 'Co' };

/** An amulet as a charged device on the sheet: its effect kept under the nearest Hermetic Arts (Tueor as Rego, Succurro Creo, Vulnero Perdo; Fortunam and Magicam Vim, Salutem Corpus). */
export function amuletItem(name: string, e: Pick<LearnedCharm, 'tf' | 'level' | 'range' | 'duration' | 'target' | 'text'>, charges: number, creatorId?: string): EnchantedItem {
  return {
    uid: uid(), name, kind: 'charged', material: 'parchment', size: 'tiny', shapeMaterialIds: [], openedPawns: 0, charges, attunements: [], creatorId,
    notes: `An amulet of the learned magicians (${learnedArtName(e.tf as LearnedArts)}): it works only for the one it was made for, spending a charge as soon as it touches its target and another each time the Duration ends.`,
    effects: [
      {
        uid: uid(), name, technique: AS_TECHNIQUE[e.tf.slice(0, 2)] ?? 'Cr', form: AS_FORM[e.tf.slice(2)] ?? 'Vi', requisites: [], baseLevel: e.level, range: e.range, duration: e.duration, target: e.target,
        usesPerDay: '1', penetration: 0, concentration: false, effectUse: false, environmentalTrigger: false, fastTrigger: false, linkedTrigger: false, expiry: 'none', modifiedLevel: e.level, description: e.text,
      },
    ],
  };
}

/** A season inventing the charm under way: its points, and the charm learned when they reach its level. */
export function inventSeason(c: Character, labTotal: number): string {
  const inv = c.learned?.inventing;
  if (!inv) return 'No charm is being invented.';
  const gain = inventGain(labTotal, inv.charm.level);
  inv.seasons += 1;
  inv.progress += gain;
  if (inv.progress >= inv.charm.level) {
    c.learned = { ...(c.learned ?? {}), charms: [...(c.learned?.charms ?? []), { ...inv.charm, source: 'play' }], inventing: undefined };
    return `${inv.charm.name} is invented (Lab Total ${labTotal} × 5 − ${inv.charm.level} = ${gain} this season).`;
  }
  return gain ? `${inv.charm.name}: +${gain} (${inv.progress} of ${inv.charm.level}).` : `${inv.charm.name}: the Lab Total × 5 (${5 * labTotal}) does not beat its level ${inv.charm.level}; nothing gained.`;
}
