// Acceptance tests for the guided build (design spec, section 9). Every test runs through the
// simulator, which answers the quiz with a scripted profile.

import { describe, expect, it } from 'vitest';
import { buildGameData } from '../../data';
import { DEFAULT_HOUSE_RULES, type Character, type Covenant, type Saga } from '../types';
import { newCharacter, setHouse } from '../character/factory';
import { deriveCharacter } from '../character/derive';
import { validateCharacter } from '../character/validate';
import { newCovenant } from '../covenant';
import { QUESTIONS, QUESTION_BY_ID, childrenOf } from './questions';
import { ARCHETYPES, MAGNITUDES } from './magnitudes';
import { TAGS } from './tags';
import { inventory, vfRecords } from './records';
import { candidatesFor, evaluate, questionHint, recommendHouses, shortlist, statusShortlist, STOP_BELOW, traceOf, visibleQuestions, type GuidedContext } from './score';
import { fixedProfile, simulate } from './simulate';
import { autoBuild } from './autobuild';

const data = buildGameData();
const rules = DEFAULT_HOUSE_RULES;
const rhine = { tribunal: 'Rhine' } as Saga;

function character(type: Character['type'], house?: string): Character {
  const c = newCharacter(type, 's');
  c.name = 'Test';
  if (house) setHouse(c, data, house, 0);
  return c;
}
const ctxOf = (c: Character, extra: Partial<GuidedContext> = {}): GuidedContext => ({ c, d: deriveCharacter(c, data, rules), data, rules, archetypes: [], saga: rhine, ...extra });
const issues = (c: Character) => validateCharacter(deriveCharacter(c, data, rules), data, rules).filter((i) => i.severity !== 'info' && i.code !== 'name');

describe('guided build: the data', () => {
  it('has a record for every Virtue and Flaw, and reports the inventory', () => {
    const inv = inventory(data);
    expect(inv.total).toBe(data.virtuesFlaws.length);
    expect(inv.computed).toBeGreaterThan(200);
    expect(inv.piles['story-only'] + inv.piles['self-contained'] + inv.piles['other-book']).toBe(inv.total - inv.computed);
  });

  it('coverage: every preference tag is reachable by a question, every Virtue and Flaw by a tag', () => {
    const asked = new Set(QUESTIONS.flatMap((q) => Object.keys(q.tags)));
    const unreachable = TAGS.filter((t) => t.family !== 'meta' && !asked.has(t.id)).map((t) => t.id);
    expect(unreachable).toEqual([]);
    const recs = [...vfRecords(data).values()];
    const orphans = recs.filter((r) => !r.links.some((l) => asked.has(l.tag) || l.tag === '$param' || l.tag === '$anyChar')).map((r) => r.id);
    // The Gift is given by the character type, never chosen
    expect(orphans.filter((id) => id !== 'the-gift')).toEqual([]);
  });
});

describe('guided build: the questionnaire', () => {
  it('path length: the longest path stays near 100 answered questions; typical ones far fewer', () => {
    const longest = simulate(fixedProfile('all tens', {}, 10), ctxOf(character('magus')));
    // every follow-up opened: the outputs-first questions, new player, rerolls and Characteristics-later add a few
    expect(longest.answered).toBeLessThanOrEqual(128);
    const typical = [
      simulate(fixedProfile('battle mage', { 'o-cast': 10, 'c-fight': 10, 'd-penetrate': 9, 'b-arts': 8, 'b-art-Pe': 10, 'b-art-Ig': 9, 'e-lab': 2 }), ctxOf(character('magus', 'flambeau'))),
      simulate(fixedProfile('faerie', { 'f-faerie': 10, 'f-faerie-blood': 9, 'h-social': 8 }), ctxOf(character('companion'))),
      simulate(fixedProfile('grog', { 'd-fight': 10, 'h-fight': 10 }), ctxOf(character('grog'))),
    ];
    for (const r of typical) expect(r.answered).toBeLessThan(40);
  });

  it('stop rule: no follow-up is asked once fewer than 10 candidates remain', () => {
    for (const prof of [fixedProfile('all tens', {}, 10), fixedProfile('some', { 'f-magic': 9, 'c-improvise': 9, 'e-lab': 9, 'f-politics': 8 })]) {
      const c = character('magus');
      const r = simulate(prof, ctxOf(c));
      const ctx = ctxOf(c);
      const ev = evaluate(r.state, ctx);
      for (const v of visibleQuestions(r.state, ctx, { ev })) {
        if (!v.q.parent || v.q.build) continue;
        const parent = QUESTIONS.find((q) => q.id === v.q.parent)!;
        expect(candidatesFor(parent, ev)).toBeGreaterThanOrEqual(STOP_BELOW);
      }
    }
  });

  it('follow-ups open at 7 or more (or 3 or less), not in between', () => {
    const c = character('magus');
    const at = (a: number) => visibleQuestions({ answers: { 'e-lab': a }, declined: [] }, ctxOf(c)).map((v) => v.q.id);
    const kids = childrenOf('e-lab').filter((q) => (q.when ?? 'high') === 'high').map((q) => q.id);
    expect(kids.every((k) => at(7).includes(k))).toBe(true);
    expect(kids.some((k) => at(6).includes(k))).toBe(false);
    expect(at(3)).toContain('e-adventure-learn');
    expect(at(4)).not.toContain('e-adventure-learn');
  });

  it('all tens triggers the tie-breaker', () => {
    expect(simulate(fixedProfile('all tens', {}, 10), ctxOf(character('magus'))).tieBreakTriggered).toBe(true);
    expect(simulate(fixedProfile('all tens', {}, 10), ctxOf(character('companion'))).tieBreakTriggered).toBe(true);
  });
});

