// Writing books (DE Writing Books, Long-Term Events; Covenants, Extended Suggestions on the Quality
// of Books). Core rules: a summa's Quality is the author's Communication + 6 + Virtue bonuses, plus
// a bonus for writing it below half her score (+1 per Level for an Art, +3 for an Ability, never
// more than the base Quality); a tractatus is Communication + 6 + Virtues. The extended rules replace
// the 6 with 3 plus skilled artisans and resonant materials. A lab's Texts Specialization adds 1 to
// the writer's language, and to a copyist's Profession: Scribe, for every full 3 points (DE, Lab
// Specializations). Books are written, copied and glossed season by season; the covenant's scribes
// copy books in their working seasons (Covenants ch.7, Scriptoria).

import { ART_NAMES, type Art, type GameData } from '../data';
import type { DerivedCharacter } from './character/derive';
import { applySeason, newSeasonEntry } from './longterm';
import { takeVis } from './vis';
import { countOf, specAbilities } from './covenantRules';
import { workSeasons } from './covenfolk';
import { uid } from '../util/id';
import type { BookFormat, BookMake, Character, Covenant, LibraryBook, Season, WritingProject } from './types';

export type { ScriptoriumCopy } from './types';

export interface BookPlan {
  kind: 'summa' | 'tractatus' | 'commentary';
  isArt: boolean;
  /** the author's score in the subject */
  score: number;
  /** summa Level chosen (summae only) */
  level?: number;
  com: number;
  /** the author's score in the language the book is written in */
  language: number;
  /** the Texts Specialization of the lab it is written in */
  labTexts?: number;
  /** Covenants' extended rules: how the book is made */
  extended?: BookMake;
  /** the subject takes resonant materials (an Art or an Arcane Ability) */
  resonant?: boolean;
  /** dictated to a notary: their Communication + Language, the lower of the two sets the pace */
  notary?: number;
  /** tractatus (and commentaries) the author has written on the subject already */
  written?: number;
}

export interface BookResult {
  quality: number;
  /** the Quality of the text alone, which copies keep (extended rules) */
  textQuality: number;
  parts: { label: string; value: number }[];
  maxLevel: number;
  level: number;
  /** points per season toward a summa: Communication + Language */
  perSeason: number;
  needed: number;
  seasons: number;
  /** most tractatus the author may write on the subject */
  tractatusLimit: number;
  problems: string[];
  notes: string[];
}

/** Quality bonuses to books the author writes from Virtues (Good Teacher +3). */
export function writingBonuses(d: DerivedCharacter): { label: string; value: number }[] {
  return d.effects.filter((e) => e.type === 'bookWritingQuality').map((e) => ({ label: e.fromName, value: (e as { amount: number }).amount }));
}

// ------------------------------------------------------------------------------ How a book is made

/** Formats and secondary functions (Covenants ch.7): what each does to Quality. */
export const BOOK_FORMATS: { id: BookFormat; label: string; mod: number; noResonance?: boolean; noBinder?: boolean; noIlluminator?: boolean; noScribe?: boolean; hint: string }[] = [
  { id: 'codex', label: 'A bound codex', mod: 0, hint: 'Pages bound between boards: the usual Hermetic book.' },
  { id: 'flap', label: 'Flap-bound', mod: -1, hint: 'Leather flaps for boards, as Redcaps like: −1, no resonant cover ornaments; buckles with age.' },
  { id: 'exemplar', label: 'Exemplar', mod: -3, hint: 'A miniature template for distant scribes: cheap, easy to carry, −3.' },
  { id: 'unbound', label: 'Unbound sheets', mod: 0, noBinder: true, noResonance: true, hint: 'Not yet bound: no binder’s bonus, no resonances, easily damaged.' },
  { id: 'holograph', label: 'Holograph (in the author’s hand)', mod: 0, noScribe: true, hint: 'Scribed by the author: the scribe’s bonus only if the author is a skilled scribe. An Arcane Connection to the author for a year.' },
  { id: 'deluxe', label: 'Edition de luxe', mod: 0, hint: 'A sumptuous gift for nobles and churchmen: gives up Quality, up to (Scribe + Binder + Illuminator) / 2.' },
  { id: 'ex-libris', label: 'Ex libris', mod: 0, noResonance: true, hint: 'A cheap copy for visitors to read: no resonant materials.' },
  { id: 'juvenilia', label: 'Juvenilia', mod: -3, noScribe: true, noBinder: true, noIlluminator: true, noResonance: true, hint: 'An apprentice’s quick copy: −3, not illuminated or bound, no resonances; 15 levels a season.' },
];
export const formatOf = (m?: BookMake) => BOOK_FORMATS.find((f) => f.id === (m?.format ?? 'codex')) ?? BOOK_FORMATS[0];

