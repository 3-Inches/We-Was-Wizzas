import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../kit';
import { useStore } from '../../store/store';
import { TOURS, startTour, type TourGroup } from '../tour/tours';

// The sections of this page, for the contents list at the top. The app routes by the URL's hash,
// so the links scroll instead of changing it.
const SECTIONS: [string, string][] = [
  ['tutorials', 'Tutorials'],
  ['start', 'Quick start'],
  ['learn', 'Learning the rules'],
  ['covenant', 'The covenant'],
  ['characters', 'Characters'],
  ['play', 'In play'],
  ['questions', 'Common questions'],
  ['discord', 'Playing over Discord'],
  ['house', 'House rules'],
  ['data', 'About the rules data'],
  ['credits', 'License & credits'],
];

function Jump({ to, children }: { to: string; children: ReactNode }) {
  return (
    <a
      href={`#${to}`}
      onClick={(e) => {
        e.preventDefault();
        document.getElementById(to)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }}
    >
      {children}
    </a>
  );
}

function Step({ n, title, children, to, action }: { n: number; title: string; children: ReactNode; to?: string; action?: string }) {
  return (
    <div className="list-row" style={{ alignItems: 'flex-start', gap: 12 }}>
      <span className="badge accent" style={{ minWidth: 26, justifyContent: 'center' }}>
        {n}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>{title}</b>
        <div className="small">{children}</div>
      </div>
      {to && action && (
        <Link to={to} className="small">
          {action} →
        </Link>
      )}
    </div>
  );
}

function Question({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="list-row" style={{ display: 'block' }}>
      <summary style={{ cursor: 'pointer' }}>
        <b>{q}</b>
      </summary>
      <div className="small" style={{ marginTop: 4 }}>
        {children}
      </div>
    </details>
  );
}

const LEARN: { to: string; title: string; text: string }[] = [
  { to: '/mechanics/basics', title: 'The basics', text: 'How a roll works, Characteristics and Abilities, Personality Traits, Reputations and Confidence.' },
  { to: '/mechanics/creation', title: 'Making characters', text: 'Magi, companions, grogs and Mythic Companions, then the magical, faerie, holy and infernal characters of the other books.' },
  { to: '/mechanics/magic', title: 'Casting spells', text: 'Casting Totals, spontaneous and ritual magic, Penetration and Magic Resistance, Range, Duration and Target.' },
  { to: '/mechanics/seasons', title: 'Between stories', text: 'Seasons of study from books, teachers, practice and exposure, aging and Warping.' },
  { to: '/mechanics/lab', title: 'The laboratory', text: 'Lab Totals, inventing spells, enchanting items, familiars, longevity rituals and experimentation.' },
  { to: '/mechanics/combat', title: 'Combat & hazards', text: 'Fighting, wounds, Fatigue and recovery, poison, disease and the elements.' },
  { to: '/mechanics/covenant', title: 'Covenants', text: 'Boons and Hooks, Build Points, finances, covenfolk, vis sources and libraries.' },
  { to: '/mechanics/order', title: 'The Order of Hermes', text: 'The Code, Tribunals, Wizards’ War and the rules of each House.' },
];

const GROUPS: TourGroup[] = ['Start here', 'The saga and covenant', 'Characters', 'Magic', 'In play'];

