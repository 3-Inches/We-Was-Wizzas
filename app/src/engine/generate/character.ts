// The character generator: a whole, legal character in one go, for a player to adjust or as a
// storyguide's NPC. The role sets the concept, Social Status, craft and gear; the guided build's
// auto-build makes every choice from the role's themes and answers, with as much randomness as
// asked for; then the generator rolls aging for an older character, adds Personality Traits and gear,
// and fills in what the saga's Tribunal customs and guild rules ask of the character. The seed makes
// it repeatable.

import { issueRedcapDevices, redcapLevels, servedByMercerHouse } from './items';
import { CHARACTERISTICS, type CharType, type Characteristic, type GameData } from '../../data';
import { CRAFTS as LIST_CRAFTS, HOMELANDS, guildOf, relatedCrafts } from '../../data/lists';
import { HOUSES } from '../../data/houses';
import type { Character, Covenant, HouseRules, Saga } from '../types';
import { addVirtue, applyMythicType, ensureAbility, newCharacter } from '../character/factory';
import { resolveAll } from '../character/fixes';
import { deriveCharacter, type DerivedCharacter } from '../character/derive';
import { vfProblems } from '../character/restrictions';
import { validateCharacter, type Issue } from '../character/validate';
import { autoBuild } from '../guided/autobuild';
import { CHAR_PRESETS } from '../guided/questions';
import { fillChoices } from './paramChoices';
import { takeImmunityFlaw } from '../covenantBoons';
import { simulate } from '../guided/simulate';
import { ageYears } from '../longterm';
import { longevityBonus } from '../enchant';
import { labTotal } from '../magic';
import { optionOn } from '../optional';
import { GUILD_RANKS, type GuildRank } from '../society';
import { PHYLAI, PRIVILEGES, RHINE_GILDS } from '../tribunal';
import { abilityXpForScore } from '../xp';
import { CRAFTS as COVENANT_CRAFTS } from '../covenantRules';
import { uid } from '../../util/id';
import { visibleSteps } from '../../ui/character/wizardSteps';
import { MYTHIC_TYPES } from '../../data/mythic';
import { freshName, homelandGroupFor, regionOf } from './names';
import { generateFamiliar, pickSpells, type SpellPick } from './spellsAndFamiliars';
import { COMMON_TRAITS, ROLE_BY_ID, rolesFor, type Role } from './roles';
import { between, chance, pick, sample, seeded } from './random';
import { characterCraftTraits, craftTraitsLine } from '../craftTraits';
import { favoriteArts } from './variety';

/** Concept themes that make a character a mystic of some kind, open to any book's Supernatural Virtues. */
const MYSTIC_THEMES = ['mystic', 'faerie', 'faith', 'demon-hunter'];
/** Books whose Supernatural Virtues suit an ordinary character (the core rules, Grogs, City & Guild). */
const MUNDANE_BOOKS = ['DE', 'Grogs', 'CG'];

/** How far the build strays from the role: keep to it, vary it, or anything goes. */
export type Variety = 'focused' | 'varied' | 'wild';

export interface GenOptions {
  type: CharType;
  /** a role id (roles.ts); random among the type's roles if unset */
  role?: string;
  /** extra concept themes */
  themes?: string[];
  house?: string;
  gender?: 'Male' | 'Female';
  /** a homeland group label (lists.HOMELANDS); the saga's Tribunal's if unset */
  homeland?: string;
  age?: number;
  /** a magus's years since Gauntlet */
  yearsPostGauntlet?: number;
  /** a magus's age when apprenticeship began (10 if unset): a magus younger than 25 began earlier */
  startAge?: number;
  /** guided-build answers that steer the build, ahead of the role's (a book's magus strong in Rego and Imaginem) */
  answers?: Record<string, number>;
  /** a craftsman's craft */
  craft?: string;
  /** names already in use in the saga, not to be given again */
  avoidNames?: string[];
  /** a magus: the kind of spells to spend the apprenticeship's spell levels on */
  spells?: SpellPick;
  /** a magus: a familiar, bound before play if the Lab Total reaches it */
  familiar?: boolean;
  variety: Variety;
  /** a storyguide's NPC, finished and ready to play; else a player's draft at the Review step */
  npc: boolean;
  /** finished and ready to play without being an NPC (the covenant's grogs) */
  finished?: boolean;
  seed: number;
}

