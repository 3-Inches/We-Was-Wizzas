# Roadmap

What is left to do, in order. Tick an item in its own pull request, with a "Done as" note. When you finish one, the next unticked item is the next thing to do.

## What "finished" means

The toolkit is finished when all of these are true.

1. **Every system in the Fifth Edition books that a troupe would use at the table more than once in a saga is built,** checked against the book, and can be found (design principles 8, 9 and 11). Anything rarer has a pointer to the book's text instead.
2. **No audit has open findings** (`audits/`). Closed audits are kept there as the record.
3. **The limits in `src/quality.test.ts` are at their targets** (stage 1 gives them).
4. **The books match upstream,** and the weekly check is quiet.

The owner may call it finished sooner. These are deliberately out of scope:

- **Third and Fourth Edition books, and third-party books.** They are in the reader on shelves of their own, as setting reference. No rules, characters or covenants are taken from them, even where they are the only source for a Tribunal.
- **Setting, history and story seeds.** They are read in the reader.
- **Adventures** (*Dies Irae*, *Tales of Power* and the like).
- **Books in `wip/`** are optional. Their text is rougher, so anything taken from them needs more checking. Do them last, and only the ready-made characters and covenants.

## How to work this list

- **One item to a pull request, and a fresh session for each item.** Read `CLAUDE.md`, `owner.md` and `design-principles.md` first. This file, the open audit and the pull request carry the plan. A long conversation does not.
- **Before the owner merges,** a review of the pull request against `owner.md` and the design principles' integration checklist, by the owner's long-running session or a fresh one. Audit 3, section W, says why.
- Each item is marked **Mechanical** or **Judgment**.
  - **Mechanical:** the fix is written down, with file and line. Follow it, test it against the book's example, and do not redesign.
  - **Judgment:** the item needs decisions about what a player sees. Read the principles, write the plan into the pull request before building, and ask the owner where a choice is theirs.
- An item is closed only when its checklists in the design principles pass, the integration checklist among them.
- If an item turns out twice the size expected, split it and write the split here.

---

## Stage 1. Close the audit

Every item refers to `audits/2026-11-16.md` by its number. That file has the detail: file, line, the book's text, and the fix.

- [x] **1.1 Rules fixes.** *Mechanical.* A1 to A7, all of B, all of F. Each fix gets a test built on the book's own example. One pull request.
- [x] **1.2 Small fixes to how cards behave.** *Mechanical.* C3 (pickers that need a second button), C4 (creation settings at the table), C5 (cards that open on a warning), C7 (numbers the player must already know), C9 (one wording for one act: use the vocabulary table). Then E2: an "In the app" pointer for every topic the new pages cover. `topicsWithoutPointer` in `quality.test.ts` must go down.
- [x] **1.3 Season work is reachable from the Seasons page, and spends from the stores.** *Judgment.* C1 and C2. Every card that takes a season (hedge magic, Faerie, the Mysteries, Great projects) is offered among the season's activities and is checked by `seasonBusy`. Vis and silver come out of the covenant's stores or the character's own, and the result says so.
  - Split by the owner (17 November 2026). Here: hedge magic's six season cards and the seasons of holy work move to the Seasons page only, their vis from the stores, and a woven curse is rolled in Resolve. Faerie and the Mysteries have no season card outside Lab projects, which were on Seasons already. No hedge season spends silver. Great projects and the Church's seasons go to 1.4.
- [x] **1.4 Fewer cards, better placed: Faith & miracles.** *Judgment.* C6, and the Church's and holy seasons split from 1.3 (C1). Split three ways by the owner (17 November 2026); 1.4b and 1.4c follow.
  - A card that cannot apply to the character chosen is hidden, and one line says what is hidden and why.
  - The season-long work moves to one "Seasons of devotion" card on Seasons, with `useSeasonWork`: a season of devotion at a shrine, a saint's hagiography, the mystic's path's seasons, a pilgrimage's season, the first recitation of a Ring of Solomon, the search for the Book of Solomon. The Faith page keeps the records and what happens in play, with a link.
