import { sagaPage, wizard, concept, finishing } from '../places';
import type { Tour } from '../tours';

export const grogTour: Tour = {
  id: 'grog',
  title: 'Make a grog',
  blurb: 'A guard, servant or craftsman of the covenant: quick to make and simple to play.',
  group: 'Characters',
  charType: 'grog',
  inSaga: true,
  makesCharacter: true,
  steps: [
    {
      title: 'Create the grog',
      body: 'Under **Create a character**, press **Grog**. The tutorial follows the new character.',
      at: sagaPage('people'), needs: 'saga', target: 'create-grog', advance: {},
    },
    concept('A name and a job is enough: guard, cook, groom, scout. Pick a theme such as Warrior or Craftsman.', ['concept-themes', 'step-basics']),
    {
      title: 'Virtues & Flaws',
      body: 'Grogs take Minor Virtues and Flaws only, a few points of each (the Rules check shows the troupe’s limit). Covenfolk is the usual Social Status.',
      at: wizard, needs: 'character', wizard: 'virtues', target: ['virtue-balance', 'step-virtues'],
    },
    {
      title: 'Characteristics and Abilities',
      body: 'The same as any character: Characteristic points, then Early Childhood and Later Life experience. A guard wants a weapon Ability and Athletics or Awareness.',
      at: wizard, needs: 'character', wizard: 'abilities', target: ['xp-pools', 'step-abilities'],
    },
    ...finishing,
  ],
};
