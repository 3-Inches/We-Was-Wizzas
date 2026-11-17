import { sagaPage, covenant } from '../places';
import type { Tour } from '../tours';

export const covenantTour: Tour = {
  id: 'covenant',
  title: 'Found the covenant',
  blurb: 'Build Points, Hooks and Boons, the library and vis, laboratories and covenfolk.',
  group: 'The saga and covenant',
  inSaga: true,
  steps: [
    {
      title: 'Found it',
      body: 'Press **Found a covenant**. The saga’s characters join it as members; the tutorial follows the new covenant.',
      at: sagaPage('covenants'), needs: 'saga', target: 'found-covenant', advance: {},
    },
    {
      title: 'Its season and Build Points',
      body: 'Name it and choose its season (Spring, Summer, Autumn or Winter). A **base package** (Weak, Medium or Powerful) sets the Build Points and fills in a library, lab texts and vis to start from.',
      at: covenant('overview'), needs: 'covenant', target: ['covenant-base', 'covenant-basics'],
      actions: [{ id: 'basePackage', label: 'Use the Medium package for me' }],
    },
    {
      title: 'Spending Build Points',
      body: 'Everything the covenant owns costs Build Points: books, vis, laboratories, specialists, enchanted items. This card adds them up by kind and shows what is left.',
      at: covenant('overview'), needs: 'covenant', target: 'covenant-bp',
    },
    {
      title: 'Hooks & Boons',
      body: 'Boons are the covenant’s advantages, Hooks its troubles; Hooks pay for Boons point for point. Each shows its rules, and some change the covenant’s numbers (aura, income, loyalty) on their own.',
      at: covenant('hooks'), needs: 'covenant', target: 'tab-hooks',
    },
    {
      title: 'The aura',
      body: 'The **Aura** card shows the aura as it stands, with each change and its reason (a battle, a church built nearby). A Magic aura can be **aligned** with an Art, which it counts double for. A Dominion can follow the **congregation** that keeps it. With the optional **Aura variation** rule, a Magic aura drifts from year to year.',
      at: covenant('overview'), needs: 'covenant', target: 'aura',
    },
    {
      title: 'Library & Vis',
      body: 'Summae, tractatus and lab texts, and the vis sources and stocks. The magi study from these books in their seasons.',
      at: covenant('library'), needs: 'covenant', target: 'tab-library',
    },
    {
      title: 'Laboratories',
      body: 'Each member magus gets a standard laboratory free; the **Build a laboratory** tutorial covers personalizing one.',
      at: covenant('labs'), needs: 'covenant', target: 'tab-labs',
    },
    {
      title: 'Covenfolk, Finances & Loyalty',
      body: 'The covenfolk the covenant needs, its specialists and teachers, the year’s income and expenses, and the loyalty of its people. Specialists and craftsmen gain experience each year (their Build Points stay as bought). The Market buys more in play.',
      at: covenant('folk'), needs: 'covenant', target: 'tab-folk',
    },
    {
      title: 'How the covenfolk live',
      body: 'How they are organized (a noble household, nations, professional guilds…), whether the magi live poorer for fewer points, and who pays their own upkeep. With the **Guild** Hook, its demands and a strike are here, and every craftsman holds a guild rank.',
      at: covenant('folk&sub=people'), needs: 'covenant', target: 'covenfolk-organization',
    },
    {
      title: 'Soldiers',
      body: 'Soldiers from the Residents Boons and Free Choices: how many, their pay (a pound a year for each penny a day), their horses and kit. Those who live at the covenant count among its inhabitants.',
      at: covenant('folk&sub=people'), needs: 'covenant', target: 'soldiers',
    },
    {
      title: 'Each year',
      body: 'What the covenant spends every year besides upkeep: Redcap visits, feast days (four or more earn a Loyalty point a year), guests, hired hands. Weapons and armor points can be worked out from the turb.',
      at: covenant('folk&sub=money'), needs: 'covenant', target: 'yearly',
    },
    {
      title: 'Craft magic',
      body: 'Rego (or Creo) magic in place of craftsmen: design a spell from the craft guidelines or take one a magus knows, then see the Finesse roll, its chance, how many rolls a year, and what it saves.',
      at: covenant('folk&sub=money'), needs: 'covenant', target: 'craft-magic',
    },
    {
      title: 'The turb’s day',
      body: 'Who stands which watch (day or night patrol, four watches, single or double duty) and who is on duty, off duty or asleep at any hour; the rolls to stay awake on sentry and against double duty’s Fatigue; drilling a group faster; and rewards and punishments marked on a grog’s sheet, with the Loyalty Points one a magus orders costs.',
      at: covenant('folk&sub=people'), needs: 'covenant', target: 'turb',
    },
    {
      title: 'Members',
      body: 'Who lives here. The magi’s laboratories, the library they read from and the covenant’s aura all reach their sheets from here.',
      at: covenant('overview'), needs: 'covenant', target: 'covenant-members',
    },
  ],
};
