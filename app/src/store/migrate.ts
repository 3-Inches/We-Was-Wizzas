// Forward-compatible loading: fill in any fields added since a file was saved.

import { ARTS, CHARACTERISTICS, emptyCustomContent } from '../data';
import { DEFAULT_HOUSE_RULES, SCHEMA_VERSION, type Character, type Covenant, type Saga } from '../engine/types';
import { newCovenant } from '../engine/covenant';
import { INCOME_LEVEL_POUNDS, findCraft } from '../engine/covenantRules';

export function migrateSaga(s: Saga): Saga {
  return {
    ...s,
    enabledBooks: s.enabledBooks ?? [],
    houseRules: { ...DEFAULT_HOUSE_RULES, ...(s.houseRules ?? {}) },
    mechanicsOverrides: s.mechanicsOverrides ?? {},
    custom: { ...emptyCustomContent(), ...(s.custom ?? {}) },
    journal: s.journal ?? [],
    schemaVersion: SCHEMA_VERSION,
  };
}

export function migrateCharacter(c: Character): Character {
  const arts = { ...(c.arts ?? {}) } as Character['arts'];
  for (const a of ARTS) arts[a] = arts[a] ?? {};
  const chars = { ...(c.characteristics ?? {}) } as Character['characteristics'];
  for (const k of CHARACTERISTICS) chars[k] = chars[k] ?? 0;
  const g = (c.gender ?? '').trim().toLowerCase();
  const gender = /^(f|woman|girl|lady|maga\b)/.test(g) ? 'Female' : /^(m|man|boy)/.test(g) ? 'Male' : c.gender ?? '';
  return {
    ...c,
    gender,
    arts,
    characteristics: chars,
    virtues: c.virtues ?? [],
    abilities: c.abilities ?? [],
    spells: c.spells ?? [],
    personality: c.personality ?? [],
    reputations: c.reputations ?? [],
    agingPoints: c.agingPoints ?? {},
    confidence: c.confidence ?? { score: 1, points: 3 },
    equipment: withDefaults<Character['equipment']>({ weapons: [], armorCoverage: 'none', other: '' }, c.equipment),
    items: c.items ?? [],
    wounds: withDefaults<Character['wounds']>({ light: 0, medium: 0, heavy: 0, incapacitating: 0 }, c.wounds),
    twilightScars: c.twilightScars ?? [],
    overrides: c.overrides ?? {},
    acknowledgedIssues: c.acknowledgedIssues ?? [],
    seasonLog: c.seasonLog ?? [],
    creation: withDefaults<Character['creation']>({ step: 0, apprenticeshipStartAge: 10, yearsPostGauntlet: 0, postGauntletLabSeasons: 0, finalized: false, extraPools: [] }, c.creation),
    fatigueLost: c.fatigueLost ?? 0,
    longTermFatigueLost: c.longTermFatigueLost ?? 0,
    warpingPoints: c.warpingPoints ?? 0,
    decrepitudePoints: c.decrepitudePoints ?? 0,
    notes: c.notes ?? '',
    schemaVersion: SCHEMA_VERSION,
  };
}

export function migrateCovenant(c: Covenant): Covenant {
  const base = newCovenant(c.sagaId, c.foundedYear ?? 1220);
  const out: Covenant = {
    ...base,
    ...c,
    covenfolk: { ...base.covenfolk, ...(c.covenfolk ?? {}) },
    finances: { ...base.finances, ...(c.finances ?? {}) },
    loyalty: { ...base.loyalty, ...(c.loyalty ?? {}) },
    schemaVersion: SCHEMA_VERSION,
  };
  // craft savings used to be a separate list: they are craftsmen now (no Build Points, as before)
  const old = out.finances.craftSavings ?? [];
  if (old.length) {
    out.specialists = [
      ...out.specialists,
      ...old.map((cs) => {
        const craft = findCraft(cs.craft);
        return { uid: cs.uid, name: cs.craft, role: 'craftsman' as const, ability: `Craft (${craft?.name ?? cs.craft})`, craft: craft?.id ?? cs.craft, score: cs.score, rare: cs.rare, count: 1, free: true };
      }),
    ];
    out.covenfolk = { ...out.covenfolk, craftsmen: Math.max(0, out.covenfolk.craftsmen - old.length) };
    out.finances = { ...out.finances, craftSavings: [] };
  }
  // income entered by hand keeps its figure; otherwise the book value for its level is used
  out.income = out.income.map((i) => (i.customPounds === undefined ? { ...i, customPounds: i.pounds !== INCOME_LEVEL_POUNDS[i.level] } : i));
  return out;
}

function withDefaults<T extends object>(defaults: T, v: Partial<T> | undefined): T {
  return { ...defaults, ...(v ?? {}) };
}
