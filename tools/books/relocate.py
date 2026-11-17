#!/usr/bin/env python3
"""Move the toolkit's line pointers after the books' text has shifted.

The toolkit points into the books by line number: {book: 'DE', line: 5266}. When a book is
replaced by a newer copy, lines move. This tool works out, for each book that changed, where
each old line went, rewrites the pointers it can place with certainty, and lists the rest.

    python3 -I tools/books/relocate.py            # report only
    python3 -I tools/books/relocate.py --write    # rewrite the pointers, then report

It compares the books in the working tree with the books at a git revision (--from, default
HEAD), so run it after sync.py and before committing.

What it rewrites:
  - tools/extract/mechanics_index/<BOOK>-n.json   ("line", "endLine")
  - tools/extract/*.py                            (keys like 'HoH_S-4646-4652', and the paths in books.py)
  - app/src/**/*.ts(x), outside data/generated    (book and line together, helpers such as src(1532),
                                                   and the files and helpers named in FILE_BOOKS and POSITIONAL)
The generated JSON is not touched: rerun the extractors for that.

How sure it is, for each pointer:
  same     the line's words are unchanged (it moved, or its markup or capitals changed)
  reworded the line's words were edited, and the tool found the nearest match. Listed for checking.
  LOST     the text the pointer stood on is gone or cannot be told apart. Not rewritten. Fix by hand.
"""
from __future__ import annotations

import argparse
import difflib
import glob
import json
import os
import re
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from booklib import FOLDERS, ROOT, books_in, git, read  # noqa: E402

# A file whose bare "line: N" entries all point into one book.
FILE_BOOKS = {
    'app/src/data/learnedCharms.ts': 'HMRE',
    'app/src/data/gruagachSpells.ts': 'HMRE',
    'app/src/data/vitkirRunes.ts': 'HMRE',
    'app/src/data/livingCovenants/rhine.ts': 'GotF',
    'app/src/data/livingCovenants/rhineExtras.ts': 'GotF',
    'app/src/data/livingCovenants/rhineForest.ts': 'GotF',
    'app/src/data/beasts.ts': 'DE',
    'app/src/data/commonPowers.ts': 'RoP_M',
    'app/src/engine/covenfolk.ts': 'DE',
    'app/src/ui/pages/TribunalLore.tsx': 'GotF',
}
# Helpers that take the line as a plain argument: file -> [(helper, index of the line argument, book)].
POSITIONAL = {
    'app/src/data/hermeticProjects.ts': [('lab', 5, 'HP'), ('feature', 2, 'HP')],
    'app/src/data/hedgeFolkWitch.ts': [('v', 5, 'HMRE')],
}
# Files where a bare "line:" is not a pointer into a book.
NOT_POINTERS = {'app/src/ui/pages/BookReader.tsx'}


# ---------------------------------------------------------------- the books, old and new

def book_ids() -> dict[str, str]:
    """book id -> file name, read from tools/extract/books.py without importing it"""
    out = {}
    for m in re.finditer(r'\(\s*"([^"]+)",\s*"((?:reviewed|wip|3rd-party)/[^"]+)"', read(os.path.join(ROOT, 'tools/extract/books.py'))):
        out[m.group(1)] = os.path.basename(m.group(2))
    return out


def norm(s: str) -> str:
    """a line with its markup and spacing removed, for telling whether the words changed"""
    return re.sub(r'[\s*_#>|`\\-]+', ' ', s).strip().lower()


