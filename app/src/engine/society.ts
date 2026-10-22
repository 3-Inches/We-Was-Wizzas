// Society and influence: guild membership (City & Guild, ch.3 Guilds), petitioning the Church (The
// Church, Petitioning the Church), quick court decisions (City & Guild, Court Decisions), etiquette
// (Houses of Hermes: Societates, Etiquette), and debate (Societates, The Fine Art of Debate).

import type { DerivedCharacter } from './character/derive';
import { certamenFatigue } from './magic';
import { defaultRng, describeStress, stressDie, type Rng } from './dice';
import type { Character } from './types';

const score = (d: DerivedCharacter, id: string) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0);
const roll = (botch = 1, rng: Rng = defaultRng) => stressDie(botch, rng);

// ================================================================ guilds

export type GuildRank = 'apprentice' | 'journeyman' | 'master' | 'senior' | 'dean';

/** Each rank: its Social Status Virtue, the Guild Lore it needs, and what it brings. */
export const GUILD_RANKS: Record<GuildRank, { label: string; virtue: string; lore: number; note: string }> = {
  apprentice: { label: 'Apprentice', virtue: 'guild-apprentice', lore: 0, note: 'Seven years living with the master; an apprentice piece ends it.' },
  journeyman: { label: 'Journeyman', virtue: 'journeyman', lore: 1, note: 'Works for a master under a contract, with a maker’s stamp; pays yearly dues or is expelled.' },
  master: { label: 'Guild master', virtue: 'guild-master', lore: 2, note: 'Keeps a workshop and employs up to Leadership apprentices and journeymen (3 Labor Points lost for each one short); needs Artes Liberales for the guild’s documents; pays yearly dues.' },
  senior: { label: 'Senior master', virtue: 'guild-master', lore: 3, note: 'Ten years a master: may run a second workshop, vote on new masters, and serve six-month terms as a guild official or inquisitor.' },
  dean: { label: 'Dean', virtue: 'guild-dean', lore: 3, note: 'Represents the guild; a stipend of 20 to 40 pounds a year.' },
};

/** The rank a character holds: earned in play, else from the guild Social Status Virtue. */
export function guildRank(c: Character): GuildRank | undefined {
  if (c.guild?.rank) return c.guild.rank;
  const has = (id: string) => c.virtues.some((v) => v.defId === id);
  if (has('guild-dean')) return 'dean';
  if (has('guild-master')) return 'master';
  if (has('journeyman')) return 'journeyman';
  if (has('guild-apprentice')) return 'apprentice';
  return undefined;
}

/** Guild Lore: an (Organization) Lore for the guild. */
export function guildLore(d: DerivedCharacter, guild?: string): number {
  const g = (guild ?? '').toLowerCase();
  return d.abilities
    .filter((a) => a.abilityId.startsWith('organization-lore') && (/guild/i.test(a.name) || (!!g && a.name.toLowerCase().includes(g))))
    .reduce((m, a) => Math.max(m, a.total), 0);
}

/** Apprentice piece: Craft + Primary Characteristic + stress die against 9. Failing it at 20 means dismissal (Incompetent 3). */
export function apprenticePiece(craft: number, primary: number, rng: Rng = defaultRng) {
  const r = roll(1, rng);
  const total = craft + primary + r.value;
  const ok = !r.botches && total >= 9;
  return { ok, total, text: `Apprentice piece: Craft ${craft} + Characteristic ${primary} + ${describeStress(r)} = ${total} vs 9: ${ok ? 'passed; a journeyman' : 'not yet (another season)'}.` };
}

/** A journeyman's contract: Com + Bargain + age/10 (rounded up) + modifiers + stress die; the result sets the Labor Points. */
export function journeymanContract(o: { com: number; bargain: number; age: number; craft: number; relationship: -1 | 0 | 1; fined: boolean }, rng: Rng = defaultRng) {
  const r = roll(1, rng);
  const mods = o.relationship + (o.craft >= 8 ? 2 : o.craft >= 6 ? 1 : 0) + (o.fined ? -2 : 0);
  const total = o.com + o.bargain + Math.ceil(o.age / 10) + mods + r.value;
  const refused = r.botches > 0;
  const lp = refused ? null : total >= 15 ? 2 : total >= 12 ? 1 : total >= 9 ? 0 : total >= 6 ? -1 : -2;
  return {
    total, lp,
    text: `Contract: Com ${o.com} + Bargain ${o.bargain} + age ${Math.ceil(o.age / 10)}${mods ? ` ${mods > 0 ? '+' : '−'} ${Math.abs(mods)}` : ''} + ${describeStress(r)} = ${total}: ${refused ? 'the master refuses the contract' : `${lp! >= 0 ? '+' : ''}${lp} Labor Points a season`}.`,
  };
}

// ================================================================ the Church

