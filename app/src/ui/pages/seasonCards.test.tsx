// A season in full is ordered by the character (roadmap 5.4, audit B3): their own season work first,
// then the planning, then the season log and aging, then the Mysteries and writing. A card that cannot
// apply to them is not drawn, and a line says why. Checked on every practice saga's characters, drawn.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { gameDataFor } from '../../store/hooks';
import { addVirtue, newCharacter } from '../../engine/character/factory';
import { deriveCharacter } from '../../engine/character/derive';
import { characterContext } from '../../engine/context';
import type { Character, Covenant, Saga } from '../../engine/types';
import type { CharEditor } from '../character/useChar';
import { SeasonInFull } from './SeasonInFull';
import { seasonCards, type SeasonGroup } from './seasonCards';

type Fixture = { saga: Saga; characters: Character[]; covenants: Covenant[] };
const files = import.meta.glob('../../../scripts/qa/fixtures/*.saga.json', { eager: true, import: 'default' }) as Record<string, Fixture>;
const fixtures = Object.entries(files).map(([k, f]) => [k.match(/([a-z]+)\.saga\.json$/)![1], f] as const);
const fixture = (name: string) => fixtures.find(([k]) => k === name)![1];

function editor(f: Fixture, c: Character): CharEditor {
  const data = gameDataFor(f.saga);
  const d = deriveCharacter(c, data, f.saga.houseRules);
  const update = () => undefined;
  return { saga: f.saga, data, c, d, issues: [], update, change: update, replace: update, acknowledge: update, applyFix: update, resolveAll: update, ctx: characterContext(c, f.covenants, data) } as unknown as CharEditor;
}

