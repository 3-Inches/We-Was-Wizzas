// The guided tutorials on the Guide page. Each is a list of steps; a step says where it happens
// (the panel offers to go there, and Next goes there itself), which control to point at (a
// data-tour name, the first found on the page), and, in the character wizard, which step to open.
// Steps explain, and the player does the clicking; a step can also offer to do the work (build a
// whole draft, apply a package), or to step into another tutorial and come back.

import { R, type DiceSub, type SagaTab, type TableTab } from '../routes';
import type { CharType } from '../../data';
import { OPTIONAL_RULES } from '../../engine/optional';
import { useStore } from '../../store/store';

export interface TourCtx {
  sagaId?: string;
  charId?: string;
  covId?: string;
}

export interface TourStep {
  title: string;
  /** markdown */
  body: string;
  /** the page this step happens on; undefined while what it needs is still to be made */
  at?: (c: TourCtx) => string | undefined;
  /** what `at` needs, for the line shown when it is missing */
  needs?: 'saga' | 'character' | 'covenant';
  /** data-tour names to point at, the first found */
  target?: string | string[];
  /** the character wizard step to open */
  wizard?: string;
  /** what the toolkit can do here for the player (see actions.ts); each can be undone */
  actions?: { id: TourActionId; label: string }[];
  /** another tutorial to step into here, coming back to this one when it ends */
  detour?: { tour: string; label: string };
  /** the step goes on by itself when the button it asks for is pressed: a button in the target (one whose label matches) */
  advance?: { press?: RegExp };
}

export type TourActionId = 'buildDraft' | 'basePackage' | 'standardLabs';

export type TourGroup = 'Start here' | 'The saga and covenant' | 'Characters' | 'Magic' | 'In play' | 'Storyguide';

export interface Tour {
  id: string;
  title: string;
  blurb: string;
  group: TourGroup;
  /** the kind of character the tour follows; any if unset */
  charType?: CharType;
  /** the tour works in a saga */
  inSaga?: boolean;
  /** the tour has the player make a character, and follows that one */
  makesCharacter?: boolean;
  /** the kind of character to follow when none is open, for a tour about any character */
  prefers?: CharType;
  /** follows a character still in creation (the newest draft when none is open) */
  wantsDraft?: boolean;
  /** when none is open, follows a character with a Craft or Profession (a livelihood to show) */
  prefersTrade?: boolean;
  /** when none is open, follows a character who works holy powers (a Holy Method and a Power) */
  prefersHoly?: boolean;
  /** the practice character the tutorial can make to work on, when the saga has none that suits */
  practice?: PracticeSpec;
  steps: TourStep[];
}

/** A practice character a tutorial makes: a finished one built by Quick build, or a blank draft. */
export interface PracticeSpec {
  type: CharType;
  /** a Quick build role (roles.ts) */
  role?: string;
  /** a blank character still in creation, for a tutorial about the wizard */
  draft?: boolean;
  /** the practice covenant gets people to work with: a few grogs, servants, craftsmen and money in the treasury */
  folk?: boolean;
  /** guided-build answers that steer the practice character (a Virtue by name: 'vf:invocation') */
  answers?: Record<string, number>;
  /** Virtues the practice character has whatever the build chose, given free if it did not take them */
  ensure?: string[];
  label: string;
}

// a page with tabs is named with its tab, the first one too, so a step goes there from any other tab
const saga = (c: TourCtx) => (c.sagaId ? `/saga/${c.sagaId}?tab=saga` : undefined);
const sagaPage = (page: string) => (c: TourCtx) => (c.sagaId ? `/saga/${c.sagaId}/${page}` : undefined);
const wizard = (c: TourCtx) => (c.sagaId && c.charId ? `/saga/${c.sagaId}/character/${c.charId}/create` : undefined);
const sheet = (tab: string) => (c: TourCtx) => (c.sagaId && c.charId ? `/saga/${c.sagaId}/character/${c.charId}?tab=${tab}` : undefined);
const covenant = (tab: string) => (c: TourCtx) => (c.sagaId && c.covId ? `/saga/${c.sagaId}/covenant/${c.covId}?tab=${tab}` : undefined);
const page = (path: string) => () => path;
/** A tab of the Saga Overview. */
const sagaTab = (tab: SagaTab) => (c: TourCtx) => (c.sagaId ? `${R.saga(c.sagaId)}?tab=${tab}` : undefined);
/** A page of the Game Table. */
const table = (tab: TableTab) => (c: TourCtx) => (c.sagaId ? `${R.table(c.sagaId)}?tab=${tab}` : undefined);
/** The Game Table's Seasons page, planning the tour's character's season in full. */
const plan = (c: TourCtx) => (c.sagaId ? `${R.table(c.sagaId)}?tab=seasons${c.charId ? `&who=${c.charId}` : ''}` : undefined);
/** A part of the Game Table's Dice page, for the tour's character. */
const society = (sub: 'news' | 'agents' | 'society') => (c: TourCtx) => (c.sagaId ? `${R.table(c.sagaId)}?tab=society${sub !== 'news' ? `&sub=${sub}` : ''}${c.charId ? `&who=${c.charId}` : ''}` : undefined);
const dice = (sub: DiceSub) => (c: TourCtx) => (c.sagaId ? `${R.table(c.sagaId)}?tab=dice${sub !== 'roll' ? `&sub=${sub}` : ''}${c.charId ? `&who=${c.charId}` : ''}` : undefined);
const guided = (c: TourCtx) => (c.sagaId && c.charId ? `/saga/${c.sagaId}/character/${c.charId}/guided` : undefined);
const guidedTab = (tab: string) => (c: TourCtx) => (c.sagaId && c.charId ? `/saga/${c.sagaId}/character/${c.charId}/guided?tab=${tab}` : undefined);

// the Concept step of every character tour: the guided build to step into, or a whole draft made at once
const concept = (body: string, target: string[] = ['guided-build', 'step-basics']): TourStep => ({
  title: 'Concept',
  body: `${body} Short of time? **Build the whole character for me** makes a complete, legal draft from the themes you picked, and every choice says why.`,
  at: wizard, needs: 'character', wizard: 'basics', target,
  actions: [{ id: 'buildDraft', label: 'Build the whole character for me' }],
  detour: { tour: 'guided', label: 'Walk me through the guided build' },
});

// the optional rules that start off, and the Tribunals with customs of their own, as the rules list has them
const startOff = OPTIONAL_RULES.filter((r) => !r.defaultOn && !r.tribunal).map((r) => r.label.toLowerCase());
const tribunals = [...new Set(OPTIONAL_RULES.flatMap((r) => (r.tribunal ? [r.tribunal] : [])))];
const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : (xs[0] ?? ''));

// the wizard steps every kind of character shares, closing each character tour
const finishing: TourStep[] = [
  {
    title: 'Personality & Gear',
    body: 'Personality Traits, Reputations, Confidence, weapons and armor. A Flaw that gives a trait has already put it here.',
    at: wizard, needs: 'character', wizard: 'personality', target: 'step-personality',
  },
  {
    title: 'The Rules check',
    body: 'Beside every step, the **Rules check** lists what is left on that step with the book and page, and many issues have a one-click fix. The recommendations below it suggest what suits the concept.',
    at: wizard, needs: 'character', target: ['rules-check', 'step-review'],
  },
  {
    title: 'Review and finalize',
    body: '**Review** lists every issue at once. You may finalize anyway: what is left stays visible on the sheet, and anything you **Allow** is recorded as a troupe ruling. **Finalize character** turns the draft into the in-play sheet; creation can be reopened later.',
    at: wizard, needs: 'character', wizard: 'review', target: 'finalize',
  },
  {
    title: 'The character sheet',
    body: 'Once finished, the sheet is for reference: where the character stands. Wounds and Fatigue on **Combat & Health**, the season log and aging on **Seasons & Aging**, what they own on **Lab, Items & Familiar**. What happens in play is done at the **Game Table** (Dice, Seasons, Possessions, Health & recovery) and lands back here; each card says where. Click any underlined total to see how it is worked out. **Stat block** gives a printable summary.',
    at: sheet('overview'), needs: 'character', target: ['tab-combat', 'tab-overview'],
  },
];

