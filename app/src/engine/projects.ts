// Laboratory projects that run season by season (DE, The Laboratory and Enchantments): inventing a
// spell, preparing an item (a talisman a little at a time), attuning a talisman, instilling an effect,
// extracting vis, and taming a creature (DE, Training Creatures). Each season of work gathers
// (Lab Total − level) points until they reach the level.

import { ART_NAMES, FORMS, TECHNIQUES, type Art, type GameData } from '../data';
import type { DerivedCharacter } from './character/derive';
import type { CharacterContext } from './context';
import { chargedItemCharges, cordPointsCost, familiarBindingLevel, familiarBindingVis, investEffect, longevityBonus, longevityVisCost, openingCost, talismanCapacity, visLimit } from './enchant';
import { labSeasonHazards, rollExperiment } from './experiment';
import { defaultRng, type Rng } from './dice';
import { labContextOf } from './lab';
import { recordRoutines, routineClash, routineParts } from './labRoutines';
import { labTotal, type LabActivity, type TotalResult } from './magic';
import type { Character, Covenant, EnchantedItem, LabProject } from './types';
import { addVis, purseOf, takeVis, visAvailable, visText } from './vis';
import { uid } from '../util/id';

export const PROJECT_KINDS: { id: LabProject['kind']; label: string; blurb: string; /** DE: may be done by experimentation */ experiment?: boolean; /** the lab work it is, for a lab's restrictions */ activity?: string }[] = [
  { id: 'invent', label: 'Invent a spell', blurb: 'Lab Total over the level; each season gathers the difference until it reaches the level. From a Laboratory Text, one season once the Lab Total reaches the level.', experiment: true, activity: 'Spells' },
  { id: 'open', label: 'Prepare an item for enchantment', blurb: 'A season and the Vim vis of its material and size; a talisman can be opened a little at a time.', activity: 'Items' },
  { id: 'attune', label: 'Attune a talisman', blurb: 'A season, whatever the Lab Total, on an item you prepared yourself.', activity: 'Items' },
  { id: 'instill', label: 'Instill an effect', blurb: 'Lab Total over the effect level (double for a lesser device); a pawn per 10 levels, paid in the first season; +5 in your own talisman.', experiment: true, activity: 'Items' },
  { id: 'extract', label: 'Extract vis', blurb: 'A pawn of Vim for every 10 points (or part) of the Creo Vim Lab Total.', activity: 'Vis Extraction' },
  { id: 'tame', label: 'Tame a creature', blurb: "Rego (Form) Lab Total with Animal Handling and Animal Ken, less the creature's Might, each season in a row, until the points reach its Might. A mundane beast counts as Might 1 + twice its Confidence.", experiment: true },
  { id: 'longevity', label: 'Longevity Ritual', blurb: 'A season: −1 on aging rolls for every 5 points (or part) of the Creo Corpus Lab Total (every 10 for a mundane), a pawn of Creo, Corpus or Vim vis for every 5 years of the subject’s age; for someone else, a Lab Total of 30 or more.', experiment: true, activity: 'Longevity Rituals' },
  { id: 'bind', label: 'Bind a familiar', blurb: 'A season: a Lab Total of at least 25 + its Might + 5 × its Size, a pawn of vis of the binding Technique or Form per 5 points of the Lab Total, and the three cords bought with the Lab Total.', experiment: true, activity: 'Familiar' },
  { id: 'strengthen', label: 'Strengthen the familiar bond', blurb: 'A season with the binding Arts: stronger cords bought with the new Lab Total, for a pawn per 5 points of it less the pawns already spent on the binding.', experiment: true, activity: 'Familiar' },
  { id: 'empower', label: 'Empower the familiar bond', blurb: 'Invest a power in the bond as in an invested device: +5 for the binding Technique or Form, +10 for both; a pawn per 10 levels.', experiment: true, activity: 'Familiar' },
  { id: 'other', label: 'Other lab work', blurb: 'Anything else: the season is recorded with its exposure experience.' },
];

export function newProject(kind: LabProject['kind']): LabProject {
  return { uid: uid(), kind, name: PROJECT_KINDS.find((k) => k.id === kind)?.label ?? 'Lab work', progress: 0, seasons: 0, visFrom: 'purse' };
}

const highest = (d: DerivedCharacter, arts: readonly Art[]) => Math.max(...arts.map((a) => d.arts[a].score));

/** How many pawns a character may handle in one season: twice Magic Theory (DE, Vis Use Limits). */
export function seasonVisLimit(d: DerivedCharacter): number {
  return visLimit(d.abilities.find((a) => a.abilityId === d.theoryAbility)?.total ?? 0);
}

