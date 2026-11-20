// The guided build and Quick build for the hedge traditions and faerie wizards: the answer that asks
// for one (questions.ts, `f-tradition`), The Gift and the tradition's Social Status, the Virtues its
// chapter requires, its apprenticeship spent as the chapter says, and the spells, rune scripts or
// charms it teaches. Hedge Magic, Revised Edition (HMRE): Folk Witches (line 1570), Gruagachan
// (line 2786), Learned Magicians (line 4117), Vitkir (line 6144). Realms of Power: Faerie, Pagan
// Traditions (line 7501).

import type { VFSize } from '../../data';
import { WITCH_POWERS } from '../../data/hedgeFolkWitch';
import { GRUAGACH_FORMS, GRUAGACH_TECHNIQUES, type GruagachArts } from '../../data/hedgeGruagach';
import { GRUAGACH_SPELLS } from '../../data/gruagachSpells';
import { LEARNED_FORMS, LEARNED_TECHNIQUES, type LearnedArts } from '../../data/hedgeLearned';
import { LEARNED_CHARMS } from '../../data/learnedCharms';
import { RUNES, VITKAR_FOCI } from '../../data/hedgeVitkir';
import { RUNE_SCRIPTS } from '../../data/vitkirRunes';
import { FAERIE_TRADITIONS } from '../../data/faerie';
import type { Character, GuidedState, XpSource } from '../types';
import { FOLK_APPRENTICESHIP, GRUAGACH_APPRENTICESHIP, LEARNED_TRAINING, VITKI_APPRENTICESHIP, canSpend, sumAlloc } from '../character/derive';
import { addVirtue, ensureAbility } from '../character/factory';
import { abilityAvailability, vfProblems } from '../character/restrictions';
import { abilityScore, abilityXp } from '../xp';
import { uid } from '../../util/id';
import { gruagachArtCap, gruagachCastingScore } from '../gruagach';
import { castingScore } from '../learnedMagic';
import { vitkiCastingTotal } from '../vitkir';
import { languageScore } from '../books';
import { evaluate, scoreOption, tagWeights, type GuidedContext, type Scored } from './score';
import { vfRecords } from './records';
import { SIZE_POINTS, TO_DECIDE, type BuildInput } from './buildShared';
import { TRADITION_BY_ID, TRADITION_STATUSES, traditionOf, wantedTradition, wantsGift, type Tradition } from './traditionRules';
export { TRADITIONS, TRADITION_BY_ID, TRADITION_STATUSES, fitsTradition, traditionOf, type Tradition } from './traditionRules';

// ------------------------------------------------------------------ The Gift and Social Status

/**
 * The Gift (opened by the tradition's master) and the tradition's Social Status, before the build's
 * own choice of status. A vitki also takes the free Minor Virtue of the master's specialty (HMRE line
 * 6148: "usually either Puissant Craft: Runes, Puissant Rune Magic, or Puissant (Rune)"; the sample
 * vitki has "Puissant Othila (free)", line 7420). A learned magician's years with a master are set.
 */
export function takeTradition(c: Character, st: GuidedState, inp: BuildInput, ctx: GuidedContext, log: string[]): Tradition | undefined {
  const t = wantedTradition(st, c);
  if (!t) return undefined;
  const def = TRADITION_BY_ID.get(t)!;
  const data = inp.data;
  const has = (id: string) => c.virtues.some((v) => v.defId === id);
  const gifted = wantsGift(t, st, c);
  if (gifted && !has('the-gift')) {
    const cv = addVirtue(c, data, 'the-gift', 'Free');
    cv.why = `from: ${def.member} whose Gift the tradition opens`;
  }
  if (def.status && !has(def.status)) {
    const cv = addVirtue(c, data, def.status, 'Free');
    cv.why = `from: your wish to play ${def.member}`;
  }
  log.push(`Tradition: ${def.member}, ${gifted ? 'Gifted' : 'unGifted'}.`);
  if (t === 'vitki' && !c.virtues.some((v) => v.freeReason?.startsWith('from a vitki'))) {
    const w = tagWeights(st, ctx);
    const rune = favoredRunes(c, w, inp)[0];
    const pick = inp.rng ? Math.floor(inp.rng() * 3) : 0;
    const [ability, param, name] = pick === 1 ? ['craft-type', 'Runes', 'Craft: Runes'] : pick === 2 ? ['rune-magic', undefined, 'Rune Magic'] : [rune.id, undefined, rune.name];
    const cv = addVirtue(c, data, 'puissant-ability', 'Minor', ability, { free: true, freeReason: 'from a vitki’s master (Hedge Magic, Vitkir)' });
    cv.why = `from: the master’s specialty, ${name} (free)`;
    void param;
    log.push(`Free Virtue from the master: Puissant ${name}.`);
  }
  if (t === 'learned' && !c.learned?.trainingYears) {
    // training begins between 14 and 19 (HMRE line 4121) and lasts as long as the student can stay
    const start = 14 + (inp.rng ? Math.floor(inp.rng() * 6) : 3);
    const years = Math.max(1, Math.min(inp.rng ? 3 + Math.floor(inp.rng() * 5) : 5, c.age - start));
    c.learned = { ...(c.learned ?? {}), trainingYears: years };
    log.push(`Years with a master: ${years}, from age ${start}.`);
  }
  return t;
}

