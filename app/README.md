# Ars Magica Saga Toolkit

A browser app for running an *Ars Magica* Fifth Edition saga under the Definitive Edition rules. It builds characters and covenants, checks the rules as you go, and does the in-play arithmetic. All of its rules data is generated from the markdown books in this repository.

It runs locally in the browser. Data is stored in IndexedDB and shared as files or links, and nothing goes to a server.

## What it does

**Characters.** A step-by-step wizard covers grogs, companions, Mythic Companions and magi:

- It tracks the Virtue/Flaw balance, Characteristic points, and every experience pool: native language, childhood, later life, apprenticeship, post-Gauntlet, and pools granted by Virtues.
- It applies Affinities, Puissance, the age cap, House benefits, the Ex Miscellanea traditions, and spell levels learnable at creation.
- It enforces who may take each Virtue or Flaw: character type, House, The Gift, gender, prerequisites, incompatible combinations, Characteristic and age limits, and Virtues meant only for faeries, magic beings or hedge traditions. Virtues that bring a Flaw with them (Blood of the Nephilim and Greedy, Diedne Magic and a Major Story Flaw) add it for you, and Virtues with a sub-choice (Faerie Blood heritage, Corrupted Arts) offer a dropdown.
- An Affinity added after experience was spent keeps the scores you bought and frees the extra xp, instead of silently raising them.
- Virtues that change a budget can be added or removed at any time: Wealthy, Poor, Skilled or Weak Parens, and Virtues with their own xp pool. When a budget shrinks, the excess is taken back from the most recently added Abilities and the app tells you what moved.
- Every Virtue and Flaw is tagged from its rules: character type, House, The Gift, what it adds (free or counted) and what it needs. Tags can be searched and clicked to filter. "Only what this character can take" also hides picks that would break a creation limit, such as the 10 Flaw points or 5 Minor Flaws.
- A rules check cites the book for each issue. Click an issue to fix it:
  - It adds or removes a Virtue, sets a value, moves or takes back xp, or shows the dropdown for a choice.
  - When the troupe has to decide, it opens the step where the decision is made.
  - "Resolve all" previews every automatic fix before applying it, and every fix can be undone.
  - Any issue can instead be allowed as a troupe ruling. Covenant issues get the same fix buttons.
