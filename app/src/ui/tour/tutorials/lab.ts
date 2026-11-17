import { sagaPage, sheet, covenant, plan } from '../places';
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
      body: 'Once play begins, the magus improves their own lab as a **Lab project**: raise its Refinement (Magic Theory at least the new Refinement + 3, with a chance of Highly Organized or a Hidden Defect), install a Virtue (a season for a Minor one, two for a Major one), or put a Flaw right. A rise in Upkeep is paid from the treasury. With the optional lab routines, odd hours and overtime add to a season’s Lab Total, at a price.',
      at: plan, needs: 'character', target: ['lab-projects', 'table-plan'],
    },
    {
      title: 'Enchantments',
      body: 'The Enchantments page designs enchanted devices and talismans, Longevity Rituals and vis extraction, and copies books and lab texts, all from the magus’s Lab Totals.',
      at: sagaPage('enchant?tab=items'), needs: 'saga', target: 'tab-items',
    },
  ],
};
