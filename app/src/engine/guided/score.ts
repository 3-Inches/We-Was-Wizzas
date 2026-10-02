// Scoring for the guided build (design spec, sections 5 and 7). Answers become tag weights
// (answer − 5 per point); gates filter the Virtues and Flaws; each survivor gets a fit (how well
// it matches what the player said) and a strength (what it is worth in this saga, in seasons
// over the first years of play). Saga context moves strength, never fit.

import { ARTS, CHARACTERISTICS, STATUS_CULTURES, type Art, type Characteristic, type CharType, type GameData, type VFSize, type VirtueFlawDef } from '../../data';
import { HOUSES } from '../../data/houses';
import { DEFAULT_SAGA_SETTINGS, type Character, type Covenant, type GuidedState, type HouseRules, type Saga, type SagaGuidedSettings } from '../types';

export { DEFAULT_SAGA_SETTINGS };

export type { GuidedState, SagaGuidedSettings };
import type { DerivedCharacter } from '../character/derive';
import { vfProblems } from '../character/restrictions';
import { abilityTag, vfRecords, type TagLink, type VFRecord } from './records';
import { QUESTIONS, SECTIONS, childrenOf, type Question } from './questions';
import { isThemeTag, tagLabel } from './tags';
import { HOUSE_BENEFIT_SCALE, HOUSE_EITHER_WAY, HOUSE_IDENTITY, MAGNITUDES, RANKED_TOTALS } from './magnitudes';


export interface GuidedContext {
  c: Character;
  d: DerivedCharacter;
  data: GameData;
  rules: HouseRules;
  saga?: Saga;
  covenant?: Covenant;
  /** concept themes chosen on the Concept step */
  archetypes: string[];
}

export const FOLLOW_UP_HIGH = 7;
/** Totals a character type lives on: Flaws that hurt them are recommended only when rated low. */
const CORE_TAGS: Record<CharType, string[]> = { magus: ['casting', 'lab'], companion: [], mythic: [], grog: ['combat', 'soak'] };
export const FOLLOW_UP_LOW = 3;
export const STOP_BELOW = 10;

// ------------------------------------------------------------------ answers

/** The covenant's answer to a limiting-factor question, 0-10, when the covenant is in the toolkit. */
export function covenantAnswer(q: Question, cov?: Covenant): number | undefined {
  if (!q.covenant || !cov) return undefined;
  const clamp = (n: number) => Math.max(0, Math.min(10, Math.round(n)));
  switch (q.covenant) {
    case 'vis': {
      const magi = Math.max(1, cov.memberIds.length);
      const perMagus = cov.visSources.reduce((s, v) => s + v.pawnsPerYear, 0) / magi;
      return clamp(perMagus / 2); // 10 pawns a year each → 5
    }
    case 'wealth': return clamp(5 + cov.finances.livingConditions * 2 + (cov.income.reduce((s, i) => s + i.pounds, 0) > 200 ? 2 : 0));
    case 'library': {
      const summae = cov.library.filter((b) => b.kind === 'summa' && b.subjectType === 'art');
      const q2 = summae.length ? summae.reduce((s, b) => s + b.quality, 0) / summae.length : 6;
      return clamp((q2 - 6) + Math.min(5, summae.length / 3));
    }
    case 'aura': return clamp(cov.aura + cov.hooksBoons.filter((h) => h.kind === 'boon' && /aura/i.test(h.name)).length);
  }
}

export function presetAnswer(q: Question, archetypes: string[]): number | undefined {
  if (!q.presets) return undefined;
  const vals = archetypes.map((a) => q.presets![a]).filter((v): v is number => v !== undefined);
  return vals.length ? Math.max(...vals) : undefined;
}

export type AnswerSource = 'player' | 'covenant' | 'theme' | 'default';

export function answerOf(q: Question, st: GuidedState, ctx: GuidedContext): { value: number; source: AnswerSource } {
  const cov = covenantAnswer(q, ctx.covenant);
  if (cov !== undefined) return { value: cov, source: 'covenant' };
  if (st.answers[q.id] !== undefined) return { value: st.answers[q.id], source: 'player' };
  const pre = presetAnswer(q, ctx.archetypes);
  if (pre !== undefined) return { value: pre, source: 'theme' };
  return { value: 5, source: 'default' };
}

/** Is this question for this character at all (type, House already chosen, covenant present)? */
export function asksThis(q: Question, ctx: GuidedContext): boolean {
  const t = ctx.c.type;
  const section = SECTIONS.find((s) => s.id === q.section);
  if (section?.types && !section.types.includes(t)) return false;
  if (q.types && !q.types.includes(t)) return false;
  if (q.id === 'a-house' && ctx.c.house) return false;
  return true;
}

// ------------------------------------------------------------------ weights

export function tagWeights(st: GuidedState, ctx: GuidedContext): Record<string, number> {
  const w: Record<string, number> = {};
  for (const v of visibleQuestions(st, ctx, { weightsOnly: true })) {
    const a = v.answer - 5;
    if (!a) continue;
    for (const [tag, k] of Object.entries(v.q.tags)) w[tag] = (w[tag] ?? 0) + a * k;
  }
  for (const k of Object.keys(w)) w[k] = Math.max(-10, Math.min(10, w[k]));
  // the tie-breaker round only orders the tied tags among themselves: 10 keeps a tag's weight,
  // 0 cuts it to 40%, so it never rises above, or turns against, what was not in the round
  for (const [k, a] of Object.entries(st.answers)) {
    if (!k.startsWith('tb:')) continue;
    const tag = k.slice(3);
    if (w[tag]) w[tag] = Math.round(w[tag] * (0.4 + (0.6 * a) / 10) * 10) / 10;
  }
  return w;
}

