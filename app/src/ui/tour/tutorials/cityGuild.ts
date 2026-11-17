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
  prefersTrade: true,
  practice: { type: 'companion', role: 'master-craftsman', folk: true, label: 'a practice master craftsman' },
  steps: [
    {
      title: 'Your craftsman’s workshop',
      body: '*City & Guild* is for characters who **work for a living**: a smith, a weaver, a baker or a merchant. It keeps what their work builds up in **Labor Points**: not money, but the time and effort put into the business. This tutorial works on a practice master craftsman and has you use each part as it goes. Their **Livelihood & workshop** card is here, on the Game Table’s City & Guild page (the same card is on their sheet); the seasons spent at the bench are spent on the Seasons page, with the rest of the season. At the top: **Craft or Profession** is the trade the card works with (a smith who also shoes horses picks the one they live by), and **Primary Characteristic** is the one the trade uses: Dexterity for most crafts, Strength if the troupe says so for a smith, as the book’s swordsmith does. **Wealth** comes from their Virtues (Poor, Wealthy).',
      at: table('guild'), needs: 'character', target: 'workshop',
    },
    {
      title: 'Labor Points a season',
      body: 'Each season they **work**, they earn (Characteristic + Craft) Labor Points, times 2 if Poor, 3 if average, 6 if Wealthy; a merchant uses Communication + Profession. Dexterity +2 and Craft 5 make 7, times 3: 21 a season. **Hold the pointer on the number** (or tap it) to see the sum with this craftsman’s own scores. A guild master short of the workers their Leadership calls for loses 3 a season for each one missing.',
      at: table('guild'), needs: 'character', target: ['workshop-lp', 'workshop'],
    },
    {
      title: 'What helps and hurts at the craft',
      body: 'Craftsmen are people, and some are luckier than others. Under the totals, **At their craft** lists the Virtues and Flaws that matter at the work, green for what helps and red for what holds them back. Some always count, and are in every total: Puissant (Craft) +2, Palsied Hands −2, Clumsy or Arthritis −3. Others count only in some work: Keen Vision +3 or Poor Eyesight −3 on fine work by eye, Free Expression +3 on a new work of art. Tick **this season is…** when the season’s work is that kind. Some help or hurt away from the bench: Leprosy stops any good Craft Reputation, The Gift spoils a sale. Hold the pointer on a badge for the rule and the book. A craftsman with none of these shows no line.',
      at: table('guild'), needs: 'character', target: ['workshop-traits', 'workshop'],
    },
    {
      title: 'Assistants',
      body: 'Open **Workshop, assistants and this season’s situation** (the tutorial opens it). Every craftsman may have one apprentice, and as many helpers as their Leadership; a guild master’s may be journeymen. Each helper adds **half their Craft** to the Workshop Total (all of them added together, then halved, rounded up). They do not make the goods: the master does, better for the help. Here too are the workshop’s **Innovation** and **Raw Materials**, a craft manual, and what raises this season’s Craft Level (war, famine, scarce materials, an aura, a new employee).\n\n**Try it:** press **+ Assistant**, name them and set their Craft (an apprentice has about 3).',
      at: table('guild'), needs: 'character', target: 'workshop-assistants', advance: { press: /\+ Assistant/ },
    },
    {
      title: 'The Workshop Total and the goods',
      body: 'The **Workshop Total** is the Characteristic + the Craft they work at + Innovation + Raw Materials + the assistants’ half. It is set against the **Craft Level** (6 normally) to say how good the season’s goods are: below it shoddy; at it standard; 6 above superior; 9 above excellent, with +1 more for every 3 beyond. Superior and excellent goods give whoever uses them a bonus. A season 6 or more above earns a point toward a (Craft) Reputation. **Hold the pointer on the Workshop Total** to see what makes it up, the assistant you just added among it. **Exert yourself** adds a simple die, at the cost of a roll on the Exertion chart and an aging roll.',
      at: table('guild'), needs: 'character', target: ['workshop-total', 'workshop'],
    },
    {
      title: 'Work a season',
      body: 'A season at the bench makes the goods and earns the season’s Labor Points. It is spent where every season is, on the **Seasons** page, in the character’s season in full (a season logged by mistake can be Unlogged there, and its points go with it). **Work a season** does it now: it logs this season as work (2 Exposure experience in the craft), makes the goods, and adds the points to **Labor Points banked** at once. **Labor Points are there to spend the season they are earned**; the year’s **upkeep** (36, and 5 more for each point of Raw Materials) comes off when the year closes, after Winter. Two seasons at 21 make 42: the 36 is paid and 6 saved.\n\n**Try it:** press **Work a season**, then see the banked points go up.',
      at: plan, needs: 'character', target: ['workshop-work', 'table-plan'], advance: { press: /^Work a season/ },
    },
    {
      title: 'Which seasons they work',
      body: 'An average craftsman works **two** seasons a year and has two free for study or adventure; a Poor one works three, a Wealthy one only one (the Virtues set it; the plan shows it). When time passes and nobody planned their season, **the free seasons come first**: Spring and Summer are their own, and Autumn and Winter go to the workshop, each earning its Labor Points. Plan a season here to change that, say work in Spring and keep Winter free. A season worked with the button counts as one of the year’s working seasons. Working three or more in a year, when not Poor, earns a Reputation for avarice.',
      at: plan, needs: 'character', target: ['plan-season', 'table-plan'],
    },
    {
      title: 'Move a season on',
      body: 'Time moves for everyone at once, here on the Seasons page. **End** the season: each character spends it as planned, or on their usual activity, and a craftsman’s working season goes to the workshop by itself. When Winter ends, the year closes: the upkeep is taken from every workshop, and the covenant’s own craftsmen bank the year’s points.\n\n**Try it:** press **End** (the season), then see the workshop’s points and the season log.',
      at: table('seasons'), needs: 'saga', target: 'seasons-advance', advance: { press: /^End / },
    },
    {
      title: 'Spending Labor Points',
      body: 'Saved points make the business better. The buttons beside **Work a season**, on the Seasons page: **Innovation** (100 points for +1, 600 in all for +3; it stays with the workshop) and **Raw Materials** (50 for +1, 300 for +3; lost if they leave, and 5 a point a year to keep). Each takes a season out of the workshop, and the card logs it. **More wealth**: 120 points takes a Poor character to average, 360 an average one to Wealthy, who earns twice as much a season. A button stays grey until enough are banked, or once the season is spent. **Haggle a sale**, on City & Guild, sells the season’s goods: Presence + Bargain against 9, or against an important customer.',
      at: plan, needs: 'character', target: ['workshop-work', 'table-plan'],
    },
    {
      title: 'Stories, investments and a boom',
      body: 'Open **Stories and investments** (the tutorial opens it). **Stories** earn points: half a season’s worth for a side part, up to two and a half for a story the town depended on. **Investments** spend them on charity, a lawsuit, a marriage, each with its effect; money can be **put into the business** as points, but points never come back out as money. A merchant’s convoys, sponsors and blockades are here too.\n\n**Read the market for a boom.** A boom is a sudden demand for something they can supply: arms in a war, a new industry making what was imported. Booms come when the story says so; the roll says whether they saw it coming. Intelligence + Area Lore + a stress die: **18+**, prepared for years, two seasons’ points back for each season’s worth set aside once the boom comes; **15+**, everything put in as it starts, a season and a half back for each, that year; **7–14**, no advantage; **6 or less**, 2 of every 10 points invested are lost; a botch ruins the business.\n\n**Try it:** press **Read the market for a boom**.',
      at: table('guild'), needs: 'character', target: 'workshop-stories', advance: { press: /^Read the market/ },
    },
    {
      title: 'Wondrous items',
      body: 'A craftsman with the Major Supernatural Virtue **Touched by (Realm)** (Divine, Faerie, Infernal or Magic, with two Forms; *City & Guild*) can make a **wondrous item**: an item with a power like a Hermetic effect, made with the craft and not with magic. Open **Wondrous item** (the tutorial opens it):\n- the **Craft Level** is 12 + the effect’s magnitude + its uses a day;\n- the Workshop Total adds the aura (by the Realms Interaction Table), half of **one** helper’s Craft (one only), and a shape and material bonus up to their Craft;\n- each season adds the amount the Workshop Total beats the Craft Level by, until the points reach the Craft Level;\n- it works only for the **customer it was made for**, and is an Arcane Connection to them.\n\n**Try it:** name it and its power, choose who it is for, and **Begin it**; **Work a season on it** adds the season’s points (on the Seasons page, as every season is). Finished, it goes on the customer’s Items tab. A damaged wondrous item stops working.',
      at: plan, needs: 'character', target: ['workshop-wonder', 'table-plan'],
    },
    {
      title: 'The guild',
      body: 'In a town each craft is run by its **guild**. With the guild rule on (Saga Overview → Optional rules), a craftsman holds a rank:\n- an **apprentice** learns the trade;\n- a **journeyman** works for others by contract;\n- a **master** keeps a workshop and votes in the guild;\n- a **senior master** and the **dean** run it.\n\nEach rank needs Guild Lore and a few other Abilities at a set score; the Guild card says what is missing, and what the next rank costs.',
      at: table('guild'), needs: 'character', target: ['guild', 'workshop'],
    },
    {
      title: 'The covenant’s craftsmen',
      body: 'Your covenant’s craftsmen save it money in the category their craft serves, as in *Covenants*: a carpenter on Buildings, a smith on Consumables (1 + half their Craft a year, the whole Craft for a rare craft). With City & Guild each also earns Labor Points, more simply: the line under each shows a season’s points, the year’s after the 36 upkeep, and those **banked**. A covenant craftsman’s points are banked **when the year closes**, and spent here on **Innovation** and **Raw Materials** (grey until enough are banked). Each one’s Virtues and Flaws at the work show green and red, with the score they work at; ✕ on a Flaw once it is got over in play, healed by magic or a story.',
      at: table('guild'), needs: 'saga', target: 'craftsmen-work',
    },
    {
      title: 'Hiring and letting go',
      body: 'A covenant hires more people as the saga goes on: to save more as it grows, to replace one who grows old, or one a Flaw holds back. **Look for** lists the crafts where one more would save money first, with the pounds a year. **Look for a craftsman** brings three who would come, met at random: age, Craft, Dexterity, the score they work at, Labor Points, what they would save, and their Virtues and Flaws. **Hire** takes one on, recruited in play: no Build Points, only an inhabitant’s upkeep (a place at table, and the Wages line). **Let one go** says goodbye; Build Points spent are not returned. Craftsmen bought when the covenant was founded cost the score they work at: a covenant pays for the craftsman it gets. The Tribunal’s covenants hire at each year’s end, and their old craftsmen retire from 60; yours are reminded at 60.\n\n**Try it:** press **Look for a craftsman**.',
      at: table('guild'), needs: 'saga', target: 'cg-hiring', advance: { press: /^Look (for a craftsman|again)/ },
    },
    {
      title: 'A companion at the covenant’s work',
      body: '*Covenants* counts craftsmen among the covenfolk, so whether a companion or grog who spends their working seasons making the covenant’s wares counts too is the troupe’s call: tick them under **Members who make the covenant’s wares** on the covenant’s People tab. They save as a craftsman does, by the score they work at, and their working seasons go to the covenant, not their own workshop. They are not paid as such: the **Wages** line (a penny a week for each inhabitant point; a companion counts 3) is their pocket money, the covenant’s food and roof the rest, and anything more is an allowance or their own business.',
      at: (c) => (c.sagaId && c.covId ? R.covenant(c.sagaId, c.covId, 'folk', 'people') : undefined), needs: 'covenant', target: 'covenfolk-organization',
    },
    {
      title: 'Haggling and bribes',
      body: 'Magi send a grog or companion to buy for them, since The Gift sets prices soaring. **Sending someone to market**:\n- **Who goes**: each person’s appraise (Perception + Bargain) and bargain (Communication + Bargain), from their sheet.\n- **1. What are the goods worth?** Set the value and the kind of goods, then **Appraise**, against 9 (6 for common goods or their own trade, 12 for rare). Success: they know the real value and cannot be overcharged.\n- **2. How low will the seller go?** Pick the kind of seller, then **Bargain**: each 3 points the buyer wins by takes 10% off, never below half. **Pay** takes it from the buyer chosen at the top.\n- **Bribes** buy a word or a bed for the night: a day’s pay takes 1 off that roll’s Ease, a week’s 3.\n\nEach result shows under its own button.\n\n**Try it:** press **Appraise**.',
      at: table('guild'), needs: 'saga', target: 'haggle', advance: { press: /^Appraise/ },
    },
    {
      title: 'Damaged goods',
      body: 'When a botch or rough use puts a valued item at risk (a sword in a botched fight, a cloak used as a rope), check it under **Damaged goods**. Choose **whose** it is and **the item**: one of their things, or a kind of thing not kept. The card shows its **damage levels** (from its quality, more for a big thing, twice for a lock) and the chance. The **Ability** is a list: the item’s own by default, or another of theirs. **Previously repaired** is one −1, however many repairs. **Roll the check**: a stress die and the modifiers against 15; a failure costs a level, a botch more. The damage is **kept on the item**, among its owner’s Possessions, so it is still there when you come back to it. **Repair it** while it is only damaged; a broken item cannot be repaired.\n\n**Try it:** choose your craftsman and an item, then press **Roll the check**.',
      at: table('guild'), needs: 'saga', target: 'item-check', advance: { press: /^Roll the check/ },
    },
    {
      title: 'What they own',
      body: 'Everything a character owns is kept on the Game Table’s **Possessions** page: weapons, shields, armor, enchanted items and other things (tools, a cart, a wondrous item), each with its damage. Add something they own at the bottom; **give** a thing to someone else (its damage goes with it); **Discard** one that is broken. Their sheet lists it all for reference.',
      at: table('items'), needs: 'character', target: 'possessions',
    },
    {
      title: 'Travel, trade and intrigue',
      body: 'The rest of the book is at the bottom of City & Guild, under **Travel, trade and intrigue**. Choose **who acts** at the top; open a part to use it: a journey’s days and cost by road, river or sea, and finding things on the way; ships in a chase; bribes, hired criminals and sabotage; intrigue against nobles; a house’s Reputation; dowries. Each roll says what it adds and the chance, and its result appears in that part. That is the whole of it: a working character’s seasons earn points, the year takes 36, and the rest builds a better business and a better life.',
      at: table('guild'), needs: 'saga', target: 'table-trade',
    },
  ],
};
