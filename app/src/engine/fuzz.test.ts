// Mix-and-match checks: every Virtue and Flaw on every character type, adding and removing them,
// random bundles with the automatic fixes applied, magic characters with random Qualities, and
// every covenant and laboratory option. Nothing may throw, every number must be finite, and no
// message may show "undefined", "NaN" or "[object Object]".

import { describe, expect, it } from 'vitest';
import { ARTS, CHARACTERISTICS, buildGameData, type CharType, type ParamSpec, type VirtueFlawDef } from '../data';
import { DEFAULT_HOUSE_RULES, type Character } from './types';
import { addQualities, addVirtue, newCharacter, removeVirtue, setHouse } from './character/factory';
import { deriveCharacter, type DerivedCharacter } from './character/derive';
import { validateCharacter } from './character/validate';
import { fixesFor, resolveAll } from './character/fixes';
import { MAGIC_QUALITIES, QUALITY_RULES } from './character/magicCharacter';
import { POWER_KIND_ORDER } from './character/powers';
import { deriveCovenant, newCovenant } from './covenant';
import { deriveLab, newLab } from './lab';
import { castingScore, labTotal, magicResistance } from './magic';
import { FORMS, TECHNIQUES } from '../data';

const data = buildGameData();
const rules = DEFAULT_HOUSE_RULES;
const BAD = /\bundefined\b|\bNaN\b|\[object Object\]|Infinity/;

function paramFor(spec?: ParamSpec): string | undefined {
  if (!spec) return undefined;
  const first = spec.options?.[0] ?? spec.groups?.[0]?.options[0];
  switch (spec.kind) {
    case 'ability': return first ?? 'brawl';
    case 'art': return first ?? 'Cr';
    case 'technique': return first ?? 'Cr';
    case 'form': return first ?? 'An';
    case 'characteristic': return first ?? 'Str';
    case 'realm': return first ?? 'Magic';
    case 'abilityGroup': return first ?? 'Martial';
    default: return first ?? 'Test';
  }
}

function base(type: CharType): Character {
  const c = newCharacter(type, 's1');
  c.name = 'Fuzz';
  if (type === 'magus') setHouse(c, data, 'bonisagus', 0);
  return c;
}

/** Every number the sheet shows is finite, and no message reads "undefined" or "NaN". */
function problems(d: DerivedCharacter, where: string): string[] {
  const out: string[] = [];
  const num = (label: string, v: unknown) => {
    if (typeof v === 'number' && !Number.isFinite(v)) out.push(`${where}: ${label} = ${v}`);
  };
  for (const c of CHARACTERISTICS) num(`characteristic ${c}`, d.characteristics[c].value);
  for (const a of d.abilities) (num(`ability ${a.name} score`, a.score), num(`ability ${a.name} total`, a.total));
  for (const a of ARTS) (num(`art ${a}`, d.arts[a].score), num(`art ${a} value`, d.arts[a].value));
  for (const b of d.budgets) (num(`budget ${b.label} total`, b.total), num(`budget ${b.label} spent`, b.spent));
  num('size', d.size);
  num('soak', d.soak);
  num('confidence', d.confidence.score);
  num('confidence points', d.confidence.points);
  num('warping score', d.warpingScore);
  if (d.might) num('might', d.might.score);
  for (const [k, n] of Object.entries(d.powerBudgets)) num(`powers ${k}`, n);
  for (const b of d.budgets) if (BAD.test(b.label) || BAD.test(b.allows)) out.push(`${where}: budget label "${b.label}" / "${b.allows}"`);
  const issues = validateCharacter(d, data, rules);
  for (const i of issues) {
    if (BAD.test(i.message)) out.push(`${where}: issue ${i.id}: ${i.message}`);
    for (const f of fixesFor(i, d, data, rules)) if (BAD.test(f.label)) out.push(`${where}: fix for ${i.id}: ${f.label}`);
  }
  return out;
}

const sizesOf = (v: VirtueFlawDef) => (v.sizes.length ? v.sizes : (['Minor'] as const));
const typesFor = (v: VirtueFlawDef): CharType[] => (v.forTypes?.length ? (v.forTypes as CharType[]) : ['grog', 'companion', 'mythic', 'magus']);

