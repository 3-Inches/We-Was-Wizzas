import { dice, plan } from '../places';
import type { Tour } from '../tours';
import { divines, hasTableMystery, holds } from '../../../engine/hermeticMysteries';

/** The cards of the Mysteries rolled at the table, one for each Mystery held. */
const CARDS = ['mystery-divination', 'mystery-dreams', 'mystery-celestial', 'mystery-elixir', 'mystery-theurgy', 'mystery-empowerment', 'mystery-numerology', 'mystery-synthemata'];

export const mysteriesTour: Tour = {
  id: 'mysteries',
  title: 'The Mysteries at the table (The Mysteries)',
  blurb: 'The Mysteries rolled in play: one card for each held, divination and dreams worked through, then Initiation as a season’s work and the Mysteries of the laboratory.',
  group: 'Magic',
  inSaga: true,
  prefers: 'magus',
  suits: hasTableMystery,
  practice: {
    type: 'magus', label: 'a practice magus with Mysteries',
    ensure: ['divination-and-augury', 'hermetic-dream-interpreter'], abilities: { divination: 15 },
  },
  steps: [
    {
      title: 'The Mysteries at the table',
      body: '*The Mysteries* adds Virtues gained by **Initiation** into a cult. Those rolled in play are on **Game Table › Dice › Mysteries**: a favorable hour, divination and dreams, an invoked daimon, a numerologist’s rotes. The page shows only when someone holds one. This tutorial works on a practice magus with Divination & Augury and Hermetic Dream Interpreter.',
      at: dice('mysteries'), needs: 'character', target: 'mysteries-who',
    },
    {
      title: 'A card for each Mystery',
      body: 'Each Mystery the character holds has a card here, and only those. A Mystery not held is not shown: Celestial Magic, the Great Elixir, Theurgy, Empowerment, Numerology and Synthemata each bring their own card when Initiation adds them.',
      at: dice('mysteries'), needs: 'character', target: [...CARDS, 'mysteries-who'],
    },
    {
      title: 'Hermetic Divination',
      body: '**Divination & Augury** answers a question. The Ease Factor is the level of the Intellego spell that would answer it. **Casual** divination reads omens about the diviner in a round (Perception). **Ceremonial** takes 15 minutes a magnitude (Intelligence), with a method’s bonus.\n\n**Try it:** set the Ease Factor to 10 and press **Divine**.',
      at: dice('mysteries'), needs: 'character', target: ['mystery-divination', ...CARDS, 'mysteries-who'],
      // the card shows for either Mystery (a Dream Interpreter divines by dream)
      variants: [{ when: (c) => !divines(c), body: '**Divination & Augury** answers a question, its Ease Factor the level of the Intellego spell that would answer it. This character holds neither it nor Dream Interpreter, so the card is not shown. A magus Initiated into either gains it here.' }],
    },
    {
      title: 'Dreams',
      body: '**Hermetic Dream Interpreter** reads a dream’s symbols, or calls a dream into a sleeper the magus touches. Divination by dream is rolled on the divination card, with a ceremonial bonus of +5.',
      at: dice('mysteries'), needs: 'character', target: ['mystery-dreams', ...CARDS, 'mysteries-who'],
      variants: [{ when: (c) => !holds(c, 'hermetic-dream-interpreter'), body: '**Hermetic Dream Interpreter** reads a dream’s symbols, or calls a dream into a sleeper the magus touches. This character does not hold it, so its card is not shown.' }],
    },
    {
      title: 'Initiation, a season’s work',
      body: 'A Mystery is gained by **Initiation**, worked on **Game Table › Seasons**. **Plan an Initiation** takes the Mystery, a Mystagogue from the saga and a Script. The total is the Mystagogue’s Presence + Lore + the Script’s bonus, against 15 for a Minor Virtue or 21 for a Major one. **Initiate** adds the Virtue and the Ordeal’s Flaw.',
      at: plan, needs: 'character', target: 'mysteries',
    },
    {
      title: 'Mysteries in the lab',
      body: 'Some Mysteries work in the laboratory. A **Laboratory Horoscope**, Hermetic Alchemy and the Lesser Elixir are chosen on the **Lab projects** card, in the season in full, and join that project’s Lab Total.',
      at: plan, needs: 'character', target: ['lab-horoscope', 'lab-projects', 'table-plan'],
    },
  ],
};