- [x] **1.4b Prompts after Warping, and Sympathy Traits on rolls.** *Judgment.* C8. When Warping Points come, offer what follows, as Twilight is offered: the Witch Moon, Nátt-thel, Faerie Calling. A roll the book makes when a season ends waits in Resolve. On the Roll page, a tick per Sympathy Trait for a character who has them.
  - Done as: `gainWarping` (`src/engine/warping.ts`) adds the points and owes the tradition's reaction on the Resolve list, linked to its card, which opens on it. `quality.test.ts` lists the files still allowed to add Warping Points directly, each with its reason. The year's Warping (prolonged) brings only the Witch Moon, and gives a folk witch or a faerie-touched character no ordinary Warping Virtues or Flaws.
- [x] **1.4c Where Great projects lives.** *Judgment.* C10, and a mason's building season split from 1.3 (C1): logged and checked by `seasonBusy`, the building's progress kept where C10 puts it.
  - Decided by the owner (17 November 2026): the building and the menagerie go to the covenant, in one **Great projects** card on its Overview tab. The covenant keeps each building's record: its height, the quality of its weakest and its latest work, and damage taken. The card's stress check uses the covenant's best mason and records a lost damage level. The menagerie's handler is chosen from the members.
  - The mason's season is on Seasons, in a character's season in full: **Build (a season)** raises the building by the mason's pace, its quality from the Workshop Total (Int + Craft: Mason + Innovation + Raw Materials against 3, 6, 12, 15). **Repair (a season)** mends one damage level, or brings shoddy work up to standard. Both are logged with `useSeasonWork`, and Unlog restores the building.
  - Possessions loses the card.
- [x] **1.5 The Guide, rewritten as steps.** *Judgment.* D2. Model: `src/data/roleplay.ts`. Each system gets "make one, use it, spend a season, what to watch for". Move the Guide's text into data, as the roleplay pages are, so the same tests can check it. Targets: under 6,000 words, no sentence over 40 words, no block over 85.
  - Done as: the page's text is `src/data/toolkitGuide.ts`, drawn by the roleplay pages' renderer, one folding card a system. 3,529 words (from 9,431), longest sentence 34, no block over 85. `toolkitGuide.test.ts` holds it there, and checks that each system is written as numbered steps and names the Game Table's pages as the app does. `src/data/guideText.ts` measures the Guide one way for its tests and for `quality.test.ts`. Complete lists (every Boon's effect, every living covenant's custom) were cut: the cards and Game Mechanics hold them. `HelpPage.tsx` keeps only what it draws live (the tutorials, Game Mechanics' subjects, the optional rules, the data counts), and fell from 998 lines to 200.
- [x] **1.6 The README, cut to what a visitor needs.** *Judgment.* D3. Targets: under 25,000 characters, no line over 600. Keep: what it is, what it covers (one line a system), how to run it, how it is built, what is not automated. The long descriptions go to the Guide or are deleted.
  - Done as: 14,149 characters (from 123,520), longest line 431 (from 9,648), no sentence over 40 words. Where things are, then a table of areas (what each does in one line, and its books), then "Not yet automated", running it, and how it is built. The long descriptions were deleted: the Guide (1.5) has each system as steps. Some of that detail explains how the systems connect, so look there before rebuilding something: `git show 079464b:app/README.md` is the last long README. Pilgrimages left "Not yet automated", since *The Church*'s card tracks them. Counts that drift are rounded. `quality.test.ts`'s README limits are lowered to match.
- [x] **1.7 Tutorials.** *Judgment.* D4. Shorten every step over 60 words (71 of them; 56 were over 70). Fix the stale sidebar step and the Dice step, and the City & Guild step that finds no card at 390. Split from E1 (17 November 2026), since the new tutorials need practice characters the toolkit cannot yet make; they are 1.7b.
  - Done as: `tours.ts` split into one file a tutorial in `src/ui/tour/tutorials/`, the page addresses they share in `places.ts`; it is off the big-files list. Every step is 60 words or fewer (the longest was 185). A step was cut where its detail is on the card, and split where all of it was needed: City & Guild went from 19 steps to 30, the Divine from 17 to 26. `quality.test.ts` counts steps over 60 words, at 0. The City & Guild step that found no card at 390 was the QA script's doing: `tutorials.cjs` looked for the card before it chose the practice craftsman, so it found one only when the course's random companion had a Craft. It now chooses first.
