import { describe, expect, it, beforeEach } from 'vitest';
import {
  saveDocumentUnit,
  loadDocumentUnit,
  clearDocumentUnits,
  saveDocument,
  loadDocument,
  clearAllDurable,
  getDurableStore,
  getDurableKind,
  resetDurableStoreCache,
} from './durableStorage.js';

beforeEach(() => {
  resetDurableStoreCache();
});

describe('durableStorage', () => {
  it('prefers OPFS when available, else IndexedDB or memory', async () => {
    const store = await getDurableStore();
    expect(['opfs', 'indexeddb', 'memory']).toContain(store.kind);
    expect(['opfs', 'indexeddb', 'memory']).toContain(getDurableKind());
  });

  it('round-trips document units without re-parsing', async () => {
    await saveDocumentUnit('doc-1', 0, { paragraphs: ['hello'] });
    expect(await loadDocumentUnit('doc-1', 0)).toEqual({ paragraphs: ['hello'] });
    await clearDocumentUnits('doc-1');
    expect(await loadDocumentUnit('doc-1', 0)).toBeNull();
  });

  it('round-trips documents and clears cleanly', async () => {
    await saveDocument('doc-2', { title: 'T' });
    expect(await loadDocument('doc-2')).toEqual({ title: 'T' });
    await clearAllDurable();
    expect(await loadDocument('doc-2')).toBeNull();
  });

  it('handles underscore keys and avoids prefix collisions on clear', async () => {
    await saveDocumentUnit('my_doc', 0, { paragraphs: ['a'] });
    await saveDocumentUnit('my_doc_extra', 0, { paragraphs: ['b'] });
    await clearDocumentUnits('my_doc');
    expect(await loadDocumentUnit('my_doc', 0)).toBeNull();
    expect(await loadDocumentUnit('my_doc_extra', 0)).toEqual({ paragraphs: ['b'] });
    await clearAllDurable();
  });
});
