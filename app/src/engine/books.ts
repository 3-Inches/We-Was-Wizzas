// Writing books (DE Writing Books, Long-Term Events; Covenants, Extended Suggestions on the Quality
// of Books). Core rules: a summa's Quality is the author's Communication + 6 + Virtue bonuses, plus
// a bonus for writing it below half her score (+1 per Level for an Art, +3 for an Ability, never
// more than the base Quality); a tractatus is Communication + 6 + Virtues. The extended rules replace
// the 6 with 3 plus skilled artisans and resonant materials. Lab Specializations do not apply:
// Texts helps with laboratory texts, not books.

import type { DerivedCharacter } from './character/derive';

export interface BookPlan {
  kind: 'summa' | 'tractatus';
  isArt: boolean;
  /** the author's score in the subject */
  score: number;
  /** summa Level chosen (summae only) */
  level?: number;
  com: number;
  /** the author's score in the language the book is written in */
  language: number;
  /** Covenants' extended rules: skilled scribe, binder and illuminator (Profession 6+), resonant materials (0–3) */
  extended?: { scribe: boolean; binder: boolean; illuminator: boolean; resonance: number };
}

export interface BookResult {
  quality: number;
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

export function planBook(d: DerivedCharacter, p: BookPlan): BookResult {
  const problems: string[] = [];
  const notes: string[] = [];
  if (p.isArt ? p.score < 5 : p.score < 2) problems.push(`An author needs a score of at least ${p.isArt ? '5 in an Art' : '2 in an Ability'} to write a useful book.`);
  if (p.language < 5) problems.push('An author needs a score of at least 5 in the language the book is written in.');
  const virtues = writingBonuses(d);
  const virtueTotal = virtues.reduce((s, v) => s + v.value, 0);
  const ext = p.extended;
  const parts: { label: string; value: number }[] = [{ label: "Author's Communication", value: p.com }];
  let artisans = 0;
  if (ext) {
    parts.push({ label: 'Base (extended rules)', value: 3 });
    for (const [on, label] of [[ext.scribe, 'Skilled scribe'], [ext.binder, 'Skilled binder'], [ext.illuminator, 'Skilled illuminator']] as const) {
      if (on) {
        parts.push({ label, value: 1 });
        artisans += 1;
      }
    }
    const res = Math.max(0, Math.min(3, ext.resonance));
    if (res) parts.push({ label: 'Resonant materials', value: res });
    artisans += res;
  } else parts.push({ label: 'Base', value: 6 });
  parts.push(...virtues);
  const base = parts.reduce((s, x) => s + x.value, 0);
  const maxLevel = Math.floor(p.score / 2);
  const perSeason = p.com + p.language;
  if (p.kind === 'tractatus') {
    return {
      quality: base, parts, maxLevel, level: 0, perSeason, needed: 0, seasons: 1,
      tractatusLimit: Math.ceil(p.score / (p.isArt ? 5 : 2)), problems,
      notes: [`One season. At most ${Math.ceil(p.score / (p.isArt ? 5 : 2))} tractatus on this subject (${p.isArt ? 'a fifth of an Art' : 'half an Ability'}, rounded up).${ext ? ' An Art tractatus is at most Quality 17 in practice.' : ''}`],
    };
  }
  const level = Math.max(1, Math.min(p.level ?? maxLevel, maxLevel || 1));
  if ((p.level ?? maxLevel) > maxLevel) problems.push(`A summa's Level is at most half the author's score: ${maxLevel}.`);
  const drop = Math.max(0, maxLevel - level);
  const perLevel = p.isArt ? 1 : 3;
  // the bonus for writing below half the score never exceeds the base Quality (core), or
  // Communication + Virtues + artisans + 3 (extended)
  const cap = ext ? p.com + virtueTotal + artisans + 3 : base;
  const bonus = Math.min(drop * perLevel, Math.max(0, cap));
  if (bonus) parts.push({ label: `Written ${drop} Level${drop > 1 ? 's' : ''} below half the score (${perLevel} each${bonus < drop * perLevel ? `, capped at ${cap}` : ''})`, value: bonus });
  let quality = base + bonus;
  if (ext && p.isArt && quality > 35 - level) notes.push(`An Art summa of Level ${level} is at most Quality ${35 - level} in practice (Covenants).`);
  if (!ext) quality = Math.min(quality, 2 * base);
  const needed = p.isArt ? level : 5 * level;
  const seasons = perSeason > 0 ? Math.ceil(needed / perSeason) : Infinity;
  if (perSeason <= 0) problems.push('Communication + Language is 0 or less: the book can never be finished.');
  notes.push(`Each season of writing adds Communication + Language = ${perSeason} points; the book needs ${needed} (${p.isArt ? 'its Level' : 'five times its Level'}).`);
  return { quality, parts, maxLevel, level, perSeason, needed, seasons, tractatusLimit: Math.ceil(p.score / (p.isArt ? 5 : 2)), problems, notes };
}