- [x] **1.7b Tutorials for hedge magic, and for Faerie and the Mysteries.** *Judgment.* E1. Hedge magic follows whichever tradition the character has. The Church got a step in the Divine tutorial, and *Hermetic Projects* one in the laboratory tutorial.
  - Decided by the owner (18 November 2026): Faerie and the Mysteries are **two short tutorials**, each following one character, not one that changes character halfway.
  - Done as: **Hedge magic** (9 steps), **Faerie at the table** (8) and **The Mysteries at the table** (6), in the course after the Divine. `Tour.suits` makes a tutorial follow only a character it suits, and replaced `prefersTrade` and `prefersHoly`. `TourStep.variants` gives a step its text and target for the first kind of character that fits: the hedge steps for casting, the sheet's record, the season's work and the Warping each have one for each of the six traditions.
  - The practice characters are made by Quick build, with what the tutorial is about given free "For practice". `PracticeSpec` gained `abilities` and `sympathy`. A folk witch: a physician with Folk Witch, The Gift, Unstable Magic and Healing 2. A faerie wizard: cunning folk with Evocation, Weal, Summoning, Faerie Sympathy and Dawn +3. A magus with Divination & Augury and Hermetic Dream Interpreter. The tests hold each to no error in the rules check. The fixtures were not bundled.
  - Who each Dice page is for (`hasHedgeMagic`, each tradition's check, `hasFaerieTable`, `hasTableMystery`) moved from the pages into the engine (`src/engine/hedgeTraditions.ts` and the Faerie and Mysteries modules), so the tutorials need not load the pages.
  - Found on the way: a step on **Dice › Roll** counted as already there on any other part of the Dice page, so it never went. `places.dice` now names the part always.
  - Found on the way: a character with one gruagach Form and no Technique (Quick build can give the Form Vision alone) broke Dice › Hedge magic. The card now says what to take. `hedgeTradition` counts a tradition only when the character can cast with it, and the hedge tutorial follows only such a character.
  - `tutorials.cjs --fixtures` imports each hedge, Faerie and Mysteries practice saga and takes its tutorial on each finished character. Clean is "no target: 0". `tours.test.ts` checks that each tradition's fixture is shown its own cast and season cards.

Stage 1 is done. Its limits in `quality.test.ts` were lowered as each item closed. Its audit is kept, marked closed, as the record and the model for the next (`audits/2026-11-16.md`). Audit 3 checked stage 1's work: stage 5 holds what it found.

## Stage 2. Bring the books in step with upstream

- [x] **2.1 The update.** *Judgment.* Done against upstream of 16 November 2026. `tools/books/README.md` has the procedure, and what that run found.
- [ ] **2.2 After each later upstream change,** the weekly check opens an issue. Follow `tools/books/README.md`. It will be far smaller. This item is never ticked.

- [x] **2.3 Item effects in the spell catalog.** *Mechanical.* Found during 2.1. `extract_spells.py` now tells an item effect from a spell by the book's marks, as `extract_hp.py` does for *Hermetic Projects*: 273 effects from fourteen other books moved to `enchantments.json`, and the item editor groups them by book.

Do stage 2 before stage 3: building more on text that is about to shift doubles the work.

## Stage 5. Close audit 3 (do this before stage 3)

Audit 3 (`audits/2026-11-18.md`) checked stages 1 and 2 and how they were done. Every item refers to it by its number. Most of its findings are at the joins between systems, so each item here also passes the integration checklist.

- [x] **5.1 Warping and what follows it.** *Mechanical.* A1 (a double botch studying vis owes no Twilight) and B1 (Unlog leaves the reaction owed). One pull request, with the guard in `quality.test.ts` widened.
  - Done as: `gainWarping` takes `counted` (the points are on the sheet already, through a season entry) and `entry` (the season whose work brought them: the reaction's uid goes on its `undo.owed`). `seasonWarping` (`src/engine/warping.ts`) owes what follows a season entry's botch, and both a planned season's vis study (`time.ts`) and one logged by hand (`AdvancementTab.tsx`) call it after `applySeason`. Unlog takes off what `undo.owed` names. A lab season (`labUndo`), original research and every `useSeasonWork` card record any reaction their work raised. A living covenant's magus owes nothing, as for the aura's Warping. The guard now catches any change to `warpingPoints`, a season entry's included, outside the listed files. Tests: `src/engine/warpingSeason.test.ts`.
- [x] **5.2 Offer only what can apply, and open on what can be done.** *Mechanical.* A2 (the Hermetic Arts offered to any Gifted character) and B4 (season cards that open on a disabled button).
  - Done as: `learnsArts` (`src/engine/firstChoice.ts`) is the one test of who learns the Arts: a magus. The toolkit records a Gift opened to the Arts nowhere else (an apprentice is a light record until the Gauntlet), so a Gifted hedge wizard or companion is offered none (*Hedge Magic* lines 433 and 846). Every place an Art is offered uses it: Plan a season (the subject, Study raw vis, and the library's books, which now list only books on what the character can study), the standing activity, priorities, a covenant-mate's or the covenant's teaching, the best study the clock picks, experience from a story, and the Arts table on the sheet (kept for one who has Art experience by mistake, so it can be taken off). A season set on an Art for one who is not a magus, by an old save, goes to their own work, and the report says why (`runActivity`, `src/engine/time.ts`). The study opens on the character's best Ability. The Twilight roll is offered to magi only (*Hedge Magic* line 634: no hedge tradition has Wizard's Twilight).
  - The first choice a card opens on: `bestFirst` and `firstDoable` in the same module. The kitchen (`firstKitchenWork`, `src/engine/folkWitch.ts`) opens on the first work the witch can do with the vis to hand, with her best power for it, and drawing vis from the aura when nothing else can be done; the witch's power card on her best power; a gruagach's season (`firstGruagachWork`, `src/engine/gruagach.ts`) on a tattoo of the highest book spell within the Lab Total, else a spell they progress on, else vis. Inventing a gruagach spell with no progress is now refused. The Aging card offers its roll only to one who ages; the Great Elixir says in one line what comes first, with no button; the Apprentice card takes an apprentice without a name.
  - `scripts/qa/firstChoice.cjs [width] [fixture] [--shots]` opens every card on Dice and Seasons for each fixture character and lists any that opens on a disabled button or a warning, and checks that only a magus is offered the Arts. Clean is "0 cards open on a disabled button or a warning; Arts offered: as they should be". Tests: `src/engine/firstChoice.test.ts`.
  - Left as it is: the faerie rite and bargaining buttons wait until a Sympathy Trait is ticked, as audit 2's C5 decided: which traits fit an effect only the player can say. The button's title says so.
- [x] **5.3 The Chronicle tells each kind of season.** *Mechanical.* B2.
  - Found during 5.1: a botched study from vis is told as a successful one ("the pawns glowing faintly as their power was drawn into understanding", `src/engine/chronicle.ts:101`), since a botch is logged as `study-vis` with no xp. And the record's fold says "(1 lines)" (`src/ui/pages/ChroniclePage.tsx:63`).
  - Done as: a season log entry keeps `told` (optional), a phrase that follows the character's name, made from what the work did. `src/engine/seasonTold.ts` makes it, one function to a kind of work: the kitchen (the potion and its doses, the curse's target, the fetish), Refining, a vitki's scripts, an amulet, charms, a gruagach's tattoo or spell, the mason's building and its height, devotion (the saint, the ring, the path's Quest), holy work, each kind of lab project (the spell, the item), help in the lab, original research, the apprentice, the workshop, a wondrous item, an Initiation, a book opened to be clarified, and a gathering of the Tribunal. `useSeasonWork`'s result must give `told`, so the typecheck catches a card that does not.
  - The Chronicle (`seasonTelling` and `writeChronicle`, `src/engine/chronicle.ts`) prefers `told`. A study from vis with Warping Points is told as a botch, with the Wizard's Twilight still owed from it; this works on old saves too. An old entry with no `told` is told from its activity as before, an old lab season from its project's kind, and any other `'other'` season as "business of their own", not as the daily round.
  - The people's section keeps each character's phrase with its entry's uid (`TimeReport.story[].people`). The Chronicle and the Seasons page drop a season unlogged since (`tellPeople`). Sentences now name two people at most ("A did this, while B did that"), so none runs over 40 words read aloud. The record's folds say "1 line".
  - Not given a phrase: a season planned on Plan a season as "Other" carries only the player's free text, which is not a phrase. It is told as "went about business of their own". The living covenants' people run none of the hedge, holy, devotion or mason work (no engine path runs it for them); their lab seasons carry the same `told` as the players', and the Tribunal's news quotes their season's line, which already names the work.
  - `scripts/qa/chronicle.cjs [width] [fixture] [saga.json]` works one season of each kind on each practice character's season cards, ends it, and prints what the Chronicle says. Clean is "stock phrases: 0". Tests: `src/engine/seasonTold.test.ts`.
  - Also fixed, in the kitchen card: three lines of player text said "herself" and "she".
- [ ] **5.4 A season in full, ordered by the character.** *Judgment.* B3. After 5.2. Write the order into the pull request first; the owner may want a say.
- [ ] **5.5 Sympathy Traits in one place; the troupe's list of changes.** *Mechanical.* B5 and B6.
- [ ] **5.6 Smaller.** *Mechanical.* C1 (split `HolyPart.tsx` by card) and C2 (the 56 Game Mechanics topics with no "In the app" pointer).
- [ ] **5.7 Quick build for the hedge traditions, faerie wizards and the Mysteries.** *Judgment.* B7. The largest. One tradition at a time if it grows.
- [ ] **5.8 Great projects' rolls at the Game Table.** *Mechanical.* B8.
  - Decided by the owner (18 November 2026): rolls happen at the Game Table. The building's stress check and the menagerie's rolls move to **Game Table › Dice**, with the same choice of covenant, mason and handler. The covenant's Overview keeps the record (height, quality, damage) and links to the rolls. Move the tutorial steps and pointers that led to the old place (`tutorials/lab.ts`).
- [ ] **5.9 Living covenants' magi and Twilight.** *Mechanical*: decided by the owner (18 November 2026), they roll Twilight as the players do. Found during 5.1. A living covenant's magus gains Warping Points from a botch studying vis and from the aura (`src/engine/time.ts`, `seasonWarping` and `auraYearEnd`), and nothing follows: no player resolves it. But a lab accident's Warping goes through `gainWarping` whoever the magus is (`src/engine/projects.ts:622`), so a living magus can owe a Twilight nobody rolls. Owner point 5 asks that they play by the players' rules. Fix: one rule for all three. Roll Twilight avoidance for a living magus when the season ends (DE line 9755), and tell the Twilight in the Tribunal's news.
- [ ] **5.10 Unlog after a season's roll is made.** *Mechanical*: decided by the owner (18 November 2026), a roll already made stands. Unlog drops a roll still waiting in Resolve, as now; once it is rolled, Unlog leaves what it did, and the Unlog button says so. Turn back undoes everything. Found during 5.1. Unlogging the season of a woven curse or a ring's first recitation drops the roll while it waits in Resolve (`seasonEndRolls`). Once the roll is made, Unlog no longer touches what it did. A botched curse's Warping and the Witch Moon it brings stay (`rollWovenCurse`, `src/engine/folkWitch.ts:198`), and so does a ring learned.
- [ ] **5.11 A new Ability from a book.** *Mechanical.* Found reviewing 5.2. Plan a season's "From the covenant library" (`src/ui/character/sheet/AdvancementTab.tsx`, the library filter and `pickBook`) lists an Ability's book only to one who has the Ability already, and `pickBook` cannot set an Ability the character lacks as the subject. So a companion cannot begin Latin or Artes Liberales from the covenant's summa. Fix: list the books on Abilities this character could learn (check the book for which need a Virtue first: Supernatural ones do), and let picking one begin the Ability at 0, as Worship begins Church Lore (`new:church-lore`). A test: a companion reads a Latin summa and gains the Ability.

- [ ] **5.12 Holy work and Unlog.** *Mechanical.* Found during 5.3. A season of holy work (`HolyWorksCard`, `src/ui/pages/HolyPart.tsx`, `work`) is logged with no `undo`. Unlog takes back its experience but not the work's progress and seasons, the long-term Fatigue a Merkavah season costs, or a finished amulet or golem power, which should make the season final. Fix: log it through `useSeasonWork`, with the work as it was in `undo`, and `final` when the work is done.
- [ ] **5.13 A botched study from vis: experience.** *Judgment.* Found during 5.3. The two ways to study vis disagree on a botch. A planned season gives no experience (`src/engine/time.ts`, the `vis` standing activity). Plan a season's roll sets the die to 0 and still counts the aura (`src/ui/character/sheet/AdvancementTab.tsx`, the stress-die button, then `computeStudy`), while its badge says "no xp". The book (DE line 16213) gives the Source Quality as the stress die + the aura, and says only that a double botch may bring Twilight. Decide which, and make both agree.
- [ ] **5.14 A gruagach's season that draws no vis.** *Mechanical.* Found during 5.3. On the gruagach fixture, "draw vis from the aura" was offered and spent a season for 0 pawns (Lab Total under 10; `gruagachExtraction`, `src/ui/pages/GruagachPart.tsx`). The card should say it draws none and not offer the season. Check the kitchen's and Refining's draws the same way.

When stage 5 is done, mark audit 3 closed. The next audit is due after stage 3's first five or six systems.

## Stage 3. What the other books add

In the owner's order. Sizes: **S** a day, **M** a few days, **L** a week or more. Before each, apply principle 11: build what a troupe will use, point at the rest. The suggested cuts are below each item; the owner may overrule them.

Already built: *Hedge Magic*, *Realms of Power: Faerie*, *The Mysteries*, *The Church*, *Hermetic Projects*.

- [ ] **3.1 *Lords of Men*.** *Judgment.* L. Mass combat (battles, battlefield events, sieges), mounted combat, a manor and its income, hawking.
  - Build: mass combat as one Game Table page; mounted combat as modifiers on the Combat page; a manor as a covenant income source.
  - Point at the book: hawking, tournaments' detail, law.
- [ ] **3.2 *Apprentices*.** *Judgment.* M. Gifted children: Turbulence, the stages of maturing, Cantations, the schools.
  - Build: child characters in the builder (the toolkit has apprentices in play already), Turbulence as a roll, Cantations as a spell list.
- [ ] **3.3 *Ancient Magic*.** *Judgment.* L. Each lost tradition is a Breakthrough to research (the toolkit has original research) and sometimes a power to use.
  - Build: each tradition as a research goal with its book's Insight sources, plus Defixio and Hyperborean hymns as usable magic.
  - Point at the book: the rest, until a saga wants them.
- [ ] **3.4 *Realms of Power: The Infernal*.** *Judgment.* L. The Maleficia, the three Goetic Arts not yet built, infernal characters. Copy the shape of the Holy page.
- [ ] **3.5 *The Cradle & the Crescent*** (wip). *Judgment.* L. Sahir summoning and binding of jinn, jinn as characters.
- [ ] **3.6 *Rival Magic*** (now in `reviewed/`). *Judgment.* L or more. One tradition to a pull request. Start with the one the owner's saga would meet.
- [ ] **3.7 *Art & Academe*.** *Judgment.* M. Medicine beyond disease, mundane astrology, universities, works of art.
  - Build: medicine on the Recovery cards; university study as season activities.
- [ ] **3.8 *Antagonists*** (wip). *Mechanical.* M. About ten opponents as non-player characters, read by the stat-block reader that built the Rhine magi (`src/engine/character/statBlock.ts`).
- [ ] **3.9 *Magi of Hermes*** (wip). *Mechanical.* M. About a dozen magi, the same way.
- [ ] **3.10 Living covenants for Normandy** (*The Lion and the Lily*). *Judgment.* L. Copy the Rhine: `src/data/livingCovenants/`.
- [ ] **3.11 Living covenants for Thebes** (*The Sundered Eagle*). L.
- [ ] **3.12 Living covenants for Transylvania** (*Against the Dark*). L.
- [ ] **3.13 Other Tribunals** (*Lands of the Nile*, *Faith & Flame*, *The Contested Isle*, *Between Sand & Sea*). L each. Only those the owner asks for.
- [ ] **3.14 *Through the Aegis*** (wip). *Mechanical.* L. Seven covenants to import whole.
- [ ] **3.15 *The Living Covenant*** (wip). *Mechanical.* S. About fifteen named covenfolk.

The Tribunals covered only by Third or Fourth Edition books are not built.

## Stage 4. Keeping it in shape

Not items to schedule. Do them when a change touches the place.

- **Files over 800 lines** are listed in `quality.test.ts`. When you add to one, split it first. `tours.ts` splits by tutorial, and each `*Part.tsx` splits by card.
- **An audit after each stage,** or after every five or six systems: read what was added against the books, the design principles and `owner.md`, and how the work was done. `audits/README.md` says how; the audits there are the models. Write the findings as numbered items with file, line and fix, then add them here as a stage. Keep the audit, marked closed, when its stage is done.
- **When a rule of work changes,** change `CLAUDE.md` or the design principles in the same pull request. They are the only memory a new session has.

---

## Done

- 2026-11: the foundations for working this list (`CLAUDE.md`, design principles, this roadmap, `quality.test.ts`, the QA tools and practice sagas in `scripts/qa/`, the book tools in `tools/books/`, the weekly upstream check).
- 2026-11: the Guide's pages **Playing the game** and **Running the game**.
- 2026-11: stage 1's rules fixes (1.1) and small card fixes (1.2).
- 2026-11: hedge magic's and holy work's seasons on the Seasons page, their vis from the stores (1.3).
- 2026-11: the Faith page shows only what applies; the seasons of devotion on Seasons (1.4).
- 2026-11: prompts after Warping wait in Resolve; Sympathy Traits on the Roll page (1.4b).
- 2026-11: great buildings and the menagerie on the covenant; a mason's season on Seasons (1.4c).
- 2026-11: the Guide's toolkit page rewritten as steps, its text moved into data (1.5).
- 2026-11: the README cut to a page: a table of areas, and what is not yet automated (1.6).
- 2026-11: every tutorial step cut to 60 words or fewer, and the tutorials split into a file each (1.7).
- 2026-11: tutorials for hedge magic, Faerie and the Mysteries; steps for The Church and *Hermetic Projects* (1.7b).
- 2026-11: audit 3 of stages 1 and 2, and of how they were done. The owner's expectations written down (`owner.md`); an integration checklist; the sweep's saga set up as the owner plays (`QA_LIVING=all QA_OPTIONAL=all`); audits kept in `audits/`.
- 2026-11: the books brought in step with upstream (2.1). *Hermetic Projects*' errata are in, four books moved to `reviewed/`, and the reader gained shelves for earlier editions and third-party books.
- 2026-11: what follows a season's Warping waits in Resolve, a double botch studying vis among it, and Unlog takes it back with the points (5.1).
- 2026-11: only a magus is offered the Hermetic Arts, study from vis and the Twilight roll; the season and power cards open on what the character can do, checked by `scripts/qa/firstChoice.cjs` (5.2).
- Earlier work is in the merged pull requests.
