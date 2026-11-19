// A record the sheet keeps is changed on the sheet only (design principle 4, audit B5). Dice › Faerie
// shows the Sympathy Traits, the Faerie Rank and the botch dice in one line with a link to the sheet's
// card, and Dice › Hedge magic does the same for the charms, spells and rune scripts known. The sheet's
// own cards still change them.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { buildGameData } from '../../data';
import { addVirtue, newCharacter } from '../../engine/character/factory';
import { deriveCharacter } from '../../engine/character/derive';
import { characterContext } from '../../engine/context';
import { DEFAULT_HOUSE_RULES, type Character, type Saga } from '../../engine/types';
import type { CharEditor } from '../character/useChar';
import FaeriePart from './FaeriePart';
import HedgePart from './HedgePart';
import { SympathyCard } from '../character/SympathyCard';
import { LearnedCard } from '../character/LearnedCard';
import { GruagachSheetCard } from './GruagachPart';
import { VitkiSheetCard } from './VitkirPart';
import { AtTable } from '../play';

const data = buildGameData();
const saga = { id: 'S', name: 'S', houseRules: DEFAULT_HOUSE_RULES } as unknown as Saga;

/** The editor a page is given, for one character, recording the changes asked of it. */
function editor(c: Character): CharEditor {
  const d = deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
  const update = () => undefined;
  return { saga, data, c, d, issues: [], update, change: update, replace: update, acknowledge: update, applyFix: update, resolveAll: update, ctx: characterContext(c, [], data) } as unknown as CharEditor;
}

const html = (el: ReactElement, atTable = true) => renderToStaticMarkup(<MemoryRouter>{atTable ? <AtTable>{el}</AtTable> : el}</MemoryRouter>);

function faerieWizard(): Character {
  const c = newCharacter('companion', 'S');
  c.id = 'fw';
  c.name = 'Ysolde';
  c.creation.finalized = true;
  addVirtue(c, data, 'evocation', 'Minor');
  addVirtue(c, data, 'weal', 'Minor');
  addVirtue(c, data, 'faerie-sympathy', 'Minor', 'Dawn');
  c.sympathy = [
    { uid: 'dawn', trait: 'Dawn', score: 3 },
    { uid: 'iron', trait: 'Iron', score: -2 },
  ];
  return c;
}

describe('Dice › Faerie', () => {
  it('shows the Sympathy Traits, Faerie Rank and botch dice in one line, with a link to the sheet’s card', () => {
    const page = html(<FaeriePart ed={editor(faerieWizard())} />);
    const line = page.match(/<p class="small" data-tour="faerie-traits">(.*?)<\/p>/)?.[1] ?? '';
    expect(line).toMatch(/Dawn \+3, Iron [−-]2/);
    expect(line).toContain('Faerie Rank <b>+1</b>');
    expect(line).toMatch(/2 more botch dice from Iron [−-]2/);
    expect(line).toContain('href="/saga/S/character/fw?tab=overview&amp;to=sympathy"');
  });

  it('offers nothing that adds, removes, names or sets a trait; the rolls still tick the ones that fit', () => {
    const page = html(<FaeriePart ed={editor(faerieWizard())} />);
    expect(page).not.toContain('data-tour="sympathy"');
    expect(page).not.toMatch(/\+ Sympathy Trait/);
    expect(page).not.toContain('Remove the trait');
    expect(page).not.toContain('placeholder="e.g. Winter"');
    // the rite's own ticks of the traits that fit an effect stay: they are part of the roll
    expect(page).toMatch(/aria-label="Applicable Sympathy Traits"/);
  });

  it('leaves the sheet’s card to change them', () => {
    const sheet = html(<SympathyCard ed={editor(faerieWizard())} />, false);
    expect(sheet).toContain('data-tour="sympathy"');
    expect(sheet).toMatch(/\+ Sympathy Trait/);
    expect(sheet).toContain('Remove the trait');
  });
});

describe('Dice › Hedge magic', () => {
  const hedge = () => {
    const c = newCharacter('companion', 'S');
    c.id = 'hw';
    c.creation.finalized = true;
    addVirtue(c, data, 'mathematicus-of-bologna', 'Free');
    addVirtue(c, data, 'succurro', 'Major');
    addVirtue(c, data, 'salutem', 'Minor');
    c.learned = { charms: [{ uid: 'c', name: 'Ward of the Hearth', tf: 'SuSa', level: 10, range: 'Touch', duration: 'Sun', target: 'Individual', source: 'play' }] };
    return c;
  };

  it('names the charms known in one line, with a link to the sheet, and edits none of them', () => {
    const page = html(<HedgePart ed={editor(hedge())} />);
    const line = page.match(/<p class="small" data-tour="hedge-charms-known">(.*?)<\/p>/)?.[1] ?? '';
    expect(line).toContain('Ward of the Hearth');
    expect(line).toContain('href="/saga/S/character/hw?tab=overview&amp;to=learned-card"');
    expect(page).not.toContain('data-tour="learned-card"');
    expect(page).not.toContain('Remove the charm');
    expect(page).not.toContain('Add one learned in play');
    // the sheet's card keeps them, and adds one learned in play
    const sheet = html(<LearnedCard ed={editor(hedge())} />, false);
    expect(sheet).toContain('Remove the charm');
    expect(sheet).toContain('Add one learned in play');
  });

  it('the gruagach’s spells and the vitki’s scripts are kept on the sheet only', () => {
    const g = newCharacter('companion', 'S');
    g.creation.finalized = true;
    addVirtue(g, data, 'gruagach', 'Free');
    g.gruagach = { spells: [{ uid: 's', name: 'The Giant’s Grip', tf: 'GvBl', level: 15, range: 'Touch', duration: 'Momentary', target: 'Individual', source: 'play' }] };
    const gPage = html(<HedgePart ed={editor(g)} />);
    expect(gPage).toMatch(/data-tour="hedge-spells-known">Spells known: <b>The Giant’s Grip<\/b>/);
    expect(gPage).not.toContain('Remove the spell');
    expect(html(<GruagachSheetCard ed={editor(g)} />, false)).toContain('Remove the spell');

    const v = newCharacter('companion', 'S');
    v.creation.finalized = true;
    addVirtue(v, data, 'vitki', 'Free');
    v.vitki = { scripts: [{ uid: 'r', name: 'Ward against Iron', runes: ['Algiz'], level: 10, method: 'I', source: 'play' }] };
    const vPage = html(<HedgePart ed={editor(v)} />);
    expect(vPage).toMatch(/data-tour="hedge-scripts-known">Rune scripts known: <b>Ward against Iron<\/b>/);
    expect(vPage).not.toContain('Remove the script');
    expect(html(<VitkiSheetCard ed={editor(v)} />, false)).toContain('Remove the script');
  });
});
