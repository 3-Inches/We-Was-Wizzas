#!/usr/bin/env python3
"""Copy upstream's books over ours, and record which upstream commit they came from.

    python3 -I tools/books/sync.py [--upstream PATH] [--only "Hermetic Projects"]

Run it on a clean working tree, on its own branch. It changes only the book folders and
tools/books/UPSTREAM. Then run relocate.py, which moves the toolkit's line pointers to follow.
See tools/books/README.md for the whole procedure.
"""
from __future__ import annotations

import argparse
import datetime
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from booklib import ROOT, UPSTREAM_FILE, UPSTREAM_URL, books_in, read, upstream_checkout, upstream_commit  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--upstream', help='a checkout of the upstream repository (cloned when absent)')
    ap.add_argument('--only', action='append', default=[], help='copy only books whose file name contains this (repeatable)')
    args = ap.parse_args()
    upstream = upstream_checkout(args.upstream)
    sha, date = upstream_commit(upstream)
    ours, theirs = books_in(ROOT), books_in(upstream)
    wanted = lambda name: not args.only or any(o.lower() in name.lower() for o in args.only)
    copied = moved = added = 0
    for name, path in theirs.items():
        if not wanted(name):
            continue
        src, dest = os.path.join(upstream, path), os.path.join(ROOT, path)
        if name in ours and ours[name] != path:
            os.remove(os.path.join(ROOT, ours[name]))
            moved += 1
            print(f'moved    {ours[name]} -> {path}')
        elif name not in ours:
            added += 1
            print(f'new      {path}')
        elif read(src) == read(dest):
            continue
        else:
            print(f'changed  {path}')
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copyfile(src, dest)
        copied += 1
    for name, path in ours.items():
        if name not in theirs and wanted(name):
            print(f'ours only, left alone: {path}')
    if not args.only:
        with open(UPSTREAM_FILE, 'w', encoding='utf8') as f:
            f.write(f'source: {UPSTREAM_URL}\ncommit: {sha}\ncommit-date: {date}\nsynced: {datetime.date.today().isoformat()}\n')
    print(f'\n{copied} files written ({moved} moved, {added} new). Upstream commit {sha[:12]}.')
    print('Next: python3 -I tools/books/relocate.py')
    return 0


if __name__ == '__main__':
    sys.exit(main())
