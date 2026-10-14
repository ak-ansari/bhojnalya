// An in-memory IndexedDB, installed before any test module loads Dexie:
// Dexie reads the global IndexedDB once, when it is first imported.
import 'fake-indexeddb/auto';
