import { wizard, sheet } from '../places';
import type { Tour } from '../tours';

export const powerTour: Tour = {
  id: 'power',
  title: 'Design a power',
  blurb: 'Supernatural powers from Virtues such as Greater and Lesser Power, and the powers of magic characters.',
  group: 'Magic',
  inSaga: true,
  prefers: 'companion',
  wantsDraft: true,
  practice: { type: 'companion', draft: true, label: 'a practice companion, still in creation' },
  steps: [
    {
      title: 'Powers come from Virtues',
      body: 'Greater, Lesser, Personal and Ritual Power, Heroes’ Birthright and Strong Angelic Heritage each give levels of powers; a magic character’s Qualities do too. Open a character (a companion is the usual one) on its Virtues & Flaws step.',
      at: wizard, needs: 'character', wizard: 'virtues', target: ['virtue-browser', 'step-virtues'],
    },
    {
      title: 'Take the Virtue',
      body: 'Search the list for **Greater Power** or **Lesser Power** and take it. A **Supernatural powers** card appears above the list.',
      at: wizard, needs: 'character', wizard: 'virtues', target: ['virtue-browser', 'powers'],
    },
    {
      title: 'Design the power',
      body: 'A power is designed like a Hermetic spell. **+ Power** adds one to describe yourself; **From a spell…** copies a spell’s level and text. Set its level (and Penetration, which costs levels one for one); the card works out Initiative and Fatigue.',
      at: wizard, needs: 'character', wizard: 'virtues', target: 'powers',
    },
    {
      title: 'In play',
      body: 'On the sheet, the same card sits on the **Abilities** tab, where its powers keep growing in play.',
      at: sheet('abilities'), needs: 'character', target: ['powers', 'tab-abilities'],
    },
  ],
};
