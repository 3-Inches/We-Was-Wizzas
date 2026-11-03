// Ending a season moves everyone on at once, so a double press (or a press twice in a moment, on the
// Game table and then the Seasons page) must not end two seasons: a second press within a moment of the
// first is let go.
let last = 0;
const MOMENT_MS = 1200;

/** Whether time may move on now; true also marks it as moved. */
export function timeMayMove(now = Date.now()): boolean {
  if (now - last < MOMENT_MS) return false;
  last = now;
  return true;
}