export function itemOf(c: Character, p: LabProject): EnchantedItem | undefined {
  return p.itemUid ? c.items.find((i) => i.uid === p.itemUid) : undefined;
}

/** Pawns of capacity an item's effects take: a pawn for every 10 levels (or part) of each (DE, Instilling the Effect). */
export function pawnsUsed(it: EnchantedItem, exceptUid?: string): number {
  return it.effects.filter((e) => e.uid !== exceptUid).reduce((t, e) => t + Math.ceil(e.modifiedLevel / 10), 0);
}

export interface ProjectPlan {
  /** the Lab Total that applies, when there is one */
  total?: TotalResult;
  /** points to reach */
  target: number;
  /** points this season */
  gain: number;
  /** vis it needs this season */
  vis?: { arts: Art[]; pawns: number };
  /** seasons left, counting this one */
  seasonsLeft: number;
  problems: string[];
  /** what this season would do, in a line */
  summary: string;
}

export interface PlanOptions {
  /** the season's experimentation bonus, once rolled */
  bonus?: number;
  /** the character a Longevity Ritual is for, when not the magus */
  subject?: Character;
  data?: GameData;
}

/** May this project be worked by experimentation (DE, Arcane Experimentation)? Not from a Laboratory Text. */
export function canExperiment(p: LabProject): boolean {
  return !!PROJECT_KINDS.find((k) => k.id === p.kind)?.experiment && !p.fromText;
}

/**
 * What a season of work on a project would do, without doing it: the Lab Total with everything the
 * lab gives it (General Quality, Specializations, Missing Ingredients) and what it rules out.
 */
export function planProject(p: LabProject, c: Character, d: DerivedCharacter, ctx: CharacterContext, o: PlanOptions = {}): ProjectPlan {
  const plan = planKind(p, c, d, ctx, o);
  const lab = ctx.lab ? labContextOf(ctx.lab) : undefined;
  if (p.done || !lab) return plan;
  // a lab whose Flaws rule out this kind of work, or experimenting, cannot be used for it
  const activity = PROJECT_KINDS.find((k) => k.id === p.kind)?.activity;
  const out = [activity, p.experiment && canExperiment(p) ? 'Experimentation' : undefined, p.fromText ? 'Texts' : undefined].filter((a): a is string => !!a && lab.impossible.includes(a));
  if (out.length) plan.problems.unshift(`${lab.name} cannot be used for ${out.join(' or ')}: its Flaws rule it out.`);
  return plan;
}

/** The vis a season needs and where it comes from, when there is not enough there. */
export function visShort(p: LabProject, c: Character, ctx: CharacterContext, plan: ProjectPlan): string | undefined {
  if (!plan.vis?.pawns) return undefined;
  const fromCov = p.visFrom === 'covenant' && !!ctx.covenant;
  const have = visAvailable(fromCov ? ctx.covenant!.visStocks : (c.purse?.vis ?? []), plan.vis.arts);
  return have < plan.vis.pawns ? `It needs ${plan.vis.pawns} pawn${plan.vis.pawns > 1 ? 's' : ''} of ${plan.vis.arts.map((a) => ART_NAMES[a]).join(' or ')} vis; ${fromCov ? 'the covenant’s stocks have' : 'the purse has'} ${have}.` : undefined;
}

