// Agencies (Houses of Hermes: Societates, Appendix: Agencies): the agents a character controls, how
// many they can manage, recruiting them by wearing down their Resistance, strengthening their Bond,
// and the persuasion roll that sets one to a task.

import { abilityTotal, type DerivedCharacter } from './character/derive';
import { defaultRng, describeStress, simpleDie, stressDie, type Rng } from './dice';
import type { Agent, Season, TribunalNews } from './types';
import { uid } from '../util/id';

const ability = abilityTotal;

/** Agents a character can control directly: 2 × (Presence + Intrigue or Leadership − the Gift's social penalty), at least one. */
export function maxAgents(d: DerivedCharacter): number {
  const pre = d.characteristics.Pre.value;
  const best = Math.max(ability(d, 'intrigue'), ability(d, 'leadership'));
  return Math.max(1, 2 * (pre + best + d.socialPenalty));
}

/** Resistance of a would-be agent by Social Status (Resistance of Agents table). */
export const STATUS_RESISTANCE: { label: string; value: number }[] = [
  { label: 'Major Social Virtue (Landed Noble, Redcap…)', value: 3 },
  { label: 'Minor Social Virtue (Clerk, Knight, Priest…)', value: 1 },
  { label: 'Free Social Status (Covenfolk, Craftsman, Merchant, Peasant…)', value: 0 },
  { label: 'Minor Social Flaw (Branded Criminal, Outcast, Outlaw Leader)', value: -1 },
  { label: 'Major Social Flaw (Outlaw, Outsider)', value: -3 },
];

/** What changes a would-be agent's Resistance (Resistance of Agents: Modifiers and Resources); it is never below 1. */
export const RESISTANCE_MODIFIERS: { label: string; value: number }[] = [
  { label: 'Major Flaws likely to inconvenience the principal (Enemies, Feud, Lycanthrope…)', value: -3 },
  { label: 'Minor Flaws likely to inconvenience the principal (Black Sheep, Dark Secret, Dependant…)', value: -1 },
  { label: 'A Minor Flaw the principal uses to dominate them (a hostage, blackmail): they hate the principal', value: -6 },
  { label: 'Extraordinary skill: main Ability 6 or more', value: 1 },
  { label: 'Exceptional skill: main Ability 8 or more', value: 3 },
  { label: 'A Minor General or Supernatural Virtue (Gossip, Social Contacts, Temporal Influence…)', value: 1 },
  { label: 'A Major General or Supernatural Virtue (Entrancement, True Faith, Wealthy…)', value: 3 },
  { label: 'Serves a rival covenant', value: 9 },
  { label: 'Underlings: up to half a dozen people', value: 1 },
  { label: 'Many underlings: up to two dozen', value: 3 },
  { label: 'A useful Minor Flaw (Busybody, Faerie Friend, Mentor…)', value: 1 },
  { label: 'More than three of these resources', value: 6 },
  { label: 'More than six of these resources', value: 9 },
];

/** The Virtues and Flaws that bring an agency at creation, bought with twelve agency points. */
export const AGENCY_VIRTUES = ['social-contacts', 'mercenary-captain', 'outlaw-leader-flaw', 'close-family-ties-flaw', 'landed-noble'];
export const AGENCY_POINTS = 12;

/** What an agent of the starting agency costs: their Bond + their Resistance Strength from the table, at least 1. */
export function agencyCost(a: Agent): number {
  return Math.max(1, a.bond + (a.strength ?? 0));
}

/**
 * Impressing a would-be agent, before they can be recruited: Presence + Leadership − the Gift's social
 * penalty + a stress die against 6 (more by the Bond they had with a former principal, for an agency
 * inherited). On a failure the principal may not try again until another story brings them together.
 */
export function impressRoll(d: DerivedCharacter, formerBond = 0, rng: Rng = defaultRng) {
  const parts = [
    { label: 'Presence', value: d.characteristics.Pre.value },
    { label: 'Leadership', value: ability(d, 'leadership') },
    ...(d.socialPenalty ? [{ label: 'The Gift', value: d.socialPenalty }] : []),
  ];
  const ease = 6 + formerBond;
  const r = stressDie(1, rng);
  const base = parts.reduce((s, p) => s + p.value, 0);
  const total = r.botches ? 0 : r.value + base;
  const ok = !r.botches && total >= ease;
  return {
    ok, total, ease, base: r.botches ? base : total, ...(r.botches ? { faces: r.botchFaces } : {}),
    text: `stress die ${describeStress(r)} + ${parts.map((p) => `${p.label} ${p.value}`).join(', ')} = ${r.botches ? 'botch' : total} against ${ease}: ${ok ? 'a favorable impression: recruiting may begin' : 'no impression: try again after another story brings them together'}.`,
  };
}

