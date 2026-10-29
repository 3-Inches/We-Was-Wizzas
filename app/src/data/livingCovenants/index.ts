// The Tribunal books whose covenants the toolkit can build into a saga as living covenants.

import { RHINE } from './rhine';
import type { BookCovenant, TribunalBook } from './types';

export type { BookApproach, BookCovenant, BookMagus, BookOthers, BookRelation, BookService, TribunalBook } from './types';

export const TRIBUNAL_BOOKS: TribunalBook[] = [RHINE];

/** The book for a saga's Tribunal ('Rhine'), if the toolkit has one. */
export function tribunalBook(tribunal: string | undefined): TribunalBook | undefined {
  return TRIBUNAL_BOOKS.find((t) => t.tribunal === tribunal);
}

export function bookCovenant(id: string | undefined): { book: TribunalBook; cov: BookCovenant } | undefined {
  for (const book of TRIBUNAL_BOOKS) {
    const cov = book.covenants.find((c) => c.id === id);
    if (cov) return { book, cov };
  }
  return undefined;
}