/** The statuses a mathematicus takes for a place in mundane society (HMRE line 4157), the Minor ones. */
const LEARNED_SECOND = ['clerk', 'priest', 'mendicant-friar'];

/** Whether the character is a mathematicus still without a status for their place in mundane society (HMRE line 4157). */
export const needsMundaneStatus = (c: Character, ctx: GuidedContext) => traditionOf(c) === 'learned' && !ctx.d.tally.socialStatuses.some((v) => !TRADITION_STATUSES.has(v.cv.defId));

/**
 * A learned magician's second Social Status: of those the book suggests, the one that fits the answers
 * best and that the rules allow. Where none is open (a woman, or a society outside Christendom) the
 * build takes its usual choice, as "these lists are not exhaustive" (line 4157).
 */
export function mundaneStatus(c: Character, st: GuidedState, ctx: GuidedContext, inp: BuildInput): Scored | undefined {
  if (!needsMundaneStatus(c, ctx)) return undefined;
  const ev = evaluate(st, ctx);
  const ok = LEARNED_SECOND.map((id) => ev.scored.find((s) => s.def.id === id))
    .filter((s): s is Scored => !!s && !vfProblems(ctx.d, inp.data, s.def).some((p) => p.severity === 'error' || p.severity === 'warning'))
    .sort((a, b) => b.fit - a.fit);
  return inp.rng && ok.length > 1 && ok[0].fit - ok[1].fit < 5 ? ok[Math.floor(inp.rng() * ok.length)] : ok[0];
}

// ------------------------------------------------------------------ Virtues

type Add = (s: Scored, size: VFSize) => { why?: string; param?: string };
type Clean = (def: Scored['def'], size: VFSize) => boolean;

/** One of these by the answers: the best fit, or (Quick build) one of the fitting ones at random. */
function pickBy<T extends { w: number }>(xs: T[], inp: BuildInput): T | undefined {
  const sorted = [...xs].sort((a, b) => b.w - a.w);
  if (!inp.rng || sorted.length < 2) return sorted[0];
  const top = sorted.filter((x) => x.w >= sorted[0].w - 2);
  return top[Math.floor(inp.rng() * top.length)];
}

const tag = (w: Record<string, number>, ...tags: string[]) => tags.reduce((s, t) => s + Math.max(0, w[t] ?? 0), 0);

/** The folk witch powers by what the answers ask of them (Hedge Magic, Folk Witch Powers). */
function witchPowerWeights(w: Record<string, number>): Record<string, number> {
  return {
    'witch-healing': 2 + tag(w, 'healing', 'good'), 'witch-cursing': 1 + tag(w, 'curse', 'rival', 'vice'), 'witch-flight': 1 + tag(w, 'travel', 'escape'),
    'animal-ken': 1 + tag(w, 'animals', 'outdoors', 'companion'), 'second-sight': 1 + tag(w, 'senses', 'perception'), dowsing: 1 + tag(w, 'lore', 'wealth', 'senses'), shapeshifter: tag(w, 'shapechanged', 'animals', 'outsider'),
  };
}

const GRUAGACH_FORM_TAGS: Record<string, string[]> = { blessing: ['good', 'healing', 'social'], curse: ['curse', 'rival', 'vice', 'combat'], shape: ['animals', 'shapechanged', 'outsider'], vision: ['senses', 'visions', 'perception'] };
const LEARNED_TECH_TAGS: Record<string, string[]> = { tueor: ['magic-resistance', 'escape', 'good'], succurro: ['healing', 'good', 'social'], vulnero: ['combat', 'curse', 'rival'] };
const LEARNED_FORM_TAGS: Record<string, string[]> = { fortunam: ['escape', 'wealth', 'social'], magicam: ['lore', 'magic-resistance', 'realm:magic'], salutem: ['healing', 'aging', 'soak'] };
const FOCUS_TAGS: Record<string, string[]> = {
  'Victory runes': ['combat'], 'Ale runes': ['escape', 'soak'], 'Fertility runes': ['wealth', 'family'], 'Sea runes': ['travel'], 'Healing runes': ['healing'],
  'Speech runes': ['social', 'leadership'], 'Wisdom runes': ['scholarship', 'lore', 'senses'], 'Strength runes': ['outdoors', 'animals', 'curse'],
};
/** A faerie tradition by what the answers ask: Ollamhain perform, Volkhvy hold great rites, Wise Folk ward and mend, Borrowers bargain. */
const FAERIE_TAGS: Record<string, string[]> = { ollamhain: ['performance', 'social', 'visions'], volkhvy: ['courts', 'leadership', 'outdoors'], 'wise-folk': ['healing', 'good', 'curse'], borrowers: ['wealth', 'travel', 'courts'] };
const FAERIE_METHOD_IDS: readonly string[] = ['evocation', 'enchantment', 'empathy'];
const FAERIE_POWER_IDS: readonly string[] = ['beguile', 'conjure', 'dream', 'grant', 'portage', 'ware', 'weal', 'woe'];
/** A Sympathy Trait for each, narrower than a Form (RoP: Faerie line 5842; Dawn, Hounds and Storms are the book's own). */
const FAERIE_TRAITS: Record<string, string[]> = { ollamhain: ['Song', 'Harps', 'Dreams'], volkhvy: ['Winter', 'Storms', 'Birch trees'], 'wise-folk': ['Dawn', 'Hounds', 'Hearths'], borrowers: ['Bargains', 'Roads', 'Markets'] };