describe('every Virtue and Flaw on every character type', () => {
  it('derives, validates and offers fixes without errors or blank values', () => {
    const found: string[] = [];
    let combos = 0;
    for (const v of data.virtuesFlaws) {
      for (const type of typesFor(v)) {
        for (const size of sizesOf(v)) {
          combos++;
          const c = base(type);
          try {
            addVirtue(c, data, v.id, size, paramFor(v.param));
            found.push(...problems(deriveCharacter(c, data, rules), `${v.id} (${size}) on a ${type}`));
          } catch (e) {
            found.push(`${v.id} (${size}) on a ${type}: threw ${(e as Error).message}`);
          }
        }
      }
    }
    expect(found).toEqual([]);
    expect(combos).toBeGreaterThan(3000);
  }, 300_000);

  it('leaves nothing behind when a Virtue or Flaw is removed again', () => {
    const left: string[] = [];
    for (const v of data.virtuesFlaws) {
      const type = typesFor(v).includes('companion') ? 'companion' : typesFor(v)[0];
      const c = base(type);
      const before = JSON.stringify({ v: c.virtues.map((x) => x.defId).sort(), a: c.abilities.map((x) => `${x.abilityId}:${JSON.stringify(x.xp)}`).sort(), w: c.warpingPoints });
      const cv = addVirtue(c, data, v.id, sizesOf(v)[0], paramFor(v.param));
      removeVirtue(c, data, cv.uid);
      const after = JSON.stringify({ v: c.virtues.map((x) => x.defId).sort(), a: c.abilities.map((x) => `${x.abilityId}:${JSON.stringify(x.xp)}`).sort(), w: c.warpingPoints });
      if (before !== after) left.push(`${v.id}: ${before} -> ${after}`);
    }
    expect(left).toEqual([]);
  }, 120_000);
});

