// Durenmar's Great Library as Guardians of the Forests describes it, "the greatest library known to
// the Order", stocked to its outline rather than bought with Build Points: well over a hundred summae
// on the Arts and Arcane Abilities, at least one outstanding summa in each Art and none below level
// 17 at the top, three copies of Bonisagus's Principia Magica, tractatus by the dozen (Quality 3 to 9,
// at most about 12), Lab Texts for almost every standard spell, the Tribunal's records and Bonisagus
// folios, and an eclectic collection of ancient mundane books.

import { ARTS, ART_NAMES, type Art, type GameData } from '../../data';
import type { Rng } from '../dice';
import type { LibraryBook } from '../types';
import { uid } from '../../util/id';

const between = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

/** Latin titles for the summae on each Art. */
const ART_LATIN: Record<Art, string> = {
  Cr: 'De Creatione', In: 'De Intellectu', Mu: 'De Mutatione', Pe: 'De Destructione', Re: 'De Regimine', An: 'De Bestiis', Aq: 'De Aquis', Au: 'De Aere',
  Co: 'De Corpore', He: 'De Herbis', Ig: 'De Igne', Im: 'De Imaginibus', Me: 'De Mente', Te: 'De Terra', Vi: 'De Vi Magica',
};
const SUMMA_KINDS = ['Liber Magnus', 'Summa', 'Compendium', 'Elementa', 'Commentarii', 'Prima Elementa'];
const TRACTATUS_KINDS = ['Quaestiones', 'Epistola', 'Disputatio', 'Glossa', 'Sententiae', 'Meditationes', 'Observationes', 'Responsa'];

/** The Arcane Abilities (and some others) the library has summae and tractatus on: level, Quality, and how many tractatus. */
const ABILITIES: { id: string; param?: string; label: string; summae: [number, number][]; tractatus: number }[] = [
  { id: 'parma-magica', label: 'Parma Magica', summae: [[5, 12], [3, 15]], tractatus: 4 },
  { id: 'penetration', label: 'Penetration', summae: [[5, 11], [3, 14]], tractatus: 4 },
  { id: 'finesse', label: 'Finesse', summae: [[5, 11]], tractatus: 3 },
  { id: 'concentration', label: 'Concentration', summae: [[4, 11]], tractatus: 3 },
  { id: 'code-of-hermes', label: 'Code of Hermes', summae: [[6, 12], [3, 14]], tractatus: 6 },
  { id: 'organization-lore', param: 'Order of Hermes', label: 'Order of Hermes Lore', summae: [[6, 12]], tractatus: 5 },
  { id: 'magic-lore', label: 'Magic Lore', summae: [[5, 11]], tractatus: 4 },
  { id: 'faerie-lore', label: 'Faerie Lore', summae: [[5, 10]], tractatus: 3 },
  { id: 'infernal-lore', label: 'Infernal Lore', summae: [[4, 10]], tractatus: 2 },
  { id: 'dominion-lore', label: 'Dominion Lore', summae: [[4, 10]], tractatus: 2 },
  { id: 'area-lore', param: 'Rhine Tribunal', label: 'Rhine Tribunal Lore', summae: [[5, 11]], tractatus: 3 },
];
/** The eclectic collection of ancient mundane books on the first floor. */
const MUNDANE: { id: string; param?: string; label: string; title: string; level: number; quality: number }[] = [
  { id: 'artes-liberales', label: 'Artes Liberales', title: 'Boethius, De Institutione Arithmetica, with Martianus Capella', level: 5, quality: 11 },
  { id: 'philosophiae', label: 'Philosophiae', title: 'The Organon and the Physics of Aristotle', level: 6, quality: 12 },
  { id: 'medicine', label: 'Medicine', title: 'The Canon of Avicenna, in Latin', level: 6, quality: 11 },
  { id: 'civil-and-canon-law', label: 'Civil and Canon Law', title: 'The Digest of Justinian', level: 5, quality: 10 },
  { id: 'dead-language', param: 'Greek', label: 'Greek', title: 'Grammars and lexica of the Greeks', level: 5, quality: 9 },
  { id: 'theology-christian', label: 'Theology', title: 'Augustine, De Civitate Dei', level: 5, quality: 10 },
];

/**
 * The Great Library's books: for each Art six summae (one outstanding, Level 18 to 20; one of 17;
 * the rest lower and better written, a primer up to Quality 24), the Arcane Abilities' summae, three copies of Principia
 * Magica, tractatus (six an Art, Quality mostly 5 to 9), Lab Texts of the standard spells by
 * Technique and Form, and the mundane collection. Seeded by the rng it is given.
 */
