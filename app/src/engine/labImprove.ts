// Improving a laboratory in play (Covenants, Laboratory Characteristics and Virtues and Flaws): a
// season raising its Refinement (Magic Theory at least the new Refinement + 3, a chance of Highly
// Organized, Spotless or a Hidden Defect), a season or two installing a Virtue (Magic Theory at least
// the Refinement + 3, and free space for it), and a season or two putting a Flaw right (free space for
// the occupied Size it adds). A Virtue may come out during a season of improvement, and a Free or
// Minor Flaw be put right in a season raising the Refinement. If the Upkeep rises, the difference in
// build cost is paid: a pound for every two points.

import type { GameData, LabVFDef } from '../data';
import { LAB_OPTIONS } from '../data/labOptions';
import type { DerivedCharacter } from './character/derive';
import type { CharacterContext } from './context';
import { stressDie, type Rng } from './dice';
import { deriveLab, type DerivedLab } from './lab';
import type { ProjectPlan } from './projects';
import type { Character, Covenant, LabProject, LabVirtueEntry, Laboratory, Season } from './types';
import { purseOf } from './vis';
import { uid } from '../util/id';

const POINTS = { Major: 3, Minor: 1, Free: 0 } as const;
const pointsOf = (def: LabVFDef) => POINTS[def.size as keyof typeof POINTS] ?? 0;

/** Years the season log shows the character working in a lab: the rule of thumb for knowing one well enough to refine it. */
export function labYears(c: Character): number {
  return new Set(c.seasonLog.filter((e) => e.labKind || /^Lab\b/.test(e.summary)).map((e) => e.year)).size;
}

/** Pounds to pay when a change raises a lab's Upkeep: the difference in build cost, a pound per two points (no refund when it falls). */
export function upkeepRiseCost(before: DerivedLab, after: DerivedLab): number {
  return Math.max(0, (after.upkeepPoints - before.upkeepPoints) / 2);
}

/** The lab as it would be after this project's work: the Virtue in, the one taken out gone, a point more Refinement. */
function labAfter(lab: Laboratory, p: LabProject, raise: boolean): Laboratory {
  const next = structuredClone(lab);
  if (raise) next.refinement += 1;
  if (p.removeUid) next.virtues = next.virtues.filter((v) => v.uid !== p.removeUid);
  if (p.kind === 'install' && p.labVirtue) next.virtues.push({ uid: 'new', defId: p.labVirtue.defId, note: p.labVirtue.note });
  return next;
}

/** What it costs in pounds: the Upkeep's rise in build cost, and for Extensive Stores a year's maintenance to fill them. */
function poundsFor(before: DerivedLab, after: DerivedLab, p: LabProject): number {
  return upkeepRiseCost(before, after) + (p.kind === 'install' && p.labVirtue?.defId === 'extensive-stores' ? after.yearlyCost : 0);
}

const none = (problem: string): ProjectPlan => ({ target: 0, gain: 0, seasonsLeft: 0, problems: [problem], summary: '' });

