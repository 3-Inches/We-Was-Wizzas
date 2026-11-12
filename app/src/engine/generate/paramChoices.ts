// The choices a Virtue or Flaw still needs (a Characteristic, an Art, an Ability, a heritage, a fear),
// made at random for a character the toolkit makes: Quick build, and the covenant's Immunity's Flaw
// given to its people (any of them does, since the aura holds it off).

import { ARTS, CHARACTERISTICS, FORMS, TECHNIQUES, type GameData } from '../../data';
import type { CharVirtue, Character } from '../types';

/** Free-text choices the generator can make up for an NPC (the rest are left for the troupe to decide). */
const TEXT_CHOICES: Record<string, string[]> = {
  Duty: ['to their lord', 'to their family', 'to the covenant', 'to the Church', 'to an oath sworn long ago'],
  Fear: ['the dark', 'deep water', 'fire', 'heights', 'the dead', 'dogs', 'enclosed places'],
  Goal: ['to restore the family name', 'to find a lost sibling', 'to avenge a wrong', 'to see Jerusalem', 'to win a lord’s favor'],
  Enemies: ['a rival family', 'a local lord', 'a band of outlaws', 'a rival covenant'],
  'Feud with': ['a neighboring family', 'a rival guild', 'a village across the river'],
  'Grudge against': ['a former master', 'a cheating merchant', 'the village priest'],
  'Object of hatred': ['the lord who wronged them', 'foreigners', 'faeries'],
  Compulsion: ['gambling', 'counting things', 'hoarding trinkets'],
  Obsession: ['cleanliness', 'collecting relics', 'a lost love'],
  Secret: ['a killing in their past', 'heresy', 'a faerie parent', 'years as an outlaw'],
  Vow: ['of poverty', 'of chastity', 'never to strike first', 'to fast on Fridays'],
  Mentor: ['a retired knight', 'an old scholar', 'a village wise woman'],
  Beloved: ['a childhood sweetheart', 'someone far away'],
  Terrain: ['Forest', 'Mountain', 'Marsh', 'Town', 'Steppe'],
  'Terrain (Forest, Mountain, Steppe, Town...)': ['Forest', 'Mountain', 'Marsh', 'Town', 'Steppe'],
  // Hermetic Virtues and Flaws (DE, Hermetic Virtues and Flaws)
  Cycle: ['by day', 'by night', 'under a waxing moon', 'under a waning moon', 'in spring and summer', 'in autumn and winter', 'on Sundays and holy days'],
  Circumstance: ['in a storm', 'at night', 'at dawn and dusk', 'under the full moon', 'near running water', 'in a forest', 'when angry', 'while singing'],
  'Focus (e.g. weather, necromancy, birds)': ['animals', 'plants', 'weather', 'the human body', 'necromancy', 'the mind', 'illusions', 'fire', 'water', 'stone and metal', 'wards'],
  'Focus (e.g. healing, self-transformation)': ['healing', 'self-transformation', 'wolves', 'horses', 'birds', 'trees', 'metals', 'lightning', 'light and darkness', 'doors and locks'],
  'Field of Potent Magic': ['healing', 'wards', 'fire', 'storms', 'beasts', 'illusions', 'the dead', 'travel'],
  'Two Te+Fo combinations (e.g. InHe & InAn)': ['CrIg & PeIg', 'InAn & ReAn', 'MuCo & MuAn', 'CrAq & PeAq', 'ReTe & PeTe', 'InMe & ReMe', 'CrHe & PeHe'],
  Restriction: ['while touching iron', 'in sunlight', 'on consecrated ground', 'while bound', 'standing in running water'],
  Condition: ['touching the target', 'singing', 'dancing', 'holding a staff', 'drawing a sigil in the air'],
  // other Virtues and Flaws
  Sin: ['Pride', 'Envy', 'Wrath', 'Sloth', 'Greed', 'Gluttony', 'Lust'],
  Hazard: ['cold', 'heat', 'poison', 'disease', 'fire', 'drowning'],
  Animal: ['wolf', 'bear', 'raven', 'boar', 'fox', 'hare', 'otter', 'seal', 'cat'],
  Companion: ['a talking raven', 'a faerie hound', 'a restless ghost', 'a cat that is more than it seems'],
  Commodity: ['wine', 'horses', 'gems', 'cloth', 'spices', 'books', 'furs'],
  Environment: ['the forest', 'the mountains', 'the marshes', 'the sea coast', 'the river valley', 'the moors'],
  Land: ['the old forest', 'the hills of home', 'the river valley', 'the moorland'],
  Prohibition: ['never to eat meat', 'never to refuse hospitality', 'never to sleep under a roof', 'never to tell a lie', 'never to cross running water by a bridge'],
  'Artistic ability (e.g. Music)': ['Music', 'Carving', 'Dance', 'Painting', 'Poetry'],
};