// ------------------------------------------------------------------ gates

const GATE_WARNINGS = new Set(['tradition', 'house-only', 'being', 'status-extra', 'need', 'male-only', 'female-only']);

/** Tribunal of the saga or covenant, if known. */
export function sagaRegion(ctx: GuidedContext): string | undefined {
  const t = (ctx.covenant?.tribunal || ctx.saga?.tribunal || '').toLowerCase();
  if (!t) return undefined;
  const names = ['Greater Alps', 'Hibernian', 'Iberian', 'Levant', 'Loch Leglean', 'Normandy', 'Novgorod', 'Provençal', 'Rhine', 'Rome', 'Stonehenge', 'Theban', 'Transylvanian'];
  return names.find((n) => t.includes(n.toLowerCase()) || (n === 'Provençal' && t.includes('provencal')));
}

/** Why an option is filtered out before scoring, or null. Gates are never scored. */
export function gateReason(def: VirtueFlawDef, rec: VFRecord, st: GuidedState, ctx: GuidedContext, complexityOk: boolean): string | null {
  const { c, d, data } = ctx;
  if (def.creatureOnly) return 'Creature only';
  if (!data.isBookEnabled(def.source.book)) return 'Book not enabled';
  if (def.id === 'the-gift' || def.id === 'hermetic-magus') return 'Given by the character type';
  if (st.declined.includes(def.id)) return 'You turned it down';
  if (!def.repeatable && !def.param && c.virtues.some((v) => v.defId === def.id)) return 'Already taken';
  const region = sagaRegion(ctx);
  if (region && rec.regions.length && !rec.regions.includes(region)) return `Belongs to the ${rec.regions.join(' or ')} Tribunal`;
  if (rec.cultures.length && !rec.cultures.includes(c.society)) return `For ${rec.cultures.join(' or ')} characters`;
  if (!complexityOk && (rec.flags.complexity || rec.flags.spellLike)) return 'Adds complexity';
  if (rec.flags.infernal && (st.answers['f-infernal-taint'] ?? 5) < FOLLOW_UP_HIGH) return 'Infernal taint (only if you want your character tempted or tainted)';
  if (def.sizes.every((z) => z === 'Free') && !def.categories.includes('Social Status')) return 'Given by other rules, not bought';
  if (def.kind === 'flaw' && def.categories.includes('Supernatural') && /\b(supernatural (power|virtue)s?|character's (supernatural )?powers?|one of (the character's|your) powers)\b/i.test(def.text)) {
    const hasPower = c.virtues.some((v) => { const x = data.vfById.get(v.defId); return x?.kind === 'virtue' && x.categories.includes('Supernatural'); });
    if (!hasPower) return 'Needs a supernatural power';
  }
  if (def.categories.includes('Social Status') && c.type === 'magus') return 'Magi keep Hermetic Magus';
  if (def.categories.includes('Social Status') && c.type === 'grog' && !['covenfolk', 'peasant', 'laborer', 'craftsman', 'custos', 'failed-apprentice'].includes(def.id) && def.kind === 'virtue') return 'Grogs are covenfolk';
  if (def.categories.includes('Social Status')) {
    const cult = STATUS_CULTURES[def.name];
    if (cult && !cult.includes('All Cultures') && !cult.includes(c.society)) return `A ${cult.join(' or ')} status`;
  }
  // Mystery Virtues come by Initiation: only for magi who want a Mystery (or have Cabal Legacy)
  if (def.categories.includes('Mystery') && !(c.house && def.houses?.includes(c.house))) {
    if (c.type !== 'magus') return 'Mystery Virtues are for magi';
    const cabal = c.virtues.some((v) => v.defId === 'cabal-legacy-flaw');
    if (!cabal && (st.answers['f-mystery'] ?? presetAnswer(QUESTIONS.find((q) => q.id === 'f-mystery')!, ctx.archetypes) ?? 5) < FOLLOW_UP_HIGH) return 'Needs Initiation';
  }
  const ps = vfProblems(d, data, def);
  const block = ps.find((p) => p.severity === 'error' || (p.severity === 'warning' && GATE_WARNINGS.has(p.code)));
  return block ? block.short : null;
}

// ------------------------------------------------------------------ fit

export interface Match {
  tag: string;
  contribution: number;
  why: string;
}

export interface Scored {
  def: VirtueFlawDef;
  rec: VFRecord;
  size: VFSize;
  param?: string;
  fit: number;
  strength: Strength;
  matches: Match[];
  /** why it is not recommended even though it passed the gates */
  excluded?: string;
  /** where it stands against the other options for each Total it moves (best first) */
  ranks?: { tag: string; label: string; rank: number; of: number; note: string }[];
}

/** When nothing distinguishes the choices: what this kind of character usually wants first. */
const DEFAULT_ABILITY: Record<CharType, string[]> = {
  magus: ['magic-theory', 'finesse', 'penetration', 'concentration', 'parma-magica'],
  companion: ['single-weapon', 'charm', 'awareness', 'folk-ken', 'survival'],
  mythic: ['single-weapon', 'awareness', 'charm'],
  grog: ['single-weapon', 'great-weapon', 'bows', 'brawl', 'awareness', 'athletics'],
};
const ABILITY_ORDER = ['single-weapon', 'great-weapon', 'bows', 'magic-theory', 'finesse', 'penetration', 'concentration', 'charm', 'folk-ken', 'guile', 'leadership', 'intrigue', 'etiquette', 'awareness', 'stealth', 'survival', 'artes-liberales', 'dead-language', 'magic-lore', 'faerie-lore', 'dominion-lore', 'infernal-lore', 'chirurgy', 'medicine', 'music'];
const CHAR_ORDER: Record<CharType, Characteristic[]> = {
  magus: ['Int', 'Sta', 'Com', 'Per', 'Pre', 'Qik', 'Dex', 'Str'],
  companion: ['Pre', 'Com', 'Per', 'Int', 'Sta', 'Qik', 'Dex', 'Str'],
  mythic: ['Sta', 'Pre', 'Per', 'Str', 'Qik', 'Dex', 'Int', 'Com'],
  grog: ['Sta', 'Str', 'Dex', 'Qik', 'Per', 'Pre', 'Com', 'Int'],
};

