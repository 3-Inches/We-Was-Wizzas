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
      title: 'Rites, and works of a season',
      body: '**Rites and holy places** holds what takes a ceremony: a **Dominion rite** to consecrate a place, a celestial regio entered, a kabbalist’s **Minor amulet**. A card the character cannot use is not shown; the foot of the page says why. A season’s work is on the **Seasons** page: a season of devotion, a ring of Solomon first recited, the search for the *Ars Notoria*, and Major amulets, golems and True Names.',
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
};
