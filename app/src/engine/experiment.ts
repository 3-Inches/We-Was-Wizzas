// Arcane Experimentation (DE, Arcane Experimentation and Arcane Discovery): the Lab Total bonus
// and the Extraordinary Results Chart with its sub-tables, rolled.

import { defaultRng, describeStress, simpleDie, stressDie, type Rng } from './dice';

export interface ExperimentOptions {
  /** the risk modifier, 0 to 3 */
  risk: number;
  /** the laboratory's aura: each point is an extra botch die on the chart, whatever its realm */
  auraStrength: number;
  /** original research for a Breakthrough: the risk modifier is not added to the Lab Total but may move the chart roll onto Discovery */
  originalResearch?: boolean;
  /** the project is an enchanted item or a familiar (a Complete Failure may destroy it) */
  enchantment?: boolean;
  /** the laboratory's Safety, taken off the chart's botch dice; a negative Safety adds them (Covenants, Laboratories) */
  safety?: number;
  /** a familiar's golden cord: fewer botch dice, never down to none (DE, The Three Cords) */
  goldenCord?: number;
}

export interface ExperimentResult {
  /** added to the Lab Total for the season */
  labBonus: number;
  /** what happened, one line per result, in the book's words where it matters */
  lines: string[];
  disaster: boolean;
  /** Warping Points each person in the laboratory gains from a Disaster (one per zero) */
  warpingPoints: number;
  /** a Discovery came up (for original research, the season yields breakthrough points) */
  discovery: boolean;
  /** No Benefit: the season's Lab Total is worked out again without the simple die and risk */
  noBenefit: boolean;
  /** Complete Failure, or a Disaster: the season is wasted */
  wasted: boolean;
  /** the item or familiar is destroyed (a 0 after a Complete Failure, or two zeroes in a Disaster) */
  destroyed: boolean;
}

/** The most risk an original researcher may take: +1 per 5 points (or fraction) of Magic Theory, up to +3. */
export function researchRiskLimit(magicTheory: number): number {
  return Math.min(3, Math.max(0, Math.ceil(magicTheory / 5)));
}

/** Botch dice on the Extraordinary Results Chart: one, plus the risk modifier and the aura, less Safety and the golden cord. */
export function experimentBotchDice(o: ExperimentOptions): number {
  const n = Math.max(0, 1 + Math.max(0, Math.min(3, o.risk)) + Math.max(0, o.auraStrength) - (o.safety ?? 0));
  return n > 1 ? Math.max(1, n - (o.goldenCord ?? 0)) : n;
}

const DISASTER = [
  'Everyone in the lab gains Warping Points equal to the number of zeroes on the botch roll; Hermetic magi who gain two or more roll for Twilight. The season is wasted (Complete Failure).',
  'Your creation is destroyed.',
  'Your laboratory gains the Damaged Flaw.',
  'Explosion! The laboratory gains the Wrecked Flaw instead, and everyone in it takes two Heavy Wounds.',
  'The storyguide picks: a story event that threatens the whole covenant, or the laboratory is destroyed outright (rebuilt from nothing, with the Deformed and Unstable Flaws) and everyone in it takes an Incapacitating Wound as well.',
];

function sideEffect(n: number): string {
  if (n === 1) return 'Your sigil is exaggerated to many times its normal strength.';
  if (n <= 3) return 'A minor flaw.';
  if (n <= 5) return 'A minor side effect.';
  if (n === 6) return 'A minor side benefit.';
  if (n === 7) return 'A major flaw.';
  if (n === 8) return 'A major side effect.';
  if (n === 9) return 'A major side benefit.';
  return 'A fatal flaw.';
}

function modified(n: number): string {
  if (n <= 3) return 'The effect is reduced in Range, Duration, Target or potency.';
  if (n <= 6) return 'The effect’s Range, Duration, Target or potency is increased.';
  if (n <= 8) return 'The use of the effect is restricted (it fails in certain circumstances).';
  if (n <= 10) return 'The actual effect is modified.';
  return 'The effect is changed completely (same Technique and Form, similar level).';
}

function discoveryGain(n: number): string {
  if (n <= 4) return '15 experience points in Magic Theory.';
  if (n <= 6) return '15 experience points in an Ability related to the experiment.';
  if (n <= 8) return '3 experience points in one of the Arts used.';
  return 'Enough experience to raise one of the Arts used to its next level (at least 3 experience points).';
}

