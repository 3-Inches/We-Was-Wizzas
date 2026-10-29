// The Rhine's rule for a new covenant (GotF, On the Founding of Covenants): the Tribunal recognizes
// none without a sponsor from each and every other covenant, who proclaims its petition worthy at a
// gathering. One magus suffices, though their fellows disagree, and never one of the founders.
// Failing to give a sponsor reflects badly on a covenant, so most agree to fairly modest terms unless
// they see the new covenant as a threat; the parens of a magus trained in the Rhine will likely sponsor
// from their covenant; and each sponsor presents a gift, worth what the sponsor is and feels.

import type { BookCovenant, TribunalBook } from '../data/livingCovenants';
import { RHINE_GILDS } from './tribunal';
import type { Character, Covenant, CovenantFounding, FoundingSponsor, Saga } from './types';

/** The covenants a new covenant needs a sponsor from: the book's, less one not yet admitted (Heorot until its motion carries). */
export function foundingCovenants(book: TribunalBook, saga: Saga): BookCovenant[] {
  const votes = saga.tribunalVotes ?? [];
  return book.covenants.filter((d) => !d.joins || votes.some((v) => v.motionId === d.joins && v.passed));
}

export type SponsorOutlook = 'easy' | 'modest' | 'steep' | 'unlikely';

export const OUTLOOK_TEXT: Record<SponsorOutlook, string> = {
  easy: 'Will sponsor for a token, or for the friendship.',
  modest: 'Fairly modest terms: failing to give a sponsor reflects badly on a covenant.',
  steep: 'Wants real concessions first: vis, a book, a service or a promise.',
  unlikely: 'Sees the new covenant as a threat: a sponsor only from a magus who disagrees with their fellows.',
};

/** How readily a covenant gives a sponsor, from how it stands with the players' covenant. */
export function sponsorOutlook(cov: Covenant | undefined): SponsorOutlook {
  const a = cov?.living?.attitude ?? 'neutral';
  return a === 'ally' || a === 'friendly' ? 'easy' : a === 'neutral' ? 'modest' : a === 'wary' ? 'steep' : 'unlikely';
}

/** The gilds the founders have angered ((Gild) Enmity): their magi will not sponsor the covenant. */
export function enmityGilds(founders: Character[]): string[] {
  const names = founders.flatMap((c) => c.virtues.filter((v) => v.defId === 'gild-enmity').map((v) => v.param ?? ''));
  return RHINE_GILDS.filter((g) => names.some((n) => n.toLowerCase().startsWith(g.tree.toLowerCase()))).map((g) => g.id);
}

/** The magi of a covenant who may sponsor: its living magi past apprenticeship, not one of the founders, and none of an angered gild. */
export function sponsorCandidates(cov: Covenant | undefined, chars: Character[], founders: Character[]): Character[] {
  if (!cov) return [];
  const barred = enmityGilds(founders);
  const ids = new Set(founders.map((c) => c.id));
  return chars.filter(
    (c) => cov.memberIds.includes(c.id) && c.type === 'magus' && !c.wounds.dead && !c.retired && c.rhine?.rank !== 'apprentice' && !ids.has(c.id) && !(c.rhine?.gild && barred.includes(c.rhine.gild)),
  );
}

export function sponsorOf(f: CovenantFounding | undefined, defId: string): FoundingSponsor {
  return f?.sponsors[defId] ?? { status: 'unasked' };
}

/** How the bid stands: the covenants that have promised a sponsor, those that refused, those still to ask. */
export function foundingProgress(book: TribunalBook, saga: Saga): { promised: BookCovenant[]; refused: BookCovenant[]; open: BookCovenant[]; of: number; ready: boolean } {
  const defs = foundingCovenants(book, saga);
  const by = (s: FoundingSponsor['status']) => defs.filter((d) => sponsorOf(saga.founding, d.id).status === s);
  const promised = by('promised');
  const refused = by('refused');
  const open = defs.filter((d) => !promised.includes(d) && !refused.includes(d));
  return { promised, refused, open, of: defs.length, ready: defs.length > 0 && promised.length === defs.length };
}

/**
 * At a gathering: a covenant with a sponsor from every other covenant is recognized; a bid that has
 * begun but lacks one is refused this time (it may try again at the next). Returns what to tell.
 */
export function foundingAtGathering(book: TribunalBook, saga: Saga, covenants: Covenant[], year: number): string | undefined {
  const f = saga.founding;
  if (!f?.covenantId || f.recognizedYear) return undefined;
  const ours = covenants.find((c) => c.id === f.covenantId);
  if (!ours) return undefined;
  const p = foundingProgress(book, saga);
  if (p.ready) {
    f.recognizedYear = year;
    return `${ours.name} is recognized by the ${book.tribunal} Tribunal: a sponsor from each of its ${p.of} covenants proclaims the petition worthy, and each presents a gift.`;
  }
  if (!p.promised.length && !p.refused.length) return undefined;
  const lacking = [...p.refused, ...p.open].map((d) => d.name);
  return `The ${book.tribunal} Tribunal refuses to recognize ${ours.name}: no sponsor from ${lacking.join(', ')}. The petition may come again at the next gathering.`;
}
