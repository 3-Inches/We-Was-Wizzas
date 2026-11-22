"""The numbers of each merged pull request, from git alone (nothing is checked out or built).

    python3 -I tools/history/stats.py > app/docs/history/stats.md

For each merge into main, in order: what it changed (files, lines added and removed) and what main
was after it (the size of app/src without generated data, the generated data, the books' reader
copy, the test files and the tests in them). A jump in a column is where to look. Times (the test
run, the sweep, a saga's making) are not in git: each pull request writes them into
app/docs/history/README.md.
"""
import re
import subprocess
import sys


def git(*a):
    return subprocess.run(['git', *a], capture_output=True, text=True, check=True).stdout


def sizes(commit):
    src = gen = tests = 0
    nfiles = 0
    for line in git('ls-tree', '-r', '-l', commit, '--', 'app/src').splitlines():
        meta, path = line.split('\t', 1)
        size = meta.split()[3]
        if size == '-':
            continue
        size = int(size)
        if path.startswith('app/src/data/generated/'):
            gen += size
        elif re.search(r'\.test\.tsx?$', path):
            tests += size
            nfiles += 1
        else:
            src += size
    return src, gen, tests, nfiles


def cases(commit):
    try:
        out = git('grep', '-E', '-c', r'^\s*(it|test)(\.each\(.*\))?\(', commit, '--', 'app/src/*.test.ts', 'app/src/*.test.tsx')
    except subprocess.CalledProcessError:
        return 0
    return sum(int(l.rsplit(':', 1)[1]) for l in out.splitlines())


def main():
    merges = git('log', '--first-parent', '--merges', '--reverse', '--format=%H %ad %s', '--date=short', 'origin/main').splitlines()
    kb = lambda n: f'{n / 1024:,.0f}'
    print('| PR | date | files | +lines | -lines | src KB | generated KB | test KB | test files | tests |')
    print('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|')
    for m in merges:
        sha, date, subject = m.split(' ', 2)
        pr = re.search(r'#(\d+)', subject)
        stat = git('diff', '--shortstat', f'{sha}^1', sha)
        f = re.search(r'(\d+) files? changed', stat)
        ins = re.search(r'(\d+) insertion', stat)
        dels = re.search(r'(\d+) deletion', stat)
        src, gen, tests, nfiles = sizes(sha)
        print(f"| {pr.group(1) if pr else sha[:7]} | {date} | {f.group(1) if f else 0} | {ins.group(1) if ins else 0} | {dels.group(1) if dels else 0} | {kb(src)} | {kb(gen)} | {kb(tests)} | {nfiles} | {cases(sha)} |")


if __name__ == '__main__':
    sys.exit(main())