- Fields the rules read are dropdowns with an "Other" option to type your own: Tribunal, homeland (which also sets the society), Characteristic descriptions, and the type of Craft, Profession, Language, Lore or Organization. Gender is Male or Female, the two the Virtue and Flaw rules refer to.
- The Ability list hides what the character cannot learn: Supernatural Abilities without their Virtue, House Abilities (Heartbeast, Enigmatic Wisdom, Faerie Magic), and Mystery Cult Lore for non-initiates.
- Post-Gauntlet years give 30 xp each, less 10 per season of lab work, never below 0 in a year (DE p.50).
- Characters older than 35 roll aging before play, one year at a time or all at once, with Living Conditions, the Longevity Ritual, crises, and undo. Aging does not change what the Characteristics cost at creation.
- Powers from Greater, Lesser, Personal and Ritual Power, Focus Power and Heroes' Birthright are built against their level budgets, with Penetration, Initiative, Fatigue and Confidence cost, or copied from a spell; the spell list shows what each spell does. Strong Angelic Heritage can be taken more than once; each copy adds 30 levels of holy powers, paid from the Divine Might it gives (Corpus, a twentieth of the character's age), which also counts as Magic Resistance.
- Holy Magic replaces Magic Theory in Lab Totals and the creation checks. True Faith and relics give Magic Resistance, and only the highest source counts.
- Recommendations follow the concept themes you pick.
- A Virtue that gives another adds it free and keeps it in step: Strong Faerie Blood gives Second Sight; Magical Blood gives the kind of magic being's advantage (+1 Characteristic, a Supernatural Virtue or a power); Templar Commander gives Temporal Influence. If the character already paid for that Virtue, it becomes free.
- Every Virtue and Flaw description ends with **Rules it refers to**: the Virtues and Flaws it names and the book sections it cites ("see page 225"), quoted in place.
- Each step has a short note on how its Characteristics, Virtues, Abilities, Arts or spells can be gained or improved in play (Characteristic Rituals, teaching Hermetic Virtues, Initiation, Twilight…).
- Companion Flaws (Magical Animal, Realm Spirit, Animal Companion) create a linked sheet for the companion, with Might, Size and powers.
- A magical companion follows *Realms of Power: Magic*'s rules for magic characters:
  - Experience comes from the Season (spring 120, summer 360, autumn 720, winter 1200) instead of age, and the character does not age.
  - Might comes from the saga's power level and the character's role, less Size for an animal. It buys Magic Qualities, Inferiorities give more points, and grogs take no Major Qualities.
  - Size changes Strength and Quickness, Might is subtracted from Advancement Totals, and a magic human has Monstrous Appearance unless it takes Natural Appearance.
  - Mundane Social Statuses give way to the five magical ones (a companion granted by a Flaw is a Magical Friend), and a companion cannot have companions of its own.
  - The Creature card (on the sheet, and on the Virtues step while creating) lists the creation steps in the book's order, with how far each has got: Characteristics, Virtues and Flaws, Season and Abilities, Might and Qualities, powers, finishing touches.
  - Repeatable Qualities are added several at a time and shown once with a count. Each Quality's limits are checked, with a fix that removes the copies that do not count:
    - Improved (Characteristic) needs the Characteristic at +5 or more first.
    - Reduced (Characteristic) needs it at −5 or less from Poor (Characteristic), and no lower than minus the greatest Characteristic.
    - Reduced Fatigue and Reduced Abilities have their caps; Limited Gestures is not for animals.
    - Inferiorities that do not count give no points.
  - Removing the Flaw an Inferiority brought removes the Inferiority and its points.
  - Improved Confidence raises the Confidence Score and points, also on a finished character.
  - Magical Meditation and (Form) Resistance give their Supernatural Ability at 1.
  - Improved Powers gives 5 mastery points each, and unused power levels give 1 per 5 levels for powers of their kind. They are spent on each power's Might cost (5 more Penetration a point), its Initiative, or a Focus Power's level beyond Might, or turned into 5 experience points each in Penetration, Concentration or Finesse right on the powers card. Reduced Power takes 5 away; only it lets mastery raise a cost or lower Initiative.
  - Magical Master, Champion and Covenfolk combine with another Social Status, so a companion Flaw's being can have one alongside the Magical Friend the Flaw asks for.
  - A magic character has no free native language: its Season experience buys any language it knows.
  - A magic character's power Penetration is Might − 5 × its Might cost + Penetration, and effects of level 50 or more must be Ritual Powers.
- **Guided build** (Concept step): the player rates statements about what they want to play, 0–10 (skipping counts as 5), and gets Virtues, Flaws, a House, Arts and Abilities recommended from every enabled book, then a complete draft that passes the rules check.
  - Every Virtue and Flaw has a record of outcome tags (Casting Totals, Penetration, Faerie, the Church…) with a direction and strength, built from the hand-written mechanics and the book text, plus region and culture gates.
  - Follow-up questions open at 7 or more (or 3 or less) and stop once fewer than 10 options remain. Concept themes pre-set answers; a covenant in the toolkit answers the questions about vis, money, the library and the aura.
  - For magi, what they do comes first: a starter question on faster progression versus flat bonuses (and why the one Major Hermetic Virtue matters most), then each activity (casting, the lab), the outputs within it (combat casting, Penetration, spontaneous magic, rituals; inventing, lab texts, enchanting, longevity, familiars, experimenting, vis extraction, teaching), then broad versus narrow (a Focus, one Art, or a weakness accepted elsewhere), steady versus cyclic magic, and a pick-any archetype question (Elementalist, Shapeshifter, Healer…).
  - Each question ends with what its best options give, Minor then Major Virtues, then Minor then Major Flaws ("Minor Virtues: Life Boost (+5 per Fatigue level spent, even into Wounds)…").
  - Options that move a Total (Casting, Lab, Penetration, spontaneous magic, progression) are ranked against the others that move the same Total by the size of their edge.
  - Each option shows its fit (how well it matches the answers) and its strength (what it is worth in this saga, in seasons over the first years). Mechanical Flaws are suggested for what the player rated low, Story and Personality Flaws for what they rated high, and a Flaw that hurts something rated high never.
  - A tie-breaker round when too much is rated 9–10, House recommendations, explainers and "Still interested?" for complex options, and Browse by tag.
  - The draft records why each choice was made ("from: I expect to cast in a fight — 9"). The storyguide sets the saga's realms, speed and politics once on the saga settings page.

