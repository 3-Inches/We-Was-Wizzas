# Design principles

The toolkit serves a table of people in the middle of a game. They have a few seconds of attention to spare, they may be new to the rules, and half of them are on a phone. Every choice below follows from that.

Each principle says what to do, why, and how to check it. The checklists at the end are what a change must pass before it is called finished.

## 1. Show what is needed now. Fold the rest.

People can hold only a little at once. A page that shows everything shows nothing.

- A page has one job. A card has one job. If a card needs a heading inside it to separate two jobs, it is two cards.
- What is used every session is open. What is used once a season or once a saga is folded, with a summary line that says what is inside.
- Every card on a page with more than three cards has `fold` and a `summary`. On a phone, cards start folded, so the page opens as an outline.
- Complete lists (every modifier, every Hook, every option) belong inside the control that uses them, not in the surrounding text.

**Check:** open the page at 390 wide. Can you tell what each card is for without opening it? Is the first thing on the screen the thing most people came for?

## 2. Explain before you ask.

A player should never need the book open to use a card.

- Never ask for a number the player must already know. If the book gives a table of Ease Factors, offer the table. If the value comes from the sheet, read it from the sheet.
- A label that is a rules term gets a gloss of one line, on the card. "Medicinal: bodies and their humors."
- A list of unfamiliar names shows what each one means in the list itself, not only after it is chosen.
- A disabled button says why, beside it.

**Check:** read the card as someone who has not read this chapter. Is there a word or a number you would have to look up?

## 3. If the toolkit knows, it does not ask.

The toolkit keeps the sheets, the covenant's stores and the calendar. Use them.

- When a state changes that the rules react to (a Warping Score rises, a season ends, a wound heals), prompt for what follows. Do not leave a button for the player to remember.
- Take what is spent (vis, silver, Fatigue, a season) from where it is kept, and say so in the result. Refuse when there is not enough, and say what is missing.
- Fill in the opponent, the aura, the score and the penalty from what is on record. Let the player correct them.

**Check:** does the card ask the player to type something the toolkit already holds, or to do afterwards "by hand" something it could do?

## 4. One place for each thing.

- **Play is at the Game Table.** Rolls on Dice, the season's work on Seasons, belongings on Possessions.
- **A sheet is for reference** once the character is finished. It shows where the character stands and says where each thing changes.
- **Creation settings stay in the builder and on the sheet.** They do not appear on the Game Table.
- **Anything that takes a season is worked on the Seasons page,** in the character's season in full. The page that has the tradition's rolls links there.
- **A roll the book makes when a season ends** (a woven curse) waits in the Seasons page's **Resolve** step until it is rolled.
- **A card lives in one place.** Another page links to it. It does not show it again.

**Check:** where would a player look for this first? Is it there, or is there a link from there?

## 5. A control does what it looks like it does, at once.

- A choice applies when it is made. A second button to confirm a choice is a trap, unless the choice is destructive.
- The line that says what will happen (the total, the cost, the level) always describes what is selected now.
- The same act has the same words everywhere. See the vocabulary below.
- A card does not open on a warning. If something must be chosen first, say what to choose. Show the warning only after a choice makes it true.
- Destructive buttons look destructive and can be undone.

**Check:** change each control and watch the summary line. Does it follow? Press every button once: did it do what its label says, and say what it did?

## 6. Results say what happened and where it went.

- A roll shows its dice, its parts and its total, then what that means in the rules, then what was changed on which sheet.
- A number that was calculated can be clicked to see how (`<Total>`).
- When the book leaves the outcome to the storyguide, say so, and offer the book's suggestions.

## 7. Write for someone who has not read the book.

- One idea to a sentence. No sentence over 40 words.
- No brackets inside brackets. If a sentence needs two asides, it is two sentences.
- Order: what it is, then how to start, then where it is played. Not a list of features.
- Lead a paragraph with its point. Bold the three or four words a reader scanning the page needs.
- Use the book's terms, capitalized as the book does, and explain each the first time on a page.
- "They" for a person whose gender is not given. American spelling, as the books.
- Say what the toolkit does, not what it "allows" or "supports".
- Numbers come with their unit and their source: "9 pawns of vis (the age ÷ 5)".

The Guide's three pages are written to these rules and are tested against them: **Using the toolkit** (`src/data/toolkitGuide.ts`, `toolkitGuide.test.ts`), **Playing the game** and **Running the game** (`src/data/roleplay.ts`, `roleplay.test.ts`). Use them as the model. A new system's Guide entry is a card in `toolkitGuide.ts`, its steps a numbered list. The README is a page: a new system adds one row to its table, not a description.

**Check:** read it aloud. Then ask of every sentence: would a new player miss it if it were gone?

## 8. Everything can be found.

A system that is built but cannot be found is not finished. Each system from a book has:

- a **Guide entry**, written as steps (make one, use it, spend a season, what to watch for);
- an **"In the app" pointer** on its Game Mechanics topic (`src/data/appPlaces.ts`);
- a **tutorial**, or a step in an existing one, if it adds a page or a new kind of play;
- a row in the README's table of what the toolkit covers, and anything left out listed under "Not yet automated".

## 9. Faithful to the books, and honest about the gaps.

