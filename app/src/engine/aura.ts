// A covenant's aura and how it changes (DE, Realm Auras; Covenants, the Site Boons and Hooks;
// Realms of Power: Magic, Aura Variation Rules). The aura as it stands is the strength set for the
// covenant with its Aura Boons, a Weak Aura, a Missing Aura, a Flickering Aura's missed year and any
// change that lasts a season. A Magic aura can drift from year to year: the covenant's magic, vis
// spent in it, vis extracted from it, and neighbouring auras give a yearly aura modifier, and one
// of 4 or more either way calls for a roll on the Aura Strengthening or Weakening Table. Repeated
// rolls of 9 or more build up botch dice, and a botch fractures the aura into a regio (or loses a
// level of one). A Dominion grows with its congregation's years of worship and fades when it stops
// (Realms of Power: The Divine); an aligned Magic aura counts double for its Art or heals, and an
// Infernal one hinders recovery (Realms of Power: Magic, The Infernal).

import { ART_NAMES, type Art } from '../data';
import type { AuraState, Realm } from './magic';
import type { Part } from './magic';
import { defaultRng, describeStress, simpleDie, stressDie, type Rng } from './dice';
import type { AuraAlignment, AuraTrack, Character, Covenant, Season } from './types';
import { addVis, takeVis, visText } from './vis';
import { uid } from '../util/id';

const hasHook = (cov: Covenant, re: RegExp) => cov.hooksBoons.some((h) => h.kind === 'hook' && re.test(h.name));

/** The aura as it stands, and how it is made up. */
export function auraOf(cov: Covenant): { realm: Exclude<Realm, 'None'>; strength: number; parts: Part[]; notes: string[]; aligned?: Art; aspect?: AuraState['aspect'] } {
  const parts: Part[] = [{ label: 'Aura', value: cov.aura }];
  const notes: string[] = [];
  const boons = cov.hooksBoons.filter((h) => h.kind === 'boon' && h.size === 'Minor' && /^aura$/i.test(h.name)).length;
  if (boons) parts.push({ label: `Aura Boon${boons > 1 ? ` ×${boons}` : ''}`, value: boons });
  if (hasHook(cov, /^weak aura$/i)) parts.push({ label: 'Weak Aura Hook', value: -1 });
  const t = cov.auraTrack;
  if (t?.flickerYear !== undefined) parts.push({ label: `Flickering Aura: the task missed in ${t.flickerYear}`, value: -1 });
  if (t?.temp) parts.push({ label: `For ${t.temp.season} ${t.temp.year} only`, value: t.temp.delta });
  let strength = Math.max(0, Math.min(10, parts.reduce((s, p) => s + p.value, 0)));
  if (hasHook(cov, /^missing aura$/i)) {
    notes.push('Missing Aura: the covenant has no aura to work in.');
    strength = 0;
  }
  const realm = hasHook(cov, /^faerie aura$/i) ? 'Faerie' : cov.auraRealm;
  if (realm !== cov.auraRealm) notes.push('Faerie Aura: the covenant’s aura is Faerie, not Magic.');
  // only a Magic aura is aligned (RoP: Magic)
  const al = realm === 'Magic' && strength > 0 ? cov.auraAlignment : undefined;
  if (al) notes.push(alignmentText(al, strength));
  const aligned = al?.kind === 'art' ? al.art : undefined;
  const aspect = al && al.kind !== 'art' && al.kind !== 'other' ? al.kind : undefined;
  return { realm, strength, parts, notes, ...(aligned ? { aligned } : {}), ...(aspect ? { aspect } : {}) };
}

/** What an aligned aura does at this strength (RoP: Magic, Aligned Auras). */
export function alignmentText(al: AuraAlignment, strength: number): string {
  switch (al.kind) {
    case 'art':
      return al.art
        ? `Aligned with ${ART_NAMES[al.art]}: the aura counts double for Casting Scores and Lab Totals that use ${ART_NAMES[al.art]} (+${strength} more), and a creature of that Form spends a Might Point less on a Power; no penalty to the opposed Art.`
        : 'Aligned with an Art: choose which.';
    case 'healing':
      return `Healing: +${Math.ceil(strength / 2)} to Recovery Totals for wounds and disease (half the aura, rounded up).`;
    case 'luck':
      return `Luck: at the storyguide’s discretion +${strength >= 9 ? 3 : strength >= 5 ? 2 : 1} to rolls where luck plays a part, for everyone in it.`;
    case 'distracting':
      return `Distracting: concentration rolls come more often${strength >= 5 ? ', at Ease Factors 3 higher' : ''}.`;
    case 'emotion':
      return `${al.text?.trim() || 'An emotion'}: +${emotionBonus(strength)} to that Personality Trait (or a new one) for the unGifted in it, while they stay.`;
    default:
      return al.text?.trim() ? `Aligned: ${al.text.trim()}.` : 'Aligned with something the troupe describes.';
  }
}

