// Auto-build (design spec, section 7): turn the guided build's answers into a complete, legal
// draft. It takes the best-fitting options within the Virtue budget, balances them with Flaws
// chosen by the direction rules, sets every sub-choice to the best fit, spends Characteristic
// points and experience by the ratings, and then runs the rules check and its fixes until the
// draft is clean. Every item records why it was chosen.

import { CHARACTERISTICS, type Characteristic, type GameData } from '../../data';
import { EX_MISC_TRADITIONS, HEARTBEASTS, HOUSE_BY_ID } from '../../data/houses';
import { CHAR_DESCRIPTORS } from '../../data/lists';
import type { Character, GuidedState } from '../types';
import { deriveCharacter, sumAlloc, type DerivedCharacter } from '../character/derive';
import { addVirtue, applyExMiscTradition, applyMythicType, MYTHIC_TYPES, removeVirtue, setHouse } from '../character/factory';
import { abilityAvailability } from '../character/restrictions';
import { validateCharacter, type Issue } from '../character/validate';
import { fixesFor, resolveAll } from '../character/fixes';
import { uid } from '../../util/id';
import type { Rng } from '../dice';
import { optionOn } from '../optional';
import { beastFor } from '../heartbeast';
import { abilityTag } from './records';
import { evaluate, recommendHouses, statusShortlist, tagWeights, traceOf, type GuidedContext, type Scored } from './score';

import { ACTS, balance, buildVirtuesAndFlaws } from './buildVirtues';
import { chooseSpells, spendExperience } from './buildExperience';
import { answer, ctxFor, mythicTypeOf, paramFor, type BuildInput, type BuildResult } from './buildShared';
import { TRADITION_STATUSES, addSympathyTraits, mundaneStatus, needsMundaneStatus, resetTradition, takeTradition } from './traditions';

export { TRIBUNAL_LANGUAGE, mythicTypeOf, type BuildInput, type BuildResult } from './buildShared';

/**
 * Clear the choices a draft makes, keeping who the character is (name, type, concept, age and covenant)
 * and a Mythic Companion's type with the Virtues and Flaws it requires.
 */
export function resetChoices(c: Character) {
  const mt = c.type === 'mythic' ? MYTHIC_TYPES[mythicTypeOf(c) ?? ''] : undefined;
  const keep = new Set(mt ? [mt.virtue, mt.freeMinor, ...[...mt.requiredVirtues, ...mt.requiredFlaws].map((x) => (typeof x === 'string' ? x : x.id))] : []);
  c.virtues = c.virtues.filter((v) => ['the-gift', 'hermetic-magus'].includes(v.defId) || (c.type === 'grog' && v.defId === 'covenfolk') || keep.has(v.defId));
  resetTradition(c);
  if (c.type === 'magus') c.house = undefined;
  c.abilities = c.abilities.filter((a) => a.native);
  for (const k of Object.keys(c.arts)) c.arts[k as keyof Character['arts']] = {};
  c.spells = [];
  // a hedge tradition's spells, scripts and charms from the apprenticeship are chosen again
  if (c.gruagach?.spells) c.gruagach.spells = c.gruagach.spells.filter((x) => x.source !== 'training');
  if (c.vitki?.scripts) c.vitki.scripts = c.vitki.scripts.filter((x) => x.source !== 'training');
  if (c.learned?.charms) c.learned.charms = c.learned.charms.filter((x) => x.source !== 'training');
  for (const k of Object.keys(c.characteristics)) c.characteristics[k as keyof Character['characteristics']] = 0;
  c.personality = c.personality.filter((p) => c.type === 'grog' && p.trait === 'Loyal');
  c.creation.childhoodPackage = undefined;
  c.creation.guidedWhy = {};
}

