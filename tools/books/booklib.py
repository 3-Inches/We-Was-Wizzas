"""Shared pieces for the book tools: where the books are, and how to fetch upstream."""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FOLDERS = ('reviewed', 'wip', '3rd-party')
UPSTREAM_URL = 'https://github.com/OriginalMadman/Ars-Magica-Open-License.git'
UPSTREAM_FILE = os.path.join(ROOT, 'tools', 'books', 'UPSTREAM')


def books_in(root: str) -> dict[str, str]:
    """file name -> path relative to root, for every book under the three folders"""
    out: dict[str, str] = {}
    for folder in FOLDERS:
        d = os.path.join(root, folder)
        if not os.path.isdir(d):
            continue
        for name in sorted(os.listdir(d)):
            if name.endswith('.md'):
                out[name] = f'{folder}/{name}'
    return out


def read(path: str) -> str:
    with open(path, encoding='utf8') as f:
        return f.read()


def git(args: list[str], cwd: str = ROOT) -> str:
    return subprocess.run(['git', *args], cwd=cwd, check=True, capture_output=True, text=True).stdout


def upstream_checkout(path: str | None) -> str:
    """A directory holding upstream's files. Clones anonymously (one commit deep) when no path is given.
    A clone is a read: nothing about it is visible to the upstream repository's owners."""
    if path:
        if not os.path.isdir(path):
            sys.exit(f'No such directory: {path}')
        return os.path.abspath(path)
    dest = os.path.join(tempfile.mkdtemp(prefix='arm-upstream-'), 'upstream')
    subprocess.run(['git', 'clone', '--quiet', '--depth', '1', UPSTREAM_URL, dest], check=True)
    return dest


def upstream_commit(checkout: str) -> tuple[str, str]:
    """(commit, date) of the upstream checkout"""
    try:
        sha = git(['rev-parse', 'HEAD'], cwd=checkout).strip()
        date = git(['log', '-1', '--format=%cs'], cwd=checkout).strip()
        return sha, date
    except Exception:
        return 'unknown', 'unknown'


def recorded_commit() -> str:
    """the upstream commit our books were last brought in step with"""
    if not os.path.exists(UPSTREAM_FILE):
        return 'unknown'
    for line in read(UPSTREAM_FILE).splitlines():
        if line.startswith('commit:'):
            return line.split(':', 1)[1].strip()
    return 'unknown'
