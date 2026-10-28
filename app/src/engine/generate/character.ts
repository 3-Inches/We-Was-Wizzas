// The character generator: a whole, legal character in one go, for a player to adjust or as a
// storyguide's NPC. The role sets the concept, Social Status, craft and gear; the guided build's
// auto-build makes every choice from the role's themes and answers, with as much randomness as
// asked for; then the generator rolls aging for an older character, adds Personality Traits and gear,
// and fills in what the saga's Tribunal customs and guild rules ask of the character. The seed makes
// it repeatable.

import { ARTS, CHARACTERISTICS, FORMS, TECHNIQUES, type CharType, type GameData } from '../../data';
import { CRAFTS as LIST_CRAFTS, HOMELANDS } from '../../data/lists';
import { HOUSES } from '../../data/houses';
import type { Character, Covenant, HouseRules, Saga } from '../types';
import { addVirtue, applyMythicType, ensureAbility, newCharacter } from '../character/factory';
import { resolveAll } from '../character/fixes';
import { deriveCharacter, type DerivedCharacter } from '../character/derive';
import { vfProblems } from '../character/restrictions';
import { validateCharacter, type Issue } from '../character/validate';
import { autoBuild } from '../guided/autobuild';
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
import { freshName, homelandGroupFor, regionOf } from './names';
import { generateFamiliar, pickSpells, type SpellPick } from './spellsAndFamiliars';
import { COMMON_TRAITS, ROLE_BY_ID, rolesFor, type Role } from './roles';
import { between, chance, pick, sample, seeded } from './random';

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
  const derive = () => deriveCharacter(c, data, rules);

  // ------------------------------------------------------------ who
  // a Social Status the rules give to one sex only decides the character's, unless the player chose
  let female = o.gender ? o.gender === 'Female' : chance(rng, 0.5);
  c.gender = female ? 'Female' : 'Male';
  if (role.status && !o.gender && !statusAllowed(c, data, rules, role.status)) {
    female = !female;
    c.gender = female ? 'Female' : 'Male';
  }
  const group = HOMELANDS.find((h) => h.label === o.homeland) ?? homelandGroupFor(saga.tribunal) ?? pick(rng, HOMELANDS);
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
  // choices on what the role brought (a Mythic type's Virtues) are made before the build spends around them
  fillChoices(c, data, rng);

  // ------------------------------------------------------------ the build
  const st = simulate(
    {
      name: role.id,
      answer: (q) => {
        if (role.answers && q.id in role.answers) return role.answers[q.id];
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
  const res = autoBuild(c, st, { data, rules, saga, covenant: g.covenant, archetypes: c.creation.archetypes });
  log.push(...res.log);

  // ------------------------------------------------------------ after the build
  let d = derive();
  ageBeforePlay(c, d, rng, log);
  d = derive();
  addTraits(c, role, rng);
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
  c.description = `${role.label} from ${c.nationality}${c.house ? `, of House ${HOUSES.find((h) => h.id === c.house)?.name}` : ''}. ${role.blurb}`;
  if (g.covenant) c.covenantId = g.covenant.id;

  // the rules check's own fixes settle anything the steps after the build unbalanced
  balanceCharacteristics(c, data, rules, log);
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
  ensureAbility(c, 'craft-type', { laterLife: abilityXpForScore(Math.min(cap, c.age < 22 ? 3 : 4)) }, craft);
  c.creation.concept = `${role.label} (${craft.toLowerCase()})`;
  if (!optionOn(g.saga, 'guilds')) return void log.push(`Craft: ${craft}.`);
  const rank: GuildRank = c.age < 21 ? 'apprentice' : c.type === 'companion' && c.age >= 30 ? 'master' : 'journeyman';
  const r = GUILD_RANKS[rank];
  if (takeStatus(c, g.data, g.rules, r.virtue)) {
    const guild = `${craft.replace(/s$/, '')}s’ guild`;
    c.guild = { name: guild, rank };
    if (r.lore) ensureAbility(c, 'organization-lore', { laterLife: abilityXpForScore(r.lore) }, guild.replace(/^./, (x) => x.toUpperCase()));
    log.push(`Craft: ${craft}; ${r.label.toLowerCase()} of the ${guild} (City & Guild).`);
  } else log.push(`Craft: ${craft}.`);
}

/** Aging rolls for each year from 35 (DE p.50); a magus has a Longevity Ritual from their own Lab Total. */
function ageBeforePlay(c: Character, d: DerivedCharacter, rng: () => number, log: string[]) {
  if (d.magicChar || c.age - 1 < d.agingStartAge) return;
  if (c.type === 'magus') {
    const lt = labTotal(d, { technique: 'Cr', form: 'Co' }, { activity: 'longevity', aura: { strength: 3, realm: 'Magic' }, forSelfLongevity: true }).total;
    const bonus = longevityBonus(lt, 0, false);
    if (bonus > 0) c.longevity = { labTotal: lt, bonus, extraVis: 0, createdYear: c.birthYear + 35 };
  }
  const plan = { livingConditions: c.type === 'magus' ? 1 : 0, longevity: c.longevity?.bonus ?? 0, extra: d.agingRollParts, anyChar: pick(rng, CHARACTERISTICS), renewLongevity: true };
  // a year that would kill is rolled again, as a player may; one that keeps killing is left for the
  // storyguide (the rules check then says which years are still to roll)
  const done = () => c.creation.agedThrough ?? d.agingStartAge - 1;
  for (let tries = 0; done() < c.age - 1 && tries < 10; tries++) ageYears(c, Math.max(d.agingStartAge, done() + 1), c.age - 1, plan, rng);
  log.push(`Aged from ${d.agingStartAge} to ${done() + 1}${c.longevity ? ` with a Longevity Ritual (+${c.longevity.bonus})` : ''}: ${c.decrepitudePoints} Decrepitude points.`);
}

/**
 * Bring Characteristic points within budget when Virtues demand more than it holds (two Great
 * Characteristics each want their Characteristic at +3): lower the others, below 0 if need be,
 * which gives points back (DE p.48). A Characteristic a Virtue needs high is left alone.
 */
function balanceCharacteristics(c: Character, data: GameData, rules: HouseRules, log: string[]) {
  const needed = new Set(c.virtues.filter((v) => v.defId === 'great-characteristic').map((v) => v.param));
  let d = deriveCharacter(c, data, rules);
  const changed: string[] = [];
  for (let n = 0; n < 24 && d.charPointsSpent > d.charPointsBudget; n++) {
    const lowerable = CHARACTERISTICS.filter((k) => !needed.has(k) && c.characteristics[k] > -3);
    if (!lowerable.length) break;
    const k = [...lowerable].sort((a, b) => c.characteristics[b] - c.characteristics[a])[0];
    c.characteristics[k] -= 1;
    changed.push(k);
    d = deriveCharacter(c, data, rules);
  }
  if (changed.length) log.push(`Characteristics lowered to pay for the Virtues: ${[...new Set(changed)].join(', ')}.`);
}

/** Free-text choices the generator can make up for an NPC (the rest are left for the troupe to decide). */
const TEXT_CHOICES: Record<string, string[]> = {
  Duty: ['to their lord', 'to their family', 'to the covenant', 'to the Church', 'to an oath sworn long ago'],
  Fear: ['the dark', 'deep water', 'fire', 'heights', 'the dead', 'dogs', 'enclosed places'],
  Goal: ['to restore the family name', 'to find a lost sibling', 'to avenge a wrong', 'to see Jerusalem', 'to win a lord’s favor'],
  Enemies: ['a rival family', 'a local lord', 'a band of outlaws', 'a rival covenant'],
  'Feud with': ['a neighboring family', 'a rival guild', 'a village across the river'],
  'Grudge against': ['a former master', 'a cheating merchant', 'the village priest'],
  'Object of hatred': ['the lord who wronged them', 'foreigners', 'faeries'],
  Compulsion: ['gambling', 'counting things', 'hoarding trinkets'],
  Obsession: ['cleanliness', 'collecting relics', 'a lost love'],
  Secret: ['a killing in their past', 'heresy', 'a faerie parent', 'years as an outlaw'],
  Vow: ['of poverty', 'of chastity', 'never to strike first', 'to fast on Fridays'],
  Mentor: ['a retired knight', 'an old scholar', 'a village wise woman'],
  Beloved: ['a childhood sweetheart', 'someone far away'],
  Terrain: ['Forest', 'Mountain', 'Marsh', 'Town', 'Steppe'],
  'Terrain (Forest, Mountain, Steppe, Town...)': ['Forest', 'Mountain', 'Marsh', 'Town', 'Steppe'],
  // Hermetic Virtues and Flaws (DE, Hermetic Virtues and Flaws)
  Cycle: ['by day', 'by night', 'under a waxing moon', 'under a waning moon', 'in spring and summer', 'in autumn and winter', 'on Sundays and holy days'],
  Circumstance: ['in a storm', 'at night', 'at dawn and dusk', 'under the full moon', 'near running water', 'in a forest', 'when angry', 'while singing'],
  'Focus (e.g. weather, necromancy, birds)': ['animals', 'plants', 'weather', 'the human body', 'necromancy', 'the mind', 'illusions', 'fire', 'water', 'stone and metal', 'wards'],
  'Focus (e.g. healing, self-transformation)': ['healing', 'self-transformation', 'wolves', 'horses', 'birds', 'trees', 'metals', 'lightning', 'light and darkness', 'doors and locks'],
  'Field of Potent Magic': ['healing', 'wards', 'fire', 'storms', 'beasts', 'illusions', 'the dead', 'travel'],
  'Two Te+Fo combinations (e.g. InHe & InAn)': ['CrIg & PeIg', 'InAn & ReAn', 'MuCo & MuAn', 'CrAq & PeAq', 'ReTe & PeTe', 'InMe & ReMe', 'CrHe & PeHe'],
  Restriction: ['while touching iron', 'in sunlight', 'on consecrated ground', 'while bound', 'standing in running water'],
  Condition: ['touching the target', 'singing', 'dancing', 'holding a staff', 'drawing a sigil in the air'],
  // other Virtues and Flaws
  Sin: ['Pride', 'Envy', 'Wrath', 'Sloth', 'Greed', 'Gluttony', 'Lust'],
  Hazard: ['cold', 'heat', 'poison', 'disease', 'fire', 'drowning'],
  Animal: ['wolf', 'bear', 'raven', 'boar', 'fox', 'hare', 'otter', 'seal', 'cat'],
  Companion: ['a talking raven', 'a faerie hound', 'a restless ghost', 'a cat that is more than it seems'],
  Commodity: ['wine', 'horses', 'gems', 'cloth', 'spices', 'books', 'furs'],
  Environment: ['the forest', 'the mountains', 'the marshes', 'the sea coast', 'the river valley', 'the moors'],
  Land: ['the old forest', 'the hills of home', 'the river valley', 'the moorland'],
  Prohibition: ['never to eat meat', 'never to refuse hospitality', 'never to sleep under a roof', 'never to tell a lie', 'never to cross running water by a bridge'],
  'Artistic ability (e.g. Music)': ['Music', 'Carving', 'Dance', 'Painting', 'Poetry'],
};

/** Ability Block: a class of Abilities the character has none of, as the Flaw requires (DE, Ability Block). */
function blockedClasses(c: Character, data: GameData): string[] {
  const has = (types: string[]) => c.abilities.some((a) => types.includes(data.abilityById.get(a.abilityId)?.type ?? ''));
  const logic = ['artes-liberales', 'philosophiae', 'civil-and-canon-law', 'common-law', 'medicine', 'theology'];
  return [
    ...(has(['Martial']) ? [] : ['Martial Abilities']),
    ...(c.abilities.some((a) => logic.includes(a.abilityId)) ? [] : ['logic: Artes Liberales, Philosophiae, Law, Medicine and Theology']),
    ...(c.abilities.some((a) => a.abilityId === 'living-language' && !a.native) || c.abilities.some((a) => a.abilityId === 'dead-language') ? [] : ['languages other than the native tongue']),
  ];
}

/** Choices that depend on the character: Vulnerable Magic's undoing, the aura a power needs, the Virtue a charm holds. */
function choicesFor(c: Character, data: GameData, defId: string): string[] | undefined {
  const supernatural = c.abilities.filter((a) => data.abilityById.get(a.abilityId)?.type === 'Supernatural').map((a) => data.abilityById.get(a.abilityId)!.name);
  switch (defId) {
    case 'vulnerable-magic-flaw':
      return ['crossing running water', 'touching iron', 'the touch of a priest', 'salt scattered on its path'];
    case 'necessary-realm-aura-for-ability-flaw':
      return supernatural.length ? supernatural.map((n) => `a Magic aura for ${n}`) : ['a Magic aura for its powers'];
    case 'greater-charm-flaw': {
      const own = c.virtues.filter((v) => v.defId !== defId && data.vfById.get(v.defId)?.kind === 'virtue' && data.vfById.get(v.defId)?.categories.includes('Supernatural'));
      return own.length ? own.map((v) => data.vfById.get(v.defId)!.name) : undefined;
    }
    default:
      return undefined;
  }
}

/** A choice each Virtue and Flaw still needs (a Characteristic, an Art, an Ability, a heritage), chosen at random. */
function fillChoices(c: Character, data: GameData, rng: () => number) {
  for (const v of c.virtues) {
    const spec = data.vfById.get(v.defId)?.param;
    if (!spec || spec.optional || (v.param && v.param !== 'to be decided')) continue;
    const choices =
      spec.options ??
      spec.groups?.flatMap((gr) => gr.options) ??
      (spec.kind === 'characteristic' ? [...CHARACTERISTICS] : spec.kind === 'art' ? [...ARTS] : spec.kind === 'technique' ? [...TECHNIQUES] : spec.kind === 'form' ? [...FORMS] : undefined) ??
      (spec.kind === 'ability' ? c.abilities.filter((a) => !spec.abilityTypes || spec.abilityTypes.includes(data.abilityById.get(a.abilityId)?.type as never)).map((a) => a.abilityId) : undefined) ??
      (v.defId === 'ability-block-flaw' ? blockedClasses(c, data) : (choicesFor(c, data, v.defId) ?? TEXT_CHOICES[spec.label]));
    // a repeatable Virtue's copies each take a different choice
    const taken = new Set(c.virtues.filter((x) => x.defId === v.defId && x !== v).map((x) => x.param));
    const free = choices?.filter((x) => !taken.has(x));
    if (free?.length) v.param = pick(rng, free);
  }
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
