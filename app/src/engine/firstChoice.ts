// What a card offers, and the choice it opens on. A card offers only what can apply to the character
// (owner point 6), and opens on the best choice this character can make, never on a disabled button
// (design principles, the card checklist).

import type { DerivedCharacter } from './character/derive';

/**
 * Whether the character can learn the Hermetic Arts: only a magus, whose Gift the Order has opened to
 * them. A hedge wizard "is not able to learn any of the Hermetic Arts unless he has his Gift Opened for
 * the Hermetic Arts" (Hedge Magic, Revised Edition, line 433; again at line 846), and the same holds for
 * any Gifted character the Order has not opened (DE, Opening the Arts). The toolkit records a Gift
 * opened to the Arts only as a magus, so this is the test wherever an Art is offered to be learned:
 * a book, a teacher, Exposure, study from vis, experience from a story.
 */
export const learnsArts = (d: Pick<DerivedCharacter, 'isMagus'>): boolean => d.isMagus;

/** Options best first by `score`, keeping the list's own order among equals. */
export function bestFirst<T>(options: readonly T[], score: (o: T) => number): T[] {
  return options
    .map((o, i) => ({ o, i, s: score(o) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.o);
}

/**
 * The option a card opens on: the first, in the order given, for which `blocked` gives no reason it
 * cannot be done (a falsy value); the first of all when every one is blocked (the card then says why).
 */
export function firstDoable<T>(options: readonly T[], blocked: (o: T) => unknown): T | undefined {
  return options.find((o) => !blocked(o)) ?? options[0];
}

/** The subject a study opens on for one who cannot learn Arts: their own best Ability, by score and then experience. */
export function bestAbility<A extends { name: string; score: number; effectiveXp: number }>(abilities: readonly A[]): A | undefined {
  return abilities.slice().sort((a, b) => b.score - a.score || b.effectiveXp - a.effectiveXp || a.name.localeCompare(b.name))[0];
}
