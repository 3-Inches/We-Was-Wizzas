import { saga, sagaPage, wizard, sheet, page, concept } from '../places';
import type { Tour } from '../tours';

export const playerTour: Tour = {
  id: 'player',
  title: 'For players: make your character and send it to the storyguide',
  blurb: 'Open the saga your storyguide sent, build your character in it on your own, send it back as a file, and take the sheets the storyguide sends after a session.',
  group: 'Start here',
  inSaga: true,
  makesCharacter: true,
  steps: [
    {
      title: 'The invitation',
      body: 'Your storyguide sends the saga’s rules as a **link** or a **file**. Open the link, or press **Import file…** and choose the file: the saga is added to this browser with its books and rules, but none of the storyguide’s characters or notes. For now, this tutorial works in a saga already here, or a practice one.',
      at: page('/'), target: ['import-file', 'new-saga'],
    },
    {
      title: 'Your copy of the saga',
      body: 'This is your own copy: the books and rules your character is built under, and whatever you make in it. Nothing you do here reaches the storyguide until you send it. If the storyguide changes a rule and sends the invitation again, opening it updates this copy and keeps your characters.',
      at: saga, needs: 'saga', target: ['saga-card', 'troupe-card'],
    },
    {
      title: 'Create your character',
      body: 'Under **Create a character**, press **Magus** or **Companion**, whichever your storyguide asked for (usually one of each, and perhaps a grog or two later). The tutorial follows the new character.',
      at: sagaPage('people'), needs: 'saga', target: ['people-create', 'create-companion'], advance: {},
    },
    concept('Write **your own name as the Player**, so the storyguide’s Troupe card knows the character is yours. Then the concept and one to three themes. The **guided build** asks what you want to play and drafts the character with you.'),
    {
      title: 'Finish it',
      body: 'Work through the steps; the **Rules check** beside each says what is left, with the book and page, and many issues have a one-click fix. On **Review**, press **Finalize character**. You can send a draft too, if you want the storyguide to look it over first: the Import page tells them it is still in creation.',
      at: wizard, needs: 'character', wizard: 'review', target: ['finalize', 'step-review'],
    },
    {
      title: 'Send it',
      body: 'On the character sheet press **Share / Export**.',
      at: sheet('overview'), needs: 'character', target: 'sheet-share', advance: { press: /Share/ },
    },
    {
      title: 'Save as a file',
      body: '**Save as a file** and attach it to a message to your storyguide. A finished character is usually too long for a chat link (Discord stops at 2,000 characters), and the card says when a link will not work. The storyguide sees your character, checked under their rules, before it joins their saga.',
      at: sheet('overview'), needs: 'character', target: ['share-file', 'share-card'],
    },
    {
      title: 'Changes, and the sheets coming back',
      body: 'Change your character later and send it again the same way: the storyguide is shown **what changed**. After a session the storyguide can send your sheet back; open it with **Import file…**, and your copy takes theirs, with the changes listed first. Agree whose copy is kept once play begins: usually the storyguide’s.',
      at: page('/'), target: ['import-file', 'new-saga'],
    },
  ],
};
