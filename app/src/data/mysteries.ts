// The House Mysteries (Houses of Hermes: Mystery Cults, extracted by tools/extract/extract_mysteries.py):
// the Mystery Virtues of Houses Bjornaer, Criamon, Merinita and Verditius, the Initiation Scripts the
// book gives for them, and the stations of the four Criamon Paths. The Virtues join the Virtue list
// as House-only Mystery Virtues.

import raw from './generated/houseMysteries.json';
import type { VFSize, VirtueFlawDef } from './types';

export interface MysteryVirtue {
  id: string;
  name: string;
  house: string;
  size: VFSize;
  /** the kind of Mystery: House, Arcadian, Folk, Illusion, Nature, Outer */
  kind: string;
  summary: string;
  source: { book: string; line: number };
}

export interface MysteryScript {
  virtue: string;
  title: string;
  house: string;
  /** the cult or lineage that uses it */
  cult: string;
  ease: number | null;
  easeText: string;
  bonus: number;
  bonusText: string;
  details: string;
  source: { book: string; line: number };
}

export interface CriamonStation {
  id: string;
  name: string;
  path: string;
  order: number;
  avenue: string;
  target: number | null;
  targetText: string;
  bonus: number;
  bonusText: string;
  source: { book: string; line: number };
}

const data = raw as unknown as { virtues: MysteryVirtue[]; scripts: MysteryScript[]; stations: CriamonStation[] };
const tidy = (s: string) => s.replace(/\$\\times\$/g, '×');

export const HOUSE_MYSTERIES: MysteryVirtue[] = data.virtues;
export const MYSTERY_SCRIPTS: MysteryScript[] = data.scripts.map((s) => ({ ...s, details: tidy(s.details), bonusText: tidy(s.bonusText) }));
export const CRIAMON_STATIONS: CriamonStation[] = data.stations.map((s) => ({ ...s, bonusText: tidy(s.bonusText), targetText: tidy(s.targetText) }));
export const CRIAMON_PATHS = [...new Set(CRIAMON_STATIONS.map((s) => s.path))];

/** What a station gives, from its Script's line: "Target level 18, as Major Virtue 21 (may read the memories of objects)…" */
export function stationPower(s: CriamonStation): string {
  return s.targetText.match(/\(([^)]+)\)/)?.[1] ?? '';
}

/** The House Mysteries and the Criamon stations as Virtues, for the Virtue list (each only once). */
export function mysteryVirtueDefs(existing: Set<string>): VirtueFlawDef[] {
  const out: VirtueFlawDef[] = [];
  for (const m of HOUSE_MYSTERIES) {
    if (existing.has(m.id)) continue;
    out.push({
      id: m.id, name: m.name, kind: 'virtue', sizes: [m.size], categories: ['Hermetic', 'Mystery'], tainted: false,
      notes: `${m.kind === 'House' ? 'House' : m.kind} Mystery of House ${m.house[0].toUpperCase()}${m.house.slice(1)}`,
      text: m.summary, source: m.source, houses: [m.house], houseSeverity: 'warning',
    });
  }
  for (const s of CRIAMON_STATIONS) {
    if (existing.has(s.id)) continue;
    out.push({
      id: s.id, name: `${s.name} (${s.path})`, kind: 'virtue', sizes: ['Major'], categories: ['Hermetic', 'Mystery'], tainted: false,
      notes: `Criamon ${s.path}, station ${s.order}`,
      text: `${stationPower(s) ? `${stationPower(s)[0].toUpperCase()}${stationPower(s).slice(1)}. ` : ''}Initiated by ${s.avenue}.`, source: s.source, houses: ['criamon'], houseSeverity: 'warning',
    });
  }
  return out;
}

const norm = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim().replace(/s$/, '');
const INNER_HEARTBEAST = ['the-mystery-of-the-epitome', 'the-mystery-of-the-chimera', 'the-mystery-of-the-anima'];

/** The book's Scripts for a Virtue (by its id and name). */
export function scriptsFor(virtueId: string, name: string): MysteryScript[] {
  const n = norm(name);
  return MYSTERY_SCRIPTS.filter((s) => {
    if (s.virtue.startsWith('Inner Heartbeast (')) return INNER_HEARTBEAST.includes(virtueId);
    const v = norm(s.virtue);
    return !!v && !!n && (v === n || v.startsWith(n) || n.startsWith(v));
  });
}