/** One season of experimentation: the Lab Total bonus and a roll on the Extraordinary Results Chart. */
export function rollExperiment(o: ExperimentOptions, rng: Rng = defaultRng): ExperimentResult {
  const risk = Math.max(0, Math.min(3, o.risk));
  const die = simpleDie(rng).value;
  const labBonus = o.originalResearch ? die : die + risk;
  const lines: string[] = [
    `Lab Total +${labBonus} (simple die ${die}${!o.originalResearch && risk ? ` + risk ${risk}` : ''}).`,
  ];
  let disaster = false;
  let discovery = false;
  let noBenefit = false;
  let wasted = false;
  let destroyed = false;
  let warpingPoints = 0;

  const chart = (depth: number) => {
    const r = stressDie(experimentBotchDice(o), rng);
    if (r.botches) {
      disaster = true;
      wasted = true;
      if (r.botches >= 2 && o.enchantment) destroyed = true;
      warpingPoints += r.botches;
      lines.push(`Chart: ${describeStress(r)}. Disaster, with ${r.botches} zero${r.botches > 1 ? 'es' : ''}:`);
      for (let i = 0; i < Math.min(r.botches, DISASTER.length); i++) lines.push(`  ${i + 1}. ${DISASTER[i]}`);
      return;
    }
    const v = r.value + risk;
    const head = `Chart: ${describeStress(r)}${risk ? ` + risk ${risk}` : ''} = ${v}.`;
    if (o.originalResearch && v !== 10 && Math.abs(10 - v) <= risk) {
      discovery = true;
      lines.push(`${head} You may ${v < 10 ? 'add' : 'subtract'} ${Math.abs(10 - v)} of your risk modifier for a Discovery as well (and must adjust every later season of this project the same way).`);
    }
    if (v <= 4) lines.push(`${head} No extraordinary effects.`);
    else if (v <= 6) {
      const s = simpleDie(rng).value;
      lines.push(`${head} Side effect (simple die ${s}): ${sideEffect(s)} Work out the specifics with the storyguide.`);
    } else if (v === 7) {
      noBenefit = true;
      lines.push(`${head} No benefit: recalculate the Lab Total without the experimentation bonus; if it is now too low, the project is abandoned.`);
    } else if (v === 8) {
      const s = simpleDie(rng);
      wasted = true;
      if (o.enchantment && s.face === 0) destroyed = true;
      lines.push(`${head} Complete failure: the season is wasted.${o.enchantment ? ` Simple die for the item or familiar: ${s.face}${s.face === 0 ? ', a 0: it is destroyed.' : ', it survives.'}` : ''}`);
    } else if (v === 9) lines.push(`${head} Special or story event: extra vis, a bonus spell, a strange modification or a story, as the storyguide picks.`);
    else if (v === 10) {
      discovery = true;
      if (o.originalResearch) lines.push(`${head} Discovery: the original research succeeds this season.`);
      else {
        const gain = (n: number) => `${discoveryGain(n)}`;
        const s = simpleDie(rng).value + risk;
        if (s >= 10) {
          const a = simpleDie(rng).value + risk;
          const b = simpleDie(rng).value + risk;
          lines.push(`${head} Discovery (${s}, roll twice): ${gain(Math.min(a, 9))} ${gain(Math.min(b, 9))}`);
        } else lines.push(`${head} Discovery (${s}): ${gain(s)}`);
      }
    } else if (v === 11) {
      const s = simpleDie(rng).value + risk;
      lines.push(`${head} Modified effect (${s}): ${modified(s)}`);
    } else {
      lines.push(`${head} Roll twice more on the chart.`);
      if (depth < 4) {
        chart(depth + 1);
        chart(depth + 1);
      }
    }
  };
  chart(0);
  return { labBonus, lines, disaster, warpingPoints, discovery, noBenefit, wasted, destroyed };
}

/**
 * What a season of work in the lab risks from the lab itself (Covenants, Laboratory Characteristics).
 * An unsafe lab (negative Safety): a simple die of no more than the Safety (ignoring its sign) calls
 * for botch dice, as many as the Safety and never none, and a zero is a lab accident on the Disaster
 * table. A lab with Warping: a simple die of no more than its Warping warps the season's product, a
 * side effect on an odd roll and a modified effect on an even one.
 */