/** The season in full as drawn: the cards in order, by their tour names, and the line of what is left out. */
function drawn(f: Fixture, c: Character) {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <SeasonInFull ed={editor(f, c)} chars={f.characters} />
    </MemoryRouter>,
  );
  const cards = [...html.matchAll(/<section class="card[^"]*"[^>]*data-tour="([^"]+)"/g)].map((m) => m[1]);
  const hidden = html.match(/<details[^>]*data-tour="season-hidden">([\s\S]*?)<\/details>/)?.[1] ?? '';
  return { cards, hidden: hidden.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'") };
}

/** The tours of the cards that are a character's own season work. */
const OWN = /^(witch-kitchen|hedge-amulet|hedge-season|hedge-refining|gruagach-season|vitki-season|holy-works|holy-seasons|mason-season|workshop-season|lab-projects|original-research|longevity|apprentice)$/;
const ORDER: SeasonGroup[] = ['own', 'planning', 'record', 'last'];

describe('a season in full, ordered by the character', () => {
  const people = fixtures.flatMap(([name, f]) => f.characters.filter((c) => c.creation.finalized && !c.wounds.dead).map((c) => [name, f, c] as const));

  it('draws each practice character’s own season work first, when they have any', () => {
    expect(people.length).toBeGreaterThan(70);
    for (const [name, f, c] of people) {
      const { cards } = drawn(f, c);
      const why = `${name}: ${c.name} (${c.type})`;
      const d = deriveCharacter(c, gameDataFor(f.saga), f.saga.houseRules);
      const own = seasonCards(c, d, f.saga, characterContext(c, f.covenants, gameDataFor(f.saga)).covenant).shown.filter((s) => s.group === 'own');
      if (own.length) expect(cards[0], why).toMatch(OWN);
      else expect(cards[0], why).toBe('plan-season');
      // and no own work after the planning has begun
      const firstOther = cards.findIndex((t) => !OWN.test(t));
      expect(cards.slice(firstOther).filter((t) => OWN.test(t)), why).toEqual([]);
    }
  });

  it('opens each tradition’s practice character on their tradition’s season, and a magus on the laboratory', () => {
    const cases: [string, string, string][] = [
      ['witch', '2f21ffa5c86f', 'witch-kitchen'],
      ['learned', '70fe0036f986', 'hedge-amulet'],
      ['elem', '1f8d2137a573', 'hedge-refining'],
      ['gru', 'bf5f92f9a31e', 'gruagach-season'],
      ['vit', 'bd0eb3c7df9e', 'vitki-season'],
      ['tmre', '9efd2275a229', 'lab-projects'],
      ['tmre', 'ee0d38fc184e', 'lab-projects'],
      // a nightwalker's tradition, and a faerie wizard's (RoP: Faerie, Faerie Wizardry), have no season's work of their own
      ['vit', '21208df916be', 'plan-season'],
      ['faerie', 'e7c79e8943af', 'plan-season'],
    ];
    for (const [name, id, first] of cases) {
      const f = fixture(name);
      expect(drawn(f, f.characters.find((c) => c.id === id)!).cards[0], `${name} ${id}`).toBe(first);
    }
    for (const [name, f, c] of people.filter(([, , c]) => c.type === 'magus')) expect(drawn(f, c).cards, `${name}: ${c.name}`).toContain('lab-projects');
  });

  it('keeps the owner’s order: own work, the planning, the record, then the Mysteries and writing', () => {
    for (const [, f, c] of people) {
      const data = gameDataFor(f.saga);
      const groups = seasonCards(c, deriveCharacter(c, data, f.saga.houseRules), f.saga).shown.map((s) => ORDER.indexOf(s.group));
      expect(groups).toEqual([...groups].sort((a, b) => a - b));
    }
  });

  it('draws no card that cannot apply, and says why in the folded line', () => {
    const f = fixture('tmre');
    const grog = f.characters.find((c) => c.type === 'grog')!;
    const g = drawn(f, grog);
    for (const t of ['lab-projects', 'original-research', 'apprentice', 'longevity', 'mysteries', 'witch-kitchen']) expect(g.cards).not.toContain(t);
    expect(g.hidden).toContain('Lab projects, original research and an apprentice: only a magus works in a Hermetic laboratory');
    expect(g.hidden).toContain('Mysteries & Initiation: not of a Mystery House, and no Mystery Lore');
    expect(g.hidden).toContain('Hedge magic’s seasons: no hedge tradition');
    // the cultists of the Mysteries' practice saga have the card; a magus of no Mystery House and no Lore does not
    expect(drawn(f, f.characters.find((c) => c.id === '9efd2275a229')!).cards).toContain('mysteries');
    const plain = f.characters.find((c) => c.name === 'Gallus')!;
    expect(drawn(f, plain).cards).not.toContain('mysteries');
    expect(drawn(f, plain).hidden).toContain('Mysteries & Initiation');
  });

  it('leaves out aging for one who never ages, and writing for one with nothing to write or copy', () => {
    const f = fixture('faerie');
    // a faerie does not age (RoP: Faerie)
    const hob = { ...f.characters.find((c) => c.id === 'ef0b391a20b8')!, creation: { ...f.characters.find((c) => c.id === 'ef0b391a20b8')!.creation, finalized: true } };
    const h = drawn(f, hob);
    expect(h.cards).not.toContain('aging');
    expect(h.hidden).toContain('Aging: a magic character, a faerie or an immortal does not age');
    // a child of the covenant with no Ability at 2 and no letters: nothing to write on, nothing to copy
    const data = gameDataFor(f.saga);
    const child = newCharacter('grog', f.saga.id);
    child.name = 'Wat';
    child.creation.finalized = true;
    const w = drawn(f, child);
    expect(w.cards).not.toContain('writing');
    expect(w.hidden).toContain('Writing and copying: nothing to write on');
    // the same child with a Virtue that teaches nothing to write still has the season log, aging and the plan
    addVirtue(child, data, 'luck', 'Minor');
    expect(drawn(f, child).cards).toEqual(expect.arrayContaining(['plan-season', 'standing', 'priorities', 'season-log', 'aging']));
  });
});