/** Build the draft on `c` (mutated). */
export function autoBuild(c: Character, st: GuidedState, inp: BuildInput): BuildResult {
  const log: string[] = [];
  const toDecide: string[] = [];
  const why: Record<string, string> = { ...(c.creation.guidedWhy ?? {}) };
  c.guided = structuredClone(st);
  let ctx = ctxFor(c, inp);
  const refresh = () => (ctx = ctxFor(c, inp));

  // ---------------------------------------------------------------- House
  if (c.type === 'magus' && !c.house) {
    const ev = evaluate(st, ctx);
    const pick = (st.house && HOUSE_BY_ID[st.house] ? st.house : undefined) ?? recommendHouses(ev, ctx)[0]?.id;
    if (pick) {
      const h = HOUSE_BY_ID[pick];
      // the House benefit that fits best
      let best = 0;
      let bestFit = -Infinity;
      h.benefitOptions.forEach((b, i) => {
        if (b.rule && !optionOn(inp.saga, b.rule)) return;
        const s = ev.scored.find((x) => x.def.id === b.virtueId);
        if (s && s.fit > bestFit) {
          bestFit = s.fit;
          best = i;
        }
      });
      setHouse(c, inp.data, pick, best);
      // Jerbiton: the free Minor Virtue from the House's list that fits best (DE, House Jerbiton)
      if (h.freeChoiceFrom) {
        const fits = h.freeChoiceFrom
          .map((id) => ev.scored.find((x) => x.def.id === id))
          .filter((x): x is Scored => !!x && x.def.sizes.includes('Minor') && !c.virtues.some((v) => v.defId === x.def.id))
          .sort((a, b) => b.fit - a.fit);
        const choice = fits[0];
        if (choice) {
          // tied to an Ability: one of scholarship, art or dealing with people (Societates, Free Virtue), the one that matters most
          let param = paramFor(choice);
          if (choice.def.param?.kind === 'ability' && h.freeChoiceAbilities && !h.freeChoiceAbilities.includes(param ?? '')) {
            const w = tagWeights(st, ctx);
            const suits = h.freeChoiceAbilities.filter((id) => !id.endsWith('-type') && inp.data.abilityById.get(id) && abilityAvailability(ctx.d, inp.data, id).ok);
            param = [...suits].sort((x, y) => (w[abilityTag(y, inp.data.abilityById.get(y)?.type)] ?? 0) - (w[abilityTag(x, inp.data.abilityById.get(x)?.type)] ?? 0))[0];
          }
          setHouse(c, inp.data, pick, best, { defId: choice.def.id, param });
          log.push(`Jerbiton's free Virtue: ${choice.def.name}.`);
        }
      }
      // Ex Miscellanea: the tradition whose Virtues fit best, and whose Flaw hurts least
      if (pick === 'ex-miscellanea') {
        const fitOf = (id: string) => ev.scored.find((x) => x.def.id === id)?.fit ?? 0;
        // a tradition whose book the saga uses and whose Virtues the data has
        const known = (t: (typeof EX_MISC_TRADITIONS)[number]) => !(t.womenOnly && c.gender === 'Male') && inp.data.isBookEnabled(t.source) && [t.majorNonHermetic, t.minorHermetic, t.majorHermeticFlaw].every((id) => inp.data.vfById.get(id));
        const trad = [...EX_MISC_TRADITIONS.filter((t) => t.id !== 'custom' && known(t))].sort(
          (a, b) => fitOf(b.majorNonHermetic) + fitOf(b.minorHermetic) - fitOf(b.majorHermeticFlaw) - (fitOf(a.majorNonHermetic) + fitOf(a.minorHermetic) - fitOf(a.majorHermeticFlaw)),
        )[0];
        if (trad) {
          applyExMiscTradition(c, inp.data, trad.id);
          log.push(`Ex Miscellanea tradition: ${trad.name}.`);
        }
      }
      // what a tradition's magi may not have is not offered to them (a Seirene and Quiet Magic)
      const mine = EX_MISC_TRADITIONS.find((t) => t.id === c.creation.exMiscTradition);
      if (pick === 'ex-miscellanea' && mine?.forbids?.length) {
        st.declined = [...new Set([...st.declined, ...mine.forbids])];
      }
      // Quick build's Bjornaer has a heartbeast; a player's own is theirs to choose (the House step asks)
      // a player's Bjornaer: one of the core book's beasts, whose statistics the sheet can show in heartbeast form
      if (pick === 'bjornaer' && !c.heartbeast && inp.rng) {
        const book = HEARTBEASTS.filter((h) => beastFor(h));
        c.heartbeast = book[Math.floor(inp.rng() * book.length)];
      }
      why.house = st.house ? 'you chose it' : 'from: the best fit for your answers';
      log.push(`House ${h.name} (${why.house}).`);
      refresh();
    }
  }

  // ---------------------------------------------------------------- Mythic Companion type (DE p.63)
  if (c.type === 'mythic' && !mythicTypeOf(c)) {
    const ev = evaluate(st, ctx);
    const fitOf = (id: string) => ev.scored.find((x) => x.def.id === id)?.fit ?? 0;
    const types = Object.entries(MYTHIC_TYPES);
    const [id, t] = [...types].sort((a, b) => fitOf(b[1].virtue) + fitOf(b[1].freeMinor) - (fitOf(a[1].virtue) + fitOf(a[1].freeMinor)))[0];
    const tie = types.every(([, x]) => fitOf(x.virtue) + fitOf(x.freeMinor) === fitOf(t.virtue) + fitOf(t.freeMinor));
    // with nothing to go on: what the concept names, else one at random
    const text = `${c.creation.concept ?? ''} ${c.description ?? ''}`.toLowerCase();
    const NAMES: Record<string, RegExp> = {
      'devil-child': /devil|demon|infernal|hell/, 'faerie-doctor': /faerie|fairy|fey|cunning/, nephilim: /angel|nephil|giant/, 'spirit-votary': /spirit|pagan|votary|ancestor/,
      kabbalist: /kabbal|golem|rabbi|jewish/, perfectus: /perfect|cathar/, zahid: /zahid|sufi|dervish|ascetic/,
    };
    const named = types.find(([k]) => NAMES[k]?.test(text));
    // a holy concept is one of the Divine's own types, by the character's faith: a zahid among Muslims, a kabbalist among Jews, else a Nephilim or a perfectus
    const w = ev.weights;
    const devout = (w.piety ?? 0) >= 2 || (w['holy-power'] ?? 0) >= 2 || (w['realm:divine'] ?? 0) >= 4;
    const holyTypes = c.society === 'Islamic' ? ['zahid'] : c.society === 'Jewish' ? ['kabbalist'] : (w['holy-power'] ?? 0) >= 2 || c.society === 'Provençal' ? ['perfectus', 'nephilim'] : ['nephilim', 'perfectus'];
    const holy = devout && !named ? types.find(([k]) => k === holyTypes[0]) : undefined;
    // a type of another faith is not drawn at random for a character of this one
    const ofFaith = types.filter(([, x]) => !x.society || x.society === c.society);
    const [pid, pt] = named ?? holy ?? (!tie ? [id, t] : ofFaith[Math.floor((inp.rng ?? Math.random)() * ofFaith.length)]);
    applyMythicType(c, inp.data, pid);
    why.mythicType = named ? 'what your concept names' : holy ? 'a holy concept, by the character’s faith' : !tie ? 'the best fit for your answers' : 'none fits your answers better than another, so one at random';
    log.push(`Mythic Companion type ${pt.label} (${why.mythicType}).`);
    refresh();
  }

  // ---------------------------------------------------------------- a hedge tradition: The Gift and its Social Status
  if (takeTradition(c, st, inp, ctx, log)) refresh();

  // ---------------------------------------------------------------- Social Status
  // a mathematicus also takes a status for a place in mundane society (Hedge Magic, line 4160)
  const second = mundaneStatus(c, st, ctx, inp);
  if (c.type !== 'magus' && (!ctx.d.tally.socialStatuses.length || needsMundaneStatus(c, ctx))) {
    const ev = evaluate(st, ctx);
    // a tradition's status only for its member, who has it already
    const pick = second ?? statusShortlist(ev).find((s) => s.fit > 0 && s.size !== 'Major' && !TRADITION_STATUSES.has(s.def.id)) ?? ev.scored.find((s) => s.def.id === (answer('f-travel', st, ctx) >= 7 ? 'wanderer' : 'covenfolk'));
    if (pick) {
      const cv = addVirtue(c, inp.data, pick.def.id, pick.def.sizes.includes('Free') ? 'Free' : pick.size, paramFor(pick));
      cv.why = pick.fit > 0 ? traceOf(pick, st, ctx) : 'from: the usual status for this concept';
      log.push(`Social Status: ${pick.def.name}.`);
      refresh();
    }
  }

  // ---------------------------------------------------------------- Characteristics
  const bought = spendCharacteristics(c, st, ctx, why, log);
  refresh();

  // ---------------------------------------------------------------- Virtues and Flaws
  buildVirtuesAndFlaws(c, st, inp, () => ctx, refresh, log, toDecide);
  refresh();
  // again, now that Great and Poor Characteristics and Virtue points are known
  if (bought) {
    log.pop();
    spendCharacteristics(c, st, ctx, why, log, true);
    refresh();
  }

  // ---------------------------------------------------------------- experience
  spendExperience(c, st, inp, () => ctx, refresh, why, log);
  refresh();
  if (c.type === 'magus') chooseSpells(c, st, inp, () => ctx, refresh, log);
  addSympathyTraits(c, ctx.d.warpingScore);
  refresh();

  // ---------------------------------------------------------------- personality
  for (const v of ctx.d.virtues) {
    if (!v.def || !ACTS(v.def)) continue;
    const need = v.cv.size === 'Major' ? 6 : 3;
    const trait = v.def.name.replace(/\s*\(.*\)$/, '');
    // each Personality Flaw its own trait, +3 for a Minor and +6 for a Major (DE)
    if (!c.personality.some((p) => p.trait.toLowerCase() === trait.toLowerCase())) c.personality.push({ uid: uid(), trait, score: need });
  }
  const fighter = c.abilities.some((a) => ['single-weapon', 'great-weapon', 'bows', 'thrown-weapon'].includes(a.abilityId) && sumAlloc(a.xp) > 0);
  if (fighter && !c.personality.some((p) => /brave|cowardly/i.test(p.trait))) c.personality.push({ uid: uid(), trait: 'Brave', score: 2 });

  // ---------------------------------------------------------------- descriptions and specialties
  describeCharacteristics(c, ctx.d, inp.rng);
  chooseSpecialties(c, ctx.d, inp.data, inp.rng);

  c.creation.guidedWhy = why;
  refresh();

  // ---------------------------------------------------------------- rules check
  const remaining = cleanUp(c, inp, log);
  return { log, remaining, toDecide };
}