/** Example petitions by Ease Factor (The Church). */
export const PETITIONS: { ease: number; text: string }[] = [
  { ease: 3, text: 'a marriage blessing' },
  { ease: 6, text: 'access to the parish crypt or library; last rites far away; a child into the parish school; a pilgrim’s letter of safe passage' },
  { ease: 9, text: 'access to the cathedral library; annul a commoner’s marriage; a vacant benefice; help a Quaesitor’s investigation; exhume a corpse; excommunicate a freeman' },
  { ease: 12, text: 'excommunicate a magus or a priest; move a church; rent land to a Hermetic covenant' },
  { ease: 15, text: 'consecrate a parish church; excommunicate a nobleman; interdict a town' },
  { ease: 18, text: 'appeal a bishop’s election; establish a monastery' },
  { ease: 21, text: 'create a diocese; crown a king; excommunicate a bishop' },
  { ease: 24, text: 'change canon law; interdict a kingdom' },
  { ease: 30, text: 'declare a saint' },
  { ease: 42, text: 'call a crusade; found a religious order' },
];

/** Support for a petition. Clergy and lay supporters count only the highest of each. */
export const PETITION_CLERGY = [
  { label: 'none', value: 0 },
  { label: 'a priest or deacon', value: 1 },
  { label: 'a bishop, abbot or archdeacon', value: 3 },
  { label: 'an archbishop or higher', value: 6 },
];
export const PETITION_LAY = [
  { label: 'none', value: 0 },
  { label: 'a knight', value: 1 },
  { label: 'a baron or count', value: 3 },
  { label: 'a king, duke or emperor', value: 6 },
];

/** Church Lore: an (Organization) Lore of the Church. */
export function churchLore(d: DerivedCharacter): number {
  return d.abilities.filter((a) => a.abilityId.startsWith('organization-lore') && /church/i.test(a.name)).reduce((m, a) => Math.max(m, a.total), 0);
}

/** Written: Com + Church Lore; in audience: Pre + Church Lore, with the Gift’s penalty. No die. */
export function petitionTotal(d: DerivedCharacter, audience: boolean, support: number) {
  const ch = audience ? d.characteristics.Pre.value : d.characteristics.Com.value;
  const gift = audience ? d.socialPenalty : 0;
  return { total: ch + churchLore(d) + gift + support, ch, lore: churchLore(d), gift };
}

/** An argument for a petition: Int + the Ability + stress die against 9; its bonus counts, or on a botch counts against. */
export function petitionArgument(int: number, ability: number, bonus: number, rng: Rng = defaultRng) {
  const r = roll(1, rng);
  const total = int + ability + r.value;
  const value = r.botches ? -bonus : total >= 9 ? bonus : 0;
  return { value, text: `Argument: Int ${int} + ${ability} + ${describeStress(r)} = ${total} vs 9: ${r.botches ? `botch, −${bonus}` : value ? `+${bonus}` : 'no help'}.` };
}

// ================================================================ the courts

/** A quick trial: Com + Civil and Canon Law (Common Law in England) + stress die against 6, with the Gift’s penalty. */
export function courtDecision(d: DerivedCharacter, o: { innocent: boolean; badReputation: boolean; witnessesAgainst: boolean; ability?: number }, rng: Rng = defaultRng) {
  const law = o.ability ?? score(d, 'civil-and-canon-law');
  const ease = 6 + (o.innocent ? -3 : 0) + (o.badReputation ? 3 : 0) + (o.witnessesAgainst ? 3 : 0);
  const r = roll(1, rng);
  const total = d.characteristics.Com.value + law + d.socialPenalty + r.value;
  const ok = !r.botches && total >= ease;
  return { ok, text: `Trial: Com ${d.characteristics.Com.value} + Law ${law}${d.socialPenalty ? ` ${d.socialPenalty}` : ''} + ${describeStress(r)} = ${total} vs ${ease}: ${ok ? 'found innocent' : 'found guilty'}.` };
}

// ================================================================ etiquette

/** An etiquette performance: Com + Etiquette + bonus (gifts, money, up to Etiquette) − the duel’s penalties + stress die. */
export function etiquetteRoll(d: DerivedCharacter, ease: number, bonus: number, penalty: number, rng: Rng = defaultRng) {
  const et = score(d, 'etiquette');
  const b = Math.min(bonus, Math.max(et, 0));
  const r = roll(1, rng);
  const total = d.characteristics.Com.value + et + b - penalty + r.value;
  const ok = !r.botches && total >= ease;
  return { ok, total, botch: r.botches > 0, text: `Etiquette: Com ${d.characteristics.Com.value} + Etiquette ${et}${b ? ` + ${b}` : ''}${penalty ? ` − ${penalty}` : ''} + ${describeStress(r)} = ${total} vs ${ease}: ${r.botches ? 'a serious faux pas' : ok ? 'a fine performance' : 'a poor but forgivable one'}.` };
}

// ================================================================ debate