/** Books on Arts and Arcane Abilities take resonant materials and clarification (Covenants ch.7). */
export function resonantSubject(b: { subjectType: string; subject: string }, data?: GameData): boolean {
  if (b.subjectType === 'art') return true;
  return b.subjectType === 'ability' && data?.abilityById.get(b.subject)?.type === 'Arcane';
}

/** The Quality a book's making adds: skilled artisans, resonant materials, clarification and its format. */
export function makeParts(m: BookMake, o: { resonant: boolean; glossed?: boolean; florilegium?: boolean; authorScribe?: boolean }): { label: string; value: number }[] {
  const f = formatOf(m);
  const parts: { label: string; value: number }[] = [];
  if (m.scribe && (!f.noScribe || (f.id === 'holograph' && o.authorScribe))) parts.push({ label: f.id === 'holograph' ? 'Skilled scribe (the author)' : 'Skilled scribe', value: 1 });
  if (m.binder && !f.noBinder) parts.push({ label: 'Skilled binder', value: 1 });
  if (m.illuminator && !f.noIlluminator) parts.push({ label: 'Skilled illuminator', value: 1 });
  // glosses and florilegia express resonance already, so take no resonant materials or clarification
  const res = o.resonant && !f.noResonance && !o.glossed && !o.florilegium ? Math.max(0, Math.min(2, m.resonance ?? 0)) : 0;
  if (res) parts.push({ label: res === 2 ? 'Resonant materials won in a story' : 'Resonant materials bought', value: res });
  if (res && m.clarified) parts.push({ label: 'Clarified', value: 1 });
  if (f.mod) parts.push({ label: f.label, value: f.mod });
  if (f.id === 'deluxe' && m.deluxe) parts.push({ label: 'Splendor given for Quality', value: -Math.abs(m.deluxe) });
  return parts;
}
const sum = (ps: { value: number }[]) => ps.reduce((t, p) => t + p.value, 0);

/**
 * A library book's Quality from its parts: the text's Quality, how this copy is made, a gloss, its
 * florilegium. Books from before the extended rules (no text Quality) keep the Quality they have.
 */
export function bookQuality(b: LibraryBook, data?: GameData): number {
  if (b.textQuality === undefined) return b.quality;
  const resonant = resonantSubject(b, data);
  const make = b.make ? sum(makeParts(b.make, { resonant, glossed: !!b.glossed, florilegium: !!b.florilegium })) : 0;
  return Math.max(0, b.textQuality + make + (b.glossed ? 1 : 0) + (b.florilegium?.bonus ?? 0));
}

/** Set a book's Quality again after its making changed; one without a text Quality changes by the difference. */
export function refreshQuality(b: LibraryBook, data: GameData | undefined, before?: Pick<LibraryBook, 'make' | 'glossed' | 'florilegium'>): void {
  if (b.textQuality !== undefined) {
    b.quality = bookQuality(b, data);
    return;
  }
  if (!before) return;
  const resonant = resonantSubject(b, data);
  const q = (x: Pick<LibraryBook, 'make' | 'glossed' | 'florilegium'>) =>
    (x.make ? sum(makeParts(x.make, { resonant, glossed: !!x.glossed, florilegium: !!x.florilegium })) : 0) + (x.glossed ? 1 : 0) + (x.florilegium?.bonus ?? 0);
  b.quality = Math.max(0, b.quality + q(b) - q(before));
}

// ------------------------------------------------------------------------------ Planning a book