// ------------------------------------------------------------------ Characteristics

/** A word for each Characteristic above or below average, as the book asks (what makes Strength −4 obvious). */
function describeCharacteristics(c: Character, d: DerivedCharacter, rng?: Rng) {
  for (const ch of CHARACTERISTICS) {
    const v = d.characteristics[ch].value;
    if (!v || c.characteristicNotes?.[ch]) continue;
    const words = CHAR_DESCRIPTORS[ch][v > 0 ? 'high' : 'low'];
    // the stronger the score, the stronger the word (the lists run from mild to marked)
    const at = rng ? Math.floor(rng() * words.length) : Math.min(words.length - 1, Math.abs(v) - 1);
    c.characteristicNotes = { ...(c.characteristicNotes ?? {}), [ch]: words[at] };
  }
}

/**
 * A specialty for each Ability the character has, from the book's examples: a concrete one where the
 * book gives one (falconry, not "specific animals"), the one that suits the character's Virtues and
 * concept best when several do.
 */
function chooseSpecialties(c: Character, d: DerivedCharacter, data: GameData, rng?: Rng) {
  const generic = /^(a |an |one |specific |particular |the |any )|type of|kind of/i;
  const context = [c.creation.concept ?? '', ...(c.creation.archetypes ?? []), ...d.virtues.map((v) => v.name)].join(' ').toLowerCase();
  for (const a of c.abilities) {
    if (a.specialty || !(d.abilityByUid.get(a.uid)?.score ?? 0)) continue;
    const options = (data.abilityById.get(a.abilityId)?.specialties ?? []).filter((x) => !generic.test(x) && x.length < 40);
    if (!options.length) continue;
    const fits = options.filter((x) => context.includes(x.toLowerCase().split(' ')[0]));
    const pool = fits.length ? fits : options;
    a.specialty = pool[rng ? Math.floor(rng() * pool.length) : 0];
  }
}

