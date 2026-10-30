import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newSaga } from '../store/store';
import { newCharacter } from './character/factory';
import { newCovenant } from './covenant';
import { storySeeds, tellStory, upcoming } from './calendar';

const data = buildGameData();

function state() {
  const saga = newSaga('Calendar');
  saga.tribunal = 'Rhine';
  saga.currentYear = 1224;
  saga.currentSeason = 'Summer';
  const cov = newCovenant(saga.id, 1220);
  cov.name = 'Testhold';
  const m = newCharacter('magus', saga.id, 1224);
  m.name = 'Aelia';
  m.age = 33;
  m.creation.finalized = true;
  m.virtues.push({ uid: 'ds', defId: 'dark-secret-flaw', size: 'Minor' } as never, { uid: 'wr', defId: 'wrathful-flaw', size: 'Minor' } as never);
  m.apprentice = { name: 'Odo', age: 10, since: 1212 } as never;
  const g = newCharacter('grog', saga.id, 1224);
  g.name = 'Bertram';
  g.creation.finalized = true;
  g.virtues.push({ uid: 'en', defId: 'enemies-flaw', size: 'Minor' } as never);
  cov.memberIds = [m.id, g.id];
  cov.hooksBoons.push({ uid: 'nd', name: 'Natural Disaster', kind: 'hook', size: 'Minor', due: { year: 1225, season: 'Spring' } }, { uid: 'dk', name: 'Dark Secret', kind: 'hook', size: 'Minor' });
  cov.effects = [{ uid: 'ae', name: 'Aegis of the Hearth', year: 1224, season: 'Winter', duration: 'year', renew: { level: 20 } }];
  saga.calendar = [{ uid: 'fair', year: 1220, season: 'Summer', text: 'The Midsummer fair at Mainz', every: 1 }];
  return { saga, characters: [m, g], covenants: [cov] };
}

describe('the saga calendar', () => {
  it('keeps the dates: gatherings, Hooks due, wards, a magus turning 35, an apprentice’s Gauntlet, the troupe’s own', () => {
    const st = state();
    const texts = upcoming(st, 4).map((e) => `${e.season} ${e.year}: ${e.text}`);
    const has = (re: RegExp) => expect(texts.some((t) => re.test(t)), `${re}\n${texts.join('\n')}`).toBe(true);
    has(/^Spring 1227: The Rhine Tribunal meets at Durenmar/);
    has(/^Spring 1225: Testhold: the Natural Disaster strikes/);
    has(/^Winter 1225: Testhold: Aegis of the Hearth is cast again \(4 pawns/);
    has(/^Spring 1226: Aelia turns 35/);
    has(/^Spring 1227: Odo, Aelia’s apprentice, faces the Gauntlet/);
    has(/^Summer 1224: The Midsummer fair at Mainz \(every year\)/);
    has(/^Summer 1225: The Midsummer fair/);
    has(/^Winter 1224: The year closes/);
    has(/Dark Secret: the secret crops up again/);
    // soonest first, nothing before now
    const order = upcoming(st, 4).map((e) => e.year * 4 + ['Spring', 'Summer', 'Autumn', 'Winter'].indexOf(e.season));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(Math.min(...order)).toBeGreaterThanOrEqual(1224 * 4 + 1);
  });

  it('lists the stories waiting, the longest untold first, and marks one told', () => {
    const st = state();
    const seeds = storySeeds(st, data);
    expect(seeds.map((s) => s.title)).toEqual(expect.arrayContaining(['Dark Secret', 'Wrathful', 'Enemies', 'Natural Disaster']));
    tellStory(st, seeds.find((s) => s.title === 'Dark Secret' && s.who === 'Aelia')!.key, 1224);
    const again = storySeeds(st, data);
    expect(again.at(-1)).toMatchObject({ title: 'Dark Secret', who: 'Aelia', last: 1224 });
    tellStory(st, again.find((s) => s.title === 'Natural Disaster')!.key, 1223);
    expect(st.covenants[0].hookStories!.nd).toBe(1223);
  });
});
