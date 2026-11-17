#!/usr/bin/env python3
"""Compare the generated data with a git revision's, entry by entry.

    python3 -I tools/books/datadiff.py [--from REF] [--all]

Run it after the extractors, before committing. Line numbers are ignored: an entry counts as
changed only when something else about it differs. --all lists every name, not the first ten.
"""
from __future__ import annotations

import argparse
import collections
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from booklib import ROOT, git  # noqa: E402

GENERATED = 'app/src/data/generated'


def book(e) -> str:
    if not isinstance(e, dict):
        return '?'
    s = e.get('source')
    return s.get('book', '?') if isinstance(s, dict) else e.get('book', '?')


def key(e) -> str:
    if not isinstance(e, dict):
        return str(e)
    return str(e.get('id') or e.get('name') or json.dumps(e, sort_keys=True)[:60])


def without_lines(e):
    if isinstance(e, dict):
        return {k: without_lines(v) for k, v in e.items() if k not in ('line', 'endLine')}
    if isinstance(e, list):
        return [without_lines(x) for x in e]
    return e


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--from', dest='ref', default='HEAD')
    ap.add_argument('--all', action='store_true')
    args = ap.parse_args()
    show = (lambda names: ', '.join(names)) if args.all else (lambda names: ', '.join(names[:10]) + (f' … and {len(names) - 10} more' if len(names) > 10 else ''))
    quiet = True
    for name in sorted(os.listdir(os.path.join(ROOT, GENERATED))):
        if not name.endswith('.json'):
            continue
        with open(os.path.join(ROOT, GENERATED, name), encoding='utf8') as f:
            new = json.load(f)
        try:
            old = json.loads(git(['show', f'{args.ref}:{GENERATED}/{name}']))
        except Exception:
            print(f'{name}: new file')
            quiet = False
            continue
        if without_lines(old) == without_lines(new):
            continue
        quiet = False
        if not (isinstance(old, list) and isinstance(new, list)):
            print(f'{name}: changed (not a list of entries: compare it with git diff)')
            continue
        ob, nb = collections.Counter(map(book, old)), collections.Counter(map(book, new))
        by_book = ', '.join(f'{b} {ob[b]} -> {nb[b]}' for b in sorted(set(ob) | set(nb)) if ob[b] != nb[b])
        om, nm = {key(e): without_lines(e) for e in old}, {key(e): without_lines(e) for e in new}
        gone, added = sorted(set(om) - set(nm)), sorted(set(nm) - set(om))
        changed = sorted(k for k in om if k in nm and om[k] != nm[k])
        print(f'{name}: {len(old)} -> {len(new)} entries' + (f' ({by_book})' if by_book else ''))
        for label, names in (('gone', gone), ('new', added), ('changed', changed)):
            if names:
                print(f'  {label} ({len(names)}): {show(names)}')
    if quiet:
        print(f'The generated data matches {args.ref}, line numbers aside.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
