// Forward-compatible loading: fill in any fields added since a file was saved.

import { ARTS, CHARACTERISTICS, emptyCustomContent } from '../data';
import { DEFAULT_HOUSE_RULES, SCHEMA_VERSION, type Character, type Covenant, type Saga } from '../engine/types';
import { newCovenant } from '../engine/covenant';

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
  return {
    ...c,
    arts,
    characteristics: chars,
    virtues: c.virtues ?? [],
    abilities: c.abilities ?? [],
    spells: c.spells ?? [],
    personality: c.personality ?? [],
    reputations: c.reputations ?? [],
    agingPoints: c.agingPoints ?? {},
    confidence: c.confidence ?? { score: 1, points: 3 },
    equipment: { weapons: [], armorCoverage: 'none', other: '', ...(c.equipment ?? {}) },
    items: c.items ?? [],
    wounds: { light: 0, medium: 0, heavy: 0, incapacitating: 0, ...(c.wounds ?? {}) },
    twilightScars: c.twilightScars ?? [],
    overrides: c.overrides ?? {},
    acknowledgedIssues: c.acknowledgedIssues ?? [],
    seasonLog: c.seasonLog ?? [],
    creation: { step: 0, apprenticeshipStartAge: 10, yearsPostGauntlet: 0, postGauntletLabSeasons: 0, finalized: false, extraPools: [], ...(c.creation ?? {}) },
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
  return {
    ...base,
    ...c,
    covenfolk: { ...base.covenfolk, ...(c.covenfolk ?? {}) },
    finances: { ...base.finances, ...(c.finances ?? {}) },
    loyalty: { ...base.loyalty, ...(c.loyalty ?? {}) },
    schemaVersion: SCHEMA_VERSION,
  };
}
