# Audits

An audit reads what was built since the last one, against the books, the design principles and what the owner expects (`../owner.md`), and writes down what to fix. It changes no code: the fixes become batches in the roadmap.

Audits are kept here once closed, as the record and as models. **Do not delete them.** The roadmap says when one is due: after every five or six systems, or when the owner asks.

| Audit | Covered | Status |
|---|---|---|
| `2026-11-16.md` | The core-book check, *The Mysteries*, *Realms of Power: Faerie*, *Hedge Magic*, *Hermetic Projects*, *The Church*; and the toolkit's own writing | Closed by roadmap stage 1 |
| `2026-11-18.md` | Roadmap stage 1 and stage 2 (pull requests #54 to #66), and how that work was done | Open: the roadmap's Now |

## How to do one

Work in this order. Write findings down as you go, in the scratch folder, and the audit file at the end.

1. **Scope.** Name the first and last commit covered, and list the pull requests.
2. **Baseline.** Typecheck, all tests, build, on the last commit.
3. **The last audit's closed findings.** Check each in the code, not in the pull request's text. A finding is closed when the code does what the fix asked.
4. **Rules.** Read each new engine module against its chapter: the formula lines first, then the worked examples. Read the book's own text for anything that surprises you.
5. **Integration.** For each change, go down the integration checklist in the design principles. The usual misses are the Chronicle, Unlog, what waits in Resolve, and the living covenants.
6. **The owner's expectations.** Go down `../owner.md` point by point.
7. **In the browser, as the owner plays.**
   - Generate the owner's saga (`QA_LIVING=all QA_OPTIONAL=all npm run qa:saga`) and sweep it at 390, then 1280.
   - Open each new page as one character of each kind it is for, using the practice sagas in `scripts/qa/fixtures/`. Look at it folded first, at 390 wide.
   - Play one season through: plan it, do the new work, end the season, resolve what it left, read the Chronicle, unlog it, turn back.
8. **Writing.** The limits in `src/quality.test.ts`, then read a sample of what was added aloud.
9. **How the work was done.** Read the pull requests. Was the plan written first? Was the owner asked where the choice was theirs? Did every check run, before the merge? Were failures traced to a cause, or called intermittent? Did the docs learn what the session learned?

## How to write one

Copy the shape of `2026-11-16.md`:

- **Scope**, **how it was checked**, and an **overall** paragraph a reader can stop after.
- **Status words.** *Confirmed*: read in the code and in the book, or seen in the browser. *Likely*: read in the code, and the book supports it, but leaves room.
- **Sections:** A, the app and the book disagree. B, systems that do not work together. C, how it is used. D, the toolkit's writing. E, what cannot be found. F, small things. W, how the work was done.
- **Each finding** has its file and line, the book's line where a rule is involved, what goes wrong for a player, and the fix. Mark each *Mechanical* or *Judgment*, as the roadmap does.
- **What checked out**, so the next audit need not look again.
- **A suggested order of work**, then add the findings to the roadmap's Now, grouped into batches: one session and one pull request each, of findings that touch the same pages and files.

When its batches are done, mark the audit **Closed** at the top and say which pull requests closed it.
