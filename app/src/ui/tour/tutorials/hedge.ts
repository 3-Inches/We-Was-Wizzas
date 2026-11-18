import { dice, plan, sagaPage, table } from '../places';
import type { StepVariant, Tour } from '../tours';
import type { Character } from '../../../engine/types';
import { hedgeTradition, type HedgeTradition } from '../../../engine/hedgeTraditions';

// The six traditions share a shape (who, the aura, cast or use, a season's work, the tradition's
// Warping), so one tutorial follows whichever the character has: a step that differs by tradition
// has a variant for each.
type Trad = HedgeTradition;
const TRADS: Trad[] = ['witch', 'learned', 'elemental', 'gruagach', 'vitki', 'nightwalker'];
const byTradition = (v: Partial<Record<Trad, Omit<StepVariant, 'when'>>>): StepVariant[] =>
  TRADS.flatMap((k) => (v[k] ? [{ when: (c: Character) => hedgeTradition(c) === k, ...v[k]! }] : []));

/** The cards a tradition's season is worked on, in the character's season in full. */
const SEASON_CARDS = ['witch-kitchen', 'hedge-season', 'hedge-amulet', 'hedge-refining', 'gruagach-season', 'vitki-season'];

export const hedgeTour: Tour = {
  id: 'hedge',
  title: 'Hedge magic (Hedge Magic)',
  blurb: 'The six traditions of Hedge Magic: folk witches, learned magicians, elementalists, gruagachan, vitkir and nightwalkers. Follows whichever the character has: the aura, casting, what the sheet keeps, a season’s work and its vis, and the tradition’s own Warping.',
  group: 'Magic',
  inSaga: true,
  prefers: 'companion',
  // one with enough of a tradition to work it (a lone Art casts nothing, and the page has no card for it)
  suits: (c) => !!hedgeTradition(c),
  practice: {
    type: 'companion', role: 'physician', label: 'a practice folk witch',
    ensure: ['folk-witch', 'the-gift', 'unstable-magic-flaw'], abilities: { 'witch-healing': 15, 'folk-witch-magic-theory': 15 },
  },
  steps: [
    {
      title: 'Hedge magic at the table',
      body: '*Hedge Magic* has six traditions outside the Order: **folk witches, learned magicians, elementalists, gruagachan, vitkir and nightwalkers**. Each is played on **Game Table › Dice › Hedge magic**, for whoever is picked at the top. This tutorial follows that character’s tradition. Its practice character is a folk witch.',
      at: dice('hedge'), needs: 'character', target: 'hedge-who',
    },
    {
      title: 'The aura',
      body: 'Hedge magic is of the **Magic realm**. A Magic aura adds its strength to the totals below, and the other realms’ auras change them as they change Hermetic magic.\n\n**Try it:** set the aura to **Magic** and the strength to **3**. The totals below rise by 3.',
      at: dice('hedge'), needs: 'character', target: ['hedge-aura', 'hedge-who'],
      variants: byTradition({
        nightwalker: { body: 'A nightwalker’s rolls take **no aura**, so the page shows none for them. Their card is next.', target: ['nightwalker', 'hedge-who'] },
      }),
    },
    {
      title: 'Cast or use',
      body: 'Each tradition has its own card for its magic, below the aura. It shows the total, what it is set against, and a button to roll.',
      at: dice('hedge'), needs: 'character', target: ['witch-power', 'hedge-charm', 'hedge-elemental', 'gruagach-cast', 'vitki-cast', 'nightwalker', 'herbalism', 'hedge-who'],
      variants: byTradition({
        witch: { title: 'Use a power', target: 'witch-power', body: 'A folk witch’s powers are **Supernatural Abilities**. **Use a folk witch power** rolls one by incantation or fetish: the Casting Score + a stress die against the effect’s Ease Factor. A Gifted witch may add vis.\n\n**Try it:** choose **Healing** and press **Roll Healing**.' },
        learned: { title: 'Cast a charm', target: 'hedge-charm', body: 'A learned magician casts a **charm known** by heart, or reads one **from a text**, which takes minutes and a Latin roll. The Casting Score + a die is set against the charm’s level. Within 10 below, it works for a Fatigue level.\n\n**Try it:** choose a charm and press **Cast the charm**.' },
        elemental: { title: 'Elemental magic', target: 'hedge-elemental', body: 'An elementalist rolls a **Technique** (Summoning, Controlling, Divining) with the **elements** ticked. The type of target matters: a pure element, a compound or a philosophical one. The card says what the total needs, and what it costs.\n\n**Try it:** tick an element and press its **Roll** button.' },
        gruagach: { title: 'Cast a gruagach spell', target: 'gruagach-cast', body: 'A gruagach casts a **spell known** (Casting Score + a die), or one **spontaneously** (a stress die, halved), against its level. A known spell may be varied by one Range, Duration, Target or size.\n\n**Try it:** choose a spell and press **Cast**.' },
        vitki: { title: 'Cast a rune script', target: 'vitki-cast', body: 'A vitki casts a **rune script** they know. Its name may be written, hidden (−2) or left off (−5), and so may its description. The Casting Total + a stress die is set against the script’s level. Vitkir cannot cast spontaneously.\n\n**Try it:** press **Cast**.' },
        nightwalker: { title: 'Straying and the night battles', target: 'nightwalker', body: 'A nightwalker’s spirit **strays** from the body: Stamina + Athletics, at a long-term Fatigue level. They may lead a willing person along. The card also sets a **fertility battle’s** outcome as the year’s harvest on the covenant’s land.' },
      }),
    },
    {
      title: 'What the sheet keeps',
      body: 'What a tradition knows is kept on the sheet, and shown here for reference. A card says where each thing changes.',
      at: dice('hedge'), needs: 'character', target: ['witch-things', 'learned-card', 'elemental-traits', 'gruagach-card', 'vitki-card', 'hedge-who'],
      variants: byTradition({
        witch: { title: 'Potions and fetishes', target: ['witch-things', 'hedge-who'], body: 'A folk witch’s **potions and fetishes** are made in a season in the kitchen. Once there are any, they are kept on this page, and a dose is drunk with its button. The apprenticeship and the powers are kept on the sheet.' },
        learned: { title: 'Charms known', target: 'learned-card', body: '**Charms known** lists the charms the magician knows by heart. New ones are invented or learned from a teacher in a season. The years under a master are kept on the sheet.' },
        elemental: { title: 'Elemental Traits', target: 'elemental-traits', body: 'As an elementalist’s Warping Score grows, they take on **Elemental Traits**: the nature of their elements shows in them. This card lists them and what each does.' },
        gruagach: { title: 'Spells known', target: 'gruagach-card', body: '**Spells known** lists the gruagach’s spells, from the book or designed on the sheet. New ones are invented in a season.' },
        vitki: { title: 'Runes and scripts known', target: 'vitki-card', body: 'The **24 runes** are raised as Arts. **Runes and scripts known** lists the scripts the vitki can cast. New ones are invented or learned in a season.' },
        nightwalker: { title: 'Nothing more to keep', target: 'nightwalker', body: 'A nightwalker keeps nothing more here: their straying is all on the one card.' },
      }),
    },
    {
      title: 'A season’s work',
      body: 'Anything that takes a season is worked on **Game Table › Seasons**, in the character’s **season in full**. Each tradition’s card is there. Its button logs the season; one logged by mistake can be **Unlogged**.',
      at: plan, needs: 'character', target: [...SEASON_CARDS, 'table-plan'],
      variants: byTradition({
        witch: { target: 'witch-kitchen', body: 'Anything that takes a season is worked on **Game Table › Seasons**. **A season in the kitchen** brews potions, makes a fetish, weaves a curse or draws vis from the aura. Its button logs the season; one logged by mistake can be **Unlogged**.' },
        learned: { target: ['hedge-season', 'hedge-amulet'], body: 'Anything that takes a season is worked on **Game Table › Seasons**. **A season of charms** invents a charm or learns charms from a teacher. **Make an amulet** gives an amulet a charge for every 5 points the Lab Total beats its level. A season logged by mistake can be **Unlogged**.' },
        elemental: { target: 'hedge-refining', body: 'Anything that takes a season is worked on **Game Table › Seasons**. **A season of Refining** makes a longevity potion or draws vis from an aura. Its button logs the season; one logged by mistake can be **Unlogged**.' },
        gruagach: { target: 'gruagach-season', body: 'Anything that takes a season is worked on **Game Table › Seasons**. **A gruagach’s season** enchants a tattoo, invents a spell or draws vis. Its button logs the season; one logged by mistake can be **Unlogged**.' },
        vitki: { target: 'vitki-season', body: 'Anything that takes a season is worked on **Game Table › Seasons**. **A vitki’s season** invents rune scripts or learns them from a teacher. Its button logs the season; one logged by mistake can be **Unlogged**.' },
        nightwalker: { target: 'table-plan', body: 'A nightwalker’s tradition has **no season’s work** of its own. Their seasons are planned here, on **Game Table › Seasons**, as any companion’s are.' },
      }),
    },
    {
      title: 'Vis from the stores',
      body: 'Vis that a season’s work spends comes from **the purse** or **the covenant’s stores**: choose which beside the button. The count of each is shown. If there is not enough, the card says what is missing. Vis drawn from an aura goes where you choose.',
      at: plan, needs: 'character', target: [...SEASON_CARDS, 'table-plan'],
    },
    {
      title: 'When the season ends',
      body: 'A roll the book makes when a season ends waits in **Resolve** until it is rolled: a folk witch’s **woven curse**, for one. So does what follows Warping. End the season on this page, and Resolve lists what is owed, each with a link to its card.',
      at: table('seasons'), needs: 'saga', target: ['seasons-resolve', 'seasons-advance'],
    },
    {
      title: 'The tradition’s Warping',
      body: 'A botch adds **Warping Points**, which the sheet keeps. Where a tradition has a reaction of its own, it waits in Resolve: the **Witch Moon** for folk witches, **Nátt-thel** for vitkir. An elementalist takes on Elemental Traits.',
      at: dice('hedge'), needs: 'character', target: ['witch-moon', 'vitki-natt-thel', 'elemental-traits', 'hedge-who'],
      variants: byTradition({
        witch: { title: 'The Witch Moon', target: 'witch-moon', body: 'Each time a folk witch’s Warping Score rises, the **Witch Moon** comes in place of Twilight. For a month at least the witch loses their powers, though potions still work. It begins by itself when the toolkit adds Warping Points, and waits in Resolve. **Roll the month’s end** here.' },
        vitki: { title: 'Nátt-thel', target: 'vitki-natt-thel', body: '**Nátt-thel** comes in place of Twilight: when two or more Warping Points come from one event, roll Stamina + Concentration against the Warping Score × 3. A failure risks **The Gift** itself. It is owed by itself when the toolkit adds the points, and waits in Resolve.' },
        elemental: { target: 'elemental-traits', body: 'An elementalist’s Warping shows as **Elemental Traits**, which grow with the Warping Score. A botch adds Warping Points, which the sheet keeps.' },
      }),
    },
    {
      title: 'Making a hedge wizard',
      body: 'To make one, start a companion on **People** and take the tradition’s Virtues in the wizard: the **Folk Witch** Social Status, a learned magician’s Arts, an elementalist’s Technique and Form, the gruagach’s or vitki’s Virtues. The **Rules check** says what each tradition still needs. Quick build has no hedge roles.',
      at: sagaPage('people'), needs: 'saga', target: ['create-companion', 'create-mythic'],
    },
  ],
};