/** An emotion-enhancing aura's Personality Trait adjustment (RoP: Magic, Aura Effect Table). */
export function emotionBonus(strength: number): number {
  return strength >= 7 ? 3 : strength >= 4 ? 2 : 1;
}

/**
 * What the aura does to Recovery Totals: a Healing aura adds half its strength (rounded up); a
 * dominant Infernal aura takes its strength off wounds, disease and deprivation, and no disease
 * tended there improves: Improvement counts as Stable (RoP: Magic; RoP: The Infernal).
 */
export function auraRecovery(aura: AuraState | undefined): { parts: Part[]; noImprovement: boolean } {
  if (!aura || aura.strength <= 0) return { parts: [], noImprovement: false };
  if (aura.realm === 'Magic' && aura.aspect === 'healing') return { parts: [{ label: `Healing aura ${aura.strength}`, value: Math.ceil(aura.strength / 2) }], noImprovement: false };
  if (aura.realm === 'Infernal') return { parts: [{ label: `Infernal aura ${aura.strength}: wounds fester`, value: -aura.strength }], noImprovement: true };
  return { parts: [], noImprovement: false };
}

type Dominion = NonNullable<AuraTrack['dominion']>;

/**
 * The Dominion a congregation keeps (RoP: The Divine, Dominion Auras): 3 from the rite, 4 after a
 * year of regular worship, 5 after a decade for a large congregation in a significant church, and a
 * point for each Faith Point a relic has over five. When worship stops it fades steadily, to nothing
 * over as long as the place was worshipped in.
 */
export function dominionStrength(w: Dominion, year: number): number {
  const level = (years: number) => Math.min(10, (years >= 10 && w.significant ? 5 : years >= 1 ? 4 : 3) + (w.relics ?? 0));
  if (w.until === undefined || year <= w.until) return level(Math.max(0, year - w.since));
  const kept = w.until - w.since;
  if (kept <= 0) return 0;
  const peak = level(kept);
  return Math.max(0, peak - Math.floor(((year - w.until) * peak) / kept));
}

/** What the Dominion does next, in a line: when it next grows, or how it fades. */
export function dominionOutlook(w: Dominion, year: number): string {
  const now = dominionStrength(w, year);
  if (w.until !== undefined) {
    const kept = w.until - w.since;
    return now ? `Worship stopped in ${w.until} after ${kept} year${kept === 1 ? '' : 's'}: the Dominion fades steadily, to nothing by ${w.until + kept}.` : 'The Dominion has faded.';
  }
  const years = year - w.since;
  if (years < 1) return `A year of regular worship makes it 4 (in ${w.since + 1}).`;
  if (years < 10 && w.significant) return `A decade of worship makes it 5 (in ${w.since + 10}), the congregation large and the church significant.`;
  return w.significant || years >= 10 ? 'It stays while the congregation worships regularly.' : 'It grows to 5 only for a large congregation in a significant church, after a decade.';
}

/** At the year's end a Dominion follows its congregation: grown with years of worship, or fading when it stopped. */
export function dominionYearEnd(cov: Covenant, year: number): string | undefined {
  const w = cov.auraTrack?.dominion;
  if (!w || auraOf(cov).realm !== 'Divine') return undefined;
  const next = dominionStrength(w, year + 1);
  if (next === cov.aura) return undefined;
  const text =
    next > cov.aura
      ? `The Dominion grows to ${next}: ${next - (w.relics ?? 0) >= 5 ? 'a decade of worship by a large congregation in a significant church' : 'a year of regular worship'}.`
      : `The Dominion fades to ${next}: worship stopped in ${w.until}.`;
  changeAura(cov, next - cov.aura, text, year, 'Winter');
  return text;
}

/** A change to the aura from the story, a ritual or the table, kept in its history. */
export function changeAura(cov: Covenant, delta: number, text: string, year: number, season?: Season): void {
  if (delta) cov.aura = Math.max(0, Math.min(10, cov.aura + delta));
  cov.auraLog = [...(cov.auraLog ?? []), { uid: uid(), year, season, delta, text }].slice(-60);
}

export function newAuraTrack(cov: Covenant): AuraTrack {
  return { base: auraOf({ ...cov, auraTrack: undefined }).strength, botchDice: 0, latent: 0, impinging: [], notes: [] };
}

