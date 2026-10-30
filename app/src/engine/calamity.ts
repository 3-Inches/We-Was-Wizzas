// Calamities: what can strike a covenant, by nature, by the realms or by another's hand (seven plagues
// sent by a rival, a dragon, a faerie court's displeasure, a church raised next door, a noble's
// lawsuit). Each lands at once (covenfolk lost, loyalty, repairs, books, laboratories, vis and silver
// taken, the aura) and leaves a trouble that weighs on the covenant for a few years (its income cut, a
// vis source closed) until it passes or the magi put it right. The loyalty lost follows the book's
// Local Events (Covenants ch.4: minor hardship 1 … devastating event 15).
//
// A living covenant struck by the players' hand, and knowing it, turns against them; one in trouble
// sends its magi to deal with it (a service season), rebuilds as its means allow, and hires new
// covenfolk to replace those lost.

import { changeAura } from './aura';
import { defaultRng, type Rng } from './dice';
import { takeVis, visText } from './vis';
import type { Character, Covenant, CovenfolkCounts, Season, Trouble } from './types';
import { uid } from '../util/id';

export type Severity = 1 | 2 | 3;
export const SEVERITY_LABEL: Record<Severity, string> = { 1: 'minor', 2: 'major', 3: 'devastating' };

type By3 = [number, number, number];

export interface CalamityDef {
  id: string;
  label: string;
  /** what it is, in a line */
  text: string;
  /** what the magi do about it in a service season */
  remedy: string;
  /** the share of the covenfolk lost (dead, taken or fled) */
  folk?: By3;
  /** loyalty points lost (Local Events) */
  loyalty?: By3;
  /** what the income falls to while it lasts, and for how many years */
  income?: By3;
  years?: By3;
  /** pounds to rebuild, this year */
  repair?: By3;
  /** the share of the library lost */
  books?: By3;
  /** laboratories damaged (they take the Decaying Flaw) */
  labs?: By3;
  /** the share of the vis stores and the treasury taken */
  vis?: By3;
  treasury?: By3;
  /** vis sources closed while it lasts */
  visSources?: By3;
  /** pawns of vis paid as a fine */
  fine?: By3;
  /** the aura's change, for good */
  aura?: By3;
  /** characters of the covenant hurt (grogs and companions first; a magus at the worst) */
  wounds?: By3;
  /** the share of the turb's weapons and armor lost */
  arms?: By3;
}