export interface GenContext {
  data: GameData;
  saga: Saga;
  rules: HouseRules;
  covenant?: Covenant;
}

export interface Generated {
  c: Character;
  role: Role;
  /** what was decided, in order */
  log: string[];
  /** the rules check's errors and warnings on the result (the aim is none) */
  issues: Issue[];
}

const TYPE_AGES: Record<CharType, [number, number]> = { grog: [17, 40], companion: [20, 45], mythic: [20, 40], magus: [25, 25] };

/**
 * Generate a character. The seed makes it repeatable; if a roll still has anything for the rules
 * check to flag after the clean-up, the next seeds are tried, so the result is the first clean one of
 * a few.
 */
export function generateCharacter(o: GenOptions, g: GenContext): Generated {
  let best: Generated | undefined;
  const weight = (r: Generated) => r.issues.reduce((t, i) => t + (i.severity === 'error' ? 10 : 1), 0);
  for (let k = 0; k < 4; k++) {
    const r = attempt({ ...o, seed: o.seed + k * 7919 }, g);
    // a clean roll is taken at once; else the one with the fewest errors, then warnings
    if (!r.issues.length) return r;
    if (!best || weight(r) < weight(best)) best = r;
  }
  return best!;
}

function attempt(o: GenOptions, g: GenContext): Generated {
  const rng = seeded(o.seed);
  const { data, saga, rules } = g;
  const log: string[] = [];
  const roles = rolesFor(o.type);
  const role = (o.role && ROLE_BY_ID.get(o.role)) || pick(rng, roles);
  const c = newCharacter(o.type, saga.id, saga.currentYear);
  if (o.startAge !== undefined && o.type === 'magus') c.creation.apprenticeshipStartAge = o.startAge;
  const derive = () => deriveCharacter(c, data, rules);

  // ------------------------------------------------------------ who
  // a Social Status the rules give to one sex only decides the character's, unless the player chose
  let female = o.gender ? o.gender === 'Female' : chance(rng, 0.5);
  c.gender = female ? 'Female' : 'Male';
  if (role.status && !o.gender && !statusAllowed(c, data, rules, role.status)) {
    female = !female;
    c.gender = female ? 'Female' : 'Male';
  }
  // a zahid is of Muslim lands and a kabbalist of a Jewish community, wherever the saga is set
  const typeSociety = role.mythic ? MYTHIC_TYPES[role.mythic]?.society : undefined;
  const group = HOMELANDS.find((h) => h.label === o.homeland) ?? (typeSociety ? HOMELANDS.find((h) => h.culture === typeSociety) : undefined) ?? homelandGroupFor(saga.tribunal) ?? pick(rng, HOMELANDS);
  c.nationality = pick(rng, group.options);
  c.society = group.culture;
  c.name = freshName(rng, o.type === 'magus' ? 'latin' : regionOf(group), female, o.avoidNames);
  c.creation.concept = role.label;
  c.creation.archetypes = [...new Set([...role.themes, ...(o.themes ?? [])])];
  if (o.variety === 'wild') {
    const extra = pick(rng, ['warrior', 'scholar', 'social', 'explorer', 'rogue', 'healer', 'faerie', 'faith', 'mystic', 'craftsman', 'noble', 'beast']);
    if (!c.creation.archetypes.includes(extra)) c.creation.archetypes.push(extra);
  }

  // ------------------------------------------------------------ age
  if (o.type === 'magus') {
    const pg = o.yearsPostGauntlet ?? (o.npc ? Math.floor(rng() * rng() * 40) : between(rng, 0, 3));
    c.creation.yearsPostGauntlet = pg;
    c.age = c.creation.apprenticeshipStartAge + 15 + pg;
    // a magus past 35 spent a season devising a Longevity Ritual, which costs that year 10 points (DE p.50)
    if (c.age > 35 && pg > 0) c.creation.postGauntletLabSeasons = Math.max(c.creation.postGauntletLabSeasons ?? 0, 1);
  } else {
    const [lo, hi] = role.ages ?? TYPE_AGES[o.type];
    c.age = o.age ?? between(rng, lo, hi);
  }
  c.birthYear = saga.currentYear - c.age;
  log.push(`${c.name}, ${c.gender === 'Female' ? 'a woman' : 'a man'} of ${c.age} from ${c.nationality}: ${role.label.toLowerCase()}.`);

  // ------------------------------------------------------------ what the role fixes before the build
  if (role.mythic) {
    applyMythicType(c, data, role.mythic);
    log.push(`Mythic Companion type: ${role.label}.`);
  }
  // a magus's House: chosen, random, or (keeping to the role) the best fit, set in the build
  // a House given by id or by name
  const given = o.house ? HOUSES.find((h) => h.id === o.house || h.name.toLowerCase() === o.house!.toLowerCase())?.id : undefined;
  const house = o.type !== 'magus' ? undefined : (given ?? (o.variety === 'focused' ? undefined : pick(rng, HOUSES).id));
  if (role.status && takeStatus(c, data, rules, role.status)) log.push(`Social Status: ${data.vfById.get(role.status)?.name}.`);
  if (role.craft) setUpCraft(c, o, g, role, rng, log);
  else if (role.profession) setUpProfession(c, role.profession, role, log);
  // choices on what the role brought (a Mythic type's Virtues) are made before the build spends around them
  fillChoices(c, data, rng);
  // made for a covenant whose Immunity holds off a Flaw: the Flaw, paired with it, its Virtue points
  // to spend (Covenants ch.2: "if players designing characters pair their Flaws to this immunity…")
  const held = takeImmunityFlaw(c, g.covenant, data, rng);
  if (held) log.push(`Flaw: ${held}.`);

  // ------------------------------------------------------------ the build
  // a magus's favorite Arts, unless the answers name them: a Technique and a Form or two, mostly what
  // the House is known for, so magi of one role are not all alike
  const namesArts = Object.keys({ ...o.answers, ...role.answers }).some((k) => k.startsWith('b-art-'));
  const favorites = o.type === 'magus' && !namesArts ? favoriteArts(rng, house ?? o.house, o.variety) : [];
  const st = simulate(
    {
      name: role.id,
      answer: (q) => {
        if (o.answers && q.id in o.answers) return o.answers[q.id];
        if (role.answers && q.id in role.answers) return role.answers[q.id];
        if (favorites.length && q.id === 'b-arts') return 8;
        if (favorites.length && q.id.startsWith('b-art-')) return favorites.includes(q.id.slice(6) as never) ? between(rng, 8, 10) : undefined;
        if (q.chip) return undefined;
        const p = o.variety === 'focused' ? 0.08 : o.variety === 'varied' ? 0.3 : 0.55;
        if (!chance(rng, p)) return undefined;
        return o.variety === 'focused' ? between(rng, 3, 7) : between(rng, 0, 10);
      },
      tieBreak: () => (chance(rng, 0.5) ? 10 : 0),
    },
    { c, d: derive(), data, rules, saga, covenant: g.covenant, archetypes: c.creation.archetypes },
  ).state;
  if (house) st.house = house;
  // a craftsman, knight or merchant is no hedge wizard: the Supernatural Virtues of the hedge
  // traditions and the Realms books (Craft Amulets, Mythic Alchemy, Type Refining) go to characters
  // whose concept is mystical; the core book's (Second Sight, Eye of Hephaestus) stay open to anyone
  if (o.type !== 'magus' && !role.mythic && !c.creation.archetypes.some((t) => MYSTIC_THEMES.includes(t))) {
    const hedge = data.virtuesFlaws.filter((d) => d.kind === 'virtue' && d.categories.includes('Supernatural') && !MUNDANE_BOOKS.includes(d.source.book)).map((d) => d.id);
    // unless the player asked for one by name
    st.declined = [...new Set([...st.declined, ...hedge.filter((id) => o.answers?.[`vf:${id}`] === undefined)])];
  }
  const res = autoBuild(c, st, { data, rules, saga, covenant: g.covenant, archetypes: c.creation.archetypes, rng });
  if (favorites.length) log.unshift(`Favorite Arts: ${favorites.join(', ')}.`);
  log.push(...res.log);

  // ------------------------------------------------------------ after the build
  let d = derive();
  ageBeforePlay(c, d, rng, log);
  warpBeforePlay(c, rng, log);
  d = derive();
  addTraits(c, role, rng);
  // a craftsman met at random may be lucky or not at the work: say what helps and what holds them back
  const trade = c.abilities.filter((a) => a.abilityId === 'craft-type' && a.param).sort((a, b) => Object.values(b.xp).reduce<number>((t, n) => t + (n ?? 0), 0) - Object.values(a.xp).reduce<number>((t, n) => t + (n ?? 0), 0))[0];
  if (trade) {
    const line = craftTraitsLine(characterCraftTraits(c, data, trade.param));
    if (line) log.push(`At their craft (${trade.param}): ${line}.`);
  }
  addGear(c, d, role, rng, data);
  tribunalCustoms(c, saga, rng, log);
  fillChoices(c, data, rng);
  if (c.type === 'magus' && o.spells) {
    const picked = pickSpells(c, data, rules, o.spells, rng);
    log.push(picked.length ? `Spells as asked: ${picked.join(', ')}.` : 'No spells of the kind asked for fit the creation limits.');
  }
  if (c.type === 'magus' && o.familiar) {
    const r = generateFamiliar(derive(), rng, { bind: true, aura: g.covenant ? { realm: g.covenant.auraRealm ?? 'Magic', strength: g.covenant.aura } : undefined });
    c.familiar = { ...r.familiar, name: freshName(rng, 'latin', chance(rng, 0.5), [c.name]) };
    log.push(r.log.replace('Familiar:', `Familiar ${c.familiar.name}:`));
  }
  // a Redcap's devices from the Mercer House: fifty levels at the Gauntlet, two a year since (DE, Redcap)
  if (servedByMercerHouse(c)) {
    c.redcap = { levels: redcapLevels(c, Math.max(0, c.age - 25)), spent: 0 };
    const got = issueRedcapDevices(c, data, rng);
    if (got.length) log.push(`Redcap’s devices from the Mercer House: ${got.join(', ')}.`);
  }
  c.description = `${role.label} from ${c.nationality}${c.house ? `, of House ${HOUSES.find((h) => h.id === c.house)?.name}` : ''}. ${role.blurb}`;
  if (g.covenant) c.covenantId = g.covenant.id;

  // the rules check's own fixes settle anything the steps after the build unbalanced
  balanceCharacteristics(c, data, rules, log, role.themes ?? []);
  const fixed = resolveAll(c, data, rules).applied;
  if (fixed.length) log.push(...fixed.map((f) => `Fixed: ${f}`));
  d = derive();
  if (o.npc) c.npc = true;
  if (o.npc || o.finished) {
    c.creation.finalized = true;
    c.confidence = { ...d.confidence };
  } else c.creation.step = visibleSteps(c.type).findIndex((s) => s.id === 'review');
  const issues = validateCharacter(derive(), data, rules).filter((i) => i.severity !== 'info');
  return { c, role, log, issues };
}