function planKind(p: LabProject, c: Character, d: DerivedCharacter, ctx: CharacterContext, o: PlanOptions): ProjectPlan {
  const problems: string[] = [];
  const lab = ctx.lab ? labContextOf(ctx.lab) : undefined;
  const experimenting = !!p.experiment && canExperiment(p);
  const extra = [
    ...(p.bonus ? [{ label: 'Other bonus', value: p.bonus }] : []),
    ...routineParts(p.routines),
    ...(o.bonus ? [{ label: 'Experimentation (simple die + risk)', value: o.bonus }] : []),
  ];
  const lt = (activity: LabActivity, te: string, fo: string, x?: { talisman?: boolean; requisites?: Art[]; familiarBond?: 'none' | 'one' | 'both'; fromText?: boolean; forSelfLongevity?: boolean }) =>
    labTotal(d, { technique: te as never, form: fo as never, requisites: x?.requisites }, {
      activity, aura: ctx.aura, lab, talisman: x?.talisman, familiarBond: x?.familiarBond, fromText: x?.fromText, forSelfLongevity: x?.forSelfLongevity, experimenting, extra,
      inFocus: p.inFocus, circumstance: p.circumstances,
    });
  const limit = seasonVisLimit(d);
  const visCheck = (pawns: number) => pawns > limit && problems.push(`${pawns} pawns is more than you can handle in a season (twice Magic Theory: ${limit}).`);
  // experimenting, the simple die may carry a Lab Total that falls short now (DE): the season can still be worked
  const short = (text: string) => (experimenting && !o.bonus ? undefined : problems.push(text));
  const it = itemOf(c, p);
  if (p.done) return { target: 0, gain: 0, seasonsLeft: 0, problems: [p.failed ? 'Came to nothing.' : 'Finished.'], summary: p.failed ? 'Came to nothing.' : 'Finished.' };
  const clash = routineClash(p.routines ?? []);
  if (clash) problems.push(clash);
  switch (p.kind) {
    case 'invent': {
      if (!p.technique || !p.form || !p.level) return { target: 0, gain: 0, seasonsLeft: 0, problems: ['Choose the spell, its Arts and level.'], summary: '' };
      const total = lt('spells', p.technique, p.form, { requisites: p.requisites, fromText: p.fromText });
      if (p.fromText) {
        // from a Laboratory Text: one season once the Lab Total equals or exceeds the level (DE)
        const ok = total.total >= p.level;
        if (!ok) problems.push(`From a Laboratory Text the Lab Total (${total.total}) must reach the level (${p.level}).`);
        return { total, target: p.level, gain: ok ? p.level - p.progress : 0, seasonsLeft: 1, problems, summary: ok ? `Learned from the Laboratory Text in one season (level ${p.level}).` : '' };
      }
      const gain = Math.max(0, total.total - p.level);
      if (!gain) short(`The Lab Total (${total.total}) must exceed the level (${p.level}).`);
      const left = p.level - p.progress;
      return { total, target: p.level, gain, seasonsLeft: gain ? Math.ceil(left / gain) : Infinity, problems, summary: gain ? `+${gain} points toward level ${p.level} (${p.progress}/${p.level}).` : experimenting ? `Only the experiment's simple die can carry the Lab Total (${total.total}) past the level (${p.level}).` : '' };
    }
    case 'open': {
      if (!it) return { target: 0, gain: 0, seasonsLeft: 0, problems: ['Choose the item.'], summary: '' };
      const talisman = c.talismanUid === it.uid;
      const cap = talisman ? talismanCapacity(highest(d, TECHNIQUES), highest(d, FORMS)) : openingCost(it.material, it.size);
      const room = Math.max(0, cap - it.openedPawns);
      // an invested device is opened all at once; a talisman a pawn or more at a time
      const pawns = talisman ? Math.min(p.pawns ?? room, room) : it.openedPawns ? 0 : cap;
      if (!pawns) problems.push(talisman ? `The talisman holds ${cap} pawns and ${it.openedPawns} are opened.` : 'This item is already prepared.');
      if (pawns > limit) problems.push(`${pawns} pawns is more than you can handle in a season (twice Magic Theory: ${limit}).`);
      return { target: 1, gain: pawns ? 1 : 0, vis: { arts: ['Vi'], pawns }, seasonsLeft: 1, problems, summary: pawns ? `Open ${pawns} pawn${pawns > 1 ? 's' : ''} of Vim into ${it.name}${talisman ? ` (${it.openedPawns + pawns}/${cap})` : ''}.` : '' };
    }
    case 'attune': {
      if (!it) return { target: 0, gain: 0, seasonsLeft: 0, problems: ['Choose the item.'], summary: '' };
      if (!it.openedPawns) problems.push('Prepare the item for enchantment first.');
      if (it.creatorId && it.creatorId !== c.id) problems.push('Only an item you prepared yourself can become your talisman.');
      if (c.talismanUid && c.talismanUid !== it.uid) problems.push('A magus has one talisman: destroy the old one first.');
      return { target: 1, gain: 1, seasonsLeft: 1, problems, summary: `Attune ${it.name} as your talisman.` };
    }
    case 'instill': {
      const e = it?.effects.find((x) => x.uid === p.effectUid);
      if (!it || !e) return { target: 0, gain: 0, seasonsLeft: 0, problems: ['Choose the item and the effect (add the effect to the item first).'], summary: '' };
      const talisman = c.talismanUid === it.uid;
      const total = lt('items', e.technique, e.form, { talisman, requisites: e.requisites });
      const level = e.modifiedLevel;
      const lesser = it.kind === 'lesser';
      const pawns = Math.ceil(level / 10);
      if (it.kind === 'charged') {
        // charged items: one season, Lab Total at least the level, a charge per 5 points (or part) over it (DE)
        const charges = chargedItemCharges(total.total, level);
        if (!charges) short(`The Lab Total (${total.total}) must reach the level (${level}).`);
        visCheck(pawns);
        return { total, target: level, gain: charges ? level : 0, vis: { arts: [e.technique, e.form], pawns }, seasonsLeft: 1, problems, summary: charges ? `${charges} charge${charges > 1 ? 's' : ''} of ${e.name} in one season.` : '' };
      }
      const inv = investEffect(total.total, level, lesser ? 'lesser' : talisman ? 'talisman' : 'invested', e.expiry);
      if (!inv.possible) short(inv.reason ?? 'The Lab Total is too low.');
      if (!lesser && pawnsUsed(it, e.uid) + pawns > it.openedPawns) problems.push(`It needs ${pawns} pawns of room; ${it.openedPawns - pawnsUsed(it, e.uid)} of ${it.openedPawns} are free.`);
      if (!p.visPaid) visCheck(pawns);
      const gain = lesser ? (inv.possible ? level : 0) : inv.possible ? inv.pointsPerSeason : 0;
      const left = level - p.progress;
      return {
        total, target: level, gain, vis: p.visPaid ? undefined : { arts: [e.technique, e.form], pawns }, seasonsLeft: gain ? Math.ceil(left / gain) : Infinity, problems,
        summary: gain ? `+${gain} points toward level ${level} (${p.progress}/${level}).` : '',
      };
    }
    case 'tame': {
      if (!p.form) return { target: 0, gain: 0, seasonsLeft: 0, problems: ["Choose the creature's Form."], summary: '' };
      const might = Math.max(1, p.level ?? 1);
      const base = lt('other', 'Re', p.form);
      // Animal Handling and Animal Ken add to a Hermetic tamer's Lab Total (DE, Hermetic Bonuses to Taming)
      const skills = (['animal-handling', 'animal-ken'] as const)
        .map((id) => d.abilities.filter((a) => a.abilityId === id).sort((a, b) => b.total - a.total)[0])
        .filter((a): a is NonNullable<typeof a> => !!a && a.total > 0)
        .map((a) => ({ label: a.name, value: a.total }));
      const total = { ...base, total: base.total + skills.reduce((t, x) => t + x.value, 0), parts: [...base.parts, ...skills] };
      const gain = Math.max(0, total.total - might);
      if (!gain) short(`The Rego ${ART_NAMES[p.form]} Lab Total (${total.total}) must exceed the creature's Might (${might}).`);
      const left = might - p.progress;
      return { total, target: might, gain, seasonsLeft: gain ? Math.ceil(left / gain) : Infinity, problems, summary: gain ? `+${gain} taming points toward ${might} (${p.progress}/${might}).` : '' };
    }
    case 'extract': {
      const total = lt('visExtraction', 'Cr', 'Vi');
      const pawns = Math.ceil(Math.max(0, total.total) / 10);
      if (!pawns) problems.push('No Creo Vim Lab Total.');
      return { total, target: 1, gain: pawns, seasonsLeft: 1, problems, summary: `${pawns} pawn${pawns === 1 ? '' : 's'} of Vim vis.` };
    }
    case 'longevity': {
      const subject = p.subjectId && p.subjectId !== c.id ? o.subject : c;
      if (!subject) return { target: 0, gain: 0, seasonsLeft: 0, problems: ['The character it is for is not in this saga.'], summary: '' };
      const self = subject === c;
      const total = lt('longevity', 'Cr', 'Co', { forSelfLongevity: self });
      const extraVis = Math.max(0, p.extraVis ?? 0);
      const t = total.total + extraVis;
      const mundane = !self && isMundane(subject, o.data);
      // for someone else, a Lab Total of 30 or more; a mundane gains a point for every 10 (DE)
      if (!self && t < 30) short(`A Longevity Ritual for someone else needs a Creo Corpus Lab Total of at least 30 (${t}).`);
      const bonus = longevityBonus(total.total, extraVis, mundane);
      const pawns = longevityVisCost(subject.age, extraVis);
      // vis use is limited by the magus's Arts, as for a spell, not by Magic Theory (DE)
      const artLimit = d.arts.Cr.score + d.arts.Co.score + d.arts.Vi.score;
      if (pawns > artLimit) problems.push(`${pawns} pawns of vis: no more than your Creo, Corpus and Vim scores allow (${artLimit}).`);
      return {
        total, target: 1, gain: 1, vis: { arts: ['Cr', 'Co', 'Vi'], pawns }, seasonsLeft: 1, problems,
        summary: `−${bonus} on ${self ? 'your' : `${subject.name || 'their'}`} aging rolls (Lab Total ${t}${extraVis ? ` with ${extraVis} extra pawns` : ''}${mundane ? ', a point for every 10 for a mundane' : ''}).`,
      };
    }
    case 'bind':
    case 'strengthen': {
      const f = c.familiar;
      if (!f) return { target: 0, gain: 0, seasonsLeft: 0, problems: ['Add the familiar on the Familiar card first: its Might, Size and the Arts that bind it.'], summary: '' };
      const bound = f.bindingLabTotal > 0;
      if (p.kind === 'bind' && bound) problems.push('This familiar is already bound: strengthen the bond instead.');
      if (p.kind === 'strengthen' && !bound) problems.push('Bind the familiar first.');
      // strengthening uses the Arts of the binding (DE)
      const total = lt('familiar', f.bindingTechnique, f.bindingForm);
      const level = familiarBindingLevel(f.might, f.size);
      const cords = p.cords ?? { golden: f.golden, silver: f.silver, bronze: f.bronze };
      const cost = cordPointsCost(cords.golden, cords.silver, cords.bronze);
      if (cost > total.total) short(`The cords cost ${cost} points; they cannot exceed the Lab Total (${total.total}).`);
      let pawns: number;
      if (p.kind === 'bind') {
        if (total.total < level) short(`The Lab Total (${total.total}) must reach the binding level (25 + Might ${f.might} + 5 × Size ${f.size} = ${level}).`);
        pawns = familiarBindingVis(total.total);
      } else {
        if (total.total <= f.bindingLabTotal) short(`The Lab Total (${total.total}) is no higher than the bond's (${f.bindingLabTotal}): nothing to strengthen.`);
        if (cords.golden < f.golden || cords.silver < f.silver || cords.bronze < f.bronze) problems.push('Strengthening cannot weaken a cord.');
        // a pawn per 5 points of the new Lab Total, less those already spent on the binding (DE)
        pawns = Math.max(0, familiarBindingVis(total.total) - f.pawnsSpent);
      }
      visCheck(pawns);
      return {
        total, target: level, gain: problems.length ? 0 : 1, vis: { arts: [f.bindingTechnique, f.bindingForm], pawns }, seasonsLeft: 1, problems,
        summary: `${p.kind === 'bind' ? `Bind ${f.name || 'the familiar'} (level ${level})` : 'Strengthen the bond'}: golden ${cords.golden}, silver ${cords.silver}, bronze ${cords.bronze} (${cost} of ${total.total} points), ${pawns} pawn${pawns === 1 ? '' : 's'} of ${ART_NAMES[f.bindingTechnique]} or ${ART_NAMES[f.bindingForm]} vis.`,
      };
    }
    case 'empower': {
      const f = c.familiar;
      const e = f?.powers.find((x) => x.uid === p.effectUid);
      if (!f || f.bindingLabTotal <= 0) return { target: 0, gain: 0, seasonsLeft: 0, problems: ['Bind the familiar first.'], summary: '' };
      if (!e) return { target: 0, gain: 0, seasonsLeft: 0, problems: ['Choose the power (add it on the Familiar card first).'], summary: '' };
      // +5 for an effect in the binding Technique or Form, +10 for both, instead of the bonus for other effects (DE)
      const match = Number(e.technique === f.bindingTechnique) + Number(e.form === f.bindingForm);
      const total = lt('familiar', e.technique, e.form, { requisites: e.requisites, familiarBond: match === 2 ? 'both' : match ? 'one' : 'none' });
      const level = e.modifiedLevel;
      const inv = investEffect(total.total, level, 'invested', e.expiry);
      if (!inv.possible) short(inv.reason ?? 'The Lab Total is too low.');
      const pawns = Math.ceil(level / 10);
      if (!p.visPaid) visCheck(pawns);
      const gain = inv.possible ? inv.pointsPerSeason : 0;
      const left = level - p.progress;
      return {
        total, target: level, gain, vis: p.visPaid ? undefined : { arts: [e.technique, e.form], pawns }, seasonsLeft: gain ? Math.ceil(left / gain) : Infinity, problems,
        summary: gain ? `+${gain} points toward level ${level} (${p.progress}/${level}).` : '',
      };
    }
    default:
      return { target: 1, gain: 1, seasonsLeft: 1, problems: [], summary: p.name };
  }
}

