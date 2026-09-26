import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { RESTRICTIONS } from '../data/restrictions';
import { DEFAULT_HOUSE_RULES, type Character } from './types';
import { addVirtue, newCharacter, removeVirtue, setHouse } from './character/factory';
import { deriveCharacter } from './character/derive';
import { validateCharacter } from './character/validate';
import { vfAvailability, vfProblems } from './character/restrictions';
import { rebalanceAffinityXp, rebalanceAlloc } from './character/rebalance';

const data = buildGameData();
const rules = { ...DEFAULT_HOUSE_RULES, rulings: [] };
const derive = (c: Character) => deriveCharacter(c, data, rules);
const issues = (c: Character) => validateCharacter(derive(c), data, rules);

function merinitaMagus(): Character {
  const c = newCharacter('magus', 's');
  c.gender = 'Male';
  setHouse(c, data, 'merinita');
  return c;
}

describe('restriction data', () => {
  it('only names Virtues and Flaws that exist', () => {
    const missing: string[] = [];
    for (const [id, m] of Object.entries(RESTRICTIONS)) {
      if (!data.vfById.has(id)) missing.push(id);
      for (const r of [...(m.requires ?? []), ...(m.excludes ?? [])]) if (!data.vfById.has(r)) missing.push(`${id} -> ${r}`);
      for (const n of m.needs ?? []) {
        for (const r of n.anyOf ?? []) if (!r.startsWith('$') && !data.vfById.has(r)) missing.push(`${id} needs ${r}`);
        if (n.auto && !data.vfById.has(n.auto.id)) missing.push(`${id} auto ${n.auto.id}`);
      }
    }
    expect(missing).toEqual([]);
  });
  it('drops the summary tables the extractor caught as entries', () => {
    expect(data.vfById.has('summary-of-new-virtues')).toBe(false);
    expect(data.vfById.has('new-virtues-and-flaws-for-rhine-magi')).toBe(false);
  });
  it('makes incompatibilities symmetric', () => {
    expect(data.vfById.get('well-traveled')?.excludes).toContain('no-sense-of-direction-flaw');
    expect(data.vfById.get('covenfolk')?.excludes).toContain('wealthy');
  });
});

describe('Virtue & Flaw restrictions (the James Charles III case)', () => {
  // A Merinita magus with the Virtues and Flaws from the reported character
  const james = () => {
    const c = merinitaMagus();
    c.characteristics.Pre = 3;
    for (const id of ['blood-of-the-nephilim', 'brutal-artist-flaw', 'slow-might-recovery-flaw', 'strong-faerie-blood', 'corrupted-arts-flaw', 'envied-beauty-flaw', 'faerie-metamorphosis-flaw']) {
      c.virtues.push({ uid: id, defId: id, size: data.vfById.get(id)!.sizes[0] });
    }
    return c;
  };

  it('flags every Virtue or Flaw the character may not take', () => {
    const ids = issues(james()).map((i) => i.id);
    expect(ids).toContain('fortype-blood-of-the-nephilim'); // magi and grogs may not take it
    expect(ids).toContain('need0-blood-of-the-nephilim'); // requires Greedy
    expect(ids).toContain('house-only-brutal-artist-flaw'); // Jerbiton only
    expect(ids).toContain('being-slow-might-recovery-flaw'); // faerie characters only
    expect(ids).toContain('param-strong-faerie-blood'); // choose the heritage
    expect(ids).toContain('param-corrupted-arts-flaw'); // choose the Arts
  });

  it('accepts the ones that are legal for him', () => {
    const ids = issues(james()).map((i) => i.id);
    expect(ids.some((i) => i.endsWith('envied-beauty-flaw'))).toBe(false); // Presence +3
    expect(ids.some((i) => i.endsWith('faerie-metamorphosis-flaw'))).toBe(false); // has The Gift
  });

  it('drops the Merinita Warping Point once a faerie Virtue is taken', () => {
    const c = merinitaMagus();
    expect(c.warpingPoints).toBe(1);
    const cv = addVirtue(c, data, 'strong-faerie-blood');
    expect(c.warpingPoints).toBe(0);
    removeVirtue(c, data, cv.uid);
    expect(c.warpingPoints).toBe(1);
  });

  it('does not let a magus buy the House Ability with Later Life xp', () => {
    const c = merinitaMagus();
    const fm = c.abilities.find((a) => a.abilityId === 'faerie-magic')!;
    fm.xp.laterLife = 70;
    expect(issues(c).some((i) => i.id === `illegal-${fm.uid}-laterLife` && i.severity === 'error')).toBe(true);
    delete fm.xp.laterLife;
    fm.xp.apprenticeship = 70;
    expect(issues(c).some((i) => i.id.startsWith(`illegal-${fm.uid}`))).toBe(false);
  });
});

