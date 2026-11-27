# Roadmap

What is left to do, in order. Work the first open batch under **Now**.

## How to work this list

- **A batch is one session and one pull request.** It groups items that touch the same pages and files, or small items that together fill a session, so the checks at the end (`CLAUDE.md`, "Check work in this order") run once for all of them. Do its items in the order given. If a batch turns out twice the size expected, finish the first part and write the rest here as the next batch.
- **Mechanical** items have the fix written down, with file and line: follow it, test it against the book's example, and do not redesign. **Judgment** items need decisions about what a player sees: plan first and ask the owner where the choice is theirs, as `CLAUDE.md` says.
- **Fix the kind of fault, not only the case.** The same kinds keep turning up. A card that opens on a disabled button: audit 2's C5, then audit 3's B4. A card drawn in two places: audit 2's C4, then audit 3's B5 and more found in 5.5. Unlog leaving something behind: audit 3's B1, then 5.10 and 5.12. A big file growing: audit 3's C1, then 5.16. Each was fixed case by case, or guarded by a check that missed a road: the Warping guard matched source text and A1 got past it, the sweep never opened the Faith page, and the big-files test let a listed file grow. So when an item is one case of a kind, find every case, and add a check that tests the behavior on every road: a type the compiler enforces, a test, or a QA script that visits every page.
- **When a batch is done,** its pull request takes it out of Now and adds one line to Done. The detail stays in the pull request, whose title starts with the batch's name. A decision of the owner's goes into `owner.md`, under Decided, so it is not lost with the detail.
- **A finding the batch does not fix** goes under Found, with file and line. The lead session puts it into a batch.
- **Standing rules, not items:**
  - When the weekly check opens an issue (**The books have changed upstream**), the next batch takes it in. `tools/books/README.md` has the procedure.
  - A file on the list of big files in `src/quality.test.ts` is split before it grows. The test fails if it grows, so each batch below names the big files it will add to.
  - An audit is due after every five or six systems from the books, or when the owner asks. `audits/README.md` says how. Its findings become batches here.

## Now

Nothing is open. The lead session puts the Found list into the next batch.

## Found

Findings not yet in a batch.

