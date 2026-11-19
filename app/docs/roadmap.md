# Roadmap

What is left to do, in order. Work the first open batch under **Now**.

## How to work this list

- **A batch is one session and one pull request.** It groups items that touch the same pages and files, so the checks at the end (`CLAUDE.md`, "Check work in this order") run once for all of them. Do its items in the order given. If a batch turns out twice the size expected, finish the first part and write the rest here as the next batch.
- **Mechanical** items have the fix written down, with file and line: follow it, test it against the book's example, and do not redesign. **Judgment** items need decisions about what a player sees: plan first and ask the owner where the choice is theirs, as `CLAUDE.md` says.
- **Fix the kind of fault, not only the case.** Audit 3 found kinds of fault that audit 2 had found already: a card that opens on a disabled button, a card in two places, Unlog leaving something behind, a big file growing. They came back where only a checklist line guarded them. They have not come back where a check fails on them: a type the compiler enforces, a test, a QA script. So when an item is one case of a kind, find every case, and add the check.
- **When a batch is done,** its pull request takes it out of Now and adds one line to Done. The detail stays in the pull request, whose title starts with the batch's name.
- **A finding the batch does not fix** goes under Found, with file and line. The lead session puts it into a batch.
- **Standing rules, not items:**
  - When the weekly check opens an issue (**The books have changed upstream**), the next batch takes it in. `tools/books/README.md` has the procedure.
  - A file on the list of big files in `src/quality.test.ts` is split before it grows. The test fails if it grows.
  - An audit is due after every five or six systems from the books, or when the owner asks. `audits/README.md` says how. Its findings become batches here.

## Now: close audit 3

Audit 3 (`audits/2026-11-18.md`) checked stages 1 and 2 of the old roadmap, and how they were done. Its findings, and what was found while fixing them, are below; the numbers in brackets are their old numbers, which the audit and earlier pull requests use. Most are at the joins between systems, so go down the integration checklist for each. When these are done, mark audit 3 closed.

### In progress: a season in full, ordered by the character (5.4)

*Mechanical*: the order was decided by the owner (19 November 2026). Audit B3.

- First, the character's own season work: their tradition's cards, and Lab projects for a magus.
- Then the planning: Plan a season, the standing activity and priorities, offering only what applies to them.
- Then the season log and aging.
- Last, the Mysteries and writing, only where they apply.
- A card that cannot apply is hidden, with one line saying why, as the Faith page does.

### Batch A. Twilight, Warping and Unlog

All *Mechanical*. Start by splitting `src/engine/time.ts`, which this batch adds to.

1. **Living covenants' magi roll Twilight (5.9).** Decided by the owner (18 November 2026): they roll it as the players do. A living covenant's magus gains Warping Points from a botch studying vis and from the aura (`src/engine/time.ts`, `seasonWarping` and `auraYearEnd`), and nothing follows, since no player resolves it. But a lab accident's Warping goes through `gainWarping` whoever the magus is (`src/engine/projects.ts:622`), so a living magus can owe a Twilight nobody rolls. Fix: one rule for all three. Roll Twilight avoidance for a living magus when the season ends (DE line 9755), and tell the Twilight in the Tribunal's news (owner point 5).
2. **A roll already made stands (5.10).** Decided by the owner (18 November 2026). Unlogging the season of a woven curse or a ring's first recitation drops the roll while it waits in Resolve (`seasonEndRolls`), as now. Once it is rolled, Unlog leaves what it did, and the Unlog button says so. Turn back undoes everything. What stays: a botched curse's Warping and the Witch Moon it brings (`rollWovenCurse`, `src/engine/folkWitch.ts:198`), and a ring learned.
3. **Holy work and Unlog (5.12).** A season of holy work (`src/ui/pages/holy/HolyWorksCard.tsx`, `work`) is logged with no `undo`. Unlog takes back its experience, but not the work's progress and seasons, the long-term Fatigue a Merkavah season costs, or a finished amulet or golem power, which should make the season final. Fix: log it through `useSeasonWork`, with the work as it was in `undo`, and `final` when the work is done.
4. **The check, so Unlog's kind of fault cannot come back.** Season entries are made in about sixteen files (`grep -rl newSeasonEntry src`). Make each one record what Unlog needs, and add a guard like the one for Warping Points in `src/quality.test.ts`: only listed places may log a season, and a test shows each records its `undo`.

### Batch B. Plan a season, and the Game Table's pickers

All *Mechanical*. Start by splitting `src/ui/character/sheet/AdvancementTab.tsx`, which items 1 and 2 add to.

