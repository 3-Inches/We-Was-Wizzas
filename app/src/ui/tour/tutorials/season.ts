import { table, plan } from '../places';
import type { Tour } from '../tours';

export const seasonTour: Tour = {
  id: 'season',
  title: 'Play a season',
  practice: { type: 'magus', label: 'a practice magus' },
  blurb: 'Between stories: plan each character’s season, move time on for the whole saga, and see the year’s end.',
  group: 'In play',
  inSaga: true,
  steps: [
    {
      title: 'Plan the season',
      body: 'On the Game Table’s **Seasons** page, pick a character. Their season in full opens on their own work, a magus’s **Lab projects**. **Plan a season** comes next: study from a book, practice, train or teach. The toolkit works out the experience and logs it on their sheet. Cards that cannot apply to them are listed at the foot.',
      at: plan, needs: 'character', target: ['plan-season', 'table-plan'],
    },
    {
      title: 'When nothing is planned',
      body: 'A **standing activity** (practice, reading, lab work, teaching, being taught) runs in any season nobody plans, so a fast-forward still advances everyone sensibly. A magus has four free seasons; a working character two (Wealthy three, Poor one) and works the rest. **Seasons a year** shows them, and can be set by hand.',
      at: plan, needs: 'character', target: ['season-plan', 'standing', 'table-plan'],
    },
    {
      title: 'Writing and copying',
      body: 'A book, a copy, lab texts or a florilegium is begun here and worked a season at a time, from this card or as the standing activity. The finished work goes to the covenant library. Glossing a book read this season and clarifying one are here too.',
      at: plan, needs: 'character', target: ['writing', 'table-plan'],
    },
    {
      title: 'Move time on',
      body: 'Read **what to expect** first: what will fall short, what comes due, who has nothing to do. Then **End** the season for the whole saga at once. Each character does what they planned or their standing activity; what it leaves to decide waits at the top, under **Resolve**, and the season is told as a story in the **Chronicle**.',
      at: table('seasons'), needs: 'saga', target: 'seasons-advance',
    },
    {
      title: 'The year’s end',
      body: 'Winter’s end closes each covenant’s books, gathers the year’s vis, pays allowances, renews wards, rolls aging and adds the year’s Warping. The scribes make the copies queued in the scriptorium. A Dominion grows or fades with its congregation, and with aura variation a Magic aura may move. The checkboxes choose what runs.',
      at: table('seasons'), needs: 'saga', target: ['seasons-advance', 'table-season'],
    },
    {
      title: 'The Market',
      body: 'Buy books, teachers, covenfolk, services and vis in play, at the books’ prices, from the covenant’s treasury or a character’s purse. A grog can haggle the price down, and bribes are paid here.',
      at: table('market'), needs: 'saga', target: 'market-who',
    },
  ],
};
