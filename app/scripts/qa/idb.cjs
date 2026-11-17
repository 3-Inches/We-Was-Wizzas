// Helper to read the app's IndexedDB state in a page
module.exports = async (page) => page.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('keyval-store');
  r.onsuccess = () => { const tx = r.result.transaction('keyval', 'readonly'); const g = tx.objectStore('keyval').get('arm5-toolkit-state-v1'); g.onsuccess = () => res(g.result); };
  r.onerror = () => res(null);
}));
