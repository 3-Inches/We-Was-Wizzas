import { sheet, covenant, sagaTab, plan, society, startOff, tribunals, list } from '../places';
import type { Tour } from '../tours';

export const optionalTour: Tour = {
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
};
