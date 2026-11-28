# How the owner plays, and what they expect

The toolkit is built for one troupe first. This page says how that troupe plays, and what the owner asked for again and again over a month of building it. A new session has none of that history. Read this before changing anything a player sees, and check the change against it.

Each point says what the owner wants, then what it means for a change.

## How the table is set up

- **A storyguide and two to five players.** The storyguide plays characters too. Players may build their characters alone and send them in, or build them with the storyguide.
- **On a phone, mostly.** The owner reads the toolkit at the table on a phone. 390 pixels wide is the normal case, not a check at the end.
- **Every optional rule on, except inflation,** and **the whole Tribunal living**: all ten Rhine covenants, running their own seasons. Generate this saga for the sweep with `QA_LIVING=all QA_OPTIONAL=all npm run qa:saga`.
- **Players are new to Ars Magica.** The owner is learning too. If the owner is overwhelmed, the players will be, and then nobody plays.

## What the owner expects

1. **One place for each thing you do in play.** Rolls on Dice, the season's work on Seasons, belongings on Possessions. A sheet is for reference. Two places to do one thing means two things to test, and a way to cheat: working a season on one page and unlogging it on another once kept its Labor Points.
   - *For a change:* before adding a control, find where it already is. Another page links to it.
   - *Rolls are always at the Game Table,* even when the record they change is kept elsewhere, such as a covenant's building. The record's page links to the roll.
2. **The toolkit prompts; the player does not remember.** When the record changes and the rules react (a Warping Score rises, a season ends, a crisis comes), the next step waits on the Seasons page's Resolve list until it is settled. Plan warns ahead: Labor Points short at the year's end, vis running out, spending over income.
   - *For a change:* ask what the rules make happen next, and make it wait in Resolve or warn in Plan.
   - *A roll already made stands.* Unlog takes back a season's work and anything still waiting in Resolve, but not what a roll the table has made did; it says so. Turn back undoes everything.
3. **A rule that is described must work.** The owner's fear is a mechanic "paid lip service in its section but not working when it is supposed to". A card that names a rule applies it, or says plainly that the troupe applies it.
   - *For a change:* test the behavior, not the wording. A test that matches a regular expression in the source is a hint, not a proof.
4. **Everything works together.** Each new system is checked against the ones it touches. The usual ones are listed in the design principles' integration checklist: the season planner and standing activities, End, Resolve, Unlog, Turn back, the Chronicle, the living covenants, Quick build and the practice characters, the troupe's export and import, the tutorials.
5. **The living covenants play by the players' rules.** No blank checks of vis or silver. They hire, spend, age, need longevity rituals, run out of money and fall into Twilight, as the players' people do. The toolkit rolls for them and tells it in the Tribunal's news.
6. **Only offer what can apply.** Only casters cast. A teacher offers only what this student can learn. A card that cannot apply to the character chosen is hidden, with one line saying why.
7. **Show the numbers, on the page.** Whose roll it is, their score, the bonus, the Ease Factor. The player never leaves the page to look up a score. On a phone, the result of a button shows where the player is looking.
8. **Complexity in tiers.** The owner wants every system the books have, not fewer. But the surface is simple, the toolkit does the arithmetic, and the depth is a fold away. The first thing on a page is what most people came for.
9. **It is a roleplaying game.** The Chronicle tells each season as a story: the weather, the feasts, what each character did, the news. Numbers go in the fold beneath. A new kind of season's work gets its own sentence in the Chronicle.
10. **Tutorials teach by doing.** A tutorial uses the real page, a practice character made for it, and presses the buttons with the player. It goes straight on to the next tutorial.
11. **Generated characters make sense.** Personality Flaws to the full allowance, descriptions, specialties from the book's examples, crafts that belong together, a guild for the craft they are best at.
12. **Several of everything.** Several sagas, several covenants in a saga, many characters. Every picker says which one, and nothing assumes there is only one.
13. **Nothing from the Fifth Edition books is given up because it is hard.** It is made gradual instead.
14. **Moving something breaks nothing.** Every link, tutorial step and pointer that led to the old place leads to the new one.
15. **Judgment calls are told, not hidden.** Where the book is unclear, follow its example, say so in the pull request, and the owner will overrule if they want. The owner likes being asked before a choice that is theirs, and answers quickly.
   - *Look before asking.* Search the books, the core rules' general mechanics and the decisions already made first. A botched study from vis was once called unsettled, when the stress-roll rules settle it. Ask only what is left, and say what was decided without asking.
16. **Room to write.** The README and the Guide may grow, by up to about 300 words a task. The owner would rather they grow a little than see each new system written in by cutting the others.

## Decided

The owner's answers on particular cases, newest first, kept here when the roadmap's item for them is done. A session that finds its question answered here does not ask again.

- **A tradition's "suitable" Hermetic Virtues and Flaws come first in Quick build** (28 November 2026). Where a hedge tradition's book calls a list "suitable" (HMRE line 690, for every hedge wizard; the folk witch's at line 1707, the learned magician's at line 4384), it is not a limit: the rules check does not refuse a Virtue off it. Quick build draws from the suitable ones before any other, so in practice it takes only those. A list the book makes a limit stays a limit: "Gruagach may only take Hermetic Virtues or Flaws on the above list, unless the troupe decides otherwise" (HMRE line 2953).
- **A Virtue's card shows the book's text** (28 November 2026). The Virtue texts written by hand are replaced by the book's own words, pronouns and spelling as printed, not by summaries in "they".
- **Batches D and E in one pull request** (22 November 2026): one fresh session builds both, so that the costs paid once a pull request (the adversarial review, `qa:final`, the lead's review) are paid once. An exception for these two batches, not a change to one batch a pull request.
- **A book is read only by one who can read it** (20 November 2026). 4 in its language and Artes Liberales for its alphabet (DE line 16191), on every road a book is read: Plan a season, the standing activity and the clock. A book the character cannot read is not offered, with one line saying why.
- **Great projects' rolls have their own part of Dice** (20 November 2026): Game Table › Dice › Great projects.
- **The living covenants' people play by their tradition** (19 November 2026). Their hedge wizards, faerie wizards and holy people work their tradition's seasons, and the toolkit rolls their Warping reactions (the Witch Moon, Nátt-thel, Faerie Calling), told in the Tribunal's news. A Virtue, Flaw or spell that a living magus's Twilight may bring is left to the storyguide, and the news says one may have come of it.
- **Unlog takes back a linked season with its own** (19 November 2026). Unlogging either side of a lesson from a covenant-mate, or of a lab helper's season, takes back both, and says whose.
- **A season in full is ordered by the character** (19 November 2026). Their own season work first (their tradition's cards, Lab projects for a magus), then the planning (Plan a season, the standing activity, priorities), then the season log and aging, and last the Mysteries and writing, where they apply.
- **A botched study from vis teaches nothing** (19 November 2026). The vis is spent and no experience is gained. The rules for stress rolls settle it (DE line 570).
- **Great projects** (17 and 18 November 2026). The building and the menagerie are kept on the covenant, in one Great projects card on its Overview. Their rolls are made at Game Table › Dice (point 1). A mason's Build and Repair are seasons on Seasons.
- **Faerie and the Mysteries have a short tutorial each** (18 November 2026), each following one character.
- **Hedge magic's and holy work's seasons are on Seasons only** (17 November 2026). Their vis comes from the covenant's stores or the character's own, and no hedge season spends silver. A woven curse is rolled in Resolve.
