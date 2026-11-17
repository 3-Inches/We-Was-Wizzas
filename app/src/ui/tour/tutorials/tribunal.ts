import { sagaPage, plan, society } from '../places';
import type { Tour } from '../tours';

export const tribunalTour: Tour = {
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
};
