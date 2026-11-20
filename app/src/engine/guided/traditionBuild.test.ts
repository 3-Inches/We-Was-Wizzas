// Quick build makes each hedge tradition, a faerie wizard and a Mystery initiate as the books say,
// and the rules check passes each. Hedge Magic, Revised Edition (HMRE): Folk Witches (line 1570),
// Gruagachan (line 2786), Learned Magicians (line 4117), Vitkir (line 6144). Realms of Power: Faerie,
// Pagan Traditions (line 7501). Houses of Hermes: Mystery Cults (line 249); The Mysteries, Cabal Legacy.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../../data';
import { DEFAULT_HOUSE_RULES, type Character, type Saga } from '../types';
import { generateCharacter, type GenOptions } from '../generate/character';
import { deriveCharacter, type DerivedCharacter, FOLK_APPRENTICESHIP, GRUAGACH_APPRENTICESHIP, LEARNED_TRAINING, VITKI_APPRENTICESHIP } from '../character/derive';
import { hedgeTradition } from '../hedgeTraditions';
import { isFaerieWizard } from '../faerieWizardry';
import { hasTableMystery } from '../hermeticMysteries';
import { languageScore } from '../books';
import { RUNES } from '../../data/hedgeVitkir';
import { GRUAGACH_FORMS, GRUAGACH_TECHNIQUES } from '../../data/hedgeGruagach';
import { LEARNED_FORMS, LEARNED_TECHNIQUES } from '../../data/hedgeLearned';
import { WITCH_POWERS } from '../../data/hedgeFolkWitch';
import { TRADITIONS, type Tradition } from './traditions';
import { CULT_MYSTERIES, mysteryLoreOf } from './buildMysteries';
import { evaluate } from './score';
import { newCharacter } from '../character/factory';

const data = buildGameData();
const rules = DEFAULT_HOUSE_RULES;
const TRIBUNALS = ['Stonehenge', 'Rhine', 'Normandy', 'Iberian'];
const saga = (tribunal: string) => ({ id: 's', name: 'Test', tribunal, enabledBooks: [], houseRules: rules, currentYear: 1220, options: {} }) as unknown as Saga;
const SEEDS = [1, 2, 3, 4];

function make(role: string, seed: number, o: Partial<GenOptions> = {}) {
  const type = role.startsWith('magus') ? 'magus' : 'companion';
  const g = generateCharacter({ type, role, variety: 'varied', npc: true, seed, ...o }, { data, saga: saga(TRIBUNALS[seed % TRIBUNALS.length]), rules });
  const d = deriveCharacter(g.c, data, rules);
  return { ...g, d };
}

const has = (c: Character, id: string) => c.virtues.some((v) => v.defId === id);
const score = (d: DerivedCharacter, id: string) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.score), 0);
const budget = (d: DerivedCharacter, id: string) => d.budgets.find((b) => b.id === id);
/** Errors and warnings of the rules check (notes are fine). */
const problems = (g: ReturnType<typeof make>) => g.issues.filter((i) => i.severity === 'error' || i.severity === 'warning').map((i) => `${i.severity}: ${i.message}`);

/** Each role's character: a clean rules check, the tradition the engine sees, and no other tradition's own Virtues. */
function common(role: string, seed: number, t: Tradition) {
  const g = make(role, seed);
  const label = `${role} (seed ${seed})`;
  expect(problems(g), label).toEqual([]);
  const others = TRADITIONS.filter((x) => x.id !== t).flatMap((x) => x.own);
  const mine = TRADITIONS.find((x) => x.id === t)!;
  const foreign = g.c.virtues.filter((v) => others.includes(v.defId) && !mine.own.includes(v.defId)).map((v) => v.defId);
  expect(foreign, `${label}: another tradition's Virtues`).toEqual([]);
  // a Gifted member's Opening gives these: a Virtue for one is wasted points
  if (has(g.c, 'the-gift')) expect(g.c.virtues.filter((v) => mine.opens?.includes(v.defId)).map((v) => v.defId), label).toEqual([]);
  // every pool and level the apprenticeship gives is spent or left for the player to design, never over
  for (const b of g.d.budgets) expect(b.spent, `${label}: ${b.label}`).toBeLessThanOrEqual(b.total);
  sympathyOnSheet(g.c, label);
  return { ...g, label };
}