**In-play sheet:**

| Area | What it covers |
|---|---|
| Magic | Casting Scores and Lab Totals for every Technique + Form in the current aura, Magic Resistance per Form, Penetration with Arcane Connections. One-click modifiers: Magical Focus, Special Circumstances, Cyclic and Potent Magic, Life Boost, Spell Improvisation's similar spell, and any other modifier |
| Spellcasting | Formulaic, Ritual and spontaneous casting with the correct die, botch dice (aura, a Ritual's vis, Cautious Sorcerer, a familiar's golden cord, Mastery), Fatigue and Mastery; a botch adds its Warping Points, and All According to Plan rerolls a botch die once a session. Ceremonial casting, and raw vis to raise a Casting Score (+2 a pawn and a botch die each, up to Technique + Form less any Ritual vis). The casting Virtues and Flaws are applied as you cast: Diedne Magic (the lowest Art doubled when exerted, or a calm ÷2 on a stress die), Weak, Difficult and Ceremonial Spontaneous Magic, Unpredictable Magic, Life-Linked Spontaneous Magic and Chaotic Magic (a declared level), Vulnerable and Withstand Casting, Rigid Magic, Unstructured Caster, Mercurian Magic and Waster of Vis on Ritual vis; others are listed as reminders |
| Certamen | The six totals for the chosen Technique and Form (House Tremere's focus doubles the lower Art), vis, and rounds rolled against an opponent's numbers, with the Fatigue they cost |
| Health & combat | Wounds from damage vs. Soak, Fatigue tracking, recovery rolls (a bronze cord adds to them). Mounted combat, combat exertion and scuffling. Fighting as a group: the vanguard's totals, a trained group's bonus capped by the leader's Leadership, the five-point range, and how a group's blows are spread |
| Seasons | Books, teachers, training, practice, exposure, adventure and vis, with gain limits and Magian Lineage's linked Abilities. Pick a teacher from the saga to fill in their Communication, Teaching and score; Apt Student, Good Teacher and a lab's Teaching Specialization (up to +3) are added. Secondary Insight; aging and crises; Warping and Wizard's Twilight (avoid, comprehend, effects and scars, with Twilight Prone and Twilight Mastery; a Twilight Virtue or Flaw is Minor or Major by the Warping Points gained). Write a summa or tractatus: Quality, Level and seasons from the author's scores, with the *Covenants* rules for artisans and resonant materials, and the finished book goes to the covenant library. Months lost to distraction cut the season's total by a third each. A bronze cord adds to aging rolls |
| Lab & items | Enchanted devices, talisman capacity and attunements (pick the one that applies when casting), Longevity Ritual. Familiars: binding level, vis and cords, each cord's effect applied where it belongs, the silver cord's roll to free your mind, and empowering the bond (+5 or +10). Days away from the lab cost Lab Total. Experimentation: the season's Lab Total bonus and a roll on the Extraordinary Results Chart with its sub-tables and Disasters (botch dice less the lab's Safety and the golden cord), and original research for a Breakthrough |
| Livelihood (*City & Guild*, opt-in) | For a craftsman or laborer: the Workshop Total (Innovation, Raw Materials, assistants up to Leadership, a craft manual) against the Craft Level and what quality it makes, Labor Points by wealth with an understaffed master's loss, the yearly upkeep, improvements and rising in wealth, workshop exertion with its results chart, haggling a sale, and wondrous items |
| Other | Printable stat block, overrides for any number |

**Covenants:**

