// The core book's character templates (DE, Character Templates): "fully generated, and just need a name
// and a bit of background to fit them into your saga". Each is built from its stat block by the same
// reader as the Tribunal books' magi, ready to play, with the book's Customization Notes kept for the
// player who wants to change it.

import type { GameData } from '../data';
import { CHARACTER_TEMPLATES, type CharacterTemplate } from '../data/templates';
import { applyStatBlock } from './character/statBlock';
import { newCharacter } from './character/factory';
import type { Character, HouseRules, PersonalityTrait } from './types';
import { uid } from '../util/id';
import { TRIBUNAL_LANGUAGE } from './guided/autobuild';

export { CHARACTER_TEMPLATES, type CharacterTemplate };

/** "Angry +3, Brave +3, Loyal +1" as Personality Traits. */
export function personalityFrom(s: string): PersonalityTrait[] {
  return [...s.matchAll(/([A-Za-z' -]+?)\s*([+\-–−]\s*\d+)/g)].map((m) => ({ uid: uid(), trait: m[1].trim().replace(/^,\s*/, ''), score: Number(m[2].replace(/[–−]/, '-').replace(/\s/g, '')) }));
}

/**
 * A character from a template, in the saga's present: the book's Characteristics, Virtues and Flaws,
 * Abilities, Arts and spells, Personality Traits and equipment, finished and ready to play. `problems`
 * names anything the stat-block reader could not place (the test over every template keeps it empty).
 */
export function characterFromTemplate(t: CharacterTemplate, sagaId: string, year: number, data: GameData, rules: HouseRules, tribunal?: string): { c: Character; problems: string[] } {
  const c = newCharacter(t.type, sagaId, year);
  c.age = t.age;
  c.birthYear = year - t.age;
  if (t.gender) c.gender = t.gender;
  if (t.house) {
    c.house = t.house;
    // just out of apprenticeship (DE: 25 years old)
    c.creation.apprenticeshipStartAge = Math.max(5, t.age - 15);
    c.creation.yearsPostGauntlet = 0;
  }
  // "Native Language 5", "Living Language 5": the tongue of where the saga is set. With no Tribunal to say
  // which, the language is left unnamed for the player (the rules check asks for it).
  const known = TRIBUNAL_LANGUAGE[tribunal ?? ''];
  const tongue = known ?? 'French';
  const sheet = { ...t.sheet, abilities: t.sheet.abilities.replace(/\b(Native|Living) Language(?=\s+\d)/g, tongue) };
  const { problems } = applyStatBlock(c, sheet, data, rules);
  if (!known && /\b(Native|Living) Language\s+\d/.test(t.sheet.abilities)) {
    for (const a of c.abilities) if (a.abilityId === 'living-language' && a.param === tongue) a.param = '';
  }
  c.personality = personalityFrom(t.personality);
  c.creation.concept = t.house ? `A magus of ${t.name}` : t.name.replace(/^The /, '');
  c.description = `From the core book's template ${t.name}. ${t.notes}`.trim();
  c.creation.finalized = true;
  return { c, problems };
}