describe('guided build: recommendations', () => {
  it('gates hold: a Rhine character who rates the Divine 10 never sees options from elsewhere', () => {
    const c = character('companion');
    const r = simulate(fixedProfile('divine', { 'f-divine': 10, 'f-divine-faith': 10, 'g-church': 10 }), ctxOf(c));
    const recs = vfRecords(data);
    for (const s of r.evaluation.scored) {
      const rec = recs.get(s.def.id)!;
      if (rec.regions.length) expect(rec.regions).toContain('Rhine');
      if (rec.cultures.length) expect(rec.cultures).toContain(c.society);
    }
    expect(r.evaluation.gated.get('sufi')).toBeTruthy();
  });

  it('flaw direction: rating ritual magic 0 surfaces ritual Flaws; the Divine at 10 surfaces Divine Story and Personality Flaws', () => {
    const noRituals = simulate(fixedProfile('no rituals', { 'o-cast': 8, 'c-ritual': 0 }), ctxOf(character('magus')));
    expect(noRituals.flaws.slice(0, 15).some((s) => s.rec.links.some((l) => l.tag === 'ritual' && l.dir < 0))).toBe(true);
    const divine = simulate(fixedProfile('divine', { 'f-divine': 10, 'g-church': 9, 'g-good': 9 }), ctxOf(character('companion')));
    const top = divine.flaws.slice(0, 10);
    expect(top.some((s) => (s.def.categories.includes('Story') || s.def.categories.includes('Personality')) && s.rec.links.some((l) => l.hook && ['realm:divine', 'church', 'good'].includes(l.tag)))).toBe(true);
    expect(top.map((s) => s.def.id)).toContain('pious-flaw');
  });

  it('no recommended Flaw hurts something rated high', () => {
    const r = simulate(fixedProfile('fighter', { 'd-fight': 10, 'h-fight': 10, 'd-hard-to-hurt': 9, 'h-social': 9 }), ctxOf(character('companion')));
    for (const s of r.flaws) {
      for (const l of s.rec.links) {
        if (l.hook || l.dir > 0 || l.strength < 2) continue;
        expect(r.evaluation.weights[l.tag] ?? 0).toBeLessThan(2);
      }
    }
    expect(r.flaws.map((s) => s.def.id)).not.toContain('noncombatant-flaw');
  });

  it('traceability: every recommendation carries its source and the answers behind it', () => {
    const c = character('magus', 'flambeau');
    const r = simulate(fixedProfile('battle mage', { 'o-cast': 9, 'c-fight': 9, 'd-penetrate': 9 }), ctxOf(c));
    for (const s of [...r.virtues.slice(0, 20), ...r.flaws.slice(0, 10)]) {
      expect(s.def.source.book).toBeTruthy();
      if (s.fit > 0) expect(traceOf(s, r.state, ctxOf(c))).toMatch(/— \d+/);
    }
    expect(traceOf(r.virtues.find((s) => s.def.id === 'fast-caster')!, r.state, ctxOf(c))).toContain('cast spells in the middle of a fight');
  });

  it('known characters: the Definitive Edition examples get most of their Virtues and Flaws recommended', () => {
    const recall = (c: Character, answers: Record<string, number>, expected: string[]) => {
      const r = simulate({ ...fixedProfile('x', answers), tieBreak: () => 10 }, ctxOf(c));
      const ids = new Set([...r.virtues.slice(0, 40), ...statusShortlist(r.evaluation).slice(0, 5), ...r.flaws.slice(0, 30)].map((s) => s.def.id));
      return expected.filter((id) => ids.has(id)).length / expected.length;
    };
    // Darius of Flambeau (DE p.108)
    expect(recall(character('magus', 'flambeau'), { 'o-cast': 9, 'b-arts': 9, 'b-art-Pe': 10, 'b-art-Ig': 6, 'c-fight': 9, 'c-mastery': 9, 'd-penetrate': 8, 'd-resist': 7, 'f-senses': 9, 'f-politics': 7, 'g-fame': 8, 'g-rival': 9, 'g-duty': 7, 'g-heroic': 7, 'd-concentrate': 7, 'e-lab': 3, 'h-social': 2, 'g-outsider': 7 },
      ['affinity-with-art', 'flawless-magic', 'fast-caster', 'hermetic-prestige', 'premonitions', 'second-sight', 'strong-willed', 'enduring-constitution', 'blatant-gift-flaw', 'driven-flaw', 'enemies-flaw', 'disfigured-flaw'])).toBeGreaterThan(0.6);
    // the sample knight (DE, Companions)
    expect(recall(character('companion'), { 'g-birth': 10, 'g-wealth': 9, 'h-fight': 10, 'd-fight': 10, 'f-divine': 7, 'f-divine-faith': 7, 'g-duty': 9, 'g-vice': 7, 'a-chars': 8, 'a-focus': 8 },
      ['knight', 'wealthy', 'improved-characteristics', 'puissant-ability', 'relic', 'oath-of-fealty-flaw', 'proud-flaw', 'overconfident-flaw'])).toBeGreaterThan(0.6);
    // the sample scholar (DE, Companions)
    expect(recall(character('companion'), { 'h-scholar': 10, 'e-study': 10, 'a-chars': 8, 'a-char-Int': 10, 'g-family': 8, 'g-outsider': 7, 'g-heroic': 6, 'h-social': 3, 'e-teach': 8, 'g-fame': 7 },
      ['clerk', 'apt-student', 'book-learner', 'good-teacher', 'great-characteristic', 'improved-characteristics', 'black-sheep-flaw', 'driven-flaw', 'social-handicap-flaw'])).toBeGreaterThan(0.6);
    // the sample priest (DE, Companions)
    expect(recall(character('companion'), { 'f-divine': 10, 'f-divine-faith': 10, 'g-church': 10, 'g-good': 9, 'h-social': 7, 'f-travel': 7, 'd-resist': 6, 'f-senses': 7, 'h-lore': 7, 'h-scholar': 6 },
      ['priest', 'inspirational', 'lesser-immunity', 'relic', 'sense-holiness-and-unholiness', 'social-contacts', 'student-of-realm', 'well-traveled', 'compassionate-flaw', 'plagued-by-supernatural-entity-flaw', 'clumsy-flaw', 'vow-flaw'])).toBeGreaterThan(0.5);
  });

  it('saga context moves strength, never fit: vis-rich and vis-poor covenants', () => {
    const c = character('magus');
    const rich = newCovenant('s', 1220);
    rich.memberIds = [c.id];
    rich.visSources = [{ uid: 'v', name: 'Spring', art: 'Vi', pawnsPerYear: 20 }];
    const poor: Covenant = { ...newCovenant('s', 1220), memberIds: [c.id] };
    const st = { answers: { 'c-ritual': 8, 'e-vis': 9 }, declined: [] };
    const merc = (cov: Covenant) => evaluate(st, ctxOf(c, { covenant: cov })).scored.find((s) => s.def.id === 'mercurian-magic')!;
    expect(merc(rich).fit).toBe(merc(poor).fit);
    expect(merc(poor).strength.seasons!).toBeGreaterThan(merc(rich).strength.seasons!);
  });

  it('everything neutral still gets a result: broadly useful options', () => {
    const r = simulate(fixedProfile('neutral', {}), ctxOf(character('magus', 'bonisagus')));
    expect(r.answered).toBe(0);
    expect(r.virtues.length).toBeGreaterThan(5);
    expect(shortlist(r.evaluation, 'virtue')[0].strength.seasons).toBeGreaterThan(0);
  });
});

