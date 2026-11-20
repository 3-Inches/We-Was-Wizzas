// The guided build and Quick build for a magus Initiated into a Mystery during apprenticeship, asked
// for by `f-mystery`. A magus of Bjornaer, Criamon, Merinita or Verditius takes one of the House's
// Mystery Virtues "as normal Virtues, part of the standard ten" (Houses of Hermes: Mystery Cults,
// line 249). A magus of another House takes the Cabal Legacy Flaw, which "allows a magus character to
// be designed with cult Virtues as normal Virtues" (The Mysteries, line 748), and one cult Virtue.

import type { VFSize } from '../../data';
import { HOUSE_BY_ID } from '../../data/houses';
import { CRIAMON_STATIONS } from '../../data/mysteries';
import type { Character, GuidedState } from '../types';
import { MYSTERY_HOUSES } from '../initiation';
import { evaluate, type GuidedContext, type Scored } from './score';
import { SIZE_POINTS, answer, choose, type BuildInput } from './buildShared';

/**
 * The cult Mysteries a Cabal Legacy magus may begin with: those of The Mysteries the Game Table
 * rolls, so the character has something to play, each with the cult the book has teach it (Chapter 14,
 * Mystery Cults; the Magoi of the Star, line 2163; the Volshebnii Mechtateli, line 4685).
 */
export const CULT_MYSTERIES: { id: string; cult: string }[] = [
  { id: 'hermetic-dream-interpreter', cult: 'Volshebnii Mechtateli' },
  { id: 'celestial-magic', cult: 'Magoi of the Star' },
  { id: 'hermetic-numerology', cult: 'Mystic Fraternity of Samos' },
  { id: 'hermetic-theurgy', cult: 'Philosophers of Rome' },
  { id: 'hermetic-synthemata', cult: 'Philosophers of Rome' },
  { id: 'hermetic-empowerment', cult: 'Disciples of the Worm' },
];

/** The (Mystery Cult) Lore a character's Mysteries teach: their House's, or their cult's. */
export function mysteryLoreOf(c: Pick<Character, 'house' | 'virtues'>): string | undefined {
  if (c.house && MYSTERY_HOUSES.includes(c.house) && c.virtues.some((v) => v.why?.startsWith('from: a Mystery'))) return `House ${HOUSE_BY_ID[c.house]?.name ?? c.house}`;
  return CULT_MYSTERIES.find((m) => c.virtues.some((v) => v.defId === m.id))?.cult;
}

type Add = (s: Scored, size: VFSize) => { why?: string };
type Clean = (def: Scored['def'], size: VFSize) => boolean;

/** One Mystery for a magus who asked to be Initiated, of their House if it has Mysteries, else of a cult. */
export function addMystery(c: Character, st: GuidedState, inp: BuildInput, get: () => GuidedContext, log: string[], add: Add, clean: Clean, cap: number) {
  if (c.type !== 'magus' || !c.house || answer('f-mystery', st, get()) < 7) return;
  if (c.virtues.some((v) => inp.data.vfById.get(v.defId)?.categories.includes('Mystery'))) return;
  const room = () => cap - get().d.tally.virtuePoints;
  const ev = evaluate(st, get());
  const scored = (id: string) => ev.scored.find((s) => s.def.id === id && !st.declined.includes(id));
  const size = (s: Scored): VFSize => (s.def.sizes.includes('Minor') ? 'Minor' : s.def.sizes[0]);
  const house = HOUSE_BY_ID[c.house]?.name ?? c.house;
  // a cult's Mystery the player names is taken through Cabal Legacy, even by a magus of a Mystery House
  const named = CULT_MYSTERIES.some((m) => (st.answers[`vf:${m.id}`] ?? 0) >= 7);
  if (MYSTERY_HOUSES.includes(c.house) && !named) {
    // Criamon's Mysteries are the stations of its paths, begun at the first (HoH: Mystery Cults, the Paths)
    const ids = c.house === 'criamon' ? CRIAMON_STATIONS.filter((x) => x.order === 1).map((x) => x.id) : inp.data.virtuesFlaws.filter((d) => d.categories.includes('Mystery') && d.houses?.includes(c.house!)).map((d) => d.id);
    // a Minor Mystery first, as a new magus's is "unusual (but not unknown)" (line 249); a Major one where the House has no Minor
    const options = ids.map(scored).filter((s): s is Scored => !!s && SIZE_POINTS[size(s)] <= room() && clean(s.def, size(s))).sort((a, b) => SIZE_POINTS[size(a)] - SIZE_POINTS[size(b)] || b.fit - a.fit);
    const least = options.length ? SIZE_POINTS[size(options[0])] : 0;
    const pick = choose(inp, c, options.filter((s) => SIZE_POINTS[size(s)] === least), size);
    if (!pick) return;
    const cv = add(pick, size(pick));
    cv.why = `from: a Mystery of House ${house}, Initiated in apprenticeship (Houses of Hermes: Mystery Cults)`;
    log.push(`House Mystery: ${pick.def.name}, ${size(pick)} — Initiated in apprenticeship.`);
    return;
  }
  // a magus of another House: Cabal Legacy, then the cult's Mystery
  const legacy = scored('cabal-legacy-flaw');
  const cult = CULT_MYSTERIES.filter((m) => !named || (st.answers[`vf:${m.id}`] ?? 0) >= 7)
    .map((m) => scored(m.id))
    .filter((s): s is Scored => !!s && SIZE_POINTS[size(s)] <= room());
  if (!legacy || !cult.length || !clean(legacy.def, 'Minor')) return;
  const flaw = add(legacy, 'Minor');
  flaw.why = 'from: your wish to begin play as a Mystery Cult’s Initiate (The Mysteries, Cabal Legacy)';
  const pick = choose(inp, c, cult.filter((s) => clean(s.def, size(s))).sort((a, b) => b.fit - a.fit), size);
  if (!pick) {
    c.virtues = c.virtues.filter((v) => v.defId !== 'cabal-legacy-flaw');
    return;
  }
  const cv = add(pick, size(pick));
  cv.why = `from: a Mystery of the ${CULT_MYSTERIES.find((m) => m.id === pick.def.id)?.cult}, Initiated in apprenticeship (The Mysteries)`;
  log.push(`Flaw: Cabal Legacy, Minor — and the cult’s Mystery: ${pick.def.name}, ${size(pick)}.`);
}