/** Whether the rules let this character take a Virtue (some Social Statuses are for men only, some for the wellborn). */
function statusAllowed(c: Character, data: GameData, rules: HouseRules, id: string): boolean {
  const def = data.vfById.get(id);
  return !!def && !vfProblems(deriveCharacter(c, data, rules), data, def).some((p) => p.severity === 'error' || p.severity === 'warning');
}

/** Take a Social Status when this character may, in place of any other. */
function takeStatus(c: Character, data: GameData, rules: HouseRules, id: string): boolean {
  if (!statusAllowed(c, data, rules, id)) return false;
  c.virtues = c.virtues.filter((v) => !data.vfById.get(v.defId)?.categories.includes('Social Status') || v.defId === 'hermetic-magus');
  addVirtue(c, data, id);
  return true;
}

/** A craftsman's Craft, and with the guild rules on, the guild rank, Social Status and Guild Lore that go with it. */
function setUpCraft(c: Character, o: GenOptions, g: GenContext, role: Role, rng: () => number, log: string[]) {
  // covenfolk work at the crafts the covenant saves money with; companions at any
  const craft = o.craft ?? (c.type === 'grog' ? pick(rng, COVENANT_CRAFTS.filter((k) => k.categories.length)).name : pick(rng, LIST_CRAFTS.filter((k) => !['Runes', 'Automata'].includes(k))));
  const cap = c.age < 30 ? 5 : c.age <= 35 ? 6 : 7;
  // the trade: the Craft the build raises (it raises the character's best Craft, not a new one)
  ensureAbility(c, 'craft-type', { laterLife: abilityXpForScore(Math.min(cap, c.age < 22 ? 3 : 4)) }, craft);
  // and, with the years, a craft or two that goes with it, picked up in the same workshop: a smith
  // who shoes horses, a baker who brews; never as good as the trade
  const related = relatedCrafts(craft);
  const extra = !related.length || c.age < 25 ? 0 : c.age < 40 ? (chance(rng, 0.5) ? 1 : 0) : chance(rng, 0.5) ? 2 : 1;
  const side = sample(rng, related, extra);
  for (const k of side) ensureAbility(c, 'craft-type', { laterLife: abilityXpForScore(c.age < 40 ? 1 : 2) }, k);
  c.creation.concept = `${role.label} (${craft.toLowerCase()})`;
  const also = side.length ? `, with some ${side.map((k) => k.toLowerCase()).join(' and ')}` : '';
  if (!optionOn(g.saga, 'guilds')) return void log.push(`Craft: ${craft}${also}.`);
  const rank: GuildRank = c.age < 21 ? 'apprentice' : c.type === 'companion' && c.age >= 30 ? 'master' : 'journeyman';
  const r = GUILD_RANKS[rank];
  if (takeStatus(c, g.data, g.rules, r.virtue)) {
    // the guild of the trade
    const guild = guildOf(craft);
    c.guild = { name: guild, rank };
    if (r.lore) ensureAbility(c, 'organization-lore', { laterLife: abilityXpForScore(r.lore) }, guild);
    log.push(`Craft: ${craft}${also}; ${r.label.toLowerCase()} of the ${guild.toLowerCase()} (City & Guild).`);
  } else log.push(`Craft: ${craft}${also}.`);
}

