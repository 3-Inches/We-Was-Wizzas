import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { DEFAULT_HOUSE_RULES, type Character } from './types';
import { addVirtue, ensureAbility, newCharacter, removeVirtue, setHouse } from './character/factory';
import { deriveCharacter } from './character/derive';
import { validateCharacter, type Issue } from './character/validate';
import { fixesFor, resolveAll, type Fix } from './character/fixes';
import { adjustAfterChange } from './character/rebalance';
import { statusesCompatible, vfAvailability, vfProblems } from './character/restrictions';

const data = buildGameData();
const rules = { ...DEFAULT_HOUSE_RULES, rulings: [] };
const derive = (c: Character) => deriveCharacter(c, data, rules);
const issues = (c: Character) => validateCharacter(derive(c), data, rules);
const budget = (c: Character, id: string) => derive(c).budgets.find((b) => b.id === id)!;
const vf = (id: string) => data.vfById.get(id)!;

/** Make a change the way the editor does: afterwards keep what was bought consistent. */
function change(c: Character, fn: (c: Character) => void): string[] {
  const before = derive(structuredClone(c));
  fn(c);
  return adjustAfterChange(c, before, data, rules);
}

function applyFirst(c: Character, issue: Issue, value?: string) {
  const f = fixesFor(issue, derive(c), data, rules)[0];
  expect(f).toBeDefined();
  if (f.kind === 'apply') f.apply(c);
  else if (f.kind === 'choose' || f.kind === 'param') f.apply(c, value ?? '');
  return f;
}

function companion(): Character {
  const c = newCharacter('companion', 's');
  c.age = 25; // Later Life: 20 years
  addVirtue(c, data, 'wanderer', 'Free');
  return c;
}

describe('experience stays consistent when Virtues change after xp is spent', () => {
  const spendLaterLife = (c: Character, xp: number) => {
    const ids = ['awareness', 'athletics', 'charm', 'folk-ken', 'guile', 'stealth'];
    let left = xp;
    for (const id of ids) {
      const n = Math.min(left, 75);
      if (n > 0) ensureAbility(c, id, { laterLife: n });
      left -= n;
    }
  };

  it('Wealthy and Poor, added and removed after Later Life xp is spent', () => {
    const c = companion();
    expect(budget(c, 'laterLife').total).toBe(300);
    spendLaterLife(c, 300);
    change(c, (x) => void addVirtue(x, data, 'wealthy', 'Major'));
    expect(budget(c, 'laterLife').total).toBe(400);
    expect(budget(c, 'laterLife').spent).toBe(300); // nothing lost; 100 more to spend
    spendLaterLife(c, 400);
    const uid = c.virtues.find((v) => v.defId === 'wealthy')!.uid;
    const notes = change(c, (x) => removeVirtue(x, data, uid));
    expect(budget(c, 'laterLife').spent).toBe(300); // the extra 100 was taken back
    expect(notes.join(' ')).toMatch(/Later Life/);
    change(c, (x) => void addVirtue(x, data, 'poor-flaw', 'Major'));
    expect(budget(c, 'laterLife').total).toBe(200);
    expect(budget(c, 'laterLife').spent).toBe(200);
    expect(issues(c).some((i) => i.code === 'budget')).toBe(false);
    const poor = c.virtues.find((v) => v.defId === 'poor-flaw')!.uid;
    change(c, (x) => removeVirtue(x, data, poor));
    expect(budget(c, 'laterLife').total).toBe(300);
    expect(budget(c, 'laterLife').spent).toBe(200);
  });

  it('Skilled and Weak Parens change the apprenticeship pool', () => {
    const c = newCharacter('magus', 's');
    setHouse(c, data, 'bonisagus');
    change(c, (x) => void addVirtue(x, data, 'skilled-parens', 'Minor'));
    expect(budget(c, 'apprenticeship').total).toBe(300);
    c.arts.Cr = { apprenticeship: 150 };
    c.arts.Co = { apprenticeship: 150 };
    const sp = c.virtues.find((v) => v.defId === 'skilled-parens')!.uid;
    change(c, (x) => removeVirtue(x, data, sp));
    expect(budget(c, 'apprenticeship').total).toBe(240);
    expect(budget(c, 'apprenticeship').spent).toBe(240);
    change(c, (x) => void addVirtue(x, data, 'weak-parens-flaw', 'Minor'));
    expect(budget(c, 'apprenticeship').total).toBe(180);
    expect(budget(c, 'apprenticeship').spent).toBe(180);
  });

  it('a Virtue pool takes its xp with it, from Abilities and Arts', () => {
    const c = companion();
    const cv = addVirtue(c, data, 'educated', 'Minor');
    const key = `pool:${cv.uid}` as const;
    ensureAbility(c, 'dead-language', { [key]: 30 }, 'Latin');
    ensureAbility(c, 'artes-liberales', { [key]: 20 });
    c.arts.Cr = { [key]: 5 };
    removeVirtue(c, data, cv.uid);
    expect(c.abilities.some((a) => a.xp[key])).toBe(false);
    expect(c.arts.Cr[key]).toBeUndefined();
  });

  it('an Ability Affinity added later keeps the score and frees xp', () => {
    const c = companion();
    ensureAbility(c, 'charm', { laterLife: 50 });
    const before = derive(c).abilities.find((a) => a.abilityId === 'charm')!.score;
    const notes = change(c, (x) => void addVirtue(x, data, 'affinity-with-ability', 'Minor', 'charm'));
    expect(derive(c).abilities.find((a) => a.abilityId === 'charm')!.score).toBe(before);
    expect(c.abilities.find((a) => a.abilityId === 'charm')!.xp.laterLife).toBeLessThan(50);
    expect(notes.join(' ')).toMatch(/Charm/);
  });

  it('losing the Virtue that allowed an Ability offers to move or remove the xp', () => {
    const c = companion();
    const cv = addVirtue(c, data, 'educated', 'Minor');
    ensureAbility(c, 'artes-liberales', { laterLife: 15 });
    change(c, (x) => removeVirtue(x, data, cv.uid));
    const illegal = issues(c).find((i) => i.code === 'illegal')!;
    expect(illegal).toBeDefined();
    const fixes = fixesFor(illegal, derive(c), data, rules);
    expect(fixes.some((f) => f.label.startsWith('Remove the 15 xp'))).toBe(true);
    resolveAll(c, data, rules);
    expect(issues(c).some((i) => i.code === 'illegal')).toBe(false);
  });
});