- Follow the book, including where it is odd. Where the book contradicts itself, follow its worked example and say so in a comment.
- Where the toolkit simplifies or leaves a rule to the troupe, say so on the card and list it under "Not yet automated".
- A troupe can overrule anything. Do not remove the override to enforce a rule.
- Test with the book's own examples. A test that restates the code proves nothing.

## 10. The phone is a first-class reader.

- Nothing is wider than 390 pixels. Tables of more than two columns become lists there.
- Controls are large enough to press. Hints do not depend on hovering.
- The sweep at 390 is part of finishing a pull request, not an extra.

## 11. Build what a troupe will use.

Not every paragraph of every book needs a card.

- Before building a system, ask: will a troupe use this at the table more than once in a saga? If not, a pointer to the book's text is enough.
- Prefer one general tool to three special ones. A roll with a list of the book's modifiers often serves better than a bespoke card.
- Setting, story seeds and history belong in the reader, not in the toolkit's pages.

## 12. Keep it from growing without bound.

- Before adding a card, look for the card it belongs in. Before adding a page or a tab, look for the page.
- When you add to a document, look first for what it replaces. The README and the Guide's toolkit page have ceilings (`src/quality.test.ts`: 5,000 and 6,000 words), and a pull request adds at most **300 words** to each. Other limits there may only go down.
- Delete what a change makes unused: exports, styles, helper text, tutorial steps.
- A file over about 600 lines is a sign that two things live in it.

---

## Vocabulary

Use these words for these things, everywhere.

| For | Say | Not |
|---|---|---|
| Spending a season on a piece of work | **Verb, then "(a season)"**: "Brew (a season)" | "Work the season", "Work a season", "Do it" |
| A roll | **"Roll" and the thing rolled**: "Roll Summoning" | "Use", "Go", "Perform" |
| Where play happens | **Game Table › Dice › Hedge magic** (with the › mark) | "the dice page", "the hedge tab" |
| The person running the game | **storyguide** | GM, referee |
| The people at the table | **troupe** | group, party |
| A finished character's page | **sheet** | profile, record |
| Putting a card away | **Fold**, **Show** | collapse, expand, hide |
| Something the rules leave open | "**the storyguide decides**" or "**the troupe decides**" | "as appropriate" |

---

## Checklists

### A system from a book is finished when

- [ ] Its data cites book and line, and its engine module has tests built on the book's worked examples.
- [ ] Every formula was checked against the book's formula line, and every Virtue and Flaw of the chapter that changes a number is applied.
- [ ] Its cards are on the page a player would look on (principle 4), and season-long work is on Seasons.
- [ ] Each card passes the card checklist below.
- [ ] It has a Guide entry written as steps, an "In the app" pointer, and tutorial coverage if it adds a page.
- [ ] The README has a row for it, and lists what was left out under "Not yet automated".
- [ ] It passes the integration checklist below.
- [ ] The checks in `CLAUDE.md` pass, the adversarial review among them, ending with the tutorials and the sweeps at both widths.
- [ ] The roadmap is updated, in the same pull request.

### A change works with the rest when

The toolkit's systems read each other's records. A change that is right on its own card can still be wrong two pages away. For each line, say in the pull request what you checked, or why it does not apply.

- [ ] **The season planner.** A season it spends is checked by `seasonBusy`, and the character's standing activity does not run on top of it.
- [ ] **End and Resolve.** What follows it at the season's end waits in Resolve. Warping goes through `gainWarping`, never straight onto the sheet or a season entry.
- [ ] **Unlog and Turn back.** Unlogging the season takes back everything it did: vis, silver, Labor Points, Warping, and anything it left waiting in Resolve.
- [ ] **The Chronicle.** The season is told in a sentence of its own, not as "the season's ordinary work".
- [ ] **The living covenants.** Their people run the same rule in their own seasons, or the pull request says why not.
- [ ] **Quick build, the generator and the practice characters.** They can make a character who uses it, and what they make passes the rules check.
- [ ] **The troupe's export and import.** A character sent to a player and back keeps it, and the list of what changed names it.
- [ ] **One character, the whole page.** Open each page it touches as one character of each kind it is for, folded, at 390 wide. Is that character's own work near the top? Is anything offered that cannot apply to them?
- [ ] **Old saves.** A saga saved before the change loads, and the new fields are optional.

### A card is finished when

- [ ] It has one job, a title that names it, and a `fold` with a `summary` if the page has more than three cards.
- [ ] It does not open on a warning or a disabled button. Its first choice is one this character can make: their best power, a design within their Lab Total.
- [ ] Every number the player must enter is one the toolkit cannot know. Everything else is read from the sheet or the stores.
- [ ] Every rules term on it is glossed or obvious.
- [ ] Changing any control updates the line that says what will happen.
- [ ] Its button is labeled from the vocabulary, and its result says what happened and what changed on which sheet.
- [ ] What it spends is taken from where it is kept.
- [ ] It reads well at 390 wide.

### A piece of text is finished when

- [ ] No sentence is over 40 words, and no paragraph over about 85.
- [ ] No brackets inside brackets.
- [ ] It starts with what the thing is, not with a list of what it contains.
- [ ] A reader who has not read the book can follow it.
- [ ] It replaces what it makes out of date, and adds no more than 300 words to the README or the Guide.