/** The runes a vitki favors, best first: the focus's, then those of the purposes the answers care about. */
function favoredRunes(c: Character, w: Record<string, number>, inp: BuildInput): (typeof RUNES)[number][] {
  const weight = new Map<string, number>(RUNES.map((r) => [r.name, 0]));
  for (const f of VITKAR_FOCI) for (const r of f.runes) weight.set(r, (weight.get(r) ?? 0) + 1 + tag(w, ...(FOCUS_TAGS[f.name] ?? [])));
  for (const v of c.virtues) if (['minor-rune-focus', 'deft-rune', 'mastered-rune'].includes(v.defId) && v.param) weight.set(v.param, (weight.get(v.param) ?? 0) + 10);
  const focus = c.virtues.find((v) => v.defId === 'major-rune-focus')?.param;
  for (const f of VITKAR_FOCI) if (focus?.startsWith(f.name)) for (const r of f.runes) weight.set(r, (weight.get(r) ?? 0) + 8);
  const jitter = (name: string) => (inp.rng ? inp.rng() * 2 : 0) + name.length * 1e-3;
  return [...RUNES].sort((a, b) => weight.get(b.name)! + jitter(b.name) - (weight.get(a.name)! + jitter(a.name)));
}

/**
 * The Virtues the tradition requires, before the build's own choice of Virtues takes their points:
 * an unGifted folk witch's powers, an unGifted gruagach's body and Arts, an unGifted learned
 * magician's Arts, a faerie wizard's Method, Power and Sympathy; and the Flaw a folk witch must take.
 */