export function planBook(d: DerivedCharacter, p: BookPlan): BookResult {
  const problems: string[] = [];
  const notes: string[] = [];
  if (p.isArt ? p.score < 5 : p.score < 2) problems.push(`An author needs a score of at least ${p.isArt ? '5 in an Art' : '2 in an Ability'} to write a useful book.`);
  if (p.language < 5) problems.push('An author needs a score of at least 5 in the language the book is written in.');
  const virtues = writingBonuses(d);
  const virtueTotal = virtues.reduce((s, v) => s + v.value, 0);
  const ext = p.extended;
  const text: { label: string; value: number }[] = [{ label: "Author's Communication", value: p.com }, { label: ext ? 'Base (extended rules)' : 'Base', value: ext ? 3 : 6 }, ...virtues];
  const make = ext ? makeParts(ext, { resonant: !!p.resonant, authorScribe: ext.scribe }) : [];
  const artisans = make.filter((x) => /scribe|binder|illuminator/i.test(x.label)).length;
  if (ext && (ext.resonance ?? 0) > 0 && !p.resonant) notes.push('Resonant materials only help books on the Arts and Arcane Abilities (Covenants ch.7).');
  const maxLevel = Math.floor(p.score / 2);
  const textsBonus = Math.floor(Math.max(0, p.labTexts ?? 0) / 3);
  const own = p.com + p.language + textsBonus;
  const perSeason = p.notary !== undefined ? Math.min(own, p.notary) : own;
  if (textsBonus) notes.push(`Written in a lab with Texts +${p.labTexts}: +${textsBonus} to the language for writing (DE, Laboratory Specializations).`);
  if (p.notary !== undefined) notes.push(`Dictated: the lower of the author's (${own}) and the notary's (${p.notary}) Communication + Language sets the pace (Covenants ch.7).`);
  const limit = Math.ceil(p.score / (p.isArt ? 5 : 2));
  if (p.kind !== 'summa') {
    const commentary = p.kind === 'commentary' ? [{ label: 'A commentary', value: 1 }] : [];
    const textQuality = sum(text) + sum(commentary);
    if (p.kind === 'tractatus' && (p.written ?? 0) >= limit) problems.push(`The author has written ${p.written} tractatus on this subject, the most allowed (${p.isArt ? 'a fifth of the Art' : 'half the Ability'}, rounded up: ${limit}).`);
    return {
      quality: textQuality + sum(make), textQuality, parts: [...text, ...commentary, ...make], maxLevel, level: 0, perSeason, needed: 1, seasons: 1, tractatusLimit: limit, problems,
      notes: [
        ...notes,
        p.kind === 'commentary'
          ? 'One season, written as a tractatus, +1 Quality; a reader must have studied its summa for a season first (Covenants ch.7).'
          : `One season. At most ${limit} tractatus on this subject (${p.isArt ? 'a fifth of an Art' : 'half an Ability'}, rounded up)${p.written ? `; ${p.written} written already` : ''}.${ext && p.isArt ? ' An Art tractatus is at most Quality 17 in practice.' : ''}`,
      ],
    };
  }
  const level = Math.max(1, Math.min(p.level ?? maxLevel, maxLevel || 1));
  if ((p.level ?? maxLevel) > maxLevel) problems.push(`A summa's Level is at most half the author's score: ${maxLevel}.`);
  const drop = Math.max(0, maxLevel - level);
  const perLevel = p.isArt ? 1 : 3;
  const base = sum(text) + sum(make);
  // the bonus for writing below half the score never exceeds the base Quality (core), or
  // Communication + Virtues + artisans + 3 (extended)
  const cap = ext ? p.com + virtueTotal + artisans + 3 : base;
  const bonus = Math.min(drop * perLevel, Math.max(0, cap));
  const dropPart = bonus ? [{ label: `Written ${drop} Level${drop > 1 ? 's' : ''} below half the score (${perLevel} each${bonus < drop * perLevel ? `, capped at ${cap}` : ''})`, value: bonus }] : [];
  let quality = base + bonus;
  if (ext && p.isArt && quality > 35 - level) notes.push(`An Art summa of Level ${level} is at most Quality ${35 - level} in practice (Covenants).`);
  if (!ext) quality = Math.min(quality, 2 * base);
  const textQuality = quality - sum(make);
  const needed = p.isArt ? level : 5 * level;
  const seasons = perSeason > 0 ? Math.ceil(needed / perSeason) : Infinity;
  if (perSeason <= 0) problems.push('Communication + Language is 0 or less: the book can never be finished.');
  notes.push(`Each season of writing adds Communication + Language${textsBonus ? ' (with the lab)' : ''} = ${perSeason} points; the book needs ${needed} (${p.isArt ? 'its Level' : 'five times its Level'}).`);
  return { quality, textQuality, parts: [...text, ...make, ...dropPart], maxLevel, level, perSeason, needed, seasons, tractatusLimit: limit, problems, notes };
}

// ------------------------------------------------------------------------------ Skills

/** A character's score in a language by name (Latin, Greek…). */
export function languageScore(c: Character, d: DerivedCharacter, name: string): number {
  const n = name.trim().toLowerCase();
  return c.abilities
    .filter((a) => (a.abilityId === 'living-language' || a.abilityId === 'dead-language') && (a.param ?? '').toLowerCase() === n)
    .reduce((m, a) => Math.max(m, d.abilityByUid.get(a.uid)?.total ?? 0), 0);
}

/** A character's best Profession or Craft in a trade (Scribe, Binder, Illuminator…). */
export function tradeScore(c: Character, d: DerivedCharacter, trade: RegExp): number {
  return c.abilities
    .filter((a) => (a.abilityId === 'profession-type' || a.abilityId === 'craft-type') && trade.test(a.param ?? ''))
    .reduce((m, a) => Math.max(m, d.abilityByUid.get(a.uid)?.total ?? 0), 0);
}
const score = (d: DerivedCharacter, id: string) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0);

export const SCRIBE = /scrib|copyist/i;
export const BINDER = /bind/i;
export const ILLUMINATOR = /illumin/i;
/** Profession or Craft 6+ makes an artisan skilled (Covenants ch.7). */
export const SKILLED = 6;