/** A Profession to make a living by (a merchant's is Merchant), which the build raises in place of a Craft. */
function setUpProfession(c: Character, profession: string, role: Role, log: string[]) {
  ensureAbility(c, 'profession-type', { laterLife: abilityXpForScore(c.age < 22 ? 3 : 4) }, profession);
  log.push(`${role.label}: Profession: ${profession}.`);
}

/** Aging rolls for each year from 35 (DE p.50); a magus has a Longevity Ritual from their own Lab Total. */
function ageBeforePlay(c: Character, d: DerivedCharacter, rng: () => number, log: string[]) {
  if (d.magicChar || c.age - 1 < d.agingStartAge) return;
  if (c.type === 'magus') {
    const lt = labTotal(d, { technique: 'Cr', form: 'Co' }, { activity: 'longevity', aura: { strength: 3, realm: 'Magic' }, forSelfLongevity: true }).total;
    const bonus = longevityBonus(lt, 0, false);
    if (bonus > 0) c.longevity = { labTotal: lt, bonus, extraVis: 0, createdYear: c.birthYear + 35 };
  }
  const plan = { livingConditions: c.type === 'magus' ? 1 : 0, longevity: c.longevity?.bonus ?? 0, extra: d.agingRollParts, anyChar: 'sparest' as const, renewLongevity: true };
  // a year that would kill is rolled again, as a player may; one that keeps killing is left for the
  // storyguide (the rules check then says which years are still to roll)
  const done = () => c.creation.agedThrough ?? d.agingStartAge - 1;
  for (let tries = 0; done() < c.age - 1 && tries < 10; tries++) ageYears(c, Math.max(d.agingStartAge, done() + 1), c.age - 1, plan, rng);
  log.push(`Aged from ${d.agingStartAge} to ${done() + 1}${c.longevity ? ` with a Longevity Ritual (+${c.longevity.bonus})` : ''}: ${c.decrepitudePoints} Decrepitude points.`);
}