describe('guided build: auto-build', () => {
  const build = (type: Character['type'], answers: Record<string, number>, rest?: number, house?: string) => {
    const c = character(type, house);
    const r = simulate({ ...fixedProfile('p', answers, rest), tieBreak: () => 10 }, ctxOf(c));
    const res = autoBuild(c, r.state, { data, rules, saga: rhine, archetypes: [] });
    return { c, res };
  };

  it('all neutral: a sensible, well-rounded draft with zero rules-check issues', () => {
    for (const type of ['magus', 'companion', 'grog'] as const) {
      const { c, res } = build(type, {});
      expect(res.remaining).toEqual([]);
      expect(issues(c)).toEqual([]);
      const d = deriveCharacter(c, data, rules);
      expect(d.tally.virtuePoints).toBeLessThanOrEqual(d.tally.allowedVirtuePoints);
      if (type === 'magus') {
        expect(c.house).toBeTruthy();
        expect(c.spells.length).toBeGreaterThan(0);
      }
    }
  });

  it('drafts from strong answers pass the rules check too, and every choice says why', () => {
    const drafts = [
      build('magus', { 'o-cast': 10, 'c-fight': 10, 'd-penetrate': 10, 'b-arts': 9, 'b-art-Pe': 10, 'b-art-Ig': 10, 'c-ritual': 0, 'e-lab': 2, 'g-rival': 8 }),
      build('magus', { 'e-lab': 10, 'e-invent': 9, 'e-enchant': 10, 'b-arts': 8, 'b-art-Cr': 9, 'b-art-Te': 9, 'a-focus': 9 }, undefined, 'verditius'),
      build('companion', { 'f-faerie': 10, 'f-faerie-blood': 9, 'h-social': 8, 'g-love': 8 }),
      build('grog', { 'd-fight': 10, 'd-hard-to-hurt': 9, 'h-fight': 10 }),
      build('magus', {}, 10),
      build('companion', {}, 0),
    ];
    for (const { c, res } of drafts) {
      expect(res.remaining).toEqual([]);
      expect(issues(c)).toEqual([]);
      for (const v of c.virtues) if (!v.free && !v.requiredBy && v.defId !== 'covenfolk') expect(v.why).toBeTruthy();
      for (const a of c.abilities) if (Object.values(a.xp).some((x) => x)) expect(a.why).toBeTruthy();
    }
    // the warrior grog is not offered a Flaw against fighting, and takes Warrior for weapons
    const grog = drafts[3].c;
    expect(grog.virtues.map((v) => v.defId)).not.toContain('noncombatant-flaw');
    expect(grog.virtues.map((v) => v.defId)).toContain('warrior');
    // the battle mage spends on the Arts they rated
    const d = deriveCharacter(drafts[0].c, data, rules);
    expect(d.arts.Pe.score).toBeGreaterThan(d.arts.Cr.score);
  });
});