/** Each Faerie Sympathy and Antipathy names its Trait, and the Trait is on the sheet (RoP: Faerie lines 6367, 6523). */
function sympathyOnSheet(c: Character, label: string) {
  for (const v of c.virtues.filter((x) => x.defId === 'faerie-sympathy' || x.defId === 'faerie-antipathy-flaw')) {
    expect(v.param && v.param !== 'to be decided', `${label}: ${v.defId} names its Trait`).toBeTruthy();
    const score = (v.size === 'Major' ? 3 : 1) * (v.defId === 'faerie-sympathy' ? 1 : -1);
    expect(c.sympathy?.find((t) => t.trait === v.param)?.score, `${label}: ${v.param} on the sheet`).toBe(score);
  }
}

describe('Quick build: a folk witch (HMRE line 1570)', () => {
  it('unGifted: the Social Status, a Flaw that limits the magic, powers as Virtues, each at 1 or more', () => {
    for (const seed of SEEDS) {
      const { c, d, label } = common('folk-witch', seed, 'witch');
      expect(hedgeTradition(c), label).toBe('witch');
      expect(has(c, 'folk-witch') && !has(c, 'the-gift'), label).toBe(true);
      expect(['unstable-magic-flaw', 'harsh-moon-flaw', 'silent-tradition-flaw'].some((id) => has(c, id)), `${label}: a Flaw that limits the magic`).toBe(true);
      // "you may only assign her experience points to Supernatural Abilities to which she has the corresponding Virtues"
      const powers = WITCH_POWERS.filter((p) => has(c, p.id));
      expect(powers.some((p) => ['witch-healing', 'witch-cursing'].includes(p.id)), `${label}: a Major power`).toBe(true);
      expect(powers.length, label).toBeGreaterThanOrEqual(3);
      for (const p of powers) expect(score(d, p.id), `${label}: ${p.name}`).toBeGreaterThanOrEqual(1);
      expect(score(d, 'folk-witch-magic-theory'), label).toBeGreaterThanOrEqual(1);
      expect(budget(d, FOLK_APPRENTICESHIP)?.total, label).toBe(200);
    }
  }, 120_000);

  it('Gifted: The Gift opens the seven powers, each at 1 or more (Shapeshifter not, if its Opening is flawed)', () => {
    for (const seed of SEEDS) {
      const { c, d, label } = common('folk-witch-gifted', seed, 'witch');
      expect(has(c, 'the-gift') && has(c, 'folk-witch'), label).toBe(true);
      expect(['unstable-magic-flaw', 'harsh-moon-flaw', 'silent-tradition-flaw', 'flawed-folk-witch-gift-opening'].some((id) => has(c, id)), label).toBe(true);
      const flawed = c.virtues.filter((v) => v.defId === 'flawed-folk-witch-gift-opening').map((v) => v.param?.toLowerCase());
      for (const p of WITCH_POWERS.filter((x) => x.id !== 'animal-healing' && !flawed.includes(x.name.toLowerCase()))) expect(score(d, p.id), `${label}: ${p.name}`).toBeGreaterThanOrEqual(1);
    }
  }, 120_000);
});

