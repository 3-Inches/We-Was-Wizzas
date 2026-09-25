import { Link } from 'react-router-dom';
import { Card } from '../kit';

export default function HelpPage() {
  return (
    <div className="stack" style={{ maxWidth: 960 }}>
      <h1>Guide</h1>
      <Card title="What this is" className="accent">
        <p>
          A saga toolkit for <i>Ars Magica</i> Fifth Edition (Definitive Edition rules) that runs entirely in your browser. It builds grogs, companions, Mythic Companions and magi step by
          step, builds covenants with Build Points, Hooks and Boons, and laboratories, and then keeps doing the arithmetic in play: casting totals, Lab Totals, Penetration, Magic
          Resistance, wounds, study, aging and Twilight. The rules text of every Virtue, Flaw, spell, Hook, Boon and lab Virtue is one click away in the built-in book reader.
        </p>
        <p className="small muted">
          Nothing is sent to a server. Your data lives in this browser (IndexedDB). Use Export on a saga, character or covenant to save a file or move it to another device, and Import
          to load one.
        </p>
      </Card>
      <div className="grid grid-2">
        <Card title="1. Start a saga">
          <ol className="small">
            <li>
              On <Link to="/">Sagas</Link>, create a saga.
            </li>
            <li>
              Open <b>House rules & books</b> to pick which supplements your troupe uses. Only content from enabled books appears in pickers. The Definitive Edition is always on.
            </li>
            <li>Change creation numbers (Virtue points, xp, spell levels…) there if your troupe uses house rules, and record rulings for ambiguous rules.</li>
          </ol>
        </Card>
        <Card title="2. Found the covenant">
          <ol className="small">
            <li>
              From the saga page, <b>Found a covenant</b>. Choose its season, aura and power level (Build Points).
            </li>
            <li>Take Hooks to pay for Boons; each Minor Aura Boon raises the aura by 1.</li>
            <li>Buy the library, lab texts, vis sources, enchanted items and specialists; the toolkit prices everything and enforces the creation limits.</li>
            <li>Build one laboratory per magus (Size, Virtues and Flaws, Specializations). Labs feed straight into each magus's Lab Totals.</li>
            <li>Set covenfolk, income and spending to see the yearly balance and Loyalty.</li>
          </ol>
        </Card>
        <Card title="3. Make characters">
          <ol className="small">
            <li>Pick grog, companion, Mythic Companion or magus. The wizard walks through every step and never throws away a choice; you can jump between steps.</li>
            <li>Every step shows its budget (Virtue points, Characteristic points, xp pools, spell levels) and a live rules check with book references.</li>
            <li>Recommendations suggest Virtues, Abilities, Arts and spells that fit the concept themes you pick.</li>
            <li>
              The Virtue list hides what the character may not take (House-only Flaws, Virtues for faerie beings, missing prerequisites…). Untick <b>Only what this character can take</b> to
              see them with the reason; <b>allow anyway</b> takes one as a troupe ruling.
            </li>
            <li>If the troupe allows something the rules forbid, press <b>Allow</b> on the warning to record it as a ruling for that character.</li>
            <li>Finish creation to switch to the in-play sheet. You can always return to creation.</li>
          </ol>
        </Card>
        <Card title="4. Play">
          <ul className="small">
            <li>
              <b>Magic tab:</b> every Casting Score and Lab Total for the current aura, Magic Resistance per Form, Penetration with Arcane Connections, spell casting with the right die,
              botch dice, fatigue and ritual costs, spontaneous magic.
            </li>
            <li>
              <b>Combat & Health:</b> apply damage against Soak to get the wound, track Fatigue, roll recovery.
            </li>
            <li>
              <b>Seasons & Aging:</b> plan a season (books, teachers, training, practice, vis, adventure) and log it; experience is added with Affinities, gain limits and Virtues. Roll aging,
              crises and Twilight.
            </li>
            <li>
              <b>Lab & Items:</b> enchanted devices, talisman, familiar cords, Longevity Ritual.
            </li>
            <li>Click any underlined number to see how it was calculated.</li>
          </ul>
        </Card>
        <Card title="Playing over Discord">
          <ul className="small">
            <li>
              Turn on <b>Stream mode</b> (sidebar) for larger text when screen-sharing.
            </li>
            <li>
              <b>Share link</b> on a character or covenant makes a link that imports a copy into the recipient's browser. For large sagas, use Export and send the file instead.
            </li>
            <li>A GM can run everything from one browser and act as proxy for players; players can keep their own copies and send updates as files.</li>
          </ul>
        </Card>
        <Card title="Overrides and house rules">
          <ul className="small">
            <li>Most numbers can be overridden on the sheet (Ability scores, Soak…) for on-the-fly corrections.</li>
            <li>
              <b>House rules & books → Virtue/Flaw mechanics</b> lets you change what any Virtue or Flaw does for your saga.
            </li>
            <li>Custom Virtues, Flaws, Abilities, weapons and spells can be added per saga.</li>
          </ul>
        </Card>
      </div>
      <Card title="About the rules data">
        <p className="small">
          The rules come from the markdown books in this repository: 959 Virtues and Flaws, 122 Abilities, 1,205 spells, 610 guideline entries, 128 laboratory Virtues and Flaws, 198 Hooks
          and Boons and 240 Shape & Material entries, all extracted automatically, with hand-written mechanics for the Virtues and Flaws that change numbers. Books marked WIP are still being
          transcribed and may have errors. If something looks wrong, use an override and check the source text in the reader.
        </p>
      </Card>
      <Card title="License & credits" id="credits">
        <p className="small">
          <i>
            Based on the material for Ars Magica, ©1993–2024, licensed by Trident, Inc. d/b/a Atlas Games®, under{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
              Creative Commons Attribution-ShareAlike 4.0 International
            </a>{' '}
            ("CC BY-SA 4.0").
          </i>{' '}
          Ars Magica and Mythic Europe are trademarks of Trident, Inc. Order of Hermes, Tremere, Doissetep and Grimgroth are trademarks of Paradox Interactive AB.
        </p>
        <p className="small">
          The book text comes from the Open License markdown edition by OriginalMadman (
          <a href="https://github.com/OriginalMadman/Ars-Magica-Open-License" target="_blank" rel="noreferrer">
            github.com/OriginalMadman/Ars-Magica-Open-License
          </a>
          ). This toolkit is an unofficial fan project, not affiliated with or endorsed by Atlas Games or Paradox Interactive. As the license requires, its rules data and text are shared
          under the same CC BY-SA 4.0 license. More about the Open License:{' '}
          <a href="https://www.atlas-games.com/arsmagica/openars" target="_blank" rel="noreferrer">
            atlas-games.com/arsmagica/openars
          </a>
          . The published books, with their art and layout, are available from Atlas Games.
        </p>
      </Card>
    </div>
  );
}
