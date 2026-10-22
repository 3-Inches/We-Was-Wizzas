// Laboratory projects that run season by season (DE, The Laboratory and Enchantments): inventing a
// spell, preparing an item (a talisman a little at a time), attuning a talisman, instilling an effect,
// extracting vis, and taming a creature (DE, Training Creatures). Each season of work gathers
// (Lab Total − level) points until they reach the level.

import { ART_NAMES, FORMS, TECHNIQUES, type Art, type GameData } from '../data';
import type { DerivedCharacter } from './character/derive';
import type { CharacterContext } from './context';
import { investEffect, openingCost, talismanCapacity, visLimit } from './enchant';
import { labContextOf } from './lab';
import { recordRoutines, routineClash, routineParts } from './labRoutines';
import { labTotal, type TotalResult } from './magic';
import type { Character, Covenant, EnchantedItem, LabProject } from './types';
import { addVis, purseOf, takeVis, visText } from './vis';
import { uid } from '../util/id';

export const PROJECT_KINDS: { id: LabProject['kind']; label: string; blurb: string }[] = [
  { id: 'invent', label: 'Invent a spell', blurb: 'Lab Total over the level; each season gathers the difference until it reaches the level.' },
  { id: 'open', label: 'Prepare an item for enchantment', blurb: 'A season and the Vim vis of its material and size; a talisman can be opened a little at a time.' },
  { id: 'attune', label: 'Attune a talisman', blurb: 'A season, whatever the Lab Total, on an item you prepared yourself.' },
  { id: 'instill', label: 'Instill an effect', blurb: 'Lab Total over the effect level (double for a lesser device); a pawn per 10 levels, paid in the first season; +5 in your own talisman.' },
  { id: 'extract', label: 'Extract vis', blurb: 'A pawn of Vim for every 10 points (or part) of the Creo Vim Lab Total.' },
  { id: 'tame', label: 'Tame a creature', blurb: "Rego (Form) Lab Total with Animal Handling and Animal Ken, less the creature's Might, each season in a row, until the points reach its Might. A mundane beast counts as Might 1 + twice its Confidence." },
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

/** What a season of work on a project would do, without doing it. */
export function planProject(p: LabProject, c: Character, d: DerivedCharacter, ctx: CharacterContext): ProjectPlan {
  const problems: string[] = [];
  const lab = ctx.lab ? labContextOf(ctx.lab) : undefined;
  const lt = (activity: 'spells' | 'items' | 'visExtraction' | 'other', te: string, fo: string, extra?: { talisman?: boolean; requisites?: Art[] }) =>
    labTotal(d, { technique: te as never, form: fo as never, requisites: extra?.requisites }, {
      activity, aura: ctx.aura, lab, talisman: extra?.talisman, extra: [...(p.bonus ? [{ label: 'Other bonus', value: p.bonus }] : []), ...routineParts(p.routines)],
    });
  const limit = seasonVisLimit(d);
  const it = itemOf(c, p);
  if (p.done) return { target: 0, gain: 0, seasonsLeft: 0, problems: ['Finished.'], summary: 'Finished.' };
  const clash = routineClash(p.routines ?? []);
  if (clash) problems.push(clash);
  switch (p.kind) {
    case 'invent': {
      if (!p.technique || !p.form || !p.level) return { target: 0, gain: 0, seasonsLeft: 0, problems: ['Choose the spell, its Arts and level.'], summary: '' };
      const total = lt('spells', p.technique, p.form, { requisites: p.requisites });
      const gain = Math.max(0, total.total - p.level);
      if (!gain) problems.push(`The Lab Total (${total.total}) must exceed the level (${p.level}).`);
      const left = p.level - p.progress;
      return { total, target: p.level, gain, seasonsLeft: gain ? Math.ceil(left / gain) : Infinity, problems, summary: gain ? `+${gain} points toward level ${p.level} (${p.progress}/${p.level}).` : '' };
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
      const inv = investEffect(total.total, level, lesser ? 'lesser' : talisman ? 'talisman' : 'invested', e.expiry);
      if (!inv.possible) problems.push(inv.reason ?? 'The Lab Total is too low.');
      const pawns = Math.ceil(level / 10);
      if (!lesser && it.kind !== 'charged' && pawnsUsed(it, e.uid) + pawns > it.openedPawns) problems.push(`It needs ${pawns} pawns of room; ${it.openedPawns - pawnsUsed(it, e.uid)} of ${it.openedPawns} are free.`);
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
      if (!gain) problems.push(`The Rego ${ART_NAMES[p.form]} Lab Total (${total.total}) must exceed the creature's Might (${might}).`);
      const left = might - p.progress;
      return { total, target: might, gain, seasonsLeft: gain ? Math.ceil(left / gain) : Infinity, problems, summary: gain ? `+${gain} taming points toward ${might} (${p.progress}/${might}).` : '' };
    }
    case 'extract': {
      const total = lt('visExtraction', 'Cr', 'Vi');
      const pawns = Math.ceil(Math.max(0, total.total) / 10);
      return { total, target: 1, gain: pawns, seasonsLeft: 1, problems: pawns ? [] : ['No Creo Vim Lab Total.'], summary: `${pawns} pawn${pawns === 1 ? '' : 's'} of Vim vis.` };
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

/**
 * Work a season on a project: it gathers points, pays its vis, and when it is done the spell is
 * learned, the item opened or attuned, the effect working, or the vis made. Changes the character
 * (and the covenant's stocks, when its vis comes from there). Returns what happened.
 */
export function workProject(c: Character, d: DerivedCharacter, ctx: CharacterContext, cov: Covenant | undefined, projectUid: string, data: GameData, year?: number): string[] {
  const p = c.projects?.find((x) => x.uid === projectUid);
  if (!p || p.done) return [];
  const plan = planProject(p, c, d, ctx);
  const head = `${p.name}:`;
  if (plan.problems.length && !(p.kind === 'extract' && plan.gain)) return [`${head} no progress. ${plan.problems.join(' ')}`];
  const lines: string[] = [];
  if (plan.vis && plan.vis.pawns) {
    const paid = payVis(c, cov, p, plan.vis);
    if (paid === null) return [`${head} no progress: it needs ${plan.vis.pawns} pawn${plan.vis.pawns > 1 ? 's' : ''} of ${plan.vis.arts.map((a) => ART_NAMES[a]).join(' or ')} vis${p.visFrom === 'covenant' ? ' in the covenant stocks' : ' in your purse'}.`];
    if (paid) lines.push(paid);
    if (p.kind === 'instill') p.visPaid = true;
  }
  p.seasons += 1;
  const routineLines = recordRoutines(c, p.routines, year);
  const it = itemOf(c, p);
  const attune = () => {
    if (p.attunement && it && c.talismanUid === it.uid) {
      it.attunements.push({ ...p.attunement });
      lines.push(`Attunement added: ${p.attunement.label} (+${p.attunement.bonus}).`);
      p.attunement = undefined;
    }
  };
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
        lines.push(`${head} invented (level ${p.level}).`);
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
      p.progress = Math.min(plan.target, p.progress + plan.gain);
      const e = it?.effects.find((x) => x.uid === p.effectUid);
      if (p.progress >= plan.target && e) {
        e.pending = false;
        e.investedPawns = Math.ceil(e.modifiedLevel / 10);
        p.done = true;
        lines.push(`${head} ${e.name} now works in ${it!.name}.`);
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
    default:
      lines.push(`${head} a season's work.`);
  }
  void data;
  return [...lines, ...routineLines];
}