describe('guided build: outputs first, Totals ranked, ranges in the questions', () => {
  it('ranks options against the others that move the same Total: Life Boost is near the top for casting', () => {
    const c = character('magus');
    const r = simulate(fixedProfile('caster', { 'o-cast': 10 }), ctxOf(c));
    const lb = r.evaluation.scored.find((s) => s.def.id === 'life-boost')!;
    expect(lb.ranks?.find((x) => x.tag === 'casting')?.rank).toBe(1);
    const top = r.virtues.slice(0, 8).map((s) => s.def.id);
    expect(top).toContain('life-boost');
    expect(top.indexOf('life-boost')).toBeLessThan(top.indexOf('puissant-art') < 0 ? 99 : top.indexOf('puissant-art'));
  });
  it('ends numeric questions with what the best options give, Minor before Major and Virtues before Flaws', () => {
    const c = character('magus');
    const ev = evaluate({ answers: {}, declined: [] }, ctxOf(c));
    const hint = questionHint(QUESTION_BY_ID.get('o-cast')!, ev);
    expect(hint).toMatch(/^Minor Virtues: .*Life Boost \(\+5 per Fatigue level spent, even into Wounds\)/);
    expect(hint).toMatch(/Major Virtues: .*Major Magical Focus \(lowest Art added twice/);
    expect(hint.indexOf('Minor Virtues')).toBeLessThan(hint.indexOf('Major Virtues'));
    const narrow = questionHint(QUESTION_BY_ID.get('o-narrow-cost')!, ev);
    expect(narrow).toMatch(/Minor Flaws: .*Deficient Form/);
  });
  it('asks the archetype question and recommends what only that archetype wants', () => {
    const c = character('magus');
    const plain = simulate(fixedProfile('caster', { 'o-cast': 9 }), ctxOf(c));
    expect(plain.virtues.slice(0, 5).map((s) => s.def.id)).not.toContain('elemental-magic');
    const r = simulate(fixedProfile('elementalist', { 'o-cast': 9, 'o-archetype': 9, 'o-arch-elementalist': 10 }), ctxOf(c));
    expect(r.virtues.slice(0, 5).map((s) => s.def.id)).toContain('elemental-magic');
  });
  it('recommends progression Virtues first when the player asks for growth', () => {
    const c = character('magus');
    const r = simulate(fixedProfile('grower', { 'a-progression': 10, 'o-cast': 8 }), ctxOf(c));
    const ids = r.virtues.map((s) => s.def.id);
    expect(ids.indexOf('affinity-with-art')).toBeLessThan(ids.indexOf('puissant-art'));
    const flat = simulate(fixedProfile('flat', { 'a-progression': 0, 'o-cast': 8 }), ctxOf(c)).virtues.map((s) => s.def.id);
    expect(flat.indexOf('puissant-art')).toBeLessThan(flat.indexOf('affinity-with-art') < 0 ? 999 : flat.indexOf('affinity-with-art'));
  });
  it('lets a narrow-at-a-cost magus take a Deficient Art even while rating casting high', () => {
    const c = character('magus');
    const no = simulate(fixedProfile('caster', { 'o-cast': 9 }), ctxOf(c));
    expect(no.evaluation.scored.find((s) => s.def.id === 'deficient-form-flaw')?.excluded).toBeTruthy();
    const yes = simulate(fixedProfile('narrow', { 'o-cast': 9, 'o-narrow': 9, 'o-narrow-cost': 10 }), ctxOf(c));
    expect(yes.evaluation.scored.find((s) => s.def.id === 'deficient-form-flaw')?.excluded).toBeUndefined();
    expect(yes.flaws.slice(0, 10).map((s) => s.def.id)).toContain('deficient-form-flaw');
  });
  it('knows every Virtue and Flaw its tables name', () => {
    for (const id of [...Object.keys(MAGNITUDES), ...ARCHETYPES.flatMap((a) => a.vf.map(([v]) => v))]) expect(data.vfById.has(id), id).toBe(true);
  });
});

describe('guided build: playtest fixes (tags, Houses, tie-breaker)', () => {
  it('reads words for what they mean: a dust devil is no demon, a power\'s Penetration stat is not the magus\'s', () => {
    const recs = vfRecords(data);
    expect(recs.get('dust-devil')!.links.some((l) => l.tag === 'realm:infernal')).toBe(false);
    expect(recs.get('leather-ripper')!.links.some((l) => l.tag === 'penetration')).toBe(false);
  });
  it('does not recommend experience that can only go where the player rated low', () => {
    const r = simulate(fixedProfile('scholar mage', { 'a-progression': 10, 'h-fight': 0, 'f-travel': 0 }), ctxOf(character('magus')));
    const warrior = r.evaluation.scored.find((s) => s.def.id === 'warrior');
    expect(warrior?.excluded).toMatch(/rated low/);
    expect(r.virtues.slice(0, 10).map((s) => s.def.id)).not.toContain('warrior');
  });
  it('points Twilight answers either way to Criamon, and Faerie to Merinita; offers Ex Miscellanea', () => {
    const top = (answers: Record<string, number>) => {
      const ctx = ctxOf(character('magus'));
      return recommendHouses(evaluate({ answers, declined: [] }, ctx), ctx);
    };
    expect(top({ 'e-warping': 0 })[0].id).toBe('criamon');
    expect(top({ 'e-warping': 10 })[0].id).toBe('criamon');
    expect(top({ 'f-faerie': 10 })[0].id).toBe('merinita');
    expect(top({}).some((h) => h.id === 'ex-miscellanea')).toBe(true);
    // Tremere's free Focus covers only Certamen: casting answers alone do not make it the pick
    expect(top({ 'o-cast': 10, 'a-focus': 10 })[0].id).not.toBe('tremere');
  });
  it('keeps the tie-breaker among the tied tags: 0 lowers a tag but never below zero, 10 never raises it', () => {
    const ctx = ctxOf(character('magus'));
    const base = evaluate({ answers: { 'e-lab': 10, 'o-cast': 10 }, declined: [] }, ctx).weights;
    const tb = evaluate({ answers: { 'e-lab': 10, 'o-cast': 10, 'tb:lab': 0, 'tb:casting': 10 }, declined: [] }, ctx).weights;
    expect(tb.casting).toBe(base.casting);
    expect(tb.lab).toBeGreaterThan(0);
    expect(tb.lab).toBeLessThan(base.lab);
  });
});