export function greatLibraryBooks(data: GameData, rng: Rng): LibraryBook[] {
  const out: LibraryBook[] = [];
  const book = (b: Omit<LibraryBook, 'uid' | 'language'>): LibraryBook => ({ uid: uid(), language: 'Latin', ...b });
  for (const a of ARTS) {
    const name = ART_NAMES[a];
    const summae: [number, number][] = [
      [between(rng, 18, 20), between(rng, 10, 12)],
      [17, between(rng, 8, 11)],
      [between(rng, 11, 14), between(rng, 9, 13)],
      [between(rng, 7, 10), between(rng, 12, 16)],
      [between(rng, 4, 6), between(rng, 15, 21)],
      [between(rng, 2, 4), between(rng, 18, 24)],
    ];
    summae.forEach(([level, quality], i) =>
      out.push(book({
        title: `${ART_LATIN[a]}: ${SUMMA_KINDS[i]}`, kind: 'summa', subjectType: 'art', subject: a, level, quality,
        notes: i === 0 ? `The library’s outstanding summa on ${name}: a copy, the original in the vaults below.` : undefined,
      })),
    );
    for (let i = 0; i < 6; i++) out.push(book({ title: `${TRACTATUS_KINDS[(i + a.charCodeAt(0)) % TRACTATUS_KINDS.length]} de ${name}, ${['I', 'II', 'III', 'IV', 'V', 'VI'][i]}`, kind: 'tractatus', subjectType: 'art', subject: a, level: 0, quality: i === 5 ? between(rng, 10, 12) : between(rng, 5, 9) }));
  }
  // Magic Theory: Principia Magica, the authority on it, in three copies; and more
  for (let i = 1; i <= 3; i++) out.push(book({ title: `Principia Magica (copy ${i} of 3)`, author: 'Bonisagus', kind: 'summa', subjectType: 'ability', subject: 'magic-theory', level: 6, quality: 15, notes: 'Bonisagus’s own work, the authority on Magic Theory.' }));
  out.push(book({ title: 'De Theoria Magica: Commentarii', kind: 'summa', subjectType: 'ability', subject: 'magic-theory', level: 8, quality: 10 }));
  for (let i = 0; i < 10; i++) out.push(book({ title: `Quaestiones de Theoria Magica, ${i + 1}`, kind: 'tractatus', subjectType: 'ability', subject: 'magic-theory', level: 0, quality: i < 2 ? between(rng, 10, 12) : between(rng, 5, 9) }));
  for (const x of ABILITIES) {
    x.summae.forEach(([level, quality], i) => out.push(book({ title: `${i === 0 ? 'Summa' : 'Elementa'} de ${x.label}`, kind: 'summa', subjectType: 'ability', subject: x.id, param: x.param, level, quality })));
    for (let i = 0; i < x.tractatus; i++) out.push(book({ title: `Quaestiones de ${x.label}, ${i + 1}`, kind: 'tractatus', subjectType: 'ability', subject: x.id, param: x.param, level: 0, quality: between(rng, 5, 10) }));
  }
  for (const m of MUNDANE) out.push(book({ title: m.title, kind: 'summa', subjectType: 'ability', subject: m.id, param: m.param, level: m.level, quality: m.quality, notes: 'From the eclectic collection of ancient mundane books on the first floor.' }));
  // Lab Texts for almost all the standard spells, by Technique and Form
  const groups = new Map<string, number[]>();
  for (const s of data.spells) if (s.level && !s.general && !s.custom) groups.set(s.technique + s.form, [...(groups.get(s.technique + s.form) ?? []), s.level]);
  for (const [tf, levels] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const name = `${ART_NAMES[tf.slice(0, 2) as Art]} ${ART_NAMES[tf.slice(2) as Art]}`;
    out.push(book({ title: `Lab Texts: the standard spells of ${name} (${levels.length})`, kind: 'labText', subjectType: 'other', subject: 'various', level: levels.reduce((t, l) => t + l, 0), quality: 0, collectionMax: Math.max(...levels), notes: 'On the second floor: Lab Texts for almost every standard spell, with many unusual ones and enchantments (the Great Library card on the Tribunal page rolls for them).' }));
  }
  out.push(book({ title: 'The records of the Rhine Tribunal and the Grand Tribunals since the Founding', kind: 'mundane', subjectType: 'other', subject: 'records', level: 0, quality: 0, notes: 'A season’s search extracts all that touches one narrow subject, covenant or magus.' }));
  out.push(book({ title: 'The Folios of House Bonisagus, from the first discourses', kind: 'mundane', subjectType: 'other', subject: 'folios', level: 0, quality: 0 }));
  return out;
}
