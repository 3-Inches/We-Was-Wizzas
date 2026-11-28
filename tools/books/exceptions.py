#!/usr/bin/env python3
"""Print the exceptions of each book section the toolkit cites: the sentences with "not", "cannot",
"unless", "only", "instead" or "except" in them. An aid for the adversarial review (CLAUDE.md, step 4),
not a check: a rule's exceptions are where code and book most often part.

    python3 -I tools/books/exceptions.py FILE...          the sections these files cite
    python3 -I tools/books/exceptions.py --diff [REF]     the sections cited on lines added since REF
                                                          (default origin/main), in app/src
    --deep   take a section down to the next heading of its own level, not the next heading of any level

A citation is a pointer as relocate.py finds it: `{ book: 'ID', line: N }`, the JSON's `"book"` and `"line"`
on lines of their own, a helper such as `src(N)`, and the files in its FILE_BOOKS and POSITIONAL.
Each section is printed once, with the places that cite it.
"""
from __future__ import annotations

import argparse
import collections
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'extract'))
from books import BOOK_BY_ID, ROOT, read_book  # noqa: E402
from relocate import relocate_source  # noqa: E402

EXCEPTION = re.compile(r"\b(not|cannot|unless|only|instead|except)\b", re.I)
HEADING = re.compile(r'^(#{1,6})\s+(.*)$')
SENTENCE_END = re.compile(r'(?<=[.!?])["”’)]?\s+(?=["“*(]?[A-Z])')

class Collector:
    """Stands in for relocate.py's Run: records each pointer relocate_source finds, and moves none."""

    def __init__(self):
        self.found, self.unknown = [], []

    def move(self, book, line, where):
        self.found.append((book, line, where))
        return line

    def end(self, book, old, new, value, where):
        return value

    def save(self, path, old, new):
        pass


def citations(path, keep=None):
    """Each pointer in a file, as (book, line, where), found as relocate.py finds them (book and line
    together, helpers such as src(1532), FILE_BOOKS and POSITIONAL); with `keep`, only those on one of its lines."""
    c = Collector()
    relocate_source(c, path)
    return [x for x in c.found if keep is None or int(x[2].rsplit(':', 1)[1]) in keep]


def citations_in_files(paths):
    for p in paths:
        yield from citations(os.path.relpath(os.path.abspath(p), ROOT))


def citations_in_diff(ref):
    """The pointers on lines added since `ref`."""
    out = subprocess.run(['git', 'diff', '-U0', ref, '--', 'app/src'], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    added = collections.defaultdict(set)
    path, at = '', 0
    for line in out.split('\n'):
        if line.startswith('+++ '):
            path = line[6:] if line.startswith('+++ b/') else ''
        elif line.startswith('@@'):
            m = re.search(r'\+(\d+)', line)
            at = int(m.group(1)) if m else 0
        elif line.startswith('+') and path:
            added[path].add(at)
            at += 1
    for path, lines in added.items():
        if path.endswith(('.ts', '.tsx', '.json')):
            yield from citations(path, lines)


def section(lines, n, deep):
    """The heading at or above line n (1-based), and the lines to the next heading."""
    start = next((k for k in range(n - 1, -1, -1) if HEADING.match(lines[k])), 0)
    m = HEADING.match(lines[start])
    level = len(m.group(1)) if m else 0
    end = len(lines)
    for k in range(start + 1, len(lines)):
        h = HEADING.match(lines[k])
        if h and (not deep or len(h.group(1)) <= level):
            end = k
            break
    return start, end, (m.group(2).strip() if m else '(before the first heading)')


def exceptions(lines, start, end):
    """Each sentence with an exception in it, with the line it starts on."""
    for k in range(start + 1, end):
        text = lines[k].strip().lstrip('>').strip()
        if not text or text.startswith('|'):
            continue
        for s in SENTENCE_END.split(text):
            if EXCEPTION.search(s):
                yield k + 1, s.strip()


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('files', nargs='*')
    ap.add_argument('--diff', nargs='?', const='origin/main', metavar='REF')
    ap.add_argument('--deep', action='store_true')
    a = ap.parse_args()
    if not a.files and not a.diff:
        ap.error('name the files, or give --diff')
    cites = list(citations_in_diff(a.diff)) if a.diff else list(citations_in_files(a.files))
    books = {}
    by_section = collections.OrderedDict()
    unknown = collections.Counter()
    for book, line, where in cites:
        if book not in BOOK_BY_ID:
            unknown[book] += 1
            continue
        if book not in books:
            books[book] = read_book(book).split('\n')
        lines = books[book]
        if not 1 <= line <= len(lines):
            print(f'!! {where}: {book} has no line {line}')
            continue
        start, end, title = section(lines, line, a.deep)
        by_section.setdefault((book, start), [title, end, []])[2].append(where)
    for (book, start), (title, end, wheres) in by_section.items():
        found = list(exceptions(books[book], start, end))
        shown = ', '.join(wheres[:4]) + (f' and {len(wheres) - 4} more' if len(wheres) > 4 else '')
        print(f'\n== {book} line {start + 1}: {title}  (cited by {shown})')
        for k, s in found:
            print(f'  {k}: {s}')
        if not found:
            print('  (no exception)')
    if unknown:
        print('\nnot a registered book: ' + ', '.join(f'{b} ×{n}' for b, n in unknown.most_common()))
    print(f'\n{len(by_section)} sections from {len(cites)} citations.')


if __name__ == '__main__':
    main()
