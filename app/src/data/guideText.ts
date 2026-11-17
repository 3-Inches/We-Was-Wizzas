// How the Guide's text is measured, the same way by its tests and by the limits in quality.test.ts:
// every run of prose in a block, its words and its sentences, with the markdown marks taken out.

import type { RpBlock, RpGuide } from './roleplay';

/** Every run of prose in a block. */
export function blockTexts(b: RpBlock): string[] {
  if ('p' in b) return [b.p];
  if ('heading' in b) return [];
  if ('points' in b) return b.points.map(([lead, text]) => `${lead} ${text}`);
  if ('list' in b) return b.list;
  if ('table' in b) return b.table.rows.flat();
  if ('tryThis' in b) return [b.tryThis];
  return [b.inApp];
}

/** Every run of prose in a guide, with the section it is in. */
export function guideTexts(g: RpGuide): { section: string; text: string }[] {
  return g.sections.flatMap((s) => s.blocks.flatMap((b) => blockTexts(b).map((text) => ({ section: s.id, text }))));
}

/** Markdown marks and a link's address taken out: what a reader reads. */
export const plain = (s: string) => s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\*+/g, '');
export const words = (s: string) => plain(s).split(/\s+/).filter(Boolean).length;
export const sentences = (s: string) => plain(s).split(/(?<=[.?!])\s+(?=[A-Z“])/);