describe('Quick build: a gruagach (HMRE line 2786)', () => {
  it('Gifted: Pictish and Gruagach Lore 2, every Art 1, and spells within the 80 levels', () => {
    for (const seed of SEEDS) {
      const { c, d, label } = common('gruagach', seed, 'gruagach');
      expect(hedgeTradition(c), label).toBe('gruagach');
      expect(has(c, 'the-gift') && has(c, 'gruagach'), label).toBe(true);
      expect(languageScore(c, d, 'Pictish'), label).toBeGreaterThanOrEqual(2);
      expect(score(d, 'organization-lore'), label).toBeGreaterThanOrEqual(2);
      for (const a of [...GRUAGACH_TECHNIQUES, ...GRUAGACH_FORMS]) expect(score(d, a.id), `${label}: ${a.name}`).toBeGreaterThanOrEqual(1);
      const spells = (c.gruagach?.spells ?? []).filter((s) => s.source === 'training');
      expect(spells.length, label).toBeGreaterThan(0);
      expect(spells.reduce((t, s) => t + s.level, 0), label).toBeLessThanOrEqual(80);
      expect(budget(d, GRUAGACH_APPRENTICESHIP)?.spellLevels?.spent, label).toBeLessThanOrEqual(80);
    }
  }, 120_000);

  it('unGifted: Large, Giant Blood or Shapeshifter, and a Technique and a Form, each at 1', () => {
    for (const seed of SEEDS) {
      const { c, d, label } = common('gruagach-ungifted', seed, 'gruagach');
      expect(hedgeTradition(c), label).toBe('gruagach');
      expect(has(c, 'the-gift'), label).toBe(false);
      expect(['large', 'giant-blood', 'shapeshifter'].some((id) => has(c, id)), `${label}: Gruagach’s favor`).toBe(true);
      const techs = GRUAGACH_TECHNIQUES.filter((x) => has(c, x.virtue));
      const forms = GRUAGACH_FORMS.filter((x) => has(c, x.virtue));
      expect(techs.length && forms.length, label).toBeTruthy();
      for (const a of [...techs, ...forms]) expect(score(d, a.id), `${label}: ${a.name}`).toBeGreaterThanOrEqual(1);
      expect(languageScore(c, d, 'Pictish'), label).toBeGreaterThanOrEqual(1);
    }
  }, 120_000);
});

describe('Quick build: a learned magician (HMRE line 4117)', () => {
  it('unGifted: a mundane status beside the tradition’s, a Technique and a Form, Latin and Artes Liberales 1, charms within the training', () => {
    for (const seed of SEEDS) {
      const { c, d, label } = common('learned-magician', seed, 'learned');
      expect(hedgeTradition(c), label).toBe('learned');
      expect(has(c, 'mathematicus-of-bologna'), label).toBe(true);
      // a place in mundane society (line 4157): Clerk, Priest or Mendicant Friar where the rules allow one, else another
      expect(d.tally.socialStatuses.filter((v) => v.cv.defId !== 'mathematicus-of-bologna').length, label).toBeGreaterThanOrEqual(1);
      expect(LEARNED_TECHNIQUES.some((x) => has(c, x.id)) && LEARNED_FORMS.some((x) => has(c, x.id)), label).toBe(true);
      expect(languageScore(c, d, 'Latin'), label).toBeGreaterThanOrEqual(1);
      expect(score(d, 'artes-liberales'), label).toBeGreaterThanOrEqual(1);
      expect(c.learned?.trainingYears, label).toBeGreaterThan(0);
      const b = budget(d, LEARNED_TRAINING)!;
      expect(b.total, label).toBe(30 * c.learned!.trainingYears!);
      expect(b.spent, label).toBeLessThanOrEqual(b.total);
    }
  }, 120_000);

  it('Gifted: The Gift opens the six Arts; no Art is taken as a Virtue', () => {
    for (const seed of SEEDS) {
      const { c, d, label } = common('learned-magician-gifted', seed, 'learned');
      expect(has(c, 'the-gift') && has(c, 'mathematicus-of-bologna'), label).toBe(true);
      expect(LEARNED_TECHNIQUES.some((x) => score(d, x.id) > 0) && LEARNED_FORMS.some((x) => score(d, x.id) > 0), label).toBe(true);
    }
  }, 120_000);
});

