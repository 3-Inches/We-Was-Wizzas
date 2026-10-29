// Writes a generated test saga (src/engine/testing/sagaFixture) as a saga file the app can import:
// `npm run qa:saga`, then Import file… on the home page, or `npm run qa:sweep` to visit every page of
// it in a browser. QA_SEED, QA_SEASONS (seasons played before it is written), QA_TRIBUNAL, QA_LIVING
// (the Tribunal book's covenants to build in as living covenants, by id; 'none' for none) and QA_OUT
// (the file; scripts/qa/out/saga.json by default) change what is made.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { it } from 'vitest';
import { buildGameData } from '../../src/data';
import { buildTestSaga } from '../../src/engine/testing/sagaFixture';

it('writes the test saga', () => {
  const seed = Number(process.env.QA_SEED ?? 7);
  const seasons = Number(process.env.QA_SEASONS ?? 8);
  const out = resolve(process.env.QA_OUT ?? 'scripts/qa/out/saga.json');
  const living = (process.env.QA_LIVING ?? 'heorot,triamore,dankmar').split(',').filter((x) => x && x !== 'none');
  const state = buildTestSaga(buildGameData(), { seed, seasons, tribunal: process.env.QA_TRIBUNAL, name: `QA saga ${seed}`, living });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ format: 'arm5-toolkit', kind: 'saga', version: 1, exportedAt: new Date().toISOString(), ...state }, null, 1));
  console.log(`${out}: ${state.saga.name}, ${state.saga.currentSeason} ${state.saga.currentYear}, ${state.characters.length} characters, ${state.covenants.length} covenants`);
});