export interface Artisan {
  name: string;
  score: number;
  from: 'specialist' | 'member';
}

/** The covenant's best scribe, binder and illuminator, among its specialists and members. */
export function covenantArtisans(cov: Covenant, members: { c: Character; d: DerivedCharacter }[]): Record<'scribe' | 'binder' | 'illuminator', Artisan | undefined> {
  const best = (re: RegExp): Artisan | undefined => {
    const fromSpecs = cov.specialists.flatMap((s) =>
      specAbilities(s)
        .filter((a) => ((a.id === 'profession-type' || a.id === 'craft-type') && re.test(a.param ?? '')) || re.test(a.label ?? '') || (re === BINDER && s.craft === 'bookbinder') || (re === ILLUMINATOR && s.craft === 'illuminator'))
        .map((a) => ({ name: s.name || 'the covenant’s', score: a.score, from: 'specialist' as const })),
    );
    const fromMembers = members.map(({ c, d }) => ({ name: c.name || 'a member', score: tradeScore(c, d, re), from: 'member' as const })).filter((a) => a.score > 0);
    return [...fromSpecs, ...fromMembers].sort((a, b) => b.score - a.score)[0];
  };
  return { scribe: best(SCRIBE), binder: best(BINDER), illuminator: best(ILLUMINATOR) };
}

// ------------------------------------------------------------------------------ Copying

/**
 * Why a copy would come out corrupt (DE, Corrupted Copies): the copyist must read and write the language
 * (3 is enough, and Artes Liberales to read at all), have Magic Theory for the Arts, Parma Magica and lab
 * texts, and the Realm Lore or the Ability itself for a Supernatural Ability.
 */
export function copyProblems(c: Character, d: DerivedCharacter, b: Pick<LibraryBook, 'language' | 'subjectType' | 'subject' | 'kind'>, data?: GameData): string[] {
  const out: string[] = [];
  if (languageScore(c, d, b.language) < 3) out.push(`${b.language} 3 or more`);
  if (score(d, 'artes-liberales') < 1) out.push('Artes Liberales (to read and write)');
  const hermetic = b.subjectType === 'art' || b.subject === 'parma-magica' || b.kind === 'labText' || b.kind === 'castingTablet';
  if (hermetic && score(d, 'magic-theory') < 1) out.push('Magic Theory 1 or more');
  if (b.subjectType === 'ability' && data?.abilityById.get(b.subject)?.type === 'Supernatural') {
    const lore = Math.max(score(d, 'magic-lore'), score(d, 'faerie-lore'), score(d, 'infernal-lore'), score(d, 'dominion-lore'), score(d, b.subject));
    if (lore < 1) out.push('a Realm Lore or the Ability itself');
  }
  return out;
}

/** A copyist's points a season toward a summa: 6 + Profession: Scribe (+1 per 3 of a lab's Texts), three times as many when copying quickly. */
export const copyRate = (scribe: number, labTexts = 0, quick = false) => (6 + scribe + Math.floor(Math.max(0, labTexts) / 3)) * (quick ? 3 : 1);

/** Lab texts a season: written up at Latin × 20 levels, copied at Profession: Scribe × 60 (DE, Laboratory Texts). */
export const labTextRate = (kind: 'write' | 'copy', latinOrScribe: number, labTexts = 0) => Math.max(0, latinOrScribe + Math.floor(Math.max(0, labTexts) / 3)) * (kind === 'write' ? 20 : 60);

/** What a copy of a book is: the same text at its own making; a quick copy is 1 lower; a corrupt one useless. */
export function copyOfBook(b: LibraryBook, o: { quick?: boolean; make?: BookMake; corrupt?: boolean; by?: string; data?: GameData }): LibraryBook {
  const copy: LibraryBook = {
    ...structuredClone(b),
    uid: uid(),
    title: `${b.title}${o.quick ? ' (quick copy)' : ' (copy)'}`,
    copyOf: b.uid,
    inPlay: true,
    readBy: [],
    hidden: undefined,
    boonUid: undefined,
    ownerId: undefined,
    glossed: undefined,
    florilegium: undefined,
    clarifying: undefined,
    rolls: undefined,
    notes: o.by ? `Copied by ${o.by}.` : undefined,
  };
  if (b.textQuality !== undefined) {
    copy.textQuality = b.textQuality - (o.quick ? 1 : 0);
    copy.make = o.make;
    copy.quality = bookQuality(copy, o.data);
  } else copy.quality = Math.max(0, b.quality - (o.quick ? 1 : 0));
  if (o.corrupt) ((copy.corrupt = true), (copy.title += ' — corrupt'));
  return copy;
}