describe('Quick build: a vitki (HMRE line 6144)', () => {
  it('Gifted, a free Puissant Virtue from the master, Craft: Runes 2, Old Norse 3, Rune Magic 1, half the apprenticeship on runes, scripts within 120 levels', () => {
    for (const seed of SEEDS) {
      const { c, d, label } = common('vitki', seed, 'vitki');
      expect(hedgeTradition(c), label).toBe('vitki');
      expect(has(c, 'the-gift') && has(c, 'vitki'), label).toBe(true);
      const free = c.virtues.filter((v) => v.defId === 'puissant-ability' && v.free);
      expect(free.length, `${label}: the master’s Puissant Virtue (line 6148)`).toBe(1);
      expect(c.abilities.some((a) => a.abilityId === 'craft-type' && /rune/i.test(a.param ?? '') && score(d, 'craft-type') >= 2), `${label}: Craft: Runes 2`).toBe(true);
      expect(languageScore(c, d, 'Old Norse'), label).toBeGreaterThanOrEqual(3);
      expect(score(d, 'rune-magic'), label).toBeGreaterThanOrEqual(1);
      // "at least half of which should be spent on their magical runes"
      const onRunes = c.abilities.filter((a) => RUNES.some((r) => r.id === a.abilityId)).reduce((t, a) => t + (a.xp[VITKI_APPRENTICESHIP] ?? 0), 0);
      expect(onRunes, label).toBeGreaterThanOrEqual(120);
      // "a score of 10 in a single rune is the practical maximum" (line 6150)
      for (const r of RUNES) expect(score(d, r.id), `${label}: ${r.name} at most 10`).toBeLessThanOrEqual(10);
      const scripts = (c.vitki?.scripts ?? []).filter((s) => s.source === 'training');
      expect(scripts.length, label).toBeGreaterThan(0);
      expect(scripts.reduce((t, s) => t + s.level, 0), label).toBeLessThanOrEqual(120);
    }
  }, 120_000);
});

describe('Quick build: a faerie wizard (RoP: Faerie line 7501)', () => {
  it('a Method and a Power (four points or more), or Summoning; Faerie Sympathy and its Trait on the sheet', () => {
    for (const seed of SEEDS) {
      const { c, d, label } = common('faerie-wizard', seed, 'faerie');
      expect(isFaerieWizard(d), label).toBe(true);
      expect(has(c, 'the-gift'), label).toBe(false);
      const pts = (id: string) => c.virtues.filter((v) => v.defId === id).reduce((t, v) => t + (v.size === 'Major' ? 3 : v.size === 'Minor' ? 1 : 0), 0);
      const methodPower = ['evocation', 'enchantment', 'empathy', 'beguile', 'conjure', 'dream', 'grant', 'portage', 'ware', 'weal', 'woe'].reduce((t, id) => t + pts(id), 0);
      expect(methodPower >= 4 || has(c, 'summoning'), `${label}: at least four points of Method and Power, or Summoning`).toBe(true);
      const sympathy = c.virtues.find((v) => v.defId === 'faerie-sympathy');
      expect(sympathy?.param, label).toBeTruthy();
      expect(c.sympathy?.find((t) => t.trait === sympathy!.param)?.score, label).toBe(sympathy!.size === 'Major' ? 3 : 1);
      expect(c.creation.concept, label).toMatch(/^Faerie wizard of the /);
    }
  }, 120_000);
});

describe('Quick build: a Mystery initiate (HoH: Mystery Cults line 249; The Mysteries, Cabal Legacy)', () => {
  it('a magus of a Mystery House takes one of the House’s Mysteries, with no Cabal Legacy', () => {
    for (const house of ['bjornaer', 'criamon', 'merinita', 'verditius']) {
      const g = make('magus-mystery', 7, { house });
      const label = `${house}`;
      expect(problems(g), label).toEqual([]);
      const mysteries = g.c.virtues.filter((v) => data.vfById.get(v.defId)?.categories.includes('Mystery') && data.vfById.get(v.defId)?.houses?.includes(house) && !v.free);
      expect(mysteries.length, `${label}: a House Mystery`).toBeGreaterThanOrEqual(1);
      expect(has(g.c, 'cabal-legacy-flaw'), label).toBe(false);
      expect(mysteryLoreOf(g.c), label).toMatch(/^House /);
    }
  }, 120_000);

  it('a magus of another House takes Cabal Legacy and a cult’s Mystery the Game Table rolls', () => {
    for (const [house, seed] of [['tremere', 1], ['jerbiton', 2], ['flambeau', 3]] as const) {
      const g = make('magus-mystery', seed, { house });
      const label = `${house} (seed ${seed})`;
      expect(problems(g), label).toEqual([]);
      expect(has(g.c, 'cabal-legacy-flaw'), label).toBe(true);
      expect(CULT_MYSTERIES.some((m) => has(g.c, m.id)), label).toBe(true);
      expect(hasTableMystery(g.c), label).toBe(true);
      expect(mysteryLoreOf(g.c), label).toBe(CULT_MYSTERIES.find((m) => has(g.c, m.id))!.cult);
    }
  }, 120_000);
});

