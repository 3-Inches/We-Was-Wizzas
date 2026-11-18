// Which hedge tradition a character follows (Hedge Magic, Revised Edition), by the Virtues and
// Abilities that make one. The Game Table's Hedge magic page shows each tradition's cards by these,
// and the hedge magic tutorial follows whichever the character has.

import type { Character } from './types';
import { LEARNED_FORMS, LEARNED_TECHNIQUES } from '../data/hedgeLearned';
import { RUNES } from '../data/hedgeVitkir';
import { GRUAGACH_FORMS, GRUAGACH_TECHNIQUES } from '../data/hedgeGruagach';
import { ELEMENTAL_ART_IDS, ELEMENTS } from '../data/hedgeElemental';
import { isFolkWitch } from './folkWitch';

const holds = (c: Pick<Character, 'virtues' | 'abilities'>, ids: readonly string[]) => c.virtues.some((v) => ids.includes(v.defId)) || c.abilities.some((a) => ids.includes(a.abilityId));

const LEARNED_IDS = ['mathematicus-of-bologna', ...LEARNED_TECHNIQUES.map((t) => t.id), ...LEARNED_FORMS.map((f) => f.id)];
/** A learned magician: the Virtues of their Arts, or charms and years with a master on the sheet. */
export const hasLearnedMagic = (c: Character) => !!c.learned?.charms?.length || !!c.learned?.trainingYears || holds(c, LEARNED_IDS);

const ELEMENTAL_IDS = [...ELEMENTAL_ART_IDS, 'type-summoning', 'type-controlling', 'type-divining', 'type-refining'];
/** An elementalist: a Technique or Form Virtue of elemental magic. */
export const isElementalist = (c: Character) => holds(c, ELEMENTAL_IDS);

const GRUAGACH_IDS = ['gruagach', ...GRUAGACH_TECHNIQUES.flatMap((t) => [t.id, t.virtue]), ...GRUAGACH_FORMS.flatMap((f) => [f.id, f.virtue])];
export const hasGruagach = (c: Character) => holds(c, GRUAGACH_IDS);

const VITKI_IDS = ['vitki', ...RUNES.map((r) => r.id)];
export const hasVitki = (c: Character) => holds(c, VITKI_IDS);

const NIGHTWALKER_IDS = ['nightwalker', 'versatile-phantasticum', 'half-taltos', 'hamr', 'sleepwalker'];
export const hasNightwalker = (c: Character) => c.virtues.some((v) => NIGHTWALKER_IDS.includes(v.defId));

export const hasHerbalism = (c: Character) => holds(c, ['mythic-herbalism']);

export { isFolkWitch };

/** Anyone the Hedge magic page is for. */
export const hasHedgeMagic = (c: Character) => hasLearnedMagic(c) || hasHerbalism(c) || isFolkWitch(c) || hasGruagach(c) || hasNightwalker(c) || hasVitki(c) || isElementalist(c);

export type HedgeTradition = 'witch' | 'learned' | 'elemental' | 'gruagach' | 'vitki' | 'nightwalker';

/**
 * The tradition a character practices, when they have enough of it to work its magic: the
 * tradition's own Virtue, or a Technique with a Form. A single Art taken on its own (a gruagach's
 * Vision, a learned magician's Magicam) shows on the page but casts nothing, so it is not counted.
 */
export function hedgeTradition(c: Character): HedgeTradition | undefined {
  const pair = (techs: readonly string[], forms: readonly string[]) => holds(c, techs) && holds(c, forms);
  if (isFolkWitch(c)) return 'witch';
  if (holds(c, ['mathematicus-of-bologna']) || !!c.learned?.charms?.length || pair(LEARNED_TECHNIQUES.map((t) => t.id), LEARNED_FORMS.map((f) => f.id))) return 'learned';
  if (holds(c, ELEMENTS.map((e) => e.ability))) return 'elemental';
  if (holds(c, ['gruagach']) || pair(GRUAGACH_TECHNIQUES.flatMap((t) => [t.id, t.virtue]), GRUAGACH_FORMS.flatMap((f) => [f.id, f.virtue]))) return 'gruagach';
  if (hasVitki(c)) return 'vitki';
  if (hasNightwalker(c)) return 'nightwalker';
  return undefined;
}
