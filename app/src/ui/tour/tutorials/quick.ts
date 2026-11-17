import { sagaPage } from '../places';
import type { Tour } from '../tours';

export const quickTour: Tour = {
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
};
