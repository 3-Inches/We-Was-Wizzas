// Which cards a character's season in full draws, in what order, and why the rest are not drawn. The
// order is the owner's (roadmap 5.4): the character's own season work first (their tradition's cards,
// and the laboratory for a magus), then the planning, then the season log and aging, then the
// Mysteries and writing. Each card is drawn only where it can apply; one that cannot is named, with a
// line saying why, at the foot of the season.

import type { DerivedCharacter } from '../../engine/character/derive';
import type { Character, Covenant, Saga } from '../../engine/types';
import { optionOn } from '../../engine/optional';
import { isFolkWitch } from '../../engine/folkWitch';
import { elementalArts } from '../../engine/elementalMagic';
import { hasGruagach, hasVitki } from '../../engine/hedgeTraditions';
import { holyWorksOpen } from '../../engine/holy';
import { tradeScore } from '../../engine/books';
import { isTrade } from '../../engine/workshop';
import { mysteryWayIn } from '../../engine/initiation';
import { neverAges } from '../../engine/longterm';
import { artPairs } from '../character/LearnedCard';
import { devotionSeasonWorks } from './DevotionSeasonsCard';

export type SeasonCard =
  // the character's own season work
  | 'hedge' | 'holy' | 'devotion' | 'mason' | 'workshop' | 'lab' | 'research' | 'longevity' | 'apprentice'
  // the planning
  | 'plan' | 'standing' | 'priorities' | 'mastery' | 'insight'
  // the record
  | 'log' | 'aging'
  // last
  | 'mysteries' | 'writing';

export type SeasonGroup = 'own' | 'planning' | 'record' | 'last';

export interface SeasonCards {
  /** the cards drawn, in order, each with its group */
  shown: { card: SeasonCard; group: SeasonGroup }[];
  /** what is not drawn, and why: a line each, for the reader */
  hidden: { what: string; why: string }[];
}

const MASON = /mason/i;

/** The highest score among a character's languages, living or dead. */
const bestLanguage = (d: DerivedCharacter) => d.abilities.filter((a) => a.abilityId === 'living-language' || a.abilityId === 'dead-language').reduce((m, a) => Math.max(m, a.total), 0);
const score = (d: DerivedCharacter, id: string) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0);

/**
 * Something to write or copy: a book begun or finished and waiting for the library; a subject to write
 * on, 5 in an Art or 2 in an Ability, with 5 in a language (DE, Writing Books) and Artes Liberales to write
 * it down (DE, Artes Liberales: "covers the ability to read and write"); or the covenant's books to copy,
 * read with Artes Liberales and 3 in a language (DE, Corrupted Copies).
 */
export function hasSomethingToWrite(c: Character, d: DerivedCharacter, cov?: Covenant): boolean {
  if ((c.writing ?? []).some((p) => !p.done || !p.inLibrary)) return true;
  const lang = bestLanguage(d);
  const subject = (d.isMagus && Object.values(d.arts).some((a) => a.score >= 5)) || d.abilities.some((a) => a.score >= 2);
  if (score(d, 'artes-liberales') < 1) return false;
  if (subject && lang >= 5) return true;
  return !!cov?.library.length && lang >= 3;
}

/** The season in full for one character: the cards that apply, in the owner's order, and what is left out. */
export function seasonCards(c: Character, d: DerivedCharacter, saga: Saga, cov?: Covenant): SeasonCards {
  const shown: SeasonCards['shown'] = [];
  const hidden: SeasonCards['hidden'] = [];
  const add = (card: SeasonCard, group: SeasonGroup, applies: boolean, what?: string, why?: string) => {
    if (applies) shown.push({ card, group });
    else if (what && why) hidden.push({ what, why });
  };
  const magus = d.isMagus;

  // 1. their own season work: a magus's laboratory first, it is their tradition; then a hedge
  // tradition's, holy work, devotion and a trade
  const lab = () => {
    add('lab', 'own', magus);
    add('research', 'own', magus && (optionOn(saga, 'originalResearch') || !!c.research), magus ? 'Original research' : undefined, 'off in this saga’s optional rules');
    add('longevity', 'own', magus);
    add('apprentice', 'own', c.type === 'magus' && c.creation.finalized);
  };
  if (magus) lab();
  const hedge = artPairs(c, d).length > 0 || isFolkWitch(c) || elementalArts(c, d).forms.length > 0 || hasGruagach(c) || hasVitki(c);
  add('hedge', 'own', hedge, magus ? undefined : 'Hedge magic’s seasons', 'no hedge tradition with a season’s work');
  add('holy', 'own', holyWorksOpen(d).length > 0, 'Seasons of holy work', 'no Craft Amulets, Kabbalah, Merkavah or Gematria');
  add('devotion', 'own', devotionSeasonWorks(c, d).length > 0, 'Seasons of devotion', 'no Devotion to a saint, spiritual path or Ars Notoria');
  add('mason', 'own', !!cov && tradeScore(c, d, MASON) > 0, tradeScore(c, d, MASON) > 0 ? 'A mason’s season' : undefined, 'not a member of a covenant');
  // City & Guild's livelihood, once it is kept: it is begun on Game Table › City & Guild
  const usesCG = saga.enabledBooks.length === 0 || saga.enabledBooks.includes('CG');
  const trade = c.abilities.some((a) => isTrade(a.abilityId));
  add('workshop', 'own', usesCG && !!c.workshop, usesCG && trade ? 'Livelihood' : undefined, 'not kept yet; it is begun on Game Table › City & Guild');
  if (!magus) {
    lab();
    hidden.unshift({ what: 'Lab projects, original research and an apprentice', why: 'only a magus works in a Hermetic laboratory' });
  }

  // 2. the planning: what they do this season, and with a season nobody plans
  add('plan', 'planning', true);
  add('standing', 'planning', true);
  add('priorities', 'planning', true);
  add('mastery', 'planning', c.spells.length > 0, magus ? 'Spell Mastery' : undefined, 'no spells');
  add('insight', 'planning', c.virtues.some((v) => v.defId === 'secondary-insight'));

  // 3. the record: the seasons logged, and aging (a ritual one has, made for them by a magus, beside it)
  add('log', 'record', true);
  add('aging', 'record', !neverAges(c), 'Aging', 'a magic character, a faerie or an immortal does not age');
  // for anyone else, a ritual is made by a magus, often one outside the saga: its bonus is entered here
  if (!magus) add('longevity', 'record', true, 'Longevity Ritual', '');

  // 4. last: the Mysteries and writing, where they apply
  const mysteriesOn = optionOn(saga, 'mysteries') || (c.initiations ?? []).length > 0;
  add('mysteries', 'last', mysteriesOn && mysteryWayIn(c, d), 'Mysteries & Initiation', mysteriesOn ? 'not of a Mystery House, and no Mystery Lore, which an Initiate needs' : 'off in this saga’s optional rules');
  add('writing', 'last', hasSomethingToWrite(c, d, cov), 'Writing and copying', 'cannot write (no Artes Liberales), or nothing to write on (5 in an Art or 2 in an Ability, with 5 in a language) and no book to copy');
  return { shown, hidden };
}