/** What an agent may be asked (Tasks for Agents): the persuasion roll's Ease Factor. */
export const AGENT_TASKS: { label: string; ease: number }[] = [
  { label: 'Common information, easily obtained', ease: 3 },
  { label: 'Sensitive information, difficult to obtain', ease: 6 },
  { label: 'Secret information, known to a select few', ease: 9 },
  { label: 'An Easy task (Ease Factor 6)', ease: 3 },
  { label: 'A Hard task (Ease Factor 12)', ease: 6 },
  { label: 'An Impressive task (Ease Factor 18)', ease: 9 },
];
export const AGENT_TIMEFRAMES: { label: string; mod: number }[] = [
  { label: 'within a few weeks', mod: 0 },
  { label: 'within a few days', mod: 1 },
  { label: 'within a day', mod: 3 },
];
/** The risk to the agent: the Ease Factor rises and the roll takes botch dice (no risk: a simple die). */
export const AGENT_RISKS: { label: string; mod: number; botch: number | null }[] = [
  { label: 'no risk to the agent', mod: 0, botch: null },
  { label: 'risk of embarrassment', mod: 1, botch: 1 },
  { label: 'risk of injury or prison', mod: 3, botch: 3 },
  { label: 'risk of death', mod: 6, botch: 5 },
];

/**
 * The persuasion roll: Communication + Charm, Intrigue or Leadership + Bond − the Gift's social penalty
 * + a die, against the task's Ease Factor with its timeframe and risk.
 */
export function persuasionRoll(d: DerivedCharacter, agent: Agent, task: number, timeframe: number, risk: number, rng: Rng = defaultRng) {
  const t = AGENT_TASKS[task];
  const tf = AGENT_TIMEFRAMES[timeframe];
  const rk = AGENT_RISKS[risk];
  const skill = (['charm', 'intrigue', 'leadership'] as const).map((id) => ({ id, v: ability(d, id) })).sort((a, b) => b.v - a.v)[0];
  const parts = [
    { label: 'Communication', value: d.characteristics.Com.value },
    { label: skill.id[0].toUpperCase() + skill.id.slice(1), value: skill.v },
    { label: 'Bond', value: agent.bond },
    ...(d.socialPenalty ? [{ label: 'The Gift', value: d.socialPenalty }] : []),
  ];
  const ease = t.ease + tf.mod + rk.mod;
  const base = parts.reduce((s, p) => s + p.value, 0);
  if (agent.bond < 1) return { ok: false, total: 0, ease, base: 0, text: `${agent.name || 'The agent'} needs a Bond of at least +1 before being asked anything.` };
  let die: number;
  let dieText: string;
  let botch = false;
  let faces: number[] | undefined;
  if (rk.botch === null) {
    const r = simpleDie(rng);
    die = r.value;
    dieText = `simple die ${r.value}`;
  } else {
    const r = stressDie(rk.botch, rng);
    die = r.value;
    botch = r.botches > 0;
    if (botch) faces = r.botchFaces;
    dieText = `stress die ${describeStress(r)}`;
  }
  const total = botch ? 0 : die + base;
  const ok = !botch && total >= ease;
  return {
    ok, total, ease, base: botch ? base : total, ...(faces ? { faces } : {}),
    text: `${dieText} + ${parts.map((p) => `${p.label} ${p.value}`).join(', ')} = ${botch ? 'botch' : total} against ${ease} (${t.label}, ${tf.label}, ${rk.label}): ${botch ? 'a botch: the request goes badly wrong' : ok ? 'the agent agrees' : 'the agent refuses'}.`,
  };
}

/**
 * Agency experience on an agent: while recruiting, it wears down the Resistance (the Resistance's
 * current value in points to lower it by one); once recruited, it raises the Bond as an Art rises
 * (the next score in points). Changes the agent; returns what happened.
 */
export function addAgencyXp(agent: Agent, xp: number): string {
  let left = (agent.xp ?? 0) + xp;
  const was = { resistance: agent.resistance, bond: agent.bond };
  while (agent.resistance > 0 && left >= agent.resistance) {
    left -= agent.resistance;
    agent.resistance -= 1;
  }
  if (agent.resistance <= 0) {
    while (agent.bond < 6 && left >= agent.bond + 1) {
      left -= agent.bond + 1;
      agent.bond += 1;
    }
  }
  agent.xp = left;
  const bits: string[] = [];
  if (agent.resistance !== was.resistance) bits.push(agent.resistance > 0 ? `Resistance ${was.resistance} → ${agent.resistance}` : 'Resistance worn down: recruited');
  if (agent.bond !== was.bond) bits.push(`Bond ${was.bond} → ${agent.bond}`);
  return `${agent.name || 'The agent'}: ${bits.join(', ') || 'no change yet'}${left ? ` (${left} point${left === 1 ? '' : 's'} carried toward the next)` : ''}.`;
}

