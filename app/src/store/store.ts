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
  ui: UiPrefs;
}

/** Display preferences (not part of undo): theme, stream mode, hints, and the tutorial in progress. */
export interface UiPrefs {
  theme: 'light' | 'dark' | 'auto';
  streamMode: boolean;
  /** show short hints at the places new players get stuck */
  hints: boolean;
  /** hints dismissed with "Got it" */
  dismissedHints: string[];
  /** the tutorial under way: which, at what step, and what it has made or found so far */
  tour?: TourState;
}

export interface TourState {
  id: string;
  step: number;
  sagaId?: string;
  charId?: string;
  covId?: string;
  startedAt: string;
  minimized?: boolean;
  /** the tutorial this one was entered from, to go back to when it ends */
  returnTo?: { id: string; step: number; startedAt: string; charId?: string; covId?: string };
}

export const DEFAULT_UI: UiPrefs = { theme: 'auto', streamMode: false, hints: true, dismissedHints: [] };

type Slot = 'sagas' | 'characters' | 'covenants';
const SLOTS: Slot[] = ['sagas', 'characters', 'covenants'];
type Records = { sagas: Record<string, Saga | null>; characters: Record<string, Character | null>; covenants: Record<string, Covenant | null> };

/** One change that can be undone: the records it touched as they were before (null: it did not exist). */
export interface HistoryStep {
  at: number;
  label: string;
  before: Records;
  /** quick edits to the same record merge into one step */
  merge?: boolean;
}