1. **A botched study from vis teaches nothing (5.13).** Decided by the owner (19 November 2026), and settled by the book: "On a botch, your total for the roll is never any higher than zero", and the modifiers are negated with it (DE, Stress Rolls, line 570). So a botched study's Source Quality is 0: no experience, and the vis is spent. A planned season already gives none (`src/engine/time.ts`, the `vis` standing activity). Plan a season's roll sets the die to 0 and still counts the aura (`AdvancementTab.tsx`, the stress-die button, then `computeStudy`), while its badge says "no xp". Make it agree, and test both on the book's line.
2. **A new Ability from a book (5.11).** Plan a season's "From the covenant library" (`AdvancementTab.tsx`, the library filter and `pickBook`) lists a book on an Ability only to one who has the Ability, and `pickBook` cannot set an Ability the character lacks as the subject. So a companion cannot begin Latin from the covenant's summa. Fix: list the books on Abilities this character could learn (Supernatural ones need their Virtue first: check the book), and let picking one begin the Ability at 0, as Worship begins Church Lore (`new:church-lore`). Test: a companion reads a Latin summa and gains the Ability.
3. **A season that draws no vis (5.14).** On the gruagach fixture, "draw vis from the aura" was offered and spent a season for 0 pawns (Lab Total under 10; `gruagachExtraction`, `src/ui/pages/GruagachPart.tsx`). The card should say it draws none, and not offer the season. Check the kitchen's and Refining's draws the same way.
4. **The holy first, on the Faith page (5.17).** Dice › Faith & miracles lists everyone in "Who prays", as it should, but `HolyDicePart` (`src/ui/pages/DicePage.tsx`, about line 593) says "the holy first" and mixes them in with the rest. Put the holy (holy powers, True Faith or Faith Points) in a group of their own at the top of the picker. Then have `scripts/qa/sweep.cjs` read them from the picker, as it does the Faerie, Hedge magic and Mysteries people, and visit each holy character's turn.
5. **Great projects' rolls at the Game Table (5.8).** Decided by the owner (18 November 2026): rolls happen at the Game Table. The building's stress check and the menagerie's rolls move to **Game Table › Dice**, with the same choice of covenant, mason and handler. The covenant's Overview keeps the record (height, quality, damage) and links to the rolls. Move the tutorial steps and pointers that led to the old place (`src/ui/tour/tutorials/lab.ts`).

### Batch C. Quick build for the hedge traditions, faerie wizards and the Mysteries (5.7)

*Judgment.* Audit B7, the largest item. The guided build's answers for Folk Witch, Gruagach, Vitki, Mathematicus and faerie wizardry rarely make one; the practice characters get their Virtues free instead. Fix: an answer for each tradition that takes its Social Status and Virtues and fills its Abilities as its chapter says, with a test per tradition that the character passes the rules check (owner points 11 and 13). If it grows, do one tradition at a time and write the split here. Then mark audit 3 closed.

## Found

Findings not yet in a batch. None.

## Next: what the other books add

In the owner's order. Before each, apply principle 11: build what a troupe will use, and point at the rest. The cuts suggested here are the owner's to overrule. **S** is part of a session, so it goes into a batch with others; **M** is a session; **L** is several, and the session that starts one first writes its split here.

Already built: *Hedge Magic*, *Realms of Power: Faerie*, *The Mysteries*, *The Church*, *Hermetic Projects*.

