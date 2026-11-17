import { wizard, guided, guidedTab } from '../places';
import type { Tour } from '../tours';

export const guidedTour: Tour = {
  id: 'guided',
  title: 'Use the guided build',
  blurb: 'Rate what you want from a character and let the toolkit suggest, or build, the rest: themes, questions, recommendations and the finished draft.',
  group: 'Characters',
  inSaga: true,
  wantsDraft: true,
  practice: { type: 'companion', draft: true, label: 'a practice companion, still in creation' },
  steps: [
    {
      title: 'Themes first',
      body: 'On the Concept step, pick one to three themes (Warrior, Scholar, Healer, Faerie-touched…). Each answers some of the guided build’s questions for you, so there are fewer to go through.',
      at: wizard, needs: 'character', wizard: 'basics', target: ['concept-themes', 'step-basics'],
    },
    {
      title: 'Start it',
      body: 'Press **Start the guided build**. Nothing on the character changes until you build the draft or take an option, and the normal steps stay open the whole time.',
      at: wizard, needs: 'character', wizard: 'basics', target: 'guided-build', advance: { press: /Start the guided build/ },
    },
    {
      title: 'The questions',
      body: 'Rate each statement from 0 (not at all) to 10 (very much); one you skip counts as 5. An answer of 7 or more, or 3 or less, opens follow-up questions about it. **?** explains a statement, and the numbers after a question show what its best options give. A magus can name a House here, or leave it to the build.',
      at: guidedTab('questions'), needs: 'character', target: ['guided-main', 'tab-questions'],
    },
    {
      title: 'The shortlist',
      body: 'Beside the questions, the shortlist shows the Virtues and Flaws that fit your answers best, and changes as you answer. **Taken so far** lists what the character already has. If several kinds of option score alike, a **Tie-breaker** card asks which matters more.',
      at: guidedTab('questions'), needs: 'character', target: ['guided-shortlist', 'guided-taken'],
    },
    {
      title: 'Recommendations',
      body: 'Every option that fits, with why and the page. **Take** one now (Major or Minor where it can be either), or **Not for me** to stop it being suggested.',
      at: guidedTab('results'), needs: 'character', target: 'tab-results',
    },
    {
      title: 'Browse by tag',
      body: 'Every Virtue and Flaw grouped by what it does (Penetration, Soak, study, wealth…): a way to find options without the questions.',
      at: guidedTab('browse'), needs: 'character', target: 'tab-browse',
    },
    {
      title: 'Build the draft',
      body: '**Build the draft…** makes the whole character from your answers: House, Virtues and Flaws, Characteristics, Abilities, Arts and spells, balanced and checked against the rules. The preview lists each choice with its reason; **Use this draft** applies it, and Undo takes it back.',
      at: guided, needs: 'character', target: 'guided-draft',
      actions: [{ id: 'buildDraft', label: 'Build and use the draft for me' }],
    },
    {
      title: 'Why each choice',
      body: 'Back in the wizard, the Review step lists every choice the draft made and why. Change anything on its own step; the Rules check keeps up with you.',
      at: wizard, needs: 'character', wizard: 'review', target: ['why-card', 'step-review'],
    },
  ],
};
