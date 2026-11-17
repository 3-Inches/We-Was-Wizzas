"""Hermetic Projects: spells and enchantments.

The book sets both out the same way, and tells a device from a spell only by its "Pen:" line:

    ##### Cutting the Waves
    ReAq 19<br>
    Pen: +0, Constant Effect<br>
    R: Touch, D: Sun, T: Individual<br>
    description...
    (Base 4, +1 Touch, +2 Sun; +1 for 2/day, +3 triggered at sunrise/set)
    Required Lab Total: 1 season (38), ...

The general supplement pass would read every device as a spell, so this pass reads the whole
book instead. It takes each name (a heading or a bold line) that stands over an Arts line, then
finds R/D/T, Pen and the design anywhere in the block. Spells join the spell catalog;
enchantments go to enchantments.json. It also reads the older layout (bold Arts, "Pen:" and
R/D/T on one line), which the book had before upstream reviewed it.
"""
import re
from books import read_book
from common import clean_inline, strip_quote, github_anchor, slug
from extract_spells import RDT_RE, norm, RANGE_NORM, DUR_NORM, TGT_NORM

BOOK = "HP"
USES = [(r"unlimited", "unlimited"), (r"\b50\b", "50"), (r"\b24\b", "24"), (r"\b12\b", "12"), (r"\bsix\b|\b6\b", "6"),
        (r"\bthree\b|\b3\b", "3"), (r"\btwo\b|\b2\b", "2"), (r"\bonce\b|\bone\b|\b1\b", "1")]


def text_of(lines):
    out, para = [], []
    for l in lines:
        s = re.sub(r"<br\s*/?>", "", strip_quote(l)).strip()
        if not s:
            if para:
                out.append(" ".join(para))
                para = []
            continue
        s = re.sub(r"\*\*(.*?)\*\*", r"\1", s)
        s = re.sub(r"(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)", r"\1", s)
        para.append(s)
    if para:
        out.append(" ".join(para))
    # a table keeps its rows, as in the general pass
    return re.sub(r"\| (?=\|)", "|\n", "\n\n".join(out))


# "ReAq 19", "**CrTe** 55", and with requisites after either Art: "Mu(Re)Co(Ig)(Te) 70"
ARTS_START = re.compile(r"^(\*\*)?(?P<arts>(?P<t>Cr|In|Mu|Pe|Re)(\([A-Za-z, ]+\))*(?P<f>An|Aq|Au|Co|He|Ig|Im|Me|Te|Vi)(\s*\([A-Za-z, ]+\))*)(\*\*)?\s*(?P<level>\d+|Gen(eral)?)\b\s*(?P<rest>.*)$")
NAME_LINE = re.compile(r"^(#{2,6}\s+(?P<h>.+)|\*\*(?P<b>[^*]+?)\*\*\s*(<br\s*/?>)?)\s*$")
PAGE_MARK = re.compile(r"^<!--.*-->$")


def bare(line):
    """A line without its quote mark and its closing line break."""
    return re.sub(r"\s*<br\s*/?>\s*$", "", strip_quote(line).strip())


def name_before(lines, i):
    """The heading or bold name just above an Arts line (at most two lines up, ignoring blanks)."""
    j, seen = i - 1, 0
    while j >= 0 and seen < 2:
        t = strip_quote(lines[j]).strip()
        if t and not PAGE_MARK.match(t):
            seen += 1
            m = NAME_LINE.match(t)
            if m:
                nm = clean_inline(m.group("h") or m.group("b")).strip().rstrip(".")
                if nm and len(nm) <= 80 and not ARTS_START.match(t):
                    return nm
            return None
        j -= 1
    return None


