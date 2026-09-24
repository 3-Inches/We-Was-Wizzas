// Application state (zustand) with IndexedDB persistence (idb-keyval).
// Local-first: everything lives in the browser; export/import files move it around.

import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { emptyCustomContent } from '../data';
import { DEFAULT_HOUSE_RULES, SCHEMA_VERSION, type Character, type Covenant, type Saga } from '../engine/types';
import { uid } from '../util/id';
import { migrateCharacter, migrateCovenant, migrateSaga } from './migrate';

const DB_KEY = 'arm5-toolkit-state-v1';

export interface PersistedState {
  sagas: Record<string, Saga>;
  characters: Record<string, Character>;
  covenants: Record<string, Covenant>;
  activeSagaId?: string;
  ui: { theme: 'light' | 'dark' | 'auto'; streamMode: boolean };
}

interface Store extends PersistedState {
  loaded: boolean;
  load: () => Promise<void>;
  createSaga: (name: string) => Saga;
  updateSaga: (id: string, fn: (s: Saga) => void) => void;
  deleteSaga: (id: string) => void;
  setActiveSaga: (id?: string) => void;
  putCharacter: (c: Character) => void;
  updateCharacter: (id: string, fn: (c: Character) => void) => void;
  deleteCharacter: (id: string) => void;
  putCovenant: (c: Covenant) => void;
  updateCovenant: (id: string, fn: (c: Covenant) => void) => void;
  deleteCovenant: (id: string) => void;
  setTheme: (t: 'light' | 'dark' | 'auto') => void;
  setStreamMode: (b: boolean) => void;
  importBundle: (b: ExportBundle, opts?: { intoSagaId?: string }) => { sagaId?: string; characters: number; covenants: number };
}

export interface ExportBundle {
  format: 'arm5-toolkit';
  kind: 'saga' | 'character' | 'covenant';
  version: number;
  exportedAt: string;
  saga?: Saga;
  characters?: Character[];
  covenants?: Covenant[];
}

export function newSaga(name: string): Saga {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name,
    description: '',
    currentYear: 1220,
    currentSeason: 'Spring',
    tribunal: 'Stonehenge',
    enabledBooks: [],
    houseRules: { ...DEFAULT_HOUSE_RULES, rulings: [] },
    mechanicsOverrides: {},
    custom: emptyCustomContent(),
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
    journal: [],
  };
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleSave(getState: () => Store) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const s = getState();
    const data: PersistedState = { sagas: s.sagas, characters: s.characters, covenants: s.covenants, activeSagaId: s.activeSagaId, ui: s.ui };
    idbSet(DB_KEY, data).catch(() => {
      try {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
      } catch {
        /* storage unavailable */
      }
    });
  }, 250);
}

const clone = <T,>(x: T): T => structuredClone(x);