export const TOURS: Tour[] = [
  {
    id: 'toolkit',
    title: 'Find your way around',
    blurb: 'What the toolkit does and where everything is: sagas, the sidebar, undo, the rules references, dice and display settings.',
    group: 'Start here',
    steps: [
      {
        title: 'Welcome',
        body: 'This toolkit builds *Ars Magica* characters and covenants with the rules checked as you go, then keeps doing the arithmetic in play. A tutorial only points and explains: press **Next** to go on, or close it at any time. Nothing is changed unless you change it.',
      },
      {
        title: 'Sagas',
        body: 'Everything belongs to a saga: its characters, its covenant and the troupe’s house rules. Name one here and press **Begin a new saga**, or import a file someone exported. The tutorials that follow work in it (or in a practice saga, offered on their first step).',
        at: page('/'), target: 'new-saga', advance: { press: /Begin a new saga/ },
      },
      {
        title: 'The sidebar',
        body: 'With a saga open, the sidebar lists its pages: the overview, Seasons, the Market, the covenant and every character, then the Tools. On a phone it is behind the **☰** menu.',
        target: 'nav',
      },
      {
        title: 'Undo',
        body: 'Every change can be undone and redone, across the whole app, from here (or Ctrl+Z). Your data is saved in this browser as you go; **Export** on a saga keeps a copy elsewhere.',
        target: 'undo',
      },
      {
        title: 'Game mechanics',
        body: 'Every rule from the core book and the supplements, grouped by subject and ordered from the rules every session uses to the rare ones. Filter it for magi, companions, grogs or the storyguide; **In the app** says where the toolkit does each one, and a topic an optional rule governs says whether your saga uses it.',
        at: page('/mechanics'), target: 'mechanics-filter',
      },
      {
        title: 'Rules reference',
        body: 'The pieces you choose from, each with its rules text: Virtues and Flaws, Abilities, Houses, laboratory Virtues, Hooks and Boons, weapons and books. The **book reader** below it has the full text of every book, searchable.',
        at: page('/reference'), target: 'nav-reference',
      },
      {
        title: 'The Game Table',
        body: 'Inside a saga, the **Game Table** comes under the Saga Overview in the menu: what needs attention, what everyone does this season and ending it, every roll, the market and City & Guild, and a list of what comes up in play with a link to where it is done. Its own tutorial is under In play.',
        at: table('overview'), needs: 'saga', target: 'nav-table',
      },
      {
        title: 'The Tribunal',
        body: '**The Tribunal**, also in the saga’s menu, builds the other covenants of the saga’s Tribunal from its book (the Rhine’s, for now) as living covenants whose magi carry on by themselves as the seasons pass. Its own tutorial is under Storyguide.',
        at: sagaPage('tribunal?tab=covenants'), needs: 'saga', target: 'nav-tribunal',
      },
      {
        title: 'Dice',
        body: 'The Game Table’s Dice page: simple and stress dice with botch dice, rolled and explained, for anyone at the table, with their totals from their sheets.',
        at: (c) => (c.sagaId ? R.dice(c.sagaId) : '/dice'), target: 'tab-dice',
      },
      {
        title: 'Display',
        body: 'Light or dark, large text for sharing a screen on Discord, and **Hints for new players**: the short tips that appear where people tend to get stuck. Turn them off once you know your way.',
        target: 'display',
      },
      {
        title: 'More tutorials',
        body: 'Each of the big jobs has its own tutorial: starting a saga and choosing its optional rules, founding the covenant (its aura too), making a magus, companion or grog, the guided build, designing spells and powers, building a laboratory and improving it in play, playing a season, and Quick build for whole characters, covenfolk and creatures.',
        at: page('/help'), target: 'tutorials',
      },
    ],
  },
  {
    id: 'saga',
    title: 'Start a saga',
    blurb: 'For the storyguide or the troupe: name the saga, choose its Tribunal and books, and set the house rules everyone builds by.',
    group: 'The saga and covenant',
    inSaga: true,
    steps: [
      {
        title: 'The saga',
        body: 'A saga holds everything else. Its **Tribunal** brings that Tribunal’s customs and optional rules; the **starting year and season** say when play begins. After that the current season moves on only on the Game Table’s Seasons page.',
        at: saga, needs: 'saga', target: 'saga-card',
      },
      {
        title: 'Books',
        body: 'Choose the books the troupe uses. Only their Virtues, spells and rules appear in the pickers, so a player cannot take something from a book the saga does not use.',
        at: sagaTab('books'), needs: 'saga', target: 'tab-books',
      },
      {
        title: 'Optional rules',
        body: 'Supplement systems the troupe can turn on or off: illness, lab routines, aura variation, agents and the Society tools, House Mysteries, guilds, and the customs of the saga’s Tribunal. Each says what it adds, its book, and where it shows; turn one off and its cards leave the sheets.',
        at: sagaTab('optional'), needs: 'saga', target: ['optional-rules', 'tab-optional'],
        detour: { tour: 'optional', label: 'Show me where each one appears' },
      },
      {
        title: 'Creation rules & rulings',
        body: 'The numbers characters are built by (Characteristic points, Flaw limits, experience) and the troupe’s rulings. Change one and every character in the saga is checked against it.',
        at: sagaTab('rules'), needs: 'saga', target: 'tab-rules',
      },
      {
        title: 'Keep a copy',
        body: '**Export saga** saves everything to a file: a backup, or a way to share the saga with the troupe. **Import** on the Sagas page loads one.',
        at: saga, needs: 'saga', target: 'saga-export',
      },
      {
        title: 'What next',
        body: 'Found the covenant, then make the characters. Both have tutorials of their own on the Guide page.',
        at: page('/help'), target: 'tutorials',
      },
    ],
  },
  {
    id: 'covenant',
    title: 'Found the covenant',
    blurb: 'Build Points, Hooks and Boons, the library and vis, laboratories and covenfolk.',
    group: 'The saga and covenant',
    inSaga: true,
    steps: [
      {
        title: 'Found it',
        body: 'Press **Found a covenant**. The saga’s characters join it as members; the tutorial follows the new covenant.',
        at: sagaPage('covenants'), needs: 'saga', target: 'found-covenant', advance: {},
      },
      {
        title: 'Its season and Build Points',
        body: 'Name it and choose its season (Spring, Summer, Autumn or Winter). A **base package** (Weak, Medium or Powerful) sets the Build Points and fills in a library, lab texts and vis to start from.',
        at: covenant('overview'), needs: 'covenant', target: ['covenant-base', 'covenant-basics'],
        actions: [{ id: 'basePackage', label: 'Use the Medium package for me' }],
      },
      {
        title: 'Spending Build Points',
        body: 'Everything the covenant owns costs Build Points: books, vis, laboratories, specialists, enchanted items. This card adds them up by kind and shows what is left.',
        at: covenant('overview'), needs: 'covenant', target: 'covenant-bp',
      },
      {
        title: 'Hooks & Boons',
        body: 'Boons are the covenant’s advantages, Hooks its troubles; Hooks pay for Boons point for point. Each shows its rules, and some change the covenant’s numbers (aura, income, loyalty) on their own.',
        at: covenant('hooks'), needs: 'covenant', target: 'tab-hooks',
      },
      {
        title: 'The aura',
        body: 'The **Aura** card shows the aura as it stands: the Aura Boons and Hooks, and each change recorded with its reason (a creature settling, a battle, a church built nearby). A Magic aura can be **aligned**, with an Art it counts double for or with Healing, Luck and the like; a Dominion can follow the **congregation** that keeps it, growing with its years of worship. With the optional **Aura variation** rule a Magic aura also drifts from year to year.',
        at: covenant('overview'), needs: 'covenant', target: 'aura',
      },
      {
        title: 'Library & Vis',
        body: 'Summae, tractatus and lab texts, and the vis sources and stocks. The magi study from these books in their seasons.',
        at: covenant('library'), needs: 'covenant', target: 'tab-library',
      },
      {
        title: 'Laboratories',
        body: 'Each member magus gets a standard laboratory free; the **Build a laboratory** tutorial covers personalizing one.',
        at: covenant('labs'), needs: 'covenant', target: 'tab-labs',
      },
      {
        title: 'Covenfolk, Finances & Loyalty',
        body: 'The covenfolk the covenant needs, its specialists and teachers, the year’s income and expenses, and the loyalty of its people. Specialists and craftsmen gain experience each year (their Build Points stay as bought). The Market buys more in play.',
        at: covenant('folk'), needs: 'covenant', target: 'tab-folk',
      },
      {
        title: 'How the covenfolk live',
        body: 'How they are organized (a noble household, nations, professional guilds…), whether the magi live poorer for fewer points, and who pays their own upkeep. With the **Guild** Hook, its demands and a strike are here, and every craftsman holds a guild rank.',
        at: covenant('folk&sub=people'), needs: 'covenant', target: 'covenfolk-organization',
      },
      {
        title: 'Soldiers',
        body: 'Soldiers from the Residents Boons and Free Choices: how many, their pay (a pound a year for each penny a day), their horses and kit. Those who live at the covenant count among its inhabitants.',
        at: covenant('folk&sub=people'), needs: 'covenant', target: 'soldiers',
      },
      {
        title: 'Each year',
        body: 'What the covenant spends every year besides upkeep: Redcap visits, feast days (four or more earn a Loyalty point a year), guests, hired hands. Weapons and armor points can be worked out from the turb.',
        at: covenant('folk&sub=money'), needs: 'covenant', target: 'yearly',
      },
      {
        title: 'Craft magic',
        body: 'Rego (or Creo) magic in place of craftsmen: design a spell from the craft guidelines or take one a magus knows, then see the Finesse roll, its chance, how many rolls a year, and what it saves.',
        at: covenant('folk&sub=money'), needs: 'covenant', target: 'craft-magic',
      },
      {
        title: 'The turb’s day',
        body: 'Who stands which watch (day or night patrol, four watches, single or double duty) and who is on duty, off duty or asleep at any hour; the rolls to stay awake on sentry and against double duty’s Fatigue; drilling a group faster; and rewards and punishments marked on a grog’s sheet, with the Loyalty Points one a magus orders costs.',
        at: covenant('folk&sub=people'), needs: 'covenant', target: 'turb',
      },
      {
        title: 'Members',
        body: 'Who lives here. The magi’s laboratories, the library they read from and the covenant’s aura all reach their sheets from here.',
        at: covenant('overview'), needs: 'covenant', target: 'covenant-members',
      },
    ],
  },
  {
    id: 'optional',
    title: 'Choose the optional rules',
    blurb: 'The supplement systems a troupe can turn on or off, and where each one shows when it is on: on the sheets, in the laboratory, on the covenant.',
    group: 'The saga and covenant',
    inSaga: true,
    prefers: 'magus',
    practice: { type: 'magus', label: 'a practice magus' },
    steps: [
      {
        title: 'The optional rules',
        body: `Rules from the supplements that add detail, by area: health, the laboratory, the covenant, society and influence, Houses and Mysteries, and the saga’s Tribunal. Each row names its book and where it shows, with the book’s text a click away. Most start on (unless the saga does not use their book); ${list(startOff)} start off. A tick changes the saga for everyone.`,
        at: sagaTab('optional'), needs: 'saga', target: ['optional-rules', 'tab-optional'],
      },
      {
        title: 'The Tribunal’s customs',
        body: `A saga set in ${list(tribunals.map((t) => (t === 'Transylvan' ? 'Transylvania' : t === 'Theban' ? 'Thebes' : t === 'Rhine' ? 'the Rhine' : t)))} is offered that Tribunal’s own rules on the Saga Overview’s Optional rules tab, first in the list and off until ticked. They apply only while the saga is set there.`,
        at: sagaTab('optional'), needs: 'saga', target: ['optional-tribunal', 'optional-rules'],
      },
      {
        title: 'Health',
        body: 'Each rule shows where it applies. **Disease and illness**: the Illness card on Combat & Health keeps what a character suffers and its penalty; catching a disease and its recovery rolls, with a physician, are made at the Game Table under **Health & recovery**.',
        at: sheet('combat'), needs: 'character', target: ['illness', 'tab-combat'],
      },
      {
        title: 'The laboratory',
        body: '**Non-standard lab routines** add choices to every lab project with a Lab Total (Early Riser, Nocturnal, overtime), for a bonus and a cost in health and Warping. **Original research** has a card of its own, for Discoveries toward a Breakthrough. Both are part of a magus’s season in full, on the Game Table’s Seasons page.',
        at: plan, needs: 'character', target: ['original-research', 'lab-projects', 'table-plan'],
      },
      {
        title: 'Society and the Tribunal',
        body: 'Played at the Game Table’s **Society & the Tribunal** page, for whoever you pick: the **Society** card (a debate, a petition to the Church, a quick trial, an etiquette performance) and the Tribunal’s customs (ranks and gilds, tokens and shards, privileges), each while its rule is on; **Agents** have a page of their own beside it. The sheet’s Overview shows the agents and the ranks as they stand.',
        at: society('society'), needs: 'character', target: ['society', 'tribunal-customs', 'tab-society'],
      },
      {
        title: 'Seasons, Mysteries and guilds',
        body: '**Mystery Initiation** is planned with the rest of a character’s season, on the Game Table’s Seasons page, for anyone a Mystagogue will Initiate: a magus of a Mystery House, a cult’s member, or someone the storyguide’s Mystagogue takes in. A craftsman in a guild has a **Guild** card beside the workshop. **Extended book Quality** makes the Writing and copying card count skilled artisans and resonant materials by default.',
        at: plan, needs: 'character', target: ['mysteries', 'writing', 'plan-season', 'table-plan'],
      },
      {
        title: 'The covenant',
        body: '**Aura variation** adds to the Aura card the base aura, the stronger auras pressing on it and this year’s modifier, and the year’s end rolls for it. **Library research** is a roll on the Library tab; the Theban patrons, the Perthean Compact and the Hermetic Tourney show on the covenant too.',
        at: covenant('overview'), needs: 'covenant', target: ['aura', 'covenant-members'],
      },
      {
        title: 'Turning one off',
        body: 'A rule turned off takes its cards away, unless a character already has something recorded there (an illness, an agent, an Initiation), which stays in sight. Nothing is deleted: turn the rule back on and it is all there. In **Game mechanics**, each topic an optional rule governs says so, and whether this saga uses it.',
        at: sagaTab('optional'), needs: 'saga', target: ['optional-rules', 'tab-optional'],
      },
    ],
  },
  {
    id: 'magus',
    title: 'Make a magus',
    blurb: 'A Hermetic wizard, step by step: House, Virtues and Flaws, Abilities, Arts and spells.',
    group: 'Characters',
    charType: 'magus',
    inSaga: true,
    makesCharacter: true,
    steps: [
      {
        title: 'Create the magus',
        body: 'Under **Create a character**, press **Magus**. The wizard opens, and the tutorial follows the new character. (For an NPC, **Quick build** makes one whole.)',
        at: sagaPage('people'), needs: 'saga', target: 'create-magus', advance: {},
      },
      concept('Name, player, age and the idea of the character, and one to three themes (Warrior, Scholar, Healer…). Not sure what to play? The **guided build** asks what you want from the character and suggests a House, Virtues and Abilities.'),
      {
        title: 'House',
        body: 'Choose a House of Hermes. Each brings a Virtue or rule of its own, and the card says what it gives and asks of a magus.',
        at: wizard, needs: 'character', wizard: 'house', target: 'step-house',
      },
      {
        title: 'Virtues & Flaws',
        body: 'The Gift and Hermetic Magus come free. Flaws pay for Virtues point for point (Minor 1, Major 3), up to the troupe’s limit; **Point balance** keeps count, and the list shows only what this magus may take.',
        at: wizard, needs: 'character', wizard: 'virtues', target: ['virtue-balance', 'step-virtues'],
      },
      {
        title: 'Characteristics',
        body: 'Share the Characteristic points among the eight Characteristics. Higher scores cost more, and a score below 0 gives points back.',
        at: wizard, needs: 'character', wizard: 'characteristics', target: 'step-characteristics',
      },
      {
        title: 'Abilities',
        body: 'Experience comes in pools (Early Childhood, Apprenticeship, After Gauntlet), each with its own budget and Abilities it may buy. Choose a pool, add Abilities and raise them.',
        at: wizard, needs: 'character', wizard: 'abilities', target: ['xp-pools', 'step-abilities'],
      },
      {
        title: 'Arts',
        body: 'The apprenticeship also pays for the fifteen Arts. A score costs its triangle in experience (5 costs 15); a Technique and a Form together make every Casting Score and Lab Total.',
        at: wizard, needs: 'character', wizard: 'arts', target: ['arts', 'step-arts'],
      },
      {
        title: 'Spells',
        body: 'Pick the spells learned in apprenticeship. The card shows the levels left; the Rules check flags a spell above the level its Technique and Form allow.',
        at: wizard, needs: 'character', wizard: 'spells', target: ['spells-known', 'step-spells'],
      },
      ...finishing,
      {
        title: 'Magic in play',
        body: 'The **Magic** tab has Casting Scores, Lab Totals, Penetration and Magic Resistance. Set the aura (its realm, a regio, the hour for a Dominion or an Infernal aura; one aligned with an Art counts double for it) and the circumstances at the top, and every total follows. Spells are cast, and certamen fought, at the Game Table’s **Dice › Spellcasting**, where the Fatigue, Warping and vis go back on the sheet; lab projects are worked a season at a time on its **Seasons** page.',
        at: sheet('magic'), needs: 'character', target: ['magic-circumstances', 'tab-magic'],
      },
      {
        title: 'Casting at the table',
        body: 'On **Dice › Spellcasting**, pick the caster: their spells with **Calm** and **Stress** buttons, spontaneous magic, certamen against anyone of the saga or the Tribunal, and Wizard’s Twilight after a botch. Each result shows under the buttons that made it.',
        at: dice('magic'), needs: 'character', target: ['magic-circumstances', 'tab-magic'],
      },
    ],
  },
  {
    id: 'companion',
    title: 'Make a companion',
    blurb: 'A capable character without the Gift (a knight, scholar, priest or hedge witch) built the same step-by-step way.',
    group: 'Characters',
    charType: 'companion',
    inSaga: true,
    makesCharacter: true,
    steps: [
      {
        title: 'Create the companion',
        body: 'Under **Create a character**, press **Companion**. The tutorial follows the new character.',
        at: sagaPage('people'), needs: 'saga', target: 'create-companion', advance: {},
      },
      concept('Name, player, age and the idea of the character, and one to three themes. The **guided build** can suggest Virtues and Abilities from what you want.'),
      {
        title: 'Virtues & Flaws',
        body: 'Every character takes one Social Status (Covenfolk and Wanderer are free). Flaws pay for Virtues point for point; a Story Flaw draws the character into the saga’s stories. Supernatural Virtues bring powers and Abilities of their own.',
        at: wizard, needs: 'character', wizard: 'virtues', target: ['virtue-balance', 'step-virtues'],
      },
      {
        title: 'Characteristics',
        body: 'Share the Characteristic points among the eight Characteristics. Higher scores cost more, and a score below 0 gives points back.',
        at: wizard, needs: 'character', wizard: 'characteristics', target: 'step-characteristics',
      },
      {
        title: 'Abilities',
        body: 'Early Childhood, then Later Life experience for each year of age past five. An older character knows more, and one past 35 has begun to age.',
        at: wizard, needs: 'character', wizard: 'abilities', target: ['xp-pools', 'step-abilities'],
      },
      ...finishing,
    ],
  },
  {
    id: 'grog',
    title: 'Make a grog',
    blurb: 'A guard, servant or craftsman of the covenant: quick to make and simple to play.',
    group: 'Characters',
    charType: 'grog',
    inSaga: true,
    makesCharacter: true,
    steps: [
      {
        title: 'Create the grog',
        body: 'Under **Create a character**, press **Grog**. The tutorial follows the new character.',
        at: sagaPage('people'), needs: 'saga', target: 'create-grog', advance: {},
      },
      concept('A name and a job is enough: guard, cook, groom, scout. Pick a theme such as Warrior or Craftsman.', ['concept-themes', 'step-basics']),
      {
        title: 'Virtues & Flaws',
        body: 'Grogs take Minor Virtues and Flaws only, a few points of each (the Rules check shows the troupe’s limit). Covenfolk is the usual Social Status.',
        at: wizard, needs: 'character', wizard: 'virtues', target: ['virtue-balance', 'step-virtues'],
      },
      {
        title: 'Characteristics and Abilities',
        body: 'The same as any character: Characteristic points, then Early Childhood and Later Life experience. A guard wants a weapon Ability and Athletics or Awareness.',
        at: wizard, needs: 'character', wizard: 'abilities', target: ['xp-pools', 'step-abilities'],
      },
      ...finishing,
    ],
  },
  {
    id: 'guided',
    title: 'Use the guided build',
    blurb: 'Rate what you want from a character and let the toolkit suggest, or build, the rest: themes, questions, recommendations and the finished draft.',
    group: 'Characters',
    inSaga: true,
    wantsDraft: true,
    practice: { type: 'companion', draft: true, label: 'a practice companion, still in creation' },
    steps: [
      {
        title: 'Themes first',
        body: 'On the Concept step, pick one to three themes (Warrior, Scholar, Healer, Faerie-touched…). Each answers some of the guided build’s questions for you, so there are fewer to go through.',
        at: wizard, needs: 'character', wizard: 'basics', target: ['concept-themes', 'step-basics'],
      },
      {
        title: 'Start it',
        body: 'Press **Start the guided build**. Nothing on the character changes until you build the draft or take an option, and the normal steps stay open the whole time.',
        at: wizard, needs: 'character', wizard: 'basics', target: 'guided-build', advance: { press: /Start the guided build/ },
      },
      {
        title: 'The questions',
        body: 'Rate each statement from 0 (not at all) to 10 (very much); one you skip counts as 5. An answer of 7 or more, or 3 or less, opens follow-up questions about it. **?** explains a statement, and the numbers after a question show what its best options give. A magus can name a House here, or leave it to the build.',
        at: guidedTab('questions'), needs: 'character', target: ['guided-main', 'tab-questions'],
      },
      {
        title: 'The shortlist',
        body: 'Beside the questions, the shortlist shows the Virtues and Flaws that fit your answers best, and changes as you answer. **Taken so far** lists what the character already has. If several kinds of option score alike, a **Tie-breaker** card asks which matters more.',
        at: guidedTab('questions'), needs: 'character', target: ['guided-shortlist', 'guided-taken'],
      },
      {
        title: 'Recommendations',
        body: 'Every option that fits, with why and the page. **Take** one now (Major or Minor where it can be either), or **Not for me** to stop it being suggested.',
        at: guidedTab('results'), needs: 'character', target: 'tab-results',
      },
      {
        title: 'Browse by tag',
        body: 'Every Virtue and Flaw grouped by what it does (Penetration, Soak, study, wealth…): a way to find options without the questions.',
        at: guidedTab('browse'), needs: 'character', target: 'tab-browse',
      },
      {
        title: 'Build the draft',
        body: '**Build the draft…** makes the whole character from your answers: House, Virtues and Flaws, Characteristics, Abilities, Arts and spells, balanced and checked against the rules. The preview lists each choice with its reason; **Use this draft** applies it, and Undo takes it back.',
        at: guided, needs: 'character', target: 'guided-draft',
        actions: [{ id: 'buildDraft', label: 'Build and use the draft for me' }],
      },
      {
        title: 'Why each choice',
        body: 'Back in the wizard, the Review step lists every choice the draft made and why. Change anything on its own step; the Rules check keeps up with you.',
        at: wizard, needs: 'character', wizard: 'review', target: ['why-card', 'step-review'],
      },
    ],
  },
  {
    id: 'spell',
    title: 'Design a spell',
    blurb: 'Work a new spell out from the guidelines: base level, Range, Duration and Target, then invent it in the lab.',
    group: 'Magic',
    charType: 'magus',
    inSaga: true,
    practice: { type: 'magus', label: 'a practice magus' },
    steps: [
      {
        title: 'Spells & design',
        body: 'Choose the magus the spell is for, so the page shows their Lab Total and Casting Score. Without one it still works the level out.',
        at: sagaPage('spells?tab=design'), needs: 'saga', target: 'spells-magus',
      },
      {
        title: 'Find the guideline',
        body: 'The **Guidelines** tab lists every guideline for a Technique and Form, with the base level of each. Find the one for what the spell should do.',
        at: sagaPage('spells?tab=guidelines'), needs: 'saga', target: 'tab-guidelines',
      },
      {
        title: 'Design it',
        body: 'Set the Technique, Form and base level, then the Range, Duration and Target. Each step up adds a magnitude; add more for size or complexity, and requisites if it touches another Art.',
        at: sagaPage('spells?tab=design'), needs: 'saga', target: 'spell-design',
      },
      {
        title: 'The result',
        body: 'The spell’s level, whether it must be a Ritual, and the magus’s Lab Total and seasons to invent it. Name it and describe it, then **Add** it to the magus or **Save** it to the saga’s spell list.',
        at: sagaPage('spells?tab=design'), needs: 'saga', target: 'spell-result',
      },
      {
        title: 'Invent it in play',
        body: 'A finished magus invents a spell in the laboratory, a season at a time: on the Game Table’s **Seasons** page, plan their season in full, or start it under **Lab projects** there.',
        at: plan, needs: 'character', target: ['lab-projects', 'plan-season', 'table-plan'],
      },
      {
        title: 'Master it',
        body: 'Each spell has a **Mastery** score: it adds to the Casting Total and takes a botch die off, and each level brings a special ability the player chooses (Fast Casting, Penetration, Quiet Casting…). The **Spell Mastery** card, in the same season in full, puts experience on a spell (a season’s practice adds its own) and asks for the ability when a new level comes.',
        at: plan, needs: 'character', target: ['spell-mastery', 'table-plan'],
      },
    ],
  },
  {
    id: 'power',
    title: 'Design a power',
    blurb: 'Supernatural powers from Virtues such as Greater and Lesser Power, and the powers of magic characters.',
    group: 'Magic',
    inSaga: true,
    prefers: 'companion',
    wantsDraft: true,
    practice: { type: 'companion', draft: true, label: 'a practice companion, still in creation' },
    steps: [
      {
        title: 'Powers come from Virtues',
        body: 'Greater, Lesser, Personal and Ritual Power, Heroes’ Birthright and Strong Angelic Heritage each give levels of powers; a magic character’s Qualities do too. Open a character (a companion is the usual one) on its Virtues & Flaws step.',
        at: wizard, needs: 'character', wizard: 'virtues', target: ['virtue-browser', 'step-virtues'],
      },
      {
        title: 'Take the Virtue',
        body: 'Search the list for **Greater Power** or **Lesser Power** and take it. A **Supernatural powers** card appears above the list.',
        at: wizard, needs: 'character', wizard: 'virtues', target: ['virtue-browser', 'powers'],
      },
      {
        title: 'Design the power',
        body: 'A power is designed like a Hermetic spell. **+ Power** adds one to describe yourself; **From a spell…** copies a spell’s level and text. Set its level (and Penetration, which costs levels one for one); the card works out Initiative and Fatigue.',
        at: wizard, needs: 'character', wizard: 'virtues', target: 'powers',
      },
      {
        title: 'In play',
        body: 'On the sheet, the same card sits on the **Abilities** tab, where its powers keep growing in play.',
        at: sheet('abilities'), needs: 'character', target: ['powers', 'tab-abilities'],
      },
    ],
  },
  {
    id: 'lab',
    title: 'Build a laboratory',
    blurb: 'Give each magus a laboratory, personalize it with Virtues and Flaws, and see it in their Lab Totals.',
    group: 'Magic',
    charType: 'magus',
    inSaga: true,
    practice: { type: 'magus', label: 'a practice magus' },
    steps: [
      {
        title: 'A lab for each magus',
        body: 'Each member magus gets a standard laboratory free. **+ Standard lab for each magus** makes them all at once; **+ Laboratory** adds a spare.',
        at: covenant('labs'), needs: 'covenant', target: ['labs-standard', 'labs'],
        actions: [{ id: 'standardLabs', label: 'Give each magus a standard lab' }],
      },
      {
        title: 'Size, Refinement and owner',
        body: 'Open a lab to set its owner, Size (bigger labs cost Build Points and hold more Virtues) and Refinement. Its characteristics (Safety, Health, Aesthetics and the rest) are worked out below; click one to see why.',
        at: covenant('labs'), needs: 'covenant', target: ['lab-open', 'labs'],
      },
      {
        title: 'Virtues and Flaws',
        body: 'A laboratory’s Virtues and Flaws give bonuses to particular activities and Arts, and change its characteristics. Search, then add; each says what it changes.',
        at: covenant('labs'), needs: 'covenant', target: 'lab-virtues',
      },
      {
        title: 'Lab Totals',
        body: 'The owner’s sheet uses the lab: its bonuses join every Lab Total on the **Magic** and **Lab, Items & Familiar** tabs, with the ones that apply to each activity.',
        at: sheet('lab'), needs: 'character', target: ['sheet-lab', 'tab-lab'],
      },
      {
        title: 'Improving it in play',
        body: 'Once play begins, the magus improves their own lab as a **Lab project**: raise its Refinement (Magic Theory at least the new Refinement + 3, with a chance of Highly Organized or a Hidden Defect), install a Virtue (a season for a Minor one, two for a Major one), or put a Flaw right. A rise in Upkeep is paid from the treasury. With the optional lab routines, odd hours and overtime add to a season’s Lab Total, at a price.',
        at: plan, needs: 'character', target: ['lab-projects', 'table-plan'],
      },
      {
        title: 'Enchantments',
        body: 'The Enchantments page designs enchanted devices and talismans, Longevity Rituals and vis extraction, and copies books and lab texts, all from the magus’s Lab Totals.',
        at: sagaPage('enchant?tab=items'), needs: 'saga', target: 'tab-items',
      },
    ],
  },
  {
    id: 'quick',
    title: 'Quick build: characters, covenfolk and creatures',
    blurb: 'Let the toolkit make whole characters, fill out the covenant’s people, and roll creatures from the books’ bestiaries.',
    group: 'Storyguide',
    inSaga: true,
    steps: [
      {
        title: 'Quick build',
        body: 'The toolkit can do the heavy lifting: whole characters for players to adjust or as your NPCs, the people a covenant needs, and creatures to meet. Choose what matters and leave the rest to chance.',
        at: sagaPage('build?tab=characters'), needs: 'saga', target: ['nav-build', 'quick-characters'],
      },
      {
        title: 'Characters',
        body: 'Pick the kind (grog, companion, magus or Mythic Companion) and a role, or leave the role to chance. **For** decides whether you get a finished NPC or a draft for a player; **Variety** how much is left to chance. A magus in the Rhine, Thebes or Transylvania gets that Tribunal’s rank, citizenship or privilege when its customs are on, and craftsmen a guild rank.',
        at: sagaPage('build?tab=characters'), needs: 'saga', target: 'quick-characters',
      },
      {
        title: 'Keep the ones you like',
        body: 'Each result shows its Virtues and Flaws, best Abilities and traits, and **How it was built**. **Keep** adds it to the saga (NPCs are listed apart on the People page), **↻** rolls that one again, and Undo takes back anything kept.',
        at: sagaPage('build?tab=characters'), needs: 'saga', target: 'quick-characters',
      },
      {
        title: 'Fill out the covenant',
        body: 'Choose the covenant, then what to fill: staff, a teacher of several Abilities the covenant’s people lack, a bookbinder and illuminator, sergeants, craftsmen (carpenters first), grogs, soldiers for its Boons, servants, teamsters, laborers and horses, its weapons and armor and yearly feasts, a library chosen for what it gives the magi, and where the Build Points left go. **Show me** previews it all with the Build Points each costs and what each resource pool pays for; nothing changes until you add it.',
        at: sagaPage('build?tab=covenant'), needs: 'saga', target: 'quick-covenant',
      },
      {
        title: 'Creatures and encounters',
        body: 'Over four hundred creatures from the stat blocks of the core book and the supplements. Narrow by Realm, Might and name, then **Roll one**, or pick from the matches. Each opens with its full stat block and a link to its page.',
        at: sagaPage('build?tab=creatures'), needs: 'saga', target: 'quick-creatures',
      },
      {
        title: 'The cast',
        body: 'Creatures you mean to use go in **the storyguide’s cast**, with how many and your notes, ready for the next story.',
        at: sagaPage('build?tab=creatures'), needs: 'saga', target: 'quick-cast',
      },
    ],
  },
  {
    id: 'table',
    title: 'Run a session from the Game Table',
    blurb: 'One page for the table: what needs attention, what everyone does this season, the covenants at a glance, ending the season, and where to go when something comes up.',
    group: 'In play',
    inSaga: true,
    steps: [
      {
        title: 'The Game Table',
        body: 'In the saga’s menu, under the Saga Overview. The Game Table is where the saga is played, in six pages along its top: the **Overview** (what needs attention, health, Confidence, the covenants, after a story), **Seasons** (what everyone does, and moving time on), **Dice** (every roll at the table), **Possessions** (what each one owns), the **Market & Treasury**, and **City & Guild**. Come back here whenever you are unsure what to do next. The character sheets are for reference: what changes in play changes here.',
        at: table('overview'), needs: 'saga', target: 'nav-table',
      },
      {
        title: 'Needs attention',
        body: 'Money running short by the year’s end, low Loyalty, a guild strike, covenant problems, wounds and Fatigue to recover, illness, a workshop short of Labor Points, rules problems on a sheet, and anyone idle this season. Each line links to where it is fixed.',
        at: table('overview'), needs: 'saga', target: 'table-attention',
      },
      {
        title: 'At the table',
        body: 'Quick dice, links to the Dice page’s parts (Combat & perils, Spellcasting, Society & the Tribunal), and **When something comes up in play**: a fight, a spell, a purchase, vis found, a grog punished, a book read, a craftsman’s story, an item at risk, a rule in question. Each opens the page where it is done.',
        at: table('overview'), needs: 'saga', target: 'table-quick',
      },
      {
        title: 'Health & recovery',
        body: 'Everyone wounded, tired or ill, the soonest recovery first, with their penalty and how near the edge they are (Fatigue levels from Unconscious, an Incapacitating Wound). Choose who tends them (a chirurgeon tends as many as their Chirurgy, five times that if they give the season to it), add magical aid, and **Pass** to the next recovery or a set time: every Recovery roll is made, and the wounds and Fatigue change on the sheets. At the foot, **choose someone** to apply damage, take or regain Fatigue, catch or cure a disease, or record a spell working on them.',
        at: table('overview'), needs: 'saga', target: ['table-recovery', 'table-attention'],
      },
      {
        title: 'Confidence & Faith',
        body: 'Everyone’s Confidence Points (and Faith Points, for True Faith) in one place. **Spend 1** for +3 on a roll; **Give 1** when the storyguide awards one for a story, a great deed or good roleplaying; **Dawn** brings Faith Points back.',
        at: table('overview'), needs: 'saga', target: ['table-confidence', 'table-recovery'],
      },
      {
        title: 'Faith & miracles',
        body: 'On **Dice › Faith & miracles** (Realms of Power: The Divine), pick anyone: holy powers called with a Method and a Power (a tragedy of hubris when they fall short), a prayer for a miracle, God’s aid for a scene, a saint or holy forbear invoked (or threatened), holy influence and tempers in the Dominion, the Divine Ascent, the Rings of Solomon, and a kabbalist’s amulets, golems and True Names. Set the aura here first: a Divine aura adds to all of it.',
        at: dice('holy'), needs: 'saga', target: ['holy-here', 'tab-dice'],
      },
      {
        title: 'The covenants',
        body: 'Treasury, the year’s balance, Loyalty, vis and people for each covenant, with the year’s accounts folded underneath and links to each of its tabs.',
        at: table('overview'), needs: 'saga', target: 'table-covenant',
      },
      {
        title: 'Quick changes',
        body: 'What happens at the table, recorded on the spot: a Loyalty event from the book’s table, money into or out of the treasury, vis found. Everything can be undone.',
        at: table('overview'), needs: 'saga', target: 'table-changes',
      },
      {
        title: 'After a story',
        body: 'First say **how many characters took part**, then choose each one and what they gained: Adventure experience (at most 5 in any one Art or Ability), logged in the season of the story and sharing it with their other work, and Labor Points for a craftsman or merchant whose business the story touched.',
        at: table('overview'), needs: 'saga', target: 'table-story',
      },
      {
        title: 'Plan, end, resolve',
        body: 'The Seasons page goes in three steps, shown at its top: **Plan** the season from the top down (the covenant first: its year, the Hooks’ stories, its people coming and going; then each player in turn, their magi before their companions, and the grogs last), **End** it at the bottom after reading what to expect, and **Resolve** what it leaves. The order of play is set with the arrows. **Turn back** puts the saga back to before a season or a year passed.',
        at: table('seasons'), needs: 'saga', target: ['seasons-phases', 'table-season'],
      },
      {
        title: 'This season',
        body: 'What each character does when the season ends: what is logged on their sheet, or their standing activity, which you can change right here: teaching anyone in play (a student taught is bound to the lesson), being taught, helping in a lab, and the extra seasons of one who needs no sleep. A season logged by mistake is **Unlogged** here, and everything it did is taken back: experience, Labor Points, vis and pounds spent, a project’s progress. **Plan in full** opens their season below: a particular book, teacher, lab project, the workshop, Spell Mastery, writing, an Initiation, a Longevity Ritual or the apprentice.',
        at: table('seasons'), needs: 'saga', target: 'table-season',
      },
      {
        title: 'End the season',
        body: 'Above the button, **what to expect**: a workshop short of Labor Points by the year’s end, lab work without its vis, a covenant spending more than it earns, a ward to cast again, anyone with nothing to do, choices still to settle. Then press **End** (the button names the season) to move the whole saga on, with Undo. Below are the options, and passing several seasons or years at once.',
        at: table('seasons'), needs: 'saga', target: 'table-advance', advance: {},
      },
      {
        title: 'Resolve',
        body: 'What the season leaves for the troupe to decide waits at the top of the Seasons page, and on the Overview, until it is settled: the Virtue or Flaw a Warping Score brings (chosen from a list), a death in an aging crisis (saved by magic, or not), a Twilight to roll. Under it, the season just ended, told as a story.',
        at: table('seasons'), needs: 'saga', target: ['seasons-resolve', 'seasons-phases'],
      },
      {
        title: 'The Chronicle',
        body: 'Each season told as a story, to read aloud: the weather and the feast days, what each character spent it on, who came up the road, the year’s harvest and its vis, the years telling on the old, what the agents heard and the news a Redcap brought. The numbers and every roll are folded beneath each, in the record.',
        at: table('chronicle'), needs: 'saga', target: 'chronicle',
      },
      {
        title: 'Society & the Tribunal',
        body: 'The Tribunal’s news and what its covenants bring to yours, what the players’ agents heard, the gatherings to come and the motions to vote on; the **Agents** themselves (won over, strengthened, asked); and the debates, petitions, courts and customs, for whoever you pick.',
        at: table('society'), needs: 'saga', target: ['tribunal-news', 'agent-reports'],
      },
      {
        title: 'Possessions',
        body: 'What each character owns, changed as it changes in play: things found, bought, given away or thrown out; armor and weapons; enchanted items and the talisman; a familiar; a Redcap’s devices. Work on an item or the familiar in the lab (**Plan preparing it**, **Plan the binding**) opens the Seasons page on the lab project, where the season is worked.',
        at: table('items'), needs: 'saga', target: ['possessions', 'items-who'],
      },
      {
        title: 'Travel, trade and intrigue',
        body: 'Folded sections for what City & Guild adds at the table: a journey’s days and cost, cargo and Area Lore, ships in a fight; bribes, hired criminals and sabotage; intrigue against the powerful; a house’s Reputation, largesse and warehouses; a dowry. Costs can be paid from a purse or the treasury.',
        at: table('guild'), needs: 'saga', target: 'table-trade',
      },
    ],
  },
  {
    id: 'city-guild',
    title: 'Craftsmen, guilds and Labor Points (City & Guild)',
    blurb: 'What City & Guild adds: a craftsman’s or merchant’s career, kept in Labor Points. What they are, how a season’s work earns them, what the yearly upkeep takes, and what the rest buys; better goods; guild ranks; the covenant’s own craftsmen; haggling; and items that break.',
    group: 'In play',
    inSaga: true,
    prefers: 'companion',
    prefersTrade: true,
    practice: { type: 'companion', role: 'master-craftsman', folk: true, label: 'a practice master craftsman' },
    steps: [
      {
        title: 'Your craftsman’s workshop',
        body: '*City & Guild* is for characters who **work for a living**: a smith, a weaver, a baker or a merchant. It keeps what their work builds up in **Labor Points**: not money, but the time and effort put into the business. This tutorial works on a practice master craftsman and has you use each part as it goes. Their **Livelihood & workshop** card is here, on the Game Table’s City & Guild page (the same card is on their sheet); the seasons spent at the bench are spent on the Seasons page, with the rest of the season. At the top: **Craft or Profession** is the trade the card works with (a smith who also shoes horses picks the one they live by), and **Primary Characteristic** is the one the trade uses: Dexterity for most crafts, Strength if the troupe says so for a smith, as the book’s swordsmith does. **Wealth** comes from their Virtues (Poor, Wealthy).',
        at: table('guild'), needs: 'character', target: 'workshop',
      },
      {
        title: 'Labor Points a season',
        body: 'Each season they **work**, they earn (Characteristic + Craft) Labor Points, times 2 if Poor, 3 if average, 6 if Wealthy; a merchant uses Communication + Profession. Dexterity +2 and Craft 5 make 7, times 3: 21 a season. **Hold the pointer on the number** (or tap it) to see the sum with this craftsman’s own scores. A guild master short of the workers their Leadership calls for loses 3 a season for each one missing.',
        at: table('guild'), needs: 'character', target: ['workshop-lp', 'workshop'],
      },
      {
        title: 'What helps and hurts at the craft',
        body: 'Craftsmen are people, and some are luckier than others. Under the totals, **At their craft** lists the Virtues and Flaws that matter at the work, green for what helps and red for what holds them back. Some always count, and are in every total: Puissant (Craft) +2, Palsied Hands −2, Clumsy or Arthritis −3. Others count only in some work: Keen Vision +3 or Poor Eyesight −3 on fine work by eye, Free Expression +3 on a new work of art. Tick **this season is…** when the season’s work is that kind. Some help or hurt away from the bench: Leprosy stops any good Craft Reputation, The Gift spoils a sale. Hold the pointer on a badge for the rule and the book. A craftsman with none of these shows no line.',
        at: table('guild'), needs: 'character', target: ['workshop-traits', 'workshop'],
      },
      {
        title: 'Assistants',
        body: 'Open **Workshop, assistants and this season’s situation** (the tutorial opens it). Every craftsman may have one apprentice, and as many helpers as their Leadership; a guild master’s may be journeymen. Each helper adds **half their Craft** to the Workshop Total (all of them added together, then halved, rounded up). They do not make the goods: the master does, better for the help. Here too are the workshop’s **Innovation** and **Raw Materials**, a craft manual, and what raises this season’s Craft Level (war, famine, scarce materials, an aura, a new employee).\n\n**Try it:** press **+ Assistant**, name them and set their Craft (an apprentice has about 3).',
        at: table('guild'), needs: 'character', target: 'workshop-assistants', advance: { press: /\+ Assistant/ },
      },
      {
        title: 'The Workshop Total and the goods',
        body: 'The **Workshop Total** is the Characteristic + the Craft they work at + Innovation + Raw Materials + the assistants’ half. It is set against the **Craft Level** (6 normally) to say how good the season’s goods are: below it shoddy; at it standard; 6 above superior; 9 above excellent, with +1 more for every 3 beyond. Superior and excellent goods give whoever uses them a bonus. A season 6 or more above earns a point toward a (Craft) Reputation. **Hold the pointer on the Workshop Total** to see what makes it up, the assistant you just added among it. **Exert yourself** adds a simple die, at the cost of a roll on the Exertion chart and an aging roll.',
        at: table('guild'), needs: 'character', target: ['workshop-total', 'workshop'],
      },
      {
        title: 'Work a season',
        body: 'A season at the bench makes the goods and earns the season’s Labor Points. It is spent where every season is, on the **Seasons** page, in the character’s season in full (a season logged by mistake can be Unlogged there, and its points go with it). **Work a season** does it now: it logs this season as work (2 Exposure experience in the craft), makes the goods, and adds the points to **Labor Points banked** at once. **Labor Points are there to spend the season they are earned**; the year’s **upkeep** (36, and 5 more for each point of Raw Materials) comes off when the year closes, after Winter. Two seasons at 21 make 42: the 36 is paid and 6 saved.\n\n**Try it:** press **Work a season**, then see the banked points go up.',
        at: plan, needs: 'character', target: ['workshop-work', 'table-plan'], advance: { press: /^Work a season/ },
      },
      {
        title: 'Which seasons they work',
        body: 'An average craftsman works **two** seasons a year and has two free for study or adventure; a Poor one works three, a Wealthy one only one (the Virtues set it; the plan shows it). When time passes and nobody planned their season, **the free seasons come first**: Spring and Summer are their own, and Autumn and Winter go to the workshop, each earning its Labor Points. Plan a season here to change that, say work in Spring and keep Winter free. A season worked with the button counts as one of the year’s working seasons. Working three or more in a year, when not Poor, earns a Reputation for avarice.',
        at: plan, needs: 'character', target: ['plan-season', 'table-plan'],
      },
      {
        title: 'Move a season on',
        body: 'Time moves for everyone at once, here on the Seasons page. **End** the season: each character spends it as planned, or on their usual activity, and a craftsman’s working season goes to the workshop by itself. When Winter ends, the year closes: the upkeep is taken from every workshop, and the covenant’s own craftsmen bank the year’s points.\n\n**Try it:** press **End** (the season), then see the workshop’s points and the season log.',
        at: table('seasons'), needs: 'saga', target: 'seasons-advance', advance: { press: /^End / },
      },
      {
        title: 'Spending Labor Points',
        body: 'Saved points make the business better. The buttons beside **Work a season**, on the Seasons page: **Innovation** (100 points for +1, 600 in all for +3; it stays with the workshop) and **Raw Materials** (50 for +1, 300 for +3; lost if they leave, and 5 a point a year to keep). Each takes a season out of the workshop, and the card logs it. **More wealth**: 120 points takes a Poor character to average, 360 an average one to Wealthy, who earns twice as much a season. A button stays grey until enough are banked, or once the season is spent. **Haggle a sale**, on City & Guild, sells the season’s goods: Presence + Bargain against 9, or against an important customer.',
        at: plan, needs: 'character', target: ['workshop-work', 'table-plan'],
      },
      {
        title: 'Stories, investments and a boom',
        body: 'Open **Stories and investments** (the tutorial opens it). **Stories** earn points: half a season’s worth for a side part, up to two and a half for a story the town depended on. **Investments** spend them on charity, a lawsuit, a marriage, each with its effect; money can be **put into the business** as points, but points never come back out as money. A merchant’s convoys, sponsors and blockades are here too.\n\n**Read the market for a boom.** A boom is a sudden demand for something they can supply: arms in a war, a new industry making what was imported. Booms come when the story says so; the roll says whether they saw it coming. Intelligence + Area Lore + a stress die: **18+**, prepared for years, two seasons’ points back for each season’s worth set aside once the boom comes; **15+**, everything put in as it starts, a season and a half back for each, that year; **7–14**, no advantage; **6 or less**, 2 of every 10 points invested are lost; a botch ruins the business.\n\n**Try it:** press **Read the market for a boom**.',
        at: table('guild'), needs: 'character', target: 'workshop-stories', advance: { press: /^Read the market/ },
      },
      {
        title: 'Wondrous items',
        body: 'A craftsman with the Major Supernatural Virtue **Touched by (Realm)** (Divine, Faerie, Infernal or Magic, with two Forms; *City & Guild*) can make a **wondrous item**: an item with a power like a Hermetic effect, made with the craft and not with magic. Open **Wondrous item** (the tutorial opens it):\n- the **Craft Level** is 12 + the effect’s magnitude + its uses a day;\n- the Workshop Total adds the aura (by the Realms Interaction Table), half of **one** helper’s Craft (one only), and a shape and material bonus up to their Craft;\n- each season adds the amount the Workshop Total beats the Craft Level by, until the points reach the Craft Level;\n- it works only for the **customer it was made for**, and is an Arcane Connection to them.\n\n**Try it:** name it and its power, choose who it is for, and **Begin it**; **Work a season on it** adds the season’s points (on the Seasons page, as every season is). Finished, it goes on the customer’s Items tab. A damaged wondrous item stops working.',
        at: plan, needs: 'character', target: ['workshop-wonder', 'table-plan'],
      },
      {
        title: 'The guild',
        body: 'In a town each craft is run by its **guild**. With the guild rule on (Saga Overview → Optional rules), a craftsman holds a rank:\n- an **apprentice** learns the trade;\n- a **journeyman** works for others by contract;\n- a **master** keeps a workshop and votes in the guild;\n- a **senior master** and the **dean** run it.\n\nEach rank needs Guild Lore and a few other Abilities at a set score; the Guild card says what is missing, and what the next rank costs.',
        at: table('guild'), needs: 'character', target: ['guild', 'workshop'],
      },
      {
        title: 'The covenant’s craftsmen',
        body: 'Your covenant’s craftsmen save it money in the category their craft serves, as in *Covenants*: a carpenter on Buildings, a smith on Consumables (1 + half their Craft a year, the whole Craft for a rare craft). With City & Guild each also earns Labor Points, more simply: the line under each shows a season’s points, the year’s after the 36 upkeep, and those **banked**. A covenant craftsman’s points are banked **when the year closes**, and spent here on **Innovation** and **Raw Materials** (grey until enough are banked). Each one’s Virtues and Flaws at the work show green and red, with the score they work at; ✕ on a Flaw once it is got over in play, healed by magic or a story.',
        at: table('guild'), needs: 'saga', target: 'craftsmen-work',
      },
      {
        title: 'Hiring and letting go',
        body: 'A covenant hires more people as the saga goes on: to save more as it grows, to replace one who grows old, or one a Flaw holds back. **Look for** lists the crafts where one more would save money first, with the pounds a year. **Look for a craftsman** brings three who would come, met at random: age, Craft, Dexterity, the score they work at, Labor Points, what they would save, and their Virtues and Flaws. **Hire** takes one on, recruited in play: no Build Points, only an inhabitant’s upkeep (a place at table, and the Wages line). **Let one go** says goodbye; Build Points spent are not returned. Craftsmen bought when the covenant was founded cost the score they work at: a covenant pays for the craftsman it gets. The Tribunal’s covenants hire at each year’s end, and their old craftsmen retire from 60; yours are reminded at 60.\n\n**Try it:** press **Look for a craftsman**.',
        at: table('guild'), needs: 'saga', target: 'cg-hiring', advance: { press: /^Look (for a craftsman|again)/ },
      },
      {
        title: 'A companion at the covenant’s work',
        body: '*Covenants* counts craftsmen among the covenfolk, so whether a companion or grog who spends their working seasons making the covenant’s wares counts too is the troupe’s call: tick them under **Members who make the covenant’s wares** on the covenant’s People tab. They save as a craftsman does, by the score they work at, and their working seasons go to the covenant, not their own workshop. They are not paid as such: the **Wages** line (a penny a week for each inhabitant point; a companion counts 3) is their pocket money, the covenant’s food and roof the rest, and anything more is an allowance or their own business.',
        at: (c) => (c.sagaId && c.covId ? R.covenant(c.sagaId, c.covId, 'folk', 'people') : undefined), needs: 'covenant', target: 'covenfolk-organization',
      },
      {
        title: 'Haggling and bribes',
        body: 'Magi send a grog or companion to buy for them, since The Gift sets prices soaring. **Sending someone to market**:\n- **Who goes**: each person’s appraise (Perception + Bargain) and bargain (Communication + Bargain), from their sheet.\n- **1. What are the goods worth?** Set the value and the kind of goods, then **Appraise**, against 9 (6 for common goods or their own trade, 12 for rare). Success: they know the real value and cannot be overcharged.\n- **2. How low will the seller go?** Pick the kind of seller, then **Bargain**: each 3 points the buyer wins by takes 10% off, never below half. **Pay** takes it from the buyer chosen at the top.\n- **Bribes** buy a word or a bed for the night: a day’s pay takes 1 off that roll’s Ease, a week’s 3.\n\nEach result shows under its own button.\n\n**Try it:** press **Appraise**.',
        at: table('guild'), needs: 'saga', target: 'haggle', advance: { press: /^Appraise/ },
      },
      {
        title: 'Damaged goods',
        body: 'When a botch or rough use puts a valued item at risk (a sword in a botched fight, a cloak used as a rope), check it under **Damaged goods**. Choose **whose** it is and **the item**: one of their things, or a kind of thing not kept. The card shows its **damage levels** (from its quality, more for a big thing, twice for a lock) and the chance. The **Ability** is a list: the item’s own by default, or another of theirs. **Previously repaired** is one −1, however many repairs. **Roll the check**: a stress die and the modifiers against 15; a failure costs a level, a botch more. The damage is **kept on the item**, among its owner’s Possessions, so it is still there when you come back to it. **Repair it** while it is only damaged; a broken item cannot be repaired.\n\n**Try it:** choose your craftsman and an item, then press **Roll the check**.',
        at: table('guild'), needs: 'saga', target: 'item-check', advance: { press: /^Roll the check/ },
      },
      {
        title: 'What they own',
        body: 'Everything a character owns is kept on the Game Table’s **Possessions** page: weapons, shields, armor, enchanted items and other things (tools, a cart, a wondrous item), each with its damage. Add something they own at the bottom; **give** a thing to someone else (its damage goes with it); **Discard** one that is broken. Their sheet lists it all for reference.',
        at: table('items'), needs: 'character', target: 'possessions',
      },
      {
        title: 'Travel, trade and intrigue',
        body: 'The rest of the book is at the bottom of City & Guild, under **Travel, trade and intrigue**. Choose **who acts** at the top; open a part to use it: a journey’s days and cost by road, river or sea, and finding things on the way; ships in a chase; bribes, hired criminals and sabotage; intrigue against nobles; a house’s Reputation; dowries. Each roll says what it adds and the chance, and its result appears in that part. That is the whole of it: a working character’s seasons earn points, the year takes 36, and the rest builds a better business and a better life.',
        at: table('guild'), needs: 'saga', target: 'table-trade',
      },
    ],
  },
  {
    id: 'divine',
    title: 'Faith, miracles and holy powers (The Divine)',
    blurb: 'What Realms of Power: The Divine adds: True Faith and Faith Points, holy powers worked with a Method and a Power, tragedies of hubris, prayers for miracles, God’s aid, the saints, tempers, the Divine Ascent, and how to build a holy character of your own.',
    group: 'In play',
    inSaga: true,
    prefers: 'companion',
    prefersHoly: true,
    practice: {
      type: 'companion', role: 'holy-worker', label: 'a practice holy wonder-worker',
      answers: { 'f-divine-powers': 10, 'vf:invocation': 10, 'vf:blessing-power': 10, 'vf:true-faith': 10 }, ensure: ['true-faith'],
    },
    steps: [
      {
        title: 'Faith at the table',
        body: '*Realms of Power: The Divine* is about people whose faith does things: a priest whose blessing holds, a hermit who heals by fasting, a knight who prays and is answered. Everything it adds in play is here, on the Game Table’s **Dice › Faith & miracles** page, for whoever is picked at the top. This tutorial works on a practice holy companion with **True Faith**, the Method **Invocation** and the Power **Blessing**, and has you use each part as it goes. A character with none of these still has a use for the page: anyone with Confidence can invoke God’s aid or a saint.',
        at: dice('holy'), needs: 'character', target: 'holy-here',
      },
      {
        title: 'Here and now: the aura',
        body: 'The Dominion is God’s presence in a place: about 1 in the countryside, 2 in a town, 3 in a city, 4 or 5 in a church. A **Divine aura adds its strength** to every holy total on this page, and takes from Hermetic magic. It is one point weaker at night and one stronger on a holy day.\n\n**Try it:** set the realm to **Divine** and the strength to **3**, as if standing in a town church. Every total below now carries +3.',
        at: dice('holy'), needs: 'character', target: 'holy-here',
      },
      {
        title: 'True Faith and Faith Points',
        body: 'The **True Faith** Virtue gives a **True Faith Score** of 1 and a **Faith Point**; each time it is taken again the Score rises (a Score of 2 or more is for Mythic Companions). The Score gives **Magic Resistance of Faith × 10**. Faith Points are spent like Confidence, under any roll: +3 each, as many at once as the Score. They **come back at dawn** up to the Score: press **Dawn** when a new day begins. The list beside it adds the Faith Point a sacrament or a pilgrimage gives. A relic has Faith Points of its own.',
        at: dice('holy'), needs: 'character', target: ['holy-faith', 'holy-here'],
      },
      {
        title: 'Where the character stands',
        body: '**Holy standing** keeps what does not change from day to day. The **holy tradition** (Ascetics, Cantores, Sufis, Kabbalists…) names the four Abilities its members learn without the usual penalty. A **commanding aura** is the Magic Resistance of high office: 10 for an archbishop or a crowned king, 20 for a cardinal, 25 for the Pope. **Embodying the Light** lists what a True Faith Score of 2, 3 and 5 brings: Premonitions, Faith Points worth +6, an aura of one’s own. Tragedies suffered are recorded here.',
        at: dice('holy'), needs: 'character', target: ['holy-standing', 'holy-here'],
      },
      {
        title: 'A Method and a Power',
        body: 'A holy power takes **two Abilities together**. The **Method** is how the character prays: **Invocation** aloud (Communication), **Meditation** in stillness (Intelligence), **Purity** through fasting and hardship (Stamina). The **Power** is what the prayer does: Blessing, Cursing, Adjuration, Intervention, Transcendence, Understanding, Wonders. Each is a Major Virtue, and **a Method calls only some Powers**: Invocation calls Adjuration, Blessing, Cursing and Wonders; Meditation calls Blessing, Intervention, Transcendence and Understanding; Purity calls Adjuration, Cursing, Intervention and Transcendence. The lists here show only pairs this character can use.',
        at: dice('holy'), needs: 'character', target: 'holy-powers',
      },
      {
        title: 'Choose the effect',
        body: 'Open **Effect**. **Guidelines** are the book’s levels for this Power (a *General* one scales with the level you choose); **The book’s effects** are its named examples, ready to use. Or keep **design one** and set a base level with Range, Duration and Target, as for a Hermetic spell. There are no Rituals and no vis: an effect that would need a Ritual in Hermetic magic (permanent, a Boundary) ticks **as a Ritual would be** and adds four magnitudes instead.\n\n**Try it:** choose the first General guideline under Blessing and leave the base level at 5: Magic Resistance for the one blessed.',
        at: dice('holy'), needs: 'character', target: ['holy-effect', 'holy-powers'],
      },
      {
        title: 'Call it',
        body: 'The **Total** is the Method’s Characteristic + Method + Power + aura; a die is added and set against the effect’s level. Hold the pointer on the Total (or tap it) to see the sum. Each Method has a price, paid when the effect is called: **Invocation spends a Confidence Point** (or a Faith Point), Meditation takes an hour with a Stamina roll every ten minutes, Purity costs a long-term Fatigue level or a Light Wound. With Invocation you may **Entreat** (a simple die) or **Command** (a stress die: more reach, and a botch is possible).\n\n**Try it:** press **Entreat**. The Confidence Point is spent on the sheet, and the line below says whether the blessing took.',
        at: dice('holy'), needs: 'character', target: ['holy-call-effect', 'holy-powers'], advance: { press: /Entreat|Call the effect/ },
      },
      {
        title: 'After the roll, and tragedies of hubris',
        body: 'Under the result, **After the roll** offers Confidence and Faith Points to raise it, as under every roll. If the total still falls short the effect fails, and worse may follow: a **tragedy of hubris**, minor when short by 1 to 10, major by 11 to 20, ultimate beyond. Each Power has its own (a blessing withdrawn, a curse that turns on its maker). **True Faith softens it**: the tragedy is judged on Faith × 10 when that is higher than the total, so a character with True Faith 1 calling a level 10 effect risks none. A botch adds a Warping Point for each zero. So a holy character calls what they can reach, and keeps Faith Points in hand.',
        at: dice('holy'), needs: 'character', target: 'holy-powers',
      },
      {
        title: 'Praying together: Ceremony',
        body: 'Others may pray with the one who calls, when someone among them has the **Ceremony** Ability (the line shows once anyone in the saga does). Tick who joins: each adds their own Characteristic + the same Method (the Characteristic alone without it), and a congregation with no sheets can be counted in by number. **Led by** names a leader with Ceremony: as many others count as the leader’s score. With no leader everyone counts, and the group adds its Ceremony scores less the number praying. A congregation behind a priest is how great effects are reached.',
        at: dice('holy'), needs: 'character', target: ['holy-ceremony', 'holy-powers'],
      },
      {
        title: 'Pray for a miracle',
        body: 'Anyone with a **Faith Point** may ask God for a miracle, with no Method or Power at all (an optional rule of the book). Set the level of what is asked, **how soon** it is needed (at once +10, within a year −10) and **how great the need** (calamitous −15, frivolous +10): together they make the level. The prayer costs a Faith Point and rolls a stress die + True Faith + Concentration + aura. A miracle cannot be resisted or undone. A botch takes every Faith Point away for weeks.',
        at: dice('holy'), needs: 'character', target: 'holy-miracle',
      },
      {
        title: 'God’s aid for a scene',
        body: 'Before a trial that serves the faith, a character may **invoke God’s aid**: a Confidence Point (a Faith Point with True Faith), and a stress die + Communication + Dominion Lore. A total of 9 gives **+1**, 15 gives +2, 24 gives +3, to every roll toward the named objective for the scene, until one fails. The aid is kept on the sheet and **offered as a tick on the Roll card**, so it is not forgotten in the fight.',
        at: dice('holy'), needs: 'character', target: 'holy-aid',
      },
      {
        title: 'The saints',
        body: 'A Christian may call on a **saint** once a day, and a Muslim on a **holy forbear** at the shrine: Communication + Charm + the modifiers ticked (at the tomb, a feast day, a donation, a pilgrimage) against 15 + a die the storyguide rolls unseen. A saint who answers works one of its powers, paid from its Might until dawn: the list shows what each can do. A saint who refuses may be **threatened** (the relics taken from the altar, the bones exposed), at the risk of its curse. The book’s twelve are here, and you can add your own patron.',
        at: dice('holy'), needs: 'character', target: ['holy-saints', 'holy-invoke-saint'],
      },
      {
        title: 'Holy influence and tempers',
        body: 'One with spiritual authority can **influence** a willing person toward a virtue (a Personality Trait raised for a time), or **temper the aura** of a place: Presence + Leadership, +1 at 9, +2 at 15, +3 at 24. A tempered aura adds to rolls that suit its virtue and takes from those against it, for everyone there; the seven tempers stand against the seven deadly sins. The temper is kept on the sheet and **offered on every Roll**. Two holy characters tempering one aura differently make a **schism**, and the tempers cancel.',
        at: dice('holy'), needs: 'character', target: ['holy-influence', 'holy-tempers'],
      },
      {
        title: 'The Divine Ascent',
        body: 'Holy characters Warp in their own way. When one with a Holy Method or Power gains **two or more Warping Points at once**, roll here: Presence + Concentration (or Meditation) against Warping Score + the points + True Faith + the aura. On a failure the character is **lifted into the Divine** for days (months at Warping Score 6), and gains more Warping Points. Its form is chosen once for life: the **Divine Gloom** (experience moves from mundane Abilities to holy ones), the **Divine Form** (Magic Resistance and Soak from the Warping Score), or **Divine Unity** (one virtue made flesh). Mystics welcome it; one with Meditation may subtract it from the roll.',
        at: dice('holy'), needs: 'character', target: 'holy-ascent',
      },
      {
        title: 'Rites and works of a season',
        body: '**Rites and holy places** holds what takes a ceremony or a season: a **Dominion rite** to consecrate a place, a celestial regio entered, the search for the *Ars Notoria*. Characters with the right Abilities see more cards: the **Rings of Solomon** (the Ars Notoria’s orations, each lasting for seasons), and a kabbalist’s **amulets, golems, True Names and Shinnui Shem**, worked a season at a time here or on the Seasons page.',
        at: dice('holy'), needs: 'character', target: 'holy-rites',
      },
      {
        title: 'Holy Magic, for magi',
        body: 'A magus with the **Holy Magic** Virtue works Hermetic magic in God’s service, and plays on **Dice › Spellcasting** like any magus, with differences the page applies. The Dominion counts as a Magic aura, and an Infernal one takes nothing away. There are no Hermetic words or gestures: a **prayer** (Presence + Theology, 15 or more) or a Method’s activity stands for them. Rituals add a **Method and a Power** in place of Artes Liberales and Philosophiae, and **long-term Fatigue stands for Ritual vis**, three pawns a level. Laboratory Texts are halved between holy and Hermetic magi.',
        at: dice('magic'), needs: 'character', target: ['holy-call', 'tab-dice'],
      },
      {
        title: 'Building a holy character',
        body: 'To make one of your own, start a character on the **People** page. For a companion, pick the **Faithful / Holy** theme on the Concept step; in the guided build, rate *“work wonders through prayer”* high and the build takes a Method and a Power that go together, with no Flaw at odds with a living faith. By hand, on Virtues & Flaws, search for **True Faith**, a Method (Invocation, Meditation, Purity) and a Power. A **Mythic Companion** can be one of the book’s own: a **Nephilim**, a Cathar **Perfectus**, a Sufi **Zahid** or a **Kabbalist**, each with its required Virtues set for you. A magus takes Holy Magic as a Major Hermetic Virtue. Quick build has a *Holy wonder-worker* role too.',
        at: sagaPage('people'), needs: 'saga', target: ['create-mythic', 'create-companion'],
      },
    ],
  },
  {
    id: 'tribunal',
    title: 'The Tribunal: living covenants',
    practice: { type: 'magus', label: 'a practice magus' },
    blurb: 'Bring the other covenants of the Rhine Tribunal into the saga from Guardians of the Forests, and keep up with them as the seasons pass: their magi and priorities, what they bring to your covenant, the gatherings and the Great Library.',
    group: 'Storyguide',
    inSaga: true,
    steps: [
      {
        title: 'The Tribunal page',
        body: '**The Tribunal** in the saga’s menu holds the other covenants of the saga’s Tribunal. For now the toolkit has the Rhine’s, from *Guardians of the Forests*; a saga set elsewhere is offered the switch: press **Set the saga’s Tribunal to Rhine** to follow along.',
        at: sagaPage('tribunal?tab=covenants'), needs: 'saga', target: ['tribunal-switch', 'nav-tribunal', 'tribunal-covenants'], advance: { press: /Set the saga’s Tribunal/ },
      },
      {
        title: 'Bringing the covenants in',
        body: 'Press **Add** for one covenant or **Add all**. Each magus the book names is made as a full character with the book’s House, age, rank, gild and traits, strongest in the Arts it gives; the magi it only counts are generated too. Each gets a laboratory, and the covenant its covenfolk, library, vis and accounts. A covenant takes a few seconds; the whole Tribunal some twenty.',
        at: sagaPage('tribunal?tab=covenants'), needs: 'saga', target: 'tribunal-covenants', advance: { press: /^Add/ },
      },
      {
        title: 'Kept apart',
        body: 'Their covenants and people stay off the players’ lists: People, Covenants, the Saga Overview and the Game Table show only yours. Each living covenant has a card here (its magi and what they did last season, its neighbors, how it may come to you) and a page of its own.',
        at: sagaPage('tribunal?tab=covenants'), needs: 'saga', target: ['tribunal-living', 'tribunal-covenants'],
      },
      {
        title: 'Season priorities',
        body: 'Their magi follow a **priority list** when the seasons pass: service to the covenant, politics, travel, writing, reading the best book, vis study, a new spell, an enchanted item, the lab, and a season a year for an apprentice. Each entry is a season a year; the first that can be done is taken, and a Longevity Ritual comes when it is needed. Any character can have one: it is part of their season in full, here.',
        at: plan, needs: 'character', target: ['priorities', 'table-plan'],
      },
      {
        title: 'Gatherings',
        body: 'The Rhine Tribunal meets at Durenmar every seven years from 1221, opening on Walpurgis Night (Spring), in 1227 a year early for the Grand Tribunal; the Bjornaer gather at Crintera every twelve, and the Grand Tribunal meets at Durenmar in 1228. Every living magus spends a gathering’s season there; your magi are expected too. New masters and archmagi are made there, and magi of covenants at odds may settle a quarrel by certamen.',
        at: sagaPage('tribunal?tab=covenants'), needs: 'saga', target: 'tribunal-gatherings',
      },
      {
        title: 'Motions and votes',
        body: 'The motions the book has coming before the Tribunal (Heorot’s admission, the Praeco, Rügen, a Lotharingian Tribunal, war on the Norse wizards), each gild’s and covenant’s stand, and how the sigils would fall as things stand. Set how your magi vote at the Game Table’s **Society & the Tribunal** page; the gathering counts every sigil (a master holds a retired magus’s by proxy, an archmage two, and House Tremere’s exarchs cast the rest of their House’s).',
        at: society('news'), needs: 'saga', target: ['tribunal-votes', 'society-gatherings'],
      },
      {
        title: 'Wanderers',
        body: 'Tabanus the Quaesitor stays a few years at each covenant as its guest; Felicia winters at Fengheld and summers on the road. They come with the covenant they start at, keep a laboratory of their own, and may ask to stay with you: **Take them in** here or on their request.',
        at: sagaPage('tribunal?tab=covenants'), needs: 'saga', target: ['tribunal-wanderers', 'tribunal-gatherings'],
      },
      {
        title: 'What they bring to you',
        body: 'At each year’s end a living covenant may come to yours with one of the book’s offers, requests or troubles. They show on the Game Table’s **Society & the Tribunal** page, and on its Overview under **Needs attention**, with a link to where each is dealt with; press **Dealt with** once it is played. One left unanswered for two years lapses. Agents bound to your characters may also bring word of the covenants’ own business.',
        at: society('news'), needs: 'saga', target: 'tribunal-news',
      },
      {
        title: 'Dealing with them',
        body: 'Open a living covenant’s card and **Deal with** it: trade vis or silver either way, or buy a copy of one of its books for vis or silver. Both covenants’ stores and chronicles change; the storyguide decides the terms.',
        at: sagaPage('tribunal?tab=covenants'), needs: 'saga', target: ['tribunal-living', 'tribunal-covenants'],
      },
      {
        title: 'The Great Library',
        body: 'Durenmar’s library is stocked as the greatest of the Order (six summae on each Art, three copies of Principia Magica, Lab Texts for the standard spells). For a magus who goes to study there: the book’s rolls for a summa of the Level wanted, a tractatus’s Quality, a spell’s or an enchantment’s Lab Text, and the seasons of study a contribution earns.',
        at: sagaPage('tribunal?tab=covenants'), needs: 'saga', target: 'tribunal-library',
      },
      {
        title: 'Forests and the Courts of the Seasons',
        body: 'The **Forests & Courts** tab has the rest of the book’s fourth chapter: the four faerie courts of the seasons with their Might Pools and auras for the saga’s current months, which of Bright Winter and Dark Summer holds the Rhine Gorge now, what forest spirits become and what they can do, and the trees of Germany with their Shape and Material bonuses.',
        at: sagaPage('tribunal?tab=forest'), needs: 'saga', target: 'tribunal-courts',
      },
      {
        title: 'Places, seeds and the years to come',
        body: '**Places & seeds** searches the book’s regions and places (auras, what it says of vis, its asides) and its story seeds. **Timeline** shows what the book has coming from the saga’s year on, for the storyguide to bring about or prevent, and its history of the Rhine.',
        at: sagaPage('tribunal?tab=places'), needs: 'saga', target: 'tribunal-places',
      },
      {
        title: 'Founding a covenant',
        body: 'The Rhine recognizes a new covenant only with a sponsor from every other covenant. **Sagas & founding** tracks your bid: each covenant’s likely terms from how it stands with you, the sponsoring magus, what you promised and the gift. When every covenant has promised, the next gathering recognizes the covenant; a bid still lacking one is refused until the next. The book’s saga ideas follow.',
        at: sagaPage('tribunal?tab=sagas'), needs: 'saga', target: 'tribunal-founding',
      },
    ],
  },
  {
    id: 'season',
    title: 'Play a season',
    practice: { type: 'magus', label: 'a practice magus' },
    blurb: 'Between stories: plan each character’s season, move time on for the whole saga, and see the year’s end.',
    group: 'In play',
    inSaga: true,
    steps: [
      {
        title: 'Plan the season',
        body: 'On the Game Table’s **Seasons** page, pick a character and plan what they do this season in full: study from a book, practice, train, teach, or a lab project. The toolkit works out the experience and logs it on their sheet.',
        at: plan, needs: 'character', target: ['plan-season', 'table-plan'],
      },
      {
        title: 'When nothing is planned',
        body: 'A standing activity (practice an Ability, read from the library, work in the lab, teach covenant-mates, be taught by one, help in a covenant-mate’s lab) runs in any season nobody plans, so a fast-forward still advances everyone sensibly. Free seasons come first: a magus has four, a working character two (Wealthy three, Poor one) and works the rest, a Regular gives one to Worship, and one who needs no sleep has two more for study. **Seasons a year** shows them, and can be set by hand.',
        at: plan, needs: 'character', target: ['season-plan', 'standing', 'table-plan'],
      },
      {
        title: 'Writing and copying',
        body: 'A book, a copy, lab texts or a florilegium is begun here and worked a season at a time, from this card or as the standing activity in free seasons; the finished work goes to the covenant library, and a season with points to spare goes on to the next one begun. Glossing a book read this season and clarifying one are here too.',
        at: plan, needs: 'character', target: ['writing', 'table-plan'],
      },
      {
        title: 'Move time on',
        body: 'Read **what to expect** first: what will fall short, what comes due, who has nothing to do. Then **End** the season for the whole saga at once. Each character does what they planned or their standing activity; what it leaves to decide waits at the top, under **Resolve**, and the season is told as a story in the **Chronicle**.',
        at: table('seasons'), needs: 'saga', target: 'seasons-advance',
      },
      {
        title: 'The year’s end',
        body: 'Winter’s end closes each covenant’s books (each source of income rolling its year, if ticked), gathers the year’s vis, pays allowances, renews wards, rolls aging (the covenant’s best physician tends anyone in a crisis) and adds the year’s Warping. The covenant’s scribes make the copies queued in the scriptorium, and a book being clarified is done once its years in the aura are up. A Dominion grows or fades with its congregation, and with the optional aura variation a Magic aura may move. The checkboxes choose what runs.',
        at: table('seasons'), needs: 'saga', target: ['seasons-advance', 'table-season'],
      },
      {
        title: 'The Market',
        body: 'Buy books, teachers, covenfolk, services and vis in play, at the books’ prices, from the covenant’s treasury or a character’s purse. A grog can haggle the price down, and bribes are paid here.',
        at: table('market'), needs: 'saga', target: 'market-who',
      },
    ],
  },
];