describe('one-click fixes', () => {
  it('resolves the reported Merinita magus', () => {
    const c = newCharacter('magus', 's');
    c.gender = 'Male';
    setHouse(c, data, 'merinita');
    c.characteristics.Pre = 3;
    for (const id of ['blood-of-the-nephilim', 'brutal-artist-flaw', 'slow-might-recovery-flaw']) c.virtues.push({ uid: id, defId: id, size: vf(id).sizes[0] });
    c.abilities.find((a) => a.abilityId === 'faerie-magic')!.xp.laterLife = 70;
    const r = resolveAll(c, data, rules);
    expect(r.applied.join(' | ')).toMatch(/Remove Blood Of The Nephilim/i);
    expect(r.applied.join(' | ')).toMatch(/Remove Brutal Artist/);
    expect(r.applied.join(' | ')).toMatch(/Remove Slow Might Recovery/);
    const left = issues(c).filter((i) => i.severity === 'error').map((i) => i.code);
    for (const code of ['fortype', 'house-only', 'being', 'need', 'illegal']) expect(left).not.toContain(code);
  });

  it('adds the Flaw a Virtue requires', () => {
    const c = companion();
    c.virtues.push({ uid: 'n', defId: 'blood-of-the-nephilim', size: 'Major' });
    const need = issues(c).find((i) => i.code === 'need')!;
    const f = applyFirst(c, need);
    expect(f.label).toBe('Add Greedy');
    expect(c.virtues.some((v) => v.defId === 'greedy-flaw')).toBe(true);
  });

  it('fills in a sub-choice with the Virtue dropdown', () => {
    const c = companion();
    addVirtue(c, data, 'strong-faerie-blood', 'Major');
    const param = issues(c).find((i) => i.code === 'param')!;
    const f = applyFirst(c, param, 'Sidhe') as Extract<Fix, { kind: 'param' }>;
    expect(f.kind).toBe('param');
    expect(f.spec.groups?.[0].options).toContain('Sidhe');
    expect(c.virtues.find((v) => v.defId === 'strong-faerie-blood')!.param).toBe('Sidhe');
  });

  it('gives a grog the Covenfolk status, and drops the later of two incompatible Virtues', () => {
    const g = newCharacter('grog', 's');
    g.virtues = [];
    applyFirst(g, issues(g).find((i) => i.code === 'status-none')!);
    expect(g.virtues.some((v) => v.defId === 'covenfolk')).toBe(true);
    const c = companion();
    addVirtue(c, data, 'well-traveled', 'Minor');
    addVirtue(c, data, 'no-sense-of-direction-flaw', 'Minor');
    applyFirst(c, issues(c).find((i) => i.code === 'excl')!);
    expect(c.virtues.map((v) => v.defId)).toContain('well-traveled');
    expect(c.virtues.map((v) => v.defId)).not.toContain('no-sense-of-direction-flaw');
  });

  it('raises a missing magus Ability with apprenticeship xp', () => {
    const c = newCharacter('magus', 's');
    setHouse(c, data, 'bonisagus');
    const f = applyFirst(c, issues(c).find((i) => i.code === 'min-parma')!);
    expect(f.label).toMatch(/Parma Magica to 1/);
    expect(issues(c).some((i) => i.code === 'min-parma')).toBe(false);
  });

  it('takes back overspent xp', () => {
    const c = companion();
    ensureAbility(c, 'charm', { laterLife: 200 });
    ensureAbility(c, 'guile', { laterLife: 150 });
    applyFirst(c, issues(c).find((i) => i.code === 'budget')!);
    expect(budget(c, 'laterLife').spent).toBe(300);
  });

  it('points steps that need a decision at the right place', () => {
    const c = companion();
    c.characteristics.Str = 3;
    c.characteristics.Sta = 3;
    const over = issues(c).find((i) => i.code === 'char-over')!;
    const f = fixesFor(over, derive(c), data, rules)[0];
    expect(f).toMatchObject({ kind: 'goto', step: 'characteristics' });
  });
});

