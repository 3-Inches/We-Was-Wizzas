# Ars Magica Saga Toolkit

A browser app for running an *Ars Magica* Fifth Edition saga under the Definitive Edition rules. It builds characters and covenants, checks the rules as you go, and does the in-play arithmetic. All of its rules data is generated from the markdown books in this repository.

It runs locally in the browser. Data is stored in IndexedDB and shared as files or links, and nothing goes to a server.

## Where things are

The sidebar holds one saga at a time. **Saga Overview** sets the saga's books, optional rules and house rules. **Game Table** is where the saga is played. **Covenants** and **People** hold what the troupe builds, and **The Tribunal** holds the covenants around them. Below are the **Tools** (Quick build, Spells & Design, Enchantments) and the **Reference** (the Guide, Game Mechanics and the books).

**A character sheet is built, then is for reference.** It shows where the character stands, and each card on it says where at the Game Table that thing changes. The Game Table's pages are Overview, Seasons, Chronicle, Dice, Society & the Tribunal, Possessions, Market & Treasury, and City & Guild.

**To learn it,** open the **Guide**. Its tutorials walk through the real app, in a practice saga when they make something. Its pages **Using the toolkit**, **Playing the game** and **Running the game** explain the rest.

## What it covers

One line an area. The Guide has each one as steps, and the Game Mechanics page says, for each rule, where the toolkit does it.

| Area | What the toolkit does | Books |
|---|---|---|
| Characters | A step-by-step builder for grogs, companions, Mythic Companions and magi. It keeps every budget and pool, applies each Virtue and Flaw, and checks the rules, citing the book. Most problems are fixed with one click. | Core, *Houses of Hermes* |
| Guided build | The player rates what they want to play, and gets Virtues, Flaws, a House, Arts and Abilities recommended, then a whole draft that passes the rules check. | Core and every book in the saga |
| Quick build | Whole characters, one to eight at a time, hedge wizards, faerie wizards and Mystery initiates among them, each made as its book says; a covenant's people, books and resources; and creature encounters from a bestiary of the books' stat blocks. | Core, *Covenants*, *Grogs*, *Hedge Magic*, *Realms of Power: Faerie*, *The Mysteries* |
| The core book's templates | The Definitive Edition's ready-made grogs, companions and magi, finished and ready to play. | Core |
| Magic characters | Characters of Magic built to their own rules: Might, Qualities and Inferiorities, Powers, Essential Traits. A magical companion gets a sheet of its own. | *Realms of Power: Magic* |
| Covenants | Build Points, Hooks and Boons, laboratories, covenfolk and their Loyalty, the yearly accounts, the aura, vis sources, and the library. | *Covenants*, *Grogs*, Core |
| Seasons | One clock for the saga. Each character's season in full, the covenant's year's end, aging, Warping, and a **Resolve** step for what a season leaves to decide. Teaching, study and lab work land on the sheets. | Core, *Covenants*, *Art & Academe* |
| Laboratory | Lab Totals, lab projects (spells, items, talismans, Longevity Rituals, familiars), experimentation, and lab personalization. | Core, *Covenants* |
| Spells and enchantment | A browser of the books' spells, a spell designer with the guidelines, and an enchantment workshop. Item effects from every book can be added to an item. | Core and the supplements |
| Dice | Any roll for anyone, with their penalties taken off. Combat, spellcasting, Certamen and Twilight, each from the sheet. | Core |
| Health and recovery | Wounds, Fatigue and disease, tending, and every Recovery roll as it comes due. | Core, *Art & Academe* |
| Possessions and the market | What each character owns, purses of silver and vis, and the price lists. | *Covenants*, *City & Guild* |
| Society | Agents, debate, petitions to the Church, the Tribunal's news, and its gatherings and votes. | *Houses of Hermes: Societates*, *The Church* |
| The Tribunal | The Rhine's ten covenants as living covenants, their magi as full characters, with the Tribunal's gatherings. Each Tribunal with a Fifth Edition book has customs to turn on. | *Guardians of the Forests*, *The Lion and the Lily*, *The Sundered Eagle*, *Against the Dark* |
| City & Guild | Workshops and Labor Points, craftsmen, guilds and their ranks, trade and wondrous items. | *City & Guild* |
| Faith and miracles | Holy powers and Methods, miracles, the saints, holy magic, and the Divine Ascent. | *Realms of Power: The Divine* |
| The Church | Devotions to the saints, pilgrimages, and the mystic's path, with their seasons on Seasons. | *The Church* |
| Faerie | Faerie characters, faerie wizardry, Sympathy Traits, rites, bargaining and Faerie Calling. | *Realms of Power: Faerie* |
| The Mysteries | Initiation, the Criamon Path, horoscopes and alchemy in the lab, and the rolls of each Mystery at the table. | *The Mysteries*, *Houses of Hermes: Mystery Cults* |
| Hedge magic | Elementalists, folk witches, gruagachan, learned magicians, nightwalkers and vitkir: each has a card on the sheet and its rolls at the table, and their season-long work is on Seasons. Mythic Herbalism. | *Hedge Magic* |
| Hermetic Projects | The book's spells and enchantments, its laboratories, and great buildings and the menagerie on the covenant, with their rolls at the Game Table and the mason's seasons. | *Hermetic Projects* |
| Optional rules | Each supplement's subsystem is turned on or off for the saga. A card whose rule is off is not shown. | Several |
| Reference | Game Mechanics: the rules from the core book and the reviewed supplements, with their text. Searchable lists of Virtues and Flaws, Abilities and more. A reader for every book. | All |
| Sharing | Invite players with the saga's rules alone, follow the troupe's characters, and share a character, a covenant or a whole saga as a file or a link. | |