class LineMap:
    """Where each line of the old text is in the new text."""

    def __init__(self, old: list[str], new: list[str], hunks: list[tuple[int, int, int, int]]):
        self.old, self.new, self.hunks = old, new, hunks

    def lookup(self, line: int) -> tuple[int | None, str]:
        """(new line, 'same' | 'reworded' | 'LOST') for a 1-based old line"""
        if line < 1 or line > len(self.old):
            return None, 'LOST'
        shift = 0
        for a, b, c, d in self.hunks:  # old start, old count, new start, new count
            if b == 0:  # lines added after old line a
                if line <= a:
                    break
                shift = (c + d - 1) - a
                continue
            if line < a:
                break
            if line < a + b:
                return self._inside(line, a, b, c, d)
            shift = (c + d - 1) - (a + b - 1) if d else (c - (a + b - 1))
        moved = line + shift
        return (moved, 'same') if 1 <= moved <= len(self.new) else (None, 'LOST')

    def _inside(self, line: int, a: int, b: int, c: int, d: int) -> tuple[int | None, str]:
        if d == 0:
            return None, 'LOST'
        text = self.old[line - 1]
        key = norm(text)
        block = self.new[c - 1:c - 1 + d]
        expected = c + round((line - a) * (d - 1) / max(b - 1, 1))
        if not key:
            return None, 'LOST'
        exact = [c + i for i, t in enumerate(block) if t == text]
        if exact:
            return self._nearest(exact, expected), 'same'
        loose = [c + i for i, t in enumerate(block) if norm(t) == key]
        if loose:  # the same words with different markup or capitals
            return self._nearest(loose, expected), 'same'
        best, score = None, 0.0
        for i, t in enumerate(block):
            k = norm(t)
            if not k or abs(len(k) - len(key)) > max(len(key), 20):
                continue
            r = difflib.SequenceMatcher(None, key, k, autojunk=False).ratio()
            if r > score:
                best, score = c + i, r
        if best is not None and score >= 0.75:
            return best, 'reworded'
        return None, 'LOST'

    @staticmethod
    def _nearest(candidates: list[int], expected: int) -> int:
        return min(candidates, key=lambda n: abs(n - expected))


def line_map(old_text: str, new_text: str) -> LineMap:
    with tempfile.TemporaryDirectory() as tmp:
        a, b = os.path.join(tmp, 'old'), os.path.join(tmp, 'new')
        for p, t in ((a, old_text), (b, new_text)):
            with open(p, 'w', encoding='utf8') as f:
                f.write(t)
        diff = subprocess.run(['git', 'diff', '--no-index', '--no-color', '-U0', '--minimal', a, b], capture_output=True, text=True).stdout
    hunks = []
    for m in re.finditer(r'^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@', diff, re.M):
        hunks.append((int(m.group(1)), int(m.group(2) or 1), int(m.group(3)), int(m.group(4) or 1)))
    return LineMap(old_text.split('\n'), new_text.split('\n'), hunks)  # as git and the app count lines: by newline only


def build_maps(ref: str) -> tuple[dict[str, LineMap], dict[str, tuple[str, str]]]:
    """(book id -> LineMap for each book whose text changed, file name -> (old path, new path) for moved books)"""
    old_paths = {os.path.basename(p): p for p in git(['ls-tree', '-r', '--name-only', '-z', ref, '--', *FOLDERS]).split('\0') if p.endswith('.md')}
    new_paths = books_in(ROOT)
    maps, moved = {}, {}
    for book, name in book_ids().items():
        if name not in old_paths or name not in new_paths:
            continue
        if old_paths[name] != new_paths[name]:
            moved[name] = (old_paths[name], new_paths[name])
        old, new = git(['show', f'{ref}:{old_paths[name]}']), read(os.path.join(ROOT, new_paths[name]))
        if old != new:
            maps[book] = line_map(old, new)
    return maps, moved


# ---------------------------------------------------------------- finding and rewriting pointers

