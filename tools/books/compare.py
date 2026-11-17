#!/usr/bin/env python3
"""Compare our copies of the books with upstream. Reads only; changes nothing.

    python3 -I tools/books/compare.py                    # clones upstream to a temporary folder
    python3 -I tools/books/compare.py --upstream PATH    # uses a checkout you already have
    python3 -I tools/books/compare.py --markdown         # the report as markdown, for an issue

Exit status: 0 when the books match, 1 when they differ.
"""
from __future__ import annotations

import argparse
import difflib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from booklib import ROOT, books_in, read, recorded_commit, upstream_checkout, upstream_commit  # noqa: E402


def changed_lines(old: str, new: str) -> tuple[int, int]:
    """(lines removed, lines added)"""
    removed = added = 0
    for line in difflib.unified_diff(old.splitlines(), new.splitlines(), lineterm='', n=0):
        if line.startswith('---') or line.startswith('+++'):
            continue
        if line.startswith('-'):
            removed += 1
        elif line.startswith('+'):
            added += 1
    return removed, added


def compare(upstream: str) -> dict:
    ours, theirs = books_in(ROOT), books_in(upstream)
    new = [theirs[n] for n in theirs if n not in ours]
    gone = [ours[n] for n in ours if n not in theirs]
    moved, changed = [], []
    for name in sorted(set(ours) & set(theirs)):
        if ours[name] != theirs[name]:
            moved.append((ours[name], theirs[name]))
        a, b = read(os.path.join(ROOT, ours[name])), read(os.path.join(upstream, theirs[name]))
        if a != b:
            removed, added = changed_lines(a, b)
            changed.append((theirs[name], removed, added, len(a.splitlines()), len(b.splitlines())))
    changed.sort(key=lambda c: -(c[1] + c[2]))
    return {'new': new, 'gone': gone, 'moved': moved, 'changed': changed}


def report(result: dict, sha: str, date: str, markdown: bool) -> str:
    out: list[str] = []
    h = (lambda s: f'### {s}') if markdown else (lambda s: f'\n{s}\n' + '-' * len(s))
    item = (lambda s: f'- {s}')
    code = (lambda s: f'`{s}`') if markdown else (lambda s: s)
    out.append(f'Upstream is at commit {code(sha[:12])} ({date}). Our books were last brought in step at {code(recorded_commit()[:12])}.')
    if not any(result.values()):
        out.append('The books match.')
        return '\n'.join(out)
    if result['changed']:
        out.append(h(f"Changed ({len(result['changed'])})"))
        for path, removed, added, was, now in result['changed']:
            out.append(item(f'{code(path)}: {removed} lines out, {added} in ({was} lines, now {now})'))
    if result['moved']:
        out.append(h(f"Moved ({len(result['moved'])})"))
        for a, b in result['moved']:
            out.append(item(f'{code(a)} is now {code(b)}'))
    if result['new']:
        out.append(h(f"New upstream ({len(result['new'])})"))
        out += [item(code(p)) for p in result['new']]
    if result['gone']:
        out.append(h(f"Ours only ({len(result['gone'])})"))
        out += [item(code(p)) for p in result['gone']]
    if markdown:
        out.append('')
        out.append('To bring the books in step, follow `tools/books/README.md`.')
    return '\n'.join(out)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--upstream', help='a checkout of the upstream repository (cloned when absent)')
    ap.add_argument('--markdown', action='store_true')
    args = ap.parse_args()
    upstream = upstream_checkout(args.upstream)
    sha, date = upstream_commit(upstream)
    result = compare(upstream)
    print(report(result, sha, date, args.markdown))
    return 1 if any(result.values()) else 0


if __name__ == '__main__':
    sys.exit(main())
