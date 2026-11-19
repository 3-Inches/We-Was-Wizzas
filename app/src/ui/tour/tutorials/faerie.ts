import { dice, sagaPage, sheet } from '../places';
import type { Tour } from '../tours';
import { hasFaerieTable } from '../../../engine/faerieWizardry';

export const faerieTour: Tour = {
  id: 'faerie',
  title: 'Faerie at the table (Realms of Power: Faerie)',
  blurb: 'Sympathy Traits and Faerie Rank, a faerie wizard’s rites and bargains, Sympathy on any roll, Faerie Calling when Warping comes, and faeries as characters.',
  group: 'Magic',
  inSaga: true,
  prefers: 'companion',
  suits: hasFaerieTable,
  practice: {
    type: 'companion', role: 'cunning-folk', label: 'a practice faerie wizard',
    ensure: ['evocation', 'weal', 'summoning', 'faerie-sympathy'], abilities: { 'faerie-summoning': 5 }, sympathy: [{ trait: 'Dawn', score: 3 }],
  },
  steps: [
    {
      title: 'Faerie at the table',
      body: '*Realms of Power: Faerie* adds faerie wizards, people the Faerie realm has touched, and faeries as characters. Each is played on **Game Table › Dice › Faerie**, for whoever is picked at the top. This tutorial works on a practice faerie wizard with Evocation, Weal and a Sympathy Trait.',
      at: dice('faerie'), needs: 'character', target: 'faerie-who',
    },
    {
      title: 'Sympathy Traits',
      body: 'A **Sympathy Trait** ties the character to a subject narrower than a Form: Dawn, Hounds, Iron. A positive one adds like a specialty. The worst negative one takes away, and adds botch dice. **Faerie Rank** is the highest positive trait with the lowest negative one. This line shows them, and links to the sheet, where they are kept.',
      at: dice('faerie'), needs: 'character', target: ['faerie-traits', 'faerie-who'],
    },
    {
      title: 'Kept on the sheet',
      body: 'The traits are added, named and set on the sheet’s **Sympathy Traits** card, on the Overview tab. The card says how high experience may raise each. The rolls on Dice › Faerie change them too: a 1 adds experience to each trait used.',
      at: sheet('overview'), needs: 'character', target: ['sympathy', 'tab-overview'],
    },
    {
      title: 'A faerie rite',
      body: 'A faerie wizard works a rite with a **Method** (Evocation, Enchantment or Empathy) and a **Power** (Beguile, Weal, Woe and the rest), each an Ability. The total is the Method’s Characteristic + Method + Power + the Faerie aura. The rite’s level is held to **5 × the Sympathy Traits ticked**.',
      at: dice('faerie'), needs: 'character', target: ['faerie-rite', 'faerie-who'],
    },
    {
      title: 'Perform it',
      body: '**Try it:** choose a guideline no higher than the level the card allows, tick a trait that fits, and press **Perform the rite**. A 1 on the stress die gives each trait used an experience point. Each 0 of a botch takes one away.',
      at: dice('faerie'), needs: 'character', target: ['faerie-rite', 'faerie-who'],
    },
    {
      title: 'Sympathy on any roll',
      body: 'Sympathy works on every roll, not only magic. On **Dice › Roll**, the traits of the one rolling are offered as ticks: tick those that fit. A positive trait adds in place of a specialty, on a stress die. The worst negative one comes off the Ability.',
      at: dice('roll'), needs: 'character', target: ['dice-sympathy', 'dice-roll'],
    },
    {
      title: 'Faerie bargaining',
      body: 'The **Ars Fabulosa** (Summoning, Bonding, Captivating, Dismissing) deal with faeries. Characteristic + the Art + Faerie Rank + aura + a stress die. It reaches a faerie of Might up to 5 × the traits ticked, and the best positive trait adds to Penetration. Set the faerie’s Might and press **Roll**.',
      at: dice('faerie'), needs: 'character', target: ['faerie-bargain', 'faerie-rite', 'faerie-who'],
    },
    {
      title: 'Faerie Calling',
      body: 'Faerie Warps in its own way. When **2 or more Warping Points come at once**, the realm comes calling: a dream scene played out with the troupe, the character dazed until it is resolved. It is owed by itself when the toolkit adds the points, and waits in Resolve. Its rolls are on this card.',
      at: dice('faerie'), needs: 'character', target: ['faerie-calling', 'faerie-who'],
    },
    {
      title: 'Making one',
      body: 'On **People**, a faerie wizard is a companion with a Method and a Power taken as Virtues; **Faerie Sympathy** brings a trait. A **faerie** can be a companion, or stand in place of a magus: Might 5, Pretenses from one pool, and a form, a cognizance and a taboo, which the rules check asks for.',
      at: sagaPage('people'), needs: 'saga', target: ['create-companion', 'create-mythic'],
    },
  ],
};