class Run:
    def __init__(self, maps: dict[str, LineMap], write: bool):
        self.maps, self.write = maps, write
        self.counts = {'same': 0, 'reworded': 0, 'LOST': 0, 'unmoved': 0}
        self.reworded: list[str] = []
        self.lost: list[str] = []
        self.unknown: list[str] = []

    def move(self, book: str, line: int, where: str) -> int:
        """the new line for a pointer; the old one when it cannot be placed"""
        m = self.maps.get(book)
        if not m:
            return line
        new, how = m.lookup(line)
        if how == 'same' and new == line:
            self.counts['unmoved'] += 1
            return line
        self.counts[how] += 1
        old_text = m.old[line - 1].strip()[:90] if 0 < line <= len(m.old) else '(past the end of the book)'
        if how == 'LOST' or new is None:
            self.lost.append(f'{where}  {book} {line}: "{old_text}"')
            return line
        if how == 'reworded':
            self.reworded.append(f'{where}  {book} {line} -> {new}\n      was "{old_text}"\n      now "{m.new[new - 1].strip()[:90]}"')
        return new

    def end(self, book: str, line: int, new_line: int, end: int, where: str) -> int:
        """the new endLine: follow the text when it can be found, else keep the section's length"""
        m = self.maps.get(book)
        if not m:
            return end
        new, how = m.lookup(end)
        if new is None or new < new_line:
            return new_line + (end - line)
        return new

    def save(self, path: str, old: str, new: str) -> None:
        if self.write and new != old:
            with open(os.path.join(ROOT, path), 'w', encoding='utf8') as f:
                f.write(new)


def split_args(s: str, start: int) -> list[tuple[int, int]]:
    """spans of the top-level arguments of a call whose '(' is at s[start]"""
    spans, depth, quote, i, begin = [], 0, '', start + 1, start + 1
    while i < len(s):
        ch = s[i]
        if quote:
            if ch == '\\':
                i += 1
            elif ch == quote:
                quote = ''
        elif ch in '\'"`':
            quote = ch
        elif ch in '([{':
            depth += 1
        elif ch in ')]}':
            if depth == 0:
                spans.append((begin, i))
                return spans
            depth -= 1
        elif ch == ',' and depth == 0:
            spans.append((begin, i))
            begin = i + 1
        i += 1
    return spans


BOOK_NEAR = re.compile(r'''\b(?:book|bookId)\s*[:=]\s*['"]([A-Za-z0-9_&]+)['"]''')
LINE_TOKEN = re.compile(r'\b(line|endLine)(\s*[:=]\s*\{?\s*)(\d+)')
HELPER_DEF = re.compile(r'''const\s+(\w+)\s*=\s*\(\s*line:\s*number[^)]*\)[^=]*=>\s*\(\{\s*book:\s*['"]([A-Za-z0-9_&]+)['"]''')


def relocate_source(run: Run, path: str) -> None:
    text = read(os.path.join(ROOT, path))
    lines = text.split('\n')
    helpers = dict(HELPER_DEF.findall(text))
    default = FILE_BOOKS.get(path)
    out = []
    last: tuple[str, int, int] | None = None  # the book, old and new line of the pointer just seen, for its endLine
    for n, src in enumerate(lines):
        where = f'{path}:{n + 1}'
        edits: list[tuple[int, int, str]] = []

        def book_for(pos: int) -> str | None:
            before = BOOK_NEAR.findall(src[:pos])
            if before:
                return before[-1]
            for back in range(1, 4):  # a book on one of the three lines above, with no other pointer between
                if n - back < 0:
                    break
                prev = lines[n - back]
                found = BOOK_NEAR.findall(prev)
                if found:
                    return found[-1]
                if LINE_TOKEN.search(prev):
                    break
            return default

        for m in LINE_TOKEN.finditer(src):
            if path in NOT_POINTERS or 'line: number' in src:
                continue
            value = int(m.group(3))
            if value == 0:
                continue
            if m.group(1) == 'line':
                book = book_for(m.start())
                if book is None:
                    if value > 0:
                        run.unknown.append(f'{where}  line {value}: which book?')
                    last = None
                    continue
                new = run.move(book, value, where)
                last = (book, value, new)
            else:
                if not last:
                    continue
                new = run.end(last[0], last[1], last[2], value, where)
            if new != value:
                edits.append((m.start(3), m.end(3), str(new)))
        for name, book in helpers.items():
            for m in re.finditer(rf'\b{re.escape(name)}\((\d+)', src):
                new = run.move(book, int(m.group(1)), where)
                if new != int(m.group(1)):
                    edits.append((m.start(1), m.end(1), str(new)))
        for name, index, book in POSITIONAL.get(path, []):
            for m in re.finditer(rf'(?<![\w.]){re.escape(name)}\(', src):
                spans = split_args(src, m.end() - 1)
                if len(spans) > index:
                    a, b = spans[index]
                    arg = src[a:b]
                    if arg.strip().isdigit():
                        new = run.move(book, int(arg), where)
                        if new != int(arg):
                            lead = len(arg) - len(arg.lstrip())
                            edits.append((a + lead, a + lead + len(arg.strip()), str(new)))
        for a, b, rep in sorted(set(edits), reverse=True):
            src = src[:a] + rep + src[b:]
        out.append(src)
    run.save(path, text, '\n'.join(out))


