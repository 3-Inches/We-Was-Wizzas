# History of the pull requests

A record of the 89 merged pull requests, #1 (25 September 2026) to #90 (28 November 2026), from their numbers.

## How to read this and keep it up

- `stats.md` holds the numbers from git: files, lines added and removed, and the size of `app/src`, the generated data and the tests on `main` after each pull request. It comes from `python3 -I tools/history/stats.py`. Run it again after a merge. Its test count is a grep, a little below the true count.
- The table below holds what each pull request's own text says: test time, test count, the sweep and the review. A cell is empty when the pull request did not say. Nothing is guessed.
- Each new pull request adds its row here, with the times from its Checks section. `npm run qa:final` writes most of them to `scripts/qa/out/final.txt`.
- "Fixed later by" names the pull request that fixed a fault this one made, where a pull request or an audit says so, and `git log -S` on the faulty line confirms the fault was made here and not earlier. Audits have named the wrong maker: audit 3's C1 says #59 grew `HolyPart.tsx` by 112 lines, but it shrank it by 23. A fault this one only found, or one that was there before it, is not counted against it: B7 was found by #65 but made with Quick build and the hedge traditions (#18, #51); Vitest's leak in `/tmp` (fixed #87) was there from the first test run, and #86 only felt it.

## The pull requests

Sweep pages are per width, both widths clean unless said. Before #67 the sweep visited a small default saga; from #67 it visits the owner's saga, and from #80 the practice sagas too. So page counts are comparable only within a stretch.

| PR | merged | what | test time | tests | sweep (pages a width / problems / minutes) | review findings | fixed later by |
|---:|---|---|---|---:|---|---|---|
| 1 | 2026-09-25 | The toolkit, first version |  |  |  |  |  |
| 2 | 2026-09-25 | Open License credit, page citations |  | 31 |  |  |  |
| 3 | 2026-09-26 | Virtue and Flaw restrictions |  | 49 |  |  |  |
| 4 | 2026-09-26 | Click-to-fix rules check |  | 69 |  |  |  |
| 5 | 2026-09-27 | Playtest fixes |  | 85 |  |  |  |
| 6 | 2026-09-29 | Guided build |  | 101 |  |  |  |
| 7 | 2026-10-01 | Labs, covenant finances |  |  |  |  |  |
| 8 | 2026-10-03 | Playtest notes |  | 147 |  |  |  |
| 9 | 2026-10-10 | Magic characters |  |  |  |  |  |
| 10 | 2026-10-12 | Magic characters' Qualities |  |  |  |  |  |
| 11 | 2026-10-13 | Powers card |  |  |  |  |  |
| 12 | 2026-10-21 | Game mechanics index, Certamen |  | 179 |  |  |  |
| 13 | 2026-10-22 | Saga clock, rituals, market |  | 227 |  |  | #14 |
| 14 | 2026-10-22 | Fixes after #13 |  | 228 |  |  |  |
| 15 | 2026-10-22 | Undo with refunds |  | 248 |  |  |  |
| 16 | 2026-10-22 | Optional rules, Mysteries |  | 278 |  |  |  |
| 17 | 2026-10-22 | Quality pass, tutorials |  | 282 |  |  |  |
| 18 | 2026-10-22 | Quick build, bestiary |  | 292 |  |  | #86 (audit 3 B7, with #51) |
| 19 | 2026-10-23 | Play-test fixes |  | 296 |  |  |  |
| 20 | 2026-10-23 | Lab projects |  |  |  |  |  |
| 21 | 2026-10-27 | Rules fixes from review |  |  | 106 / 0 |  |  |
| 22 | 2026-10-28 | Auras over time |  |  | 113 / 0 |  |  |
| 23 | 2026-10-28 | Lab improvements, Dominion |  | 350 | 120 / 0 |  |  |
| 24 | 2026-10-28 | Guides and tutorials updated |  | 352 | 120 / 0 |  |  |
| 25 | 2026-10-28 | Covenant fill-out |  |  | 120 / 0 |  |  |
| 26 | 2026-10-28 | Writing and copying books |  | 398 | 120 / 0 |  |  |
| 27 | 2026-10-29 | Game table dashboard; City & Guild |  | 410 | 121 / 0 |  |  |
| 28 | 2026-10-29 | Living Rhine covenants |  | 425 | 223 / 0 |  | #31 (size), #32 (inflation) |
| 29 | 2026-10-29 | Quick build fixes; Rhine |  | 446 | 744 / 0 |  |  |
| 30 | 2026-10-29 | Magic powers; Rhine items |  | 467 | 852 / 0 |  |  |
| 31 | 2026-10-30 | Quality pass; saga size cut |  | 471 | 852 / 0 |  |  |
| 32 | 2026-10-30 | Essential Traits, inflation |  | 477 | 852 / 0 |  |  |
| 33 | 2026-10-30 | Calendar, stories, calamities |  | 497 | 852 / 0 |  |  |
| 34 | 2026-10-30 | Teaching, lab help |  | 510 | 852 / 0 |  |  |
| 35 | 2026-11-02 | Tutorials in one run; phone fixes |  | 517 | 852 / 0 |  |  |
| 36 | 2026-11-03 | Flawed and Illusory Resources |  | 523 | 852 / 0 |  |  |
| 37 | 2026-11-05 | Boons and Hooks with rules |  | 549 | 852 / 0 |  |  |
| 38 | 2026-11-05 | Tribunal vis |  | 552 | 860 / 0 |  |  |
| 39 | 2026-11-05 | City & Guild pages |  | 558 | 860 / 0 |  |  |
| 40 | 2026-11-06 | Fixed sidebar, Game Table pages |  | 577 | 930 / 0 |  |  |
| 41 | 2026-11-06 | Play at the table |  |  | 951 / 0 |  |  |
| 42 | 2026-11-06 | Seasons in three steps; Chronicle |  |  | 958 / 0 |  |  |
| 43 | 2026-11-07 | Virtues that act in play |  | 613 | 958 / 0 |  |  |
| 44 | 2026-11-12 | Realms of Power: The Divine |  | 639 | 958 / 0 |  | #80, #84 (audit 3 5.15, 5.17) |
| 45 | 2026-11-14 | Cleanup pass; every House |  |  | 958 / 0 |  | #46 (a Nephilim's Hebrew), #47 |
| 46 | 2026-11-15 | Troupe card; import changes |  |  | 958 / 0 |  | #47 |
| 47 | 2026-11-15 | Fixes from audit of #45-46 |  |  | 958 / 0 |  |  |
| 48 | 2026-11-15 | Core book checked |  |  | 958 / 0 |  | #54, #55 (audit 2) |
| 49 | 2026-11-16 | The Mysteries (Revised) |  |  | 958 / 0 |  | #54, #55 (audit 2) |
| 50 | 2026-11-16 | Realms of Power: Faerie |  |  |  |  | #54, #60 (audit 2), #75 (audit 3 B5) |
| 51 | 2026-11-16 | Hedge Magic, Projects, Church |  |  | 958 / 0 |  | #54, #58, #66, #86 (audit 2, B7) |
| 52 | 2026-11-16 | Guide: playing and running |  | 812 |  |  |  |
| 53 | 2026-11-17 | Foundations: principles, roadmap |  |  |  |  |  |
| 54 | 2026-11-17 | 1.1 audit 2 rules fixes |  | 842 | 357 / 0 |  |  |
| 55 | 2026-11-17 | 1.2 card behavior fixes |  | 842 | 357 / 0 |  |  |
| 56 | 2026-11-17 | 2.1 books in step with upstream |  |  | 357 / 0 |  |  |
| 57 | 2026-11-17 | 2.3 item effects out of spells |  |  | 357 / 0 |  |  |
| 58 | 2026-11-17 | 1.3 hedge seasons on Seasons |  | 868 | 357 / 0 |  | #74, #82 (audit 3) |
| 59 | 2026-11-17 | 1.4 Faith page |  | 889 | 357 / 0 |  | #74 |
| 60 | 2026-11-17 | 1.4b Warping waits in Resolve |  | 906 | 357 / 0 |  | #70, #83 (audit 3 A1, B1) |
| 61 | 2026-11-17 | 1.4c great buildings, menagerie |  | 913 |  |  | #63 (checks), #74, #84 |
| 62 | 2026-11-17 | 1.5 Guide toolkit page |  | 920 | 357 / 0 |  |  |
| 63 | 2026-11-17 | Tick 1.4c; #61's checks |  |  | 357 / 0 (#61's) |  |  |
| 64 | 2026-11-17 | 1.6 README cut |  | 920 |  |  |  |
| 65 | 2026-11-17 | 1.7 tutorial steps short |  | 920 | 357 / 0 |  |  |
| 66 | 2026-11-18 | 1.7b tutorials hedge/Faerie/Mysteries |  |  | 357 / 0 |  |  |
| 67 | 2026-11-18 | Audit 3 |  | 924 | 1,114 / 0 (390 only) |  |  |
| 68 | 2026-11-18 | Owner decision B8 |  |  |  |  |  |
| 69 | 2026-11-18 | Lead session merges |  |  |  |  |  |
| 70 | 2026-11-18 | 5.1 Warping from season work |  |  | 1,114 / 0 |  |  |
| 71 | 2026-11-18 | Owner decisions 5.9, 5.10 |  |  |  |  |  |
| 72 | 2026-11-18 | 5.2 offer only what applies |  |  | 1,114 / 0 |  |  |
| 73 | 2026-11-19 | Roadmap 5.11 |  |  |  |  |  |
| 74 | 2026-11-19 | 5.3 Chronicle per season kind |  |  | 1,122 / 0 |  |  |
| 75 | 2026-11-19 | 5.5 Sympathy Traits one place |  | 981 | 1,114 / 0 |  |  |
| 76 | 2026-11-19 | Owner decisions 5.4, 5.13 |  |  |  |  |  |
| 77 | 2026-11-19 | Room for README and Guide |  |  |  |  |  |
| 78 | 2026-11-19 | README ceiling |  |  |  |  |  |
| 79 | 2026-11-19 | 5.6 HolyPart split; Mechanics links |  | 981 | 1,114 / 0 |  |  |
| 80 | 2026-11-19 | 5.15 Faith fits a phone; sweep |  |  | 2,293 / 0 / 18 a width |  |  |
| 81 | 2026-11-19 | Roadmap in batches; review step |  |  | 2,293 / 0 / ~15 both | 10 |  |
| 82 | 2026-11-19 | 5.4 season in full |  | 987 | 2,288 / 0 |  |  |
| 83 | 2026-11-19 | Batch A: Twilight, Warping, Unlog | ~85 s | 1,016 | 2,280 / 0 | 11 |  |
| 84 | 2026-11-20 | Batch B: Plan a season |  | 1,032 | 2,347 / 0 | 6 |  |
| 85 | 2026-11-20 | Context compaction setting |  |  |  |  |  |
| 86 | 2026-11-20 | Batch C: Quick build hedge/faerie |  | 1,054 | 2,250 / 0 | 10, and the lead's own |  |
| 87 | 2026-11-22 | Reader links; qa:final | 157 s | 1,060 | 2,250 / 0 / 14 | 3, then 12 on the tooling |  |
| 88 | 2026-11-22 | Retrospective: history, narrowed rules |  |  | docs only |  |  |
| 90 | 2026-11-28 | Batches D and E | 127 s (main 111 s, same container) | 1,077 | 2,250 / 0 / 14 | 10 (3 fixed, 1 by the lead, 1 not a fault, 5 to Found) |  |
| 91 | 2026-11-28 | Forensic review: rules from the code, Batch F proposed | 102 s | 1,077 | docs, and #90's Faerie Sympathy fix | 14 on the diff, and a review of the forensic reports |  |

## Jumps

Size jumps are from `stats.md`, a column growing by a fifth or more in one pull request, or shrinking.

- **#1, the first version.** 84,528 lines, nearly all of it the books and their extracted data.
- **#6, guided build.** `app/src` grew 20% (829 to 998 KB): the questionnaire, recommendations and their simulator.
- **#12, Game mechanics index.** Generated data more than doubled (2,915 to 6,125 KB): 5,303 mechanics read from every reviewed book. 111,530 lines added.
- **#13, saga clock.** `app/src` grew 22% (1,325 to 1,616 KB), and tests 27% (179 to 227): the clock, rituals, lab projects and the market in one pull request.
- **#18, Quick build.** Generated data grew 15% (the bestiary, 422 creatures, about 1 MB). Under a fifth, but the largest data change after #12.
- **#3 to #7.** Tests grew 19% to 60% a pull request while the test suite was young (31 to 126).
- **#51, Hedge Magic, Hermetic Projects and The Church.** The largest feature pull request after #1: 10,419 lines, `app/src` up 9.5%, 77 tests. It was audited as a whole (audit 2), with 41 findings.
- **#56 and #57, the books.** 73,928 added and 39,963 removed, then 11,536 and 10,373: the books brought in step with upstream, and item effects moved out of the spell catalog. Data, not code.
- **#62 and #65, shrinks.** `app/src` fell 44 KB and then 4 KB: the Guide rewritten as steps, tutorials cut to 60 words a step. #64 cut the README (291 lines removed).
- **Sweep pages.** 120 (#23) to 223 (#28) to 744 (#29) to 852 (#30): the living Rhine covenants added their magi's sheets. Then 357 at #54: the regenerated default saga in #53 was smaller. 1,114 at #67: the owner's saga, set up as they play. 2,293 at #80: every tab, every part of Dice, and the practice sagas.
- **Sweep time.** About 30 minutes a width before #80. 18 a width at #80 (a tab pressed, not the page reloaded). About 15 for both widths at #81 (three sagas at a time). 14 at #87.
- **Test time, by commit.** A later session ran seven merges' tests in one container on one day, once each: #83 added about 26% (the UI `unlogEverySeason` test, one test of about 51 s) and #86 about 21% (`traditionBuild.test`, about 48 s). Single runs vary by up to 14% a file, so smaller changes in that run are noise.
- **Test time.** The PR bodies give about 85 s at #83 and 157 s at #87, but they were measured in different containers. Measured in one container on 2026-11-22: main before #87 (`4d2c84d`, 1,054 tests) took 146 s, and after it (1,060 tests) 152 s. So #87 did not slow the tests; the container did. **Times from different containers do not compare:** a time in a PR is compared with main's, run in the same container the same day.

## Faults that came back

**1. Fixes that needed a fix.** #14 fixed three faults reported after #13. #47 fixed what an audit of #45 and #46 found. Audit 2 found 41 findings in #48 to #51, among them 7 where the app and the book disagree (D1 is praise, and D2 to D4 cover the whole toolkit's writing). Audit 3 found 10 in #54 to #66, several of them made earlier (B5 in #50, B7 with #18 and #51). Each large pull request was followed by one or more fixing it.
*Cost:* in the single session about one pull request in five fixes an earlier one; in the batch era more than half do, most of them fixing the single session's systems.
*Rule:* already in `CLAUDE.md` (step 4, the adversarial review, for every pull request).

**2. Faults at the joins between systems.** Audit 3's A1, B1, B2, B3 and B5: Warping from vis that bypassed `gainWarping`; Unlog that left Twilight in Resolve; the Chronicle telling new seasons as ordinary work; a season in full with the character's work last; Sympathy Traits editable in two places. Each sat between the item's card and a system it did not name. Batch A (#83) and Batch B (#84) then found more Unlog and Warping cases. Batch D still lists linked Unlog.
*Cost:* ten pull requests (#70 to #84, and #86) to close audit 3.
*Rule:* already in `CLAUDE.md` (the integration checklist). Keep it.

**3. A cause named, or not traced, and left unfixed.** A City & Guild tutorial step found nothing in the tutorial runs of #54 to #63. #54, #55, #58 and #63 named the cause (the script looked before it made the practice craftsman); #57, #60 and #62 called it intermittent. Nobody fixed it until #65, because each session saw it as not its own. #86 called a `tours.test.ts` failure unexplained and did not write it into Found. (#87's Mysteries step, 3.4 s late on a phone, was traced and written into Found: the rule working.)
*Cost:* ten pull requests carried the warning.
*Rule:* already in `CLAUDE.md` ("Intermittent is not a cause"; a fault seen twice is traced or written into Found). A cause named and not fixed is a Found item too.

**4. A check that missed what it was meant to see.** The sweep visited a 357-page saga with no hedge or faerie characters (audit 3, W3). It opened only two parts of Dice, so the Faith page overflowed a phone on 34 of 743 practice pages unseen (#79, #80). `firstChoice` and `sentBack` were added because no check covered those faults. #87's own review found `qa:final` printed "All clean." with the sweep not run, and counted a tutorial that stopped early as clean.
*Cost:* a phone overflow shipped; four pull requests on QA tools.
*Rule:* "A new check is first run on a build with the fault it targets put back, and must fail there."

**5. Checks overclaimed or unfinished at merge.** #50, #51, #52 and #61 opened with "results to follow". #61 merged three minutes after it opened; #63 brought its results. #45's 390 sweep was two commits behind its last commit.
*Cost:* results on code that was not the merged code.
Claims of "every" overclaimed too: #51's "checked against the books' examples" was true of the examples alone (fault 11), and #60's "every source of Warping goes through it" was untrue (fault 14).
*Rule:* already in `CLAUDE.md` ("Open the pull request when every check has finished"). `qa:final` now refuses a stale build. For claims of "every", "all" or "none", step 4's review tests each one (added 2026-11-28).

**6. A finding written only in a pull request.** B7 (Quick build makes no hedge wizard) was found in #65 and lost until audit 3. Closed in #86, three days later.
*Rule:* already in `CLAUDE.md` (the Found list).

**7. The same list kept twice.** Sympathy Traits on the sheet and the Roll page (B5, fixed #75). Two lists of a hedge tradition's Virtues, `restrictions.ts` and `traditionRules.ts` (found after #86; Batch E's first item).
*Rule:* already in `CLAUDE.md` ("Before writing a list or a rule, look for the one that exists").

**8. Slow tests and timeouts.** #16 raised a timeout on a guided-build test that took 4 s. #40 raised one on `living.test.ts` (2 s alone, slower beside others). #86's Quick build ran 60% slower per character, caught only by the lead. #87's 157 s looked like a doubling, but it was the container (see Jumps).
*Rule:* "A test's timeout is raised only with its measured time on main and on the branch, in the pull request." The lesson is to measure the code that got slower (Quick build in #86), not to run fewer tests: the suite grows because the toolkit does, and a check dropped to save time is a fault let through.

**9. The environment filled up.** Vitest left about 100 MB in `/tmp` a run. In #86 two sweeps stopped with "Page crashed". #87 fixed it.
*Rule:* "When a browser check crashes, check free disk and memory first, and write the cause into Found."

**10. Busywork from the roadmap's rules.** #55, #56, #59, #60, #61, #62 and #63 each ticked the item before them; #63 did little else (audit 3, W7). Fixed by ticking an item in its own pull request.

**11. A book's paragraph read only around its example.** About 30 faults in #1 to #51 dropped a sentence beside the formula or the worked example, most often its "not", "unless", "only" or "instead" (forensic review, 2026-11-28). Examples: one botch die for each negative trait, where the book says as many dice as the worst trait (RoP: Faerie line 5846); rounding down, where the book says "round up" (TMRE line 3683); the last sentence of the Vision botch dropped (HMRE line 3725). None in #54 to #69, where the faults were at the joins.
*Rule (CLAUDE.md, "The books are the authority"):* read the whole paragraph of a rule, and test each of its exceptions at a value where it changes the answer. The rule is for rules taken from a book, not for all code.

**12. Tests that could not fail.** #49's test of rote spells worked out its answer with the code's own formula. #50 tested at Iron −1, the one value where the wrong formula and the right one agree. #46's `holyBuild.test.ts:233` asserted a misreading of RoP: The Divine line 3663. Design principle 9 already says a test that restates the code proves nothing; the step 4 review is what holds it, and the rule in 11 says which value to test at.

**13. The book's words, and pointers to them, checked by nothing.** At least 12 of 74 strings the toolkit shows as the book's words are cut or reworded without a mark; those in the rules check's restriction texts were made in #1, #3 and #8. The 64 Virtue texts written by hand are the toolkit's paraphrases, in "she", shown where the book's text goes. About 40 line pointers miss their heading; the 18 of the folk witch Virtues (#51) are evenly spaced four lines apart, so they were counted, not looked up. No quote was changed for gender or spelling.
*Rule (CLAUDE.md):* a quotation keeps the book's words; "they" and American spelling are for the toolkit's own text. Batch F's tests hold the quotes and the pointers.

**14. A helper made shared, and the old callers left.** #60 made `gainWarping` and said "every source of Warping goes through it", but vis study and the lab still added Warping their own way (audit 3, A1); its guard looked for `warpingPoints +=` and missed `entry.warpingPoints`. #55 fixed C5 on the Faerie cards alone. #86 wrote a second list of the hedge traditions' Virtues beside the one the rules check reads.
*Rule (CLAUDE.md, "Before writing a list or a rule"):* a pull request that makes a helper to replace a way of doing something converts every old caller, or names those it leaves in Found. A guard on the model of `CHANGES_WARPING` (`src/quality.test.ts`) holds it where the old way can be matched. The evidence is three systems (Warping, the Faerie cards, the tradition lists); the rule is for a helper that replaces a way of doing something, not for every function shared.

## The eras compared

**The single session, #1 to #52** (25 September to 16 November, 53 days). One long conversation built features, fixed bugs from play and changed the layout as the owner asked.

**Batches and the lead session, #53 to #87** (17 to 22 November, 6 days). Foundations (#53), roadmap items by fresh sessions (#54 to #68), then a lead session that briefs, reviews and merges (#69 on), and from #81 larger batches with an adversarial review.

| | Single session | Batches and lead |
|---|---:|---:|
| Pull requests | 52 | 35 |
| Pull requests a day | 1.0 | 5.8 |
| Lines added, mean, without the book imports (#1, #12, #56, #57) | 2,074 | 599 |
| Lines added, median, same | 1,410 | 510 |
| `app/src` growth | 656 to 5,218 KB (+4,562) | 5,218 to 5,518 KB (+300) |
| Tests (grep count) | 31 to 810 (+779) | 810 to 1,033 (+223) |
| Faults later found by audit | 41 in #48 to #51 alone (about 3 per 1,000 lines) | 10 in #54 to #66 (about 1.6 per 1,000 lines; about 0.8 counting only those made in #54 to #66) |
| Pull requests mostly documents, ticks or decisions | few | 12 of 35 |

The second era's 5.8 a day is not more output. A third of its pull requests are a line or a decision. Its mean pull request is under a third of the first era's.

**Which was more productive, once fixes are counted.** The single session. It wrote about 94% of the code and 78% of the tests. Its work did need fixing: audit 2's 41 findings and most of audit 3's join faults trace to systems it built (#44, #49 to #51), on which the fresh sessions' #58 to #60 then built. But those fixes took about 20 pull requests and roughly 15,000 lines, a fraction of what the era delivered. The batch era made about half the faults per line, and most of its own lines went to fixing the first era's. The two rates are not a like-for-like measure: audit 2 read new systems against their chapters, where most rule faults are made, and audit 3 read mostly fixes. Read them as "both eras made faults at the joins", not as "small pull requests make no faults".

**What the single session did well.** Speed, and knowing the joins. It held how the systems fed each other, which the audit found the fresh sessions lacked (W1). It ran the sweep and tutorials on most pull requests from #21 on. It played long sagas (twenty and thirty years) and caught slow, broken and bloated records (#28, #31, #32).

**What the batch era did well.** Checks that test the owner's game, written rules (`owner.md`, the integration checklist, `CLAUDE.md`), findings kept in the roadmap, and reviews that found faults before merging: 10, 11, 6, 10 and 15 in #81 to #87. Every rules fix has a test on the book's example.

## What went right

- Every audit finding was fixed in the code, not only in the text, but one deferred to a later book (Mythic Alchemy, roadmap 3.7), and both audits are closed.
- No sweep reported a page with problems on a merged pull request, from 106 pages (#21) to 2,347 (#84).
- Tests grew with the code, from 31 to over 1,060.
- What a session learned mostly went into `CLAUDE.md`, `owner.md` and the design principles in the same pull request; audit 3 found two lessons that had not (W2, W5).
- The owner was asked only where the books left the choice open, and the answers were written down.
