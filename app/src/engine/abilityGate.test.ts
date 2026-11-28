// One gate for gaining an Ability (Batch F, item 1). One table of (Ability, character, answer),
// run on every road that adds an Ability the character has none of: the creation gate that the
// Abilities step and Quick build call (`abilityAvailability`), teaching (`teachableSubjects`),
// study from a book in Plan a season and the priorities (`studyProblem`), and the clock's Read.
// Training raises only an Ability the character has (PlanSeasonCard), so it adds none.

import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newSaga } from '../store/store';
import { studyProblem } from './books';
import { deriveCharacter } from './character/derive';
import { addVirtue, ensureAbility, newCharacter } from './character/factory';
import { abilityAvailability } from './character/restrictions';
import { newCovenant } from './covenant';
import { teachableSubjects } from './teaching';
import { DEFAULT_ADVANCE, advanceSeason } from './time';
import { abilityXpForScore } from './xp';
import type { CharType } from '../data';
import { DEFAULT_HOUSE_RULES, type Character, type LibraryBook } from './types';

const data = buildGameData();
const derive = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);

type Who = 'flambeau' | 'bjornaer' | 'merinita' | 'criamon' | 'gorgiastic' | 'grog' | 'arcane-grog';

function make(who: Who): Character {
  const type: CharType = who === 'grog' || who === 'arcane-grog' ? 'grog' : 'magus';
  const c = newCharacter(type, 's1');
  c.name = who;
  c.creation.finalized = true;
  c.age = 30;
  if (type === 'magus') c.house = who === 'gorgiastic' ? 'flambeau' : who;
  if (who === 'criamon') addVirtue(c, data, 'the-enigma', 'Minor');
  if (who === 'gorgiastic') addVirtue(c, data, 'gorgiastic', 'Minor');
  if (who === 'arcane-grog') addVirtue(c, data, 'arcane-lore', 'Minor');
  ensureAbility(c, 'living-language', { laterLife: abilityXpForScore(5) }, 'German');
  ensureAbility(c, 'dead-language', { laterLife: abilityXpForScore(5) }, 'Latin');
  ensureAbility(c, 'artes-liberales', { laterLife: abilityXpForScore(1) });
  return c;
}

/** [Ability, who, may they learn it] with the book's line for each answer. */
const TABLE: [string, Who, boolean][] = [
  // "This Ability cannot be learned by non-Bjornaer characters, even if they have access to Arcane Abilities" (DE line 7587)
  ['heartbeast', 'flambeau', false],
  ['heartbeast', 'bjornaer', true],
  // "It cannot be learned by other characters, even if they have access to Arcane Abilities" (DE line 7564)
  ['faerie-magic', 'flambeau', false],
  ['faerie-magic', 'merinita', true],
  // Charms are made by "all magi who study Faerie Magic" (HoH: MC line 3327)
  ['charms', 'flambeau', false],
  ['charms', 'merinita', true],
  // "Initiates who have not been apprenticed to a member of the House need at least (House) Lore 1" (HoH: MC line 201)
  ['house-merinita-lore', 'flambeau', true],
  ['house-merinita-lore', 'grog', false],
  // "Characters may not learn Enigmatic Wisdom without being initiated into the mystery of the Enigma" (DE line 10014)
  ['enigmatic-wisdom', 'flambeau', false],
  ['enigmatic-wisdom', 'criamon', true],
  // Gorgiastic magi "may have Enigmatic Wisdom ... scores after character creation" (DE line 4063)
  ['enigmatic-wisdom', 'gorgiastic', true],
  // "Unless you have The Gift, you cannot learn Parma Magica", even with Arcane Lore
  ['parma-magica', 'arcane-grog', false],
  ['parma-magica', 'flambeau', true],
  // Arcane Abilities need a Virtue or a magus (DE line 1149)
  ['magic-lore', 'grog', false],
  ['magic-lore', 'arcane-grog', true],
  ['brawl', 'grog', true],
];

/** A teacher with every Ability in the table at 5. */
function teacher(): Character {
  const t = make('bjornaer');
  t.name = 'Teacher';
  ensureAbility(t, 'teaching', { laterLife: abilityXpForScore(3) });
  for (const id of new Set(TABLE.map((r) => r[0]))) ensureAbility(t, id, { laterLife: abilityXpForScore(5) });
  return t;
}

const book = (subject: string): LibraryBook => ({ uid: `b-${subject}`, title: `De ${subject}`, kind: 'summa', subjectType: 'ability', subject, level: 5, quality: 10, language: 'Latin' });

describe('one gate for gaining an Ability, on every road', () => {
  for (const [id, who, ok] of TABLE) {
    it(`${id} for a ${who}: ${ok ? 'may' : 'may not'} learn it`, () => {
      const c = make(who);
      const d = derive(c);
      // the creation gate, which the Abilities step and Quick build call
      expect(abilityAvailability(d, data, id).ok, 'creation and Quick build').toBe(ok);
      // teaching: offered, or blocked with a reason
      const t = teacher();
      const lesson = teachableSubjects({ c: t, d: derive(t) }, { c, d }, data);
      const name = data.abilityById.get(id)!.name;
      expect(lesson.subjects.some((x) => x.label === name), 'teaching').toBe(ok);
      if (!ok) expect(lesson.blocked.some((x) => x.label === name), 'teaching says why').toBe(true);
      // study from a book (Plan a season, the priorities)
      expect(studyProblem(c, d, data, book(id)) === undefined, `study: ${studyProblem(c, d, data, book(id))}`).toBe(ok);
      // the clock's Read
      const s = newSaga('Gate');
      s.currentYear = 1220;
      s.currentSeason = 'Spring';
      const cov = newCovenant(s.id, 1220);
      cov.memberIds.push(c.id);
      c.covenantId = cov.id;
      cov.library = [book(id)];
      c.standing = { kind: 'read', bookUid: book(id).uid, target: '' };
      const { state } = advanceSeason({ saga: s, characters: [c], covenants: [cov] }, data, { ...DEFAULT_ADVANCE, rollAging: false });
      expect(state.characters[0].abilities.some((a) => a.abilityId === id), 'the clock’s Read').toBe(ok);
    });
  }
});