function paramChoice(def: VirtueFlawDef, rec: VFRecord, w: Record<string, number>, ctx: GuidedContext, fixed?: string): { value?: string; tag?: string } {
  const spec = def.param;
  if (!spec || !rec.paramKind) return {};
  if (fixed) {
    const tag = rec.paramKind === 'art' ? `art:${fixed}` : rec.paramKind === 'char' ? `char:${fixed}` : rec.paramKind === 'realm' ? `realm:${fixed.toLowerCase()}` : abilityTag(fixed, ctx.data.abilityById.get(fixed)?.type);
    return { value: fixed, tag };
  }
  // highest weight wins (lowest, for a Flaw that hurts the choice); ties go to the earlier item
  const sign = def.kind === 'flaw' && rec.links.some((l) => l.tag === '$param' && l.dir < 0) ? -1 : 1;
  const best = <T,>(xs: T[], tagOf: (x: T) => string) => xs.reduce<{ x?: T; w: number }>((b, x) => (sign * (w[tagOf(x)] ?? 0) > b.w ? { x, w: sign * (w[tagOf(x)] ?? 0) } : b), { w: -Infinity });
  if (rec.paramKind === 'art') {
    const all = (spec.options?.length ? spec.options : spec.kind === 'technique' ? ARTS.slice(0, 5) : spec.kind === 'form' ? ARTS.slice(5) : ARTS) as Art[];
    // ties: the Art the character is already best at
    const arts = [...all].sort((a, b) => sign * ((ctx.d.arts[b]?.score ?? 0) - (ctx.d.arts[a]?.score ?? 0)));
    const b = best(arts, (a) => `art:${a}`);
    return b.x ? { value: b.x, tag: `art:${b.x}` } : {};
  }
  if (rec.paramKind === 'char') {
    const order = sign < 0 ? [...CHAR_ORDER[ctx.c.type]].reverse() : CHAR_ORDER[ctx.c.type];
    const b = best(order, (c) => `char:${c}`);
    return b.x ? { value: b.x, tag: `char:${b.x}` } : {};
  }
  if (rec.paramKind === 'realm') {
    const b = best(['Magic', 'Faerie', 'Divine', 'Infernal'], (r) => `realm:${r.toLowerCase()}`);
    return b.x ? { value: b.x, tag: `realm:${b.x.toLowerCase()}` } : {};
  }
  // Abilities: the one this character can use that the player cares most about
  const abilities = ctx.data.abilities.filter((a) => (!spec.abilityTypes || spec.abilityTypes.includes(a.type)) && (!spec.options || spec.options.includes(a.id)) && a.source.book === 'DE' && !a.id.endsWith('-type'));
  const usable = abilities.filter((a) => ctx.c.abilities.some((x) => x.abilityId === a.id) || (a.type === 'General' || ctx.d.isMagus || ctx.d.abilityAccess.types.has(a.type)));
  const rank = (id: string) => {
    const i = DEFAULT_ABILITY[ctx.c.type].indexOf(id);
    if (i >= 0) return i;
    const j = ABILITY_ORDER.indexOf(id);
    return j >= 0 ? 10 + j : 100;
  };
  usable.sort((a, b) => rank(a.id) - rank(b.id));
  const b = best(usable, (a) => abilityTag(a.id, a.type));
  return b.x ? { value: b.x.id, tag: abilityTag(b.x.id, b.x.type) } : {};
}

function linkWeight(l: TagLink, w: Record<string, number>, paramTag?: string): { tag: string; weight: number } {
  if (l.tag === '$param') return { tag: paramTag ?? '$param', weight: paramTag ? w[paramTag] ?? 0 : 0 };
  if (l.tag === '$anyChar') {
    const best = CHARACTERISTICS.reduce((m, c) => Math.max(m, w[`char:${c}`] ?? 0), w.chars ?? 0);
    return { tag: '$anyChar', weight: best };
  }
  return { tag: l.tag, weight: w[l.tag] ?? 0 };
}