describe('Virtue picker', () => {
  it('blocks House-only Flaws for other Houses', () => {
    const c = merinitaMagus();
    expect(vfAvailability(derive(c), data, data.vfById.get('brutal-artist-flaw')!)?.severity).toBe('error');
    setHouse(c, data, 'jerbiton');
    expect(vfAvailability(derive(c), data, data.vfById.get('brutal-artist-flaw')!)).toBeNull();
  });
  it('blocks type-restricted Virtues', () => {
    const grog = newCharacter('grog', 's');
    expect(vfAvailability(derive(grog), data, data.vfById.get('temporal-influence')!)?.severity).toBe('error');
    const comp = newCharacter('companion', 's');
    expect(vfProblems(derive(comp), data, data.vfById.get('blood-of-the-nephilim')!).filter((p) => p.severity === 'error')).toEqual([]);
  });
  it('warns (not blocks) on Characteristic requirements before Characteristics are set', () => {
    const c = newCharacter('companion', 's');
    const p = vfAvailability(derive(c), data, data.vfById.get('supernatural-beauty')!);
    expect(p?.severity).toBe('warning');
    c.characteristics.Pre = 1;
    expect(vfAvailability(derive(c), data, data.vfById.get('supernatural-beauty')!)).toBeNull();
  });
  it('requires prerequisites and The Gift', () => {
    const c = newCharacter('companion', 's');
    expect(vfAvailability(derive(c), data, data.vfById.get('faerie-legacy')!)?.short).toMatch(/Faerie Blood/);
    addVirtue(c, data, 'faerie-blood', 'Minor', 'Sidhe');
    expect(vfAvailability(derive(c), data, data.vfById.get('faerie-legacy')!)).toBeNull();
    expect(vfAvailability(derive(c), data, data.vfById.get('holy-magic')!)?.short).toBe('Requires The Gift');
    expect(vfAvailability(derive(c), data, data.vfById.get('magical-air-flaw')!)).toBeNull();
    addVirtue(c, data, 'the-gift', 'Free');
    expect(vfAvailability(derive(c), data, data.vfById.get('magical-air-flaw')!)?.severity).toBe('error');
  });
});

describe('Virtues that bring a Flaw with them', () => {
  it('adds Greedy with Blood of the Nephilim, counting as a normal Flaw, and removes it with it', () => {
    const c = newCharacter('companion', 's');
    const cv = addVirtue(c, data, 'blood-of-the-nephilim', 'Major');
    const greedy = c.virtues.find((v) => v.defId === 'greedy-flaw');
    expect(greedy?.requiredBy).toBe(cv.uid);
    expect(derive(c).tally.flawPoints).toBe(1);
    removeVirtue(c, data, cv.uid);
    expect(c.virtues.some((v) => v.defId === 'greedy-flaw')).toBe(false);
  });
  it('adds a point-less Major Story Flaw with Diedne Magic', () => {
    const c = newCharacter('magus', 's');
    addVirtue(c, data, 'diedne-magic', 'Major');
    const secret = c.virtues.find((v) => v.defId === 'dark-secret-flaw');
    expect(secret?.noPoints).toBe(true);
  });
});

describe('Virtue sub-choices', () => {
  it('gives Strong Faerie Blood the heritage choice and applies Sidhe Blood', () => {
    const def = data.vfById.get('strong-faerie-blood')!;
    expect(def.param?.groups?.[0].options).toContain('Sidhe');
    const c = newCharacter('companion', 's');
    c.characteristics.Pre = 1;
    addVirtue(c, data, 'strong-faerie-blood', 'Major', 'Sidhe');
    expect(derive(c).characteristics.Pre.value).toBe(2);
  });
  it('lets Corrupted Arts name several Arts', () => {
    const c = newCharacter('magus', 's');
    addVirtue(c, data, 'corrupted-arts-flaw', 'Minor', 'Cr,Co');
    expect(derive(c).virtues.find((v) => v.cv.defId === 'corrupted-arts-flaw')?.name).toBe('Corrupted Arts (Creo, Corpus)');
  });
});

describe('Affinity taken after xp was spent', () => {
  it('keeps the Art score and frees the xp during creation', () => {
    const c = newCharacter('magus', 's');
    c.arts.Cr = { apprenticeship: 55 };
    const before = derive(c);
    expect(before.arts.Cr.score).toBe(10);
    addVirtue(c, data, 'affinity-with-art', 'Minor', 'Cr');
    const notes = rebalanceAffinityXp(c, before, data, rules);
    expect(derive(c).arts.Cr.score).toBe(10);
    expect(c.arts.Cr.apprenticeship).toBe(37);
    expect(notes[0].delta.apprenticeship).toBe(-18);
    // taking it away puts the xp back
    const withAff = derive(c);
    c.virtues = c.virtues.filter((v) => v.defId !== 'affinity-with-art');
    rebalanceAffinityXp(c, withAff, data, rules);
    expect(derive(c).arts.Cr.score).toBe(10);
  });
  it('frees the latest pool first', () => {
    const alloc = { apprenticeship: 40, postGauntlet: 15 };
    const delta = rebalanceAlloc(alloc, 1, 1.5);
    expect(alloc.postGauntlet ?? 0).toBeLessThan(15);
    expect(Math.ceil(alloc.apprenticeship * 1.5) + Math.ceil((alloc.postGauntlet ?? 0) * 1.5)).toBeGreaterThanOrEqual(55);
    expect(delta.postGauntlet).toBeLessThan(0);
  });
  it('balances with an adjustment once play has started', () => {
    const c = newCharacter('magus', 's');
    c.creation.finalized = true;
    c.arts.Co = { apprenticeship: 21 };
    const before = derive(c);
    addVirtue(c, data, 'affinity-with-art', 'Minor', 'Co');
    rebalanceAffinityXp(c, before, data, rules);
    expect(derive(c).arts.Co.effectiveXp).toBe(21);
    expect(c.arts.Co.apprenticeship).toBe(21);
  });
});