/** Ability Block: a class of Abilities the character has none of, as the Flaw requires (DE, Ability Block). */
function blockedClasses(c: Character, data: GameData): string[] {
  const has = (types: string[]) => c.abilities.some((a) => types.includes(data.abilityById.get(a.abilityId)?.type ?? ''));
  const logic = ['artes-liberales', 'philosophiae', 'civil-and-canon-law', 'common-law', 'medicine', 'theology'];
  return [
    ...(has(['Martial']) ? [] : ['Martial Abilities']),
    ...(c.abilities.some((a) => logic.includes(a.abilityId)) ? [] : ['logic: Artes Liberales, Philosophiae, Law, Medicine and Theology']),
    ...(c.abilities.some((a) => a.abilityId === 'living-language' && !a.native) || c.abilities.some((a) => a.abilityId === 'dead-language') ? [] : ['languages other than the native tongue']),
  ];
}

/** Choices that depend on the character: Vulnerable Magic's undoing, the aura a power needs, the Virtue a charm holds. */
function choicesFor(c: Character, data: GameData, defId: string): string[] | undefined {
  const supernatural = c.abilities.filter((a) => data.abilityById.get(a.abilityId)?.type === 'Supernatural').map((a) => data.abilityById.get(a.abilityId)!.name);
  switch (defId) {
    case 'vulnerable-magic-flaw':
      return ['crossing running water', 'touching iron', 'the touch of a priest', 'salt scattered on its path'];
    case 'necessary-realm-aura-for-ability-flaw':
      return supernatural.length ? supernatural.map((n) => `a Magic aura for ${n}`) : ['a Magic aura for its powers'];
    case 'greater-charm-flaw': {
      const own = c.virtues.filter((v) => v.defId !== defId && data.vfById.get(v.defId)?.kind === 'virtue' && data.vfById.get(v.defId)?.categories.includes('Supernatural'));
      return own.length ? own.map((v) => data.vfById.get(v.defId)!.name) : undefined;
    }
    default:
      return undefined;
  }
}

/** The choices one Virtue or Flaw could take for this character; undefined when it needs none the toolkit can make. */
export function paramChoices(c: Character, data: GameData, v: CharVirtue): string[] | undefined {
  const spec = data.vfById.get(v.defId)?.param;
  if (!spec || spec.optional) return undefined;
  const choices =
    spec.options ??
    spec.groups?.flatMap((gr) => gr.options) ??
    (spec.kind === 'characteristic' ? [...CHARACTERISTICS] : spec.kind === 'art' ? [...ARTS] : spec.kind === 'technique' ? [...TECHNIQUES] : spec.kind === 'form' ? [...FORMS] : spec.kind === 'realm' ? ['Divine', 'Faerie', 'Infernal', 'Magic'] : undefined) ??
    (spec.kind === 'ability' ? c.abilities.filter((a) => !spec.abilityTypes || spec.abilityTypes.includes(data.abilityById.get(a.abilityId)?.type as never)).map((a) => a.abilityId) : undefined) ??
    (v.defId === 'ability-block-flaw' ? blockedClasses(c, data) : (choicesFor(c, data, v.defId) ?? TEXT_CHOICES[spec.label]));
  // a repeatable Virtue's copies each take a different choice
  const taken = new Set(c.virtues.filter((x) => x.defId === v.defId && x !== v).map((x) => x.param));
  const free = choices?.filter((x) => !taken.has(x));
  return free?.length ? free : undefined;
}

/** A choice each Virtue and Flaw still needs (a Characteristic, an Art, an Ability, a heritage), chosen at random. */
export function fillChoices(c: Character, data: GameData, rng: () => number) {
  for (const v of c.virtues) {
    if (v.param && v.param !== 'to be decided') continue;
    const free = paramChoices(c, data, v);
    if (free) v.param = free[Math.floor(rng() * free.length)];
  }
}