const TYPE_CHAR_PRIOR: Record<Character['type'], Partial<Record<Characteristic, number>>> = {
  magus: { Int: 3, Sta: 2, Com: 1, Per: 1 },
  companion: { Per: 1, Pre: 1, Com: 1, Sta: 1 },
  mythic: { Sta: 2, Per: 1, Pre: 1 },
  grog: { Sta: 2, Str: 2, Dex: 1, Qik: 1 },
};
const CHAR_COST = (v: number) => (v > 0 ? (v * (v + 1)) / 2 : -((-v * (-v + 1)) / 2));

function spendCharacteristics(c: Character, st: GuidedState, ctx: GuidedContext, why: Record<string, string>, log: string[], redo = false) {
  const d = ctx.d;
  if (!redo && d.charPointsSpent !== 0 && CHARACTERISTICS.some((ch) => c.characteristics[ch] !== 0)) return false; // the player already bought them
  const ev = evaluate(st, ctx);
  const w = (ch: Characteristic) => (ev.weights[`char:${ch}`] ?? 0) + (TYPE_CHAR_PRIOR[c.type][ch] ?? 0) * 1.5;
  const vals = Object.fromEntries(CHARACTERISTICS.map((ch) => [ch, 0])) as Record<Characteristic, number>;
  // Great (Characteristic) needs it bought at +3, Poor (Characteristic) at –3
  const pinned = new Set<Characteristic>();
  for (const e of d.effects) {
    if (e.type !== 'greatChar' || typeof e.char !== 'string' || !(CHARACTERISTICS as readonly string[]).includes(e.char)) continue;
    const ch = e.char as Characteristic;
    vals[ch] = e.amount > 0 ? 3 : -3;
    pinned.add(ch);
  }
  let budget = d.charPointsBudget - CHARACTERISTICS.reduce((s, ch) => s + CHAR_COST(vals[ch]), 0);
  // lower what the player cares least about, if they said so (each −1 buys a point)
  for (const ch of [...CHARACTERISTICS].sort((a, b) => w(a) - w(b))) {
    if (pinned.has(ch)) continue;
    if ((ev.weights[`char:${ch}`] ?? 0) <= -3 && vals[ch] > -2) {
      vals[ch] = (ev.weights[`char:${ch}`] ?? 0) <= -5 ? -2 : -1;
      budget -= CHAR_COST(vals[ch]);
    }
  }
  // then raise by weight, one step at a time
  for (let guard = 0; guard < 40 && budget > 0; guard++) {
    const options = CHARACTERISTICS.filter((ch) => !pinned.has(ch) && vals[ch] < 3 && CHAR_COST(vals[ch] + 1) - CHAR_COST(vals[ch]) <= budget && w(ch) > -2)
      .map((ch) => ({ ch, value: w(ch) / (CHAR_COST(vals[ch] + 1) - CHAR_COST(vals[ch])) }))
      .sort((a, b) => b.value - a.value);
    if (!options.length) break;
    const ch = options[0].ch;
    budget -= CHAR_COST(vals[ch] + 1) - CHAR_COST(vals[ch]);
    vals[ch]++;
  }
  for (const ch of CHARACTERISTICS) {
    c.characteristics[ch] = vals[ch];
    if (vals[ch]) why[`char:${ch}`] = (ev.weights[`char:${ch}`] ?? 0) ? `from: your rating of ${ch}` : `from: what a ${c.type} usually needs`;
  }
  log.push(`Characteristics: ${CHARACTERISTICS.filter((ch) => vals[ch]).map((ch) => `${ch} ${vals[ch] > 0 ? '+' : ''}${vals[ch]}`).join(', ') || 'all 0'}.`);
  return true;
}