describe('the Virtue list only offers what can be taken', () => {
  it('blocks a Flaw over the Flaw-point or Minor Flaw limit', () => {
    const c = companion();
    for (const id of ['clumsy-flaw', 'poor-eyesight-flaw', 'afflicted-tongue-flaw', 'fragile-constitution-flaw', 'covenant-upbringing-flaw']) addVirtue(c, data, id, 'Minor');
    expect(vfAvailability(derive(c), data, vf('noncombatant-flaw'), { rules })?.code).toBe('limit-minor');
    addVirtue(c, data, 'dark-secret-flaw', 'Major');
    expect(vfProblems(derive(c), data, vf('plagued-by-supernatural-entity-flaw'), undefined, { rules, size: 'Major' }).map((p) => p.code)).toContain('limit-flaws');
  });

  it('shows a Virtue that needs more Flaws, and blocks one that can never be paid for', () => {
    const c = companion();
    expect(vfAvailability(derive(c), data, vf('educated'), { rules })).toMatchObject({ code: 'afford', severity: 'info' });
    for (const id of ['clumsy-flaw', 'poor-eyesight-flaw', 'afflicted-tongue-flaw', 'fragile-constitution-flaw', 'covenant-upbringing-flaw']) addVirtue(c, data, id, 'Minor');
    addVirtue(c, data, 'dark-secret-flaw', 'Major');
    addVirtue(c, data, 'plagued-by-supernatural-entity-flaw', 'Major');
    for (let i = 0; i < 10; i++) addVirtue(c, data, 'puissant-ability', 'Minor', `x${i}`);
    expect(vfAvailability(derive(c), data, vf('educated'), { rules })).toMatchObject({ code: 'afford', severity: 'error' });
  });

  it('swaps Social Statuses, but magi keep Hermetic Magus', () => {
    const c = companion();
    const swap = vfProblems(derive(c), data, vf('covenfolk')).find((p) => p.code === 'status-replace');
    expect(swap?.replaces).toEqual([c.virtues.find((v) => v.defId === 'wanderer')!.uid]);
    const m = newCharacter('magus', 's');
    expect(vfAvailability(derive(m), data, vf('wanderer'))?.code).toBe('status-extra');
    expect(statusesCompatible(vf('knight'), vf('landed-noble'))).toBe(true);
    expect(statusesCompatible(vf('covenfolk'), vf('knight'))).toBe(false);
  });

  it('makes an incompatible second Social Status an error', () => {
    const c = companion();
    c.virtues.push({ uid: 'k', defId: 'knight', size: 'Minor' });
    expect(issues(c).find((i) => i.code === 'status-many')?.severity).toBe('error');
  });
});

