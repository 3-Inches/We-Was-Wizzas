import { R } from '../../routes';
import { sagaPage, page, table } from '../places';
import type { Tour } from '../tours';

export const toolkitTour: Tour = {
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
      body: 'With a saga open, the sidebar lists its pages: the **Saga Overview**, the **Game Table** (where play happens), **Covenants**, **People** and **The Tribunal**. Then come the Tools and the Reference. On a phone it is behind the **☰** menu.',
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
      body: 'The Game Table’s Dice page: simple and stress dice with botch dice, rolled and explained, with totals from the sheets. Its parts are any roll, combat, spellcasting, and Faith & miracles. **Faerie**, **Hedge magic** and **Mysteries** appear only when someone in the saga has them.',
      at: (c) => (c.sagaId ? R.dice(c.sagaId) : '/dice'), target: 'tab-dice',
    },
    {
      title: 'Display',
      body: 'Light or dark, large text for sharing a screen on Discord, and **Hints for new players**: the short tips that appear where people tend to get stuck. Turn them off once you know your way.',
      target: 'display',
    },
    {
      title: 'Playing the game',
      body: 'The Guide has two pages that are not about the toolkit at all. **Playing the game** is for players: how to play a magus, a companion and a grog, and what a person of 1220 knows that you do not. **Running the game** is for storyguides: agreeing a saga, finding stories, and challenging wizards.',
      at: page('/help'), target: 'guide-tabs',
    },
    {
      title: 'More tutorials',
      body: 'Each of the big jobs has its own tutorial: starting a saga and choosing its optional rules, founding the covenant (its aura too), making a magus, companion or grog, the guided build, designing spells and powers, building a laboratory and improving it in play, playing a season, and Quick build for whole characters, covenfolk and creatures.',
      at: page('/help'), target: 'tutorials',
    },
  ],
};
