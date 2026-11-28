# Keeping the books in step with upstream

The books in `reviewed/`, `wip/` and `3rd-party/` are copies from the Ars Magica Open License repository (`OriginalMadman/Ars-Magica-Open-License` on GitHub). Upstream keeps correcting them. This folder holds the tools that bring our copies up to date without breaking the toolkit.

Our repository is not a fork, and these tools only ever read upstream, with an anonymous clone. Nothing we do appears there, apart from one anonymous clone in its traffic count.

## What runs by itself

`.github/workflows/books-upstream.yml` runs every Monday. It compares our books with upstream. When they differ it opens an issue, **The books have changed upstream**, listing each changed, moved and new file. While that issue is open, later runs refresh it instead of opening another. Close it when the books are in step.

It can also be run by hand from the repository's Actions tab. GitHub pauses scheduled workflows in a repository with no activity for 60 days, and sends an email when it does.

## Why the update is not automatic

The toolkit points into the books by line number, about 15,000 times: every rule's source, every Game Mechanics topic, every Virtue. When a book's text shifts, each pointer must follow. The extractors in `tools/extract/` also read the books' layout (heading levels, bold names, table shapes), and an upstream correction can change what they find. So an update is a pull request that somebody checks, not a silent copy.

## Bringing the books in step

Do this on its own branch, as its own pull request, on a clean working tree.

1. **See what changed.**
   `python3 -I tools/books/compare.py`
2. **Copy the books.** This also records the upstream commit in `tools/books/UPSTREAM`.
   `python3 -I tools/books/sync.py`
   To take one book at a time: `--only "Hermetic Projects"` (the commit is then not recorded).
3. **Move the pointers.** Read the report first, then write.
   `python3 -I tools/books/relocate.py`
   `python3 -I tools/books/relocate.py --write`
   - **reworded** entries: the tool found the nearest match. Open each and check it is the right text.
   - **LOST** entries were left alone. Find the new line by hand.
   - **Bare line numbers with no book**: add the file to `FILE_BOOKS` in `relocate.py` and run the report again, before you write.

   Commit the books and the moved pointers before going on. `relocate.py` compares the working tree with the last commit, so it must run once only: a second run would move the pointers again.
4. **Regenerate the data and the Game Mechanics index.**
   `python3 -I tools/extract/run_all.py`
   `python3 -I tools/extract/extract_templates.py "reviewed/Ars Magica - Definitive Edition (Core Rules).md" > app/src/data/templates.ts`
   `python3 -I tools/extract/build_mechanics.py --report`
   `build_mechanics.py` checks every entry of the index against its book. It should end with nothing dropped and no quote missing but the one known (the rain cloud, in *Dies Irae*).
   - **A quote not found** is usually a corrected typo: copy the new wording into `mechanics_index/`.
   - **A heading not found** was renamed upstream: copy the new heading.
   - **A quote that is in the book but outside its section:** upstream split one long line into several. Move the entry's `endLine` to where the section now ends.
5. **Compare the data with what was there.**
   `python3 -I tools/books/datadiff.py` (add `--from` and the commit before the update, once you have committed)
   It lists, for each generated file, the entries that disappeared, appeared or changed.
   - **Every disappearance needs a reason:** either the book dropped it, or an extractor no longer recognizes its layout and must be fixed.
   - **Entries that appear need a look too:** a new creature may be a real one the cleaner text now reveals, or a table read as a stat block.
   - **Mechanics "filed elsewhere":** the topic rules in `mechanics_curation.py` match chapter and section headings. Change the rule to match the renamed heading.
   - **A changed id** (a spell's id carries its level) breaks nothing: a character keeps their own copy of a spell. Check that no fixture or data file names the old id.
6. **Run the checks** in `CLAUDE.md`, in order. `src/data/books.test.ts` fails when a book file is new, moved or renamed and the lists do not say so. `node scripts/qa/books.cjs` opens every book in the reader.
7. **New books** go in two lists that must agree: `tools/extract/books.py` and `app/src/data/constants.ts`. A Fifth Edition book goes in `BOOKS`. A book of the Third or Fourth Edition, or a third-party book, goes in `REFERENCE_BOOKS`: the reader shows it, and nothing is taken from it. A translation of a book already listed goes in `NOT_REGISTERED`.
8. **A book that moved from `wip/` to `reviewed/`:** `relocate.py` updates its path in `books.py`. Set its `status` to `'reviewed'` in `constants.ts`.

## What to expect

The first update, to upstream of 16 November 2026 (26 books changed, four moved, six new), gave:

- **Pointers:** 5,037 into changed books. 1,964 did not move, 3,068 moved with their words unchanged, 5 were reworded, none were lost.
- **Extracted data:** *Hermetic Projects* was reorganized upstream, and its devices were read as spells until `extract_hp.py` learned the new layout. The bestiary gained 63 creatures, all real, from books whose stat blocks are now cleaner. Eight spells and one creature left under their old ids, each for a reason. About 180 entries changed their text, nearly all corrected typos.
- **The Game Mechanics index:** eleven quotes and three headings had corrected wording, two sections ended early, and two topic rules pointed at renamed headings.
- **One old fault found:** the reader could not open a book with a comma in its file name.

So the pointers are the easy part. The extractors and the index are where the work is. Upstream now prints an **errata list at the head of a book** it has reviewed ("Issues from Original"). Read it first: it says which rules changed.

## The files

| File | What it does |
|---|---|
| `compare.py` | Lists the differences between our books and upstream. Changes nothing. |
| `sync.py` | Copies upstream's books over ours and records the commit. |
| `relocate.py` | Moves line pointers in `tools/extract/` and `app/src/` to follow the text. |
| `datadiff.py` | Compares the generated data with the last commit's, entry by entry, and where each mechanic is filed. |
| `UPSTREAM` | The upstream commit our books match. |
| `exceptions.py` | For the adversarial review (CLAUDE.md, step 4): prints the "not", "unless", "only", "instead" and "except" sentences of each section a data file cites, or that the lines added since `origin/main` cite (`--diff`). It finds pointers as `relocate.py` does. An aid, not a check. |
