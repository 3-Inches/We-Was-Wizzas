// Stocking a covenant's library with Build Points (DE Books; Covenants ch.2 and ch.7). Every book is
// weighed by what it gives the covenant's magi: the experience each could take from it in their first
// three seasons of reading, above what they know and above the books already on the shelf, counting
// for more in the Arts a magus leans on (and a little more for Techniques, which serve every Form).
// The best value for the Build Points is bought first, so the library grows broad before it grows
// deep: primers in the spirit of the Roots of the Arts (Level 7 to 9, Quality 21 or 22) for the
// Arts the magi are weak in, deeper summae where they are strong enough to read them, tractatus,
// Ability summae for what no covenant teacher covers, and Laboratory Texts spread across Techniques
// and Forms. Generic books from a base package are given subjects first. Seeded, like the other
// generators.

import { ARTS, ART_NAMES, TECHNIQUES, type Art, type GameData } from '../../data';
import { deriveCharacter, type DerivedCharacter } from '../character/derive';
import type { Character, Covenant, HouseRules, LibraryBook, Specialist } from '../types';
import { specAbilities } from '../covenantRules';
import { uid } from '../../util/id';
import { abilityXpForScore, artXpForScore } from '../xp';
import { freshName } from './names';
import type { Rng } from '../dice';
import { between, chance, pick, sample } from './random';

export interface LibraryOptions {
  arts: boolean;
  abilities: boolean;
  labTexts: boolean;
  mundane: boolean;
  /** the share of the covenant's own Build Points left that the library may take, when it has no library budget (default a half) */
  share?: number;
}

const ART_TITLES = ['Principles of', 'On the Nature of', 'Meditations upon', 'The Lesser Key of', 'Commentaries on', 'The Mysteries of'];
const ROOT_TITLES = ['The Roots of', 'A Primer of', 'First Lessons in', 'The Foundations of'];
const TRACTATUS_TITLES = ['Notes on', 'Observations of', 'A Letter concerning', 'Questions on', 'A Discourse upon', 'Reflections on'];
const ABILITY_TITLES = ['A Treatise on', 'The Craft of', 'Instructions in'];
/** Abilities magi study from books, and how much each matters to them. */
const ABILITY_SUMMAE: { id: string; param?: string; label: string; weight: number }[] = [
  { id: 'magic-theory', label: 'Magic Theory', weight: 2 },
  { id: 'parma-magica', label: 'Parma Magica', weight: 1.5 },
  { id: 'concentration', label: 'Concentration', weight: 1 },
  { id: 'penetration', label: 'Penetration', weight: 1 },
  { id: 'finesse', label: 'Finesse', weight: 1 },
  { id: 'dead-language', param: 'Latin', label: 'Latin', weight: 0.8 },
  { id: 'artes-liberales', label: 'Artes Liberales', weight: 0.8 },
  { id: 'philosophiae', label: 'Philosophiae', weight: 0.8 },
  { id: 'code-of-hermes', label: 'Code of Hermes', weight: 0.6 },
  { id: 'magic-lore', label: 'Magic Lore', weight: 0.6 },
];
const MUNDANE = [
  'Isidore of Seville, Etymologies', 'Boethius, The Consolation of Philosophy', 'Euclid, Elements', 'Galen, On the Temperaments', 'Vegetius, On Military Matters',
  'Pliny, Natural History', 'A psalter, finely illuminated', 'The Rule of Saint Benedict', 'Aristotle, Physics, in a Latin translation', 'A herbal with painted plates',
];
/** Seasons of reading a book is weighed over. */
const SEASONS = 3;
const GENERIC = /\(choose subject\)$/;

/** What the library reckons with of a reader: their Arts, Abilities and Lab Total in a Technique and Form. */
interface Reader {
  art: (a: Art) => number;
  ability: (x: { id: string; param?: string }) => number;
  labTotal: (t: Art, f: Art) => number;
}

function readerOf(d: DerivedCharacter): Reader {
  const ability = (x: { id: string; param?: string }) =>
    Math.max(0, ...d.abilities.filter((a) => a.abilityId === x.id && (!x.param || a.name.toLowerCase().includes(x.param.toLowerCase()))).map((a) => a.total));
  return { art: (a) => d.arts[a].score, ability, labTotal: (t, f) => d.arts[t].score + d.arts[f].score + d.characteristics.Int.value + ability({ id: 'magic-theory' }) };
}

