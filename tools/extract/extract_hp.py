"""Hermetic Projects: spells and enchantments.

The book puts a spell's description between its Arts line and its R/D/T line, and an
enchantment's "Pen:" line before R/D/T, so the general supplement pass finds almost none.
This pass reads each "#### Name" block: the Arts line, then R/D/T, Pen and the design
anywhere in the block. Spells join the spell catalog; enchantments go to enchantments.json.
"""
import re
from books import read_book
from common import clean_inline, strip_quote, github_anchor, slug
from extract_spells import parse_arts_line, RDT_RE, norm, RANGE_NORM, DUR_NORM, TGT_NORM, ARTS_LINE

BOOK = "HP"
ITEM_ARTS = re.compile(r"^\*\*(?P<arts>(Cr|In|Mu|Pe|Re)(An|Aq|Au|Co|He|Ig|Im|Me|Te|Vi)(\([A-Za-z, ]+\))*)\*\*\s*(?P<level>\d+|Gen(eral)?)\s*$")
USES = [(r"unlimited", "unlimited"), (r"\b50\b", "50"), (r"\b24\b", "24"), (r"\b12\b", "12"), (r"\bsix\b|\b6\b", "6"),
        (r"\bthree\b|\b3\b", "3"), (r"\btwo\b|\b2\b", "2"), (r"\bonce\b|\bone\b|\b1\b", "1")]


def arts_of(s):
    a = parse_arts_line(s)
    if a:
        return a
    m = ITEM_ARTS.match(s.strip())
    if not m:
        return None
    reqs = re.findall(r"\(([A-Za-z, ]+)\)", m.group("arts"))
    reqs = [r.strip() for g in reqs for r in g.split(",") if r.strip()]
    lvl = m.group("level")
    return {"technique": m.group("arts")[:2], "form": m.group("arts")[2:4], "requisites": reqs,
            "level": None if lvl.lower().startswith("gen") else int(lvl), "general": lvl.lower().startswith("gen")}


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
    return "\n\n".join(out)


ARTS_START = re.compile(r"^\*\*(?P<arts>(Cr|In|Mu|Pe|Re)(An|Aq|Au|Co|He|Ig|Im|Me|Te|Vi)(\s*\([A-Za-z, ]+\))*)\*\*\s*(?P<level>\d+|Gen(eral)?)\b\s*(?P<rest>.*)$")
NAME_LINE = re.compile(r"^(#{2,5}\s+(?P<h>.+)|\*\*(?P<b>[^*]+?)\*\*\s*(<br\s*/?>)?)\s*$")


def name_before(lines, i):
    """The heading or bold name just above an Arts line (at most two lines up, ignoring blanks)."""
    j, seen = i - 1, 0
    while j >= 0 and seen < 2:
        t = lines[j].strip()
        if t:
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
    starts = [i for i, l in enumerate(lines) if ARTS_START.match(l.strip())]
    spells, items = [], []
    for si, i in enumerate(starts):
        m = ARTS_START.match(lines[i].strip())
        name = name_before(lines, i)
        if not name:
            continue
        a = m.group("arts")
        reqs = [r.strip() for g in re.findall(r"\(([A-Za-z, ]+)\)", a) for r in g.split(",") if r.strip()]
        lvl = m.group("level")
        arts = {"technique": a[:2], "form": a[2:4], "requisites": reqs, "level": None if lvl.lower().startswith("gen") else int(lvl), "general": lvl.lower().startswith("gen")}
        stop = starts[si + 1] if si + 1 < len(starts) else n
        block = [m.group("rest")] if m.group("rest").strip() else []
        k = i + 1
        while k < stop:
            if re.match(r"^#{1,5}\s", lines[k]):
                # the book's running page header is not a new section
                if not re.match(r"^#{1,5}\s+(Hermetic Projects|Chapter \w+)\s*$", lines[k], re.I):
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
            pm = re.search(r"\bPen\s*:\s*(.*?)(?=\bR\s*:|$)", s)
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
    return spells, items


if __name__ == "__main__":
    s, it = extract()
    print(len(s), "spells", len(it), "enchantments")
    for x in s[:5] + it[:5]:
        print(x["name"], x["technique"] + x["form"], x["level"], x["range"], x["duration"], x["target"], "|", (x.get("itemNotes") or ""), "|", (x["design"] or "")[:60])