export function planLabImprovement(p: LabProject, c: Character, d: DerivedCharacter, ctx: CharacterContext, data: GameData | undefined): ProjectPlan {
  const dl = ctx.lab;
  if (!dl) return none('There is no laboratory to improve: give the character one on the covenant’s Laboratories.');
  if (!data) return none('The lab’s Virtues and Flaws are not loaded.');
  const lab = dl.lab;
  const mt = d.abilities.find((a) => a.abilityId === d.theoryAbility)?.total ?? 0;
  const R = lab.refinement;
  const problems: string[] = [];
  const rm = p.removeUid ? lab.virtues.find((v) => v.uid === p.removeUid) : undefined;
  const rmDef = rm ? data.labVFById.get(rm.defId) : undefined;
  if (p.removeUid && !rmDef) problems.push('What was to be taken out is no longer in the lab.');
  const space = (need: number, what: string) =>
    !dl.boundless && dl.freeSpace < need && problems.push(`${what} takes ${need} point${need === 1 ? '' : 's'} of space and ${lab.name} has ${dl.freeSpace} free (Size + Refinement less Virtue points and Flaw points): raise the Refinement, take a Flaw to balance it on the lab’s card (a Flaw takes effect at once), or move to a bigger lab.`);
  const freed = rmDef?.kind === 'virtue' ? pointsOf(rmDef) : rmDef?.kind === 'flaw' ? -pointsOf(rmDef) : 0;
  let summary = '';
  let seasons = 1;
  let raise = false;
  switch (p.kind) {
    case 'refine': {
      raise = mt >= R + 4;
      if (rmDef?.kind === 'flaw' && rmDef.size === 'Major') problems.push(`${rmDef.name} is a Major Flaw: putting it right takes two seasons of its own.`);
      else if (rmDef?.kind === 'flaw') space(pointsOf(rmDef) - (raise ? 1 : 0), `Putting ${rmDef.name} right`);
      const years = labYears(c);
      summary = raise
        ? `Refinement ${R} → ${R + 1}.${years < R ? ` (The rule of thumb is ${R} year${R === 1 ? '' : 's'} working in it first; the season log shows ${years}.)` : ''}`
        : `The Refinement stays ${R}: raising it to ${R + 1} needs Magic Theory ${R + 4} (yours is ${mt}). The season still sets the lab in order.`;
      summary += ' An Intelligence + Magic Theory stress roll: 12 gains Highly Organized, 15 also finds a Hidden Defect, a botch leaves one; a Tidy roll of 9 gains Spotless.';
      break;
    }
    case 'install': {
      const def = p.labVirtue ? data.labVFById.get(p.labVirtue.defId) : undefined;
      if (!def || def.kind !== 'virtue') return none('Choose the Virtue to install.');
      if (def.size === 'Free' && def.id !== 'spotless') return none(`${def.name} is a Free Virtue: it takes a day or so, not a season, once what it needs is found. Add it on the lab’s card.`);
      seasons = def.size === 'Major' ? 2 : 1;
      if (mt < R + 3) problems.push(`Installing a Virtue needs Magic Theory of at least the Refinement + 3 (${R + 3}); yours is ${mt}.`);
      const already = lab.virtues.filter((v) => v.defId === def.id && v.uid !== rm?.uid).length;
      const max = def.repeatable ? (LAB_OPTIONS[def.id]?.maxTimes ?? Infinity) : 1;
      if (already >= max) problems.push(`${lab.name} already has ${def.name}${max > 1 ? ` ${max === 2 ? 'twice' : `${max} times`}` : ''}.`);
      if (rmDef?.kind === 'flaw') problems.push('A Flaw is put right in a season of its own, or with one raising the Refinement.');
      space(pointsOf(def) - freed, def.name);
      summary = `Install ${def.name} (${def.size}: ${seasons} season${seasons > 1 ? 's' : ''}, ${p.progress}/${seasons} done)${rmDef ? `, taking out ${rmDef.name}` : ''}. ${def.modText}`;
      break;
    }
    case 'repair': {
      if (!rmDef || rmDef.kind !== 'flaw') return none('Choose the Flaw to put right.');
      seasons = rmDef.size === 'Major' ? 2 : 1;
      space(pointsOf(rmDef), `Putting ${rmDef.name} right`);
      summary = `Put ${rmDef.name} right (${rmDef.size}: ${seasons} season${seasons > 1 ? 's' : ''}, ${p.progress}/${seasons} done). Some Flaws come of where the lab is, and cannot be.`;
      break;
    }
  }
  if (rmDef?.kind === 'virtue' && p.kind !== 'repair') summary += ` ${rmDef.name} comes out.`;
  const pounds = poundsFor(dl, deriveLab(labAfter(lab, p, raise), data), p);
  if (pounds) summary += ` It costs ${pounds} pound${pounds === 1 ? '' : 's'}${p.labVirtue?.defId === 'extensive-stores' ? ' (the Upkeep’s rise in build cost, and a year’s maintenance to stock the stores)' : ': the Upkeep rises, and the difference in build cost is paid'}.`;
  return { target: seasons, gain: problems.length ? 0 : 1, seasonsLeft: Math.max(1, seasons - p.progress), problems, summary, pounds: pounds || undefined };
}

/**
 * A season's work improving the lab, once the hazards are rolled: the Refinement raised and its rolls
 * made, the Virtue installed or the Flaw put right when its seasons are done, and anything the Upkeep's
 * rise costs paid from the covenant's treasury (or the purse). Changes the covenant's lab in place.
 */