export function scoreOption(def: VirtueFlawDef, rec: VFRecord, st: GuidedState, w: Record<string, number>, ctx: GuidedContext, fixedParam?: string): Scored {
  const pc = paramChoice(def, rec, w, ctx, fixedParam);
  const isFlaw = def.kind === 'flaw';
  const matches: Match[] = [];
  let fit = 0;
  let excluded: string | undefined;
  // Words merely mentioned in the text count, but a long entry that mentions everything must not
  // outrank a short one that does one thing well: only the two best text matches count in full.
  let textPositives = 0;
  const textLinks = rec.links.filter((l) => l.strength === 1).map((l) => ({ l, ...linkWeight(l, w, pc.tag) })).sort((a, b) => b.weight * b.l.dir - a.weight * a.l.dir);
  const textScale = new Map<TagLink, number>();
  for (const x of textLinks) {
    const c = x.weight * x.l.dir;
    textScale.set(x.l, c > 0 ? (textPositives++ < 2 ? 1 : 0.2) : 1);
  }
  const core = CORE_TAGS[ctx.c.type];
  // the player said they would accept a weakness elsewhere for a narrow strength
  const acceptsTrade = isFlaw && (w['trade-off'] ?? 0) >= 2 && rec.links.some((l) => l.tag === 'trade-off');
  for (const l of rec.links) {
    const { tag, weight } = linkWeight(l, w, pc.tag);
    // a Flaw that cripples what the character type lives on needs an explicit low rating
    if (isFlaw && !acceptsTrade && !l.hook && l.dir < 0 && l.strength >= 3 && core.includes(tag) && weight > -3) excluded = `Hurts ${tagLabel(tag)}, which a ${ctx.c.type} relies on`;
    if (!weight) continue;
    const contribution = weight * l.strength * l.dir * (textScale.get(l) ?? 1);
    fit += contribution;
    matches.push({ tag, contribution, why: l.why });
    // a Flaw that hurts something the player rated high is never recommended
    // (a word in the text counts once the rating is strong)
    if (isFlaw && !acceptsTrade && !l.hook && l.dir < 0 && (l.strength >= 2 ? weight >= 2 : weight >= 4)) excluded = `Hurts ${tagLabel(tag)}, which you rated high`;
  }
  // experience that can only go where the player rated low is not worth taking
  if (!isFlaw && rec.xpTargets?.length && rec.xpTargets.every((t) => (w[t] ?? 0) <= -2)) excluded = `Its experience goes to ${rec.xpTargets.map(tagLabel).join(', ')}, which you rated low`;
  const still = st.answers[`vf:${def.id}`];
  if (still !== undefined) {
    if (still <= FOLLOW_UP_LOW) excluded = 'You were not interested';
    else fit += (still - 5) * 2;
  }
  const size = pickSize(def, ctx);
  const strength = strengthOf(def, rec, ctx, pc.value, w, st);
  matches.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  return { def, rec, size, param: pc.value, fit: Math.round(fit * 10) / 10, strength, matches, excluded };
}

function pickSize(def: VirtueFlawDef, ctx: GuidedContext): VFSize {
  if (ctx.c.type === 'grog' && def.sizes.includes('Minor')) return 'Minor';
  return def.sizes.includes('Minor') ? 'Minor' : def.sizes[0];
}

// ------------------------------------------------------------------ strength

export interface Strength {
  /** seasons saved (+) or spent (−) over the horizon, when it can be counted */
  seasons: number | null;
  lane: 'numeric' | 'variable' | 'story';
  text: string;
}

export interface SagaFactors {
  horizonYears: number;
  artSQ: number;
  abilitySQ: number;
  vis: number;
  wealth: number;
  library: number;
  aura: number;
  realms: SagaGuidedSettings['realms'];
  politics: number;
}

export function sagaFactors(st: GuidedState, ctx: GuidedContext): SagaFactors {
  const s = ctx.saga?.guided ?? DEFAULT_SAGA_SETTINGS;
  const level = (id: string) => {
    const q = QUESTIONS.find((x) => x.id === id)!;
    return answerOf(q, st, ctx).value;
  };
  const library = level('i-library');
  return {
    horizonYears: 5 * Math.pow(2, (s.speed - 5) / 5),
    artSQ: 8 + library * 0.6,
    abilitySQ: 6 + library * 0.4,
    vis: level('i-vis'),
    wealth: level('i-wealth'),
    library,
    aura: level('i-aura'),
    realms: s.realms,
    politics: s.politics,
  };
}

/** What +1 in a Characteristic is worth, in seasons, for each character type. */
const CHAR_VALUE: Record<CharType, Record<Characteristic, number>> = {
  magus: { Int: 4, Sta: 3, Per: 1.5, Com: 1.5, Pre: 1.5, Qik: 1, Dex: 1, Str: 0.5 },
  companion: { Int: 2, Per: 2, Str: 2, Sta: 2, Pre: 2, Com: 2, Dex: 2, Qik: 2 },
  mythic: { Int: 2, Per: 2, Str: 2, Sta: 2, Pre: 2, Com: 2, Dex: 2, Qik: 2 },
  grog: { Int: 1, Per: 1.5, Str: 3, Sta: 3, Pre: 1, Com: 1, Dex: 3, Qik: 3 },
};

const artXp = (s: number) => (s * (s + 1)) / 2;
const abXp = (s: number) => (5 * s * (s + 1)) / 2;

