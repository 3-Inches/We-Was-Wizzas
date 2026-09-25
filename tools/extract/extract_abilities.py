"""Extract Abilities.

The Definitive Edition Ability List is parsed in full. Supplements are scanned
for "Specialties:" lines that end in an Ability type, e.g.

    #### Holy Music
    ... description ...
    *Specialties:* particular hymns. (Supernatural)
"""
import re

from books import BOOKS, read_book
from common import clean_body, clean_inline, github_anchor, heading_of, slug, strip_quote, write_json

TYPES = ["General", "Academic", "Arcane", "Martial", "Supernatural", "Mystery", "Spell Mastery",
         "Social", "Special", "Heroic"]
TYPE_RE = re.compile(r"\((" + "|".join(TYPES) + r")[^)]{0,40}\)\.?\s*$", re.I)


def norm_type(t):
    for x in TYPES:
        if t.lower().startswith(x.lower()):
            return x
    return t


def canonical_de_types(lines):
    """Parse the 'Abilities by Type' link lists: name -> (type, asterisk)."""
    start = next(i for i, l in enumerate(lines) if l.strip() == "## Abilities by Type")
    end = next(i for i in range(start + 1, len(lines)) if lines[i].strip() == "## Ability List")
    out = {}
    cur = None
    for l in lines[start:end]:
        h = heading_of(l)
        if h:
            m = re.match(r"(\w+(?: \w+)?) Abilities", h[1])
            cur = m.group(1) if m else None
            continue
        m = re.match(r"^\[(.+?)\]\(#", l.strip())
        if m and cur:
            raw = m.group(1)
            ast = "\\*" in raw or raw.endswith("*")
            name = raw.replace("\\*", "").replace("*", "").strip()
            out[name.lower()] = (cur, ast, name)
    return out


def extract_de():
    text = read_book("DE")
    lines = text.split("\n")
    canon = canonical_de_types(lines)
    start = next(i for i, l in enumerate(lines) if l.strip() == "## Ability List")
    end = next(i for i in range(start + 1, len(lines)) if re.match(r"^# ", lines[i]))
    abilities = []
    cur = None
    buf = []

    def flush():
        if cur is None:
            return
        body = clean_body(buf)
        spec = None
        typ = None
        m = re.search(r"\*?Specialt(?:ies|y)\s*:?\*?\s*:?\s*(.*)$", body, re.I | re.S)
        if m:
            tail = m.group(1).strip()
            tm = re.search(r"\(([^()]*)\)\.?\s*$", tail)
            if tm:
                typ = norm_type(tm.group(1).strip())
                tail = tail[:tm.start()].strip()
            spec = tail.rstrip(".").strip()
            desc = body[:m.start()].strip()
        else:
            tm = re.search(r"\(([^()]*)\)\.?\s*$", body)
            if tm and norm_type(tm.group(1)) in TYPES:
                typ = norm_type(tm.group(1))
            desc = body
        name = cur["name"]
        key = re.sub(r"\s*\(kie-ruhr-gee\)", "", name.lower()).strip()
        if key in canon:
            typ = canon[key][0]
            name = canon[key][2]
        elif abilities:
            # a sub-heading inside the previous ability (e.g. Hex Effects): fold it in
            abilities[-1]["text"] += "\n\n#### " + name + "\n" + body
            return
        if spec:
            spec = spec.split("\n\n")[0]
        abilities.append({
            "id": slug(name),
            "name": name,
            "type": typ or "General",
            "restricted": cur["asterisk"],
            "specialties": [s.strip() for s in re.split(r",\s*", spec)] if spec else [],
            "text": desc,
            "source": {"book": "DE", "line": cur["line"] + 1, "anchor": github_anchor(name)},
        })

    for i in range(start + 1, end):
        h = heading_of(lines[i])
        if h and h[0] == 4 and not lines[i].lstrip().startswith(">"):
            flush()
            raw = h[1]
            asterisk = "\\*" in raw or raw.rstrip().endswith("*")
            name = clean_inline(raw.replace("\\*", "")).strip()
            cur = {"name": name, "asterisk": asterisk, "line": i}
            buf = []
        elif cur is not None:
            buf.append(lines[i])
    flush()
    return abilities


def extract_supplement(book_id):
    text = read_book(book_id)
    lines = text.split("\n")
    found = []
    for i, line in enumerate(lines):
        s = strip_quote(line)
        if not re.search(r"Specialt(?:ies|y)", s):
            continue
        tm = TYPE_RE.search(re.sub(r"<br\s*/?>", "", s).strip())
        if not tm:
            continue
        typ = norm_type(tm.group(1))
        # find the entry name above
        name = None
        name_line = None
        for j in range(i - 1, max(-1, i - 60), -1):
            h = heading_of(lines[j])
            if h:
                name = clean_inline(h[1])
                name_line = j
                break
            bm = re.match(r"^\*\*([^*]{2,60})\*\*:?\s*(<br\s*/?>)?\s*$", strip_quote(lines[j]).strip())
            if bm:
                name = clean_inline(bm.group(1))
                name_line = j
                break
        if not name:
            continue
        name = re.sub(r"\s*\((?:New\s+)?(?:" + "|".join(TYPES) + r")[^)]*\)\s*$", "", name, flags=re.I)
        name = re.sub(r"^(New\s+)?(Supernatural\s+|Academic\s+|Arcane\s+|General\s+|Martial\s+)?Ability\s*:\s*", "", name, flags=re.I)
        name = name.replace("\\*", "").replace("\\", "").strip("* ").strip()
        name = re.sub(r"^(Major|Minor)\s+\w+\s+Virtue\s*:\s*", "", name, flags=re.I)
        name = re.sub(r"^Ability\s+", "", name)
        from common import title_case_if_shouting
        name = title_case_if_shouting(name)
        if len(name) > 50 or len(name) < 2 or re.search(r"\d|Ease Factor|Group Modifier|Example|Guidelines|\bvs\b", name):
            continue
        body = clean_body(lines[name_line + 1:i + 1])
        spec_m = re.search(r"\*?Specialt(?:ies|y)\s*:?\*?\s*:?\s*(.*)$", body, re.I | re.S)
        spec = ""
        desc = body
        if spec_m:
            spec = spec_m.group(1)
            spec = re.sub(r"\(([^()]*)\)\.?\s*$", "", spec).strip().rstrip(".")
            spec = spec.split("\n\n")[0].lstrip("*: ").strip()
            desc = body[:spec_m.start()].strip()
        found.append({
            "id": slug(name),
            "name": name,
            "type": typ,
            "restricted": typ in ("Academic", "Arcane", "Supernatural", "Mystery"),
            "specialties": [x.strip() for x in re.split(r",\s*", spec) if x.strip()],
            "text": desc[-6000:],
            "source": {"book": book_id, "line": name_line + 1, "anchor": github_anchor(name)},
        })
    return found


def main():
    abilities = extract_de()
    by_id = {a["id"]: a for a in abilities}
    for book in BOOKS:
        if not book[5] or book[0] == "DE":
            continue
        for a in extract_supplement(book[0]):
            if a["id"] in by_id:
                ex = by_id[a["id"]]
                if ex["source"]["book"] != a["source"]["book"]:
                    ex.setdefault("alsoIn", [])
                    if a["source"]["book"] not in [x["book"] for x in ex["alsoIn"]]:
                        ex["alsoIn"].append(a["source"])
                continue
            by_id[a["id"]] = a
            abilities.append(a)
    print("abilities:", len(abilities))
    write_json("abilities.json", abilities)


if __name__ == "__main__":
    main()
