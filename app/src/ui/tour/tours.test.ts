// The tutorials point at real controls and real pages: every target named in a step is marked in
// the app's source, every wizard step exists, and every page a step goes to is a route. The Guide
// links every area of Game mechanics.
import { describe, expect, it } from 'vitest';
import mechanics from '../../data/generated/mechanics/index.json';
import { STEPS } from '../character/wizardSteps';
import { DETOUR_OFFERS, TOUR_BY_ID, TOURS } from './tours';
import { ACTIONS } from './actions';

const sources = Object.values(import.meta.glob('../**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>).join('\n');

/** The data-tour names the app marks: written out, or made from a tab, wizard step or character type. */
function marked(name: string): boolean {
  if (sources.includes(`data-tour="${name}"`) || sources.includes(`tour="${name}"`)) return true;
  const [, kind, id] = name.match(/^(tab|step|create)-(.+)$/) ?? [];
  if (kind === 'tab') return sources.includes(`id: '${id}'`) || sources.includes(`id: '${id}' as`);
  if (kind === 'step') return STEPS.some((s) => s.id === id);
  if (kind === 'create') return ['magus', 'companion', 'mythic', 'grog'].includes(id);
  return false;
}

const ROUTES = [/^\/$/, /^\/help$/, /^\/dice$/, /^\/reference$/, /^\/mechanics$/, /^\/saga\/S$/, /^\/saga\/S\/(spells|enchant|rules|seasons|market|build)$/, /^\/saga\/S\/character\/C(\/create|\/guided)?$/, /^\/saga\/S\/covenant\/V$/];

describe('tutorials', () => {
  it('point only at controls the app marks', () => {
    for (const t of TOURS)
      for (const s of t.steps)
        for (const name of [s.target ?? []].flat()) expect(marked(name), `${t.id}: ${s.title} → ${name}`).toBe(true);
  });

  it('open real wizard steps and go to real pages', () => {
    const ctx = { sagaId: 'S', charId: 'C', covId: 'V' };
    for (const t of TOURS) {
      expect(t.steps.length, t.id).toBeGreaterThan(2);
      for (const s of t.steps) {
        if (s.wizard) expect(STEPS.some((w) => w.id === s.wizard), `${t.id}: ${s.wizard}`).toBe(true);
        const at = s.at?.(ctx);
        if (at) expect(ROUTES.some((r) => r.test(at.split('?')[0])), `${t.id}: ${at}`).toBe(true);
        // a step that needs something says so, and finds no page without it
        if (s.needs) expect(s.at?.({}), `${t.id}: ${s.title}`).toBeUndefined();
      }
    }
  });

  it('offer only real actions and real side trips', () => {
    for (const t of TOURS)
      for (const s of t.steps) {
        for (const a of s.actions ?? []) expect(ACTIONS[a.id], `${t.id}: ${a.id}`).toBeTypeOf('function');
        if (s.detour) expect(TOUR_BY_ID.has(s.detour.tour), `${t.id}: ${s.detour.tour}`).toBe(true);
      }
    for (const o of DETOUR_OFFERS) expect(TOUR_BY_ID.has(o.tour)).toBe(true);
  });

  it('are joined by a Guide that links every area of Game mechanics', () => {
    const guide = Object.values(import.meta.glob('../pages/HelpPage.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0];
    const areas = (mechanics as { areas: { id: string }[] }).areas.map((a) => a.id);
    expect(areas.filter((a) => !guide.includes(`'/mechanics/${a}'`))).toEqual([]);
  });

  it('are listed once each, the tour of the toolkit first', () => {
    expect(new Set(TOURS.map((t) => t.id)).size).toBe(TOURS.length);
    expect(TOURS[0].id).toBe('toolkit');
  });
});