interface Store extends PersistedState {
  loaded: boolean;
  /** changes that can be undone and redone (not persisted) */
  history: { past: HistoryStep[]; future: HistoryStep[] };
  /** undo the last change; returns what it was */
  undo: () => string | undefined;
  redo: () => string | undefined;
  /** a short message about something the app did on the user's behalf (not persisted) */
  notice?: { text: string; at: number; undo?: () => void };
  setNotice: (text?: string, undo?: () => void) => void;
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
  setHints: (b: boolean) => void;
  dismissHint: (id: string) => void;
  resetHints: () => void;
  setTour: (t?: UiPrefs['tour']) => void;
  importBundle: (b: ExportBundle, opts?: { intoSagaId?: string }) => { sagaId?: string; characters: number; covenants: number };
  /** put a saga with its characters and covenants in place at once (the saga's clock moves them together) */
  putSagaState: (st: { saga: Saga; characters: Character[]; covenants: Covenant[] }) => void;
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
const HISTORY_LIMIT = 60;
const MERGE_MS = 1500;
const keyOf = (r: Records) => SLOTS.map((k) => Object.keys(r[k]).sort().join(',')).join('|');

export const useStore = create<Store>()((set, get) => {
  /** what these records are now (null: they do not exist) */
  const snapshot = (touched: Partial<Record<Slot, string[]>>): Records => {
    const st = get();
    const r: Records = { sagas: {}, characters: {}, covenants: {} };
    for (const k of SLOTS) for (const id of touched[k] ?? []) (r[k] as Record<string, unknown>)[id] = (st[k] as Record<string, unknown>)[id] ?? null;
    return r;
  };
  /** note a change about to be made, so that it can be undone; quick edits of one record merge */
  const remember = (touched: Partial<Record<Slot, string[]>>, label: string, merge = false) => {
    const before = snapshot(touched);
    const { past } = get().history;
    const last = past[past.length - 1];
    const now = Date.now();
    if (merge && last?.merge && now - last.at < MERGE_MS && keyOf(last.before) === keyOf(before)) {
      set({ history: { past: [...past.slice(0, -1), { ...last, at: now }], future: [] } });
      return;
    }
    set({ history: { past: [...past, { at: now, label, before, merge }].slice(-HISTORY_LIMIT), future: [] } });
  };
  /** put records back as a step had them; returns the step that reverses it */
  const restore = (step: HistoryStep): HistoryStep => {
    const touched = Object.fromEntries(SLOTS.map((k) => [k, Object.keys(step.before[k])])) as Record<Slot, string[]>;
    const now = snapshot(touched);
    set((st) => {
      const next: Partial<Store> = {};
      for (const k of SLOTS) {
        const recs = { ...(st[k] as Record<string, unknown>) };
        for (const [id, v] of Object.entries(step.before[k])) {
          if (v === null) delete recs[id];
          else recs[id] = v;
        }
        (next as Record<string, unknown>)[k] = recs;
      }
      return next;
    });
    scheduleSave(get);
    return { at: Date.now(), label: step.label, before: now };
  };
  const nameOf = (x?: { name?: string }) => x?.name || 'unnamed';
  return {
  sagas: {},
  characters: {},
  covenants: {},
  activeSagaId: undefined,
  ui: { ...DEFAULT_UI },
  loaded: false,
  history: { past: [], future: [] },
  undo: () => {
    const { past, future } = get().history;
    const step = past[past.length - 1];
    if (!step) return undefined;
    const back = restore(step);
    set({ history: { past: past.slice(0, -1), future: [...future, back] } });
    return step.label;
  },
  redo: () => {
    const { past, future } = get().history;
    const step = future[future.length - 1];
    if (!step) return undefined;
    const back = restore(step);
    set({ history: { past: [...past, back], future: future.slice(0, -1) } });
    return step.label;
  },

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
      set({ sagas, characters, covenants, activeSagaId: data.activeSagaId, ui: { ...DEFAULT_UI, ...((data.ui ?? {}) as object) } as UiPrefs, loaded: true });
    } else set({ loaded: true });
  },

  createSaga: (name) => {
    const s = newSaga(name);
    remember({ sagas: [s.id] }, `new saga ${s.name}`);
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
    remember({ sagas: [id] }, `change to ${nameOf(cur)}`, true);
    set((st) => ({ sagas: { ...st.sagas, [id]: next } }));
    scheduleSave(get);
  },
  deleteSaga: (id) => {
    const st0 = get();
    remember(
      { sagas: [id], characters: Object.values(st0.characters).filter((c) => c.sagaId === id).map((c) => c.id), covenants: Object.values(st0.covenants).filter((c) => c.sagaId === id).map((c) => c.id) },
      `deleting the saga ${nameOf(st0.sagas[id])}`,
    );
    set((st) => {
      const sagas = { ...st.sagas };
      delete sagas[id];
      const characters = Object.fromEntries(Object.entries(st.characters).filter(([, c]) => c.sagaId !== id));
      const covenants = Object.fromEntries(Object.entries(st.covenants).filter(([, c]) => c.sagaId !== id));
      return { sagas, characters, covenants, activeSagaId: st.activeSagaId === id ? undefined : st.activeSagaId };
    });
    scheduleSave(get);
  },
  setNotice: (text, undo) => set({ notice: text ? { text, at: Date.now(), undo } : undefined }),
  setActiveSaga: (id) => {
    set({ activeSagaId: id });
    scheduleSave(get);
  },
  putCharacter: (c) => {
    remember({ characters: [c.id] }, get().characters[c.id] ? `change to ${nameOf(c)}` : `new character ${nameOf(c)}`);
    set((st) => ({ characters: { ...st.characters, [c.id]: c } }));
    scheduleSave(get);
  },
  updateCharacter: (id, fn) => {
    const cur = get().characters[id];
    if (!cur) return;
    const next = clone(cur);
    fn(next);
    next.updatedAt = new Date().toISOString();
    remember({ characters: [id] }, `change to ${nameOf(cur)}`, true);
    set((st) => ({ characters: { ...st.characters, [id]: next } }));
    scheduleSave(get);
  },
  deleteCharacter: (id) => {
    const st0 = get();
    remember({ characters: [id], covenants: Object.values(st0.covenants).filter((c) => c.memberIds.includes(id)).map((c) => c.id) }, `deleting ${nameOf(st0.characters[id])}`);
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
    remember({ covenants: [c.id] }, get().covenants[c.id] ? `change to ${nameOf(c)}` : `new covenant ${nameOf(c)}`);
    set((st) => ({ covenants: { ...st.covenants, [c.id]: c } }));
    scheduleSave(get);
  },
  updateCovenant: (id, fn) => {
    const cur = get().covenants[id];
    if (!cur) return;
    const next = clone(cur);
    fn(next);
    next.updatedAt = new Date().toISOString();
    remember({ covenants: [id] }, `change to ${nameOf(cur)}`, true);
    set((st) => ({ covenants: { ...st.covenants, [id]: next } }));
    scheduleSave(get);
  },
  deleteCovenant: (id) => {
    const st0 = get();
    remember({ covenants: [id], characters: Object.values(st0.characters).filter((c) => c.covenantId === id).map((c) => c.id) }, `deleting ${nameOf(st0.covenants[id])}`);
    set((st) => {
      const covenants = { ...st.covenants };
      delete covenants[id];
      const characters = Object.fromEntries(Object.entries(st.characters).map(([k, c]) => [k, c.covenantId === id ? { ...c, covenantId: undefined } : c]));
      return { covenants, characters };
    });
    scheduleSave(get);
  },
  putSagaState: ({ saga, characters, covenants }) => {
    remember({ sagas: [saga.id], characters: characters.map((c) => c.id), covenants: covenants.map((c) => c.id) }, `change to ${nameOf(saga)}`);
    const now = new Date().toISOString();
    set((st) => ({
      sagas: { ...st.sagas, [saga.id]: { ...saga, updatedAt: now } },
      characters: { ...st.characters, ...Object.fromEntries(characters.map((c) => [c.id, c])) },
      covenants: { ...st.covenants, ...Object.fromEntries(covenants.map((c) => [c.id, c])) },
    }));
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
  setHints: (b) => {
    set((st) => ({ ui: { ...st.ui, hints: b } }));
    scheduleSave(get);
  },
  dismissHint: (id) => {
    set((st) => ({ ui: { ...st.ui, dismissedHints: [...new Set([...st.ui.dismissedHints, id])] } }));
    scheduleSave(get);
  },
  resetHints: () => {
    set((st) => ({ ui: { ...st.ui, dismissedHints: [], hints: true } }));
    scheduleSave(get);
  },
  setTour: (t) => {
    set((st) => ({ ui: { ...st.ui, tour: t } }));
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
    const touched = (a: Record<string, unknown>, b: Record<string, unknown>) => Object.keys(a).filter((k) => a[k] !== b[k]);
    remember({ sagas: touched(sagas, st.sagas), characters: touched(characters, st.characters), covenants: touched(covenants, st.covenants) }, 'the import');
    set({ sagas, characters, covenants, activeSagaId: sagaId });
    scheduleSave(get);
    return { sagaId, characters: b.characters?.length ?? 0, covenants: b.covenants?.length ?? 0 };
  },
  };
});

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
