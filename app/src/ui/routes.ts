// Where each page lives, in one place, so a page that moves keeps every link to it. The saga's pages
// sit under /saga/:id: the Saga Overview (its settings, in tabs), the Game Table (play, in pages of
// its own: Overview, Seasons, Dice, Market & Treasury, City & Guild), the Covenants and People lists,
// a covenant's page and a character's sheet.

/** The Game Table's pages, in order. */
export const TABLE_TABS = ['overview', 'seasons', 'dice', 'market', 'guild'] as const;
export type TableTab = (typeof TABLE_TABS)[number];

/** The Saga Overview's tabs, in order: the saga's settings, its books, optional rules, the troupe's numbers and rulings, its own content, overrides, and its journal. */
export const SAGA_TABS = ['saga', 'books', 'optional', 'rules', 'custom', 'mechanics', 'journal'] as const;
export type SagaTab = (typeof SAGA_TABS)[number];

const q = (params: Record<string, string | undefined>) => {
  const s = Object.entries(params)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return s ? `?${s}` : '';
};

export const R = {
  saga: (sagaId: string, tab?: SagaTab) => `/saga/${sagaId}${q({ tab: tab && tab !== 'saga' ? tab : undefined })}`,
  table: (sagaId: string, tab?: TableTab, sub?: string, more: Record<string, string | undefined> = {}) => `/saga/${sagaId}/table${q({ tab: tab && tab !== 'overview' ? tab : undefined, sub, ...more })}`,
  seasons: (sagaId: string) => R.table(sagaId, 'seasons'),
  dice: (sagaId: string, sub?: string) => R.table(sagaId, 'dice', sub),
  market: (sagaId: string) => R.table(sagaId, 'market'),
  /** City & Guild, opened on a character's livelihood or a covenant's craftsmen */
  guild: (sagaId: string, o: { who?: string; cov?: string } = {}) => R.table(sagaId, 'guild', undefined, o),
  people: (sagaId: string) => `/saga/${sagaId}/people`,
  covenants: (sagaId: string) => `/saga/${sagaId}/covenants`,
  covenant: (sagaId: string, covId: string, tab?: string, sub?: string) => `/saga/${sagaId}/covenant/${covId}${q({ tab, sub })}`,
  character: (sagaId: string, c: { id: string; creation: { finalized?: boolean } }, tab?: string) => `/saga/${sagaId}/character/${c.id}${c.creation.finalized ? '' : '/create'}${q({ tab })}`,
  tribunal: (sagaId: string, tab?: string) => `/saga/${sagaId}/tribunal${q({ tab })}`,
};

/** The House rules page's old tabs, now the Saga Overview's. */
export function sagaTabForRulesTab(tab: string | null): SagaTab {
  return (SAGA_TABS as readonly string[]).includes(tab ?? '') ? (tab as SagaTab) : 'saga';
}
