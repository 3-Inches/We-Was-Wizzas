// The QA scripts' own Vitest config (`npm run qa:saga`): they write files, so they stay out of the
// test suite and out of the type-checked sources.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['scripts/qa/**/*.qa.ts'],
    testTimeout: 600_000,
  },
});
