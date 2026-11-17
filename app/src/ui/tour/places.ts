// Where a tutorial step happens: the address of each page a step can open, made from what the
// tutorial is following, and the steps several character tutorials share.

import { R, type DiceSub, type SagaTab, type TableTab } from '../routes';
import { OPTIONAL_RULES } from '../../engine/optional';
import type { TourCtx, TourStep } from './tours';
// a page with tabs is named with its tab, the first one too, so a step goes there from any other tab
export const saga = (c: TourCtx) => (c.sagaId ? `/saga/${c.sagaId}?tab=saga` : undefined);
export const sagaPage = (page: string) => (c: TourCtx) => (c.sagaId ? `/saga/${c.sagaId}/${page}` : undefined);
export const wizard = (c: TourCtx) => (c.sagaId && c.charId ? `/saga/${c.sagaId}/character/${c.charId}/create` : undefined);
export const sheet = (tab: string) => (c: TourCtx) => (c.sagaId && c.charId ? `/saga/${c.sagaId}/character/${c.charId}?tab=${tab}` : undefined);
export const covenant = (tab: string) => (c: TourCtx) => (c.sagaId && c.covId ? `/saga/${c.sagaId}/covenant/${c.covId}?tab=${tab}` : undefined);
export const page = (path: string) => () => path;
/** A tab of the Saga Overview. */
export const sagaTab = (tab: SagaTab) => (c: TourCtx) => (c.sagaId ? `${R.saga(c.sagaId)}?tab=${tab}` : undefined);
/** A page of the Game Table. */
export const table = (tab: TableTab) => (c: TourCtx) => (c.sagaId ? `${R.table(c.sagaId)}?tab=${tab}` : undefined);
/** The Game Table's Seasons page, planning the tour's character's season in full. */
export const plan = (c: TourCtx) => (c.sagaId ? `${R.table(c.sagaId)}?tab=seasons${c.charId ? `&who=${c.charId}` : ''}` : undefined);
/** A part of the Game Table's Dice page, for the tour's character. */
export const society = (sub: 'news' | 'agents' | 'society') => (c: TourCtx) => (c.sagaId ? `${R.table(c.sagaId)}?tab=society${sub !== 'news' ? `&sub=${sub}` : ''}${c.charId ? `&who=${c.charId}` : ''}` : undefined);
export const dice = (sub: DiceSub) => (c: TourCtx) => (c.sagaId ? `${R.table(c.sagaId)}?tab=dice${sub !== 'roll' ? `&sub=${sub}` : ''}${c.charId ? `&who=${c.charId}` : ''}` : undefined);
export const guided = (c: TourCtx) => (c.sagaId && c.charId ? `/saga/${c.sagaId}/character/${c.charId}/guided` : undefined);
export const guidedTab = (tab: string) => (c: TourCtx) => (c.sagaId && c.charId ? `/saga/${c.sagaId}/character/${c.charId}/guided?tab=${tab}` : undefined);

// the Concept step of every character tour: the guided build to step into, or a whole draft made at once
export const concept = (body: string, target: string[] = ['guided-build', 'step-basics']): TourStep => ({
  title: 'Concept',
  body: `${body} Short of time? **Build the whole character for me** makes a complete, legal draft from the themes you picked, and every choice says why.`,
  at: wizard, needs: 'character', wizard: 'basics', target,
  actions: [{ id: 'buildDraft', label: 'Build the whole character for me' }],
  detour: { tour: 'guided', label: 'Walk me through the guided build' },
});

// the optional rules that start off, and the Tribunals with customs of their own, as the rules list has them
export const startOff = OPTIONAL_RULES.filter((r) => !r.defaultOn && !r.tribunal).map((r) => r.label.toLowerCase());
export const tribunals = [...new Set(OPTIONAL_RULES.flatMap((r) => (r.tribunal ? [r.tribunal] : [])))];
export const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : (xs[0] ?? ''));

// the wizard steps every kind of character shares, closing each character tour
export const finishing: TourStep[] = [
  {
    title: 'Personality & Gear',
    body: 'Personality Traits, Reputations, Confidence, weapons and armor. A Flaw that gives a trait has already put it here.',
    at: wizard, needs: 'character', wizard: 'personality', target: 'step-personality',
  },
  {
    title: 'The Rules check',
    body: 'Beside every step, the **Rules check** lists what is left on that step with the book and page, and many issues have a one-click fix. The recommendations below it suggest what suits the concept.',
    at: wizard, needs: 'character', target: ['rules-check', 'step-review'],
  },
  {
    title: 'Review and finalize',
    body: '**Review** lists every issue at once. You may finalize anyway: what is left stays visible on the sheet, and anything you **Allow** is recorded as a troupe ruling. **Finalize character** turns the draft into the in-play sheet; creation can be reopened later.',
    at: wizard, needs: 'character', wizard: 'review', target: 'finalize',
  },
  {
    title: 'The character sheet',
    body: 'Once finished, the sheet is for reference: where the character stands. Wounds and Fatigue on **Combat & Health**, the season log and aging on **Seasons & Aging**, what they own on **Lab, Items & Familiar**. What happens in play is done at the **Game Table** (Dice, Seasons, Possessions, Health & recovery) and lands back here; each card says where. Click any underlined total to see how it is worked out. **Stat block** gives a printable summary.',
    at: sheet('overview'), needs: 'character', target: ['tab-combat', 'tab-overview'],
  },
];