describe('Quick build: an unGifted member learns only what they may', () => {
  it('raises no Arcane Ability (Penetration) without Arcane Lore or the like, across seeds and sagas', () => {
    const rhine = { ...saga('Rhine'), options: { illness: true, labRoutines: true, originalResearch: true, rhineGilds: true, auraVariation: true } } as unknown as Saga;
    // the seed that once raised Penetration for a mathematicus with no Arcane access
    const once = generateCharacter({ type: 'companion', role: 'learned-magician', variety: 'varied', npc: true, seed: 326222801 }, { data, saga: rhine, rules });
    expect(once.issues.filter((i) => i.severity !== 'info').map((i) => i.message)).toEqual([]);
    for (const role of ['folk-witch', 'gruagach-ungifted', 'learned-magician']) {
      for (let seed = 20; seed < 32; seed++) {
        const g = make(role, seed);
        expect(problems(g), `${role} (seed ${seed})`).toEqual([]);
      }
    }
  }, 240_000);
});

describe('Quick build: no stray tradition Virtues (audit 3, B7)', () => {
  it('a cunning folk, a woodsman or a physician takes no hedge tradition’s own Virtue on its own', () => {
    const own = TRADITIONS.flatMap((x) => x.own);
    for (const role of ['cunning-folk', 'woodsman', 'physician', 'scholar']) {
      for (const seed of SEEDS) {
        const g = make(role, seed);
        expect(problems(g), `${role} (seed ${seed})`).toEqual([]);
        expect(g.c.virtues.filter((v) => own.includes(v.defId) && !(st(v.defId))).map((v) => v.defId), `${role} (seed ${seed})`).toEqual([]);
      }
    }
    // Second Sight and Animal Ken are core Virtues anyone may have; the folk witch's own powers are counted only with her status
    function st(id: string) {
      return ['second-sight', 'animal-ken', 'dowsing', 'shapeshifter', 'no-magical-defenses-flaw', 'greater-magical-defenses', 'known-hedge-wizard-flaw'].includes(id);
    }
  }, 120_000);
});

describe('the guided build’s shortlist', () => {
  it('offers a tradition’s status and own Virtues to one who asks for it, and no other tradition’s', () => {
    const c = newCharacter('companion', 's', 1220);
    const ctx = { c, d: deriveCharacter(c, data, rules), data, rules, archetypes: [], saga: saga('Rhine') };
    const gruagach = evaluate({ answers: { 'f-tradition': 10, 'f-trad-gruagach': 10 }, declined: [] }, ctx);
    for (const id of ['gruagach', 'give', 'shape']) expect(gruagach.gated.has(id), id).toBe(false);
    expect(gruagach.gated.get('folk-witch'), 'folk-witch').toMatch(/folk witch’s tradition/);
    expect(gruagach.gated.get('deft-rune'), 'deft-rune').toMatch(/vitki’s tradition/);
    // a choice whose question is rated down no longer counts
    const down = evaluate({ answers: { 'f-tradition': 3, 'f-trad-gruagach': 10 }, declined: [] }, ctx);
    expect(down.gated.has('give')).toBe(true);
    // nothing asked: no tradition's own Virtues, and none of the unbuilt traditions'
    const none = evaluate({ answers: {}, declined: [] }, ctx);
    for (const id of ['vitki', 'give', 'folk-witch', 'mathematicus-of-bologna', 'evocation', 'summoning', 'nightwalker']) expect(none.gated.has(id), id).toBe(true);
  });
});