/** The aura before a season's or a missed task's change: what the yearly modifier compares with the base. */
function currentScore(cov: Covenant): number {
  return auraOf({ ...cov, auraTrack: cov.auraTrack ? { ...cov.auraTrack, temp: undefined, flickerYear: undefined } : undefined }).strength;
}

const IMPINGE: Record<string, number> = { Magic: 2, Faerie: 1, Divine: -6, Infernal: -2 };
const ACTIVITY: Record<Covenant['season'], number> = { Spring: 1, Summer: 2, Autumn: 3, Winter: 3 };

/**
 * The year's aura modifier (RoP: Magic): the pull back toward the base aura, stronger auras that
 * impinge, the covenant's magic by its season, every spending of three or more pawns of vis in
 * study or spellcasting, every season of vis extraction, last year's latent change, and what the
 * storyguide noted. Between −9 and +9.
 */
export function yearlyAuraModifier(cov: Covenant, members: Character[], year: number): { total: number; parts: Part[] } {
  const t = cov.auraTrack ?? newAuraTrack(cov);
  const parts: Part[] = [];
  const base = t.base ?? currentScore(cov);
  const cur = currentScore(cov);
  if (base !== cur) parts.push({ label: `Back toward the base aura ${base} (3 × ${base - cur})`, value: 3 * (base - cur) });
  for (const r of t.impinging) parts.push({ label: `A stronger ${r} aura impinges`, value: IMPINGE[r] ?? 0 });
  parts.push({ label: `The magic of a ${cov.season} covenant`, value: ACTIVITY[cov.season] });
  const logs = members.flatMap((m) => m.seasonLog.filter((e) => e.year === year));
  const visSpent = logs.filter((e) => (e.visUsed ?? []).reduce((s, v) => s + v.pawns, 0) >= 3).length;
  const casts = (cov.casts ?? []).filter((c) => c.year === year && c.paid.vis.reduce((s, v) => s + v.pawns, 0) >= 3).length;
  const rituals = t.visRituals?.year === year ? t.visRituals.n : 0;
  const spent = visSpent + casts + rituals;
  if (spent) parts.push({ label: `Vis spent in the aura, three pawns or more at a time (${spent})`, value: spent });
  const extracted = logs.filter((e) => e.labKind === 'extract').length;
  if (extracted) parts.push({ label: `Seasons of vis extraction (${extracted})`, value: -extracted });
  if (t.latent) parts.push({ label: 'Latent change from last year', value: t.latent });
  for (const n of t.notes.filter((x) => x.year === year)) parts.push({ label: n.label, value: n.value });
  const total = Math.max(-9, Math.min(9, parts.reduce((s, p) => s + p.value, 0)));
  return { total, parts };
}

export interface AuraRoll {
  lines: string[];
  /** the permanent change to the aura */
  delta: number;
  /** Warping Points for everyone in the aura (a regio level appears or vanishes) */
  warping: number;
}

/**
 * The year's roll, if the modifier calls for one, applied to the covenant: botch dice built up or
 * eased, a permanent or seasonal change, a latent change for next year, vis made or wasted, and
 * what the storyguide describes (spontaneous magic, patches, the aura's extent, a regio). The
 * Warping Points for those in the aura are left to the caller.
 */