export const CALAMITIES: CalamityDef[] = [
  { id: 'plague', label: 'Plague', text: 'Sickness sweeps through the covenfolk and the lands around.', remedy: 'tends the sick', folk: [0.1, 0.25, 0.5], loyalty: [6, 9, 15], income: [0.8, 0.5, 0.5], years: [1, 2, 3], wounds: [1, 2, 4] },
  { id: 'plagues', label: 'Plagues upon the land (blood, frogs, lice, flies, boils, hail, locusts, darkness)', text: 'Plague after plague, as on Egypt: water turns foul, beasts sicken, hail and locusts strip the fields, and boils and darkness fall on the people.', remedy: 'works to lift the plagues', folk: [0.1, 0.25, 0.5], loyalty: [9, 12, 15], income: [0.5, 0.3, 0.1], years: [1, 2, 3], repair: [10, 40, 100], visSources: [1, 1, 2], wounds: [1, 3, 5] },
  { id: 'famine', label: 'Blight and famine', text: 'The crops fail; the stores run thin; the weak and old die.', remedy: 'saves what can be saved of the harvest', folk: [0, 0.05, 0.15], loyalty: [3, 9, 12], income: [0.8, 0.5, 0.3], years: [1, 2, 3] },
  { id: 'fire', label: 'Fire', text: 'Fire takes buildings, books and laboratories.', remedy: 'rebuilds what burned', folk: [0, 0.02, 0.05], loyalty: [1, 3, 6], repair: [20, 60, 150], books: [0.1, 0.25, 0.5], labs: [0, 1, 2], years: [1, 1, 1] },
  { id: 'flood', label: 'Flood, storm or earthquake', text: 'Water, wind or the earth itself ruins buildings and fields.', remedy: 'rebuilds and drains the fields', folk: [0, 0.03, 0.1], loyalty: [1, 6, 12], repair: [20, 60, 150], income: [0.8, 0.6, 0.4], years: [1, 1, 2], labs: [0, 0, 1] },
  { id: 'monster', label: 'A monster or magical beast', text: 'A creature of Might ravages the lands, kills the herds and attacks the covenant.', remedy: 'hunts the creature', folk: [0.03, 0.08, 0.2], loyalty: [3, 6, 12], repair: [10, 40, 100], income: [0.9, 0.8, 0.5], years: [1, 1, 2], visSources: [0, 1, 1], wounds: [1, 3, 5] },
  { id: 'faerie', label: 'Faerie displeasure', text: 'The fair folk take offence: covenfolk are taken, glamours lead men astray, fields will not grow and a vis source is closed to the magi.', remedy: 'treats with the faeries', folk: [0.02, 0.05, 0.1], loyalty: [1, 3, 6], income: [0.9, 0.8, 0.6], years: [1, 2, 3], visSources: [1, 1, 2] },
  { id: 'divine', label: 'The Church against the covenant', text: 'A church is raised nearby, a preacher rouses the people, or a bishop moves against the wizards: the Dominion encroaches and pious covenfolk leave.', remedy: 'makes peace with the clergy', folk: [0.05, 0.1, 0.2], loyalty: [3, 6, 9], income: [1, 0.9, 0.8], years: [2, 3, 5], aura: [-1, -1, -2] },
  { id: 'infernal', label: 'Infernal corruption', text: 'A demon works among the covenfolk: sin, despair, quarrels, possession.', remedy: 'drives out the demon', folk: [0.02, 0.05, 0.1], loyalty: [6, 9, 15], years: [1, 2, 3], wounds: [0, 1, 2] },
  { id: 'raid', label: 'Raid or war', text: 'Soldiers or bandits fall on the covenant’s lands and stores.', remedy: 'drives off the raiders', folk: [0.03, 0.08, 0.15], loyalty: [3, 6, 12], repair: [10, 40, 100], income: [0.8, 0.6, 0.4], years: [1, 1, 2], treasury: [0.2, 0.4, 0.7], arms: [0.1, 0.25, 0.5], wounds: [1, 3, 5] },
  { id: 'theft', label: 'Theft of vis and treasure', text: 'Someone slips past the Aegis and the guards: vis and silver are gone.', remedy: 'hunts the thief', vis: [0.2, 0.5, 0.9], treasury: [0.1, 0.2, 0.4], years: [0, 0, 0] },
  { id: 'politics', label: 'Hermetic politics', text: 'A Tribunal ruling or a powerful rival: a fine in vis, and a vis source taken under the Code.', remedy: 'argues the covenant’s case', fine: [5, 10, 20], visSources: [1, 1, 2], years: [2, 3, 7] },
  { id: 'noble', label: 'A hostile noble or bishop', text: 'Tolls, seizures and lawsuits strike at the covenant’s income.', remedy: 'works the courts and the nobles', loyalty: [1, 3, 6], income: [0.8, 0.5, 0.3], years: [2, 3, 5] },
];
export const CALAMITY_BY_ID = new Map(CALAMITIES.map((c) => [c.id, c]));

/** The kinds that strike now and then on their own (not by anyone's hand). */
const NATURAL = ['plague', 'famine', 'fire', 'flood', 'monster', 'faerie', 'divine', 'noble'];

const FOLK: (keyof CovenfolkCounts)[] = ['grogs', 'servants', 'laborers', 'teamsters', 'craftsmen', 'dependents', 'companions', 'specialists'];