/**
 * The Warping a magus has gathered since Gauntlet: a point a year under a Longevity Ritual (a
 * constant mystical effect, DE p.168) and a point every two or three years from powerful magic and
 * botches (DE's own example, Darius, is a botching sort, and has twice that).
 */
function warpBeforePlay(c: Character, rng: () => number, log: string[]) {
  if (c.type !== 'magus') return;
  const pg = c.creation.yearsPostGauntlet;
  const ritual = c.longevity ? Math.max(0, c.age - ((c.longevity.createdYear ?? c.birthYear + 35) - c.birthYear)) : 0;
  const other = Math.round(pg * (0.2 + rng() * 0.5));
  const points = ritual + other;
  if (!points) return;
  c.warpingPoints += points;
  log.push(`Warping: ${points} point${points > 1 ? 's' : ''} (${ritual ? `${ritual} from the Longevity Ritual, ` : ''}${other} from ${pg} years of magic).`);
}

/**
 * Bring Characteristic points within budget when Virtues demand more than it holds (two Great
 * Characteristics each want their Characteristic at +3): lower the others, below 0 if need be,
 * which gives points back (DE p.48). A Characteristic a Virtue needs high is left alone.
 */
function balanceCharacteristics(c: Character, data: GameData, rules: HouseRules, log: string[], themes: string[] = []) {
  const needed = new Set(c.virtues.filter((v) => v.defId === 'great-characteristic').map((v) => v.param));
  // what the role lives by is lowered last: a craftsman's Dexterity, a scholar's Intelligence (the guided build's weights)
  const weight = (k: Characteristic) => Math.max(0, ...themes.map((t) => CHAR_PRESETS[k]?.[t] ?? 0));
  let d = deriveCharacter(c, data, rules);
  const changed: string[] = [];
  for (let n = 0; n < 24 && d.charPointsSpent > d.charPointsBudget; n++) {
    const lowerable = CHARACTERISTICS.filter((k) => !needed.has(k) && c.characteristics[k] > -3);
    if (!lowerable.length) break;
    const k = [...lowerable].sort((a, b) => weight(a) - weight(b) || c.characteristics[b] - c.characteristics[a])[0];
    c.characteristics[k] -= 1;
    changed.push(k);
    d = deriveCharacter(c, data, rules);
  }
  if (changed.length) log.push(`Characteristics lowered to pay for the Virtues: ${[...new Set(changed)].join(', ')}.`);
}

