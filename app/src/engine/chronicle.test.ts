// The Chronicle tells a season as a story: the land, the people, the road, the harvest and the vis at
// the year's end, the Tribunal's news; and the clock writes it as each season ends.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newSaga } from '../store/store';
import { writeChronicle } from './chronicle';
import { newCovenant } from './covenant';
import { ensureAbility, newCharacter } from './character/factory';
import { advanceSeasons } from './time';
import { DEFAULT_ADVANCE } from './time';

const data = buildGameData();
const steady = () => {
  let i = 0;
  return () => ((i++ * 0.37) % 1);
};

describe('the Chronicle', () => {
  it('tells the people, the road, the harvest, the vis and the news', () => {
    const story = writeChronicle(
      {
        year: 1221,
        season: 'Winter',
        covenants: [{ name: 'Testhold', realm: 'Magic', road: 'minor', incomes: [{ name: 'The mill', mod: 'Boom' }, { name: 'The farms', mod: 'Status Quo' }], vis: [{ name: 'the Weeping Oak', art: 'He', pawns: 4 }], balance: 12, treasury: 80, feasts: true }],
        people: [
          { name: 'Cornelia', type: 'magus', did: 'invent-spell' },
          { name: 'Albrecht', type: 'companion', did: 'exposure' },
          { name: 'Sophia', type: 'grog' },
        ],
        aged: ['Albrecht'],
        news: [{ uid: 'n', year: 1221, season: 'Winter', kind: 'death', text: 'Murion of Durenmar has died.' }],
      },
      steady(),
    );
    const titles = story.map((s) => s.title);
    expect(titles[0]).toBe('Winter 1221');
    expect(titles).toEqual(expect.arrayContaining(['At the covenant', 'Visitors', 'The year’s harvest', 'The vis harvest', 'The passing year', 'News from the Tribunal']));
    const all = story.map((s) => s.text).join(' ');
    expect(all).toMatch(/Cornelia .*laboratory/);
    expect(all).toMatch(/The mill had a year beyond all hope/);
    expect(all).toMatch(/4 pawns of Herbam from the Weeping Oak/);
    expect(all).toMatch(/Grim news came: Murion of Durenmar has died\./);
    expect(all).not.toMatch(/\b(he|she|his|her|him)\b/i);
  });

  it('is written as each season ends, with the income sources rolling their year', () => {
    const s = newSaga('T');
    s.currentYear = 1220;
    s.currentSeason = 'Autumn';
    const cov = newCovenant(s.id, 1220);
    cov.name = 'Testhold';
    const c = newCharacter('companion', s.id);
    c.name = 'Albrecht';
    c.creation.finalized = true;
    c.age = 25;
    ensureAbility(c, 'awareness', { laterLife: 30 });
    cov.memberIds.push(c.id);
    c.covenantId = cov.id;
    const { reports } = advanceSeasons({ saga: s, characters: [c], covenants: [cov] }, data, 2, DEFAULT_ADVANCE);
    expect(reports.every((r) => (r.story?.length ?? 0) > 0)).toBe(true);
    const winter = reports.find((r) => r.season === 'Winter')!;
    expect(winter.story!.some((x) => x.title === 'The year’s harvest')).toBe(true);
    expect(winter.story!.find((x) => x.title === 'At the covenant')?.text).toMatch(/Albrecht/);
  });
});

describe('what the agents heard', () => {
  it('brings a bound agent’s report, from the Tribunal’s business or their walk of life; never one still being won over', async () => {
    const { agentReports } = await import('./agency');
    const agents = [
      { uid: 'a', name: 'Old Wilm', status: 'Free Social Status', resources: '', bondTrait: 'Loyal', bond: 3, resistance: 0 },
      { uid: 'b', name: 'Brother Aldo', status: 'Minor Social Virtue (Clerk, Knight, Priest…)', resources: '', bondTrait: 'Loyal', bond: 0, resistance: 2 },
    ];
    const lines = [
      { who: 'Petrus', text: 'Study from vis: studying Creo vis.', covenant: 'Durenmar' },
      { who: 'Murion', text: 'Invented a spell: Ward against the Dead.', covenant: 'Durenmar' },
    ];
    const r = agentReports([{ id: 'p', name: 'Albrecht', agents }], lines, 1222, 'Spring', () => 0.1);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: 'report', characterId: 'p', agent: 'Old Wilm' });
    expect(r[0].text).toMatch(/Old Wilm, Albrecht’s agent, heard of Durenmar’s business: Murion — Invented a spell/);
  });
});