def relocate_index(run: Run) -> None:
    for full in sorted(glob.glob(os.path.join(ROOT, 'tools/extract/mechanics_index/*.json'))):
        path = os.path.relpath(full, ROOT)
        book = re.sub(r'-\d+\.json$', '', os.path.basename(full))
        if book not in run.maps:
            continue
        text = read(full)
        entries = json.loads(text)
        for e in entries:
            where = f'{path} "{e.get("title", "")[:50]}"'
            if isinstance(e.get('line'), int):
                old = e['line']
                e['line'] = run.move(book, old, where)
                if isinstance(e.get('endLine'), int):
                    e['endLine'] = run.end(book, old, e['line'], e['endLine'], where)
        new = json.dumps(entries, ensure_ascii=False, indent=1) + ('\n' if text.endswith('\n') else '')
        if json.loads(new) != json.loads(text):
            run.save(path, text, new)


def relocate_tools(run: Run, moved: dict[str, tuple[str, str]]) -> None:
    for full in sorted(glob.glob(os.path.join(ROOT, 'tools/extract/*.py'))):
        path = os.path.relpath(full, ROOT)
        text = read(full)

        def key(m: re.Match) -> str:
            book, a, b = m.group(2), int(m.group(3)), int(m.group(4))
            if book not in run.maps:
                return m.group(0)
            na = run.move(book, a, f'{path} {m.group(0)}')
            nb = run.end(book, a, na, b, path)
            return f'{m.group(1)}{book}-{na}-{nb}{m.group(1)}'

        new = re.sub(r'''(['"])([A-Za-z0-9_&]+)-(\d+)-(\d+)\1''', key, text)
        if os.path.basename(full) == 'books.py':
            for old_path, new_path in moved.values():
                new = new.replace(f'"{old_path}"', f'"{new_path}"')
        run.save(path, text, new)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--from', dest='ref', default='HEAD', help='the git revision holding the old books (default HEAD)')
    ap.add_argument('--write', action='store_true', help='rewrite the pointers (default: report only)')
    args = ap.parse_args()

    maps, moved = build_maps(args.ref)
    if not maps and not moved:
        print(f'No book differs from {args.ref}. Nothing to do.')
        return 0
    print(f'Books whose text changed since {args.ref}: {", ".join(sorted(maps)) or "none"}')
    for old_path, new_path in moved.values():
        print(f'Moved: {old_path} -> {new_path}')

    run = Run(maps, args.write)
    relocate_index(run)
    relocate_tools(run, moved)
    for pattern in ('app/src/**/*.ts', 'app/src/**/*.tsx'):
        for full in sorted(glob.glob(os.path.join(ROOT, pattern), recursive=True)):
            path = os.path.relpath(full, ROOT)
            if '/data/generated/' in path:
                continue
            relocate_source(run, path)

    c = run.counts
    print(f'\nPointers into changed books: {c["unmoved"]} did not move, {c["same"]} moved with their text unchanged, '
          f'{c["reworded"]} moved and reworded, {c["LOST"]} LOST.')
    print('Rewritten.' if args.write else 'Nothing was written. Add --write to rewrite the pointers.')
    for title, rows in (('Reworded: check each still points at the right text', run.reworded),
                        ('LOST: not rewritten, fix by hand', run.lost),
                        ('Bare line numbers with no book (add the file to FILE_BOOKS)', run.unknown)):
        if rows:
            print(f'\n{title} ({len(rows)})')
            for r in rows:
                print('  ' + r)
    return 0


if __name__ == '__main__':
    sys.exit(main())