// ------------------------------------------------------------------------------ Glosses, florilegia, annotation, clarification

/** Glossing while reading (Covenants ch.7): a reader at least half as skilled as the summa's Level, more eloquent than its author, adds 1 Quality once. */
export function glossProblems(readerScore: number, readerCom: number, b: LibraryBook, data?: GameData): string[] {
  const out: string[] = [];
  if (b.glossed) out.push(`It was glossed already, by ${b.glossed.by}.`);
  if (b.florilegium) out.push('A florilegium’s tractatus cannot be glossed as well.');
  if (b.make?.resonance && resonantSubject(b, data)) out.push('Glosses express resonance: a book with resonant materials cannot be glossed.');
  if (b.kind === 'summa' && readerScore * 2 < b.level) out.push(`The reader needs at least half the Level (${Math.ceil(b.level / 2)}).`);
  if (b.authorCom !== undefined && readerCom <= b.authorCom) out.push(`The reader’s Communication must be higher than the author’s (${b.authorCom}).`);
  return out;
}

/** The bonus a florilegium gives its tractatus: +1, or +2 from an authority with a peerless collection; or why it cannot be made. */
export function florilegiumBonus(editorScore: number, isArt: boolean, available: number, included: number): { bonus: number; problems: string[] } {
  const problems: string[] = [];
  const limit = Math.ceil(editorScore / (isArt ? 5 : 2));
  if (included < 2) problems.push('Choose at least two tractatus on one subject.');
  if (included > limit) problems.push(`The editor can collect at most ${limit} (as many as they could write).`);
  if (editorScore < (isArt ? 20 : 6)) problems.push(`The editor needs ${isArt ? '20 in the Art' : '6 in the Ability'}.`);
  if (available < 2 * included) problems.push(`The library needs at least twice as many tractatus on the subject (${2 * included}); it has ${available}.`);
  if (problems.length) return { bonus: 0, problems };
  return { bonus: editorScore >= (isArt ? 35 : 10) && available >= 5 * included ? 2 : 1, problems };
}

/** Annotating one's own summa (inspeximus): a season adds a third of the score gained since it was written to its Level. */
export const annotateGain = (b: LibraryBook, nowScore: number) => (b.authorScore === undefined ? 0 : Math.max(0, Math.floor((nowScore - b.authorScore) / 3)));

/** Years in a Magic aura before a book opened as an invested device is clarified: 12 / aura (Covenants ch.7). */
export const clarifyYears = (aura: number) => (aura > 0 ? Math.ceil(12 / aura) : Infinity);
/** Vim vis to open a book for enchantment: material 2 × size 4 (Covenants ch.7, Epitomes; DE, Opening an Item). */
export const OPEN_BOOK_PAWNS = 8;

/** Why a magus cannot clarify a book (Covenants ch.7): Art 15 in the book's Art (15 in an Art for an Arcane Ability), Magic Theory to handle 8 pawns, resonant materials, a Magic aura. */
export function clarifyProblems(d: DerivedCharacter, b: LibraryBook, aura: { realm: string; strength: number }, data?: GameData): string[] {
  const out: string[] = [];
  if (!d.isMagus) out.push('Only a magus can open a book to enchantment.');
  if (!resonantSubject(b, data)) out.push('Only books on the Arts and Arcane Abilities can be clarified.');
  if (!b.make?.resonance) out.push('It needs resonant materials first.');
  if (b.make?.clarified || b.clarifying) out.push(b.make?.clarified ? 'It is clarified already.' : 'It is being clarified.');
  if (b.glossed || b.florilegium) out.push('Glossed books and florilegia cannot be clarified.');
  const art = b.subjectType === 'art' ? d.arts[b.subject as keyof typeof d.arts]?.score ?? 0 : Math.max(...Object.values(d.arts).map((a) => a.score));
  if (art < 15) out.push(b.subjectType === 'art' ? 'The magus needs 15 in its Art.' : 'The magus needs 15 in the Art the Ability relates to.');
  if (score(d, 'magic-theory') * 2 < OPEN_BOOK_PAWNS) out.push(`Opening it takes ${OPEN_BOOK_PAWNS} pawns of Vim in a season: Magic Theory 4 or more.`);
  if (aura.realm !== 'Magic' || aura.strength <= 0) out.push('It must lie in a Magic aura.');
  return out;
}

/** The covenant's clarifications at the year's end: done after 12 / aura years in the aura. */
export function libraryYearEnd(cov: Covenant, year: number, data?: GameData): string[] {
  const out: string[] = [];
  for (const b of cov.library) {
    if (!b.clarifying || year - b.clarifying.since < clarifyYears(b.clarifying.aura)) continue;
    const before = { make: b.make && { ...b.make }, glossed: b.glossed, florilegium: b.florilegium };
    b.make = { ...(b.make ?? {}), clarified: true };
    delete b.clarifying;
    refreshQuality(b, data, before);
    out.push(`${b.title} is clarified: Quality ${b.quality}.`);
  }
  return out;
}

