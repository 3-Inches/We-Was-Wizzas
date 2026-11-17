# Roadmap

What is left to do, in order. Tick an item when its pull request merges. When you finish one, the next unticked item is the next thing to do.

## What "finished" means

The toolkit is finished when all of these are true.

1. **Every system in the Fifth Edition books that a troupe would use at the table more than once in a saga is built,** checked against the book, and can be found (design principles 8, 9 and 11). Anything rarer has a pointer to the book's text instead.
2. **The audit has no open findings** (`audit-2026-11.md`), and the file is deleted.
3. **The limits in `src/quality.test.ts` are at their targets** (stage 1 gives them).
4. **The books match upstream,** and the weekly check is quiet.

The owner may call it finished sooner. These are deliberately out of scope:

- **Third and Fourth Edition books.** They stay in the reader as setting reference. No rules, characters or covenants are taken from them, even where they are the only source for a Tribunal.
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
- [ ] **1.2 Small fixes to how cards behave.** *Mechanical.* C3 (pickers that need a second button), C4 (creation settings at the table), C5 (cards that open on a warning), C7 (numbers the player must already know), C9 (one wording for one act: use the vocabulary table). Then E2: an "In the app" pointer for every topic the new pages cover. `topicsWithoutPointer` in `quality.test.ts` must go down.
- [ ] **1.3 Season work is reachable from the Seasons page, and spends from the stores.** *Judgment.* C1 and C2. Every card that takes a season (hedge magic, Faerie, the Mysteries, Great projects) is offered among the season's activities and is checked by `seasonBusy`. Vis and silver come out of the covenant's stores or the character's own, and the result says so.
- [ ] **1.4 Fewer cards, better placed.** *Judgment.* C6 (Faith & miracles shows nine cards to everyone), C8 (what the toolkit could prompt for), C10 (where Great projects lives).
- [ ] **1.5 The Guide, rewritten as steps.** *Judgment.* D2. Model: `src/data/roleplay.ts`. Each system gets "make one, use it, spend a season, what to watch for". Move the Guide's text into data, as the roleplay pages are, so the same tests can check it. Targets: under 6,000 words, no sentence over 40 words, no block over 85.
- [ ] **1.6 The README, cut to what a visitor needs.** *Judgment.* D3. Targets: under 25,000 characters, no line over 600. Keep: what it is, what it covers (one line a system), how to run it, how it is built, what is not automated. The long descriptions go to the Guide or are deleted.
- [ ] **1.7 Tutorials.** *Judgment.* D4 and E1. Shorten every step over 60 words (56 of them now). Add one tutorial for hedge magic and one for Faerie and the Mysteries, each on its practice saga in `scripts/qa/fixtures/`. Fix the stale sidebar step.

When stage 1 is done, lower every limit in `quality.test.ts` to what was reached, and delete the audit file.

## Stage 2. Bring the books in step with upstream

- [ ] **2.1 The update.** *Judgment.* Follow `tools/books/README.md`, which has the procedure and the results of a trial run. The pointers move by tool. The work is in the extractors. Known from the trial:
  - `extract_hp.py` no longer recognizes *Hermetic Projects*' 80 enchanted devices: upstream reorganized the book and changed its heading levels. `bookEnchantments.test.ts` fails until it does.
  - Four spells and one creature (`gotf-ghostly-gladiators`) disappear. Find out why for each.
  - The bestiary gains 63 creatures, from *The Contested Isle*, *Faith & Flame*, *Rival Magic* and others. Check a sample of each book's are real stat blocks.
  - About 180 entries change their text (mostly corrected typos). Skim them with `datadiff.py --all`.
  - `mechanics.test.ts` fails on quotes whose wording upstream corrected. Copy the new wording into `tools/extract/mechanics_index/`.
  - *Hermetic Projects* has errata upstream. Recheck `src/engine/projects.ts` and `src/data/hermeticProjects.ts` against the new text: every formula and every worked example.
  - Four books moved from `wip/` to `reviewed/`. Set their "reviewed" mark in `books.py`.
  - New upstream: one Fifth Edition third-party book and two Fourth Edition books. Register them for the reader only.
- [ ] **2.2 After each later upstream change,** the weekly check opens an issue. Repeat 2.1. It will be far smaller.

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
- [ ] **3.6 *Rival Magic*** (in `reviewed/` after stage 2). *Judgment.* L or more. One tradition to a pull request. Start with the one the owner's saga would meet.
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

- **Files over 800 lines** are listed in `quality.test.ts`. When you add to one, split it first. `tours.ts` splits by tutorial, `HelpPage.tsx` empties as the Guide moves into data (1.5), and each `*Part.tsx` splits by card.
- **Two audits a year,** or after every five or six systems: read what was added against the books and against the design principles, as `audit-2026-11.md` did. Write the findings as numbered items with file, line and fix, then add them here as a stage.
- **When a rule of work changes,** change `CLAUDE.md` or the design principles in the same pull request. They are the only memory a new session has.

---

## Done

- 2026-11: the foundations for working this list (`CLAUDE.md`, design principles, this roadmap, `quality.test.ts`, the QA tools and practice sagas in `scripts/qa/`, the book tools in `tools/books/`, the weekly upstream check).
- 2026-11: the Guide's pages **Playing the game** and **Running the game**.
- Earlier work is in the merged pull requests and the README.