function effectSeasons(def: VirtueFlawDef, ctx: GuidedContext, f: SagaFactors, param: string | undefined, w: Record<string, number>): { seasons: number; parts: string[] } | null {
  const effects = [...(def.effects ?? []), ...Object.values(def.sizeEffects ?? {}).flat()].filter((e) => e.type !== 'note' && e.type !== 'implies');
  if (!effects.length) return null;
  const { d } = ctx;
  const H = f.horizonYears / 5; // effects that recur scale with the horizon
  // Arts and Abilities at the level they typically reach in the first years of play
  const artAt = (a?: string) => Math.max(8, a && d.arts[a as Art] ? d.arts[a as Art].score : 0);
  const abAt = (id?: string) => Math.max(3, id ? d.abilities.find((x) => x.abilityId === id)?.score ?? 0 : 0);
  const labShare = Math.max(0.1, Math.min(0.9, (w.lab ?? 0) / 10 + 0.5));
  const labRef = 20; // a typical Lab Total in the first years of play
  let total = 0;
  const parts: string[] = [];
  const add = (n: number, why: string) => {
    if (!n) return;
    total += n;
    parts.push(`${why}: ${n > 0 ? '+' : ''}${Math.round(n * 10) / 10}`);
  };
  for (const e of effects) {
    switch (e.type) {
      case 'artBonus': { const s = artAt(param); add((artXp(s + e.amount) - artXp(s)) / f.artSQ, `the study it would take to raise ${param ?? 'the Art'} by ${e.amount}`); break; }
      case 'artAffinity': add((40 * 0.5) / f.artSQ + 5 * H * 0.5 * (1 / 1.5), 'a third faster growth in one Art'); break;
      case 'abilityBonus': { const s = abAt(param); add((abXp(s + e.amount) - abXp(s)) / f.abilitySQ, `the study it would take to raise the Ability by ${e.amount}`); break; }
      case 'abilityAffinity': add((30 * 0.5) / f.abilitySQ + 3 * H * 0.33, 'a third faster growth in one Ability'); break;
      case 'languageAffinity': add(2 * H, 'faster languages'); break;
      case 'xpPool': add(e.amount / (e.arts ? f.artSQ : f.abilitySQ) * (e.abilityTypes || e.abilities ? 0.8 : 1), `${e.amount} xp`); break;
      case 'laterLifeXpPerYear': { const years = Math.max(0, ctx.c.type === 'magus' ? ctx.c.creation.apprenticeshipStartAge - 5 : ctx.c.age - 5); add(((e.amount - 15) * years) / f.abilitySQ, `${e.amount - 15 > 0 ? 'more' : 'less'} xp for ${years} years`); break; }
      case 'freeSeasons': add((e.amount - 2) * 5 * H * 0.5, 'free seasons each year'); break;
      case 'apprenticeXp': add(e.amount / f.artSQ, 'apprenticeship xp'); break;
      case 'apprenticeshipTotalXp': add((e.amount - 240) / f.artSQ, 'apprenticeship xp'); break;
      case 'apprenticeSpellLevels': add(e.amount / 15, 'spell levels at creation'); break;
      case 'labTotal': case 'labTotalMultiplier': {
        const pts = e.type === 'labTotal' ? e.amount : labRef * (e.multiplier - 1);
        const share = e.when === 'all' ? labShare : e.when === 'longevityForSelf' ? 0.05 : e.when === 'experimenting' ? 0.1 : labShare * 0.4;
        add((20 * H * share * pts) / labRef, `${pts > 0 ? '+' : ''}${Math.round(pts)} on ${Math.round(share * 20 * H)} lab seasons`);
        break;
      }
      case 'castingTotal': case 'castingScore': {
        const s = artAt();
        const scope = e.when === 'all' ? 1.5 : e.when === 'circumstance' ? 0.4 : e.when === 'spontaneous' ? 0.8 : 1;
        add(Math.sign(e.amount) * ((artXp(s + Math.abs(e.amount)) - artXp(s)) / f.artSQ) * scope, 'what it would take to raise casting that much by study');
        break;
      }
      case 'botchDice': add(-e.amount * 1.5, 'botch dice'); break;
      case 'soak': add(e.amount * 1.2, 'Soak'); break;
      case 'woundPenalty': case 'fatiguePenalty': add(-e.amount * 2, 'penalties'); break;
      case 'initiative': case 'spellInitiative': add(e.amount * 0.6, 'Initiative'); break;
      case 'charBonus': { const ch = (e.char === '$param' ? param : e.char) as Characteristic | undefined; add(e.amount * CHAR_VALUE[ctx.c.type][ch ?? 'Int'], `${ch ?? 'a Characteristic'}`); break; }
      case 'greatChar': add(3, 'a higher Characteristic'); break;
      case 'charPoints': add(e.amount * 1.5, 'Characteristic points'); break;
      case 'confidence': add((e.score ? e.score - 1 : 0) * 2 + (e.points ? (e.points - 3) * 0.3 : 0), 'Confidence'); break;
      case 'reputation': add((e.kind === 'bad' ? -0.5 : 0.5) * e.score, 'Reputation'); break;
      case 'warpingPoints': add(-e.amount * 0.3 * (ctx.c.type === 'magus' ? 1 : 0.5 + f.aura / 10), 'Warping'); break;
      case 'livingConditions': case 'agingRoll': { const amt = e.type === 'agingRoll' ? -e.amount : e.amount; add(amt * (ctx.c.age >= 35 ? 1.5 : 0.5) * H, 'aging'); break; }
      case 'agingStartAge': add(2, 'aging starts later'); break;
      case 'sourceQuality': add(e.amount * 0.8 * H * (0.5 + f.library / 10), 'better study'); break;
      case 'advancementMultiplier': add((e.multiplier - 1) * 8 * H, 'study'); break;
      case 'teachingQuality': case 'bookWritingQuality': add(e.amount * 0.5, 'teaching and writing'); break;
      case 'masteryXp': add(e.amount / f.abilitySQ, 'mastery xp'); break;
      case 'spellMasteryMultiplier': add((e.multiplier - 1) * 3, 'mastery'); break;
      case 'flawlessMagic': add(6, 'mastery in every spell'); break;
      case 'ritualVisMultiplier': add((1 - e.multiplier) * 4 * (1.5 - f.vis / 10), 'vis'); break;
      case 'penetrationMultiplier': add((e.multiplier - 1) * 6, 'Penetration'); break;
      case 'magicResistance': add(e.amount / 5, 'Magic Resistance'); break;
      case 'deficientArt': add(-6, 'a halved Art'); break;
      case 'magicalFocus': add(e.scope === 'major' ? 8 : 4, 'the focus (inside its scope)'); break;
      case 'gift': add(e.kind === 'gentle' ? 4 : e.kind === 'blatant' ? -4 : 0, 'The Gift’s effect on people'); break;
      case 'socialPenalty': add(-e.amount, 'social rolls'); break;
      case 'size': add(e.amount * (ctx.c.type === 'magus' ? 0.5 : 1), 'Size'); break;
      case 'elementalMagic': add(4, 'elemental Arts'); break;
      case 'secondaryInsight': add(3 * H, 'extra study'); break;
      case 'trueFaith': add(4, 'True Faith'); break;
      case 'relic': add(e.faith * 1.5, 'a relic'); break;
      default: break;
    }
  }
  return parts.length ? { seasons: total, parts } : null;
}

