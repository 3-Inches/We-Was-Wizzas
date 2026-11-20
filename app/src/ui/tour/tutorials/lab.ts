import { sagaPage, sheet, covenant, plan, dice } from '../places';
import type { Tour } from '../tours';

export const labTour: Tour = {
  id: 'lab',
  title: 'Build a laboratory',
  blurb: 'Give each magus a laboratory, personalize it with Virtues and Flaws, and see it in their Lab Totals.',
  group: 'Magic',
  charType: 'magus',
  inSaga: true,
  practice: { type: 'magus', label: 'a practice magus' },
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
      body: 'Once play begins, the magus improves their lab as a **Lab project**: raise its Refinement, install a Virtue, or put a Flaw right. A rise in Upkeep is paid from the treasury. With the optional lab routines, odd hours and overtime add to a season’s Lab Total, at a price.',
      at: plan, needs: 'character', target: ['lab-projects', 'table-plan'],
    },
    {
      title: 'Great projects',
      body: '*Hermetic Projects* adds the covenant’s **great buildings** and its **menagerie**, kept on the covenant’s Overview. A building keeps its height, the quality of its work and the damage it has taken. A mason raises or mends it with **Build (a season)** or **Repair (a season)**, on Seasons.',
      at: covenant('overview'), needs: 'covenant', target: 'great-projects',
    },
    {
      title: 'Their rolls',
      body: 'When an event threatens a building, its **stress check** is rolled at **Game Table › Dice › Great projects**, with the covenant’s master mason; a damage level lost is written on the covenant. The menagerie’s **Breeding Roll** is there too, with its lead handler.',
      at: dice('projects'), needs: 'covenant', target: ['building-check', 'menagerie'],
    },
    {
      title: 'Enchantments',
      body: 'The Enchantments page designs enchanted devices and talismans, Longevity Rituals and vis extraction, and copies books and lab texts, all from the magus’s Lab Totals.',
      at: sagaPage('enchant?tab=items'), needs: 'saga', target: 'tab-items',
    },
  ],
};