/** Pay a project's vis from the magus's purse or the covenant's stocks. */
function payVis(c: Character, cov: Covenant | undefined, p: LabProject, need: { arts: Art[]; pawns: number }): string | null {
  if (!need.pawns) return '';
  const from = p.visFrom === 'covenant' && cov ? cov.visStocks : purseOf(c).vis;
  const r = takeVis(from, need.arts, need.pawns);
  if (!r.ok) return null;
  return `Spent ${visText(r.taken)} vis${p.visFrom === 'covenant' && cov ? ' from the covenant' : ''}.`;
}

/** A subject with no Gift and no Supernatural Virtue gains less from a Longevity Ritual (DE). */
function isMundane(c: Character, data?: GameData): boolean {
  if (c.type === 'magus') return false;
  return !c.virtues.some((v) => data?.vfById.get(v.defId)?.categories.includes('Supernatural') || /gift/.test(v.defId));
}

export interface WorkOptions {
  rng?: Rng;
  /** the saga's characters: the one a Longevity Ritual is for, when not the magus */
  chars?: Character[];
  /** when, for the record of the season's rolls */
  season?: string;
}

/**
 * Work a season on a project. The lab's own Safety and Warping are rolled first, then the
 * experiment if it is done by experimentation (its simple die on the Lab Total, its roll on the
 * Extraordinary Results Chart); the vis is paid, and the season's points gathered unless it was
 * wasted. When it is done the spell is learned, the item opened, attuned or enchanted, the familiar
 * bound, the ritual working, or the vis made. Changes the character (the covenant's stocks, and the
 * subject of a Longevity Ritual) in place. Returns what happened.
 */