def extract():
    lines = read_book(BOOK).split("\n")
    n = len(lines)
    starts = [i for i, l in enumerate(lines) if ARTS_START.match(bare(l))]
    spells, items = [], []
    for si, i in enumerate(starts):
        m = ARTS_START.match(bare(lines[i]))
        name = name_before(lines, i)
        if not name:
            continue
        a = m.group("arts")
        reqs = [r.strip() for g in re.findall(r"\(([A-Za-z, ]+)\)", a) for r in g.split(",") if r.strip()]
        lvl = m.group("level")
        arts = {"technique": m.group("t"), "form": m.group("f"), "requisites": reqs, "level": None if lvl.lower().startswith("gen") else int(lvl), "general": lvl.lower().startswith("gen")}
        stop = starts[si + 1] if si + 1 < len(starts) else n
        block = [m.group("rest")] if m.group("rest").strip() else []
        k = i + 1
        boxed = lines[i].lstrip().startswith(">")
        while k < stop:
            if PAGE_MARK.match(strip_quote(lines[k]).strip()):
                k += 1
                continue
            if boxed and lines[k].strip() and not lines[k].lstrip().startswith(">"):
                break  # the box this entry is printed in has closed
            if re.match(r"^#{1,6}\s", strip_quote(lines[k])):
                # the book's running page header is not a new section
                if not re.match(r"^#{1,6}\s+(Hermetic Projects|Chapter \w+)\s*$", strip_quote(lines[k]), re.I):
                    break
            else:
                block.append(lines[k])
            k += 1
        # the next entry's bold name is not part of this one
        while block and NAME_LINE.match(block[-1].strip() or "x") is None and not block[-1].strip():
            block.pop()
        if block and NAME_LINE.match(block[-1].strip()) and k == stop:
            block.pop()
        rdt, pen, design, desc = None, None, None, []
        for l in block:
            s = clean_inline(l).strip()
            # Pen and R/D/T can share a line, in either order, with text after
            pm = re.search(r"\bPen\s*:\s*(.*?)(?=\bR\s*:|$)", s) or re.match(r"^(\+?\d+) Pen\b,?\s*(.*)$", s)
            if pm and pen is None and pm.re.pattern.startswith("^"):
                # "0 Pen, constant effect": the book's other way of writing the same line
                pen = f"{pm.group(1)}, {pm.group(2)}".strip().rstrip(".,")
                continue
            if pm and pen is None:
                pen = pm.group(1).strip().rstrip(".,")
                s = (s[: pm.start()] + s[pm.end():]).strip()
            rm = re.search(r"\bR\s*:.*$", s)
            if rdt is None and rm and RDT_RE.match(rm.group(0)):
                rdt = RDT_RE.match(rm.group(0))
                tail = (rdt.group("tail") or "").strip()
                before = s[: rm.start()].strip()
                if before:
                    desc.append(before)
                if tail:
                    desc.append(tail)
                continue
            if not s:
                desc.append("")
                continue
            s = re.sub(r"^\(Effect:\s*(?=[Bb]ase\b)", "(", s)  # "(Effect: Base 1, +1 Touch, ...)"
            if re.match(r"^\((Base|base)\b", s) and design is None:
                # the design may hold parentheses of its own: take it to its matching close
                depth, end = 0, len(s)
                for ci, ch in enumerate(s):
                    depth += ch == "("
                    depth -= ch == ")"
                    if depth == 0:
                        end = ci
                        break
                design = s[1:end].strip()
                if s[end + 1:].strip():
                    desc.append(s[end + 1:].strip())
                continue
            if re.match(r"^Required Lab Total", s, re.I) or re.match(r"^Seasons? \(\d+\)", s):
                continue
            desc.append(l)
        if not rdt:
            continue
        rec = {
            "name": name, "technique": arts["technique"], "form": arts["form"], "requisites": sorted(set(arts["requisites"])),
            "level": arts["level"], "general": arts["general"],
            "range": norm(rdt.group("r"), RANGE_NORM), "duration": norm(rdt.group("d"), DUR_NORM), "target": norm(rdt.group("t"), TGT_NORM),
            "ritual": bool(rdt.group("rit")), "text": text_of(desc), "design": design,
            "source": {"book": BOOK, "line": i + 1, "anchor": github_anchor(name)},
        }
        if pen is not None:
            p = re.match(r"^[+]?(\d+)", pen)
            if re.search(r"constant", pen, re.I):
                uses = "constant"
            else:
                um = re.search(r"(\d+)\s*(/day|uses?|times)", pen) or re.search(r",\s*(\d+)\s*$", pen)
                uses = "unlimited" if re.search(r"unlimited", pen, re.I) else (um.group(1) if um else next((v for pat, v in USES if re.search(pat, pen, re.I)), None))
            rec.update({"id": slug(f"{name}-{rec['technique']}{rec['form']}-item"), "penetration": int(p.group(1)) if p else 0, "uses": uses, "itemNotes": pen})
            items.append(rec)
        else:
            bm = re.match(r"^Base\s+(\d+)", design or "")
            rec.update({"id": slug(f"{name}-{rec['technique']}{rec['form']}-{rec['level'] if rec['level'] is not None else 'gen'}"), "base": int(bm.group(1)) if bm else None})
            spells.append(rec)
    # the book gives two devices the same name in two chapters: the later one's id says so
    ids = set()
    for rec in items:
        base, k = rec["id"], 2
        while rec["id"] in ids:
            rec["id"] = f"{base}-{k}"
            k += 1
        ids.add(rec["id"])
    return spells, items


if __name__ == "__main__":
    s, it = extract()
    print(len(s), "spells", len(it), "enchantments")
    for x in s[:5] + it[:5]:
        print(x["name"], x["technique"] + x["form"], x["level"], x["range"], x["duration"], x["target"], "|", (x.get("itemNotes") or ""), "|", (x["design"] or "")[:60])