1. ***Lords of Men*.** *Judgment.* L. Build mass combat (battles, battlefield events, sieges) as one Game Table page; mounted combat as modifiers on the Combat page; a manor as a covenant income source, with its peasants, court and tithes (LoM line 3060 on); a lord's retinue, offices and wardship (LoM line 576). Point at hawking, tournaments and law.
2. ***Apprentices*.** *Judgment.* M. Gifted children: child characters in the builder (apprentices in play are built already), Turbulence as a roll, the stages of maturing, Cantations as a spell list, the schools.
3. ***Ancient Magic*.** *Judgment.* L. Each lost tradition as a Breakthrough to research, with its book's Insight sources (original research is built); Defixio and Hyperborean hymns as magic to use. Point at the rest until a saga wants it.
4. ***Realms of Power: The Infernal*.** *Judgment.* L. Copy the shape of the Faith page. The Maleficia (RoP_I line 5032), the three Goetic Arts not yet built (line 5807), infernal characters, Infernal Warping and its causes (line 566), possession and exorcism (Church line 1568, RoP_D line 4011).
5. ***The Cradle & the Crescent*** (wip). *Judgment.* L. Sahir summoning and binding of jinn; jinn as characters.
6. ***Rival Magic*.** *Judgment.* L or more, one tradition a batch, starting with the one the owner's saga would meet.
7. ***Art & Academe*.** *Judgment.* M. Medicine beyond disease, on the Recovery cards; university study as season activities, and a university's examinations (AA lines 3912 to 4008); experimental philosophy, its ligatures and formulae (AA line 2725 on); Mythic Alchemy (audit 2 left it for this book); mundane astrology; works of art.
8. **Ready-made characters** (wip). *Mechanical.* M, one batch. About ten opponents from *Antagonists*, a dozen magi from *Magi of Hermes* and fifteen covenfolk from *The Living Covenant*, read by the stat-block reader that built the Rhine magi (`src/engine/character/statBlock.ts`).
9. **Living covenants for Normandy** (*The Lion and the Lily*). *Judgment.* L. Copy the Rhine: `src/data/livingCovenants/`.
10. **Living covenants for Thebes** (*The Sundered Eagle*). L.
11. **Living covenants for Transylvania** (*Against the Dark*). L.
12. **Other Tribunals** (*Lands of the Nile*, *Faith & Flame*, *The Contested Isle*, *Between Sand & Sea*). L each, and only those the owner asks for. The Tribunals covered only by Third or Fourth Edition books are not built.
13. ***Through the Aegis*** (wip). *Mechanical.* L. Seven covenants to import whole.
14. **The Tribunal books' hedge traditions.** *Judgment.* M each. Copy the shape of the Hedge magic page. The owner's Rhine first: the Order of Odin and the Exsules (GotF lines 3423 and 3458). Then *Against the Dark*'s storm wizards (AtD line 5505) and vampire hunters with the Hunters' Arts (lines 5741 and 5841); *The Sundered Eagle*'s Katadesmos, Makhai and Diabolai (SE lines 4219 to 4283); Egypt's lector priests (LotN line 2699).
15. **Small additions.** *Judgment.* S each, one batch. Mostly a pointer to the book each (principle 11); the owner decides which to build.
    - *Grogs*: training packages for wealthy and poor grogs (Grogs line 2444) and templates (lines 4311, 4821 and 5005), as choices in the builder or Quick build; animal grogs (line 5087) and beasts as characters (Cov line 3051).
    - *Legends of Hermes*: adapting another cult's Initiation Script (LoH line 2294), temporary laboratories (line 2452), the optional rule for swarms (line 2086).
    - Travel in the Magic realm, and advancement there (RoP_M lines 980 and 1145).
    - Penalties under the Code: fines, determining penalties and seasons of service (HoH_TL lines 1898, 1906 and 1939), for a case judged at Tribunal.

## What "finished" means

The toolkit is finished when all of these are true. The owner may call it finished sooner.

1. **Every system in the Fifth Edition books that a troupe would use at the table more than once in a saga is built,** checked against the book, and can be found (design principles 8, 9 and 11). Anything rarer has a pointer to the book's text.
2. **No audit has open findings** (`audits/`).
3. **The books match upstream,** and the weekly check is quiet.

Out of scope:

- **Third and Fourth Edition books, and third-party books.** They are in the reader on shelves of their own, as setting reference. No rules, characters or covenants are taken from them, even where they are the only source for a Tribunal.
- **Setting, history and story seeds.** They are read in the reader.
- **Adventures** (*Dies Irae*, *Tales of Power* and the like).
- **Books in `wip/`** are optional, and only for their systems and ready-made characters and covenants. Their text is rougher, so anything taken from them needs more checking.

## Done

One line each, newest first. The pull request has the detail.

**Audit 3** (`audits/2026-11-18.md`):
- Nothing on a page is wider than a phone, and the sweep visits every tab, every part of Dice and the practice sagas (5.15, #80).
- The Faith page split into a file a card; 32 more Game Mechanics topics point into the app (5.6, #79).
- Sympathy Traits are kept on the sheet only, and the troupe's list of changes names every field of a character, held there by a typecheck (5.5, #75).
- The Chronicle tells each kind of season's work in words of its own (5.3, #74).
- Only a magus is offered the Arts, and every season and power card opens on something the character can do, checked by `scripts/qa/firstChoice.cjs` (5.2, #72).
- What follows Warping from a season's work waits in Resolve, and Unlog takes it back with the points (5.1, #70).

**Audit 2** (`audits/2026-11-16.md`):
- Tutorials for hedge magic, Faerie and the Mysteries (1.7b, #66); every tutorial step 60 words or fewer, a file a tutorial (1.7, #65).
- The README cut to a page (1.6, #64); the Guide's toolkit page written as steps, its text in data (1.5, #62).
- Great buildings and the menagerie kept on the covenant; a mason's season on Seasons (1.4c, #61).
- What follows Warping waits in Resolve; Sympathy Traits on the Roll page (1.4b, #60).
- The Faith page shows only what applies; the seasons of devotion on Seasons (1.4, #59).
- Hedge magic's and holy work's seasons on Seasons, their vis from the stores (1.3, #58).
- Small fixes to how cards behave (1.2, #55), and the rules fixes (1.1, #54).

**The books:** item effects moved out of the spell catalog (2.3, #57); the books in step with upstream of 16 November 2026, with shelves for earlier editions and third-party books (2.1, #56).

**Before these:** the foundations of this list (`CLAUDE.md`, the design principles, `quality.test.ts`, the QA tools and practice sagas, the book tools, the weekly upstream check); the Guide's pages **Playing the game** and **Running the game**; audit 3, `owner.md` and the integration checklist. Earlier work is in the merged pull requests.