/** Gifts of money: a pound is worth 5 agency experience points, but money alone never takes a Bond above +3. */
export function giftToAgent(agent: Agent, pounds: number): string {
  if (agent.resistance > 0) return `${agent.name || 'The agent'} is not recruited yet: money does not wear down Resistance.`;
  if (agent.bond >= 3) return `${agent.name || 'The agent'}'s Bond is +${agent.bond}: money cannot raise it further.`;
  const before = agent.bond;
  const text = addAgencyXp(agent, Math.round(pounds * 5));
  if (agent.bond > 3) {
    agent.bond = 3;
    agent.xp = 0;
  }
  return agent.bond > before ? text.replace(/Bond \d+ → \d+/, `Bond ${before} → ${agent.bond}`) : text;
}

// ------------------------------------------------------------------------------ what the agents hear

/** What an agent of each walk of life tends to hear in a season, when the Tribunal gives them nothing better. */
const RUMORS: { match: RegExp; heard: string[] }[] = [
  { match: /noble|knight|landed|lord/i, heard: ['the local lord is quarrelling with the bishop over a mill and a stretch of river', 'a marriage is being arranged between two noble houses, and land will change hands with it', 'the count is raising men for a feud in the spring'] },
  { match: /priest|clerk|monk|friar|clergy|church/i, heard: ['the bishop means to visit the parishes near the covenant this year', 'a relic has been brought to the abbey, and pilgrims are coming to see it', 'the friars are preaching against sorcery in the market towns'] },
  { match: /merchant|craftsman|guild|trader/i, heard: ['the price of grain will rise: the harvest failed to the south', 'a new toll has been set on the river, and the merchants are furious', 'a company of Italian bankers is lending money in the city'] },
  { match: /outlaw|criminal|outcast|thief/i, heard: ['a band of brigands has taken to the forest road', 'someone is paying well for news of who comes and goes at the covenant', 'the sheriff’s men are hunting a deserter in the hills'] },
  { match: /redcap/i, heard: ['a Quaesitor has been asking questions at a covenant nearby', 'letters are going back and forth between two covenants that were never friends'] },
];
const COMMON = ['a peddler swore there were lights in the old ruins by night', 'the village headman is stealing from the tithe', 'two families in the village are on the verge of a feud', 'a stranger has been asking about the covenant at the inn'];

/** A line from the Tribunal's own record worth an agent's report: the living covenants' season, not their routine. */
const WORTH = /invent|enchant|bound|familiar|apprentice|Gauntlet|certamen|Twilight|died|death|wizard|vote|motion|longevity|Breakthrough|discover|feud|quarrel|hired|left|sold|bought|traded|theft|stole|raid|crisis|archmag|master/i;

/**
 * What the players' agents bring at the end of a season (Houses of Hermes: Societates, Agencies: an
 * agent watches and listens for the principal). Each agent bound to a principal (Bond +1 or more) may
 * hear something, the more likely the stronger the Bond: from the Tribunal's covenants' own business
 * this season (what a Redcap would never tell), else what their walk of life hears. Returns news items.
 */
export function agentReports(
  principals: { id: string; name: string; agents: Agent[] }[],
  tribunalLines: { who?: string; text: string; covenant?: string }[],
  year: number,
  season: Season,
  rng: Rng = defaultRng,
): TribunalNews[] {
  const pool = tribunalLines.filter((l) => l.who && WORTH.test(l.text));
  const out: TribunalNews[] = [];
  for (const p of principals)
    for (const a of p.agents) {
      if (a.resistance > 0 || a.bond < 1) continue;
      if (rng() > 0.35 + 0.1 * a.bond) continue;
      const agent = a.name || 'An agent';
      let text: string;
      if (pool.length && rng() < 0.6) {
        const l = pool.splice(Math.floor(rng() * pool.length), 1)[0];
        text = `${agent}, ${p.name}’s agent, heard of ${l.covenant ? `${l.covenant}’s business` : 'the Tribunal’s business'}: ${l.who} — ${l.text.replace(/\.$/, '')}.`;
      } else {
        const r = RUMORS.find((x) => x.match.test(`${a.status} ${a.role ?? ''}`));
        const heard = r && rng() < 0.7 ? r.heard : COMMON;
        text = `${agent}, ${p.name}’s agent, sends word that ${heard[Math.floor(rng() * heard.length)]}.`;
      }
      out.push({ uid: uid(), year, season, kind: 'report', text, characterId: p.id, agent: agent });
    }
  return out;
}
