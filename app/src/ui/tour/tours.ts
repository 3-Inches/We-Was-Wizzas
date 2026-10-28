// The guided tutorials on the Guide page. Each is a list of steps; a step says where it happens
// (the panel offers to go there, and Next goes there itself), which control to point at (a
// data-tour name, the first found on the page), and, in the character wizard, which step to open.
// Steps explain, and the player does the clicking; a step can also offer to do the work (build a
// whole draft, apply a package), or to step into another tutorial and come back.

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
  steps: TourStep[];
}

const saga = (c: TourCtx) => (c.sagaId ? `/saga/${c.sagaId}` : undefined);
const sagaPage = (page: string) => (c: TourCtx) => (c.sagaId ? `/saga/${c.sagaId}/${page}` : undefined);
const wizard = (c: TourCtx) => (c.sagaId && c.charId ? `/saga/${c.sagaId}/character/${c.charId}/create` : undefined);
const sheet = (tab: string) => (c: TourCtx) => (c.sagaId && c.charId ? `/saga/${c.sagaId}/character/${c.charId}?tab=${tab}` : undefined);
const covenant = (tab: string) => (c: TourCtx) => (c.sagaId && c.covId ? `/saga/${c.sagaId}/covenant/${c.covId}?tab=${tab}` : undefined);
const page = (path: string) => () => path;
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
    body: 'The sheet is for play, and its tabs follow play: **Combat & Health** for fights, **Seasons & Aging** between stories. Click any underlined total to see how it is worked out. **Stat block** gives a printable summary.',
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
        body: 'Everything belongs to a saga: its characters, its covenant and the troupe’s house rules. Name one here and press **Begin a new saga**, or import a file someone exported.',
        at: page('/'), target: 'new-saga',
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
        title: 'Dice',
        body: 'Simple and stress dice with botch dice, rolled and explained. The character sheets roll their own totals too.',
        at: page('/dice'),
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
        body: 'A saga holds everything else. Its **Tribunal** brings that Tribunal’s customs and optional rules; the **year and season** set when play begins. After that, time moves on the Seasons page.',
        at: saga, needs: 'saga', target: 'saga-card',
      },
      {
        title: 'Books',
        body: 'Choose the books the troupe uses. Only their Virtues, spells and rules appear in the pickers, so a player cannot take something from a book the saga does not use.',
        at: sagaPage('rules?tab=books'), needs: 'saga', target: 'tab-books',
      },
      {
        title: 'Optional rules',
        body: 'Supplement systems the troupe can turn on or off: illness, lab routines, aura variation, agents and the Society tools, House Mysteries, guilds, and the customs of the saga’s Tribunal. Each says what it adds, its book, and where it shows; turn one off and its cards leave the sheets.',
        at: sagaPage('rules?tab=optional'), needs: 'saga', target: ['optional-rules', 'tab-optional'],
        detour: { tour: 'optional', label: 'Show me where each one appears' },
      },
      {
        title: 'Creation rules & rulings',
        body: 'The numbers characters are built by (Characteristic points, Flaw limits, experience) and the troupe’s rulings. Change one and every character in the saga is checked against it.',
        at: sagaPage('rules?tab=rules'), needs: 'saga', target: 'tab-rules',
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
        at: saga, needs: 'saga', target: 'found-covenant',
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
        at: covenant('folk'), needs: 'covenant', target: 'covenfolk-organization',
      },
      {
        title: 'Soldiers',
        body: 'Soldiers from the Residents Boons and Free Choices: how many, their pay (a pound a year for each penny a day), their horses and kit. Those who live at the covenant count among its inhabitants.',
        at: covenant('folk'), needs: 'covenant', target: 'soldiers',
      },
      {
        title: 'Each year',
        body: 'What the covenant spends every year besides upkeep: Redcap visits, feast days (four or more earn a Loyalty point a year), guests, hired hands. Weapons and armor points can be worked out from the turb.',
        at: covenant('folk'), needs: 'covenant', target: 'yearly',
      },
      {
        title: 'Craft magic',
        body: 'Rego (or Creo) magic in place of craftsmen: design a spell from the craft guidelines or take one a magus knows, then see the Finesse roll, its chance, how many rolls a year, and what it saves.',
        at: covenant('folk'), needs: 'covenant', target: 'craft-magic',
      },
      {
        title: 'The turb’s day',
        body: 'Who stands which watch (day or night patrol, four watches, single or double duty) and who is on duty, off duty or asleep at any hour; the rolls to stay awake on sentry and against double duty’s Fatigue; drilling a group faster; and rewards and punishments marked on a grog’s sheet, with the Loyalty Points one a magus orders costs.',
        at: covenant('folk'), needs: 'covenant', target: 'turb',
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
    steps: [
      {
        title: 'The optional rules',
        body: `Rules from the supplements that add detail, by area: health, the laboratory, the covenant, society and influence, Houses and Mysteries, and the saga’s Tribunal. Each row names its book and where it shows, with the book’s text a click away. Most start on (unless the saga does not use their book); ${list(startOff)} start off. A tick changes the saga for everyone.`,
        at: sagaPage('rules?tab=optional'), needs: 'saga', target: ['optional-rules', 'tab-optional'],
      },
      {
        title: 'The Tribunal’s customs',
        body: `A saga set in ${list(tribunals.map((t) => (t === 'Transylvan' ? 'Transylvania' : t === 'Theban' ? 'Thebes' : t === 'Rhine' ? 'the Rhine' : t)))} is offered that Tribunal’s own rules here on the saga page, off until ticked. They apply only while the saga is set there.`,
        at: saga, needs: 'saga', target: ['saga-options', 'saga-card'],
      },
      {
        title: 'Health',
        body: 'Each rule shows where it applies. **Disease and illness** is the Illness card on Combat & Health: catching a disease, its penalty, a physician’s Prognosis and the recovery rolls.',
        at: sheet('combat'), needs: 'character', target: ['illness', 'tab-combat'],
      },
      {
        title: 'The laboratory',
        body: '**Non-standard lab routines** add choices to every lab project with a Lab Total (Early Riser, Nocturnal, overtime), for a bonus and a cost in health and Warping. **Original research** has a card of its own, for Discoveries toward a Breakthrough.',
        at: sheet('lab'), needs: 'character', target: ['lab-projects', 'original-research', 'tab-lab'],
      },
      {
        title: 'Society and the Tribunal',
        body: 'The Overview holds **Agents**, the **Society** card (a debate, a petition to the Church, a quick trial, an etiquette performance) and the Tribunal’s customs (ranks and gilds, tokens and shards, privileges), each while its rule is on.',
        at: sheet('overview'), needs: 'character', target: ['society', 'agents', 'tribunal-customs', 'tab-overview'],
      },
      {
        title: 'Seasons, Mysteries and guilds',
        body: '**Mystery Initiation** is planned on Seasons & Aging, for Bjornaer, Criamon, Merinita and Verditius magi and anyone with a cult Lore. A craftsman in a guild has a **Guild** card beside the workshop. **Extended book Quality** makes the Writing and copying card count skilled artisans and resonant materials by default.',
        at: sheet('advancement'), needs: 'character', target: ['mysteries', 'guild', 'writing', 'plan-season'],
      },
      {
        title: 'The covenant',
        body: '**Aura variation** adds to the Aura card the base aura, the stronger auras pressing on it and this year’s modifier, and the year’s end rolls for it. **Library research** is a roll on the Library tab; the Theban patrons, the Perthean Compact and the Hermetic Tourney show on the covenant too.',
        at: covenant('overview'), needs: 'covenant', target: ['aura', 'covenant-members'],
      },
      {
        title: 'Turning one off',
        body: 'A rule turned off takes its cards away, unless a character already has something recorded there (an illness, an agent, an Initiation), which stays in sight. Nothing is deleted: turn the rule back on and it is all there. In **Game mechanics**, each topic an optional rule governs says so, and whether this saga uses it.',
        at: sagaPage('rules?tab=optional'), needs: 'saga', target: ['optional-rules', 'tab-optional'],
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
        at: saga, needs: 'saga', target: 'create-magus',
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
        body: 'The **Magic** tab has Casting Scores, Lab Totals, Penetration and Magic Resistance. Set the aura (its realm, a regio, the hour for a Dominion or an Infernal aura; one aligned with an Art counts double for it) and the circumstances at the top, and every total follows. **Lab, Items & Familiar** runs lab projects season by season.',
        at: sheet('magic'), needs: 'character', target: ['magic-circumstances', 'tab-magic'],
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
        at: saga, needs: 'saga', target: 'create-companion',
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
        at: saga, needs: 'saga', target: 'create-grog',
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
    steps: [
      {
        title: 'Themes first',
        body: 'On the Concept step, pick one to three themes (Warrior, Scholar, Healer, Faerie-touched…). Each answers some of the guided build’s questions for you, so there are fewer to go through.',
        at: wizard, needs: 'character', wizard: 'basics', target: ['concept-themes', 'step-basics'],
      },
      {
        title: 'Start it',
        body: 'Press **Start the guided build**. Nothing on the character changes until you build the draft or take an option, and the normal steps stay open the whole time.',
        at: wizard, needs: 'character', wizard: 'basics', target: 'guided-build',
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
        body: 'A finished magus invents a spell in the laboratory: plan the season on the **Seasons & Aging** tab, or run it from **Lab projects**.',
        at: sheet('advancement'), needs: 'character', target: 'plan-season',
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
        at: sheet('lab'), needs: 'character', target: ['lab-projects', 'tab-lab'],
      },
      {
        title: 'Enchantments',
        body: 'The Enchantments page designs enchanted devices and talismans, Longevity Rituals and vis extraction, and copies books and lab texts, all from the magus’s Lab Totals.',
        at: sagaPage('enchant'), needs: 'saga', target: 'tab-items',
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
        body: 'Each result shows its Virtues and Flaws, best Abilities and traits, and **How it was built**. **Keep** adds it to the saga (NPCs are listed apart in the sidebar), **↻** rolls that one again, and Undo takes back anything kept.',
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
    id: 'season',
    title: 'Play a season',
    blurb: 'Between stories: plan each character’s season, move time on for the whole saga, and see the year’s end.',
    group: 'In play',
    inSaga: true,
    steps: [
      {
        title: 'Plan the season',
        body: 'On a finished character’s **Seasons & Aging** tab, plan what they do this season: study from a book, practice, train, teach, or a lab project. The toolkit works out the experience.',
        at: sheet('advancement'), needs: 'character', target: 'plan-season',
      },
      {
        title: 'When nothing is planned',
        body: 'A standing activity (practice an Ability, read from the library, work in the lab) runs in any season nobody plans, so a fast-forward still advances everyone sensibly. Free seasons come first: a magus has four, a working character two (Wealthy three, Poor one) and works the rest, a Regular gives one to Worship, and one who needs no sleep has two more for study. **Seasons a year** shows them, and can be set by hand.',
        at: sheet('advancement'), needs: 'character', target: ['season-plan', 'standing'],
      },
      {
        title: 'Writing and copying',
        body: 'A book, a copy, lab texts or a florilegium is begun here and worked a season at a time, from this card or as the standing activity in free seasons; the finished work goes to the covenant library. Glossing a book read this season and clarifying one are here too.',
        at: sheet('advancement'), needs: 'character', target: 'writing',
      },
      {
        title: 'Move time on',
        body: '**End** the season for the whole saga at once. Each character does what they planned or their standing activity; the report says what happened.',
        at: sagaPage('seasons'), needs: 'saga', target: 'seasons-advance',
      },
      {
        title: 'The year’s end',
        body: 'Winter’s end closes each covenant’s books, gathers the year’s vis, pays allowances, renews wards, rolls aging (the covenant’s best physician tends anyone in a crisis) and adds the year’s Warping. The covenant’s scribes make the copies queued in the scriptorium, and a book being clarified is done once its years in the aura are up. A Dominion grows or fades with its congregation, and with the optional aura variation a Magic aura may move. The checkboxes choose what runs.',
        at: sagaPage('seasons'), needs: 'saga', target: 'seasons-table',
      },
      {
        title: 'The Market',
        body: 'Buy books, teachers, covenfolk, services and vis in play, at the books’ prices, from the covenant’s treasury or a character’s purse. A grog can haggle the price down, and bribes are paid here.',
        at: sagaPage('market'), needs: 'saga', target: 'market-who',
      },
    ],
  },
];

export const TOUR_BY_ID = new Map(TOURS.map((t) => [t.id, t]));

/** Pages with a tutorial of their own: a tutorial that reaches one offers to step into it. */
export const DETOUR_OFFERS: { match: RegExp; tour: string; label: string }[] = [{ match: /^\/saga\/[^/]+\/character\/[^/]+\/guided/, tour: 'guided', label: 'Walk me through the guided build' }];

/** Start a tutorial, in the saga open now if there is one. */
export function startTour(id: string) {
  const st = useStore.getState();
  st.setTour({ id, step: 0, sagaId: st.activeSagaId && st.sagas[st.activeSagaId] ? st.activeSagaId : undefined, startedAt: new Date().toISOString() });
}
