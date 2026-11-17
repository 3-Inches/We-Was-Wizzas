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
   - **Bare line numbers with no book**: add the file to `FILE_BOOKS` in `relocate.py` and run again.
4. **Regenerate the data, and compare it with what was there.**
   `python3 -I tools/extract/run_all.py`
   `python3 -I tools/books/datadiff.py`
   `datadiff.py` lists, for each generated file, the entries that disappeared, appeared or changed. Every disappearance needs a reason: either the book dropped it, or an extractor no longer recognizes its layout and must be fixed. Entries that appear need a look too: a new creature may be a real one the cleaner text now reveals, or a table read as a stat block.
5. **Rebuild the Game Mechanics index and run the checks** in `CLAUDE.md`, in order. `build_mechanics.py` checks that every quote in the index still appears in its book, word for word. A quote that fails is usually a corrected typo: copy the new wording.
6. **New books** need an entry in `tools/extract/books.py` before the reader shows them. Books of the Third and Fourth Editions are setting reference only.
7. **A book that moved from `wip/` to `reviewed/`:** `relocate.py` updates its path in `books.py`. Check whether anything else names the old path (`grep -rn "wip/" app/src tools`).

## What to expect

A trial run against upstream of 16 November 2026 (26 books changed, four moved, six new) gave:

- **Pointers:** 5,029 into changed books. 1,964 did not move, 3,060 moved with their words unchanged, 5 were reworded, none were lost.
- **Extracted data:** *Hermetic Projects* was reorganized upstream, and its 80 enchanted devices were no longer recognized as devices (they were read as spells). The bestiary gained 63 creatures, most from books whose stat blocks are now cleaner. Four spells and one creature disappeared. About 180 entries changed their text.

So the pointers are the easy part. The extractors are where the work is.

## The files

| File | What it does |
|---|---|
| `compare.py` | Lists the differences between our books and upstream. Changes nothing. |
| `sync.py` | Copies upstream's books over ours and records the commit. |
| `relocate.py` | Moves line pointers in `tools/extract/` and `app/src/` to follow the text. |
| `datadiff.py` | Compares the generated data with the last commit's, entry by entry. |
| `UPSTREAM` | The upstream commit our books match. |