export const useStore = create<Store>()((set, get) => ({
  sagas: {},
  characters: {},
  covenants: {},
  activeSagaId: undefined,
  ui: { theme: 'auto', streamMode: false },
  loaded: false,

  load: async () => {
    let data: PersistedState | undefined;
    try {
      data = (await idbGet(DB_KEY)) as PersistedState | undefined;
    } catch {
      /* fall through */
    }
    if (!data) {
      try {
        const raw = localStorage.getItem(DB_KEY);
        if (raw) data = JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    if (data) {
      const sagas = Object.fromEntries(Object.entries(data.sagas ?? {}).map(([k, v]) => [k, migrateSaga(v)]));
      const characters = Object.fromEntries(Object.entries(data.characters ?? {}).map(([k, v]) => [k, migrateCharacter(v)]));
      const covenants = Object.fromEntries(Object.entries(data.covenants ?? {}).map(([k, v]) => [k, migrateCovenant(v)]));
      set({ sagas, characters, covenants, activeSagaId: data.activeSagaId, ui: { theme: 'auto', streamMode: false, ...(data.ui ?? {}) }, loaded: true });
    } else set({ loaded: true });
  },

  createSaga: (name) => {
    const s = newSaga(name);
    set((st) => ({ sagas: { ...st.sagas, [s.id]: s }, activeSagaId: s.id }));
    scheduleSave(get);
    return s;
  },
  updateSaga: (id, fn) => {
    const cur = get().sagas[id];
    if (!cur) return;
    const next = clone(cur);
    fn(next);
    next.updatedAt = new Date().toISOString();
    set((st) => ({ sagas: { ...st.sagas, [id]: next } }));
    scheduleSave(get);
  },
  deleteSaga: (id) => {
    set((st) => {
      const sagas = { ...st.sagas };
      delete sagas[id];
      const characters = Object.fromEntries(Object.entries(st.characters).filter(([, c]) => c.sagaId !== id));
      const covenants = Object.fromEntries(Object.entries(st.covenants).filter(([, c]) => c.sagaId !== id));
      return { sagas, characters, covenants, activeSagaId: st.activeSagaId === id ? undefined : st.activeSagaId };
    });
    scheduleSave(get);
  },
  setActiveSaga: (id) => {
    set({ activeSagaId: id });
    scheduleSave(get);
  },
  putCharacter: (c) => {
    set((st) => ({ characters: { ...st.characters, [c.id]: c } }));
    scheduleSave(get);
  },
  updateCharacter: (id, fn) => {
    const cur = get().characters[id];
    if (!cur) return;
    const next = clone(cur);
    fn(next);
    next.updatedAt = new Date().toISOString();
    set((st) => ({ characters: { ...st.characters, [id]: next } }));
    scheduleSave(get);
  },
  deleteCharacter: (id) => {
    set((st) => {
      const characters = { ...st.characters };
      delete characters[id];
      const covenants = Object.fromEntries(
        Object.entries(st.covenants).map(([k, c]) => [k, c.memberIds.includes(id) ? { ...c, memberIds: c.memberIds.filter((m) => m !== id) } : c]),
      );
      return { characters, covenants };
    });
    scheduleSave(get);
  },
  putCovenant: (c) => {
    set((st) => ({ covenants: { ...st.covenants, [c.id]: c } }));
    scheduleSave(get);
  },
  updateCovenant: (id, fn) => {
    const cur = get().covenants[id];
    if (!cur) return;
    const next = clone(cur);
    fn(next);
    next.updatedAt = new Date().toISOString();
    set((st) => ({ covenants: { ...st.covenants, [id]: next } }));
    scheduleSave(get);
  },
  deleteCovenant: (id) => {
    set((st) => {
      const covenants = { ...st.covenants };
      delete covenants[id];
      const characters = Object.fromEntries(Object.entries(st.characters).map(([k, c]) => [k, c.covenantId === id ? { ...c, covenantId: undefined } : c]));
      return { covenants, characters };
    });
    scheduleSave(get);
  },
  setTheme: (t) => {
    set((st) => ({ ui: { ...st.ui, theme: t } }));
    scheduleSave(get);
  },
  setStreamMode: (b) => {
    set((st) => ({ ui: { ...st.ui, streamMode: b } }));
    scheduleSave(get);
  },
  importBundle: (b, opts = {}) => {
    const st = get();
    let sagaId = opts.intoSagaId;
    const sagas = { ...st.sagas };
    const characters = { ...st.characters };
    const covenants = { ...st.covenants };
    const idMap = new Map<string, string>();
    if (b.saga && !sagaId) {
      const s = migrateSaga(clone(b.saga));
      if (sagas[s.id]) s.id = uid();
      sagas[s.id] = s;
      sagaId = s.id;
    }
    if (!sagaId) sagaId = st.activeSagaId;
    if (!sagaId) {
      const s = newSaga('Imported Saga');
      sagas[s.id] = s;
      sagaId = s.id;
    }
    for (const raw of b.characters ?? []) {
      const c = migrateCharacter(clone(raw));
      const old = c.id;
      if (characters[c.id] && characters[c.id].sagaId !== sagaId) c.id = uid();
      idMap.set(old, c.id);
      c.sagaId = sagaId;
      characters[c.id] = c;
    }
    for (const raw of b.covenants ?? []) {
      const c = migrateCovenant(clone(raw));
      if (covenants[c.id] && covenants[c.id].sagaId !== sagaId) c.id = uid();
      c.sagaId = sagaId;
      c.memberIds = c.memberIds.map((m) => idMap.get(m) ?? m);
      covenants[c.id] = c;
    }
    set({ sagas, characters, covenants, activeSagaId: sagaId });
    scheduleSave(get);
    return { sagaId, characters: b.characters?.length ?? 0, covenants: b.covenants?.length ?? 0 };
  },
}));

export function exportSaga(sagaId: string): ExportBundle {
  const st = useStore.getState();
  return {
    format: 'arm5-toolkit', kind: 'saga', version: SCHEMA_VERSION, exportedAt: new Date().toISOString(),
    saga: st.sagas[sagaId],
    characters: Object.values(st.characters).filter((c) => c.sagaId === sagaId),
    covenants: Object.values(st.covenants).filter((c) => c.sagaId === sagaId),
  };
}

export function exportCharacter(id: string): ExportBundle {
  const c = useStore.getState().characters[id];
  return { format: 'arm5-toolkit', kind: 'character', version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), characters: [c] };
}

export function exportCovenant(id: string): ExportBundle {
  const st = useStore.getState();
  const c = st.covenants[id];
  return {
    format: 'arm5-toolkit', kind: 'covenant', version: SCHEMA_VERSION, exportedAt: new Date().toISOString(),
    covenants: [c], characters: c.memberIds.map((m) => st.characters[m]).filter(Boolean),
  };
}