function addTraits(c: Character, role: Role, rng: () => number) {
  const want = 2 + (chance(rng, 0.5) ? 1 : 0);
  const have = new Set(c.personality.map((p) => p.trait.toLowerCase()));
  for (const t of sample(rng, [...role.traits, ...sample(rng, COMMON_TRAITS, 3)], 6)) {
    if (c.personality.length >= want) break;
    if (have.has(t.toLowerCase())) continue;
    have.add(t.toLowerCase());
    c.personality.push({ uid: uid(), trait: t, score: between(rng, 1, 3) });
  }
}

/** Arms and armor for the role, by the weapon Ability the build gave the character. */
function addGear(c: Character, d: DerivedCharacter, role: Role, rng: () => number, data: GameData) {
  if (!role.gear) return;
  const score = (id: string) => d.abilities.find((a) => a.abilityId === id)?.total ?? 0;
  const has = (id: string) => data.weapons.some((w) => w.id === id);
  const add = (weaponId: string, shieldId?: string) => has(weaponId) && c.equipment.weapons.push({ uid: uid(), weaponId, shieldId: shieldId && has(shieldId) ? shieldId : undefined });
  if (role.gear === 'light') return void add('knife');
  const best = ['single-weapon', 'great-weapon', 'bows', 'thrown-weapon', 'brawl'].sort((a, b) => score(b) - score(a))[0];
  if (role.gear === 'missile' || best === 'bows') add(role.gear === 'knight' ? 'bow-long-missile' : 'bow-short-missile');
  if (best === 'great-weapon') add(pick(rng, ['spear-long', 'pole-axe', 'warhammer']));
  else if (best === 'thrown-weapon') add('javelin-missile');
  else add(role.gear === 'knight' ? 'sword-long' : pick(rng, ['sword-short', 'axe', 'mace', 'spear-short']), role.gear === 'missile' ? undefined : role.gear === 'knight' ? 'shield-heater' : 'shield-round');
  add('dagger');
  const armor = role.gear === 'knight' ? 'chain-mail' : role.gear === 'melee' ? pick(rng, ['heavy-leather', 'metal-reinf-leather', 'leather-scale']) : 'quilted-fur';
  if (data.armor.some((a) => a.id === armor)) {
    c.equipment.armorId = armor;
    c.equipment.armorCoverage = role.gear === 'knight' ? 'full' : 'partial';
  }
}