export const TOUR_BY_ID = new Map(TOURS.map((t) => [t.id, t]));

/**
 * Every tutorial in one run, in the order that builds on what came before: the saga, its covenant
 * and its characters, then magic, play between stories and at the table, and the storyguide's
 * tools. Each can be skipped; one that needs something not yet made offers a practice one.
 */
export const COURSE = ['toolkit', 'saga', 'covenant', 'magus', 'companion', 'grog', 'guided', 'optional', 'spell', 'power', 'lab', 'season', 'table', 'city-guild', 'divine', 'quick', 'tribunal'];

/** The tutorial after this one in the run. */
export function nextTour(id: string): Tour | undefined {
  const i = COURSE.indexOf(id);
  return i >= 0 && i < COURSE.length - 1 ? TOUR_BY_ID.get(COURSE[i + 1]) : undefined;
}

/** What a tutorial works on: a character (not one it makes), a covenant (not one it founds). */
export function tourNeeds(t: Tour): { character: boolean; covenant: boolean } {
  return { character: !t.makesCharacter && t.steps.some((s) => s.needs === 'character'), covenant: t.id !== 'covenant' && t.steps.some((s) => s.needs === 'covenant') };
}

/** Pages with a tutorial of their own: a tutorial that reaches one offers to step into it. */
export const DETOUR_OFFERS: { match: RegExp; tour: string; label: string }[] = [{ match: /^\/saga\/[^/]+\/character\/[^/]+\/guided/, tour: 'guided', label: 'Walk me through the guided build' }];

/** Start a tutorial, in the saga open now (or the one the tutorial before it used); `course` runs every tutorial after it in turn. */
export function startTour(id: string, o: { course?: boolean; sagaId?: string } = {}) {
  const st = useStore.getState();
  const sagaId = o.sagaId && st.sagas[o.sagaId] ? o.sagaId : st.activeSagaId && st.sagas[st.activeSagaId] ? st.activeSagaId : undefined;
  st.setTour({ id, step: 0, sagaId, startedAt: new Date().toISOString(), course: o.course || undefined });
}
