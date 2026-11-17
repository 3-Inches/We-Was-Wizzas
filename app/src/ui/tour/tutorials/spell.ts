import { sagaPage, plan } from '../places';
import type { Tour } from '../tours';

export const spellTour: Tour = {
  id: 'spell',
  title: 'Design a spell',
  blurb: 'Work a new spell out from the guidelines: base level, Range, Duration and Target, then invent it in the lab.',
  group: 'Magic',
  charType: 'magus',
  inSaga: true,
  practice: { type: 'magus', label: 'a practice magus' },
  steps: [
    {
      title: 'Spells & design',
      body: 'Choose the magus the spell is for, so the page shows their Lab Total and Casting Score. Without one it still works the level out.',
      at: sagaPage('spells?tab=design'), needs: 'saga', target: 'spells-magus',
    },
    {
      title: 'Find the guideline',
      body: 'The **Guidelines** tab lists every guideline for a Technique and Form, with the base level of each. Find the one for what the spell should do.',
      at: sagaPage('spells?tab=guidelines'), needs: 'saga', target: 'tab-guidelines',
    },
    {
      title: 'Design it',
      body: 'Set the Technique, Form and base level, then the Range, Duration and Target. Each step up adds a magnitude; add more for size or complexity, and requisites if it touches another Art.',
      at: sagaPage('spells?tab=design'), needs: 'saga', target: 'spell-design',
    },
    {
      title: 'The result',
      body: 'The spell’s level, whether it must be a Ritual, and the magus’s Lab Total and seasons to invent it. Name it and describe it, then **Add** it to the magus or **Save** it to the saga’s spell list.',
      at: sagaPage('spells?tab=design'), needs: 'saga', target: 'spell-result',
    },
    {
      title: 'Invent it in play',
      body: 'A finished magus invents a spell in the laboratory, a season at a time: on the Game Table’s **Seasons** page, plan their season in full, or start it under **Lab projects** there.',
      at: plan, needs: 'character', target: ['lab-projects', 'plan-season', 'table-plan'],
    },
    {
      title: 'Master it',
      body: 'Each spell has a **Mastery** score: it adds to the Casting Total and takes a botch die off, and each level brings a special ability the player chooses (Fast Casting, Penetration, Quiet Casting…). The **Spell Mastery** card, in the same season in full, puts experience on a spell (a season’s practice adds its own) and asks for the ability when a new level comes.',
      at: plan, needs: 'character', target: ['spell-mastery', 'table-plan'],
    },
  ],
};