/** A magus just through the Gauntlet (DE: Arts about 5, Magic Theory 3, Latin 4, Parma 1, Artes Liberales 1). */
const NEW_MAGUS: Reader = {
  art: () => 5,
  ability: (x) => ({ 'magic-theory': 3, 'dead-language': 4, 'parma-magica': 1, 'artes-liberales': 1, concentration: 1 } as Record<string, number>)[x.id] ?? 0,
  labTotal: () => 5 + 5 + 2 + 3,
};

export interface LibraryResult {
  books: LibraryBook[];
  /** generic books from a base package given a subject: uid → the subject and a title */
  assign: { uid: string; subject: string; title: string }[];
  log: string[];
}

/**
 * Books for the covenant's library, costing no more than `bp` Build Points, chosen for what they give
 * the magi per Build Point (see the head of this file). `teachers` are the covenant's teachers: an
 * Ability they teach needs a book only above what they know.
 */
export function stockLibrary(cov: Covenant, members: Character[], g: { data: GameData; rules: HouseRules }, bp: number, o: LibraryOptions, rng: Rng, teachers: Specialist[] = []): LibraryResult {
  const books: LibraryBook[] = [];
  const assign: LibraryResult['assign'] = [];
  const log: string[] = [];
  let left = bp;
  // who reads the books: the covenant's magi, or, before it has any, a magus newly through the Gauntlet
  const readers: Reader[] = members.filter((m) => m.type === 'magus').map((m) => readerOf(deriveCharacter(m, g.data, g.rules)));
  const nobody = !readers.length;
  if (nobody) readers.push(NEW_MAGUS);
  const authors = new Set<string>([...cov.library.map((b) => b.author ?? ''), ...members.map((m) => m.name)]);
  const author = () => {
    const n = freshName(rng, 'latin', chance(rng, 0.4), authors);
    authors.add(n);
    return `${n} of ${pick(rng, ['Bonisagus', 'Jerbiton', 'Bjornaer', 'Criamon', 'Flambeau', 'Guernicus', 'Mercere', 'Merinita', 'Tremere', 'Tytalus', 'Verditius', 'Ex Miscellanea'])}`;
  };
  // a title nobody on the shelf has yet: another prefix, else a second volume
  const titles = new Set(cov.library.map((b) => b.title));
  const titled = (prefixes: string[], subject: string) => {
    const free = prefixes.map((p) => `${p} ${subject}`).filter((t) => !titles.has(t));
    const base = free.length ? pick(rng, free) : `${pick(rng, prefixes)} ${subject}`;
    let t = base;
    for (let n = 2; titles.has(t); n++) t = `${base}, volume ${n}`;
    titles.add(t);
    return t;
  };
  // the shelf as it stands: generic books count once they have a subject
  const shelf = () => [...cov.library.filter((b) => !GENERIC.test(b.title) || assign.some((a) => a.uid === b.uid)), ...books].map((b) => {
    const a = assign.find((x) => x.uid === b.uid);
    return a ? { ...b, subject: a.subject } : b;
  });
  const artLevel = (a: Art) => Math.max(0, ...shelf().filter((b) => b.kind === 'summa' && b.subjectType === 'art' && b.subject === a).map((b) => b.level));
  const tractatusOn = (a: Art) => shelf().filter((b) => b.kind === 'tractatus' && b.subjectType === 'art' && b.subject === a).length;
  const abilityKey = (x: { id: string; param?: string }) => `${x.id}|${x.param ?? ''}`;
  const abilityLevel = (k: string) => Math.max(0, ...shelf().filter((b) => b.kind === 'summa' && b.subjectType === 'ability' && b.subject === k.split('|')[0]).map((b) => b.level));

  // how much a magus leans on an Art: 1, up to 2 for their best; Techniques serve every Form
  const lean = (d: Reader, a: Art) => {
    const best = Math.max(1, ...ARTS.map((x) => d.art(x)));
    return (1 + d.art(a) / best) * ((TECHNIQUES as readonly string[]).includes(a) ? 1.25 : 1);
  };
  const taughtTo = (x: { id: string; param?: string }) =>
    Math.max(0, ...teachers.flatMap((t) => specAbilities(t).filter((a) => a.id === x.id && (!x.param || (a.param ?? '').toLowerCase() === x.param.toLowerCase())).map((a) => a.score)));

  /** What an Art summa gives the council: experience in three seasons' reading, above each magus's score and the shelf. */
  const artSummaValue = (a: Art, level: number, quality: number) =>
    readers.reduce((t, d) => {
      const from = Math.max(d.art(a), artLevel(a));
      return t + Math.min(Math.max(0, artXpForScore(level) - artXpForScore(from)), SEASONS * quality) * lean(d, a);
    }, 0);
  /** A tractatus gives each magus its Quality once, whatever their score; each more on the same Art is worth a little less to keep the shelf varied. */
  const tractatusValue = (a: Art, quality: number) => readers.reduce((t, d) => t + quality * lean(d, a), 0) * Math.pow(0.8, tractatusOn(a));
  const abilitySummaValue = (x: (typeof ABILITY_SUMMAE)[number], level: number, quality: number) =>
    readers.reduce((t, d) => {
      const from = Math.max(d.ability(x), abilityLevel(abilityKey(x)), taughtTo(x));
      return t + Math.min(Math.max(0, abilityXpForScore(level) - abilityXpForScore(from)), SEASONS * quality) * x.weight;
    }, 0);

  // a base package's books "to choose a subject for": the subject they give most to (Covenants ch.2)
  for (const b of [...cov.library].filter((x) => GENERIC.test(x.title)).sort((x, y) => y.level - x.level || y.quality - x.quality)) {
    if (b.kind === 'summa' && b.subjectType === 'art' && o.arts) {
      const best = [...ARTS].sort((x, y) => artSummaValue(y, b.level, b.quality) - artSummaValue(x, b.level, b.quality))[0];
      assign.push({ uid: b.uid, subject: best, title: titled(ART_TITLES, ART_NAMES[best]) });
    } else if (b.kind === 'tractatus' && b.subjectType === 'art' && o.arts) {
      const best = [...ARTS].sort((x, y) => tractatusValue(y, b.quality) - tractatusValue(x, b.quality))[0];
      assign.push({ uid: b.uid, subject: best, title: titled(TRACTATUS_TITLES, ART_NAMES[best]) });
    } else if (b.kind === 'summa' && b.subjectType === 'ability' && o.abilities) {
      const best = [...ABILITY_SUMMAE].sort((x, y) => abilitySummaValue(y, b.level, b.quality) - abilitySummaValue(x, b.level, b.quality))[0];
      assign.push({ uid: b.uid, subject: best.id, title: titled(ABILITY_TITLES, best.label) });
    }
  }
  if (assign.length) log.push(`Subjects chosen for the base package's books: ${assign.map((a) => a.title).join('; ')}.`);

  // candidates, best value for the Build Points first, until nothing worth buying fits
  type Candidate = { value: number; cost: number; make: () => LibraryBook; text: (b: LibraryBook) => string };
  const candidates = (): Candidate[] => {
    const out: Candidate[] = [];
    if (o.arts) {
      for (const a of ARTS) {
        // a primer like the Roots of the Arts, then deeper summae at the quality the level allows (Level + Quality 31 at most)
        // a second summa on an Art only where it goes well beyond the first (five levels or more)
        const levels = [9, 12, 15, 18, 20].filter((l) => (artLevel(a) ? l >= artLevel(a) + 5 : true));
        for (const level of levels) {
          const quality = Math.min(22, 31 - level);
          const value = artSummaValue(a, level, quality);
          if (value <= 0) continue;
          const root = level <= 9;
          out.push({
            value, cost: level + quality,
            make: () => ({ uid: uid(), title: titled(root ? ROOT_TITLES : ART_TITLES, ART_NAMES[a]), author: author(), kind: 'summa', subjectType: 'art', subject: a, level, quality, language: 'Latin', ...(root ? { notes: 'A primer like the Roots of the Arts (DE Books: Level 7 or more, Quality 21 or more).' } : {}) }),
            text: (b) => `${b.title}: summa on ${ART_NAMES[a]}, Level ${level}, Quality ${quality}${root ? ', a primer' : ''} (${level + quality} BP).`,
          });
        }
        const tv = tractatusValue(a, 11);
        if (tv > 0)
          out.push({
            value: tv, cost: 11,
            make: () => ({ uid: uid(), title: titled(TRACTATUS_TITLES, ART_NAMES[a]), author: author(), kind: 'tractatus', subjectType: 'art', subject: a, level: 0, quality: 11, language: 'Latin' }),
            text: (b) => `${b.title}: tractatus on ${ART_NAMES[a]}, Quality 11 (11 BP).`,
          });
      }
    }
    if (o.abilities) {
      for (const x of ABILITY_SUMMAE) {
        for (let level = 3; level <= 8; level++) {
          if (abilityLevel(abilityKey(x)) && level < abilityLevel(abilityKey(x)) + 2) continue;
          const quality = Math.min(22, 11 + 3 * (8 - level));
          const value = abilitySummaValue(x, level, quality);
          if (value <= 0) continue;
          out.push({
            value, cost: 3 * level + quality,
            make: () => ({ uid: uid(), title: titled(ABILITY_TITLES, x.label), author: author(), kind: 'summa', subjectType: 'ability', subject: x.id, level, quality, language: 'Latin' }),
            text: (b) => `${b.title}: summa on ${x.label}, Level ${level}, Quality ${quality} (${3 * level + quality} BP).`,
          });
        }
      }
    }
    return out;
  };
  // Laboratory Texts get a tenth of the Build Points, the rest goes to study
  const labShare = o.labTexts ? Math.min(left, Math.max(10, Math.floor(bp / 10))) : 0;
  let study = left - labShare;
  for (let guard = 0; guard < 200; guard++) {
    const best = candidates().filter((c) => c.cost <= study).sort((x, y) => y.value / y.cost - x.value / x.cost)[0];
    // not worth it below two points of experience for the council per Build Point
    if (!best || best.value / best.cost < 2) break;
    const b = best.make();
    books.push(b);
    study -= best.cost;
    left -= best.cost;
    log.push(best.text(b));
  }

  if (o.labTexts) {
    // one text for each of the Technique + Form pairs the magi are best at, up to what the best of them could learn from it in a season
    const known = new Set([...cov.library.map((b) => b.spell?.id), ...members.flatMap((m) => m.spells.map((s) => s.spellId))]);
    const labTotal = (t: Art, f: Art) => Math.max(...readers.map((d) => d.labTotal(t, f)));
    const forms = ARTS.filter((a) => !(TECHNIQUES as readonly string[]).includes(a));
    const pairs = TECHNIQUES.flatMap((t) => forms.map((f) => ({ t, f, lt: labTotal(t, f) }))).filter((p) => p.lt >= 10).sort((a, b) => b.lt - a.lt);
    const perArt = new Map<string, number>();
    let budget = labShare + Math.max(0, study);
    for (const p of pairs) {
      if (budget < 2) break;
      // spread: no Technique or Form more than twice
      if ((perArt.get(p.t) ?? 0) >= 2 || (perArt.get(p.f) ?? 0) >= 2) continue;
      const pool = g.data.spells.filter((s) => s.technique === p.t && s.form === p.f && s.level !== null && !s.general && s.level >= 10 && s.level <= Math.min(p.lt, 40) && !known.has(s.id) && g.data.isBookEnabled(s.source.book));
      const s = pool.sort((a, b) => b.level! - a.level!).slice(0, 4)[between(rng, 0, Math.min(3, pool.length - 1))];
      if (!s) continue;
      const cost = Math.ceil(s.level! / 5);
      if (cost > budget) continue;
      const b: LibraryBook = { uid: uid(), title: `Lab Text: ${s.name}`, author: author(), kind: 'labText', subjectType: 'spell', subject: s.name, level: s.level!, quality: 0, language: 'Latin', spell: structuredClone(s) };
      books.push(b);
      known.add(s.id);
      budget -= cost;
      left -= cost;
      perArt.set(p.t, (perArt.get(p.t) ?? 0) + 1);
      perArt.set(p.f, (perArt.get(p.f) ?? 0) + 1);
      log.push(`Laboratory Text of ${s.name} (${s.technique}${s.form} ${s.level}, ${cost} BP).`);
      if (books.filter((x) => x.kind === 'labText').length >= 10) break;
    }
  }
  if (o.mundane) {
    for (const title of sample(rng, MUNDANE, between(rng, 2, 4))) {
      books.push({ uid: uid(), title, kind: 'mundane', subjectType: 'other', subject: '', level: 0, quality: 0, language: 'Latin', notes: 'A mundane book: no Build Points (Covenants).' });
    }
    log.push(`Mundane books: ${books.filter((b) => b.kind === 'mundane').map((b) => b.title).join('; ')}.`);
  }
  if (nobody && books.some((b) => b.kind !== 'mundane')) log.push('The covenant has no magi yet: books chosen for a magus newly through the Gauntlet.');
  if (!books.some((b) => b.kind !== 'mundane') && !assign.length) log.push(`Library: ${bp < 6 ? 'no Build Points to spend on books' : 'nothing more within the Build Points'}.`);
  return { books, assign, log };
}
