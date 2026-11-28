# Ars Magica Saga Toolkit

This repository holds the *Ars Magica* open-license books as markdown (`reviewed/`, `wip/`, `3rd-party/`) and, in `app/`, a browser toolkit built from them: character and covenant creation with the rules checked, and the arithmetic of play. The books come from an upstream repository; the toolkit is ours.

## Read these before starting work

| File | What it is |
|---|---|
| `app/docs/owner.md` | How the owner's troupe plays, and what the owner expects of every change. **Read it first.** |
| `app/docs/roadmap.md` | What is left to do, in batches, in order, and what "finished" means. |
| `app/docs/design-principles.md` | How the toolkit should work and read, with the checklists a change must pass, the integration checklist among them. |
| `app/docs/audits/` | The audits. The open one has the findings the roadmap refers to, each with file, line and fix. Its `README.md` says how to do one. |
| `app/README.md` | What the toolkit does, and how it is built. |

## Commands

Run from `app/`. In a new container, run `npm ci` there first.

| To | Run |
|---|---|
| Typecheck | `./node_modules/.bin/tsc -p tsconfig.json --noEmit 2>&1 \| grep -E "^src/"` (no output means clean) |
| One test file | `./node_modules/.bin/vitest run src/path/to/file.test.ts` |
| All tests (about 145 s) | `./node_modules/.bin/vitest run` |
| Build | `npm run build` |
| Serve the build | `npx vite preview --port 4173 --strictPort` (in the background) |
| Look at the hedge magic, Faerie and Mysteries pages | `node scripts/qa/shots.cjs [width] [fixture]` (see `scripts/qa/fixtures/index.json`) |
| Check that each card opens on something the character can do, and only a magus is offered the Arts | `node scripts/qa/firstChoice.cjs 390` (clean is "0 cards open on a disabled button or a warning; Arts offered: as they should be") |
| Check that a record the sheet keeps is changed there, and named when a character is sent back | `node scripts/qa/sentBack.cjs 390` (clean is "problems: 0") |
| Run every tutorial | `node scripts/qa/tutorials.cjs 1280` and `390`. Clean is "errors: none" with 2 "no target" steps (Welcome, and "Design the power"). |
| Run the hedge magic, Faerie and Mysteries tutorials on each practice saga | `node scripts/qa/tutorials.cjs 1280 --fixtures`, then `390`. Clean is "no target: 0" and "errors: none". |
| Make the saga the sweep visits, set up as the owner plays | `QA_LIVING=all QA_OPTIONAL=all npm run qa:saga` (a few minutes; writes `scripts/qa/out/saga.json`) |
| Run step 5's checks in one command | `npm run qa:final` (add `-- --fixtures` when a tutorial changed). It makes the owner's saga afresh, runs the tutorials at both widths, then the sweep, and ends "All clean." only when every check ran and was clean; a check left out is named "not run". It refuses a build older than what it is built from (`src/`, the books, the configs), and counts a report older than the build as not clean. About 35 minutes: run it in the background. The summary is `scripts/qa/out/final.txt`. |
| Visit every page | `node scripts/qa/sweep.cjs`. It sweeps the owner's saga and each practice saga in `scripts/qa/fixtures/`, at 1280 and 390 wide, three at a time (`--jobs`). It presses every tab it finds, so a new tab needs no change to it. Clean is "0 with problems" (about 2,300 pages a width, some 15 minutes for both). |
| Measure every merged pull request from git (sizes, lines, tests) | `cd .. && python3 -I tools/history/stats.py > app/docs/history/stats.md` |
| Regenerate data from the books | `cd .. && python3 -I tools/extract/run_all.py` |
| Rebuild the Game Mechanics index | `cd .. && python3 -I tools/extract/build_mechanics.py --report` |
| Open every book in the reader | `node scripts/qa/books.cjs 1280`, then `390` |
| Compare our books with upstream | `cd .. && python3 -I tools/books/compare.py` (see `tools/books/README.md`) |

Always run Python with `-I`.

## Check work in this order

Stop at the first step that fails. Each step costs more than the one before.

1. Typecheck, and the test file for what changed. Seconds.
2. All tests.
3. Build, then look at the changed page in a browser at 1280 and at 390 wide. Write a short Playwright script or use `scripts/qa/shots.cjs`.
4. **Adversarial review.** Give the branch's diff to a fresh agent (the Agent tool) that did not write it, told to find where the change is wrong, not to approve it. It checks each rule against the book's own line, not the code's comment. It tests each claim of "every", "all" or "none" in the pull request's text. For each behavior changed, it looks for a case it gets wrong: another kind of character, an old save, Unlog and Turn back, a living covenant, a phone. It goes down the integration checklist and `app/docs/owner.md`, checks the diff does what the roadmap's text for the batch asks, and names the places the diff should have changed too. Each finding comes with file, line and the failing case, proved by a scratch test where it can be. It changes no file but scratch tests. Fix each, or say in the pull request why not, and run steps 1 to 3 again.
5. **Once per pull request, at the end:** `npm run qa:final` (with `-- --fixtures` when a tutorial changed), on a build of the pull request's last commit. It runs the tutorials at both widths and the full sweep of the owner's saga and the practice sagas. It takes about 35 minutes, so run it in the background with a long timeout. Do not rebuild while it runs: it reads `dist/`. Put its summary in the pull request as it stands; a check not run on the pull request's own build is said to be so.