export function addTraditionVirtues(c: Character, st: GuidedState, inp: BuildInput, get: () => GuidedContext, log: string[], add: Add, clean: Clean, cap: number) {
  // a faerie wizard is known by the Method this takes, so before it by the answers
  const t = traditionOf(c) ?? wantedTradition(st, c);
  if (!t) return;
  const data = inp.data;
  const w = tagWeights(st, get());
  const gifted = c.virtues.some((v) => v.defId === 'the-gift');
  const has = (id: string) => c.virtues.some((v) => v.defId === id);
  const room = () => cap - get().d.tally.virtuePoints;
  const scored = (id: string) => evaluate(st, get()).scored.find((s) => s.def.id === id);
  /** Take a Virtue or Flaw the chapter asks for, if the rules allow it and there is room. */
  const take = (id: string, size: VFSize, why: string, param?: string): boolean => {
    // the chapter requires it, so a Virtue the questions gate out (a spell-like power for a player who
    // wants simple rules) is still taken; one the player declined, or a plain build's, is not
    if (st.declined.includes(id)) return false;
    const def = data.vfById.get(id);
    const rec = vfRecords(data).get(id);
    const s = scored(id) ?? (def && rec ? scoreOption(def, rec, st, w, get()) : undefined);
    if (!s || has(id) || !clean(s.def, size)) return false;
    if (s.def.kind === 'virtue' && SIZE_POINTS[size] > room()) return false;
    const cv = add({ ...s, param: param ?? s.param }, size);
    cv.why = why;
    log.push(`${s.def.kind === 'flaw' ? 'Flaw' : 'Virtue'}: ${s.def.name}${param ? ` (${param})` : ''}, ${size} — ${why.replace(/^from: /, '')}.`);
    return true;
  };

  if (t === 'witch') {
    // "you must also assign at least one Flaw that impacts on the folk witch's magical abilities" (HMRE line 1572)
    const limits = ['unstable-magic-flaw', 'harsh-moon-flaw', 'silent-tradition-flaw', ...(gifted ? ['flawed-folk-witch-gift-opening'] : [])];
    const flaw = pickBy(limits.map((id) => ({ id, w: (scored(id)?.fit ?? 0) / 10 })), inp);
    if (flaw && !c.virtues.some((v) => data.vfById.get(v.defId)?.kind === 'flaw' && limits.includes(v.defId))) {
      const param = flaw.id === 'flawed-folk-witch-gift-opening' ? 'Shapeshifter' : undefined;
      take(flaw.id, 'Minor', 'from: a folk witch takes a Flaw that limits their magic', param);
    }
    if (!gifted) {
      // "you may only assign her experience points to Supernatural Abilities to which she has the corresponding Virtues" (line 1580)
      const pw = witchPowerWeights(w);
      const major = pickBy(['witch-healing', 'witch-cursing'].map((id) => ({ id, w: pw[id] })), inp);
      if (major) take(major.id, 'Major', 'from: a folk witch’s power, the one your answers want most');
      const minors = ['witch-flight', 'animal-ken', 'second-sight', 'dowsing'].map((id) => ({ id, w: pw[id] }));
      for (let n = 0; n < 2; n++) {
        const m = pickBy(minors.filter((x) => !has(x.id)), inp);
        if (m) take(m.id, 'Minor', 'from: a folk witch’s power');
      }
    }
  }

  if (t === 'gruagach' && !gifted) {
    // an unGifted gruagach needs Giant Blood, Large or Shapeshifter, and a Technique and Form pair (HMRE line 2825)
    const body = pickBy([{ id: 'large', w: 2 + tag(w, 'combat') }, { id: 'giant-blood', w: tag(w, 'combat', 'soak') - 2 }, { id: 'shapeshifter', w: tag(w, 'animals', 'shapechanged') - 1 }], inp)!;
    if (!['large', 'giant-blood', 'shapeshifter'].some(has) && !take(body.id, body.id === 'large' ? 'Minor' : 'Major', 'from: Gruagach’s favor, which an unGifted gruagach must have')) take('large', 'Minor', 'from: Gruagach’s favor, which an unGifted gruagach must have');
    const tech = pickBy(GRUAGACH_TECHNIQUES.map((x) => ({ id: x.virtue, w: x.virtue === 'give' ? 1 + tag(w, 'good', 'healing') : 1 + tag(w, 'curse', 'rival') })), inp)!;
    take(tech.id, 'Major', 'from: a gruagach’s Technique');
    // a Form the Technique has spells for in the book (Take has none of Blessing below 25), so the master has something to teach
    const techAbbr = GRUAGACH_TECHNIQUES.find((x) => x.virtue === tech.id)?.abbr ?? '';
    const taught = (abbr: string) => GRUAGACH_SPELLS.some((sp) => !sp.general && sp.tf === `${techAbbr}${abbr}` && sp.level <= 20);
    const form = pickBy(GRUAGACH_FORMS.map((x) => ({ id: x.virtue, w: (1 + tag(w, ...(GRUAGACH_FORM_TAGS[x.virtue] ?? []))) * (taught(x.abbr) ? 1 : 0.2) })), inp)!;
    take(form.id, 'Minor', 'from: a gruagach’s Form');
  }

  if (t === 'learned' && !gifted) {
    // "a character must possess at least one Hedge Technique and Form" (HMRE line 4149); most know "one or two Techniques and a couple of Forms" (line 4123)
    const tech = pickBy(LEARNED_TECHNIQUES.map((x) => ({ id: x.id, w: 1 + tag(w, ...(LEARNED_TECH_TAGS[x.id] ?? [])) })), inp)!;
    take(tech.id, 'Major', 'from: a learned magician’s Technique');
    const forms = LEARNED_FORMS.map((x) => ({ id: x.id, w: 1 + tag(w, ...(LEARNED_FORM_TAGS[x.id] ?? [])) }));
    for (let n = 0; n < 2; n++) {
      const f = pickBy(forms.filter((x) => !has(x.id)), inp);
      if (f && (n === 0 || room() >= 2)) take(f.id, 'Minor', 'from: a learned magician’s Form');
    }
  }

  if (t === 'faerie') {
    // "at least four points of the character's starting Virtues to a Faerie Method and a Faerie Power ... and Sympathy Traits" (RoP: Faerie line 7503)
    // a Method, Power or Summoning the player names is taken, in the tradition that favors it most
    const named = (ids: readonly string[]) => ids.filter((id) => (st.answers[`vf:${id}`] ?? 0) >= 7);
    const asked = named([...FAERIE_METHOD_IDS, ...FAERIE_POWER_IDS, 'summoning']);
    const favors = (x: (typeof FAERIE_TRADITIONS)[number], id: string) => x.favored.includes(id === 'summoning' ? 'faerie-summoning' : id);
    const trad = pickBy(FAERIE_TRADITIONS.map((x) => ({ x, w: 1 + tag(w, ...(FAERIE_TAGS[x.id] ?? [])) + 10 * asked.filter((id) => favors(x, id)).length })), inp)!.x;
    if (!c.creation.concept || /^faerie wizard$/i.test(c.creation.concept)) c.creation.concept = `Faerie wizard of the ${trad.name}`;
    log.push(`Faerie tradition: the ${trad.name} (favored: ${trad.favored.map((id) => data.abilityById.get(id)?.name ?? id).join(', ')}).`);
    const sizeOf = (id: string): VFSize => (data.vfById.get(id)?.sizes.includes('Minor') ? 'Minor' : 'Major');
    if (trad.id === 'borrowers' || asked.includes('summoning')) take('summoning', 'Major', asked.includes('summoning') ? 'from: Summoning, which you asked for by name' : `from: the ${trad.name} bargain with faeries (Summoning)`);
    if (trad.id !== 'borrowers' || named(FAERIE_METHOD_IDS).length) {
      const method = named(FAERIE_METHOD_IDS)[0] ?? trad.favored.find((id) => FAERIE_METHOD_IDS.includes(id))!;
      take(method, sizeOf(method), favors(trad, method) ? `from: the Method the ${trad.name} favor` : 'from: the Method you asked for by name');
      const powers = named(FAERIE_POWER_IDS).length ? named(FAERIE_POWER_IDS) : trad.favored.filter((id) => FAERIE_POWER_IDS.includes(id));
      const power = pickBy(powers.map((id) => ({ id, w: 1 + (id === 'weal' ? tag(w, 'healing') : id === 'woe' ? tag(w, 'curse') : id === 'dream' ? tag(w, 'visions') : 0) })), inp)!;
      take(power.id, sizeOf(power.id), favors(trad, power.id) ? `from: a Power the ${trad.name} favor` : 'from: the Power you asked for by name');
    }
    if (!has('faerie-sympathy')) {
      const names = FAERIE_TRAITS[trad.id] ?? ['Dawn'];
      const trait = inp.rng ? names[Math.floor(inp.rng() * names.length)] : names[0];
      if (!take('faerie-sympathy', 'Major', 'from: the Sympathy Trait a faerie wizard’s rites need', trait)) take('faerie-sympathy', 'Minor', 'from: the Sympathy Trait a faerie wizard’s rites need', trait);
    }
  }
}