describe('tags', () => {
  const tags = (id: string) => vf(id).ruleTags!.map((t) => t.label);
  it('names Houses, character types and The Gift', () => {
    expect(tags('brutal-artist-flaw')).toContain('House Jerbiton only');
    expect(tags('blood-of-the-nephilim')).toContain('Not for magi');
    expect(tags('affinity-with-art')).toContain('Needs The Gift');
    expect(tags('magical-air-flaw')).toContain('Not with The Gift');
    expect(tags('faerie-magic')).toContain('Merinita House Virtue');
    expect(vf('faerie-blood').houseIds).toContain('merinita');
  });
  it('says what a Virtue adds and whether it is free or counted', () => {
    expect(tags('strong-faerie-blood')).toContain('Adds Second Sight (free)');
    expect(tags('blood-of-the-nephilim')).toContain('Adds Greedy (counts as a normal Flaw)');
    expect(tags('diedne-magic')).toContain('Adds Dark Secret (no Virtue points)');
    expect(tags('wealthy')).toContain('Later Life 20 xp/year');
  });
});

describe('covenant fixes', () => {
  it('adds the Hook a Boon requires, and trims extra Aura Boons', async () => {
    const { deriveCovenant, newCovenant } = await import('./covenant');
    const cov = newCovenant('s', 1220);
    cov.hooksBoons.push({ uid: 'sk', defId: 'boon-Minor-shell-keep', name: 'Shell Keep', kind: 'boon', size: 'Minor' });
    for (let i = 0; i < 8; i++) cov.hooksBoons.push({ uid: `a${i}`, defId: 'boon-Minor-aura', name: 'Aura', kind: 'boon', size: 'Minor' });
    let dc = deriveCovenant(cov, data, []);
    const req = dc.issueList.find((i) => /requires the Castle Hook/.test(i.message))!;
    const add = req.fixes[0];
    expect(add).toMatchObject({ kind: 'apply', label: 'Add the Castle Hook' });
    if (add.kind === 'apply') add.apply(cov);
    const aura = deriveCovenant(cov, data, []).issueList.find((i) => /Aura Boon/.test(i.message))!;
    if (aura.fixes[0].kind === 'apply') aura.fixes[0].apply(cov);
    dc = deriveCovenant(cov, data, []);
    expect(dc.issueList.some((i) => /requires the Castle/.test(i.message) || /Aura Boon may be taken/.test(i.message))).toBe(false);
  });
});

describe('covenant lab text bundles', () => {
  it('checks a bundle by its largest text, not its total', async () => {
    const { deriveCovenant, newCovenant } = await import('./covenant');
    const cov = newCovenant('s', 1220);
    cov.powerLevel = 'Medium';
    cov.buildPoints = 1000;
    cov.library.push({ uid: 'lt', title: 'Lab texts (1000 levels, max 40)', kind: 'labText', subjectType: 'other', subject: 'various', level: 1000, quality: 0, language: 'Latin', collectionMax: 40 });
    expect(deriveCovenant(cov, data, []).issues.some((i) => /exceeds/.test(i))).toBe(false);
    cov.library.push({ uid: 'one', title: 'Big text', kind: 'labText', subjectType: 'spell', subject: 'X', level: 50, quality: 0, language: 'Latin' });
    expect(deriveCovenant(cov, data, []).issues.some((i) => /Level 50 exceeds/.test(i))).toBe(true);
  });
});