export function strengthOf(def: VirtueFlawDef, rec: VFRecord, ctx: GuidedContext, param: string | undefined, w: Record<string, number>, st: GuidedState = { answers: {}, declined: [] }): Strength {
  const f = sagaFactors(st, ctx);
  const res = effectSeasons(def, ctx, f, param, w);
  if (!res) {
    if (rec.kind === 'story') return { seasons: null, lane: 'story', text: 'No fixed numbers: a story hook.' };
    return { seasons: null, lane: 'variable', text: rec.value };
  }
  let seasons = res.seasons;
  // saga context: the storyguide's realm settings and the covenant's resources
  const realm = rec.links.find((l) => l.tag.startsWith('realm:') && l.strength >= 2);
  if (realm) seasons *= 0.5 + f.realms[realm.tag.slice(6) as keyof SagaFactors['realms']] / 10;
  if (rec.links.some((l) => l.tag === 'wealth' && l.strength >= 2)) seasons *= 1.5 - f.wealth / 10;
  if (rec.links.some((l) => (l.tag === 'politics' || l.tag === 'order') && l.strength >= 2)) seasons *= 0.5 + f.politics / 10;
  seasons = Math.round(seasons * 10) / 10;
  const horizon = Math.round(f.horizonYears * 10) / 10;
  return { seasons, lane: 'numeric', text: `≈ ${seasons > 0 ? '+' : ''}${seasons} seasons over ${horizon} years (${res.parts.join('; ')})` };
}

// ------------------------------------------------------------------ candidates

export interface Evaluation {
  weights: Record<string, number>;
  scored: Scored[];
  /** gated out, with the reason (for Browse by tag's "why not") */
  gated: Map<string, string>;
  complexityOk: boolean;
  type: CharType;
}

export function evaluate(st: GuidedState, ctx: GuidedContext): Evaluation {
  const w = tagWeights(st, ctx);
  const recs = vfRecords(ctx.data);
  const complexity = answerOf(QUESTIONS.find((q) => q.id === 'a-complexity')!, st, ctx).value;
  const complexityOk = complexity > FOLLOW_UP_LOW;
  const scored: Scored[] = [];
  const gated = new Map<string, string>();
  for (const def of ctx.data.virtuesFlaws) {
    const rec = recs.get(def.id);
    if (!rec) continue;
    const why = gateReason(def, rec, st, ctx, complexityOk);
    if (why) {
      gated.set(def.id, why);
      continue;
    }
    scored.push(scoreOption(def, rec, st, w, ctx));
  }
  rankTotals(scored);
  return { weights: w, scored, gated, complexityOk, type: ctx.c.type };
}

/** Ranks each option against the others that move the same Total, by the size of its edge. */
function rankTotals(scored: Scored[]) {
  for (const { tag, label } of RANKED_TOTALS) {
    const size = (s: Scored) => MAGNITUDES[s.def.id]?.[tag] ?? 0;
    const movers = scored.filter((s) => size(s) > 0);
    for (const s of movers) {
      const rank = 1 + movers.filter((o) => size(o) > size(s)).length;
      (s.ranks ??= []).push({ tag, label, rank, of: movers.length, note: MAGNITUDES[s.def.id]!.note });
    }
  }
}

const HINT_GROUPS: { label: string; kind: 'virtue' | 'flaw'; size: 'Minor' | 'Major' }[] = [
  { label: 'Minor Virtues', kind: 'virtue', size: 'Minor' },
  { label: 'Major Virtues', kind: 'virtue', size: 'Major' },
  { label: 'Minor Flaws', kind: 'flaw', size: 'Minor' },
  { label: 'Major Flaws', kind: 'flaw', size: 'Major' },
];

/**
 * What the best options for a question give, for the end of the question: Minor then Major
 * Virtues, then Minor then Major Flaws, each with a very short note of its edge.
 */
export function questionHint(q: Question, ev: Evaluation): string {
  if (q.noHint) return '';
  if (q.hint) return q.hint;
  // an archetype names its own options; its other tags only nudge
  const tags = Object.entries(q.tags).filter(([t, k]) => k > 0 && (!q.chip || t.startsWith('arch:')));
  if (!tags.length) return '';
  const top = tags.reduce((m, [, k]) => Math.max(m, k), 0);
  const main = new Set(tags.filter(([, k]) => k >= top / 2).map(([t]) => t));
  const scoredFor = ev.scored
    .map((s) => {
      const hits = s.rec.links.filter((l) => main.has(l.tag) && l.dir > 0 && l.strength >= 2);
      return { s, score: hits.reduce((t, l) => t + l.strength * (q.tags[l.tag] ?? 0), 0), why: hits.sort((a, b) => b.strength - a.strength)[0]?.why };
    })
    .filter((x) => x.score > 0 && !x.s.def.categories.includes('Social Status'));
  const parts: string[] = [];
  for (const g of HINT_GROUPS) {
    const best = scoredFor
      .filter((x) => x.s.def.kind === g.kind && x.s.size === g.size)
      .sort((a, b) => b.score - a.score || a.s.def.name.localeCompare(b.s.def.name))
      .slice(0, 3);
    if (!best.length) continue;
    const say = (x: (typeof best)[number]) => {
      const note = MAGNITUDES[x.s.def.id]?.note ?? (x.s.rec.value && !/^(Variable|A story hook)/.test(x.s.rec.value) && x.s.rec.value.length <= 60 ? x.s.rec.value : '');
      return note ? `${x.s.def.name} (${note})` : x.s.def.name;
    };
    parts.push(`${g.label}: ${best.map(say).join(', ')}`);
  }
  return parts.join(' · ');
}