/** Traits for a Faerie Sympathy or Antipathy the build left open, from the book's own examples (RoP: Faerie lines 5842-5846, 6341). */
const OPEN_SYMPATHY = ['Hounds', 'Ice', 'Storms', 'Dawn', 'Fear'];
const OPEN_ANTIPATHY = ['Iron', 'Courage'];

/**
 * A Sympathy Trait on the sheet for each Faerie Sympathy (+3 for the Major Virtue, +1 for the Minor)
 * and Faerie Antipathy (−3, −1) (RoP: Faerie lines 6367, 6523). One whose Trait the build left to be
 * decided takes one: a faerie wizard's from their tradition's, else one of the book's examples.
 */
export function addSympathyTraits(c: Character) {
  const held = () => new Set((c.sympathy ?? []).map((x) => x.trait.toLowerCase()).concat(c.virtues.filter((v) => v.param).map((v) => v.param!.toLowerCase())));
  const own = Object.values(FAERIE_TRAITS).find((xs) => xs.some((x) => held().has(x.toLowerCase()))) ?? [];
  for (const v of c.virtues) {
    const flaw = v.defId === 'faerie-antipathy-flaw';
    if (v.defId !== 'faerie-sympathy' && !flaw) continue;
    if (!v.param || v.param === TO_DECIDE) v.param = (flaw ? OPEN_ANTIPATHY : [...own, ...OPEN_SYMPATHY]).find((x) => !held().has(x.toLowerCase())) ?? v.param;
    if (!v.param || v.param === TO_DECIDE) continue;
    if ((c.sympathy ?? []).some((x) => x.trait.toLowerCase() === v.param!.toLowerCase())) continue;
    const score = v.size === 'Major' ? 3 : 1;
    c.sympathy = [...(c.sympathy ?? []), { uid: uid(), trait: v.param, score: flaw ? -score : score }];
  }
}

// ------------------------------------------------------------------ experience

interface Want {
  id: string;
  param?: string;
  /** how much it is wanted */
  w: number;
  /** the highest score it is raised to */
  max: number;
}

/**
 * Raise an Ability toward a score from a pool, by whole steps as far as the pool allows (an Art-like
 * Ability, such as a rune or a gruagach Form, at an Art's cost). Returns the experience spent.
 */
function raiseTo(c: Character, inp: BuildInput, get: () => GuidedContext, refresh: () => void, pool: XpSource, id: string, param: string | undefined, score: number, why: string): number {
  const def = inp.data.abilityById.get(id);
  const budget = get().d.budgets.find((x) => x.id === pool);
  // one the character may learn (an Arcane Ability needs Arcane Lore or the like) and the pool may buy
  if (!def || !inp.data.inBooks(def) || !budget || !abilityAvailability(get().d, inp.data, id, param).ok || !canSpend(get().d, inp.data, budget, { abilityId: id, param }).ok) return 0;
  const had = c.abilities.some((a) => a.abilityId === id && (a.param ?? '') === (param ?? ''));
  const ab = ensureAbility(c, id, {}, param);
  const cap = get().d.abilityByUid.get(ab.uid)?.cap ?? get().d.ageCap;
  let spent = 0;
  for (let s = abilityScore(sumAlloc(ab.xp), def.asArt) + 1; s <= Math.min(score, cap); s++) {
    const step = abilityXp(s, def.asArt) - sumAlloc(ab.xp);
    const left = budget.total - budget.spent - spent;
    if (step > left) break;
    ab.xp[pool] = (ab.xp[pool] ?? 0) + step;
    spent += step;
  }
  if (spent) ab.why ??= why;
  else if (!had && !sumAlloc(ab.xp)) c.abilities = c.abilities.filter((a) => a !== ab);
  refresh();
  return spent;
}

/** Spend up to `xp` of a pool on the wanted Abilities, each step to the one wanted most for its score. */
function spendWants(c: Character, inp: BuildInput, get: () => GuidedContext, refresh: () => void, pool: XpSource, wants: Want[], xp: number, why: string) {
  let left = xp;
  const blocked = new Set<string>();
  for (let guard = 0; guard < 120 && left > 0; guard++) {
    const score = (x: Want) => {
      const ab = c.abilities.find((a) => a.abilityId === x.id && (a.param ?? '') === (x.param ?? ''));
      return ab ? abilityScore(sumAlloc(ab.xp), inp.data.abilityById.get(x.id)?.asArt) : 0;
    };
    const next = wants.filter((x) => !blocked.has(`${x.id}|${x.param ?? ''}`) && score(x) < x.max).sort((a, b) => b.w / (score(b) + 1) - a.w / (score(a) + 1))[0];
    if (!next) break;
    const before = left;
    const spent = raiseTo(c, inp, get, refresh, pool, next.id, next.param, score(next) + 1, why);
    if (!spent || spent > before) blocked.add(`${next.id}|${next.param ?? ''}`);
    left -= spent;
  }
}

