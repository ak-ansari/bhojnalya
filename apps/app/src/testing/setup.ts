import './indexedDb';
import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

import { server } from '@/mocks/server';

// A lazy route chunk plus the first IndexedDB open can pass 1 s on a loaded
// CI machine; findBy* waits longer before calling it a failure.
configure({ asyncUtilTimeout: 5_000 });

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// jsdom has no StorageManager; model a browser that has already granted
// persistent storage. A test about the warning replaces it.
beforeEach(() => {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: { persisted: () => Promise.resolve(true), persist: () => Promise.resolve(true) },
  });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.restoreAllMocks();
  localStorage.clear();
});

afterAll(() => {
  server.close();
});