export interface StrikeOptions {
  year: number;
  season: Season;
  /** who brought it about, if anyone ("Testhold", "a demon") */
  by?: string;
  /** brought about by the players' covenant */
  byPlayers?: boolean;
  /** the covenant knows (or believes) who did it */
  known?: boolean;
  rng?: Rng;
}

/**
 * A calamity strikes a covenant: its damage lands now, and a trouble stays for its years. Returns what
 * happened, in lines. Characters of the covenant (members) may be hurt.
 */
export function strike(cov: Covenant, members: Character[], kind: string, severity: Severity, o: StrikeOptions): string[] {
  const def = CALAMITY_BY_ID.get(kind);
  if (!def) return [];
  const rng = o.rng ?? defaultRng;
  const i = severity - 1;
  const at = <T extends By3 | undefined>(x: T) => (x ? x[i] : 0);
  const lines: string[] = [];
  const name = cov.name || 'The covenant';
  // covenfolk lost
  const lost: Partial<CovenfolkCounts> = {};
  const share = at(def.folk);
  if (share > 0) {
    for (const k of FOLK) {
      const n = Math.round((cov.covenfolk[k] ?? 0) * share);
      if (n > 0) {
        cov.covenfolk[k] -= n;
        lost[k] = n;
      }
    }
    const total = Object.values(lost).reduce((t, n) => t + (n ?? 0), 0);
    if (total) lines.push(`${total} of the covenfolk are lost (${Object.entries(lost).map(([k, n]) => `${n} ${k}`).join(', ')}).`);
  }
  // people of the covenant hurt
  const hurt = at(def.wounds);
  if (hurt > 0) {
    const living = members.filter((c) => !c.wounds.dead && !c.retired);
    const pool = [...living.filter((c) => c.type !== 'magus').sort(() => rng() - 0.5), ...(severity === 3 ? living.filter((c) => c.type === 'magus').sort(() => rng() - 0.5) : [])];
    const level = (['light', 'medium', 'heavy'] as const)[i];
    const who = pool.slice(0, hurt);
    for (const c of who) c.wounds[level] += 1;
    if (who.length) lines.push(`${who.map((c) => c.name).join(', ')} ${who.length > 1 ? 'are' : 'is'} hurt (a ${level[0].toUpperCase()}${level.slice(1)} Wound).`);
  }
  // loyalty
  const lp = at(def.loyalty);
  if (lp) {
    cov.loyalty.actionPoints -= lp;
    lines.push(`The covenfolk blame the magi: −${lp} loyalty points.`);
  }
  // repairs, a one-off cost this year
  const repair = at(def.repair);
  if (repair) {
    cov.finances.sundry = Math.round((cov.finances.sundry + repair) * 10) / 10;
    lines.push(`Rebuilding costs ${repair} £ this year.`);
  }
  // books
  const books = at(def.books);
  if (books && cov.library.length) {
    const n = Math.max(1, Math.round(cov.library.length * books));
    const gone = [...cov.library].sort(() => rng() - 0.5).slice(0, n);
    const ids = new Set(gone.map((b) => b.uid));
    cov.library = cov.library.filter((b) => !ids.has(b.uid));
    lines.push(`${n} book${n > 1 ? 's are' : ' is'} lost${n <= 4 ? ` (${gone.map((b) => b.title).join('; ')})` : ''}.`);
  }
  // laboratories
  const labs = at(def.labs);
  if (labs) {
    const hit = [...cov.labs].sort(() => rng() - 0.5).slice(0, labs);
    for (const lab of hit) if (!lab.virtues.some((v) => v.defId === 'decaying-flaw')) lab.virtues.push({ uid: uid(), defId: 'decaying-flaw' });
    if (hit.length) lines.push(`${hit.map((l) => l.name).join(', ')} ${hit.length > 1 ? 'are' : 'is'} damaged (Decaying, until refitted).`);
  }
  // vis taken
  const vis = at(def.vis);
  if (vis) {
    const taken = cov.visStocks.filter((v) => !v.pair).map((v) => ({ art: v.art, pawns: Math.round(v.pawns * vis) })).filter((v) => v.pawns > 0);
    for (const v of taken) takeVis(cov.visStocks, [v.art], v.pawns);
    if (taken.length) lines.push(`${visText(taken)} vis are taken.`);
  }
  const fine = at(def.fine);
  if (fine) {
    const paid = takeVis(cov.visStocks, cov.visStocks.filter((v) => !v.pair).map((v) => v.art), Math.min(fine, cov.visStocks.filter((v) => !v.pair).reduce((t, v) => t + v.pawns, 0)));
    lines.push(`A fine of ${fine} pawns of vis${paid.taken.length ? `: ${visText(paid.taken)} paid` : ''}${paid.taken.reduce((t, v) => t + v.pawns, 0) < fine ? ', the rest owed' : ''}.`);
  }
  // treasury taken
  const tre = at(def.treasury);
  if (tre && cov.finances.treasury > 0) {
    const n = Math.round(cov.finances.treasury * tre);
    cov.finances.treasury -= n;
    if (n) lines.push(`${n} £ of silver is taken.`);
  }
  // arms
  const arms = at(def.arms);
  if (arms) {
    const n = Math.round(cov.finances.weaponArmorPoints * arms);
    cov.finances.weaponArmorPoints -= n;
    if (n) lines.push(`${n} points of the turb’s weapons and armor are lost.`);
  }
  // the aura, for good
  const aura = at(def.aura);
  if (aura) {
    changeAura(cov, aura, `${def.label}: the Dominion encroaches`, o.year, o.season);
    lines.push(`The aura falls by ${-aura}.`);
  }
  // what stays: the income cut and the vis sources closed, for its years
  const years = at(def.years) || (def.income || def.visSources ? 1 : 0);
  const income = at(def.income);
  const closed = [...cov.visSources].sort(() => rng() - 0.5).slice(0, at(def.visSources)).map((s) => s.uid);
  if (closed.length) lines.push(`${closed.map((u) => cov.visSources.find((s) => s.uid === u)!.name).join(', ')} ${closed.length > 1 ? 'yield' : 'yields'} nothing while it lasts.`);
  if (income && income < 1) lines.push(`Its income falls to ${Math.round(income * 100)}% for ${years} year${years > 1 ? 's' : ''}.`);
  const t: Trouble = {
    uid: uid(), kind, label: def.label, severity, year: o.year, season: o.season, yearsLeft: years,
    incomeMult: income && income < 1 ? income : undefined, skipVis: closed.length ? closed : undefined, lost: Object.keys(lost).length ? lost : undefined,
    by: o.by, byPlayers: o.byPlayers, known: o.known, text: lines.join(' '),
  };
  cov.troubles = [...(cov.troubles ?? []), t];
  // a living covenant that knows the players did it turns against them
  if (cov.living && o.byPlayers && o.known) {
    const order = ['ally', 'friendly', 'neutral', 'wary', 'hostile', 'enemy'] as const;
    const at0 = order.indexOf(cov.living.attitude ?? 'neutral');
    const now = order[Math.min(order.length - 1, at0 + severity)];
    cov.living.attitude = now === 'neutral' ? undefined : now;
    lines.push(`${name} knows who did this: it is now ${now} toward your covenant, and may bring the matter before the Tribunal.`);
  }
  return [`${def.label} (${SEVERITY_LABEL[severity]}) strikes ${name}${o.by ? `, by ${o.by}'s hand` : ''}. ${lines.join(' ')}`.trim()];
}

/** What the covenant's troubles do to its income: the product of their cuts. */
export function troubleIncomeMult(cov: Covenant): number {
  return (cov.troubles ?? []).filter((t) => t.yearsLeft > 0 && t.incomeMult !== undefined).reduce((m, t) => m * t.incomeMult!, 1);
}

/** The vis sources a trouble has closed. */
export function troubleSkips(cov: Covenant): Set<string> {
  return new Set((cov.troubles ?? []).filter((t) => t.yearsLeft > 0).flatMap((t) => t.skipVis ?? []));
}

/** A season a magus spends dealing with a trouble: a year off what is left of it (one magus a season). */
export function faceTrouble(cov: Covenant, c: Character, troubleUid: string, year: number, season: Season): string[] {
  const t = (cov.troubles ?? []).find((x) => x.uid === troubleUid);
  if (!t || t.yearsLeft <= 0 || t.faced === `${year} ${season}`) return [];
  t.faced = `${year} ${season}`;
  t.yearsLeft -= 1;
  const def = CALAMITY_BY_ID.get(t.kind);
  if (t.yearsLeft <= 0) return [`${c.name} ${def?.remedy ?? 'deals with it'}: the ${t.label.toLowerCase()} is over.`];
  return [`${c.name} ${def?.remedy ?? 'deals with it'}: ${t.yearsLeft} year${t.yearsLeft > 1 ? 's' : ''} of it left.`];
}

/** The trouble its magi would deal with first this season: the worst still running that no one has taken on yet. */
export function worstTrouble(cov: Covenant, year: number, season: Season): Trouble | undefined {
  return [...(cov.troubles ?? [])].filter((t) => t.yearsLeft > 0 && t.faced !== `${year} ${season}`).sort((a, b) => b.severity - a.severity || b.yearsLeft - a.yearsLeft)[0];
}

/**
 * Troubles at the year's end: a year passes from each; one that ends is gone. A living covenant hires
 * new covenfolk for those lost (a third a year, while its accounts allow).
 */
export function troublesYearEnd(cov: Covenant, canHire: boolean): string[] {
  const out: string[] = [];
  for (const t of cov.troubles ?? []) {
    if (t.yearsLeft > 0) {
      t.yearsLeft -= 1;
      if (t.yearsLeft === 0) out.push(`The ${t.label.toLowerCase()} is over${t.incomeMult ? ': the income recovers' : ''}.`);
    }
    // the players hire their own people: say who is missing once, and let it go
    if (!cov.living && t.yearsLeft <= 0 && t.lost) {
      const n = Object.values(t.lost).reduce((a, k) => a + (k ?? 0), 0);
      if (n) out.push(`${n} covenfolk lost to the ${t.label.split(' (')[0].toLowerCase()} are not replaced: hire new ones on Covenfolk & Finances if the covenant can pay them.`);
      t.lost = undefined;
    }
    if (cov.living && canHire && t.lost) {
      const hired: string[] = [];
      for (const [k, n] of Object.entries(t.lost) as [keyof CovenfolkCounts, number][]) {
        const back = Math.ceil(n / 3);
        if (!back) continue;
        cov.covenfolk[k] += back;
        t.lost[k] = n - back;
        hired.push(`${back} ${k}`);
      }
      if (hired.length) out.push(`It takes on new covenfolk: ${hired.join(', ')}.`);
      if (Object.values(t.lost).every((n) => !n)) t.lost = undefined;
    }
  }
  cov.troubles = (cov.troubles ?? []).filter((t) => t.yearsLeft > 0 || t.lost);
  return out;
}

/** Now and then a calamity strikes a living covenant by itself: about one year in thirty, mostly minor. */
export function chanceCalamity(cov: Covenant, members: Character[], year: number, rng: Rng): string[] {
  if (rng() >= 1 / 30) return [];
  const kind = NATURAL[Math.floor(rng() * NATURAL.length)];
  const r = rng();
  const severity: Severity = r < 0.8 ? 1 : r < 0.97 ? 2 : 3;
  return strike(cov, members, kind, severity, { year, season: 'Winter', rng });
}