const poolLeft = (get: () => GuidedContext, pool: XpSource) => {
  const b = get().d.budgets.find((x) => x.id === pool);
  return b ? b.total - b.spent : 0;
};

/**
 * The tradition's apprenticeship as its chapter spends it: the least scores first, then the
 * tradition's own Abilities by the answers, leaving the rest of the pool for the Abilities the
 * player ranks highest (spent after this, as every other pool is). Then its spells, scripts or
 * charms. A faerie wizard has no apprenticeship: their Method and Power rise from later life.
 */
export function spendTradition(c: Character, st: GuidedState, inp: BuildInput, get: () => GuidedContext, refresh: () => void, log: string[]) {
  const t = traditionOf(c);
  if (!t || t === 'faerie') return;
  const def = TRADITION_BY_ID.get(t)!;
  const w = tagWeights(st, get());
  const gifted = c.virtues.some((v) => v.defId === 'the-gift');
  const holds = (id: string) => c.abilities.some((a) => a.abilityId === id) || get().d.abilityAccess.abilities.has(id);
  const done: string[] = [];
  const least = (pool: XpSource, id: string, param: string | undefined, score: number, label: string) => {
    raiseTo(c, inp, get, refresh, pool, id, param, score, `from: ${def.member} begins with at least ${score} (Hedge Magic)`);
    done.push(`${label} ${score}`);
  };

  if (t === 'witch') {
    const pool = FOLK_APPRENTICESHIP;
    // "a Gifted folk witch should have a minimum score of 1 in ... Animal Ken, Cursing, Dowsing, Flight, Healing, Second Sight, Shapeshifter, and Folk Witch Magic Theory" (HMRE line 1588)
    const powers = WITCH_POWERS.filter((p) => p.id !== 'animal-healing' && holds(p.id));
    for (const p of powers) least(pool, p.id, undefined, 1, p.name);
    least(pool, 'folk-witch-magic-theory', undefined, 1, 'Folk Witch Magic Theory');
    // "a good idea for a folk witch to have a score in the Abilities Animal Handling, Concentration, Organization Lore: Folk Witch, and Penetration" (line 1590)
    for (const [id, param, label] of [['animal-handling', undefined, 'Animal Handling'], ['concentration', undefined, 'Concentration'], ['organization-lore', def.lore, 'Folk Witch Lore'], ['penetration', undefined, 'Penetration']] as const) least(pool, id, param, 1, label);
    const pw = witchPowerWeights(w);
    const wants: Want[] = [...powers.map((p) => ({ id: p.id, w: pw[p.id] ?? 1, max: 6 })), { id: 'folk-witch-magic-theory', w: 3, max: 5 }, { id: 'penetration', w: 1, max: 3 }];
    spendWants(c, inp, get, refresh, pool, wants, Math.floor(poolLeft(get, pool) * 0.65), `from: ${def.member}’s magic, by your answers`);
  }

  if (t === 'gruagach') {
    const pool = GRUAGACH_APPRENTICESHIP;
    // "must have a score of 2 in Pictish and Gruagach Lore, as well as scores of 1 in all of the gruagach Arts" (HMRE line 2811); an unGifted one, those of its Virtues
    least(pool, 'dead-language', 'Pictish', gifted ? 2 : 1, 'Pictish');
    least(pool, 'organization-lore', def.lore, gifted ? 2 : 1, 'Gruagach Lore');
    const arts = [...GRUAGACH_TECHNIQUES, ...GRUAGACH_FORMS].filter((a) => holds(a.id));
    for (const a of arts) least(pool, a.id, undefined, 1, a.name);
    const pictish = () => languageScore(c, get().d, 'Pictish');
    const formW = (id: string) => 1 + tag(w, ...(GRUAGACH_FORM_TAGS[GRUAGACH_FORMS.find((f) => f.id === id)?.virtue ?? ''] ?? []));
    const wants: Want[] = arts.map((a) => ({ id: a.id, w: GRUAGACH_TECHNIQUES.some((x) => x.id === a.id) ? 3 : formW(a.id), max: gruagachArtCap(pictish()) }));
    spendWants(c, inp, get, refresh, pool, [...wants, { id: 'penetration', w: 1, max: 3 }, { id: 'concentration', w: 1, max: 3 }], Math.floor(poolLeft(get, pool) * 0.7), `from: ${def.member}’s Arts, by your answers`);
  }

  if (t === 'learned') {
    const pool = LEARNED_TRAINING;
    // "minimum scores of 1 in Latin to learn charms and 1 in Artes Liberales to create amulets and chartae" (HMRE line 4139)
    least(pool, 'dead-language', 'Latin', 1, 'Latin');
    least(pool, 'artes-liberales', undefined, 1, 'Artes Liberales');
    // a Gifted magician's Gift opens all six; the build raises the Technique and two Forms the answers want
    const techs = LEARNED_TECHNIQUES.filter((x) => (gifted ? true : c.virtues.some((v) => v.defId === x.id))).map((x) => ({ id: x.id, w: 2 + tag(w, ...(LEARNED_TECH_TAGS[x.id] ?? [])) })).sort((a, b) => b.w - a.w);
    const forms = LEARNED_FORMS.filter((x) => (gifted ? true : c.virtues.some((v) => v.defId === x.id))).map((x) => ({ id: x.id, w: 1 + tag(w, ...(LEARNED_FORM_TAGS[x.id] ?? [])) })).sort((a, b) => b.w - a.w);
    const arts = [...techs.slice(0, gifted ? 1 : 2), ...forms.slice(0, 2)];
    // a fifth of the training for charms, at 5 levels a point
    const forCharms = Math.floor(poolLeft(get, pool) * 0.2);
    spendWants(c, inp, get, refresh, pool, [...arts.map((a) => ({ ...a, max: 8 })), { id: 'dead-language', param: 'Latin', w: 2, max: 4 }, { id: 'artes-liberales', w: 1, max: 3 }, { id: 'penetration', w: 1, max: 3 }], Math.max(0, poolLeft(get, pool) - forCharms), `from: ${def.member}’s training, by your answers`);
  }

  if (t === 'vitki') {
    const pool = VITKI_APPRENTICESHIP;
    // "spend 50 experience points for the character to learn Craft: Runes 2, Old Norse 3, and Rune Magic 1" (HMRE line 6146)
    least(pool, 'craft-type', 'Runes', 2, 'Craft: Runes');
    if (languageScore(c, get().d, 'Old Norse') < 3) least(pool, 'living-language', 'Old Norse', 3, 'Old Norse');
    least(pool, 'rune-magic', undefined, 1, 'Rune Magic');
    // "at least half of which should be spent on their magical runes"; "a score of 10 in a single rune is the practical maximum"
    const runes = favoredRunes(c, w, inp).slice(0, 4);
    const total = get().d.budgets.find((b) => b.id === pool)?.total ?? 240;
    const whyRunes = `from: ${def.member}’s runes (at least half the apprenticeship)`;
    spendWants(c, inp, get, refresh, pool, runes.map((r, i) => ({ id: r.id, w: 4 - i, max: 10 })), Math.ceil(total / 2) + 5, whyRunes);
    // whole steps, and the cap on a young character's scores (DE p.48), can stop short of half: the
    // lowest rune that can rise goes up a step until it is reached, a fifth favored rune when four are capped
    const runeScore = (id: string) => abilityScore(sumAlloc(c.abilities.find((a) => a.abilityId === id)?.xp ?? {}), true);
    const onRunes = () => c.abilities.filter((a) => RUNES.some((r) => r.id === a.abilityId)).reduce((t, a) => t + (a.xp[pool] ?? 0), 0);
    const favored = favoredRunes(c, w, inp);
    for (let guard = 0; guard < 40 && onRunes() < Math.ceil(total / 2); guard++) {
      const order = [...favored.slice(0, 4).sort((a, b) => runeScore(a.id) - runeScore(b.id)), ...favored.slice(4)];
      if (!order.some((r) => runeScore(r.id) < 10 && raiseTo(c, inp, get, refresh, pool, r.id, undefined, runeScore(r.id) + 1, whyRunes))) break;
    }
    spendWants(c, inp, get, refresh, pool, [{ id: 'rune-magic', w: 2, max: 4 }, { id: 'craft-type', param: 'Runes', w: 1, max: 4 }, ...runes.map((r) => ({ id: r.id, w: 1, max: 10 }))], Math.floor(poolLeft(get, pool) * 0.3), `from: ${def.member}’s craft, by your answers`);
  }
  if (done.length) log.push(`${def.member[0].toUpperCase()}${def.member.slice(1)}: the least scores the chapter asks for (${done.join(', ')}).`);
}

