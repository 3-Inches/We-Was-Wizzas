// Stocking a covenant's library with Build Points (Covenants ch.2 and ch.7): summae and tractatus on
// the Arts its magi work in (and those nobody covers yet), summae on the Abilities magi study most,
// Laboratory Texts of spells in their Arts, and a few mundane books that cost nothing. Within the
// Build Points given, at the limits a starting library allows; seeded, like the other generators.

import { ARTS, ART_NAMES, TECHNIQUES, type Art, type GameData } from '../../data';
import { deriveCharacter } from '../character/derive';
import { summaCost } from '../covenant';
import type { Character, Covenant, HouseRules, LibraryBook } from '../types';
import { uid } from '../../util/id';
import { freshName } from './names';
import type { Rng } from '../dice';
import { between, chance, pick, sample } from './random';

export interface LibraryOptions {
  arts: boolean;
  abilities: boolean;
  labTexts: boolean;
  mundane: boolean;
}

const ART_TITLES = ['Principles of', 'On the Nature of', 'Meditations upon', 'The Lesser Key of', 'Commentaries on', 'The Mysteries of'];
const ABILITY_SUMMAE: { id: string; param?: string; label: string }[] = [
  { id: 'magic-theory', label: 'Magic Theory' },
  { id: 'parma-magica', label: 'Parma Magica' },
  { id: 'dead-language', param: 'Latin', label: 'Latin' },
  { id: 'artes-liberales', label: 'Artes Liberales' },
  { id: 'penetration', label: 'Penetration' },
  { id: 'concentration', label: 'Concentration' },
  { id: 'finesse', label: 'Finesse' },
  { id: 'code-of-hermes', label: 'Code of Hermes' },
  { id: 'magic-lore', label: 'Magic Lore' },
];
const MUNDANE = [
  'Isidore of Seville, Etymologies', 'Boethius, The Consolation of Philosophy', 'Euclid, Elements', 'Galen, On the Temperaments', 'Vegetius, On Military Matters',
  'Pliny, Natural History', 'A psalter, finely illuminated', 'The Rule of Saint Benedict', 'Aristotle, Physics, in a Latin translation', 'A herbal with painted plates',
];

/**
 * Books for the covenant's library, costing no more than `bp` Build Points: Art summae first for the
 * Arts its magi lean on most (and gaps), then Ability summae, tractatus and Laboratory Texts.
 */
