import { table, dice } from '../places';
import type { Tour } from '../tours';

export const tableTour: Tour = {
  id: 'table',
  title: 'Run a session from the Game Table',
  blurb: 'One page for the table: what needs attention, what everyone does this season, the covenants at a glance, ending the season, and where to go when something comes up.',
  group: 'In play',
  inSaga: true,
  steps: [
    {
      title: 'The Game Table',
      body: 'The Game Table is where the saga is played, in pages along its top: the **Overview** (what needs attention), **Seasons** (what everyone does, and moving time on), **Dice** (every roll), **Possessions**, the **Market & Treasury**, and **City & Guild**. Come back here whenever you are unsure what to do next. What changes in play changes here, not on the sheets.',
      at: table('overview'), needs: 'saga', target: 'nav-table',
    },
    {
      title: 'Needs attention',
      body: 'Money running short by the year’s end, low Loyalty, a guild strike, covenant problems, wounds and Fatigue to recover, illness, a workshop short of Labor Points, rules problems on a sheet, and anyone idle this season. Each line links to where it is fixed.',
      at: table('overview'), needs: 'saga', target: 'table-attention',
    },
    {
      title: 'At the table',
      body: 'Quick dice, links to the Dice page’s parts (Combat & perils, Spellcasting, Society & the Tribunal), and **When something comes up in play**: a fight, a spell, a purchase, vis found, a grog punished, a book read, a craftsman’s story, an item at risk, a rule in question. Each opens the page where it is done.',
      at: table('overview'), needs: 'saga', target: 'table-quick',
    },
    {
      title: 'Health & recovery',
      body: 'Everyone wounded, tired or ill, the soonest recovery first. Choose who tends them, add magical aid, and **Pass** to the next recovery or a set time: every Recovery roll is made, and the sheets change. At the foot, **choose someone** to apply damage, take or regain Fatigue, catch or cure a disease, or record a spell working on them.',
      at: table('overview'), needs: 'saga', target: ['table-recovery', 'table-attention'],
    },
    {
      title: 'Confidence & Faith',
      body: 'Everyone’s Confidence Points (and Faith Points, for True Faith) in one place. **Spend 1** for +3 on a roll; **Give 1** when the storyguide awards one for a story, a great deed or good roleplaying; **Dawn** brings Faith Points back.',
      at: table('overview'), needs: 'saga', target: ['table-confidence', 'table-recovery'],
    },
    {
      title: 'Faith & miracles',
      body: 'On **Dice › Faith & miracles** (*Realms of Power: The Divine*), pick anyone: holy powers called with a Method and a Power, a prayer for a miracle, God’s aid for a scene, a saint invoked, holy influence in the Dominion, and the Divine Ascent. Set the aura here first: a Divine aura adds to all of it.',
      at: dice('holy'), needs: 'saga', target: ['holy-here', 'tab-dice'],
    },
    {
      title: 'The covenants',
      body: 'Treasury, the year’s balance, Loyalty, vis and people for each covenant, with the year’s accounts folded underneath and links to each of its tabs.',
      at: table('overview'), needs: 'saga', target: 'table-covenant',
    },
    {
      title: 'Quick changes',
      body: 'What happens at the table, recorded on the spot: a Loyalty event from the book’s table, money into or out of the treasury, vis found. Everything can be undone.',
      at: table('overview'), needs: 'saga', target: 'table-changes',
    },
    {
      title: 'After a story',
      body: 'First say **how many characters took part**, then choose each one and what they gained: Adventure experience (at most 5 in any one Art or Ability), logged in the season of the story and sharing it with their other work, and Labor Points for a craftsman or merchant whose business the story touched.',
      at: table('overview'), needs: 'saga', target: 'table-story',
    },
    {
      title: 'Plan, end, resolve',
      body: 'The Seasons page goes in three steps, shown at its top. **Plan** the season from the top down: the covenant first, then each player in turn, magi before companions, grogs last. **End** it at the bottom after reading what to expect. **Resolve** what it leaves. **Turn back** puts the saga back to before a season or a year passed.',
      at: table('seasons'), needs: 'saga', target: ['seasons-phases', 'table-season'],
    },
    {
      title: 'This season',
      body: 'What each character does when the season ends: what is logged on their sheet, or their standing activity, which you can change right here. A season logged by mistake is **Unlogged** here, and everything it did is taken back. **Plan in full** opens their season below: a book, a teacher, a lab project, writing, a Longevity Ritual.',
      at: table('seasons'), needs: 'saga', target: 'table-season',
    },
    {
      title: 'End the season',
      body: 'Above the button, **what to expect**: lab work without its vis, a covenant spending more than it earns, anyone with nothing to do, choices still to settle. Then press **End** (the button names the season) to move the whole saga on, with Undo. Below are the options, and passing several seasons or years at once.',
      at: table('seasons'), needs: 'saga', target: 'table-advance', advance: {},
    },
    {
      title: 'Resolve',
      body: 'What the season leaves for the troupe to decide waits at the top of the Seasons page, and on the Overview, until it is settled: a Warping Virtue or Flaw to choose, a death in an aging crisis, a Twilight to roll. Under it, the season just ended, told as a story.',
      at: table('seasons'), needs: 'saga', target: ['seasons-resolve', 'seasons-phases'],
    },
    {
      title: 'The Chronicle',
      body: 'Each season told as a story, to read aloud: the weather and the feast days, what each character spent it on, who came up the road, the year’s harvest and its vis, the years telling on the old, what the agents heard and the news a Redcap brought. The numbers and every roll are folded beneath each, in the record.',
      at: table('chronicle'), needs: 'saga', target: 'chronicle',
    },
    {
      title: 'Society & the Tribunal',
      body: 'The Tribunal’s news and what its covenants bring to yours, what the players’ agents heard, the gatherings to come and the motions to vote on; the **Agents** themselves (won over, strengthened, asked); and the debates, petitions, courts and customs, for whoever you pick.',
      at: table('society'), needs: 'saga', target: ['tribunal-news', 'agent-reports'],
    },
    {
      title: 'Possessions',
      body: 'What each character owns, changed as it changes in play: things found, bought, given away or thrown out; armor and weapons; enchanted items and the talisman; a familiar; a Redcap’s devices. Work on an item or the familiar in the lab (**Plan preparing it**, **Plan the binding**) opens the Seasons page on the lab project, where the season is worked.',
      at: table('items'), needs: 'saga', target: ['possessions', 'items-who'],
    },
    {
      title: 'Travel, trade and intrigue',
      body: 'Folded sections for what City & Guild adds at the table: a journey’s days and cost, cargo and Area Lore, ships in a fight; bribes, hired criminals and sabotage; intrigue against the powerful; a house’s Reputation, largesse and warehouses; a dowry. Costs can be paid from a purse or the treasury.',
      at: table('guild'), needs: 'saga', target: 'table-trade',
    },
  ],
};