// ------------------------------------------------------------------ magic known

/** What a known spell, script or charm may reach: what the caster makes on an average roll, with the Fatigue level that buys 10 more. */
const reach = (expected: number) => expected + 10;

/**
 * The spells, rune scripts or charms the apprenticeship teaches, from the book's samples, for the
 * Arts or runes the character has, the highest each can cast first: a gruagach's levels of spells,
 * a vitki's 120 levels of scripts, a learned magician's charms at 5 levels a point of training left.
 */
export function chooseTraditionMagic(c: Character, inp: BuildInput, get: () => GuidedContext, refresh: () => void, log: string[], phase: 'charms' | 'spells') {
  const t = traditionOf(c);
  if (!t || (phase === 'charms') !== (t === 'learned')) return;
  const d = get().d;
  const rng = inp.rng;
  const draw = <T,>(xs: T[]) => (rng && xs.length > 1 ? xs[Math.floor(rng() * Math.min(3, xs.length))] : xs[0]);
  const picked: string[] = [];
  let unspent = 0;
  if (t === 'gruagach' && !(c.gruagach?.spells ?? []).some((x) => x.source === 'training')) {
    const levels = () => d.budgets.find((b) => b.id === GRUAGACH_APPRENTICESHIP)?.spellLevels;
    const lv = levels();
    if (!lv) return;
    let left = lv.total - lv.spent;
    const spells = [...(c.gruagach?.spells ?? [])];
    for (let guard = 0; guard < 12 && left >= 5; guard++) {
      const cands = GRUAGACH_SPELLS.filter((s) => !s.general && s.level <= left && !spells.some((x) => x.name === s.name))
        .map((s) => ({ s, score: gruagachCastingScore(c, d, s.tf as GruagachArts, undefined) }))
        .filter((x) => !x.score.notes.length && x.s.level <= reach(x.score.total + 6))
        .sort((a, b) => b.s.level - a.s.level);
      const pick = draw(cands)?.s;
      if (!pick) break;
      spells.push({ uid: uid(), name: pick.name, tf: pick.tf, level: pick.level, range: pick.range, duration: pick.duration, target: pick.target, text: pick.text, source: 'training' });
      left -= pick.level;
      picked.push(`${pick.name} (${pick.tf} ${pick.level})`);
    }
    c.gruagach = { ...(c.gruagach ?? {}), spells };
    unspent = left;
  }
  if (t === 'vitki' && !(c.vitki?.scripts ?? []).some((x) => x.source === 'training')) {
    const lv = d.budgets.find((b) => b.id === VITKI_APPRENTICESHIP)?.spellLevels;
    if (!lv) return;
    let left = lv.total - lv.spent;
    const scripts = [...(c.vitki?.scripts ?? [])];
    for (let guard = 0; guard < 16 && left >= 5; guard++) {
      const cands = RUNE_SCRIPTS.filter((s) => s.level > 0 && s.level <= left && !scripts.some((x) => x.name === s.name))
        .map((s) => ({ s, total: vitkiCastingTotal(c, d, s.runes, undefined) }))
        .filter((x) => !x.total.unusable.length && !x.total.halved && x.s.level <= reach(x.total.total + 6))
        .map((x) => x.s)
        .sort((a, b) => b.level - a.level);
      const pick = draw(cands);
      if (!pick) break;
      scripts.push({ uid: uid(), name: pick.name, runes: [...pick.runes], level: pick.level, method: pick.method, text: pick.text, source: 'training' });
      left -= pick.level;
      picked.push(`${pick.name} (${pick.level})`);
    }
    c.vitki = { ...(c.vitki ?? {}), scripts };
    unspent = left;
  }
  if (t === 'learned' && !(c.learned?.charms ?? []).some((x) => x.source === 'training')) {
    const charms = [...(c.learned?.charms ?? [])];
    let left = 5 * poolLeft(get, LEARNED_TRAINING);
    const known = (id: string) => d.abilities.some((a) => a.abilityId === id && a.total >= 0);
    for (let guard = 0; guard < 10 && left >= 5; guard++) {
      const cands = LEARNED_CHARMS.filter((s) => !s.general && s.level <= left && !charms.some((x) => x.name === s.name))
        .filter((s) => known(LEARNED_TECHNIQUES.find((x) => x.abbr === s.tf.slice(0, 2))?.id ?? '') && known(LEARNED_FORMS.find((x) => x.abbr === s.tf.slice(2))?.id ?? ''))
        .filter((s) => s.level <= reach((castingScore(c, d, s.tf as LearnedArts, undefined).total + 6) / 2))
        .sort((a, b) => b.level - a.level);
      const pick = draw(cands);
      if (!pick) break;
      charms.push({ uid: uid(), name: pick.name, tf: pick.tf, level: pick.level, range: pick.range, duration: pick.duration, target: pick.target, text: pick.text, source: 'training' });
      left -= pick.level;
      picked.push(`${pick.name} (${pick.tf} ${pick.level})`);
    }
    c.learned = { ...(c.learned ?? {}), charms };
  }
  refresh();
  const kind = t === 'vitki' ? 'Rune scripts' : t === 'learned' ? 'Charms' : 'Spells';
  if (picked.length) log.push(`${kind} from the apprenticeship: ${picked.join(', ')}.`);
  // the book's samples are few for some pairs of Arts: what is left is the player's to design
  if (unspent >= 5) log.push(`${kind}: ${unspent} levels left from the apprenticeship, for you to design on the ${t === 'vitki' ? 'Runes' : 'Hedge magic'} page.`);
}

/** The Abilities a tradition's member raises in later life too, weighted for the build's ranking. */
export function traditionAbilities(c: Character, w: Record<string, number>): { id: string; w: number }[] {
  const t = traditionOf(c);
  if (t !== 'faerie') return [];
  // a faerie wizard's Method, Power and Arts of the Ars Fabulosa are what their rites and bargains are cast with
  const own = TRADITION_BY_ID.get('faerie')!.own.filter((id) => c.virtues.some((v) => v.defId === id)).map((id) => (id === 'summoning' ? 'faerie-summoning' : id));
  return [...own.map((id) => ({ id, w: 4 + Math.max(0, w['realm:faerie'] ?? 0) })), { id: 'faerie-lore', w: 2 }];
}
