"""Extract the creature stat blocks of the reviewed 5th Edition books into a bestiary.

A stat block starts at a "(Realm) Might: N" line; its name is the heading just above it, and it runs
to the next heading (or the end of its blockquote), keeping the Appearance paragraph and stopping
before the lore and story seeds that follow. Templates ("Might: not more than 25") are skipped:
the bestiary holds creatures a storyguide can put in play as written.

Writes app/src/data/generated/bestiary.json.
"""
import json
import os
import re

from books import BOOKS, read_book
from common import OUT_DIR, slug

MIGHT = re.compile(r"^\**\s*(Magic|Faerie|Infernal|Divine) Might\s*\**\s*:?\s*\**\s*:?\s*(\d+)\s*(?:\(([^)]*)\))?", re.I)
HEADING = re.compile(r"^(#{1,6})\s+(.*\S)\s*$")
BOLD_NAME = re.compile(r"^\*\*([^*:]{2,60})\*\*\s*$")
GENERIC = re.compile(r"^(game )?stat(istic)?s?|^combat|^powers|^the creature|^description|^appearance", re.I)
FORMS = ["Animal", "Aquam", "Auram", "Corpus", "Herbam", "Ignem", "Imaginem", "Mentem", "Terram", "Vim"]
MAX_LINES = 90


def unquote(line):
    return re.sub(r"^(\s*>\s?)+", "", line)


def clean_name(t):
    t = re.sub(r"[*_`]", "", t).strip()
    t = re.sub(r"\s*\{#.*\}$", "", t)
    return t.strip(" :")


def find_name(lines, i):
    """The nearest heading (or bold line on its own) above the Might line."""
    for j in range(i - 1, max(-1, i - 40), -1):
        s = unquote(lines[j]).strip()
        m = HEADING.match(s)
        if m:
            name = clean_name(m.group(2))
            if name and not GENERIC.match(name):
                return name, j, len(m.group(1))
            continue
        m = BOLD_NAME.match(s)
        if m and not GENERIC.match(m.group(1)):
            return clean_name(m.group(1)), j, 7
    return None, None, None


def block_text(lines, i):
    """From the Might line to the next heading, the end of the blockquote, or past the Appearance paragraph."""
    quoted = lines[i].lstrip().startswith(">")
    out = []
    seen_appearance = False
    for k in range(i, min(len(lines), i + MAX_LINES)):
        raw = lines[k]
        if k > i and quoted and raw.strip() and not raw.lstrip().startswith(">"):
            break
        s = unquote(raw).rstrip()
        if k > i and HEADING.match(s.strip()):
            break
        if k > i and MIGHT.match(s.strip()):
            break
        if seen_appearance and not s.strip():
            break
        if re.match(r"^\**Appearance\**\s*:", s.strip(), re.I):
            seen_appearance = True
        out.append(s)
    while out and not out[-1].strip():
        out.pop()
    return "\n".join(out)


def field(text, label):
    m = re.search(r"(?mi)^\**" + label + r"\**\s*:\**\s*([^\n]*)", text)
    return m.group(1).strip() if m else None


def main():
    entries = []
    seen = set()
    for book_id, path, *_rest in BOOKS:
        if not path.startswith("reviewed/") or not _rest[-1]:
            continue
        lines = read_book(book_id).split("\n")
        for i, line in enumerate(lines):
            m = MIGHT.match(unquote(line).strip())
            if not m:
                continue
            name, at, _level = find_name(lines, i)
            if not name:
                continue
            key = (book_id, name.lower())
            if key in seen:
                continue
            seen.add(key)
            text = block_text(lines, i)
            form = next((f for f in FORMS if m.group(3) and f.lower() in m.group(3).lower()), None)
            size = field(text, "Size")
            season = field(text, "Season")
            sm = re.match(r"[+−–-]?\s*\d+", size or "")
            entries.append({
                "id": slug(f"{book_id}-{name}"),
                "name": name,
                "book": book_id,
                "line": at + 1,
                "realm": m.group(1).capitalize(),
                "might": int(m.group(2)),
                "form": form,
                "size": int(sm.group(0).replace("−", "-").replace("–", "-").replace(" ", "")) if sm else None,
                "season": season.split()[0].strip(".,").lower() if season else None,
                "text": text,
            })
    entries.sort(key=lambda e: (e["realm"], e["might"], e["name"]))
    with open(os.path.join(OUT_DIR, "bestiary.json"), "w", encoding="utf-8") as fh:
        json.dump(entries, fh, ensure_ascii=False, separators=(",", ":"))
    by = {}
    for e in entries:
        by[e["realm"]] = by.get(e["realm"], 0) + 1
    print(f"bestiary: {len(entries)} creatures {by}")


if __name__ == "__main__":
    main()