export const DEBATE_ATTACK = ['folk-ken', 'intrigue', 'artes-liberales'] as const;
export const DEBATE_DEFENSE = ['charm', 'guile', 'leadership'] as const;
export type DebateAttack = (typeof DEBATE_ATTACK)[number];
export type DebateDefense = (typeof DEBATE_DEFENSE)[number];
export const DEBATE_NAMES: Record<string, string> = { 'folk-ken': 'Folk Ken', intrigue: 'Intrigue', 'artes-liberales': 'Artes Liberales', charm: 'Charm', guile: 'Guile', leadership: 'Leadership' };
const MOD: Record<DebateAttack, Record<DebateDefense, number>> = {
  'folk-ken': { charm: 3, guile: -3, leadership: 0 },
  intrigue: { charm: 0, guile: 3, leadership: -3 },
  'artes-liberales': { charm: -3, guile: 0, leadership: 3 },
};

export interface Debater {
  name: string;
  per: number;
  com: number;
  int: number;
  pre: number;
  abilities: Record<string, number>;
  /** highest positive Reputation + Confidence (+3 Strong-Willed) */
  resistance: number;
  clearThinker: boolean;
  /** the Gift’s penalty to Defense, before mundane witnesses */
  giftPenalty: number;
  /** debate Fatigue levels lost */
  lost: number;
}

export function debaterOf(d: DerivedCharacter, name: string, mundaneWitnesses = false): Debater {
  const abilities = Object.fromEntries([...DEBATE_ATTACK, ...DEBATE_DEFENSE].map((id) => [id, score(d, id)]));
  const rep = Math.max(0, ...d.char.reputations.map((r) => r.score));
  const strong = d.virtues.some((v) => v.cv.defId === 'strong-willed');
  return {
    name, per: d.characteristics.Per.value, com: d.characteristics.Com.value, int: d.characteristics.Int.value, pre: d.characteristics.Pre.value, abilities,
    resistance: rep + d.char.confidence.score + (strong ? 3 : 0), clearThinker: d.virtues.some((v) => v.cv.defId === 'clear-thinker'),
    giftPenalty: mundaneWitnesses ? d.socialPenalty : 0, lost: 0,
  };
}

/** Debate Fatigue: levels lost 0–1 nothing, then −1, −3, −5; five levels lost ends the debate. Clear Thinker eases each by 1. */
export function debatePenalty(x: Debater): number {
  const p = [0, 0, -1, -3, -5, -5][Math.min(5, x.lost)];
  return p < 0 && x.clearThinker ? p + 1 : p;
}

/** One side's attack: Com + Attack Ability + modifier + testimony + stress die against Int + Defense Ability + stress die. */
export function debateAttack(a: Debater, b: Debater, att: DebateAttack, def: DebateDefense, testimony = 0, rng: Rng = defaultRng) {
  const ra = roll(1, rng);
  const rd = roll(1, rng);
  const attack = a.com + (a.abilities[att] ?? 0) + MOD[att][def] + testimony + debatePenalty(a) + ra.value;
  const defense = b.int + (b.abilities[def] ?? 0) + b.giftPenalty + debatePenalty(b) + rd.value;
  const adv = attack - defense;
  const lost = adv > 0 ? certamenFatigue(a.pre + adv, b.resistance) : 0;
  return {
    lost,
    text: `${a.name}: ${DEBATE_NAMES[att]} ${attack} (${describeStress(ra)}${MOD[att][def] ? `, ${MOD[att][def] > 0 ? '+' : ''}${MOD[att][def]} against ${DEBATE_NAMES[def]}` : ''}) vs ${b.name}’s ${DEBATE_NAMES[def]} ${defense}${adv > 0 ? `: Weakening ${a.pre + adv} vs Resistance ${b.resistance}, ${lost} level${lost === 1 ? '' : 's'} lost` : ': no headway'}.`,
  };
}

/** The Argument Strength table: share of the neutral and hostile votes won. */
export const ARGUMENT_STRENGTH: { label: string; neutral: number; hostile: number }[] = [
  { label: 'Inconclusive', neutral: 0, hostile: 0 },
  { label: 'Inconclusive', neutral: 0, hostile: 0 },
  { label: 'Edge', neutral: 10, hostile: 0 },
  { label: 'Upper Hand', neutral: 20, hostile: 0 },
  { label: 'Clear Victory', neutral: 30, hostile: 0 },
  { label: 'Triumphant Victory', neutral: 40, hostile: 10 },
  { label: 'Momentous Victory', neutral: 50, hostile: 20 },
  { label: 'Landslide Victory', neutral: 60, hostile: 30 },
];

/** Votes after a debate: the winner's allies, plus the share of the neutral and hostile votes the Argument Strength wins. */
export function debateVotes(strength: number, allies: number, neutral: number, hostile: number) {
  const row = ARGUMENT_STRENGTH[Math.max(0, Math.min(7, strength))];
  const fromNeutral = Math.floor((neutral * row.neutral) / 100);
  const fromHostile = Math.floor((hostile * row.hostile) / 100);
  return { label: row.label, winner: allies + fromNeutral + fromHostile, loser: hostile - fromHostile, abstain: neutral - fromNeutral };
}