## Not yet automated

Rules the toolkit shows as text or reminders, kept here for later work.

- **Casting:** Boosted Magic, the per-Art split of boosting vis (only the total is checked), Spell Improvisation's "does not stack with other bonuses", and Clumsy Magic's −3 to Finesse and aiming botches (there is no aiming roller yet). Also ceremonial casting's limit of one magnitude per fifteen minutes, and Waster of Vis outside Ritual vis.
- **Hedge magic:** Mythic Alchemy's reagents, which follow *Art & Academe*'s alchemy (not yet built). Vis spent in casting a charm, a power or a script is typed in and taken from the purse by hand. The aura of a season's work is the covenant's.
- **Familiars and talismans:** the Mystery Cults' Hermes, Isis and Hekate cords, and the faerie cords.
- **City & Guild:** fairs and markets, town charters and citizenship, trading companies, the sea trade tables, and novelties. Guild officials and inquisitors are a note, not a role. For a wondrous item, the aura and the Shape and Material bonus are added by hand.
- **Tribunals:** the troupe sets penalties under the Code. Customs only for the four Tribunals with a Fifth Edition book (the Rhine, Normandy, Thebes, Transylvania), and living covenants only for the Rhine so far. A living magus's apprentice is a light record until the Gauntlet, and does not add to the master's Lab Total.
- **A living magus's Twilight** is rolled for them, and its knowledge gained or lost in their best Art; a Virtue, Flaw or spell from it is the storyguide's to add.
- **The Rhine:** only the motions the book names come before a gathering. The Tourney's other teams are not played (the final rank is entered), and the Path of the Heartbeast has no preset. The book's timeline is shown, not played out, and a covenant's sponsor is recorded by the troupe, not rolled.
- **Society:** the Gratitude system, lords' retinues, manors, feasts and hunting, artists' Reputation and polemic are reference only. A Tribunal proposal case is debated as one opponent.
- **Market:** lab texts have no book price, so one is agreed by hand. Buildings are paid for at once rather than built over years, and goods bought are noted in the record rather than added to an inventory.
- **Combat:** *Lords of Men*'s mass combat, tournaments and sieges; splitting groups, disengaging and the special maneuvers; trained animal groups.
- **Covenants:** the effect of low Loyalty on productivity. *Hermetic Projects*' building rituals are added to a building's height by hand, and a menagerie's beasts are not kept on record.
- **Lab projects:** several activities in one season other than inventing spells, such as instilling several powers at once. The Warping side effects and modified effects are rolled and noted, and described by the troupe. Free lab Virtues are added on the lab's card, and their Upkeep bought on the Market & Treasury page.
- **Mysteries, recorded but not played:** writing a new Script by experiment, the Inner Heartbeast refinements' resonant bonuses, and a Criamon's stations on an earlier Path, which are recorded but not switched off.
- **Mysteries, with a note on the sheet:** Vulgar Alchemy's sharing of an experiment's bonus, astrologically linked enchantments, inventing theurgic spells, binding a Spirit Familiar, the Living Ghost and the Ascendancy, Dream Magic's journeys, Hermetic Architecture, Hermetic Sacrifice, the Great Talisman, the Neo-Mercurians, and an immortal's learning. Study seasons in the lab do not move a digesting extraction on.
- **Faerie:** travel in the Faerie realm and its stories, sympathetic influence and tinted auras, Curse-Throwing's transfers, and learning faerie Abilities. A faerie's Pretenses learned by watching people are logged by hand. Bonding's and Captivating's lasting effects, and a glamour's faerie warping beyond Faerie Calling, are left to the troupe.
- **The Divine:** sacraments are a Faith Point given by hand. Excommunication, exorcism, the Muslim calendar's stronger Dominion, the Evil Eye's extra botch die, Divine regiones, angels' powers and a golem as a character are left to the troupe. Holy magi's Art study from Hermetic books is not halved, only Laboratory Texts, as the book's rule reads.
- **Books still to come (the roadmap's Next):** *Art & Academe*'s universities and experimental philosophy, *Ancient Magic*, the Infernal's maleficia and Goetic Arts, the Tribunal books' traditions (storm wizards, vampire hunters, Egypt's lector priests), *Grogs*' training packages and animal grogs, *Legends of Hermes*, and travel in the Magic realm.
- **Seasons:** the Church's ordination, good works and care of souls, the apprenticeship schedule, *Grogs*' per-decade aging shortcut, and *Lords of Men*'s random method of death.

## Running it

Requires Node 20 or newer.

```sh
cd app
npm install
npm run dev        # http://localhost:5173
npm test           # rules engine tests (checked against the books' worked examples)
npm run build      # static site in app/dist (works from any sub-path, e.g. GitHub Pages)
```

`npm run dev` and `npm run build` copy the markdown books into `public/books` so the reader can load them.

For testing in a browser, `src/engine/testing/sagaFixture.ts` builds a whole saga from a seed, with every kind of character, lab work and covenant in hand. The long-play test plays it for years and checks every season.

```sh
npm run qa:saga    # writes it to scripts/qa/out/saga.json (QA_SEED, QA_SEASONS, QA_TRIBUNAL, QA_OUT)
npm run qa:sweep   # imports it, then each practice saga, into the built app and visits every page and tab at 1280 and 390 pixels
```

The sweep presses every tab a page shows, so a new tab is swept without being listed. It reports page and console errors, pages wider than the screen, and "undefined" or "NaN" on a page. It needs a build, and Playwright with Chromium. `scripts/qa/` has the other browser checks: the tutorials, screenshots and the book reader.

The workflow `.github/workflows/toolkit.yml` tests and builds on pull requests. On pushes to the default branch it also deploys to GitHub Pages. For the deploy to work, enable Pages with the source set to "GitHub Actions" in the repository settings.

Work on the toolkit follows `docs/roadmap.md` and `docs/design-principles.md`.

## How it is built

```
tools/extract/        Python extractors: markdown books -> JSON (run: npm run extract)
app/src/data/         generated JSON, and hand-written data for each book (one file per system)
app/src/engine/       the rules, with no user interface: one module per system, with its tests
app/src/store/        zustand store persisted to IndexedDB, migrations, export/import
app/src/ui/           React: the builder and sheet, covenants, the Game Table, tools, reference, reader
```

- **Rules data is extracted from the books,** with a few entries added by hand. That is over 1,000 Virtues and Flaws, over 1,000 spells and 600 guidelines. It is also the Abilities, lab Virtues and Flaws, Hooks and Boons, Shape and Material, weapons and armor, and nearly 500 creatures' stat blocks.
- **Mechanics are written by hand** in `src/data/mechanics.ts`, one entry per Virtue or Flaw, as declarative effects: experience pools, bonuses, Lab Total modifiers. Virtues and Flaws without numeric effects appear on the sheet as text for the troupe.
- **Each rule cites its book and line.** The tests are built on the books' worked examples.
- **References are followed.** `tools/extract/extract_vf_refs.py` finds the Virtues and Flaws each text names and the pages it cites. What those references mean for the rules is in `src/data/crossRefs.ts`.
- **Restrictions are curated** in `src/data/restrictions.ts` from the sentences in the books that limit a Virtue or Flaw. Each is quoted in the rules check.
- **The Game Mechanics reference was read, not guessed.** The reviewed books were read section by section into `tools/extract/mechanics_index/`. `tools/extract/build_mechanics.py` checks every entry against its book, and the app shows the book's own text.
- **Every total carries its breakdown.** Clicking a number shows how it was calculated.
- **Books marked WIP** are still being transcribed, so their content can contain errors. Each saga can switch them off.

## License

Based on the material for Ars Magica, ©1993–2024, licensed by Trident, Inc. d/b/a Atlas Games®, under [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/) ("CC BY-SA 4.0"). The book text comes from the Open License markdown edition by [OriginalMadman](https://github.com/OriginalMadman/Ars-Magica-Open-License).

This toolkit is an unofficial fan project and is not affiliated with or endorsed by Atlas Games or Paradox Interactive. Ars Magica and Mythic Europe are trademarks of Trident, Inc. Order of Hermes, Tremere, Doissetep and Grimgroth are trademarks of Paradox Interactive AB. Like the rest of this repository, the toolkit is shared under CC BY-SA 4.0 (see `LICENSE.md`). The app shows this credit in its sidebar and on its Guide page.