- Hooks & Boons, including the DE situation packages.
- Build Points for the library (with the creation limits), lab texts, casting tablets, vis sources and stocks, enchanted items, specialists and teachers, and laboratories.
- Laboratory personalization: Size, Refinement, lab Virtues & Flaws, Specializations and Upkeep.
  - Entries whose bonus depends on something take a number (a Guardian's or Horde's Intelligence, a Servant's, an Assistant's Intelligence + Magic Theory, a Familiar's Golden Cord, a Studio's display). Either/or entries take a version (Magical Heating and Lighting as the Superior or Excessive version without Upkeep). Conditions can be switched off (Relocation's Warping). Specialization points offer only the allowed choices.
  - Every Characteristic shows how it is worked out; Safety includes the occupied-Size penalty (DE: base Safety = Refinement − occupied Size).
- Covenfolk inhabitant points, yearly finances and Loyalty. Members, labs and the aura feed into each character's totals.
  - Income sources follow the Boons and Hooks (Wealth, Secondary Income, Poverty, Natural Disaster, Indebted, Right, Contested Resource), with the book's source types and yearly Income Modification. Tithes and Tithing Miracles are set per income and vis source, and what the covenant receives is rounded up.
  - Hidden, Flawed and Illusory Resources each pay for 250 Build Points of chosen resources; a Flawed Resource's story can save half, lose all, or double the loss. The Exceptional Book Boon adds its summa free. Only Hooks whose text allows it can be Unknown.
  - Craftsmen choose a craft, which sets their cost saving and its limits; buttons find the number of laborers, servants, teamsters and each craft that keeps spending lowest. Quick add makes specialists, teachers and craftsmen within the starting age limits.
  - The year's end (*Covenants*, closed on the Seasons page): a preview of the treasury after the year's balance, inflation (which stays put in a year spending fell), the year's vis gathered into stocks (skip any source), a year of familiarity for Loyalty, income changes made lasting, and the allowance to members. The Income Modification roll, the Pound of Enumerus, one-off spending presets and lab outfitting.
  - Teachers, specialists and craftsmen have Ability dropdowns and can know several Abilities (only the highest sets the cost), the Characteristics their job uses (Communication to teach, Dexterity for most crafts, Presence to lead), Good Teacher, and the Source Quality they teach at. A craftsman shows the quality of goods their Dexterity + Craft makes.
  - Loyalty events from the book's table (a wound by magic counts a level worse), what the Prevailing Loyalty means for the covenfolk, and unGifted council members in the Base Loyalty.
  - Vis sources: the yield guide by size, and dedicated vis (a Technique + Form pair that works as two pawns for that combination, 7.5 Build Points a pawn), as sources or stocks. Sources found in play and vis found, won or given cost no Build Points: only the stocks the covenant was founded with count. Book prices for buying and selling.

**Time, money and magic in play:**

- **Seasons page:** one clock for the whole saga. End the season, go to next Spring, or pass several years at once. Each character does what they logged on their sheet for the season, or else their standing activity: Exposure, practice, vis study from their purse, lab work or a lab project, workshop work, being taught by a covenant teacher, or an automatic choice. The year's end closes every covenant's books, pays allowances, reminds you of Hooks that call for a story (Indiscreet Resource every five years), applies Dwindling Resources, rolls aging (or not: magic characters do not age), and adds the year's Warping from constant effects, a Longevity Ritual and the aura. The next season renews wards such as the Aegis of the Hearth from the covenant's vis, ends spells that have run out, and restores a magic character's Might pool. Everything can be undone, and the chronicle keeps the reports.
- **Magic on a character:** spells and powers that raise Characteristics or grant a Virtue are recorded on the sheet with their duration, end when it runs out, and can be ended or undone. A Characteristic raised for good by a ritual is marked as magic and costs no points; a lasting effect of level 30 or more gives a Warping Point unless the character cast it or it was designed for them.
- **Magic on the covenant:** a magus's ritual or a magic character's Ritual Power can raise every member, teacher, specialist and craftsman at once (Creo Corpus and Creo Mentem: all physical, all mental or one Characteristic, to a maximum of 0 to +5 by level), or grant a Virtue. A magus pays Ritual vis from the covenant or their purse and rolls the casting. A Ritual Power costs Might, and then Might Score, Confidence Points, or vis with the Vis Mastery Quality (no more pawns than the Confidence Score); eating vis of the Might's Form first refills the pool.
- **Lab projects:** invent a spell; prepare an item or talisman (vis paid a season at a time, capacity from the highest Technique + Form); attune a talisman; instill an effect (the talisman's +5, vis paid in the first season, capacity counted in pawns); extract vis; or other lab work. Each shows its Lab Total, progress and vis, and can be worked a season at a time or set as the standing activity; a talisman gains one Shape and Material attunement a season while it is worked. When casting, the talisman attunement that fits the spell is picked from a list, and an item's constant bonuses to its bearer apply while it is worn.
- **Purses and the market:** each character has a purse of pounds and vis. The covenant can give members a yearly allowance (a flat sum or a share of the surplus, and a share of the vis gathered). The Market & treasury page buys from the price lists of *Covenants* and *City & Guild* (services, hired hands, laboratories, animals, buildings, precious materials, arms, vehicles, goods), with quality and size multipliers. It also trades vis for silver at the saga's price (with the book's range and reasons, dedicated vis half again), buys Hermetic books for vis at the book prices, brings covenfolk into the covenant (showing the yearly cost), hires outside teachers (half a year's wage), and moves pounds and vis between the treasury and purses.

**Tools:**

- Spell browser covering 1,205 spells.
- Spell designer with the guidelines, Range/Duration/Target magnitudes, Ritual rules, and invention seasons.
- Enchantment workshop.
- Longevity Rituals for others.
- Vis extraction and book-writing planners.
- Dice roller.
- Per-saga house rules: book toggles, creation numbers, custom content, and overriding any Virtue/Flaw's mechanics.

**Reference:**

- **Game mechanics:** the rules players and storyguides use, from the core book and the reviewed supplements (over 5,000), in 14 areas. A rule reprinted in several books is shown once, from the book that takes precedence (the Definitive Edition, then the newest), with "Also printed in" links and the other books' versions when they differ. Each area runs from the rules every session uses to the ones that need a Virtue, House, initiation, tradition or kind of being, and character creation is grouped by the kind of character. Each entry has a summary, the key rules quoted word for word, "see also" links, and the book's own text on demand. Search covers every mechanic, and a filter shows what matters to magi, companions, grogs or the storyguide.
- Searchable Virtues & Flaws, Abilities, Houses, lab Virtues & Flaws, Hooks & Boons, weapons, and Shape & Material.
- A built-in reader for every 5th Edition book. Entries across the app link to the exact line of their source.

**Sharing:**

- Export or import a saga, character or covenant as a file.
- Share links that import a copy (useful on Discord).
- Stream mode with large text for screen sharing, and a print layout.

## Not yet automated

Rules the toolkit shows as text or reminders, kept here for later work:

- **Casting:** Boosted Magic and Flexible Formulaic Magic (changing a spell's parameters as it is cast), the per-Art split of boosting vis (only the total is checked), Spell Improvisation's "does not stack with other bonuses", Clumsy Magic's −3 to Finesse and aiming botches (there is no aiming roller yet), ceremonial casting's limit of one magnitude per fifteen minutes, and Waster of Vis outside Ritual vis (vis study, Certamen, the lab).
- **Mystery and hedge magic:** the casting systems of the Mystery Cults (Hermetic Numerology, Planetary and Celestial Magic, Theurgy, Invocation, Dream Magic, Synthemata and the like) and of the hedge traditions are reference only.
- **Familiars and talismans:** the Mystery Cults' Hermes, Isis and Hekate cords and the faerie cords.
- **City & Guild:** guild ranks and their requirements, journeyman contracts, merchant investments (charity, speculation, smuggling, ventures), trading companies, and the travel tables. For a wondrous item, the aura and Shape and Material bonus are added by hand.
- **Market:** lab texts have no book price, so one is agreed by hand. Buildings are paid for at once rather than built over years, and goods bought are noted in the record rather than added to an inventory.
- **Combat:** *Lords of Men* mass combat, tournaments and sieges; splitting groups, disengaging and the special maneuvers; trained animal groups.
- **Covenants:** the effect of low Loyalty on productivity, and building projects.
- **Lab projects:** experimenting within a project, several projects in one season, and the lab Virtues installed during play (their Upkeep is bought on the Market page).
- **Seasons:** the Church's ordination, good works and pilgrimages, the apprenticeship schedule, *Grogs*' per-decade aging shortcut, and *Lords of Men*'s random method of death.

## Running it

Requires Node 20 or newer.

```sh
cd app
npm install
npm run dev        # http://localhost:5173
npm test           # rules engine tests (checked against the DE worked examples)
npm run build      # static site in app/dist (works from any sub-path, e.g. GitHub Pages)
```

`npm run dev` and `npm run build` copy the 5th Edition markdown books into `public/books` so the reader can load them.

The workflow `.github/workflows/toolkit.yml` tests and builds on pull requests. On pushes to the default branch it also deploys to GitHub Pages. For the deploy to work, enable Pages with the source set to "GitHub Actions" in the repository settings.

## How it is built

```
tools/extract/        Python extractors: markdown books -> JSON (run: npm run extract)
app/src/data/         generated JSON + hand-written mechanics for Virtues & Flaws, Houses, constants
app/src/engine/       pure rules engine (no UI): characters, magic, combat, study & aging,
                      enchantment, labs, covenants, dice, spell design, recommendations
app/src/store/        zustand store persisted to IndexedDB, migrations, export/import
app/src/ui/           React pages: character wizard & sheet, covenant, tools, reference, reader
```

- **Rules data is extracted automatically:** 1,042 Virtues & Flaws, 48 Magic Qualities and Inferiorities, 122 Abilities, 1,205 spells, 610 guidelines, 130 lab Virtues & Flaws, 36 lab features, 198 Hooks & Boons, 240 Shape & Material entries, and weapons and armor.
- **Mechanics are written by hand** in `src/data/mechanics.ts`, one entry per Virtue or Flaw, as declarative effects: xp pools, bonuses, Lab Total modifiers and so on. Virtues and Flaws without numeric effects appear on the sheet as text for the troupe to adjudicate.
- **References are followed:** `tools/extract/extract_vf_refs.py` finds the Virtues and Flaws each text names and the pages it cites. It resolves each citation to its section through the Definitive Edition's indexes, the original core book's index mapped by topic, or the heading named in other books, plus a short list checked by hand. What those references mean for the rules (free Virtues, "the same as", requirements and exclusions) is in `src/data/crossRefs.ts`, added to the hand-written mechanics.
- **Restrictions are curated** in `src/data/restrictions.ts` from the sentences in the books that limit a Virtue or Flaw, each quoted in the rules check. `src/engine/character/restrictions.ts` applies them in both the Virtue picker and the rules check.
- **The mechanics reference was read, not guessed:** the reviewed books were read section by section into `tools/extract/mechanics_index/` (one file per part of a book). `tools/extract/build_mechanics.py` checks every entry against its book: the heading must be on its line, and each quote must appear word for word in the section. It gathers the topics into broader ones (`mechanics_topics.py`), groups them by area and kind of character, and writes `src/data/generated/mechanics/`: a small index plus one file per area, loaded when the area is opened. The app shows the book's own text by cutting the section out of the book file.
- **Every total carries its breakdown.** Clicking a number shows how it was calculated.
- **Books marked WIP** in this repository are still being transcribed. Content from them can contain transcription errors, and each saga can switch them off.

## License

Based on the material for Ars Magica, ©1993–2024, licensed by Trident, Inc. d/b/a Atlas Games®, under [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/) ("CC BY-SA 4.0"). The book text comes from the Open License markdown edition by [OriginalMadman](https://github.com/OriginalMadman/Ars-Magica-Open-License).

This toolkit is an unofficial fan project and is not affiliated with or endorsed by Atlas Games or Paradox Interactive. Ars Magica and Mythic Europe are trademarks of Trident, Inc. Order of Hermes, Tremere, Doissetep and Grimgroth are trademarks of Paradox Interactive AB. Like the rest of this repository, the toolkit is shared under CC BY-SA 4.0 (see `LICENSE.md`). The app shows this credit in its sidebar and on its Guide page.