/** What the saga's Tribunal customs ask of a magus there, when the troupe has them on. */
function tribunalCustoms(c: Character, saga: Saga, rng: () => number, log: string[]) {
  if (c.type !== 'magus') return;
  const pg = c.creation.yearsPostGauntlet;
  if (optionOn(saga, 'rhineGilds')) {
    const rank = pg >= 30 && chance(rng, 0.2) ? 'archmage' : pg >= 7 ? 'master' : 'journeyman';
    // journeymen customarily join a gild within seven years of the Gauntlet
    const gild = rank === 'journeyman' && pg < 3 && chance(rng, 0.6) ? undefined : pick(rng, RHINE_GILDS).id;
    c.rhine = { rank, gild };
    log.push(`Rhine: ${rank}${gild ? ` of the ${RHINE_GILDS.find((x) => x.id === gild)?.name}` : ', not yet in a gild'} (Guardians of the Forests).`);
  }
  if (optionOn(saga, 'thebanTokens')) {
    const citizen = chance(rng, 0.75);
    c.theban = { citizen, phyle: citizen ? pick(rng, PHYLAI) : undefined, tokens: citizen ? between(rng, 0, Math.min(5, Math.floor(pg / 3))) : 0, shards: chance(rng, 0.1) ? 1 : 0, log: [] };
    log.push(`Thebes: ${citizen ? `a citizen of the ${c.theban.phyle} phyle` : 'a resident without citizenship'} (The Sundered Eagle).`);
  }
  if (optionOn(saga, 'transylvaniaPrivileges')) {
    c.privilege = pick(rng, PRIVILEGES).id;
    log.push(`Transylvania: privilege ${PRIVILEGES.find((p) => p.id === c.privilege)?.label} (Against the Dark).`);
  }
}
