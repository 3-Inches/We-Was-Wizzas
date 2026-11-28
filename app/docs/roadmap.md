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

## Now: two batches, built by one session

Batch D and Batch E hold what is left: what closing audit 3 found (`audits/2026-11-18.md`, closed; the numbers in parentheses, 5.1 to 5.17, are the old roadmap's, which earlier pull requests use) and the Found list. Most of it is at the joins between systems, so go down the integration checklist for each item.

By the owner's choice (2026-11-22, in `owner.md`'s Decided list: an exception to one batch a pull request), **one fresh session builds both batches, in one pull request,** so that the costs paid once a pull request (the adversarial review, `npm run qa:final`, the lead's review) are paid once. So:
- Build D, then E, in the order given.
- Commit and push after each item, with its typecheck and its test file clean, so that work done is kept if the session stops.
- Run all tests after each batch, and fix what fails before going on.
- One adversarial review of the whole diff, then one `npm run qa:final -- --fixtures` at the end.
- If the session must stop before E, open the pull request on D alone, with the checks run on it, and leave E here.

### Batch D. Books, Unlog, and building characters

All *Mechanical*: decided by the owner (`owner.md`, Decided), or settled by the book's line given.

1. **A book's language is checked on one road only.** "It is not possible to study from a book unless you are fluent (have a score of four or higher) in the language in which it is written, and can read and write the writing system used" (DE line 16191). Plan a season warns of it (`readProblems`, `src/engine/books.ts`), but the standing activity Read (`src/engine/time.ts`, `case 'read'`) and the priorities' choice of a book (`src/engine/priorities.ts`, `bestStudy`) read any book in the library. *Mechanical*: have both pass over a book the reader cannot read, and say why. Plan a season, too, no longer offers such a book: the owner chose blocking over its warning.
2. **The standing activity Read matches a book by its Ability alone.** `src/ui/character/StandingEditor.tsx` lines 61 and 62 list a book on any Ability the character has, whatever its name (a Greek summa for one who has only Latin), and then find no target for it, so the clock says the book is not in the library. Nor can Read begin an Ability, as Plan a season now does. *Mechanical*: share Plan a season's matching (`onBook` and `bookOnAbility` in `PlanSeasonCard.tsx`) through an engine function, and use it in both. Old saves' covenant rolls and generated summae carry no Ability name (`param`); a book on a Profession or a Lore without one matches only a character's single such Ability.
3. **Unlogging a student's season leaves the teacher's.** A lesson from a covenant-mate (`PlanSeasonCard.tsx`, the teacher's entry) and a lab helper's season (`LabProjects.tsx`, the helpers' entries) are logged on each character, and each is unlogged on its own row. Decided by the owner (`owner.md`, Decided): Unlog takes back both, and says whose.
4. **Quick build leaves a Virtue's experience pool unspent.** A scholar (seed 1) keeps Educated (Bardic), Educated (Vernacular) and Physician of Salerno at 0 of 50 each; a cunning folk (seed 3) keeps four such pools at 0. A Lone Redcap (cunning folk, seeds 2, 7, 13, 16 and 30; a faerie wizard, seed 20) keeps the Redcap Apprenticeship at 0 of 300. The rules check says nothing, and the same seeds do the same before Batch C. Found in Batch C. The pools are spent in `src/engine/guided/buildExperience.ts` from line 309 ("every other pool"): find why these pools take nothing, spend them, and add a test that no Quick build character leaves a Virtue's pool empty.
5. **The second method of Hermetic divination is a Minor Virtue, and the rules check knows only the Major.** "If she has the Virtue Divination, she may Initiate into Dream Interpretation as an additional method as a Minor Virtue, and vice versa" (TMRE line 2493). Both are Major only in the data, and `src/engine/character/validate.ts` line 281 warns of any other size. So the Mysteries tutorial's practice magus, who holds both, pays 6 points where the book asks 4. Found in Batch C's review. Allow Minor for the second of the pair, in the rules check and in `addMystery` (`src/engine/guided/buildMysteries.ts`).
6. **A Virtue on an Ability of a kind can name only the kind.** Puissant, Affinity and the like on Craft name "Craft", not "Craft: Runes", because the sheet's choice lists Abilities only (`src/ui/character/ParamInput.tsx` line 23). The bonus then goes to every Craft the character has, though `derive.ts` lines 506 and 508 already match `craft-type:Runes`. Quick build's vitki takes "Puissant Craft: Runes" from the master this way (`src/engine/guided/traditions.ts` line 64). Found in Batch C's review. Let the choice take the kind's name as well (Craft, Profession, Area Lore and the like), and show it on the sheet.
7. **Plain with the holy wonder-worker picked by hand makes no holy worker.** A plain build declines *Realms of Power: The Divine*'s Methods and Powers (`src/engine/generate/character.ts` line 240), though the Plain choice says what a role requires still comes with it. Batch C keeps a hand-picked tradition or Mystery role's Virtues in the same place. Found in Batch C. Keep the holy pair the same way (`HOLY_VIRTUES`, `src/engine/guided/buildVirtues.ts` line 132).
8. **A dead link in a book does nothing on a phone.** `BookReader.tsx`'s `onBodyClick` only sets the link's `title`, which a tap never shows. Say it in the page instead.
9. **On a phone, the Mysteries tutorial's "Initiation, a season's work" step shows its card late.** For the practice magus Tullia (`scripts/qa/fixtures/tmre.saga.json`), the Mysteries & Initiation card comes into view about 3.4 s after Next, not 1.4 s. The season page draws the card about a second in, and the smooth scroll to it, some 5,500 px, is still under way. Urbanus and the 1280 run are in time. `scripts/qa/tutorials.cjs --fixtures` reports it as "in view only after 3.4 s". Found between batches. Find what makes the season page slow to draw for her, or scroll without smoothing over a long way (`showAbovePanel`, `src/ui/tour/TourPanel.tsx`).

### Batch E. The living covenants by their tradition

All *Mechanical*, decided by the owner (`owner.md`, Decided): the living covenants' people play by their tradition's rules (owner point 5). Item 1 comes first: items 2 and 3 read the one list it makes.

1. **Two lists say which Virtues belong to a hedge tradition.** `src/data/restrictions.ts` (`TRADITIONS`, for the rules check, fourteen traditions) and `src/engine/guided/traditionRules.ts` (for Quick build, five) were written apart and differ: the rules check does not know the vitkir's Nameless Runes and Secret Runes (Hedge Magic line 6183), and it restricted Fetch to the gruagachan though "other characters may also have access to a fetch" (line 2879; Fetch fixed in Batch C's review). Found in Batch C's review. Make one list, and have the other read it.
2. **The living covenants' people work no hedge, holy, devotion or mason seasons.** No engine path runs that work for them (found during 5.3), so the owner's Tribunal's five faerie wizards, three hedge wizards and holy magus spend their seasons as other characters do. Owner point 5 asks that they play by the players' rules. Decided by the owner (`owner.md`, Decided): they work their tradition's seasons, told in the Tribunal's news.
3. **A living covenant's hedge people suffer nothing from Warping.** Batch A has the toolkit roll a living magus's Twilight when the season ends (`src/engine/livingTwilight.ts`), but for a living folk witch, vitki or one with Sympathy Traits `gainWarping` owes nothing (`living` in `src/engine/warping.ts`, `addWarping`), so the Witch Moon, Nátt-thel and Faerie Calling never come. Decided by the owner (`owner.md`, Decided): roll them as Twilight is rolled, and tell each in the Tribunal's news.
4. **A living magus's Twilight is not everything the book's is.** `livingTwilight` applies the knowledge gained or lost (in the magus's best Art), the simple die of Warping, a scar, and the seasons lost (logged "In Wizard's Twilight"); a Virtue, Flaw or spell from it is left to the storyguide (README, "Not yet automated"), and the magus still ages while away, though "immune to … aging" in Twilight (DE line 9806). *Mechanical* for the aging: skip `ageCharacter` for a year spent in Twilight. Also: a magus in Twilight does not age while away ("immune to … aging"), and the Tribunal's news says a Virtue, Flaw or spell may have come of it, for the storyguide.

## Proposed next: Batch F. Checks that hold the rules

From the forensic review of #1 to #88 (2026-11-28; `history/README.md`, faults 11 to 14). Each item fixes faults that are live on main and adds the test that would have caught them, so the rule is held by a test and not only a sentence. The review checked each against the books and the code; its scratch tests found the counts given. Build them in this order: the first two fix rules a player meets.

1. **One gate for gaining an Ability.** `mayLearn` (`src/engine/teaching.ts` line 75) and `abilityAvailability` (`src/data/restrictions.ts` line 359) disagree: a Flambeau magus may be taught Heartbeast, Faerie Magic, Enigmatic Wisdom and House Merinita Lore, which other Houses' magi cannot learn "even if they have access to Arcane Abilities" (DE lines 7587 and 7564). Have `mayLearn` call `abilityAvailability` and add only what teaching itself needs. Test it with one table (Ability, character, answer) run on every road that adds an Ability: teaching, training, study, the clock's Read and Quick build. The same kind of fault as Parma Magica in #34 and the reading rule of Batch D.
2. **Quick build refuses Virtues its traditions' book lists name.** Five ids in `src/engine/guided/traditionRules.ts` match no Virtue: `cyclic-magic`, `cyclic-magic-flaw`, `disorienting-magic-flaw`, `inoffensive-to-animals` and `offensive-to-animals-flaw` (the data has `cyclic-magic-positive`, `cyclic-magic-negative-flaw`, `disorientating-magic-flaw`, and `inoffensive-to-beings` and `offensive-to-beings-flaw` with "animals"). And its Hermetic-list gate (line 209) refuses any Hermetic Virtue not on a tradition's list, for all four traditions with one, before `gateReason` (`score.ts` line 134) asks whether the player named it. Only the gruagach's list is a limit: "Gruagach may only take Hermetic Virtues or Flaws on the above list, unless the troupe decides otherwise" (HMRE line 2953); the folk witch's is "suitable" (line 1707) and most of the learned magician's "are suitable for all magicians" (line 4384). Check the vitki's (line 6168) before deciding it. Fix the ids, narrow the gate to what the books say, and let a named Virtue pass. Test that every hand-written id list in `src/engine/guided/` resolves, as `guided.test.ts` line 268 does for MAGNITUDES and ARCHETYPES, and make `traditionBuild.test.ts` line 330 fail on an unknown id instead of skipping it.
3. **About 38 line pointers miss their heading.** All 18 folk witch Virtues (`src/data/hedgeFolkWitch.ts` lines 15 to 32) and its Abilities Cursing, Flight and Healing (line 87, at 1763, Animal Ken's heading; theirs are 1771, 1811 and 1821); the gruagach Arts (`hedgeGruagach.ts` lines 33 and 39, at 2862 and 2872; the Arts are at 2963 and 2973); Decreased and Restricted Might (`faerie.ts` lines 205 and 209); the learned and elementalist Forms. Test every Virtue, Flaw and Ability definition: a heading with its name lies from 6 lines above its pointer to 2 below. A pointer to a group ("Faerie Powers", "Techniques") is marked `group`, and the book's own typos ("Exaliation", HoH: MC line 2739) are on a short list. The review's run: 1,247 pass, 57 fail, of which about 15 are group pointers.
4. **The book's words, checked.** A test that every string shown as the book's (`restrictionText`, `need.quote`, quotations in `src/ui`, and hand-written `text` in the book-text place of `VFText`, `VFText.tsx` line 66) is in a Fifth Edition book in `reviewed/` or `wip/` (Theriomorph's is only in `wip/`), with spacing, quotation marks and markdown normalized; a cut inside shows "…", and a cut at either end falls on the book's punctuation. It finds 11 of 74 today:
   - reworded or spliced: Male Guild Sponsor, Blatant Magical Air, Magical Air, Hermetic Empowerment, Diedne Magic and Giant Blood;
   - cut mid-sentence with no "…": Divination & Augury, Miles, Tamed Magic, Bound to Role, and `AscentCard.tsx` line 83, which drops "from the experience" (RoP: The Divine line 2115) and shows only on hover.

   Fix them. The 64 Virtue texts written by hand (and `VF_TEXT_FIXES`, `src/data/index.ts` line 316) are paraphrases in "she": copy the book's text, or mark them as the toolkit's summary and write them in "they". *Judgment* for the owner: which of the two, since it changes what the Virtue's card shows. The test cannot see a cut that changes the meaning; the review and tests of behavior must.
5. **Every season logged is told as its own.** In `src/ui/pages/unlogEverySeason.test.tsx`, `pressed()` (line 136) already presses every card's buttons: assert that each entry logged has a `told` phrase, with the cards that rightly log a plain season on a named list. Audit 3's B2 (cards that logged `'other'` and were told as ordinary work) would have failed it; a `Record` of every kind would not have, since `'other'` has its own entry.
6. **Botch dice in the engine.** They are still worked out in the cards: `ElementalPart.tsx` line 84, `FaeriePart.tsx` lines 135 and 312, `FolkWitchPart.tsx` line 86. Move each into its system's engine module, with tests on the book's own cases, as `gainWarping` was.
7. **Blood of the Nephilim does not exclude Size.** "Virtues or Flaws that affect your Size" (DE line 3601) are not excluded: Large, Small Frame and Dwarf are allowed beside it. Add them to its `excludes`, with the test.

An aid, not a check: a script in `tools/books/` that prints the "not / unless / only / instead / except" sentences of each section a new data file cites, for the step 4 review.

## Found

Findings not yet in a batch.

- **A `tours.test.ts` failure in #86 was not traced** (#86's text calls it unexplained). Nobody has seen it since. If it fails again, trace it before anything else in that pull request.

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
