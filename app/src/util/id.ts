/** Short random ids (collision-safe enough for a local-first app). */
export function uid(): string {
  const rnd = typeof crypto !== 'undefined' && 'getRandomValues' in crypto
    ? Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('')
    : Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
  return rnd.slice(0, 12);
}