// ------------------------------------------------------------------------------ Writing projects, season by season

const EXPOSURE_XP = 2;

/** Tractatus an author has written on a subject (not copies or commentaries): they count toward the limit. */
export const tractatusBy = (books: LibraryBook[], authorId: string, subject: string) => books.filter((b) => b.authorId === authorId && b.subject === subject && (b.kind === 'tractatus') && !b.copyOf && !b.commentaryOf).length;

/** Work a writing project for a season: points toward it, Exposure, and the book (or copy, or lab texts) once it is done. */
export function workWriting(
  c: Character,
  d: DerivedCharacter,
  cov: Covenant | undefined,
  p: WritingProject,
  year: number,
  season: Season,
  data?: GameData,
): string[] {
  const lines: string[] = [];
  p.points += Math.max(0, p.rate);
  const gains: Record<string, number> = p.exposure ? { [p.exposure]: EXPOSURE_XP } : {};
  const label = { summa: 'Wrote', tractatus: 'Wrote', commentary: 'Wrote', copy: 'Copied', labTexts: 'Wrote up lab texts', copyLabTexts: 'Copied lab texts', florilegium: 'Edited', annotate: 'Annotated' }[p.kind];
  const e = newSeasonEntry(year, season, p.kind === 'copy' || p.kind === 'copyLabTexts' ? 'copy-book' : 'write-book', `${label}: ${p.title} (${Math.min(p.points, p.needed)}/${p.needed})${p.exposure ? `, +${EXPOSURE_XP} xp Exposure` : ''}`, gains);
  applySeason(c, e, 1);
  c.seasonLog.push(e);
  const [k, id] = (p.exposure ?? '').split(':');
  const where = k === 'art' ? ART_NAMES[id as Art] : d.abilityByUid.get(id)?.name ?? 'the subject';
  lines.push(`${label} ${p.title}: ${Math.min(p.points, p.needed)} of ${p.needed}${p.exposure ? `; Exposure +${EXPOSURE_XP} xp in ${where}` : ''}.`);
  // a book finished with points to spare: what is left of the season goes on to the next one written by points
  let cur = p;
  while (cur.points >= cur.needed) {
    const share = cur.rate > 0 ? (cur.points - cur.needed) / cur.rate : 0;
    cur.done = { year, season };
    lines.push(...(cov ? finishWriting(c, cov, cur, year, data) : [`${cur.title} is finished, but ${c.name || 'the writer'} has no covenant library to keep it in.`]));
    const open = (c.writing ?? []).filter((w) => !w.done && BY_POINTS.includes(w.kind));
    const next = BY_POINTS.includes(cur.kind) && share > 0 ? open.find((w) => w.kind === cur.kind) ?? open[0] : undefined;
    const pts = next ? Math.floor(share * next.rate) : 0;
    if (!next || pts < 1) break;
    cur.points = cur.needed;
    next.points += pts;
    e.summary += `; then ${next.title} (${Math.min(next.points, next.needed)}/${next.needed})`;
    lines.push(`The rest of the season goes on to ${next.title}: +${pts}, ${Math.min(next.points, next.needed)} of ${next.needed}.`);
    cur = next;
  }
  return lines;
}

/**
 * The work written or copied by points, so that one finished early leaves the rest of the season for
 * the next: a summa (Communication + Language a season), a copy, lab texts. A tractatus or a
 * commentary takes its whole season (DE, Writing Books).
 */
const BY_POINTS: WritingProject['kind'][] = ['summa', 'copy', 'labTexts', 'copyLabTexts'];

