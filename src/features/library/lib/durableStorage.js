export const DB_NAME = 'bookflow-durable';
export const DB_VERSION = 1;
export const STORES = {
  DOCUMENTS: 'documents',
  UNITS: 'units',
};

const hasIndexedDb = typeof indexedDB !== 'undefined';

function hasOpfs() {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.storage &&
    typeof navigator.storage.getDirectory === 'function'
  );
}

function memoryStore() {
  const documents = new Map();
  const units = new Map();
  return {
    kind: 'memory',
    async open() { return true; },
    async setDocument(documentId, value) { documents.set(documentId, value); return true; },
    async getDocument(documentId) { return documents.get(documentId) ?? null; },
    async deleteDocument(documentId) { documents.delete(documentId); return true; },
    async setUnit(key, value) { units.set(key, value); return true; },
    async getUnit(key) { return units.get(key) ?? null; },
    async deleteUnit(key) { units.delete(key); return true; },
    async unitKeys() { return [...units.keys()]; },
    async clear() { documents.clear(); units.clear(); return true; },
  };
}

function openDatabase() {
  if (!hasIndexedDb) return Promise.reject(new Error('IndexedDB unavailable'));

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
        db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.UNITS)) {
        db.createObjectStore(STORES.UNITS, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
    request.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
}

function wrapTransaction(db, storeName, mode, operation) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    transaction.oncomplete = () => resolve(request?.result ?? true);
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

async function idbStore() {
  const db = await openDatabase();

  const set = (storeName, key, value) =>
    wrapTransaction(db, storeName, 'readwrite', (store) => store.put({ key, ...value }));
  const get = (storeName, key) =>
    wrapTransaction(db, storeName, 'readonly', (store) => store.get(key));
  const del = (storeName, key) =>
    wrapTransaction(db, storeName, 'readwrite', (store) => store.delete(key));
  const clearStore = (storeName) =>
    wrapTransaction(db, storeName, 'readwrite', (store) => store.clear());
  const listKeys = (storeName) =>
    wrapTransaction(db, storeName, 'readonly', (store) => store.getAllKeys());

  return {
    kind: 'indexeddb',
    async open() { return true; },
    async setDocument(documentId, value) {
      return set(STORES.DOCUMENTS, documentId, value);
    },
    async getDocument(documentId) {
      return (await get(STORES.DOCUMENTS, documentId)) ?? null;
    },
    async deleteDocument(documentId) {
      return del(STORES.DOCUMENTS, documentId);
    },
    async setUnit(key, value) {
      return set(STORES.UNITS, key, value);
    },
    async getUnit(key) {
      return (await get(STORES.UNITS, key)) ?? null;
    },
    async deleteUnit(key) {
      return del(STORES.UNITS, key);
    },
    async unitKeys() {
      const all = await listKeys(STORES.UNITS);
      return Array.isArray(all) ? all : [];
    },
    async clear() {
      await Promise.all([clearStore(STORES.DOCUMENTS), clearStore(STORES.UNITS)]);
      return true;
    },
  };
}

function encodeOpfsName(key) {
  const bytes = new TextEncoder().encode(String(key));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeOpfsName(name) {
  try {
    let padded = String(name).replace(/-/g, '+').replace(/_/g, '/');
    while (padded.length % 4) padded += '=';
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (err) {
    void err;
    return null;
  }
}

async function opfsStore() {
  if (!hasOpfs()) throw new Error('OPFS unavailable');
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle('bookflow-units', { create: true });

  async function writeFile(name, record) {
    const handle = await dir.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    try {
      await writable.write(JSON.stringify(record));
    } finally {
      await writable.close();
    }
    return true;
  }

  async function readFile(name) {
    try {
      const handle = await dir.getFileHandle(name, { create: false });
      const file = await handle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  async function removeFile(name) {
    try {
      await dir.removeEntry(name);
    } catch (err) {
      void err;
    }
    return true;
  }

  return {
    kind: 'opfs',
    async open() { return true; },
    async setDocument(documentId, value) {
      return writeFile(`doc-${encodeOpfsName(documentId)}.json`, value);
    },
    async getDocument(documentId) {
      return readFile(`doc-${encodeOpfsName(documentId)}.json`);
    },
    async deleteDocument(documentId) {
      return removeFile(`doc-${encodeOpfsName(documentId)}.json`);
    },
    async setUnit(key, value) {
      return writeFile(`unit-${encodeOpfsName(key)}.json`, value);
    },
    async getUnit(key) {
      return readFile(`unit-${encodeOpfsName(key)}.json`);
    },
    async deleteUnit(key) {
      return removeFile(`unit-${encodeOpfsName(key)}.json`);
    },
    async unitKeys() {
      const keys = [];
      try {
        for await (const [name] of dir.entries()) {
          if (!name.startsWith('unit-') || !name.endsWith('.json')) continue;
          const decoded = decodeOpfsName(name.slice(5, -5));
          if (decoded) keys.push(decoded);
        }
      } catch (err) {
        void err;
        return [];
      }
      return keys;
    },
    async clear() {
      try {
        for await (const [name] of dir.entries()) {
          try {
            await dir.removeEntry(name);
          } catch (inner) {
            void inner;
          }
        }
      } catch (outer) {
        void outer;
      }
      return true;
    },
  };
}

let cachedStore = null;

export async function getDurableStore() {
  if (cachedStore) return cachedStore;

  if (hasOpfs()) {
    try {
      cachedStore = await opfsStore();
      return cachedStore;
    } catch {
      cachedStore = null;
    }
  }

  if (hasIndexedDb) {
    try {
      cachedStore = await idbStore();
      return cachedStore;
    } catch {
      cachedStore = null;
    }
  }

  cachedStore = memoryStore();
  return cachedStore;
}

export function getDurableKind() {
  if (cachedStore?.kind) return cachedStore.kind;
  return 'uninitialized';
}

export function isDurableStorageAvailable() {
  return hasOpfs() || hasIndexedDb;
}

function unitKey(documentId, unitIndex) {
  return `${documentId}::${unitIndex}`;
}

export async function saveDocumentUnit(documentId, unitIndex, unit) {
  const store = await getDurableStore();
  const key = unitKey(documentId, unitIndex);
  return store.setUnit(key, { documentId, unitIndex, unit, savedAt: Date.now() });
}

export async function loadDocumentUnit(documentId, unitIndex) {
  const store = await getDurableStore();
  const record = await store.getUnit(unitKey(documentId, unitIndex));
  return record?.unit ?? null;
}

export async function clearDocumentUnits(documentId) {
  const store = await getDurableStore();
  const keys = await store.unitKeys();
  const matching = keys.filter((key) => {
    const text = String(key);
    if (!text.startsWith(`${documentId}::`)) return false;
    const rest = text.slice(documentId.length + 2);
    return /^\d+$/.test(rest);
  });
  await Promise.all(matching.map((key) => store.deleteUnit(key)));
  return true;
}

export async function saveDocument(documentId, document) {
  const store = await getDurableStore();
  return store.setDocument(documentId, { documentId, document, savedAt: Date.now() });
}

export async function loadDocument(documentId) {
  const store = await getDurableStore();
  const record = await store.getDocument(documentId);
  return record?.document ?? null;
}

export async function clearAllDurable() {
  const store = await getDurableStore();
  return store.clear();
}

export function resetDurableStoreCache() {
  cachedStore = null;
}