export function rollAuraYear(cov: Covenant, mod: number, year: number, rng: Rng = defaultRng): AuraRoll {
  const t = (cov.auraTrack ??= newAuraTrack(cov));
  t.latent = 0;
  const out: AuraRoll = { lines: [], delta: 0, warping: 0 };
  if (Math.abs(mod) < 4) {
    if (t.botchDice) t.botchDice -= 1;
    out.lines.push(`Aura modifier ${mod >= 0 ? '+' : ''}${mod}: the aura is stable${t.botchDice ? ` (botch dice now ${t.botchDice})` : ''}.`);
    return out;
  }
  const up = mod > 0;
  const table = up ? 'Aura Strengthening Table' : 'Aura Weakening Table';
  const next: Season = 'Spring';
  const roll = (depth: number) => {
    const r = stressDie(t.botchDice, rng);
    if (r.botches) {
      out.warping += 3 * r.botches;
      out.lines.push(
        `${table}: ${describeStress(r)}. ${up ? 'A regio level appears: the aura fractures (a mundane level and a level of its full strength, or a new level in an existing regio).' : 'A regio level disappears (or, without a regio, everything retreats into a new magical level and the mundane level is left bare).'} Everyone in the aura gains ${3 * r.botches} Warping Points${r.botches > 1 ? ', and it happens in the most troublesome way' : ''}.`,
      );
      return;
    }
    const total = Math.min(depth ? 20 : Infinity, r.value + Math.abs(mod));
    if (total >= 9) t.botchDice += 1;
    const head = `${table}: ${describeStress(r)} + ${Math.abs(mod)} = ${total}.`;
    const sym = total >= 7 ? ` Signs of the aura ${up ? 'strengthening' : 'weakening'} are noticed.` : '';
    if (total <= 6) out.lines.push(`${head} No change to the aura.`);
    else if (total <= 8) out.lines.push(`${head}${sym}`);
    else if (total === 9) {
      t.latent += up ? 3 : -3;
      out.lines.push(`${head}${sym} A latent ${up ? 'strengthening' : 'weakening'}: ${up ? '+3' : '−3'} to next year's modifier.`);
    } else if (total === 10) {
      t.spontaneous = { year: year + 1, bonus: up ? 3 : -3 };
      out.lines.push(`${head}${sym} ${up ? 'Spontaneous magic effects appear (anyone they target gains a Warping Point); spontaneous Casting Totals up to +3' : 'Spontaneous magic is stifled: spontaneous Casting Totals up to −3'} for a year.`);
    } else if (total === 11) {
      t.temp = { delta: up ? 1 : -1, year: year + 1, season: next };
      out.lines.push(`${head}${sym} The aura is ${up ? 'one higher' : 'one lower'} for ${next} ${year + 1}.`);
    } else if (total === 12) {
      const n = Math.ceil(simpleDie(rng).value / 3.4);
      if (up) {
        addVis(cov.visStocks, 'Vi', n);
        out.lines.push(`${head}${sym} ${n} pawn${n > 1 ? 's' : ''} of vis manifest in the aura (added to the stocks as Vim; the storyguide may say another Art).`);
      } else {
        const lost = takeVis(cov.visStocks, ['Cr', 'In', 'Mu', 'Pe', 'Re', 'An', 'Aq', 'Au', 'Co', 'He', 'Ig', 'Im', 'Me', 'Te', 'Vi'], Math.min(n, cov.visStocks.filter((s) => !s.pair).reduce((s, v) => s + v.pawns, 0)));
        out.lines.push(`${head}${sym} ${n} pawn${n > 1 ? 's' : ''} of vis in the aura waste away${lost.taken.length ? ` (${visText(lost.taken)} from the stocks)` : ''}.`);
      }
    } else if (total === 13) out.lines.push(`${head}${sym} A patch of the aura (a chamber, a laboratory) is one ${up ? 'stronger; any mundane folk living there gain a Warping Point' : 'weaker'}.`);
    else if (total === 14) out.lines.push(`${head}${sym} The aura ${up ? 'expands' : 'contracts'} by several yards, for good.`);
    else if (total <= 20) {
      out.delta += up ? 1 : -1;
      out.lines.push(`${head}${sym} The aura ${up ? 'rises' : 'falls'} by one, for good.`);
    } else {
      out.lines.push(`${head} Roll twice more.`);
      if (depth < 3) {
        roll(depth + 1);
        roll(depth + 1);
      }
    }
  };
  roll(0);
  return out;
}

/**
 * Rituals of three or more pawns cast in the aura count toward the year's modifier; the clock
 * records those it casts itself (wards renewed each year).
 */
export function noteVisRitual(cov: Covenant, year: number, pawns: number): void {
  if (pawns < 3 || !cov.auraTrack) return;
  const v = cov.auraTrack.visRituals;
  cov.auraTrack.visRituals = { year, n: v?.year === year ? v.n + 1 : 1 };
}

/** Divine and Infernal auras by the hour: the Dominion is weaker at night and stronger on holy days, an Infernal aura stronger at night (DE; RoP: The Divine, The Infernal). */
export type AuraTime = 'day' | 'night' | 'holy';
export function auraAtTime<T extends { realm: Realm; strength: number }>(a: T, when: AuraTime): T & { timeNote?: string } {
  if (a.realm === 'Divine' && when === 'night') return { ...a, strength: Math.max(0, a.strength - 1), timeNote: 'Divine aura, at night: −1' };
  if (a.realm === 'Divine' && when === 'holy') return { ...a, strength: Math.min(10, a.strength + 1), timeNote: 'Divine aura, on a holy day: +1' };
  if (a.realm === 'Infernal' && when === 'night') return { ...a, strength: Math.min(10, a.strength + 1), timeNote: 'Infernal aura, at night: +1' };
  return a;
}