/** Options that match what the player said, best first; the neutral fallback when nothing does. */
export function shortlist(ev: Evaluation, kind?: 'virtue' | 'flaw'): Scored[] {
  const pool = ev.scored.filter((s) => !s.excluded && (!kind || s.def.kind === kind) && !s.def.categories.includes('Social Status'));
  const fitting = pool.filter((s) => s.fit > 0).sort((a, b) => b.fit - a.fit || (b.strength.seasons ?? 0) - (a.strength.seasons ?? 0));
  if (fitting.length) return fitting;
  // everything left at 5: the broadly useful options for this kind of character
  const magus = ev.type === 'magus';
  return pool
    .filter((s) => s.def.kind === 'virtue' && (s.strength.seasons ?? 0) > 0 && s.def.source.book === 'DE' && !s.def.categories.includes('Social Status'))
    .filter((s) => !s.def.effects?.some((e) => e.type === 'xpPool' && (e.abilityTypes || e.abilities)) || !magus)
    .sort((a, b) => (b.strength.seasons ?? 0) + (magus && b.def.categories.includes('Hermetic') ? 2 : 0) - (a.strength.seasons ?? 0) - (magus && a.def.categories.includes('Hermetic') ? 2 : 0));
}

/** Social Statuses are chosen separately: the best fits for this character. */
export function statusShortlist(ev: Evaluation): Scored[] {
  return ev.scored
    .filter((s) => !s.excluded && s.def.categories.includes('Social Status'))
    .sort((a, b) => b.fit - a.fit || (a.def.sizes.includes('Free') ? -1 : 1) - (b.def.sizes.includes('Free') ? -1 : 1));
}

/** How many eligible options a question (and its follow-ups) could still narrow. */
export function candidatesFor(q: Question, ev: Evaluation): number {
  const tags = new Set<string>(Object.keys(q.tags));
  for (const ch of childrenOf(q.id)) for (const t of Object.keys(ch.tags)) tags.add(t);
  if (!tags.size) return Infinity;
  return ev.scored.filter((s) => s.rec.links.some((l) => tags.has(l.tag) || (l.tag === '$param' && [...tags].some((t) => t.startsWith('art:') || t.startsWith('char:'))))).length;
}

// ------------------------------------------------------------------ the question tree

export interface VisibleQuestion {
  q: Question;
  answer: number;
  source: AnswerSource;
  depth: number;
  /** the follow-ups were stopped because few candidates remain */
  stopped?: boolean;
}

/** The questions to show now, in order, with their answers. */
export function visibleQuestions(st: GuidedState, ctx: GuidedContext, opts: { weightsOnly?: boolean; ev?: Evaluation } = {}): VisibleQuestion[] {
  const out: VisibleQuestion[] = [];
  const shown = new Map<string, VisibleQuestion>();
  let ev = opts.ev;
  const evalOnce = () => (ev ??= evaluate(st, ctx));
  for (const q of QUESTIONS) {
    if (!asksThis(q, ctx)) continue;
    let depth = 0;
    if (q.parent) {
      const p = shown.get(q.parent);
      if (!p) continue;
      const open = (q.when ?? 'high') === 'high' ? p.answer >= FOLLOW_UP_HIGH : p.answer <= FOLLOW_UP_LOW;
      if (!open) continue;
      // the stop rule: no follow-up once fewer than 10 candidates remain (not for questions that steer the build)
      if (!q.build && !opts.weightsOnly && candidatesFor(shown.get(q.parent)!.q, evalOnce()) < STOP_BELOW) {
        p.stopped = true;
        continue;
      }
      depth = p.depth + 1;
    }
    const a = answerOf(q, st, ctx);
    const v: VisibleQuestion = { q, answer: a.value, source: a.source, depth };
    shown.set(q.id, v);
    out.push(v);
  }
  return out;
}

// ------------------------------------------------------------------ tie-breaker

export interface TieBreak {
  reason: string;
  tags: { tag: string; weight: number; preview: Scored[] }[];
}

/** The tie-breaker round: too many top-rated tags, or more Virtue points than the character has. */
export function tieBreaker(st: GuidedState, ev: Evaluation, ctx: GuidedContext): TieBreak | null {
  const top = Object.entries(ev.weights).filter(([t, w]) => w >= 4 && !t.startsWith('meta') && !['complexity', 'spell-like', 'specialist'].includes(t)).sort((a, b) => b[1] - a[1]);
  const already = Object.keys(st.answers).filter((k) => k.startsWith('tb:')).length;
  const virtues = shortlist(ev, 'virtue').filter((s) => s.fit >= 20);
  const points = virtues.reduce((s, v) => s + (v.size === 'Major' ? 3 : v.size === 'Minor' ? 1 : 0), 0);
  const budget = ctx.c.type === 'grog' ? ctx.rules.grogMaxFlawPoints : ctx.rules.maxFlawPoints * (ctx.c.type === 'mythic' ? ctx.rules.mythicVirtueRatio : 1);
  let reason = '';
  if (top.length >= 8) reason = `${top.length} things are rated 9 or 10.`;
  else if (points > budget * 1.5) reason = `The strongest matches would cost ${points} Virtue points; the character has at most ${budget}.`;
  if (!reason || top.length < 2 || already >= Math.min(5, top.length)) return null;
  const tags = top.slice(0, 5).map(([tag, weight]) => ({
    tag, weight,
    preview: shortlist(ev).filter((s) => s.matches.some((m) => m.tag === tag && m.contribution > 0)).slice(0, 3),
  }));
  return { reason, tags };
}

// ------------------------------------------------------------------ Houses

