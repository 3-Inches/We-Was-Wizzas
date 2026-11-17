import { sagaPage, wizard, concept, finishing } from '../places';
import type { Tour } from '../tours';

export const companionTour: Tour = {
  id: 'companion',
  title: 'Make a companion',
  blurb: 'A capable character without the Gift (a knight, scholar, priest or hedge witch) built the same step-by-step way.',
  group: 'Characters',
  charType: 'companion',
  inSaga: true,
  makesCharacter: true,
  steps: [
    {
      title: 'Create the companion',
      body: 'Under **Create a character**, press **Companion**. The tutorial follows the new character.',
      at: sagaPage('people'), needs: 'saga', target: 'create-companion', advance: {},
    },
    concept('Name, player, age and the idea of the character, and one to three themes. The **guided build** can suggest Virtues and Abilities from what you want.'),
    {
      title: 'Virtues & Flaws',
      body: 'Every character takes one Social Status (Covenfolk and Wanderer are free). Flaws pay for Virtues point for point; a Story Flaw draws the character into the saga’s stories. Supernatural Virtues bring powers and Abilities of their own.',
      at: wizard, needs: 'character', wizard: 'virtues', target: ['virtue-balance', 'step-virtues'],
    },
    {
      title: 'Characteristics',
      body: 'Share the Characteristic points among the eight Characteristics. Higher scores cost more, and a score below 0 gives points back.',
      at: wizard, needs: 'character', wizard: 'characteristics', target: 'step-characteristics',
    },
    {
      title: 'Abilities',
      body: 'Early Childhood, then Later Life experience for each year of age past five. An older character knows more, and one past 35 has begun to age.',
      at: wizard, needs: 'character', wizard: 'abilities', target: ['xp-pools', 'step-abilities'],
    },
    ...finishing,
  ],
};
