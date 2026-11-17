# Roadmap

What is left to do, in order. Tick an item when its pull request merges. When you finish one, the next unticked item is the next thing to do.

## What "finished" means

The toolkit is finished when all of these are true.

1. **Every system in the Fifth Edition books that a troupe would use at the table more than once in a saga is built,** checked against the book, and can be found (design principles 8, 9 and 11). Anything rarer has a pointer to the book's text instead.
2. **The audit has no open findings** (`audit-2026-11.md`), and the file is deleted.
3. **The limits in `src/quality.test.ts` are at their targets** (stage 1 gives them).
4. **The books match upstream,** and the weekly check is quiet.

The owner may call it finished sooner. These are deliberately out of scope:

- **Third and Fourth Edition books, and third-party books.** They are in the reader on shelves of their own, as setting reference. No rules, characters or covenants are taken from them, even where they are the only source for a Tribunal.
- **Setting, history and story seeds.** They are read in the reader.
- **Adventures** (*Dies Irae*, *Tales of Power* and the like).
- **Books in `wip/`** are optional. Their text is rougher, so anything taken from them needs more checking. Do them last, and only the ready-made characters and covenants.

## How to work this list

- **One item to a pull request, and a fresh session for each item.** Read `CLAUDE.md` and `design-principles.md` first. This file, the audit and the pull request carry the plan. A long conversation does not.
- Each item is marked **Mechanical** or **Judgment**.
  - **Mechanical:** the fix is written down, with file and line. Follow it, test it against the book's example, and do not redesign.
  - **Judgment:** the item needs decisions about what a player sees. Read the principles, write the plan into the pull request before building, and ask the owner where a choice is theirs.
- An item is closed only when its checklist in the design principles passes.
- If an item turns out twice the size expected, split it and write the split here.

---

## Stage 1. Close the audit

Every item refers to `audit-2026-11.md` by its number. That file has the detail: file, line, the book's text, and the fix.

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
  - Done as: 14,149 characters (from 123,520), longest line 431 (from 9,648), no sentence over 40 words. Where things are, then a table of areas (what each does in one line, and its books), then "Not yet automated", running it, and how it is built. The long descriptions were deleted: the Guide (1.5) has each system as steps, and the git history keeps the old text. Pilgrimages left "Not yet automated", since *The Church*'s card tracks them. Counts that drift are rounded. `quality.test.ts`'s README limits are lowered to match.
- [ ] **1.7 Tutorials.** *Judgment.* D4 and E1. Shorten every step over 60 words (56 of them now). Add one tutorial for hedge magic and one for Faerie and the Mysteries, each on its practice saga in `scripts/qa/fixtures/`. Fix the stale sidebar step.

When stage 1 is done, lower every limit in `quality.test.ts` to what was reached, and delete the audit file.

## Stage 2. Bring the books in step with upstream

- [x] **2.1 The update.** *Judgment.* Done against upstream of 16 November 2026. `tools/books/README.md` has the procedure, and what that run found.
- [ ] **2.2 After each later upstream change,** the weekly check opens an issue. Follow `tools/books/README.md`. It will be far smaller. This item is never ticked.

- [x] **2.3 Item effects in the spell catalog.** *Mechanical.* Found during 2.1. `extract_spells.py` now tells an item effect from a spell by the book's marks, as `extract_hp.py` does for *Hermetic Projects*: 273 effects from fourteen other books moved to `enchantments.json`, and the item editor groups them by book.

Do stage 2 before stage 3: building more on text that is about to shift doubles the work.

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
- **Two audits a year,** or after every five or six systems: read what was added against the books and against the design principles, as `audit-2026-11.md` did. Write the findings as numbered items with file, line and fix, then add them here as a stage.
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
- 2026-11: the books brought in step with upstream (2.1). *Hermetic Projects*' errata are in, four books moved to `reviewed/`, and the reader gained shelves for earlier editions and third-party books.
- Earlier work is in the merged pull requests.