/** A small deterministic random number generator, so failures can be reproduced. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

describe('random bundles of Virtues and Flaws', () => {
  it('survive the rules check and "Resolve all"', () => {
    const r = rng(1220);
    const found: string[] = [];
    const types: CharType[] = ['grog', 'companion', 'mythic', 'magus'];
    for (let n = 0; n < 160; n++) {
      const type = types[n % 4];
      const c = base(type);
      for (const ch of CHARACTERISTICS) c.characteristics[ch] = Math.floor(r() * 7) - 3;
      const pool = data.virtuesFlaws.filter((v) => typesFor(v).includes(type));
      const picks: string[] = [];
      for (let k = 0; k < 6 + Math.floor(r() * 10); k++) {
        const v = pool[Math.floor(r() * pool.length)];
        picks.push(v.id);
        try {
          addVirtue(c, data, v.id, sizesOf(v)[Math.floor(r() * sizesOf(v).length)], paramFor(v.param));
        } catch (e) {
          found.push(`bundle ${n} adding ${v.id}: threw ${(e as Error).message}`);
        }
      }
      try {
        found.push(...problems(deriveCharacter(c, data, rules), `bundle ${n} (${type}: ${picks.join(', ')})`));
        resolveAll(c, data, rules);
        found.push(...problems(deriveCharacter(c, data, rules), `bundle ${n} after Resolve all`));
      } catch (e) {
        found.push(`bundle ${n} (${type}: ${picks.join(', ')}): threw ${(e as Error).message}`);
      }
    }
    expect(found).toEqual([]);
  }, 300_000);
});

describe('magic characters with random Qualities and powers', () => {
  it('derive and validate cleanly', () => {
    const r = rng(7);
    const found: string[] = [];
    for (let n = 0; n < 80; n++) {
      const c = newCharacter(n % 3 === 0 ? 'grog' : 'companion', 's1');
      const kinds = ['animal', 'human', 'spirit', 'thing'] as const;
      c.creature = {
        realm: 'Magic', kind: kinds[n % 4], size: Math.floor(r() * 9) - 4, might: 0, intelligence: n % 3 === 0 ? 'grog' : 'companion',
        magicCharacter: { season: 'summer', powerLevel: 'Medium', baseMight: 10, form: 'An', qualities: [] },
      };
      for (let k = 0; k < 10; k++) {
        const q = MAGIC_QUALITIES[Math.floor(r() * MAGIC_QUALITIES.length)];
        const p = QUALITY_RULES[q.id]?.param;
        addQualities(c, data, q.id, 1 + Math.floor(r() * 3), p === 'characteristic' ? 'Int' : p === 'form' ? 'Vi' : p === 'text' ? 'bite' : undefined);
      }
      c.powers = POWER_KIND_ORDER.slice(0, 5).map((kind, i) => ({ uid: `p${i}`, name: `P${i}`, kind, level: 5 + Math.floor(r() * 60), penetration: 0, mastery: { cost: Math.floor(r() * 3), init: Math.floor(r() * 3) } }));
      try {
        found.push(...problems(deriveCharacter(c, data, rules), `magic character ${n}`));
      } catch (e) {
        found.push(`magic character ${n}: threw ${(e as Error).message}`);
      }
    }
    expect(found).toEqual([]);
  });
});

describe('covenant and laboratory options', () => {
  it('take every Hook, Boon and laboratory Virtue or Flaw', () => {
    const found: string[] = [];
    for (const hb of data.hooksBoons) {
      const cov = newCovenant('s1', 1220);
      try {
        cov.hooksBoons.push({ uid: 'x', defId: hb.id, name: hb.name, kind: hb.kind, size: hb.size });
        const dc = deriveCovenant(cov, data, []);
        for (const i of dc.issues) if (BAD.test(i)) found.push(`${hb.id}: ${i}`);
        for (const [k, v] of Object.entries({ hookPoints: dc.hookPoints, boonPoints: dc.boonPoints, aura: dc.aura, bpSpent: dc.bpSpent, bpAvailable: dc.bpAvailable })) {
          if (!Number.isFinite(v)) found.push(`${hb.id}: ${k} ${v}`);
        }
      } catch (e) {
        found.push(`${hb.id}: threw ${(e as Error).message}`);
      }
    }
    for (const lv of data.labVirtuesFlaws) {
      const lab = newLab('Lab');
      try {
        lab.virtues.push({ uid: 'x', defId: lv.id });
        const dl = deriveLab(lab, data);
        for (const i of [...dl.issues, ...dl.specWarnings]) if (BAD.test(i)) found.push(`lab ${lv.id}: ${i}`);
        for (const [k, v] of Object.entries(dl.characteristics ?? {})) if (typeof v === 'number' && !Number.isFinite(v)) found.push(`lab ${lv.id}: ${k} ${v}`);
      } catch (e) {
        found.push(`lab ${lv.id}: threw ${(e as Error).message}`);
      }
    }
    expect(found).toEqual([]);
  });
});

describe('magic totals for magi with random Virtues', () => {
  it('give finite Casting Scores, Lab Totals and Magic Resistance for every Art pair', () => {
    const r = rng(42);
    const found: string[] = [];
    const pool = data.virtuesFlaws.filter((v) => typesFor(v).includes('magus'));
    for (let n = 0; n < 40; n++) {
      const c = base('magus');
      for (const a of ARTS) c.arts[a] = { apprenticeship: Math.floor(r() * 60) };
      for (let k = 0; k < 8; k++) {
        const v = pool[Math.floor(r() * pool.length)];
        try {
          addVirtue(c, data, v.id, sizesOf(v)[0], paramFor(v.param));
        } catch (e) {
          found.push(`magus ${n} adding ${v.id}: threw ${(e as Error).message}`);
        }
      }
      const d = deriveCharacter(c, data, rules);
      const aura = { strength: Math.floor(r() * 6), realm: (['Magic', 'Faerie', 'Divine', 'Infernal'] as const)[n % 4] };
      for (const technique of TECHNIQUES) {
        for (const form of FORMS) {
          for (const kind of ['formulaic', 'ritual', 'spontaneous'] as const) {
            const t = castingScore(d, { technique, form }, { kind, aura, circumstance: true });
            if (!Number.isFinite(t.total) || t.parts.some((p) => !Number.isFinite(p.value) || BAD.test(p.label))) found.push(`magus ${n} ${technique}${form} ${kind}: ${JSON.stringify(t)}`);
          }
          for (const activity of ['spells', 'items', 'familiar', 'longevity', 'texts', 'visExtraction', 'experimentation'] as const) {
            const t = labTotal(d, { technique, form }, { activity, aura });
            if (!Number.isFinite(t.total) || t.parts.some((p) => !Number.isFinite(p.value) || BAD.test(p.label))) found.push(`magus ${n} lab ${activity} ${technique}${form}: ${JSON.stringify(t)}`);
          }
        }
      }
      for (const form of FORMS) {
        const m = magicResistance(d, form, { aura });
        if (!Number.isFinite(m.total)) found.push(`magus ${n} Magic Resistance ${form}: ${m.total}`);
      }
    }
    expect(found).toEqual([]);
  }, 300_000);
});
