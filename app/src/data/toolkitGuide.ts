// The Guide's first page, "Using the toolkit": where things are, and each system written as steps
// (make one, use it, spend a season, what to watch for). The text is data, as the roleplay pages are
// (src/data/roleplay.ts), so the same readability tests hold it to the design principles (principle 7).
// Complete lists (every modifier, every Hook) live on the cards and in Game Mechanics, not here.
// A section with `live` gets a part the page draws itself (the tutorials list, the optional rules,
// the counts of the rules data), shown after its text.

import type { RpGuide } from './roleplay';

export const TOOLKIT_GUIDE: RpGuide = {
  id: 'toolkit',
  tab: 'Using the toolkit',
  title: 'Using the toolkit',
  lead: 'A saga toolkit for *Ars Magica* Fifth Edition that runs in your browser. It builds characters and covenants with the rules checked, then does the arithmetic of play: Casting Totals, Lab Totals, wounds, study, aging and Twilight.',
  sections: [
    {
      id: 'tutorials',
      title: 'Tutorials',
      summary: 'Guided walks through the real app, one step at a time',
      tour: 'tutorials',
      live: 'tutorials',
      startOpen: true,
      blocks: [
        { p: 'A tutorial walks you through the app itself. A small panel explains each step and points at the control, and **Next** takes you to the right page. You do the clicking, so you learn where things are.' },
        { p: 'Any tutorial can use a **practice saga**, so your own sagas are left alone.' },
      ],
    },
    {
      id: 'start',
      title: 'Quick start',
      summary: 'A saga, its books, the covenant, the characters, then play',
      blocks: [
        {
          ordered: true,
          list: [
            '**Create a saga.** Everything lives in a saga: its characters, its covenant and the troupe’s house rules. Start on the [Sagas](#/) page.',
            '**Choose the books and rules.** On the **Saga Overview**, the **Books** tab picks the supplements your troupe uses. Only their content appears in the pickers. The **Optional rules** tab turns each optional system on or off.',
            '**Found the covenant.** Press **Found a covenant** on the **Covenants** page. See **The covenant** below.',
            '**Make the characters.** On the **People** page, choose grog, companion, Mythic Companion or magus. See **Characters** below.',
            '**Play at the Game Table.** Its pages roll the dice, plan the seasons and keep the money, and what they change lands on the sheets. Click any underlined number to see how it was worked out.',
          ],
        },
        { p: '**Your data stays in this browser.** Nothing is sent to a server. Press **Export saga** on the Saga Overview now and then, to keep a copy or to move the saga to another device.' },
      ],
    },
    {
      id: 'learn',
      title: 'Learning the rules',
      summary: 'Game Mechanics, the Rules reference, the book reader, and the roleplay pages',
      live: 'learn',
      blocks: [
        { p: '**[Game Mechanics](#/mechanics)** is the place to start. It has every rule of the core book and the reviewed supplements, grouped by subject. Each topic has a short summary, the key rules quoted, and the book’s own text a click away.' },
        { p: 'The **[Rules reference](#/reference)** lists what you choose from: Virtues and Flaws, Abilities, Houses, Hooks and Boons, weapons and books. The **[book reader](#/reference/book/DE)** has the full text of every book, searchable.' },
        { p: 'The game is more than its rules. [Playing the game](#/help?tab=players) is about playing a person of 1220. [Running the game](#/help?tab=storyguides) is for storyguides.' },
      ],
    },
    {
      id: 'table',
      title: 'The Game Table',
      summary: 'Where a session is run, and what each of its pages is for',
      blocks: [
        { p: 'The **Game Table** is in the saga’s menu, under the Saga Overview. Run a session from there. A finished character’s sheet is for reference: it shows where they stand, and each card says where at the Game Table it changes.' },
        {
          table: {
            head: ['Page', 'What it is for'],
            rows: [
              ['Overview', 'What needs attention: money, Loyalty, wounds, idle characters. Health and recovery, Confidence, quick changes, and experience after a story.'],
              ['Seasons', 'Each character’s season, the end of the season, and what it leaves to resolve.'],
              ['Chronicle', 'Each season told as a story, its record folded beneath.'],
              ['Society & the Tribunal', 'The Tribunal’s news, the agents and what they heard, debates, petitions and courts.'],
              ['Dice', 'Every roll. **Faerie**, **Hedge magic** and **Mysteries** appear when someone in the saga has them.'],
              ['Possessions', 'What each character owns: things, arms and armor, enchanted items, a talisman, a familiar.'],
              ['Market & Treasury', 'Buying at the book prices, and moving pounds and vis between the treasury and the purses.'],
              ['City & Guild', 'Craftsmen and merchants at work, going to market, travel and trade.'],
            ],
          },
        },
        { p: 'On the Overview, **Coming up** keeps the dates, and **Stories waiting** lists the Story Flaws and Hooks not yet played, the longest untold first. **When unsure what to do next, go back to the Overview.**' },
      ],
    },
    {
      id: 'covenant',
      title: 'The covenant',
      summary: 'Found it with Build Points, then keep its aura, money and people in play',
      blocks: [
        {
          ordered: true,
          list: [
            '**Found it.** On **Covenants**, choose its season, aura and power level. The power level sets its Build Points and its limits, such as the highest lab text.',
            '**Take Hooks to pay for Boons.** Click any Hook or Boon to read it. Those that change the covenant take effect: an aura Boon raises the aura, and a Boon for its people shows on those made there.',
            '**Buy what it owns.** The library, lab texts, vis sources, enchanted items and specialists are priced for you, within the creation limits. Build one laboratory for each magus: it feeds that magus’s Lab Totals.',
            '**Set its people and money.** The **Covenfolk, Finances & Loyalty** tab shows the yearly balance. **Quick add** brings in specialists and craftsmen, and **optimal** finds the number of laborers that costs least.',
          ],
        },
        { p: 'In a hurry? **Quick build › Fill out the covenant** shows each purchase with its Build Points before it adds any.' },
        { heading: 'In play' },
        {
          points: [
            ['The covenant’s Overview', 'keeps the **Aura** and its changes, the **Troubles** that strike it, its **Great buildings** and **A menagerie**, and **Magic on the covenant**, which casts one spell on every member at once.'],
            ['Each year’s end', 'settles the treasury, the vis and the year of familiarity. It happens when time passes on Seasons, or by hand on the **The year** card of the Finances tab, with Undo.'],
            ['When money runs short,', 'the **Hard times** card lists the book’s savings, each with its cost in Loyalty. Money can be borrowed and vis sold.'],
          ],
        },
      ],
    },
    {
      id: 'characters',
      title: 'Characters',
      summary: 'The wizard, the rules check, the guided build and Quick build',
      blocks: [
        {
          ordered: true,
          list: [
            '**Make one.** On **People**, choose the kind of character. The wizard walks through each step and shows its budget: Virtue points, Characteristic points, experience, spell levels. You can jump between steps without losing a choice.',
            '**Fix what the rules check finds.** Click an issue to fix it, or press **Resolve all** to see every automatic fix first. **Undo** reverses any of them.',
            '**Not sure what to play?** **Guided build** on the Concept step rates what you want and suggests Virtues and Abilities, with the reason. **Build the whole character for me** makes a whole draft at once.',
            '**Finish it.** A finished character is played at the Game Table. Their sheet keeps the score: wounds, Fatigue, the season log, aging and Warping.',
          ],
        },
        {
          points: [
            ['The Virtue list', 'hides what the character may not take. Untick **Only what this character can take** to see each with its reason, and **allow anyway** to take one as a troupe ruling.'],
            ['A House', 'gives its Virtue as you choose it. Ex Miscellanea applies the tradition you pick, with what it requires.'],
            ['Powers', 'from Greater, Lesser or Ritual Power are designed on the Virtues step, from a spell or your own description.'],
            ['A magical companion', 'is built by *Realms of Power: Magic*: Might, Magic Qualities, and the book’s Common Magic Powers. Its Creature card lists the steps in the book’s order.'],
            ['Essential Traits', 'are kept on the **Essential Traits** card: a being’s true form, and any Essential Virtue or Flaw.'],
            ['A character older than 35', 'rolls aging before play, on the Concept step. A year that would kill them is not applied, so it can be rolled again.'],
            ['For grogs in a hurry,', '**Quick build**, under Tools, makes whole characters, fills out the covenant’s people, and rolls creatures from the bestiaries.'],
          ],
        },
      ],
    },
    {
      id: 'magic',
      title: 'Casting spells',
      summary: 'Casting Scores on the sheet, the cast at Dice › Spellcasting, Twilight in Resolve',
      blocks: [
        {
          ordered: true,
          list: [
            '**Read the totals.** The sheet’s **Magic** tab keeps every Casting Score and Lab Total for the current aura, Magic Resistance for each Form, and Penetration.',
            '**Cast.** At **Game Table › Dice › Spellcasting**, pick the caster, then a spell or spontaneous magic. Tick what applies now, such as a Magical Focus or raw vis, and it is added to the total.',
            '**Put it on someone.** A spell that works can be put on its target. It is kept on them, under Health & recovery, for its Duration.',
            '**Watch the Warping.** A botch adds its Warping Points. Twilight, or what a tradition suffers in its place, waits in **Seasons › Resolve**.',
          ],
        },
        { p: '**Certamen** is fought on the same page, against anyone of the saga or the Tribunal. Each side’s Fatigue goes on their sheet.' },
      ],
    },
    {
      id: 'lab',
      title: 'The laboratory',
      summary: 'Lab projects in a magus’s season in full, with helpers, experiments and the lab’s own rolls',
      blocks: [
        {
          ordered: true,
          list: [
            '**Build the lab.** Each magus’s lab is built on the covenant’s **Laboratories** tab: its Size, Virtues, Flaws and Specializations. Click a lab Characteristic to see how it is worked out.',
            '**Plan a lab project.** On **Seasons**, open the magus’s season in full. The **Lab projects** card shows the Lab Total, the vis needed, and a box to experiment.',
            '**Add helpers.** The **Helpers this season** card adds a covenant-mate’s Intelligence + Magic Theory, or the bound familiar’s, up to the magus’s Leadership.',
            '**Improve the lab.** Raising its Refinement, installing a Virtue and putting a Flaw right are lab projects too. A rise in Upkeep is paid from the treasury.',
          ],
        },
        { p: 'A lab project can invent a spell, enchant an item or a talisman, extract vis, make a Longevity Ritual, or bind a familiar. What the lab’s Flaws rule out is shown in red.' },
      ],
    },
    {
      id: 'seasons',
      title: 'Seasons and years',
      summary: 'Plan, End, Resolve: each character’s season, then time passing for the whole saga',
      blocks: [
        { p: 'The Game Table’s **Seasons** page moves the saga on, in three steps.' },
        {
          ordered: true,
          list: [
            '**Plan.** Start with the covenant: its year’s end, its Hooks, its people coming and going. Then each player in turn, magi before companions, and the grogs last. **A season in full** plans one character’s season: a book, a teacher, a lab project, Spell Mastery, writing, an Initiation.',
            '**End** the season, or several. Each character does what was logged, or their **standing activity** in their free seasons. A standing activity can be to teach covenant-mates, or to help in one’s lab.',
            '**Resolve** what it leaves: a crisis, Twilight, a curse to roll. Each stays at the top until it is settled.',
          ],
        },
        {
          points: [
            ['A teacher', 'is chosen from the saga, and the subjects offered are those they can teach this student. Logging the lesson logs the teacher’s season too.'],
            ['Writing and copying', 'works a summa, tractatus or copy a season at a time. The finished book goes to the covenant’s library.'],
            ['A season logged by mistake', 'is **Unlogged** on the character’s season log, and all it did comes off. **Turn back**, on Seasons, takes the whole saga back up to two years.'],
          ],
        },
        { p: 'Each year’s end closes the covenants’ books, rolls aging, adds Warping, and recasts wards such as the Aegis of the Hearth from the covenant’s vis.' },
      ],
    },
    {
      id: 'dice',
      title: 'Rolls, combat and recovery',
      summary: 'Any roll, an opposed roll, a blow from Attack to wound, and recovery for everyone',
      blocks: [
        {
          ordered: true,
          list: [
            '**Roll.** Go to **Game Table › Dice › Roll**. It rolls simple, stress and botch dice for anyone, the Tribunal’s people too. Wounds, Fatigue and disease are taken off for you.',
            '**Spend Confidence after the roll.** Under every roll, **After the roll** spends Confidence or Faith Points and offers a reroll of a botch die for All According to Plan.',
            '**Fight.** On **Dice › Combat & perils**, roll Initiative, Attack and Defense, then a blow from Attack to wound. The wound goes on the defender’s sheet. Falls, fire, poison and disease are there too.',
            '**Recover.** On the Overview, **Health & recovery** lists everyone wounded, tired or ill, the soonest recovery first. Choose who tends them, then pass time: every roll is made and the sheets change.',
          ],
        },
        { p: 'A **Personality Trait** can be rolled on Dice › Roll in place of a Characteristic and Ability.' },
      ],
    },
    {
      id: 'money',
      title: 'Possessions and money',
      summary: 'What each character owns, the market, and the purse beside the treasury',
      blocks: [
        {
          points: [
            ['Possessions', 'keeps what each character owns: things and their damage, arms and armor, enchanted items, a talisman, a familiar. Lab work on an item can be planned from there.'],
            ['Market & Treasury', 'buys goods, services, vis and books at the book prices. It moves pounds and vis between the treasury and the members’ purses.'],
            ['A character’s purse', 'shows on the sheet’s Overview. What a season spends comes from the purse or the covenant’s stores, and the result says which.'],
          ],
        },
      ],
    },
    {
      id: 'society',
      title: 'Society and the Tribunal’s politics',
      summary: 'Debates, petitions, agents, and the customs of four Tribunals',
      blocks: [
        {
          points: [
            ['Society & the Tribunal', 'is a Game Table page. It holds the Tribunal’s news, what the agents heard, and the agents themselves. A debate is held there against a saga character or a storyguide’s opponent, with the votes it sways.'],
            ['Tribunal customs.', 'A saga set in the Rhine, Normandy, Thebes or Transylvania is offered that Tribunal’s own rules on the Optional rules tab. They are off until ticked.'],
          ],
        },
      ],
    },
    {
      id: 'divine',
      title: 'Faith and miracles',
      summary: '*Realms of Power: The Divine*: holy powers, miracles, the saints, the Divine Ascent',
      blocks: [
        { p: 'Holy characters work wonders through prayer. (*Realms of Power: The Divine*.)' },
        {
          ordered: true,
          list: [
            '**Make one.** Answer the guided build’s question about working wonders through prayer, and it takes a Holy Method and a Holy Power that go together. Or choose a Mythic Companion of the Divine, such as a Kabbalist.',
            '**Use a power.** Go to **Game Table › Dice › Faith & miracles**. Set the aura first, then choose the Method, the Power and the effect. The card says what the Method costs.',
            '**Pray.** The card **Pray for a miracle** spends a Faith Point. **The saints and holy forbears** are invoked there too, and **Invoke God’s aid** lasts a scene.',
            '**Spend a season.** In the character’s season in full, **Seasons of holy work** makes a kabbalist’s amulets, golems and True Names.',
            '**Watch for the Divine Ascent.** It is checked when two or more Warping Points come at once. Its form is kept for life.',
          ],
        },
        { p: '**Holy Magic** is cast at **Dice › Spellcasting**, with a prayer in place of words and gestures. The tutorial **Faith, miracles and holy powers** plays a holy character at the Game Table.' },
      ],
    },
    {
      id: 'church',
      title: 'The Church',
      summary: '*The Church*: devotion to the saints, pilgrimage, the mystic’s path',
      blocks: [
        {
          ordered: true,
          list: [
            '**Use it.** On **Dice › Faith & miracles**: **Devotion to the saints** adds to invoking a saint, **A pilgrimage** tracks its Oppositional Elements against its Target Level, and **The mystic’s path** keeps a contemplative’s Spiritual Path.',
            '**Spend a season.** In the character’s season in full, **Seasons of devotion** offers a season at a shrine, reading a saint’s life, a step on the mystic’s path, the first recitation of a Ring of Solomon.',
          ],
        },
      ],
    },
    {
      id: 'faerie',
      title: 'Faerie',
      summary: '*Realms of Power: Faerie*: faerie characters, rites, bargaining and Faerie Calling',
      blocks: [
        {
          ordered: true,
          list: [
            '**Make one.** On **People**, make a faerie character as a companion or in place of a magus. It has Might 5, Pretenses bought from one pool, and a form, a cognizance and a taboo, which the rules check asks for.',
            '**Use it.** At **Game Table › Dice › Faerie**: a **Faerie rite**, held to five times the Sympathy Traits that apply, and **Faerie bargaining** against a faerie’s Might. On **Dice › Roll**, tick each Sympathy Trait that fits.',
            '**Watch the Warping.** The card **Faerie Calling** is owed when Warping comes, and waits in Seasons › Resolve.',
          ],
        },
      ],
    },
    {
      id: 'mysteries',
      title: 'The Mysteries',
      summary: '*The Mysteries*: Initiation, horoscopes and alchemy in the lab, and the rolls of each Mystery',
      blocks: [
        {
          ordered: true,
          list: [
            '**Be initiated.** In the season in full, choose a Mystery and a Mystagogue from the saga, then the book’s Script or one of your own. The card shows the Initiation Total against the target. **Initiate** adds the Virtue and the Ordeal’s Flaw.',
            '**Use it in the lab.** A **Laboratory Horoscope**, Hermetic Alchemy and the Lesser Elixir are chosen on the **Lab projects** card.',
            '**Use it in play.** The page **Game Table › Dice › Mysteries** has the rolls made at the table: a favorable hour, divination and dreams, an invoked daimon, rotes. It shows only for those who hold one.',
          ],
        },
        { p: 'Anyone a Mystagogue will take may be initiated, not only magi of the Mystery Houses. Criamon magi choose their Path there and prepare its next station.' },
      ],
    },
    {
      id: 'hedge',
      title: 'Hedge magic',
      summary: '*Hedge Magic*: six traditions, their rolls at Dice › Hedge magic, their seasons on Seasons',
      blocks: [
        { p: 'Each tradition is made in the character wizard, is used at **Game Table › Dice › Hedge magic**, and spends its seasons in the character’s season in full. (*Hedge Magic, Revised Edition*.)' },
        { heading: 'Folk witches' },
        {
          ordered: true,
          list: [
            '**Make one.** Take the Folk Witch Social Status. A Gifted witch has the seven favored powers, and the sheet keeps the apprenticeship.',
            '**Use a power.** The card **Use a folk witch power** rolls it by incantation or fetish against its Ease Factor.',
            '**Spend a season.** The card **A season in the kitchen** brews potions, makes fetishes and weaves curses. A curse is rolled in Resolve.',
            '**Watch for the Witch Moon.** It waits in Resolve when Warping comes.',
          ],
        },
        { heading: 'Elementalists' },
        {
          ordered: true,
          list: [
            '**Make one.** Take at least one Technique Virtue and one Form Virtue. Each opens its Art at 0.',
            '**Use the magic.** The card **Elemental magic** rolls Summoning, Controlling or Divining with the elements chosen, and says what the total reaches.',
            '**Spend a season.** The card **A season of Refining** makes a longevity potion or draws vis from an aura.',
            '**Watch the Warping.** As it grows, the character takes on **Elemental Traits**. The sheet lists them and what they do.',
          ],
        },
        { heading: 'Learned magicians' },
        {
          ordered: true,
          list: [
            '**Make one.** Take the Virtues of the Arts. Each opens its Art at 0. The sheet keeps the years under a master and the charms known.',
            '**Use the magic.** Cast a charm from memory or from a formulary, or write a charta in hours.',
            '**Spend a season.** Make an amulet, or invent or learn charms in **A season of charms**.',
          ],
        },
        { heading: 'Gruagachan' },
        {
          ordered: true,
          list: [
            '**Make one.** The sheet keeps the apprenticeship and the spells known, from the book or designed.',
            '**Use the magic.** Cast a Formulaic spell, or a spontaneous one.',
            '**Spend a season.** The card **A gruagach’s season** enchants a tattoo, invents a spell or draws vis.',
          ],
        },
        { heading: 'Vitkir' },
        {
          ordered: true,
          list: [
            '**Make one.** The 24 runes are raised as Arts. The sheet keeps the apprenticeship and the scripts known.',
            '**Use the magic.** Cast a rune script, its name written, hidden or left off.',
            '**Spend a season.** The card **A vitki’s season** invents or learns scripts.',
            '**Watch for Nátt-thel,** the loss of The Gift. It waits in Resolve.',
          ],
        },
        { heading: 'Nightwalkers' },
        { p: '**Straying and the night battles** rolls spirit travel, and sets a fertility battle’s outcome as the year’s harvest on the covenant’s land.' },
      ],
    },
    {
      id: 'projects',
      title: 'Hermetic Projects',
      summary: 'Its spells and enchantments, and the covenant’s great buildings and menagerie',
      blocks: [
        {
          ordered: true,
          list: [
            '**Use its spells.** They are in the spell list. Its enchantments are added to an item with **+ From the books…**.',
            '**Keep a building.** The covenant’s Overview keeps its **Great buildings**, with their stress check, and **A menagerie** with its handler.',
            '**Spend a season.** A mason’s **Build (a season)** or **Repair (a season)** is in their season in full.',
          ],
        },
      ],
    },
    {
      id: 'city',
      title: 'City & Guild',
      summary: 'Craftsmen and merchants: Labor Points, the workshop, guilds, markets and trade',
      blocks: [
        { p: '*City & Guild* is for characters who work for a living. Their business is kept in **Labor Points**, not pennies. If nobody in the troupe plays a craftsman or merchant, none of this is needed.' },
        {
          ordered: true,
          list: [
            '**Make one.** Any character with a Craft or Profession has a livelihood. The **Game Table › City & Guild** page keeps it.',
            '**Work a season.** Each season of work earns Labor Points: Characteristic + Craft, times 2, 3 or 6 for a Poor, average or Wealthy character.',
            '**Spend the savings.** The business costs 36 Labor Points a year. What is left buys a better workshop or a richer life.',
            '**Go to market.** Choose who goes, then appraise, bargain and pay. Each result shows under the roll that made it.',
          ],
        },
        { p: 'The covenant’s own craftsmen are on the same page, each with their Labor Points. A guild member has a **Guild** card beside the workshop.' },
      ],
    },
    {
      id: 'tribunal',
      title: 'The Tribunal: living covenants',
      summary: 'The Rhine’s covenants, built from their book, living their own lives beside yours',
      blocks: [
        { p: 'The **Tribunal** page builds the other covenants of the saga’s Tribunal from their book, so your covenant has neighbors. For now it has the **Rhine** (*Guardians of the Forests*).' },
        {
          ordered: true,
          list: [
            '**Add them.** Set the saga’s Tribunal to the Rhine on the Saga Overview. On the Tribunal page, press **Add** for one covenant or **Add all**.',
            '**Let them live.** Each is built by your creation rules from what the book says, with its magi, labs, library and vis. They study, age and close their books as yours do.',
            '**Answer them.** What they bring shows under **From the Tribunal** on the Game Table’s Overview. Press **Dealt with** once it is played.',
            '**Meet at the Tribunal.** Every seven years the Tribunal meets. **Motions and votes** shows how the sigils would fall, and your magi’s votes.',
          ],
        },
        { p: 'Their people stay off your lists. They are on the Tribunal page, and folded under **The Tribunal** in a season’s report.' },
      ],
    },
    {
      id: 'optional',
      title: 'Optional rules',
      summary: 'Each supplement’s optional systems: what each adds, and where it shows',
      live: 'optional',
      blocks: [
        { p: 'The supplements add systems a troupe may not want. Each is turned on or off for the saga on the **Saga Overview**’s **Optional rules** tab. One that is off leaves the pages, but nothing is deleted.' },
      ],
    },
    {
      id: 'troupe',
      title: 'Playing with a troupe',
      summary: 'Players build at home and send the file; the storyguide keeps the saga',
      blocks: [
        {
          ordered: true,
          list: [
            '**The storyguide** creates the saga and presses **Invite players** on the Saga Overview. The file holds the saga’s books and rules, and none of its characters.',
            '**Each player** opens it, makes a character on its People page, and sends it back with **Share / Export** on the sheet.',
            '**The storyguide** imports it. The Import page shows each character before it joins, and what changed if it was sent before.',
            '**After a session,** the Saga Overview’s **Troupe** card saves each player’s characters as a file, to send back.',
          ],
        },
        { p: '**Send files, not links,** for anything but a small sheet: a magus makes a link too long for a Discord message. **Stream mode**, in the sidebar, makes the text larger for sharing a screen.' },
      ],
    },
    {
      id: 'questions',
      title: 'Common questions',
      summary: 'Rulings, undo, a missing card, Confidence, moving a saga',
      blocks: [
        {
          points: [
            ['The troupe allows something the rules forbid.', 'Press **Allow** on the warning to record it as a ruling. Most numbers on the sheet can also be overridden. The Saga Overview changes what any Virtue or Flaw does, and adds your own.'],
            ['A card I read about is not on my sheet.', 'It may belong to an optional rule the saga has turned off, or to a book the saga does not use. A Tribunal’s customs appear only in a saga set there.'],
            ['How do I undo something?', '**↶ Undo** in the sidebar, or Ctrl+Z, undoes any change. A ritual cast on the covenant is undone under **Recent casts**, and its vis comes back.'],
            ['How do I gain a Virtue or Ability in play?', 'Open it: one that can be gained later says how. Then add it from the sheet’s advancement.'],
            ['How many Confidence Points can a character hold?', 'As many as they earn. The Confidence Score limits how many go on one roll, at +3 each, never on a botch.'],
            ['How do I move a saga to another computer?', '**Export saga** on the Saga Overview, then **Import** the file on the other computer.'],
          ],
        },
      ],
    },
    {
      id: 'credits',
      title: 'About the rules data, and credits',
      summary: 'Where the rules come from, and the license',
      live: 'data',
      blocks: [
        { p: 'The rules come from the markdown books in this repository, and each rule cites its book. Books marked WIP are still being transcribed. If something looks wrong, override it and check the book in the reader.' },
        { p: '*Based on the material for Ars Magica, ©1993–2024, licensed by Trident, Inc. d/b/a Atlas Games®, under [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/) (“CC BY-SA 4.0”).* Ars Magica and Mythic Europe are trademarks of Trident, Inc. Order of Hermes, Tremere, Doissetep and Grimgroth are trademarks of Paradox Interactive AB.' },
        { p: 'The book text comes from the Open License markdown edition by OriginalMadman, at [github.com/OriginalMadman/Ars-Magica-Open-License](https://github.com/OriginalMadman/Ars-Magica-Open-License). This toolkit is an unofficial fan project, not affiliated with or endorsed by Atlas Games or Paradox Interactive.' },
        { p: 'As the license requires, its rules data and text are shared under the same CC BY-SA 4.0 license. More about the Open License is at [atlas-games.com/arsmagica/openars](https://www.atlas-games.com/arsmagica/openars). The published books are available from Atlas Games.' },
      ],
    },
  ],
};