export interface HouseRec {
  id: string;
  name: string;
  score: number;
  reasons: string[];
}

/** Score each House by the fit of the Virtue it grants, plus the House-only options it unlocks. */
export function recommendHouses(ev: Evaluation, ctx: GuidedContext): HouseRec[] {
  const recs = vfRecords(ctx.data);
  const out: HouseRec[] = [];
  const st: GuidedState = { answers: {}, declined: [] };
  for (const h of HOUSES) {
    if (h.exMiscellanea && h.id !== 'ex-miscellanea') continue;
    const reasons: string[] = [];
    let score = 0;
    // what the House is about
    const either = HOUSE_EITHER_WAY[h.id] ?? [];
    const identity = Object.entries(HOUSE_IDENTITY[h.id] ?? {})
      .map(([tag, k]) => ({ tag, v: (either.includes(tag) ? Math.abs(ev.weights[tag] ?? 0) : ev.weights[tag] ?? 0) * k }))
      .filter((x) => x.v > 0)
      .sort((a, b) => b.v - a.v);
    score += identity.reduce((t, x) => t + x.v, 0) * 0.6;
    if (identity.length) reasons.push(identity.slice(0, 3).map((x) => tagLabel(x.tag)).join(', '));
    // its free Virtue
    let best = -Infinity;
    let bestReason = '';
    for (const b of h.benefitOptions) {
      const def = ctx.data.vfById.get(b.virtueId);
      const rec = def && recs.get(def.id);
      if (!def || !rec) continue;
      const s = scoreOption(def, rec, st, ev.weights, ctx, b.param);
      // equal fits: the benefit worth more in play
      const f = s.fit * (HOUSE_BENEFIT_SCALE[h.id] ?? 1) + (s.strength.seasons ?? 0) * 0.01;
      if (f > best) {
        best = f;
        bestReason = s.fit > 0 ? `${b.label}: ${s.matches.filter((m) => m.contribution > 0).slice(0, 2).map((m) => tagLabel(m.tag)).join(', ')}` : '';
      }
    }
    if (best > -Infinity) score += Math.max(0, best);
    if (bestReason) reasons.push(bestReason);
    // Virtues only its members can take
    const houseOnly = ctx.data.virtuesFlaws.filter((v) => v.houses?.includes(h.id) && v.kind === 'virtue' && ctx.data.isBookEnabled(v.source.book));
    const fits = houseOnly.map((v) => scoreOption(v, recs.get(v.id)!, st, ev.weights, ctx)).filter((s) => s.fit > 0).sort((a, b) => b.fit - a.fit).slice(0, 3);
    for (const f of fits) {
      score += f.fit / 2;
      reasons.push(`unlocks ${f.def.name}`);
    }
    if (h.id === 'ex-miscellanea') reasons.push('a free Minor Hermetic and Major non-Hermetic Virtue with a Major Hermetic Flaw');
    out.push({ id: h.id, name: h.name, score: Math.round(score * 10) / 10, reasons });
  }
  return out.sort((a, b) => b.score - a.score);
}

// ------------------------------------------------------------------ grouping for the recommendation screen

export interface Group {
  question?: Question;
  label: string;
  items: Scored[];
}

/** Group options under the question they count towards most; within a group, by fit. */
/** How much of an option's fit comes from one answer: its share of each tag weight it touches. */
function questionShare(s: Scored, v: VisibleQuestion, w: Record<string, number>): number {
  let contrib = 0;
  for (const m of s.matches) {
    const k = v.q.tags[m.tag];
    const total = w[m.tag];
    if (!k || !total) continue;
    contrib += (m.contribution * ((v.answer - 5) * k)) / total;
  }
  return contrib;
}

export function groupByQuestion(items: Scored[], st: GuidedState, ctx: GuidedContext): Group[] {
  const vis = visibleQuestions(st, ctx, { weightsOnly: true }).filter((v) => v.answer !== 5);
  const w = tagWeights(st, ctx);
  const groups = new Map<string, Group>();
  for (const s of items) {
    let best: { q?: Question; v: number } = { v: 0 };
    for (const v of vis) {
      const contrib = questionShare(s, v, w);
      if (contrib > best.v) best = { q: v.q, v: contrib };
    }
    const key = best.q?.id ?? 'other';
    if (!groups.has(key)) groups.set(key, { question: best.q, label: best.q ? best.q.text : 'Broadly useful', items: [] });
    groups.get(key)!.items.push(s);
  }
  return [...groups.values()].sort((a, b) => (b.items[0]?.fit ?? 0) - (a.items[0]?.fit ?? 0));
}

/** "from: I expect to cast in a fight — 9": the answers behind a recommendation. */
export function traceOf(s: Scored, st: GuidedState, ctx: GuidedContext): string {
  const vis = visibleQuestions(st, ctx, { weightsOnly: true }).filter((v) => v.answer !== 5);
  const w = tagWeights(st, ctx);
  const lines: { text: string; v: number }[] = [];
  for (const v of vis) {
    const contrib = questionShare(s, v, w);
    if (contrib > 0) lines.push({ text: `${v.q.text.replace(/[.…]$/, '')}${v.q.low ? ` (${v.answer < 5 ? v.q.low : v.q.high})` : ''} — ${v.answer}`, v: contrib });
  }
  for (const [k, a] of Object.entries(st.answers)) if (k.startsWith('tb:') && s.matches.some((m) => m.tag === k.slice(3))) lines.push({ text: `tie-breaker: ${tagLabel(k.slice(3))} — ${a}`, v: 1 });
  lines.sort((a, b) => b.v - a.v);
  return lines.length ? `from: ${lines.slice(0, 2).map((l) => l.text).join('; ')}` : 'from: broadly useful for this character';
}

export { isThemeTag };