/** The guided tutorials, and the hints setting for those who want less help or more. */
function Tutorials() {
  const ui = useStore((s) => s.ui);
  const setHints = useStore((s) => s.setHints);
  const resetHints = useStore((s) => s.resetHints);
  const running = ui.tour ? TOURS.find((t) => t.id === ui.tour!.id) : undefined;
  return (
    <Card title="Tutorials" id="tutorials" tour="tutorials" className="accent">
      <p className="small" style={{ marginTop: 0 }}>
        A tutorial walks you through the real app one step at a time: a small panel explains each step and points at the control, and <b>Next</b> takes you to the right
        page. You do the clicking, so you learn where things are. Any tutorial that makes something can use a practice saga, leaving your own sagas alone.
      </p>
      {running && (
        <p className="small">
          <b>{running.title}</b> is under way (step {Math.min(ui.tour!.step, running.steps.length - 1) + 1} of {running.steps.length}); its panel is open.
        </p>
      )}
      <div className="stack" style={{ gap: 10 }}>
        {GROUPS.map((g) => (
          <div key={g}>
            <div className="small muted" style={{ marginBottom: 4 }}>
              {g}
            </div>
            <div className="grid grid-2" style={{ gap: 8 }}>
              {TOURS.filter((t) => t.group === g).map((t) => (
                <div key={t.id} className="list-row" style={{ alignItems: 'flex-start', gap: 10, margin: 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{t.title}</b> <span className="small muted">{t.steps.length} steps</span>
                    <div className="small muted">{t.blurb}</div>
                  </div>
                  <button className={`small${t.id === 'toolkit' ? ' primary' : ''}`} onClick={() => startTour(t.id)}>
                    {running?.id === t.id ? 'Restart' : 'Start'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="row small" style={{ marginTop: 12 }}>
        <label className="inline">
          <input type="checkbox" checked={ui.hints} onChange={(e) => setHints(e.target.checked)} /> Show hints for new players
        </label>
        <span className="muted">Short tips at the places people tend to get stuck, each with a <b>Got it</b> to hide it.</span>
        {ui.dismissedHints.length > 0 && (
          <button className="small ghost" onClick={resetHints}>
            Show the {ui.dismissedHints.length} hidden hint{ui.dismissedHints.length > 1 ? 's' : ''} again
          </button>
        )}
      </div>
    </Card>
  );
}

export default function HelpPage() {
  return (
    <div className="stack" style={{ maxWidth: 960 }}>
      <div>
        <h1 style={{ marginBottom: 4 }}>Guide</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          A saga toolkit for <i>Ars Magica</i> Fifth Edition (Definitive Edition rules) that runs entirely in your browser. It builds characters and covenants step by step with the
          rules checked as you go, then keeps doing the arithmetic in play: Casting Totals, Lab Totals, Penetration, Magic Resistance, wounds, study, aging and Twilight.
        </p>
        <nav className="small" aria-label="On this page">
          {SECTIONS.map(([id, title], i) => (
            <span key={id}>
              {i > 0 && ' · '}
              <Jump to={id}>{title}</Jump>
            </span>
          ))}
        </nav>
      </div>

      <Tutorials />

      <Card title="Quick start" id="start">
        <Step n={1} title="Create a saga" to="/" action="Sagas">
          Everything lives in a saga: its characters, its covenant and the troupe&apos;s house rules.
        </Step>
        <Step n={2} title="Choose your books and house rules">
          On the saga page, open <b>House rules &amp; books</b> to pick the supplements your troupe uses (only their content appears in the pickers) and change any creation
          numbers.
        </Step>
        <Step n={3} title="Found the covenant">
          <b>Found a covenant</b> on the saga page: its aura and Build Points, Hooks and Boons, library, laboratories and covenfolk.
        </Step>
        <Step n={4} title="Make the characters">
          Pick grog, companion, Mythic Companion or magus. The wizard walks through every step, shows each budget and checks the rules with page references. Not sure what to
          play? <b>Guided build</b> on the Concept step suggests Virtues and Abilities from what you want, or builds a whole draft.
        </Step>
        <Step n={5} title="Play">
          Finish creation to switch to the in-play sheet: casting, labs, seasons, wounds and aging. Click any underlined number to see how it was worked out.
        </Step>
        <p className="small muted" style={{ marginBottom: 0 }}>
          Nothing is sent to a server. Your data lives in this browser. Use <b>Export</b> on a saga, character or covenant to keep a copy or move it to another device, and{' '}
          <Link to="/import">Import</Link> to load one.
        </p>
      </Card>

      <Card title="Learning the rules" id="learn">
        <p className="small" style={{ marginTop: 0 }}>
          Three references sit in the sidebar. <Link to="/mechanics">Game mechanics</Link> is the place to start: every rule players and storyguides use, from the core book and every
          reviewed supplement, grouped by subject and ordered from the rules every session uses to the ones only a Virtue, House or initiation opens. Big topics are split into sections: Abilities by type, each House Mystery, each Path of Criamon. Each has a short summary, the
          key rules quoted, and the book&apos;s own text a click away. Filter it for magi, companions, grogs or the storyguide.
        </p>
        <div className="grid grid-2" style={{ gap: 8 }}>
          {LEARN.map((l) => (
            <Link key={l.to} to={l.to} className="card clickable" style={{ margin: 0, textDecoration: 'none', color: 'inherit', padding: '8px 12px' }}>
              <b>{l.title}</b>
              <div className="small muted">{l.text}</div>
            </Link>
          ))}
        </div>
        <p className="small" style={{ marginBottom: 0 }}>
          The <Link to="/reference">Rules reference</Link> lists the pieces you choose from: Virtues and Flaws, Abilities, Houses, laboratory Virtues, Hooks and Boons, weapons and
          books, each with its rules text. The <Link to="/reference/book/DE">book reader</Link> has the full text of every book, searchable, with a contents list.
        </p>
      </Card>

      <Card title="The covenant" id="covenant">
        <ul className="small">
          <li>Choose the covenant&apos;s season, aura and power level (Build Points).</li>
          <li>
            Take Hooks to pay for Boons; each Minor Aura Boon raises the aura by 1. Click a Hook or Boon to read it. Resources Boons and Hooks (Wealth, Secondary Income, Poverty,
            Indebted…) take an income source; Hidden, Flawed and Illusory Resources take the resources they pay for; Exceptional Book adds its summa free.
          </li>
          <li>Buy the library, lab texts, vis sources, enchanted items and specialists; the toolkit prices everything and enforces the creation limits.</li>
          <li>
            Build one laboratory per magus (Size, Virtues and Flaws, Specializations). Labs feed straight into each magus&apos;s Lab Totals. Click a lab Characteristic to see how
            it is worked out, and a lab Virtue to read it; enter the numbers some need (a Guardian&apos;s Intelligence, an Assistant&apos;s Magic Theory).
          </li>
          <li>
            Set covenfolk, income and spending to see the yearly balance and Loyalty. Use <b>Quick add</b> for specialists, teachers and craftsmen within the starting limits, pick
            each craftsman&apos;s craft, and press <b>optimal</b> for the number of laborers or craftsmen that keeps spending lowest. Tick <b>tithed</b> and <b>Tithing Miracle</b>{' '}
            per source.
          </li>
          <li>
            At the end of each year press <b>Close the year</b> on the Finances tab: it shows the treasury after the year&apos;s balance, the rise in inflation, the vis gathered
            and the year of familiarity, then applies them (with Undo). Roll the <b>Income Modification</b> with 🎲, record <b>Loyalty events</b> as they happen, and use the one-off
            spending presets for sundry costs.
          </li>
        </ul>
      </Card>

      <Card title="Characters" id="characters">
        <ul className="small">
          <li>The wizard never throws away a choice, and you can jump between steps. Every step shows its budget (Virtue points, Characteristic points, xp, spell levels).</li>
          <li>
            <b>Click an issue</b> in the rules check to fix it: it adds or removes the Virtue, sets the value, moves the xp, shows the dropdown for a choice, or opens the step where
            you decide. <b>Resolve all</b> previews every automatic fix first, and <b>Undo</b> in the notice at the top reverses any fix.
          </li>
          <li>
            The Virtue list hides what the character may not take (House-only Flaws, Virtues for faerie beings, missing prerequisites…). Untick <b>Only what this character can
            take</b> to see them with the reason; <b>allow anyway</b> takes one as a troupe ruling. Click a tag on a Virtue (House, character type, The Gift, what it adds) to
            filter the list by it.
          </li>
          <li>
            A Virtue that gives another (Strong Faerie Blood → Second Sight, Magical Blood by the kind of magic being) adds it free. Open any Virtue or Flaw to see <b>Rules it
            refers to</b>: the Virtues, Flaws and book sections its text points to, quoted in place.
          </li>
          <li>
            Powers from Greater, Lesser, Personal or Ritual Power and Heroes&apos; Birthright are designed on the Virtues step: pick a spell within the level budget (click its name
            to read what it does) or describe your own.
          </li>
          <li>
            A companion Flaw (Magical Animal, Realm Spirit, Animal Companion) can create the companion&apos;s own sheet. A magical companion is built as a <i>Realms of Power:
            Magic</i> magic character: experience from its Season, Might from the saga&apos;s power level, Magic Qualities bought with Might, and the Magical Friend status. Its
            Creature card lists the creation steps in the book&apos;s order.
          </li>
          <li>Tribunal, homeland, Characteristic descriptions and Ability types are dropdowns; choose <b>Other (type your own)</b> for anything not listed.</li>
          <li>A character older than 35 rolls aging before play on the Concept step. A year that would kill the character is not applied, so you can roll it again.</li>
          <li>
            <b>Guided build</b> (Concept step): rate statements 0–10 about what you want to play and get recommendations with the reason and the page, or a whole draft that
            passes the rules check. The storyguide sets the saga&apos;s realms, speed and politics once under <b>House rules &amp; books → Saga</b>.
          </li>
        </ul>
      </Card>

      <Card title="In play" id="play">
        <ul className="small">
          <li>
            <b>Magic:</b> every Casting Score and Lab Total for the current aura, Magic Resistance per Form, Penetration with Arcane Connections, spell casting with the right die,
            botch dice, fatigue and ritual costs, spontaneous magic. Tick what applies right now (Magical Focus, Special Circumstances, Life Boost, a similar spell, raw vis,
            days away from the lab, any other modifier) and it is added to the totals. A botch adds its Warping Points. Casting Virtues and Flaws (Diedne Magic, Weak
            Spontaneous Magic, Vulnerable Casting…) are applied when you cast; the card lists which, and reminds you of the ones you apply yourself.
          </li>
          <li>
            <b>Combat &amp; Health:</b> apply damage against Soak to get the wound, track Fatigue, roll recovery. Tick mounted, exertion or scuffling for a round. <b>Fighting as a
            group</b> picks the saga&apos;s grogs to fight beside this character and works out the group&apos;s totals and how its blows are spread.
          </li>
          <li>
            <b>Seasons &amp; Aging:</b> plan a season (books, teachers, training, practice, vis, adventure) and log it; experience is added with Affinities, gain limits and Virtues.
            Roll aging, crises and Wizard&apos;s Twilight. Choose a teacher from the saga to fill in their scores. <b>Write a book</b> works out a summa or tractatus and adds it to
            the covenant library. With <i>City &amp; Guild</i> enabled, a craftsman or laborer can track a <b>livelihood</b>: Labor Points, the Workshop Total and the quality
            each season makes.
          </li>
          <li>
            <b>Lab &amp; Items:</b> enchanted devices, talisman, Longevity Ritual, experimentation. A familiar&apos;s cords are applied where they belong (golden to botch dice,
            bronze to Soak, recovery and aging), and its bond can be empowered with the +5 or +10 bonus. <b>Lab projects</b> carry work over several seasons: inventing a spell,
            preparing and attuning a talisman, instilling effects, extracting vis, each with its Lab Total, progress and vis.
          </li>
          <li>
            <b>Spells on a character:</b> the Overview lists effects working on the character (a raised Characteristic, a granted Virtue) with when they end; record one by
            hand, or cast it from the covenant (below). The <b>purse</b> line shows the character&apos;s own pounds and vis.
          </li>
          <li>
            <b>Time:</b> the <b>Seasons</b> page in the sidebar moves the whole saga on: one season, to next Spring, or several years. Each character does what was logged on
            their sheet, or their standing activity (set on the Seasons page or the sheet). The year&apos;s end closes the covenants&apos; books, pays allowances, rolls aging
            and adds Warping; wards like the Aegis of the Hearth are recast from the covenant&apos;s vis. Undo is always one click away.
          </li>
          <li>
            <b>Illness and agents:</b> the Combat &amp; Health tab tracks diseases with their Disease Penalty and recovery rolls; the Overview keeps a character&apos;s agents,
            recruits new ones and asks them for help. Lab projects include taming a creature, and each can be worked under a non-standard lab routine for a bonus at a cost.
          </li>
          <li>
            <b>Mysteries &amp; Initiation</b> (Seasons &amp; Aging, for Bjornaer, Criamon, Merinita and Verditius magi or anyone with a cult Lore): choose a Mystery and a
            Mystagogue from the saga, pick the book&apos;s Script or build one, add an Ordeal, and the card shows the Initiation Total against the target. <b>Initiate</b> adds the
            Virtue, the Ordeal&apos;s Flaw and the season; later targets drop by the Ordeal. Criamon magi choose their Path and prepare its next station.
          </li>
          <li>
            <b>Society:</b> the Overview&apos;s <b>Society</b> card holds a debate (against a saga character or a storyguide opponent, with the votes it sways) and a petition to the
            Church. Craftsmen in a guild get a <b>Guild</b> card beside the workshop: apprentice piece, journeyman contract, promotion, dues.
          </li>
          <li>
            <b>Tribunal customs:</b> a saga set in the Rhine, Normandy, Thebes or Transylvania is offered that Tribunal&apos;s own rules on the Saga page (off until ticked): the
            Rhine&apos;s ranks, gilds and forest pacts, Theban tokens and shards and covenant patrons, the Perthean Compact and the Hermetic Tourney, Transylvanian privileges.
          </li>
          <li>
            <b>Undo:</b> every change can be undone with <b>↶ Undo</b> in the sidebar (on a phone, in the bar at the top) or Ctrl+Z, and redone with <b>↷ Redo</b> or Ctrl+Y. A
            ritual cast for the whole covenant is listed under <b>Recent casts</b> in <b>Magic on the covenant</b> (the covenant&apos;s Overview, or the Seasons page), where <b>Undo and give back</b> takes it off everyone and
            returns the vis, Might, Confidence and Fatigue it cost.
          </li>
          <li>
            <b>Money:</b> the <b>Market &amp; treasury</b> page buys goods, services, labs, vis and Hermetic books at the book prices, brings in covenfolk and outside teachers,
            and moves pounds and vis between the treasury and the members&apos; purses. The covenant&apos;s yearly allowance to its members is set on its Finances tab.
          </li>
          <li>
            <b>Magic on the whole covenant:</b> on the covenant&apos;s Overview (or the Seasons page), <b>Cast a spell, ritual or power on the covenant</b> raises the
            Characteristics of every member, teacher, specialist and craftsman at once, or grants a Virtue, and pays for it in vis, Might or Confidence.
          </li>
          <li>
            The <Link to="/dice">Dice</Link> page rolls simple, stress and botch dice for anyone at the table.
          </li>
        </ul>
      </Card>

      <Card title="Common questions" id="questions">
        <Question q="Where do I find a rule I only half remember?">
          Search <Link to="/mechanics">Game mechanics</Link>: it covers the core book and every reviewed supplement, and each result opens the book&apos;s own text.
        </Question>
        <Question q="The troupe allows something the rules forbid. How do I keep it?">
          Press <b>Allow</b> on the warning to record it as a ruling for that character, or <b>allow anyway</b> in the Virtue list. Most numbers on the sheet can also be
          overridden.
        </Question>
        <Question q="How do I get a Virtue or an Ability later in play?">
          Open the Virtue or Ability: those that can be gained or improved after creation say how (teaching, initiation, a Breakthrough…). Then add it from the sheet&apos;s
          advancement.
        </Question>
        <Question q="My magical companion's Powers need more Penetration.">
          Spend Improved Powers&apos; mastery points on each power under <b>Supernatural powers</b>, or turn them into Penetration experience there.
        </Question>
        <Question q="Can a magic character pay for a Ritual Power with vis instead of Might Score?">
          Only with the <b>Vis Mastery</b> Quality (<i>Realms of Power: Magic</i>): then vis replaces the Confidence Points, no more pawns at once than the Confidence Score.
          Without it, a Ritual Power costs Might Score or Confidence Points. Eating vis of the Might&apos;s Form refills the Might pool either way.
        </Question>
        <Question q="A book my troupe uses is missing from the pickers.">
          Enable it under <b>House rules &amp; books</b>. Books marked WIP are still being transcribed. Anything else can be added as custom content per saga.
        </Question>
        <Question q="How do I move a saga to another computer?">
          <b>Export</b> it and <Link to="/import">Import</Link> the file on the other computer. <b>Share link</b> on a character or covenant does the same for one sheet.
        </Question>
      </Card>

      <div className="grid grid-2">
        <Card title="Playing over Discord" id="discord">
          <ul className="small">
            <li>
              Turn on <b>Stream mode</b> (sidebar) for larger text when screen-sharing.
            </li>
            <li>
              <b>Share link</b> on a character or covenant makes a link that imports a copy into the recipient&apos;s browser. For large sagas, use Export and send the file instead.
            </li>
            <li>A GM can run everything from one browser and act as proxy for players; players can keep their own copies and send updates as files.</li>
          </ul>
        </Card>
        <Card title="Overrides and house rules" id="house">
          <ul className="small">
            <li>Most numbers can be overridden on the sheet (Ability scores, Soak…) for on-the-fly corrections.</li>
            <li>
              <b>House rules &amp; books → Virtue/Flaw mechanics</b> lets you change what any Virtue or Flaw does for your saga.
            </li>
            <li>Custom Virtues, Flaws, Abilities, weapons and spells can be added per saga.</li>
            <li>
              <b>House rules &amp; books → Optional rules</b> turns each supplement subsystem on or off (illness, lab routines, agents, Mysteries, guilds, debate…). What is off
              disappears from the sheets; each rule has a summary and the book&apos;s text a click away.
            </li>
          </ul>
        </Card>
      </div>

      <Card title="About the rules data" id="data">
        <p className="small">
          The rules come from the markdown books in this repository: 1,042 Virtues and Flaws, 48 Magic Qualities and Inferiorities, 122 Abilities, 1,205 spells, 610 guideline
          entries, 130 laboratory Virtues and Flaws, 198 Hooks and Boons and 240 Shape &amp; Material entries, all extracted automatically, with hand-written mechanics for the
          Virtues and Flaws that change numbers. The Game mechanics reference was made by reading every reviewed book section by section; each entry is checked against the
          book, and its quotes are the book&apos;s exact words. Books marked WIP are still being transcribed and may have errors. If something looks wrong, use an override and
          check the source text in the reader.
        </p>
      </Card>
      <Card title="License & credits" id="credits">
        <p className="small">
          <i>
            Based on the material for Ars Magica, ©1993–2024, licensed by Trident, Inc. d/b/a Atlas Games®, under{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
              Creative Commons Attribution-ShareAlike 4.0 International
            </a>{' '}
            (&quot;CC BY-SA 4.0&quot;).
          </i>{' '}
          Ars Magica and Mythic Europe are trademarks of Trident, Inc. Order of Hermes, Tremere, Doissetep and Grimgroth are trademarks of Paradox Interactive AB.
        </p>
        <p className="small">
          The book text comes from the Open License markdown edition by OriginalMadman (
          <a href="https://github.com/OriginalMadman/Ars-Magica-Open-License" target="_blank" rel="noreferrer">
            github.com/OriginalMadman/Ars-Magica-Open-License
          </a>
          ). This toolkit is an unofficial fan project, not affiliated with or endorsed by Atlas Games or Paradox Interactive. As the license requires, its rules data and text are
          shared under the same CC BY-SA 4.0 license. More about the Open License:{' '}
          <a href="https://www.atlas-games.com/arsmagica/openars" target="_blank" rel="noreferrer">
            atlas-games.com/arsmagica/openars
          </a>
          . The published books, with their art and layout, are available from Atlas Games.
        </p>
      </Card>
    </div>
  );
}
