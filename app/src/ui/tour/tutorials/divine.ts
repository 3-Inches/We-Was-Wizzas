import { sagaPage, dice } from '../places';
import type { Tour } from '../tours';

export const divineTour: Tour = {
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
      body: '*Realms of Power: The Divine* is about people whose faith does things: a priest whose blessing holds. It is played on **Game Table › Dice › Faith & miracles**, for whoever is picked at the top. This tutorial works on a practice holy companion with **True Faith**, the Method **Invocation** and the Power **Blessing**.',
      at: dice('holy'), needs: 'character', target: 'holy-here',
    },
    {
      title: 'Here and now: the aura',
      body: 'The Dominion is God’s presence in a place: about 1 in the countryside, 3 in a city, 5 in a church. A **Divine aura adds its strength** to every holy total here, and takes from Hermetic magic.\n\n**Try it:** set the realm to **Divine** and the strength to **3**. Every total below now carries +3.',
      at: dice('holy'), needs: 'character', target: 'holy-here',
    },
    {
      title: 'True Faith',
      body: 'The **True Faith** Virtue gives a **True Faith Score** of 1 and a **Faith Point**. Each time it is taken again the Score rises, though 2 or more is for Mythic Companions. The Score gives **Magic Resistance of Faith × 10**. A relic has Faith Points of its own.',
      at: dice('holy'), needs: 'character', target: ['holy-faith', 'holy-here'],
    },
    {
      title: 'Faith Points',
      body: 'Faith Points are spent like Confidence, under any roll: +3 each, as many at once as the Score. They **come back at dawn** up to the Score: press **Dawn** when a new day begins. The list beside it adds the Faith Point a sacrament or a pilgrimage gives.',
      at: dice('holy'), needs: 'character', target: ['holy-faith', 'holy-here'],
    },
    {
      title: 'Where the character stands',
      body: '**Holy standing** keeps what does not change from day to day. The **holy tradition** (Ascetics, Sufis, Kabbalists…) names the four Abilities its members learn without the usual penalty. A **commanding aura** is the Magic Resistance of high office, 10 to 25. **Embodying the Light** lists what a True Faith of 2, 3 and 5 brings. Tragedies suffered are recorded here.',
      at: dice('holy'), needs: 'character', target: ['holy-standing', 'holy-here'],
    },
    {
      title: 'A Method and a Power',
      body: 'A holy power takes **two Abilities together**. The **Method** is how the character prays: **Invocation** aloud (Communication), **Meditation** in stillness (Intelligence), **Purity** through fasting and hardship (Stamina). The **Power** is what the prayer does: Blessing, Cursing, Adjuration, Intervention, Transcendence, Understanding, Wonders. Each is a Major Virtue.',
      at: dice('holy'), needs: 'character', target: 'holy-powers',
    },
    {
      title: 'Which Powers a Method calls',
      body: '**A Method calls only some Powers.** Invocation calls Adjuration, Blessing, Cursing and Wonders. Meditation calls Blessing, Intervention, Transcendence and Understanding. Purity calls Adjuration, Cursing, Intervention and Transcendence. The lists here show only the pairs this character can use.',
      at: dice('holy'), needs: 'character', target: 'holy-powers',
    },
    {
      title: 'Choose the effect',
      body: 'Open **Effect**. **Guidelines** are the book’s levels for this Power; **The book’s effects** are its named examples. Or **design one** with a base level, Range, Duration and Target, as for a Hermetic spell.\n\n**Try it:** choose the first General guideline under Blessing and leave the base level at 5: Magic Resistance for the one blessed.',
      at: dice('holy'), needs: 'character', target: ['holy-effect', 'holy-powers'],
    },
    {
      title: 'No Rituals, no vis',
      body: 'There are no Rituals and no vis. An effect that would need a Ritual in Hermetic magic (permanent, or a Boundary) ticks **as a Ritual would be**, and adds four magnitudes instead. A *General* guideline scales with the level you choose.',
      at: dice('holy'), needs: 'character', target: ['holy-effect', 'holy-powers'],
    },
    {
      title: 'The Total and its price',
      body: 'The **Total** is the Method’s Characteristic + Method + Power + aura, with a die, against the effect’s level. Tap the Total to see the sum. Each Method has a price: **Invocation spends a Confidence Point** (or a Faith Point), Meditation takes an hour with Stamina rolls, and Purity costs a long-term Fatigue level or a Light Wound.',
      at: dice('holy'), needs: 'character', target: ['holy-call-effect', 'holy-powers'],
    },
    {
      title: 'Call it',
      body: 'With Invocation you may **Entreat** (a simple die) or **Command** (a stress die: more reach, and a botch is possible).\n\n**Try it:** press **Entreat**. The Confidence Point is spent on the sheet, and the line below says whether the blessing took.',
      at: dice('holy'), needs: 'character', target: ['holy-call-effect', 'holy-powers'], advance: { press: /Entreat|Call the effect/ },
    },
    {
      title: 'After the roll, and tragedies of hubris',
      body: 'Under the result, **After the roll** offers Confidence and Faith Points to raise it. If the total still falls short the effect fails, and worse may follow: a **tragedy of hubris**, minor when short by 1 to 10, major by 11 to 20, ultimate beyond. Each Power has its own. A botch adds a Warping Point for each zero.',
      at: dice('holy'), needs: 'character', target: 'holy-powers',
    },
    {
      title: 'True Faith softens it',
      body: '**True Faith softens a tragedy**: it is judged on Faith × 10 when that is higher than the total. So a character with True Faith 1 calling a level 10 effect risks none. A holy character calls what they can reach, and keeps Faith Points in hand.',
      at: dice('holy'), needs: 'character', target: 'holy-powers',
    },
    {
      title: 'Praying together: Ceremony',
      body: 'Others may pray with the one who calls, when someone among them has **Ceremony**. Tick who joins: each adds their Characteristic + the same Method. A congregation with no sheets is counted by number. **Led by** names a leader: as many others count as the leader’s Ceremony. A congregation behind a priest reaches great effects.',
      at: dice('holy'), needs: 'character', target: ['holy-ceremony', 'holy-powers'],
    },
    {
      title: 'Pray for a miracle',
      body: 'Anyone with a **Faith Point** may ask God for a miracle (an optional rule). Set the level asked, **how soon** it is needed and **how great the need**: together they make the level. It costs a Faith Point, and rolls a stress die + True Faith + Concentration + aura. A botch takes every Faith Point for weeks.',
      at: dice('holy'), needs: 'character', target: 'holy-miracle',
    },
    {
      title: 'God’s aid for a scene',
      body: 'Before a trial that serves the faith, a character may **invoke God’s aid**: a Confidence Point (a Faith Point with True Faith), and a stress die + Communication + Dominion Lore. 9 gives **+1**, 15 gives +2, 24 gives +3, to every roll toward the objective until one fails. The aid is **offered as a tick on the Roll card**.',
      at: dice('holy'), needs: 'character', target: 'holy-aid',
    },
    {
      title: 'The saints',
      body: 'A Christian may call on a **saint** once a day, and a Muslim on a **holy forbear** at the shrine: Communication + Charm + the modifiers ticked (at the tomb, a feast day, a donation) against 15 + a die the storyguide rolls unseen. A saint who answers works one of its powers: the list shows what each can do.',
      at: dice('holy'), needs: 'character', target: ['holy-saints', 'holy-invoke-saint'],
    },
    {
      title: 'A saint who refuses',
      body: 'A saint who refuses may be **threatened**: the relics taken from the altar, the bones exposed, at the risk of its curse. The book’s twelve saints are here, and you can add your own patron.',
      at: dice('holy'), needs: 'character', target: ['holy-saints', 'holy-invoke-saint'],
    },
    {
      title: 'Holy influence and tempers',
      body: 'One with spiritual authority can **influence** a willing person, or **temper the aura** of a place: Presence + Leadership, +1 at 9, +2 at 15, +3 at 24. A tempered aura adds to rolls that suit its virtue, takes from those against it, and is **offered on every Roll**. Two tempers on one aura make a **schism**, and cancel.',
      at: dice('holy'), needs: 'character', target: ['holy-influence', 'holy-tempers'],
    },
    {
      title: 'The Divine Ascent',
      body: 'Holy characters Warp in their own way. When one with a Holy Method or Power gains **two or more Warping Points at once**, roll here: Presence + Concentration (or Meditation) against Warping Score + the points + True Faith + the aura. On a failure the character is **lifted into the Divine** for days, and gains more Warping Points.',
      at: dice('holy'), needs: 'character', target: 'holy-ascent',
    },
    {
      title: 'The Ascent’s form',
      body: 'Its form is chosen once for life: the **Divine Gloom** (experience moves from mundane Abilities to holy ones), the **Divine Form** (Magic Resistance and Soak from the Warping Score), or **Divine Unity** (one virtue made flesh). Mystics welcome it; one with Meditation may subtract it from the roll.',
      at: dice('holy'), needs: 'character', target: 'holy-ascent',
    },
    {
      title: 'Rites, and works of a season',
      body: '**Rites and holy places** holds what takes a ceremony: a **Dominion rite** to consecrate a place, a celestial regio entered, a kabbalist’s **Minor amulet**. A card the character cannot use is not shown, and the foot of the page says why. A season’s work, such as a season of devotion, is on **Game Table › Seasons**.',
      at: dice('holy'), needs: 'character', target: 'holy-rites',
    },
    {
      title: 'Holy Magic, for magi',
      body: 'A magus with the **Holy Magic** Virtue works Hermetic magic in God’s service, on **Dice › Spellcasting** like any magus. The Dominion counts as a Magic aura, and an Infernal one takes nothing away. A **prayer** (Presence + Theology, 15 or more) or a Method’s activity stands for Hermetic words and gestures.',
      at: dice('magic'), needs: 'character', target: ['holy-call', 'tab-dice'],
    },
    {
      title: 'Holy Rituals',
      body: 'Rituals add a **Method and a Power** in place of Artes Liberales and Philosophiae, and **long-term Fatigue stands for Ritual vis**, three pawns a level. Laboratory Texts are halved between holy and Hermetic magi.',
      at: dice('magic'), needs: 'character', target: ['holy-call', 'tab-dice'],
    },
    {
      title: 'Building a holy character',
      body: 'To make one, start a character on the **People** page. For a companion, pick the **Faithful / Holy** theme on the Concept step. In the guided build, rate *“work wonders through prayer”* high, and the build takes a Method and a Power that go together. By hand, search Virtues & Flaws for **True Faith**, a Method and a Power.',
      at: sagaPage('people'), needs: 'saga', target: ['create-mythic', 'create-companion'],
    },
    {
      title: 'Holy Mythic Companions, and magi',
      body: 'A **Mythic Companion** can be one of the book’s own: a **Nephilim**, a Cathar **Perfectus**, a Sufi **Zahid** or a **Kabbalist**, each with its required Virtues set for you. A magus takes Holy Magic as a Major Hermetic Virtue. Quick build has a *Holy wonder-worker* role too.',
      at: sagaPage('people'), needs: 'saga', target: ['create-mythic', 'create-companion'],
    },
  ],
};