A pull request that changes only documents skips steps 3 and 5. The sweep and the tutorials are smoke tests: they find a page that fails, overflows a phone or prints `undefined`, not a rule that is wrong. Tests and the review find those.

## Rules that are not negotiable

- **The books are the authority.** Every rule in the engine cites its book and line. Check a formula against the book's own formula line and its worked example, and build the test on that example. Read the rule's whole paragraph, not only the formula. For each exception it states that the code implements ("not", "unless", "only", "instead"), test also at a value where the exception changes the answer, not only at one where the wrong reading gives the same.
- **Fifth Edition only.** Books of the Third and Fourth Editions, and third-party books, are in the reader on shelves of their own. Take no rules from them.
- **Play happens at the Game Table.** A character sheet is built, then is for reference. Season-long work is done on the Seasons page, and a roll the book makes when a season ends is made in its Resolve step. A card is shown in one place only; other pages link to it.
- **Text for players is plain and gender-neutral.** Use "they". Use American spelling, as the books do. Follow the writing rules in the design principles.
- **A quotation keeps the book's words.** Text shown to players as the book's (a quotation, a `restrictionText`, the book-text place of a Virtue's card) is copied from a Fifth Edition book word for word, its pronouns and spelling as printed. A short phrase may be quoted; a cut inside a quotation shows "…". The one change allowed is an obvious scan typo, fixed as audit 2 fixed "subterfude". "They" and American spelling are for the toolkit's own text; a summary in the toolkit's words is marked as one. A label in curly quotes is not a quotation, and code comments may paraphrase, but a comment that quotes keeps the words too.
- **The repository is public.** Never commit a user's saga or character files. Fixtures in `scripts/qa/fixtures/` are generated practice sagas.
- **Scratch tests** are named `zz_*.test.ts` and are deleted before committing.
- **Tools and fixtures worth keeping go in the repository** (`app/scripts/qa/`, `tools/`), not in a temporary folder. A session's temporary folder is lost when the session ends.

## Git

- The session's instructions name the branch. Pull requests are drafts. Never amend, never force-push.
- **A session that builds a batch never merges it.** The owner has handed merging to one **lead session**. The lead writes each batch's brief and starts a fresh session to build it. It then reviews the pull request: the diff, against `app/docs/owner.md`; the adversarial review's findings, and how each was answered; and the checks' results. It fixes small faults itself, sends large ones back, and merges when the review passes and every check is green. Then it tells the owner what changed. A pull request that changes something the owner would have an opinion on (layout, what a card shows, a *Judgment* item) waits for the owner.
- **A question for the owner** is asked only after the books and earlier decisions have been searched and settle nothing. The lead asks it with the question prompt, which reaches the owner's phone, with its own recommendation first. Its report to the owner names every decision it made itself, and on what grounds.
- No model names in commit messages, pull request titles or bodies, or code, other than the attribution lines the session's instructions give.
- One batch of the roadmap to a pull request. When a pull request merges, bring the branch up to date with `origin/main` before starting the next.
- **The batch's pull request updates the roadmap:** it takes the batch out of Now and adds one line to Done. Do not leave it for the next session.
- **Open the pull request when every check has finished,** with their results in it. The lead session reviews it soon after it opens.
- **A finding the batch does not fix goes into the roadmap's Found list,** in the same pull request. A finding written only in a pull request's text is lost.
- **"Intermittent" is not a cause.** A fault seen twice is traced, or written into the roadmap as a finding. Say what you saw, not that it is not this pull request's.
- **Each pull request adds its row to `app/docs/history/README.md`,** with the numbers from its Checks: test time and count, the sweep's pages, problems and minutes, and the review's findings. Run `stats.py` first, so `stats.md` holds every merge. A size, line or test count from `stats.md` that grows by a fifth or more against the row before it, or a test time a fifth above main's in the same container, is explained in the pull request, or written into Found. New coverage (more tests, more pages swept) is a good explanation. Review findings and sweep problems are not compared this way: problems must be 0, and findings count what the review looked at.
- **A fault of the code or of the workflow seen in two pull requests becomes a rule here,** in the pull request that sees it the second time: the history's "Faults that came back" says what it cost, and this file says how to avoid it. The rule names the kind of fault and the check that catches it, at the width the evidence has: a fault in one system is a rule for that system, not for all, and no rule cuts a check or changes the characters and sagas the checks build to make a case pass. Where a test or a script can hold the rule, write that too: the faults whose rule was only a sentence came back most.

## How the code is laid out

```
tools/extract/     Python: markdown books -> JSON in app/src/data/generated/
tools/books/       keeping reviewed/, wip/ and 3rd-party/ in step with upstream
app/src/data/      generated JSON, and hand-written data for each book (one file per system)
app/src/engine/    the rules, with no user interface. One module per system, with its test.
app/src/store/     state (zustand), saved in the browser; export and import
app/src/ui/        React. pages/ holds the Game Table's pages and their parts.
app/scripts/qa/    browser checks, the saga generator, fixtures
app/docs/          roadmap, design principles, audits
```

Patterns to copy, not reinvent:

- **A new system from a book:** data in `src/data/<system>.ts` with `source: { book, line }`, rules in `src/engine/<system>.ts` with `<system>.test.ts`, cards in `src/ui/pages/<System>Part.tsx`. Look at `folkWitch` for a complete small example.
- **A card:** `<Card title tour fold summary>` from `src/ui/kit`. `fold` makes it collapse to its `summary` line, and it starts folded on a phone.
- **A total:** return `{ total, parts }` from the engine and show it with `<Total>`, so a click shows the breakdown.
- **A season's work:** `useSeasonWork` (`src/ui/seasonWork.tsx`) checks `seasonBusy`, logs the season, and records what Unlog needs; `useVisSource` takes its vis from the purse or the covenant's stores. Underneath are `newSeasonEntry` and `applySeason`. A new season card is drawn in the character's season in full through `seasonCards` (`src/ui/pages/seasonCards.ts`): its group, when it applies, and the line that says why when it does not. Two tests log and unlog every kind of season and find everyone as they were: `src/engine/unlogEverySeason.test.ts` for the clock's, and `src/ui/pages/unlogEverySeason.test.tsx`, which presses each card's buttons, so a new card is checked without a change to it.
- **A pointer into a book:** `{ book, line }` opens the reader at that line. `<RulesNote>` shows the book's text in place.

## Working efficiently

- **Reading a book:** list its headings first (`grep -n '^#' file`), then its formula lines (`grep -n 'TOTAL\|Total:'`), then read only the ranges you need with `sed -n 'A,Bp'`. Whole chapters are rarely needed.
- **Each batch is built in a fresh session,** started by the lead session with a brief, at High effort unless the lead says otherwise. These documents carry the memory, and a short conversation is cheaper and sharper than a long one that has been summarized many times. What a session learns that the next one needs goes into these documents, `app/docs/owner.md` for what the owner says.
- **Measure before making something faster.** Profile it, or count the calls, before changing it, and again after. Compare the test times with main's: a test file that takes a fifth longer than on main, and at least 5 s longer, in two runs that take main and the branch in turn, is a finding, even while it passes. A suite that is slower because it has more tests is not; never drop or thin a check to save time. Times from different containers do not compare: run main's in the same container, the same day. A test's timeout is raised only with its time on main and on the branch, stated in the pull request.
- **A new check is first run where it must fail:** on a build with the fault it targets put back (or, for a new kind of fault, put in by hand). A check that has never failed may be looking at the wrong thing.
- **When a browser check crashes ("Page crashed", a timeout everywhere), look at free disk and memory first** (`df -h /tmp`, `free -m`), and write the cause into the roadmap's Found list.
- **Before writing a list or a rule, look for the one that exists.** Search the data and the rules check (`src/data/`, `src/engine/character/validate.ts`) for the names it holds. Two lists that say the same thing drift apart, and the rules check then disagrees with what is built.
- **A helper made to replace a way of doing something converts every old caller in the same pull request,** or names those it leaves in Found. Where the old way can be matched, a guard on the model of `CHANGES_WARPING` (`src/quality.test.ts`) holds it.
- **Stop and re-plan when the fixes go in circles.** If a fault comes back after it was fixed, or a round of fixes runs past an hour, stop fixing. Write into the pull request what is wrong, why the fixes have not held, and the plan, then work from the plan. A large build followed by hours of fixes costs more than a smaller build checked as it goes.
- **Before calling a batch finished, look at the joins.** Go down the integration checklist in the design principles. The last audit found most of its faults there, not in the cards the work set out to change.
- **Write the plan into the pull request or the roadmap, not only into the conversation.**
- **Before adding a card, a page, a tab or a paragraph, check the design principles' budgets.** The toolkit is large. Adding is easy; finding things afterwards is the cost.
- **The README and the Guide grow by at most 300 words a pull request.** Each has a ceiling in `src/quality.test.ts`, with room under it. Do not cut what another system needs to make room; replace what your change makes out of date. Say in the pull request how many words each grew.
- **Before calling something a judgment call, look for the answer.** A section silent on a case is often settled by the core rules' general mechanics (stress rolls and botches, Ease Factors, Fatigue), by the book's worked example, or by an earlier decision (`app/docs/owner.md`, its points and its Decided list, and "Decided by the owner" in the roadmap's open items). Cite what settles it. Only what none of these settles is the owner's.
