// IndexedDB-backed polyfill for the Claude.ai artifact `window.storage` API,
// so App.jsx's loadKey/saveKey/deleteKey helpers work unchanged outside that sandbox.
// IndexedDB gives ample quota for base64 refurb photos (localStorage caps out ~5-10MB).

const DB_NAME = 'tdm-equipment-hub';
const STORE = 'kv';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const request = fn(store);
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error);
  });
}

export const storage = {
  async get(key) {
    const row = await withStore('readonly', (store) => store.get(key));
    return row ? { value: row.value } : null;
  },
  async set(key, value) {
    await withStore('readwrite', (store) => store.put({ key, value }));
  },
  async delete(key) {
    await withStore('readwrite', (store) => store.delete(key));
  }
};