export function workLabImprovement(p: LabProject, c: Character, d: DerivedCharacter, ctx: CharacterContext, cov: Covenant | undefined, data: GameData, plan: ProjectPlan, rng: Rng, when: { year?: number; season?: string }): string[] {
  const head = `${p.name}:`;
  const lab = cov?.labs.find((l) => l.uid === ctx.lab?.lab.uid);
  if (!lab) return [`${head} the lab is not among the covenant’s: record the change on the lab’s card.`];
  const before = deriveLab(lab, data);
  const lines: string[] = [];
  const def = (v: LabVirtueEntry | undefined) => (v ? data.labVFById.get(v.defId) : undefined);
  const has = (id: string) => lab.virtues.some((v) => v.defId === id);
  const add = (id: string) => lab.virtues.push({ uid: uid(), defId: id });
  const takeOut = () => {
    const v = lab.virtues.find((x) => x.uid === p.removeUid);
    if (!v) return;
    lab.virtues = lab.virtues.filter((x) => x !== v);
    lines.push(`${def(v)?.name ?? 'It'} ${def(v)?.kind === 'flaw' ? 'is put right' : 'comes out'}.`);
  };
  p.progress = Math.min(plan.target, p.progress + 1);
  const finished = p.progress >= plan.target;
  if (p.kind === 'refine') {
    const mt = d.abilities.find((a) => a.abilityId === d.theoryAbility)?.total ?? 0;
    if (mt >= lab.refinement + 4) {
      lab.refinement += 1;
      lines.push(`${lab.name}’s Refinement rises to ${lab.refinement}.`);
    } else lines.push(`${lab.name} is set in order; its Refinement stays ${lab.refinement}.`);
    // an Intelligence + Magic Theory stress roll, the lab's Safety off its botch dice (Covenants)
    const int = d.characteristics.Int.value;
    const r = stressDie(Math.max(0, 1 - before.characteristics.Safety), rng);
    const total = int + mt + r.value;
    const roll = `Intelligence + Magic Theory + stress die (${r.faces.join(', ')}${r.botches ? `; ${r.botches} botch${r.botches > 1 ? 'es' : ''}` : ''}) = ${total}`;
    if (r.botches) {
      add('hidden-defect-flaw');
      lines.push(`${roll}: a botch, and a Hidden Defect is left in the lab (−3 Safety), unseen.`);
    } else {
      const found: string[] = [];
      if (total >= 12 && !has('highly-organized')) (add('highly-organized'), found.push('Highly Organized (+1 General Quality)'));
      if (total >= 15 && has('hidden-defect-flaw')) {
        lab.virtues = lab.virtues.filter((v) => v.defId !== 'hidden-defect-flaw');
        found.push('a Hidden Defect found and corrected');
      }
      lines.push(`${roll}${found.length ? `: ${found.join('; ')}.` : '.'}`);
    }
    const tidy = c.personality.filter((t) => /tidy|neat|orderly|fastidious|clean/i.test(t.trait)).sort((a, b) => b.score - a.score)[0];
    if (tidy && !has('spotless')) {
      const t = stressDie(0, rng, true);
      const ok = t.value + tidy.score >= 9;
      if (ok) add('spotless');
      lines.push(`${tidy.trait} ${tidy.score} + stress die (${t.faces.join(', ')}) = ${t.value + tidy.score}${ok ? ': Spotless (+1 Health, +1 Aesthetics, +1 Creo).' : ', short of 9.'}`);
    }
    takeOut();
    p.done = true;
  } else if (finished) {
    if (p.kind === 'install' && p.labVirtue) {
      takeOut();
      lab.virtues.push({ uid: uid(), defId: p.labVirtue.defId, note: p.labVirtue.note });
      const v = data.labVFById.get(p.labVirtue.defId);
      const choose = [(v?.mods.choicePoints ?? 0) > 0 ? 'its Specialization points' : '', /feature/.test(p.labVirtue.defId) && !p.labVirtue.note ? 'which feature it is' : ''].filter(Boolean);
      lines.push(`${v?.name ?? 'The Virtue'} is installed in ${lab.name}.${choose.length ? ` Choose ${choose.join(' and ')} on the lab’s card.` : ''}`);
    } else takeOut();
    p.done = true;
  } else lines.push(`${p.progress} of ${plan.target} seasons done.`);
  if (p.done) {
    const pounds = poundsFor(before, deriveLab(lab, data), p);
    if (pounds) {
      const fromCov = p.visFrom !== 'purse';
      const text = `${lab.name}: ${pounds} pound${pounds === 1 ? '' : 's'} for the change to the lab (${p.name})`;
      if (fromCov) {
        cov!.finances.treasury -= pounds;
        cov!.log.push({ uid: uid(), year: when.year ?? 0, season: when.season, text, treasuryDelta: -pounds });
      } else {
        const purse = purseOf(c);
        purse.pounds -= pounds;
        (purse.log ??= []).push({ year: when.year ?? 0, season: (when.season ?? 'Spring') as Season, text, pounds: -pounds });
      }
      lines.push(`${pounds} pound${pounds === 1 ? '' : 's'} paid from ${fromCov ? 'the covenant’s treasury' : 'the purse'}${(fromCov ? cov!.finances.treasury : purseOf(c).pounds) < 0 ? ', which is now in debt' : ''}.`);
    }
  }
  return lines.map((l, i) => (i ? l : `${head} ${l}`));
}