export function stockLibrary(cov: Covenant, members: Character[], g: { data: GameData; rules: HouseRules }, bp: number, o: LibraryOptions, rng: Rng): { books: LibraryBook[]; log: string[] } {
  const books: LibraryBook[] = [];
  const log: string[] = [];
  let left = bp;
  const magi = members.filter((m) => m.type === 'magus').map((m) => deriveCharacter(m, g.data, g.rules));
  // how much the covenant's magi lean on each Art (and how well its library already covers it)
  const weight = (a: Art) => magi.reduce((t, d) => t + d.arts[a].score, 0) + 1;
  const covered = (a: Art) => Math.max(0, ...[...cov.library, ...books].filter((b) => b.kind === 'summa' && b.subjectType === 'art' && b.subject === a).map((b) => b.level));
  const authors = new Set<string>([...cov.library.map((b) => b.author ?? ''), ...members.map((m) => m.name)]);
  const author = () => {
    const n = freshName(rng, 'latin', chance(rng, 0.4), authors);
    authors.add(n);
    return `${n} of ${pick(rng, ['Bonisagus', 'Jerbiton', 'Bjornaer', 'Criamon', 'Flambeau', 'Guernicus', 'Mercere', 'Merinita', 'Tremere', 'Tytalus', 'Verditius', 'Ex Miscellanea'])}`;
  };
  const buy = (b: LibraryBook) => {
    const cost = summaCost(b).cost;
    if (cost > left) return false;
    books.push(b);
    left -= cost;
    return true;
  };

  if (o.arts) {
    // summae: the Arts in order of how much the magi need them, a level above what is there already
    const arts = [...ARTS].sort((a, b) => weight(b) - weight(a) || (chance(rng, 0.5) ? 1 : -1));
    for (const a of arts.slice(0, 6)) {
      if (left < 18) break;
      const level = Math.max(covered(a) + 2, between(rng, 6, 14));
      if (level > 20) continue;
      const quality = Math.min(11 + (20 - level), between(rng, 7, 12));
      const b: LibraryBook = { uid: uid(), title: `${pick(rng, ART_TITLES)} ${ART_NAMES[a]}`, author: author(), kind: 'summa', subjectType: 'art', subject: a, level, quality, language: 'Latin' };
      if (buy(b)) log.push(`${b.title}: summa on ${ART_NAMES[a]}, Level ${level}, Quality ${quality} (${level + quality} BP).`);
    }
  }
  if (o.abilities) {
    for (const ab of ABILITY_SUMMAE.slice(0, 2).concat(sample(rng, ABILITY_SUMMAE.slice(2), 2))) {
      if (left < 15) break;
      const level = between(rng, 3, 6);
      const quality = Math.min(11 + 3 * (8 - level), between(rng, 7, 11));
      const b: LibraryBook = { uid: uid(), title: `${pick(rng, ['A Treatise on', 'The Craft of', 'Instructions in'])} ${ab.label}`, author: author(), kind: 'summa', subjectType: 'ability', subject: ab.id, level, quality, language: 'Latin' };
      if (buy(b)) log.push(`${b.title}: summa on ${ab.label}, Level ${level}, Quality ${quality} (${quality + 3 * level} BP).`);
    }
  }
  if (o.arts) {
    // tractatus on the Arts most used: cheap study for the whole council
    for (const a of [...ARTS].sort((x, y) => weight(y) - weight(x)).slice(0, 4)) {
      if (left < 6) break;
      const quality = between(rng, 6, 11);
      const b: LibraryBook = { uid: uid(), title: `${pick(rng, ['Notes on', 'Observations of', 'A Letter concerning'])} ${ART_NAMES[a]}`, author: author(), kind: 'tractatus', subjectType: 'art', subject: a, level: 0, quality, language: 'Latin' };
      if (buy(b)) log.push(`${b.title}: tractatus on ${ART_NAMES[a]}, Quality ${quality} (${quality} BP).`);
    }
  }
  if (o.labTexts) {
    // Laboratory Texts of spells in the Arts the magi use most, a Build Point per 5 levels
    const techs = TECHNIQUES.filter((t) => weight(t) > 1).sort((a, b) => weight(b) - weight(a)).slice(0, 3);
    const forms = ARTS.filter((a) => !(TECHNIQUES as readonly string[]).includes(a) && weight(a) > 1).sort((a, b) => weight(b) - weight(a)).slice(0, 4);
    const known = new Set([...cov.library.map((b) => b.spell?.id), ...members.flatMap((m) => m.spells.map((s) => s.spellId))]);
    const pool = g.data.spells.filter((s) => s.level !== null && !s.general && s.level >= 10 && s.level <= 30 && (techs.length ? techs.includes(s.technique as never) : true) && (forms.length ? forms.includes(s.form as Art) : true) && !known.has(s.id) && g.data.isBookEnabled(s.source.book));
    for (const s of sample(rng, pool, 6)) {
      if (left < 2) break;
      const b: LibraryBook = { uid: uid(), title: `Lab Text: ${s.name}`, author: author(), kind: 'labText', subjectType: 'spell', subject: s.name, level: s.level!, quality: 0, language: 'Latin', spell: structuredClone(s) };
      if (buy(b)) log.push(`Laboratory Text of ${s.name} (${s.technique}${s.form} ${s.level}, ${Math.ceil(s.level! / 5)} BP).`);
    }
  }
  if (o.mundane) {
    for (const title of sample(rng, MUNDANE, between(rng, 2, 4))) {
      books.push({ uid: uid(), title, kind: 'mundane', subjectType: 'other', subject: '', level: 0, quality: 0, language: 'Latin', notes: 'A mundane book: no Build Points (Covenants).' });
    }
    log.push(`Mundane books: ${books.filter((b) => b.kind === 'mundane').map((b) => b.title).join('; ')}.`);
  }
  if (!books.some((b) => b.kind !== 'mundane')) log.push(`Library: ${bp < 6 ? 'no Build Points to spend on books' : 'nothing more within the Build Points'}.`);
  return { books, log };
}
