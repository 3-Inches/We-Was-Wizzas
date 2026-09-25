# Ars Magica Saga Toolkit

A browser app for running an *Ars Magica* Fifth Edition saga under the Definitive Edition rules. It builds characters and covenants, checks the rules as you go, and does the in-play arithmetic. All of its rules data is generated from the markdown books in this repository.

It runs locally in the browser. Data is stored in IndexedDB and shared as files or links, and nothing goes to a server.

## What it does

**Characters.** A step-by-step wizard covers grogs, companions, Mythic Companions and magi:

- It tracks the Virtue/Flaw balance, Characteristic points, and every experience pool: native language, childhood, later life, apprenticeship, post-Gauntlet, and pools granted by Virtues.
- It applies Affinities, Puissance, the age cap, House benefits, the Ex Miscellanea traditions, and spell levels learnable at creation.
- A rules check cites the book for each issue. Any issue can be allowed as a troupe ruling.
- Recommendations follow the concept themes you pick.

**In-play sheet:**

| Area | What it covers |
|---|---|
| Magic | Casting Scores and Lab Totals for every Technique + Form in the current aura, Magic Resistance per Form, Penetration with Arcane Connections |
| Spellcasting | Formulaic, Ritual and spontaneous casting with the correct die, botch dice, Fatigue and Mastery |
| Health | Wounds from damage vs. Soak, Fatigue tracking, recovery rolls |
| Seasons | Books, teachers, training, practice, exposure, adventure and vis, with gain limits; aging and crises; Warping and Twilight |
| Lab & items | Enchanted devices, talisman and attunements, familiar cords, Longevity Ritual |
| Other | Printable stat block, overrides for any number |

**Covenants:**

- Hooks & Boons, including the DE situation packages.
- Build Points for the library (with the creation limits), lab texts, casting tablets, vis sources and stocks, enchanted items, specialists and teachers, and laboratories.
- Laboratory personalization: Size, Refinement, lab Virtues & Flaws, Specializations and Upkeep.
- Covenfolk inhabitant points, yearly finances and Loyalty. Members, labs and the aura feed into each character's totals.

**Tools:**

- Spell browser covering 1,205 spells.
- Spell designer with the guidelines, Range/Duration/Target magnitudes, Ritual rules, and invention seasons.
- Enchantment workshop.
- Longevity Rituals for others.
- Vis extraction and book-writing planners.
- Dice roller.
- Per-saga house rules: book toggles, creation numbers, custom content, and overriding any Virtue/Flaw's mechanics.

**Reference:**

- Searchable Virtues & Flaws, Abilities, Houses, lab Virtues & Flaws, Hooks & Boons, weapons, and Shape & Material.
- A built-in reader for every 5th Edition book. Entries across the app link to the exact line of their source.

**Sharing:**

- Export or import a saga, character or covenant as a file.
- Share links that import a copy (useful on Discord).
- Stream mode with large text for screen sharing, and a print layout.

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

- **Rules data is extracted automatically:** 962 Virtues & Flaws, 122 Abilities, 1,205 spells, 610 guidelines, 128 lab Virtues & Flaws, 36 lab features, 198 Hooks & Boons, 240 Shape & Material entries, and weapons and armor.
- **Mechanics are written by hand** in `src/data/mechanics.ts`, one entry per Virtue or Flaw, as declarative effects: xp pools, bonuses, Lab Total modifiers and so on. Virtues and Flaws without numeric effects appear on the sheet as text for the troupe to adjudicate.
- **Every total carries its breakdown.** Clicking a number shows how it was calculated.
- **Books marked WIP** in this repository are still being transcribed. Content from them can contain transcription errors, and each saga can switch them off.

## License

Based on the material for Ars Magica, ©1993–2024, licensed by Trident, Inc. d/b/a Atlas Games®, under [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/) ("CC BY-SA 4.0"). The book text comes from the Open License markdown edition by [OriginalMadman](https://github.com/OriginalMadman/Ars-Magica-Open-License).

This toolkit is an unofficial fan project and is not affiliated with or endorsed by Atlas Games or Paradox Interactive. Ars Magica and Mythic Europe are trademarks of Trident, Inc. Order of Hermes, Tremere, Doissetep and Grimgroth are trademarks of Paradox Interactive AB. Like the rest of this repository, the toolkit is shared under CC BY-SA 4.0 (see `LICENSE.md`). The app shows this credit in its sidebar and on its Guide page.