/** A finished project's books go to the covenant's library; bought resonant materials go on the year's Sundry. */
export function finishWriting(c: Character, cov: Covenant, p: WritingProject, year: number, data?: GameData): string[] {
  const lines: string[] = [];
  const by = c.name || 'a member';
  const source = (u?: string) => cov.library.find((b) => b.uid === u);
  p.inLibrary = cov.id;
  if (p.kind === 'summa' || p.kind === 'tractatus' || p.kind === 'commentary') {
    const b: LibraryBook = {
      uid: uid(), title: p.title, author: c.name, authorId: c.id, authorCom: c.characteristics.Com, authorScore: p.authorScore, inPlay: true,
      kind: p.kind === 'summa' ? 'summa' : 'tractatus', subjectType: p.subjectType, subject: p.subject, param: p.param, level: p.kind === 'summa' ? p.level : 0,
      quality: p.quality ?? 0, textQuality: p.make ? p.textQuality : undefined, make: p.make, language: p.language, commentaryOf: p.commentaryOf,
      notes: `Written by ${by}, finished ${year}.${p.make?.by ? ` ${Object.entries(p.make.by).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ')}.` : ''}`,
    };
    if (p.make && b.textQuality !== undefined) b.quality = bookQuality(b, data);
    cov.library.push(b);
    lines.push(`${p.title} is finished: Quality ${b.quality}${b.kind === 'summa' ? `, Level ${b.level}` : ''}, in the library of ${cov.name || 'the covenant'}.`);
    if (p.make?.resonance === 1 && resonantSubject(b, data)) {
      cov.finances.sundry = Math.round((cov.finances.sundry + 1) * 1000) / 1000;
      lines.push('Its bought resonant materials cost a pound, on this year’s Sundry (Covenants ch.5).');
    }
  } else if (p.kind === 'copy') {
    for (const u of p.sources ?? [p.sourceUid]) {
      const src = source(u);
      if (!src) continue;
      const copy = copyOfBook(src, { quick: p.quick, make: p.make, corrupt: !!p.corrupt, by, data });
      cov.library.push(copy);
      lines.push(`${copy.title}${copy.corrupt ? `: useless (${p.corrupt})` : `: Quality ${copy.quality}`}.`);
      if (!copy.corrupt && p.make?.resonance === 1 && resonantSubject(copy, data)) cov.finances.sundry = Math.round((cov.finances.sundry + 1) * 1000) / 1000;
    }
  } else if (p.kind === 'labTexts') {
    for (const su of p.spells ?? []) {
      const s = c.spells.find((x) => x.uid === su);
      if (!s) continue;
      cov.library.push({ uid: uid(), title: `${s.spell.name} (lab text by ${by})`, author: c.name, authorId: c.id, kind: 'labText', subjectType: 'spell', subject: s.spell.name, level: s.spell.level ?? 0, quality: 0, spell: structuredClone(s.spell), language: 'Latin', inPlay: true });
    }
    lines.push(`${(p.spells ?? []).length} lab text${(p.spells ?? []).length === 1 ? '' : 's'} written up for others to use (${p.level} levels).`);
  } else if (p.kind === 'copyLabTexts') {
    for (const u of p.sources ?? []) {
      const src = source(u);
      if (src) cov.library.push({ ...copyOfBook(src, { corrupt: !!p.corrupt, by, data }), quality: src.quality });
    }
    lines.push(`Lab texts copied (${p.level} levels)${p.corrupt ? `, corrupt (${p.corrupt})` : ''}.`);
  } else if (p.kind === 'florilegium') {
    for (const u of p.sources ?? []) {
      const b = source(u);
      if (!b) continue;
      const before = { make: b.make, glossed: b.glossed, florilegium: b.florilegium };
      b.florilegium = { name: p.title, bonus: p.bonus ?? 1 };
      refreshQuality(b, data, before);
    }
    lines.push(`${p.title}: ${(p.sources ?? []).length} tractatus bound together, +${p.bonus ?? 1} Quality each.`);
  } else if (p.kind === 'annotate') {
    const b = source(p.sourceUid);
    if (b) {
      const gain = annotateGain(b, p.authorScore ?? 0);
      b.level += gain;
      b.annotated = (b.annotated ?? 0) + gain;
      b.authorScore = p.authorScore;
      lines.push(`${b.title} annotated: Level ${b.level} (+${gain}).`);
    }
  }
  return lines;
}

/** The project a character's writing season works: the one chosen, else the first unfinished. */
export const writingFor = (c: Character, projectUid?: string) => (c.writing ?? []).find((p) => !p.done && p.uid === projectUid) ?? (c.writing ?? []).find((p) => !p.done);

// ------------------------------------------------------------------------------ The covenant's scriptorium

/** A scribe specialist's copying rate and corruption risks: Magic Theory for the Arts, the language to 3, a Realm Lore for supernatural Abilities. */
export function specialistCopy(sp: Covenant['specialists'][number], b: LibraryBook, data?: GameData): { scribe: number; rate: number; problems: string[] } {
  const ab = specAbilities(sp);
  const get = (id: string, re?: RegExp) => ab.filter((a) => a.id === id && (!re || re.test(a.param ?? '') || re.test(a.label ?? ''))).reduce((m, a) => Math.max(m, a.score), 0);
  const scribe = Math.max(get('profession-type', SCRIBE), ...ab.filter((a) => SCRIBE.test(a.label ?? '')).map((a) => a.score));
  const lang = Math.max(get('dead-language', new RegExp(`^${b.language}$`, 'i')), get('living-language', new RegExp(`^${b.language}$`, 'i')));
  const problems: string[] = [];
  if (lang < 3) problems.push(`${b.language} 3 or more`);
  if (get('artes-liberales') < 1) problems.push('Artes Liberales');
  if ((b.subjectType === 'art' || b.subject === 'parma-magica' || b.kind === 'labText') && get('magic-theory') < 1) problems.push('Magic Theory 1 or more');
  if (b.subjectType === 'ability' && data?.abilityById.get(b.subject)?.type === 'Supernatural' && Math.max(get('magic-lore'), get('faerie-lore'), get('infernal-lore'), get('dominion-lore'), get(b.subject)) < 1) problems.push('a Realm Lore');
  return { scribe, rate: copyRate(scribe), problems };
}

/** Points a book needs copied: its Level for an Art summa, five times for an Ability, one season (a point) for a tractatus. */
export const copyNeeded = (b: LibraryBook) => (b.kind === 'summa' ? (b.subjectType === 'art' ? b.level : 5 * b.level) : b.kind === 'labText' || b.kind === 'castingTablet' ? Math.max(1, b.level) : 1);

/**
 * A season of the covenant's scribes copying: each scribe works the first copy assigned to them (or anyone's);
 * a tractatus takes a season (three quick ones), a summa its points; lab texts Profession: Scribe × 60 levels.
 */
export function scriptoriumSeason(cov: Covenant, scribeUid: string, data?: GameData): string[] {
  const sp = cov.specialists.find((s) => s.uid === scribeUid);
  const q = cov.scriptorium ?? [];
  // a copy assigned to a scribe no longer at the covenant goes to whoever is free
  const free = (j: (typeof q)[number]) => !j.scribeUid || !cov.specialists.some((s) => s.uid === j.scribeUid);
  const job = q.find((j) => j.scribeUid === scribeUid) ?? q.find(free);
  if (!sp || !job) return [];
  const b = cov.library.find((x) => x.uid === job.sourceUid);
  if (!b) {
    cov.scriptorium = q.filter((j) => j !== job);
    return [];
  }
  const { scribe, rate, problems } = specialistCopy(sp, b, data);
  const lab = b.kind === 'labText' || b.kind === 'castingTablet';
  const gain = lab ? Math.max(0, scribe) * 60 : b.kind === 'summa' ? rate * (job.quick ? 3 : 1) : job.quick ? 3 : 1;
  job.points += gain;
  if (job.points < copyNeeded(b)) return [`${sp.name || 'The scribe'} copies ${b.title}: ${job.points} of ${copyNeeded(b)}.`];
  cov.scriptorium = q.filter((j) => j !== job);
  const copy = copyOfBook(b, { quick: job.quick && !lab, corrupt: problems.length > 0, by: sp.name, data });
  if (lab) copy.quality = b.quality;
  cov.library.push(copy);
  return [`${sp.name || 'The scribe'} finishes ${copy.title}${problems.length ? `: corrupt, lacking ${problems.join(', ')}` : `: Quality ${copy.quality}`}.`];
}

/** A year of the scriptorium: each scribe specialist copies in their working seasons. */
export function scriptoriumYear(cov: Covenant, data?: GameData): string[] {
  if (!cov.scriptorium?.length) return [];
  const out: string[] = [];
  const scribes = cov.specialists.filter((s) => !s.characterId && !s.hired && countOf(s) > 0 && (s.role === 'scribe' || specAbilities(s).some((a) => a.id === 'profession-type' && SCRIBE.test(a.param ?? ''))));
  for (const s of scribes) for (let i = 0; i < workSeasons(s).work; i++) out.push(...scriptoriumSeason(cov, s.uid, data));
  if (!scribes.length) out.push('Books wait in the scriptorium, but the covenant has no scribe to copy them.');
  return out;
}

/** Open a book to enchantment and start its clarification: the magus's season and 8 pawns of Vim (purse first, then the covenant's). */
export function startClarifying(c: Character, cov: Covenant, b: LibraryBook, year: number, season: Season, aura: number): string | undefined {
  const purse = c.purse?.vis ?? [];
  const fromPurse = purse.filter((v) => v.art === 'Vi' || v.pair === 'Vi').reduce((t, v) => t + v.pawns, 0) >= OPEN_BOOK_PAWNS;
  const paid = takeVis(fromPurse ? purse : cov.visStocks, ['Vi'], OPEN_BOOK_PAWNS);
  if (!paid.ok) return `No ${OPEN_BOOK_PAWNS} pawns of Vim vis, in the purse or the covenant’s stocks.`;
  b.clarifying = { since: year, aura, by: c.name };
  const e = newSeasonEntry(year, season, 'other', `Opened ${b.title} for enchantment, to clarify it (${OPEN_BOOK_PAWNS} pawns of Vim${fromPurse ? '' : ' from the covenant'})`);
  e.visUsed = [{ art: 'Vi', pawns: OPEN_BOOK_PAWNS }];
  c.seasonLog.push(e);
  return undefined;
}