- **23 of the owner's saga's 102 magi have no Artes Liberales, so they read no book** (#89's review, F3). Since Batch D item 1, a book needs Artes Liberales to be read (DE lines 16191 and 2521), on every road, so 29 characters in `QA_LIVING=all QA_OPTIONAL=all npm run qa:saga` (Eule, Indulius, Balastor, Beechleaf and others) can study nothing in their libraries, and the living Tribunal's magi stop reading. A magus's apprenticeship gives Latin 4 and Artes Liberales 1 (DE line 2521): have Quick build and the stat-block reader (`src/engine/living*.ts`) give them, or check the stat blocks.
- **Quick build still leaves part of a Virtue's pool unspent** (#89's review, F4). Batch D item 4 spends something from every pool, but across 33 roles and 5 seeds 78 pools keep 5 xp or more (a Redcap Apprenticeship at 278 of 300, Physician of Salerno 25 of 50, Educated 35 of 50, a faerie wizard's Later Life 624 of 675). `src/engine/guided/buildExperience.ts`: spend the remainders, and test every role for less than 5 left.
- **An Ability of a kind is matched three ways** (#89's review, F6). `derive.ts` (`ofKind`) ignores case; `longterm.ts` line 141 (an Ability begun that season) does not, so Affinity with Craft: woodcarver misses a Craft: Woodcarver begun from a book; `validate.ts` line 286 looks up `craft-type:Runes` whole and skips the "cannot learn" check. Nothing warns when the kind typed names no Ability. One helper for all three.
- **The one list of hedge traditions' Virtues covers four traditions** (#89's review, F7). `HEDGE_TRADITION_OWN` (`src/data/hedgeTraditionVirtues.ts`) holds the folk witches', gruagachan's, learned magicians' and vitkir's; the Elementalists' and Nightwalkers' are still in `restrictions.ts` and `traditionRules.ts` apart, and `UNBUILT_OWN`'s `vulnerable-to-form-flaw` is unknown to the rules check.
- **Unlog of one student takes back the whole lesson, and checks the character's own later seasons against no one** (#89's review, F8). A clock lesson to several students shares one `link`, so unlogging one student takes back the teacher and every other student (as owner.md's decision reads, but nobody is told who besides). `Unlog.tsx` passes the other characters, not the character itself, as the troupe for the linked entries.
- **"Not offered" lists every book for one with no Artes Liberales** (#89's review, F9). Plan a season and each row of the Seasons planner's standing activities name the whole library (15 books at Testhold). Say it once: "Cannot read any book: needs Artes Liberales 1".
- **The living covenants' people work no hedge, holy, devotion or mason seasons** (Batch E item 2, not built in #89). Decided by the owner (`owner.md`, Decided): they work their tradition's seasons, told in the Tribunal's news. #89 found that in the owner's saga (`QA_LIVING=all QA_OPTIONAL=all npm run qa:saga`) every living person is a Hermetic magus: the "five faerie wizards, three hedge wizards and holy magus" are Merinita and ex-Miscellanea magi. None draws the hedge, holy or mason season card (`seasonCards`), and the 11 who draw devotion have only the Ars Notoria search. The work of those seasons is done in the cards' callbacks (`FolkWitchPart`, `GruagachPart`, `VitkirPart`, `HedgePart`, `ElementalPart`, `HolyWorksCard`, `DevotionSeasonsCard`, `MasonSeasonCard`), not in the engine, so the clock cannot call it. The plan: move each card's season into an engine function that the card and the clock share (as `livingReactions.ts` does for the Witch Moon, Nátt-thel and Calling), starting with the devotion search, the only one the owner's saga reaches. It is a batch of its own.

## Next: what the other books add

In the owner's order. Before each, apply principle 11: build what a troupe will use, and point at the rest. The cuts suggested here are the owner's to overrule. **S** is part of a session, so it goes into a batch with others; **M** is a session; **L** is several, and the session that starts one first writes its split here.

Already built: *Hedge Magic*, *Realms of Power: Faerie*, *The Mysteries*, *The Church*, *Hermetic Projects*.

1. ***Lords of Men*.** *Judgment.* L. Build mass combat (battles, battlefield events, sieges) as one Game Table page; mounted combat as modifiers on the Combat page; a manor as a covenant income source, with its peasants, court and tithes (LoM line 3060 on); a lord's retinue, offices and wardship (LoM line 576). Point at hawking, tournaments and law.
2. ***Apprentices*.** *Judgment.* M. Gifted children: child characters in the builder (apprentices in play are built already), Turbulence as a roll, the stages of maturing, Cantations as a spell list, the schools.
3. ***Ancient Magic*.** *Judgment.* L. Each lost tradition as a Breakthrough to research, with its book's Insight sources (original research is built); Defixio and Hyperborean hymns as magic to use. Point at the rest until a saga wants it.
4. ***Realms of Power: The Infernal*.** *Judgment.* L. Copy the shape of the Faith page. The Maleficia (RoP_I line 5032), the three Goetic Arts not yet built (line 5807), infernal characters, Infernal Warping and its causes (line 566), possession and exorcism (Church line 1568, RoP_D line 4011).
5. ***The Cradle & the Crescent*** (wip, but placed here in the owner's order). *Judgment.* L. Sahir summoning and binding of jinn; jinn as characters.
6. ***Rival Magic*.** *Judgment.* L or more, one tradition a batch, starting with the one the owner's saga would meet.
7. ***Art & Academe*.** *Judgment.* M. Medicine beyond disease, on the Recovery cards; university study as season activities, and a university's examinations (AA lines 3912 to 4008); experimental philosophy, its ligatures and formulae (AA line 2725 on); Mythic Alchemy (audit 2 left it for this book); mundane astrology; works of art.
8. ***Antagonists* and *Magi of Hermes*** (wip). *Mechanical.* L. About ten opponents and a dozen magi as characters, read by the stat-block reader that built the Rhine magi (`src/engine/character/statBlock.ts`).
9. **Living covenants for Normandy** (*The Lion and the Lily*). *Judgment.* L. Copy the Rhine: `src/data/livingCovenants/`.
10. **Living covenants for Thebes** (*The Sundered Eagle*). L.
11. **Living covenants for Transylvania** (*Against the Dark*). L.
12. **Other Tribunals** (*Lands of the Nile*, *Faith & Flame*, *The Contested Isle*, *Between Sand & Sea*). L each, and only those the owner asks for. The Tribunals covered only by Third or Fourth Edition books are not built.
13. ***Through the Aegis* and *The Living Covenant*** (wip). *Mechanical.* L. Seven covenants to import whole, and about fifteen named covenfolk.
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
- **Books in `wip/`** are optional. Their text is rougher, so anything taken from them needs more checking. Do them last, and only the ready-made characters and covenants.

## Done

One line each, newest first. The pull request has the detail.

**Batches D and E** (audit 3 and the Found list, #89):
- A book is read only by one who can read its language, on every road; Read matches a book by its Ability and can begin one; Unlog takes back a lesson's or a lab helper's linked season; Quick build spends every Virtue's pool; the second divination Mystery is Minor; a Virtue on Craft names the kind; Plain keeps the holy pair; a dead link in a book says so; a long tutorial scroll jumps on a phone; one list of the hedge traditions' Virtues; a living person's Witch Moon, Nátt-thel and Calling are rolled as the season ends; a year in Twilight is not aged. Item E2 is in Found.

**Between batches:**
- The reader opens what the books' own links and a search point at: a heading in a sidebar, and in a table its row, not the whole table; a link the book got wrong (ten in the Definitive Edition, listed in `src/ui/bookText.test.ts`) stays put rather than opening the front matter. Step 5's checks are one command (`npm run qa:final`), Vitest no longer fills the disk, and `CLAUDE.md` has Batch C's lessons (#87).

**Audit 3** (`audits/2026-11-18.md`):
- Quick build makes folk witches, gruagachan, learned magicians and vitkir, Gifted and unGifted as the book allows, faerie wizards and Mystery initiates, each passing the rules check; a tradition's own Virtues are drawn only for its members; the tutorials' practice characters are made the ordinary way, with nothing given for practice (5.7, B7, Batch C, #86).
- A botched study from vis teaches nothing; a book begins an Ability; a season that would draw no vis is not offered; the holy first on the Faith page; great projects’ rolls at Game Table › Dice; the card check reaches the last seasons and presses an Initiation and After a story (5.13, 5.11, 5.14, 5.17, 5.8, Batch B, #84).
- Living covenants' magi roll Twilight; a roll already made stands, and Unlog says so; holy work is unlogged whole; and two tests log and unlog every kind of season, by the clock and by pressing each card's buttons (5.9, 5.10, 5.12, Batch A, #83).
- A character's season in full opens on their own work and draws only the cards that apply to them, with a folded line for the rest; `AdvancementTab.tsx` split into a file a card (5.4, #82).
- Nothing on a page is wider than a phone, and the sweep visits every tab, every part of Dice and the practice sagas (5.15, #80).
- The Faith page split into a file a card; 32 more Game Mechanics topics point into the app (5.6, #79).
- Sympathy Traits are kept on the sheet only, and the troupe's list of changes names every field of a character, held there by a typecheck (5.5, #75).
- The Chronicle tells each kind of season's work in words of its own (5.3, #74).
- Only a magus is offered the Arts, and every season and power card opens on something the character can do, checked by `scripts/qa/firstChoice.cjs` (5.2, #72).
- What follows Warping from a season's work waits in Resolve, and Unlog takes it back with the points (5.1, #70).

**Audit 2** (`audits/2026-11-16.md`):
- Tutorials for hedge magic, Faerie and the Mysteries (1.7b, #66); every tutorial step 60 words or fewer, a file a tutorial (1.7, #65).
- The README cut to a page (1.6, #64; the last long one, which says how the systems connect, is `git show 079464b:app/README.md`); the Guide's toolkit page written as steps, its text in data (1.5, #62).
- Great buildings and the menagerie kept on the covenant; a mason's season on Seasons (1.4c, #61).
- What follows Warping waits in Resolve; Sympathy Traits on the Roll page (1.4b, #60).
- The Faith page shows only what applies; the seasons of devotion on Seasons (1.4, #59).
- Hedge magic's and holy work's seasons on Seasons, their vis from the stores (1.3, #58).
- Small fixes to how cards behave (1.2, #55), and the rules fixes (1.1, #54).

**The books:** item effects moved out of the spell catalog (2.3, #57); the books in step with upstream of 16 November 2026, with shelves for earlier editions and third-party books (2.1, #56).

**Before these:** the foundations of this list (`CLAUDE.md`, the design principles, `quality.test.ts`, the QA tools and practice sagas, the book tools, the weekly upstream check); the Guide's pages **Playing the game** and **Running the game**; audit 3, `owner.md` and the integration checklist. Earlier work is in the merged pull requests.