export function workProject(c: Character, d: DerivedCharacter, ctx: CharacterContext, cov: Covenant | undefined, projectUid: string, data: GameData, year?: number, o: WorkOptions = {}): string[] {
  const p = c.projects?.find((x) => x.uid === projectUid);
  if (!p || p.done) return [];
  const rng = o.rng ?? defaultRng;
  const subject = p.subjectId && p.subjectId !== c.id ? o.chars?.find((x) => x.id === p.subjectId) : undefined;
  const base = planProject(p, c, d, ctx, { subject, data });
  const head = `${p.name}:`;
  if (base.problems.length) return [`${head} no progress. ${base.problems.join(' ')}`];
  // nothing is rolled for a season the vis cannot pay for
  const stocks = p.visFrom === 'covenant' && cov ? cov.visStocks : (c.purse?.vis ?? []);
  if (base.vis?.pawns && visAvailable(stocks, base.vis.arts) < base.vis.pawns)
    return [`${head} no progress: it needs ${base.vis.pawns} pawn${base.vis.pawns > 1 ? 's' : ''} of ${base.vis.arts.map((a) => ART_NAMES[a]).join(' or ')} vis${p.visFrom === 'covenant' && cov ? ' in the covenant stocks' : ' in your purse'}.`];
  const lines: string[] = [];
  const when = [o.season, year].filter(Boolean).join(' ');
  const record = (xs: string[]) => xs.length && (p.results = [...(p.results ?? []), ...xs.map((l) => (when ? `${when}: ${l}` : l))].slice(-40));
  const enchantment = p.kind === 'instill' || p.kind === 'open' || p.kind === 'bind' || p.kind === 'strengthen' || p.kind === 'empower';
  // the lab itself: an unsafe lab may have an accident, a warped one warps what is made (Covenants)
  const lab = ctx.lab;
  const hz = lab ? labSeasonHazards({ safety: lab.characteristics.Safety, warping: lab.characteristics.Warping, enchantment }, rng) : undefined;
  // experimentation: a simple die (+ risk) on the Lab Total and a roll on the Extraordinary Results Chart (DE)
  const goldenCord = lab?.parts.Safety.some((x) => x.label === 'Familiar') ? 0 : (c.familiar?.golden ?? 0);
  const risk = Math.max(0, Math.min(3, p.experiment?.risk ?? 0));
  const xr = p.experiment && canExperiment(p) ? rollExperiment({ risk, auraStrength: ctx.aura.strength, enchantment, safety: lab?.characteristics.Safety ?? 0, goldenCord }, rng) : undefined;
  if (hz?.lines.length) lines.push(...hz.lines);
  if (xr) lines.push(`Experimenting${risk ? ` (risk +${risk})` : ''}:`, ...xr.lines.map((l) => `  ${l}`));
  record([...(hz?.lines ?? []), ...(xr?.lines ?? [])]);
  const wp = (hz?.warpingPoints ?? 0) + (xr?.warpingPoints ?? 0);
  if (wp) {
    c.warpingPoints += wp;
    lines.push(`${wp} Warping Point${wp > 1 ? 's' : ''} for ${c.name || 'the magus'}.${wp >= 2 ? " Roll for Wizard's Twilight." : ''}`);
  }
  const bonus = xr && !xr.noBenefit ? xr.labBonus : 0;
  let plan = bonus ? planProject(p, c, d, ctx, { subject, data, bonus }) : base;
  // the vis is spent whatever comes of the season (an item's is lost on a failure, DE)
  const need = plan.vis;
  if (need && need.pawns) {
    let paid = payVis(c, cov, p, need);
    if (paid === null && plan !== base && base.vis) {
      // not enough vis for the higher Lab Total: work at the Lab Total without the experiment's die
      plan = base;
      paid = payVis(c, cov, p, base.vis!);
      if (paid !== null) lines.push('Not enough vis for the experiment’s higher Lab Total: worked at the Lab Total without it.');
    }
    if (paid === null) return [...lines, `${head} no progress: it needs ${need.pawns} pawn${need.pawns > 1 ? 's' : ''} of ${need.arts.map((a) => ART_NAMES[a]).join(' or ')} vis${p.visFrom === 'covenant' ? ' in the covenant stocks' : ' in your purse'}.`];
    if (paid) lines.push(paid);
    if (p.kind === 'instill' || p.kind === 'empower') p.visPaid = true;
  }
  p.seasons += 1;
  const routineLines = recordRoutines(c, p.routines, year);
  const it = itemOf(c, p);
  if (hz?.destroyed || xr?.destroyed) {
    p.done = true;
    p.failed = true;
    lines.push(`${head} ${destroy(c, p, it)}`);
    return [...lines, ...routineLines];
  }
  if (hz?.wasted || xr?.wasted) {
    lines.push(`${head} the season is wasted.`);
    return [...lines, ...routineLines];
  }
  if (plan.problems.length) {
    // experimenting, the die did not carry it: the season is spent and its vis lost
    lines.push(`${head} falls short this season: ${plan.problems.join(' ')}`);
    return [...lines, ...routineLines];
  }
  const attune = () => {
    if (p.attunement && it && c.talismanUid === it.uid) {
      it.attunements.push({ ...p.attunement });
      lines.push(`Attunement added: ${p.attunement.label} (+${p.attunement.bonus}).`);
      p.attunement = undefined;
    }
  };
  const flaw = xr && !xr.noBenefit && xr.lines.some((l) => /Side effect|Modified effect|Special or story/.test(l)) ? ' (with what the experiment did to it: see the project’s record)' : '';
  switch (p.kind) {
    case 'invent': {
      p.progress = Math.min(p.level!, p.progress + plan.gain);
      if (p.progress >= p.level!) {
        p.done = true;
        const spell = p.spell ?? {
          id: `custom-${p.uid}`, name: p.name, technique: p.technique!, form: p.form!, level: p.level!, general: false, range: '', duration: '', target: '', ritual: p.level! > 50,
          requisites: p.requisites ?? [], text: '', design: null, base: null, source: { book: 'custom', line: 0 }, custom: true,
        };
        c.spells.push({ uid: uid(), spellId: p.spell?.id, spell: { ...spell, level: p.level! }, masteryXp: {}, masteryAbilities: [], source: 'play' });
        lines.push(`${head} invented (level ${p.level})${flaw}.`);
      } else lines.push(`${head} ${plan.summary}`);
      break;
    }
    case 'open': {
      if (it && plan.vis) {
        it.openedPawns += plan.vis.pawns;
        it.creatorId = it.creatorId ?? c.id;
        lines.push(`${head} ${it.name} opened with ${plan.vis.pawns} pawns of Vim (${it.openedPawns} in all).`);
        attune();
      }
      p.done = true;
      break;
    }
    case 'attune': {
      if (it) {
        c.talismanUid = it.uid;
        it.attuned = true;
        lines.push(`${head} ${it.name} is now your talisman.`);
        attune();
      }
      p.done = true;
      break;
    }
    case 'instill': {
      const e = it?.effects.find((x) => x.uid === p.effectUid);
      if (it?.kind === 'charged' && e) {
        const charges = chargedItemCharges(plan.total?.total ?? 0, e.modifiedLevel);
        it.charges = (it.charges ?? 0) + charges;
        e.pending = false;
        p.progress = plan.target;
        p.done = true;
        lines.push(`${head} ${charges} charge${charges > 1 ? 's' : ''} of ${e.name} in ${it.name}${flaw}.`);
        break;
      }
      p.progress = Math.min(plan.target, p.progress + plan.gain);
      if (p.progress >= plan.target && e) {
        e.pending = false;
        e.investedPawns = Math.ceil(e.modifiedLevel / 10);
        p.done = true;
        lines.push(`${head} ${e.name} now works in ${it!.name}${flaw}.`);
      } else lines.push(`${head} ${plan.summary}`);
      attune();
      break;
    }
    case 'tame': {
      // the points add up only over consecutive seasons; anything else in between loses them
      if (p.progress && p.logMark !== undefined && c.seasonLog.length !== p.logMark + 1) {
        lines.push(`${head} the earlier taming points are lost (other seasons came between).`);
        p.progress = 0;
      }
      p.logMark = c.seasonLog.length;
      p.progress = Math.min(plan.target, p.progress + plan.gain);
      if (p.progress >= plan.target) {
        p.done = true;
        lines.push(`${head} tamed. It is Loyal +0 to you, and your notes make a Lab Text of level ${plan.target} for taming creatures of ${ART_NAMES[p.form!]}.`);
      } else lines.push(`${head} ${plan.summary}`);
      break;
    }
    case 'extract': {
      const to = cov && p.visFrom === 'covenant' ? cov.visStocks : purseOf(c).vis;
      addVis(to, 'Vi', plan.gain);
      lines.push(`${head} ${plan.gain} pawn${plan.gain === 1 ? '' : 's'} of Vim vis${cov && p.visFrom === 'covenant' ? ' for the covenant' : ''}.`);
      break;
    }
    case 'longevity': {
      const who = subject ?? c;
      const total = plan.total?.total ?? 0;
      const extraVis = Math.max(0, p.extraVis ?? 0);
      const mundane = who !== c && isMundane(who, data);
      who.longevity = { labTotal: total + extraVis, bonus: longevityBonus(total, extraVis, mundane), extraVis, createdYear: year, createdBy: c.name, forMundane: mundane || undefined };
      p.done = true;
      lines.push(`${head} ${who === c ? 'your' : `${who.name || 'the subject'}'s`} Longevity Ritual gives −${who.longevity.bonus} on aging rolls${flaw}.`);
      break;
    }
    case 'bind':
    case 'strengthen': {
      const f = c.familiar!;
      const total = plan.total?.total ?? 0;
      const cords = p.cords ?? { golden: f.golden, silver: f.silver, bronze: f.bronze };
      f.bindingLabTotal = Math.max(f.bindingLabTotal, total);
      f.pawnsSpent += plan.vis?.pawns ?? 0;
      f.golden = cords.golden;
      f.silver = cords.silver;
      f.bronze = cords.bronze;
      p.done = true;
      lines.push(`${head} ${p.kind === 'bind' ? `${f.name || 'the familiar'} is bound` : 'the bond is stronger'} (Lab Total ${total}): golden ${f.golden}, silver ${f.silver}, bronze ${f.bronze}${flaw}.`);
      break;
    }
    case 'empower': {
      const f = c.familiar!;
      const e = f.powers.find((x) => x.uid === p.effectUid);
      p.progress = Math.min(plan.target, p.progress + plan.gain);
      if (p.progress >= plan.target && e) {
        e.pending = false;
        p.done = true;
        lines.push(`${head} ${e.name} now works through the bond${flaw}.`);
      } else lines.push(`${head} ${plan.summary}`);
      break;
    }
    default:
      lines.push(`${head} a season's work.`);
  }
  return [...lines, ...routineLines];
}

/** A Complete Failure's 0, or a Disaster's second zero: the creation is destroyed (DE). */
function destroy(c: Character, p: LabProject, it: EnchantedItem | undefined): string {
  switch (p.kind) {
    case 'instill':
    case 'open':
      if (it) c.items = c.items.filter((x) => x.uid !== it.uid);
      if (it && c.talismanUid === it.uid) c.talismanUid = undefined;
      return `${it?.name ?? 'the item'} is destroyed.`;
    case 'empower': {
      const f = c.familiar;
      if (f) f.powers = f.powers.filter((x) => x.uid !== p.effectUid);
      return 'the power is lost, and the bond shaken: the storyguide says what more.';
    }
    case 'bind':
    case 'strengthen':
      return `${c.familiar?.name || 'the familiar'} is destroyed: the storyguide says how, and whether the bond survives.`;
    default:
      return 'the work is destroyed.';
  }
}
