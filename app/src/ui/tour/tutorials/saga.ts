import { saga, page, sagaTab } from '../places';
import type { Tour } from '../tours';

export const sagaTour: Tour = {
  id: 'saga',
  title: 'Start a saga',
  blurb: 'For the storyguide or the troupe: name the saga, choose its Tribunal and books, and set the house rules everyone builds by.',
  group: 'The saga and covenant',
  inSaga: true,
  steps: [
    {
      title: 'The saga',
      body: 'A saga holds everything else. Its **Tribunal** brings that Tribunal’s customs and optional rules; the **starting year and season** say when play begins. After that the current season moves on only on the Game Table’s Seasons page.',
      at: saga, needs: 'saga', target: 'saga-card',
    },
    {
      title: 'Books',
      body: 'Choose the books the troupe uses. Only their Virtues, spells and rules appear in the pickers, so a player cannot take something from a book the saga does not use.',
      at: sagaTab('books'), needs: 'saga', target: 'tab-books',
    },
    {
      title: 'Optional rules',
      body: 'Supplement systems the troupe can turn on or off: illness, lab routines, aura variation, agents and the Society tools, House Mysteries, guilds, and the customs of the saga’s Tribunal. Each says what it adds, its book, and where it shows; turn one off and its cards leave the sheets.',
      at: sagaTab('optional'), needs: 'saga', target: ['optional-rules', 'tab-optional'],
      detour: { tour: 'optional', label: 'Show me where each one appears' },
    },
    {
      title: 'Creation rules & rulings',
      body: 'The numbers characters are built by (Characteristic points, Flaw limits, experience) and the troupe’s rulings. Change one and every character in the saga is checked against it.',
      at: sagaTab('rules'), needs: 'saga', target: 'tab-rules',
    },
    {
      title: 'Keep a copy',
      body: '**Export saga** saves everything to a file: a backup, or a way to share the saga with the troupe. **Import** on the Sagas page loads one.',
      at: saga, needs: 'saga', target: 'saga-export',
    },
    {
      title: 'What next',
      body: 'Found the covenant, then make the characters. Both have tutorials of their own on the Guide page.',
      at: page('/help'), target: 'tutorials',
    },
  ],
};