// ------------------------------------------------------------------ the rules check

const IGNORED = new Set(['name']);

function cleanUp(c: Character, inp: BuildInput, log: string[]): Issue[] {
  // a vf-balance error left after a drop: rebalance first
  const { data, rules } = inp;
  for (let round = 0; round < 6; round++) {
    const res = resolveAll(c, data, rules);
    for (const a of res.applied) log.push(`Fixed: ${a}`);
    // an Ability a fix emptied (one the character turned out unable to learn) goes, rather than stay at 0
    const before = deriveCharacter(c, data, rules);
    // an Art a Virtue opens at 0 (a Goetic Art) stays, with nothing in it yet
    c.abilities = c.abilities.filter((a) => a.native || sumAlloc(a.xp) > 0 || before.abilityByUid.get(a.uid)?.granted || data.abilityById.get(a.abilityId)?.asArt);
    const d = deriveCharacter(c, data, rules);
    const issues = validateCharacter(d, data, rules).filter((i) => i.severity !== 'info' && !IGNORED.has(i.code ?? i.id));
    if (!issues.length) return [];
    let did = false;
    for (const i of issues) {
      // a warning with a safe automatic fix
      const fix = fixesFor(i, d, data, rules).find((f) => f.kind === 'apply' && f.auto);
      if (fix && fix.kind === 'apply') {
        fix.apply(c);
        log.push(`Fixed: ${fix.label}`);
        did = true;
        break;
      }
      // otherwise drop a Virtue or Flaw the build added that the check objects to
      const cv = i.vf ? c.virtues.find((v) => v.uid === i.vf && v.why) : undefined;
      if (cv) {
        const name = data.vfById.get(cv.defId)?.name ?? cv.defId;
        removeVirtue(c, data, cv.uid);
        log.push(`Dropped ${name}: ${i.message}`);
        let ctx = { c, d: deriveCharacter(c, data, rules), data, rules, saga: inp.saga, covenant: inp.covenant, archetypes: inp.archetypes };
        balance(c, inp, () => ctx, () => void (ctx = { ...ctx, d: deriveCharacter(c, data, rules) }), log);
        did = true;
        break;
      }
    }
    if (!did) return issues;
  }
  const d = deriveCharacter(c, data, rules);
  return validateCharacter(d, data, rules).filter((i) => i.severity !== 'info' && !IGNORED.has(i.code ?? i.id));
}

