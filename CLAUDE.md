# Ars Magica Saga Toolkit

This repository holds the *Ars Magica* open-license books as markdown (`reviewed/`, `wip/`, `3rd-party/`) and, in `app/`, a browser toolkit built from them: character and covenant creation with the rules checked, and the arithmetic of play. The books come from an upstream repository; the toolkit is ours.

## Read these before starting work

| File | What it is |
|---|---|
| `app/docs/roadmap.md` | What is left to do, in order, and what "finished" means. **Tick items off as you close them.** |
| `app/docs/design-principles.md` | How the toolkit should work and read, with the checklists a change must pass. |
| `app/docs/audit-2026-11.md` | Open findings from the last review, each with file, line and a proposed fix. |
| `app/README.md` | What the toolkit does, and how it is built. |

## Commands

Run from `app/`. In a new container, run `npm ci` there first.

| To | Run |
|---|---|
| Typecheck | `./node_modules/.bin/tsc -p tsconfig.json --noEmit 2>&1 \| grep -E "^src/"` (no output means clean) |
| One test file | `./node_modules/.bin/vitest run src/path/to/file.test.ts` |
| All tests (about 100 s) | `./node_modules/.bin/vitest run` |
| Build | `npm run build` |
| Serve the build | `npx vite preview --port 4173 --strictPort` (in the background) |
| Look at the hedge magic, Faerie and Mysteries pages | `node scripts/qa/shots.cjs [width] [fixture]` (see `scripts/qa/fixtures/index.json`) |
| Run every tutorial | `node scripts/qa/tutorials.cjs 1280` and `390`. Clean is "errors: none" with 3 "no target" steps (steps that explain without pointing at a control). |
| Visit every page | `node scripts/qa/sweep.cjs --width 1280`, then `--width 390`. One width at a time. |
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
4. **Once per pull request, at the end:** the tutorials at both widths, then the full sweep at both widths. Together they take about 25 minutes, so run them in the background with a long timeout. Do not rebuild while a sweep is running: it reads `dist/`.

## Rules that are not negotiable

- **The books are the authority.** Every rule in the engine cites its book and line. Check a formula against the book's own formula line and its worked example, and build the test on that example.
- **Fifth Edition only.** Books of the Third and Fourth Editions, and third-party books, are in the reader on shelves of their own. Take no rules from them.
- **Play happens at the Game Table.** A character sheet is built, then is for reference. Season-long work is reached from the Seasons page.
- **Text for players is plain and gender-neutral.** Use "they". Use American spelling, as the books do. Follow the writing rules in the design principles.
- **The repository is public.** Never commit a user's saga or character files. Fixtures in `scripts/qa/fixtures/` are generated practice sagas.
- **Scratch tests** are named `zz_*.test.ts` and are deleted before committing.
- **Tools and fixtures worth keeping go in the repository** (`app/scripts/qa/`, `tools/`), not in a temporary folder. A session's temporary folder is lost when the session ends.

## Git

- The session's instructions name the branch. Pull requests are drafts. Never merge, never amend, never force-push.
- No model names in commit messages, pull request titles or bodies, or code, other than the attribution lines the session's instructions give.
- One roadmap item to a pull request. When a pull request merges, bring the branch up to date with `origin/main` before starting the next.

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
- **A season's work:** `newSeasonEntry` and `applySeason`; check `seasonBusy` first.
- **A pointer into a book:** `{ book, line }` opens the reader at that line. `<RulesNote>` shows the book's text in place.

## Working efficiently

- **Reading a book:** list its headings first (`grep -n '^#' file`), then its formula lines (`grep -n 'TOTAL\|Total:'`), then read only the ranges you need with `sed -n 'A,Bp'`. Whole chapters are rarely needed.
- **Start a fresh session for each roadmap item.** These documents carry the memory, and a short conversation is cheaper and sharper than a long one that has been summarized many times.
- **Write the plan into the pull request or the roadmap, not only into the conversation.**
- **Before adding a card, a page, a tab or a paragraph, check the design principles' budgets.** The toolkit is large. Adding is easy; finding things afterwards is the cost.
