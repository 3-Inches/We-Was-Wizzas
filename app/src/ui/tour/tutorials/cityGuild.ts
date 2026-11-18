import { R } from '../../routes';
import { table, plan } from '../places';
import type { Tour } from '../tours';

export const cityGuildTour: Tour = {
  id: 'city-guild',
  title: 'Craftsmen, guilds and Labor Points (City & Guild)',
  blurb: 'What City & Guild adds: a craftsman’s or merchant’s career, kept in Labor Points. What they are, how a season’s work earns them, what the yearly upkeep takes, and what the rest buys; better goods; guild ranks; the covenant’s own craftsmen; haggling; and items that break.',
  group: 'In play',
  inSaga: true,
  prefers: 'companion',
  // its steps press a workshop's own controls: one with a trade and no workshop yet can still be chosen; else a practice craftsman
  suits: (c) => !!c.workshop,
  practice: { type: 'companion', role: 'master-craftsman', folk: true, label: 'a practice master craftsman' },
  steps: [
    {
      title: 'Your craftsman’s workshop',
      body: '*City & Guild* is for characters who **work for a living**: a smith, a weaver, a merchant. It keeps what their work builds up in **Labor Points**: not money, but the time and effort put into the business. This tutorial works on a practice master craftsman. Their **Livelihood & workshop** card is here, on **Game Table › City & Guild**.',
      at: table('guild'), needs: 'character', target: 'workshop',
    },
    {
      title: 'The trade',
      body: 'At the top, **Craft or Profession** is the trade the card works with: a smith who also shoes horses picks the one they live by. **Primary Characteristic** is the one the trade uses: Dexterity for most crafts, Strength for a smith if the troupe says so. **Wealth** comes from their Virtues (Poor, Wealthy).',
      at: table('guild'), needs: 'character', target: 'workshop',
    },
    {
      title: 'Labor Points a season',
      body: 'Each season they **work**, they earn (Characteristic + Craft) Labor Points, times 2 if Poor, 3 if average, 6 if Wealthy; a merchant uses Communication + Profession. Dexterity +2 and Craft 5 make 7, times 3: 21 a season. **Hold the pointer on the number**, or tap it, to see this craftsman’s own sum.',
      at: table('guild'), needs: 'character', target: ['workshop-lp', 'workshop'],
    },
    {
      title: 'What helps and hurts at the craft',
      body: '**At their craft** lists the Virtues and Flaws that matter at the work: green helps, red hurts. Some always count, such as Clumsy −3. Others count only in some work, such as Keen Vision +3 on fine work: tick **this season is…** when the season’s work is that kind. Tap a badge for the rule and the book.',
      at: table('guild'), needs: 'character', target: ['workshop-traits', 'workshop'],
    },
    {
      title: 'The workshop and this season',
      body: 'Open **Workshop, assistants and this season’s situation** (the tutorial opens it). Here are the workshop’s **Innovation** and **Raw Materials**, a craft manual, and what raises this season’s Craft Level: war, famine, scarce materials, an aura, a new employee.',
      at: table('guild'), needs: 'character', target: 'workshop-assistants',
    },
    {
      title: 'Assistants',
      body: 'Every craftsman may have one apprentice, and as many helpers as their Leadership. Each helper adds **half their Craft** to the Workshop Total (all added together, then halved, rounded up). They do not make the goods: the master does, better for the help.\n\n**Try it:** press **+ Assistant**, name them and set their Craft (an apprentice has about 3).',
      at: table('guild'), needs: 'character', target: 'workshop-assistants', advance: { press: /\+ Assistant/ },
    },
    {
      title: 'The Workshop Total',
      body: 'The **Workshop Total** is the Characteristic + Craft + Innovation + Raw Materials + the assistants’ half. **Hold the pointer on it**, or tap it, to see what makes it up, the assistant you just added among it. **Exert yourself** adds a simple die, at the cost of a roll on the Exertion chart and an aging roll.',
      at: table('guild'), needs: 'character', target: ['workshop-total', 'workshop'],
    },
    {
      title: 'How good the goods are',
      body: 'The Workshop Total is set against the **Craft Level**, 6 normally. Below it the season’s goods are shoddy; at it standard; 6 above superior; 9 above excellent, with +1 more for every 3 beyond. Superior and excellent goods give whoever uses them a bonus. A season 6 or more above earns a point toward a (Craft) Reputation.',
      at: table('guild'), needs: 'character', target: ['workshop-total', 'workshop'],
    },
    {
      title: 'Work a season',
      body: 'A season at the bench makes the goods and earns its Labor Points. It is spent on **Game Table › Seasons**, in the character’s season in full. **Work a season** logs it, with 2 Exposure experience in the craft, and banks the points at once.\n\n**Try it:** press **Work a season**, then see the banked points go up.',
      at: plan, needs: 'character', target: ['workshop-work', 'table-plan'], advance: { press: /^Work a season/ },
    },
    {
      title: 'The year’s upkeep',
      body: '**Labor Points are there to spend the season they are earned.** The year’s **upkeep** (36, and 5 more for each point of Raw Materials) comes off when the year closes, after Winter. Two seasons at 21 make 42: the 36 is paid and 6 saved. A season logged by mistake can be Unlogged, and its points go with it.',
      at: plan, needs: 'character', target: ['workshop-work', 'table-plan'],
    },
    {
      title: 'Which seasons they work',
      body: 'An average craftsman works **two** seasons a year; a Poor one three, a Wealthy one one. When nobody plans their season, **the free seasons come first**: Spring and Summer are their own, Autumn and Winter the workshop’s. Plan a season to change that. Working three or more in a year, when not Poor, earns a Reputation for avarice.',
      at: plan, needs: 'character', target: ['plan-season', 'table-plan'],
    },
    {
      title: 'Move a season on',
      body: 'Time moves for everyone at once, here. **End** the season: each character spends it as planned, or on their usual activity. When Winter ends, the year closes: the upkeep is taken from every workshop, and the covenant’s own craftsmen bank the year’s points.\n\n**Try it:** press **End** (the season), then see the workshop’s points and the season log.',
      at: table('seasons'), needs: 'saga', target: 'seasons-advance', advance: { press: /^End / },
    },
    {
      title: 'Spending Labor Points',
      body: 'Saved points improve the business. Beside **Work a season**: **Innovation** (100 points for +1, 600 in all for +3; it stays with the workshop) and **Raw Materials** (50 for +1, 300 for +3; lost if they leave, and 5 a point a year to keep). Each takes a season out of the workshop, and stays grey until enough are banked.',
      at: plan, needs: 'character', target: ['workshop-work', 'table-plan'],
    },
    {
      title: 'More wealth, and a sale',
      body: '**More wealth**: 120 points takes a Poor character to average, and 360 an average one to Wealthy, who earns twice as much a season. **Haggle a sale**, on City & Guild, sells the season’s goods: Presence + Bargain against 9, or against an important customer.',
      at: plan, needs: 'character', target: ['workshop-work', 'table-plan'],
    },
    {
      title: 'Stories and investments',
      body: 'Open **Stories and investments** (the tutorial opens it). **Stories** earn points: half a season’s worth for a side part, up to two and a half for a story the town depended on. **Investments** spend them on charity, a lawsuit or a marriage. Money can be put into the business as points, but points never come back out as money.',
      at: table('guild'), needs: 'character', target: 'workshop-stories',
    },
    {
      title: 'A boom',
      body: 'A **boom** is a sudden demand for something they can supply: arms in a war, or a new industry making what was imported. Booms come when the story says so; the roll says whether they saw it coming. A merchant’s convoys, sponsors and blockades are on this card too.',
      at: table('guild'), needs: 'character', target: 'workshop-stories',
    },
    {
      title: 'Read the market',
      body: '**Read the market for a boom** rolls Intelligence + Area Lore + a stress die. **18+**: two seasons’ points back for each season’s worth set aside. **15+**: a season and a half back. **7–14**: no advantage. **6 or less**: 2 in 10 invested points are lost. A botch ruins the business.\n\n**Try it:** press **Read the market for a boom**.',
      at: table('guild'), needs: 'character', target: 'workshop-stories', advance: { press: /^Read the market/ },
    },
    {
      title: 'Wondrous items',
      body: 'A craftsman with the Major Virtue **Touched by (Realm)** can make a **wondrous item**: an item with a power like a Hermetic effect, made with the craft and not with magic. It works only for the **customer it was made for**, and is an Arcane Connection to them. Open **Wondrous item** (the tutorial opens it).',
      at: plan, needs: 'character', target: ['workshop-wonder', 'table-plan'],
    },
    {
      title: 'Making one',
      body: '- The **Craft Level** is 12 + the effect’s magnitude + its uses a day.\n- The Workshop Total adds the aura, half of **one** helper’s Craft, and a shape and material bonus up to their Craft.\n- Each season adds what the Workshop Total beats the Craft Level by, until the points reach the Craft Level.',
      at: plan, needs: 'character', target: ['workshop-wonder', 'table-plan'],
    },
    {
      title: 'Begin one',
      body: '**Try it:** name it and its power, choose who it is for, and **Begin it**. **Work a season on it** adds the season’s points. Finished, it goes on the customer’s Items tab. A damaged wondrous item stops working.',
      at: plan, needs: 'character', target: ['workshop-wonder', 'table-plan'],
    },
    {
      title: 'The guild',
      body: 'In a town each craft is run by its **guild**. With the guild rule on, a craftsman holds a rank: an **apprentice** learns, a **journeyman** works for others, a **master** keeps a workshop and votes, and a **senior master** and the **dean** run it. Each rank needs Guild Lore and other Abilities; the Guild card says what is missing.',
      at: table('guild'), needs: 'character', target: ['guild', 'workshop'],
    },
    {
      title: 'The covenant’s craftsmen',
      body: 'Your covenant’s craftsmen save it money in the category their craft serves, as in *Covenants*: a carpenter on Buildings, a smith on Consumables. With City & Guild each also earns Labor Points: the line under each shows a season’s points, the year’s after the 36 upkeep, and those **banked**.',
      at: table('guild'), needs: 'saga', target: 'craftsmen-work',
    },
    {
      title: 'Their points and their traits',
      body: 'A covenant craftsman’s points are banked **when the year closes**, and spent here on **Innovation** and **Raw Materials**. Each one’s Virtues and Flaws at the work show green and red, with the score they work at. ✕ removes a Flaw once it is got over in play, healed by magic or a story.',
      at: table('guild'), needs: 'saga', target: 'craftsmen-work',
    },
    {
      title: 'Hiring',
      body: 'A covenant hires more people as the saga goes on, to save more or to replace the old. **Look for** lists the crafts where one more would save money first. **Look for a craftsman** brings three who would come, with their Craft, what they would save, and their Virtues and Flaws.\n\n**Try it:** press **Look for a craftsman**.',
      at: table('guild'), needs: 'saga', target: 'cg-hiring', advance: { press: /^Look (for a craftsman|again)/ },
    },
    {
      title: 'Hiring and letting go',
      body: '**Hire** takes one on, recruited in play: no Build Points, only an inhabitant’s upkeep. **Let one go** says goodbye; Build Points spent are not returned. The Tribunal’s covenants hire at each year’s end, and their old craftsmen retire from 60; yours are reminded at 60.',
      at: table('guild'), needs: 'saga', target: 'cg-hiring',
    },
    {
      title: 'A companion at the covenant’s work',
      body: 'Whether a companion or grog who makes the covenant’s wares counts among its craftsmen is the troupe’s call: tick them under **Members who make the covenant’s wares**. They save as a craftsman does, and their working seasons go to the covenant, not their own workshop. The **Wages** line is their pocket money; the covenant’s food and roof are the rest.',
      at: (c) => (c.sagaId && c.covId ? R.covenant(c.sagaId, c.covId, 'folk', 'people') : undefined), needs: 'covenant', target: 'covenfolk-organization',
    },
    {
      title: 'Sending someone to market',
      body: 'Magi send a grog or companion to buy for them, since The Gift sets prices soaring. **Who goes** shows each person’s appraise (Perception + Bargain) and bargain (Communication + Bargain), from their sheet. **Bribes** buy a word or a bed for the night: a day’s pay takes 1 off that roll’s Ease Factor, a week’s pay 3.',
      at: table('guild'), needs: 'saga', target: 'haggle',
    },
    {
      title: 'Haggling',
      body: '**1. What are the goods worth?** Set the value and kind, then **Appraise**, against 9 (6 for common goods, 12 for rare). Success: they cannot be overcharged. **2. How low will the seller go?** **Bargain**: each 3 points the buyer wins by takes 10% off, never below half. **Pay** takes it from the buyer.\n\n**Try it:** press **Appraise**.',
      at: table('guild'), needs: 'saga', target: 'haggle', advance: { press: /^Appraise/ },
    },
    {
      title: 'Damaged goods',
      body: 'When a botch or rough use puts a valued item at risk, check it here. Choose **whose** it is and **the item** to see its **damage levels** and the chance. A stress die and the modifiers go against 15; a failure costs a level, a botch more.\n\n**Try it:** choose your craftsman and an item, then press **Roll the check**.',
      at: table('guild'), needs: 'saga', target: 'item-check', advance: { press: /^Roll the check/ },
    },
    {
      title: 'Kept on the item',
      body: 'The damage is **kept on the item**, among its owner’s Possessions, so it is still there when you come back to it. **Repair it** while it is only damaged; a broken item cannot be repaired. **Previously repaired** counts −1 once, however many repairs.',
      at: table('guild'), needs: 'saga', target: 'item-check',
    },
    {
      title: 'What they own',
      body: 'Everything a character owns is kept on the Game Table’s **Possessions** page: weapons, shields, armor, enchanted items and other things (tools, a cart, a wondrous item), each with its damage. Add something they own at the bottom; **give** a thing to someone else (its damage goes with it); **Discard** one that is broken. Their sheet lists it all for reference.',
      at: table('items'), needs: 'character', target: 'possessions',
    },
    {
      title: 'Travel, trade and intrigue',
      body: 'The rest of the book is at the foot of City & Guild, under **Travel, trade and intrigue**. Choose **who acts**, then open a part: journeys, ships in a chase, bribes and sabotage, intrigue, a house’s Reputation, dowries. That is the whole of it: a working season earns points, the year takes 36, and the rest builds a better business.',
      at: table('guild'), needs: 'saga', target: 'table-trade',
    },
  ],
};
