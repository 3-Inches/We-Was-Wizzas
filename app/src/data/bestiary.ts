// The creatures of the reviewed books' stat blocks (tools/extract/extract_bestiary.py), for the
// storyguide's encounter roller. Loaded only when it is opened: the stat blocks are large.

import type { Rng } from '../engine/dice';

export type CreatureRealm = 'Magic' | 'Faerie' | 'Infernal' | 'Divine';

export interface Creature {
  id: string;
  name: string;
  book: string;
  /** the line of its heading in the book */
  line: number;
  realm: CreatureRealm;
  might: number;
  form: string | null;
  size: number | null;
  season: string | null;
  /** the stat block, as markdown */
  text: string;
}

let cache: Promise<Creature[]> | undefined;

export function loadBestiary(): Promise<Creature[]> {
  cache ??= import('./generated/bestiary.json').then((m) => m.default as Creature[]);
  return cache;
}

export interface CreatureFilter {
  realm?: CreatureRealm;
  minMight: number;
  maxMight: number;
  /** a book id */
  book?: string;
  /** the Form its Might is associated with */
  form?: string;
  /** words in the name or stat block */
  q?: string;
  /** only books the saga uses */
  books?: (book: string) => boolean;
}

export function matchCreatures(all: Creature[], f: CreatureFilter): Creature[] {
  const q = f.q?.trim().toLowerCase();
  return all.filter(
    (c) =>
      (!f.realm || c.realm === f.realm) &&
      c.might >= f.minMight &&
      c.might <= f.maxMight &&
      (!f.book || c.book === f.book) &&
      (!f.form || c.form === f.form) &&
      (!f.books || f.books(c.book)) &&
      (!q || c.name.toLowerCase().includes(q) || c.text.toLowerCase().includes(q)),
  );
}

/** One creature at random from those that match. */
export function rollCreature(matches: Creature[], rng: Rng): Creature | undefined {
  return matches.length ? matches[Math.floor(rng() * matches.length)] : undefined;
}