export function labSeasonHazards(o: { safety: number; warping: number; enchantment?: boolean }, rng: Rng = defaultRng): { lines: string[]; warpingPoints: number; wasted: boolean; destroyed: boolean } {
  const lines: string[] = [];
  let warpingPoints = 0;
  let wasted = false;
  let destroyed = false;
  if (o.safety < 0) {
    const die = simpleDie(rng).value;
    const unsafe = -o.safety;
    if (die <= unsafe) {
      const n = Math.max(1, unsafe);
      let zeros = 0;
      for (let i = 0; i < n; i++) if (simpleDie(rng).face === 0) zeros++;
      if (zeros) {
        warpingPoints += zeros;
        wasted = true;
        if (zeros >= 2 && o.enchantment) destroyed = true;
        lines.push(`Unsafe lab (Safety ${o.safety}): simple die ${die}, then ${n} botch ${n > 1 ? 'dice' : 'die'}: ${zeros} zero${zeros > 1 ? 'es' : ''}, a lab accident:`);
        for (let i = 0; i < Math.min(zeros, DISASTER.length); i++) lines.push(`  ${i + 1}. ${DISASTER[i]}`);
      } else lines.push(`Unsafe lab (Safety ${o.safety}): simple die ${die}, a near miss (no zero on ${n} botch ${n > 1 ? 'dice' : 'die'}).`);
    }
  }
  if (o.warping > 0) {
    const die = simpleDie(rng).value;
    if (die <= o.warping) {
      const s = simpleDie(rng).value;
      lines.push(
        die % 2
          ? `Lab Warping ${o.warping} (simple die ${die}, odd): the season's work has a side effect (${s}): ${sideEffect(s)} The storyguide fits it to what warps the lab.`
          : `Lab Warping ${o.warping} (simple die ${die}, even): the season's work is modified (${s}): ${modified(s)} The storyguide fits it to what warps the lab.`,
      );
    }
  }
  return { lines, warpingPoints, wasted, destroyed };
}

/**
 * Stabilizing a Discovery in original research (Houses of Hermes: True Lineages, Stabilizing the
 * Unknown): the experiment is repeated with the same Lab Total and risk, and the chart roll moved the
 * same way as for the Discovery. Any result but Disaster, No Benefit or Complete Failure stabilizes
 * it. Either way the magus gains the effect's magnitude less a simple die in Warping Points.
 */
export function rollStabilization(o: ExperimentOptions & { adjust: number; magnitude: number }, rng: Rng = defaultRng): { stable: boolean; warpingPoints: number; lines: string[] } {
  const risk = Math.max(0, Math.min(3, o.risk));
  const adjust = Math.max(-risk, Math.min(risk, o.adjust));
  const lines: string[] = [];
  let stable = true;
  const chart = (depth: number) => {
    const r = stressDie(experimentBotchDice(o), rng);
    if (r.botches) {
      stable = false;
      lines.push(`Chart: ${describeStress(r)}. Disaster: the Discovery cannot be stabilized.`);
      return;
    }
    const v = r.value + risk + adjust;
    const head = `Chart: ${describeStress(r)}${risk ? ` + risk ${risk}` : ''}${adjust ? ` ${adjust > 0 ? '+' : '−'} ${Math.abs(adjust)} as at the Discovery` : ''} = ${v}.`;
    if (v === 7 || v === 8) {
      stable = false;
      lines.push(`${head} ${v === 7 ? 'No Benefit' : 'Complete Failure'}: the Discovery is not stabilized this season.`);
    } else if (v >= 12 && depth < 4) {
      lines.push(`${head} Roll twice more.`);
      chart(depth + 1);
      chart(depth + 1);
    } else lines.push(`${head} No harm done.`);
  };
  chart(0);
  const die = simpleDie(rng).value;
  const warpingPoints = Math.max(0, o.magnitude - die);
  lines.push(`Warping: magnitude ${o.magnitude} − simple die ${die} = ${warpingPoints}.`);
  return { stable, warpingPoints, lines };
}

/** Points a researcher has toward a Breakthrough, and the book's rough guide to how many it takes. */
export const BREAKTHROUGH_GUIDE: Record<'minor' | 'major' | 'hermetic', { label: string; points: number }> = {
  minor: { label: 'Minor Breakthrough', points: 30 },
  major: { label: 'Major Breakthrough', points: 45 },
  hermetic: { label: 'Hermetic Breakthrough', points: 60 },
};
