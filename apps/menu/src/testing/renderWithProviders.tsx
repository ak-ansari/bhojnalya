// Renders the whole app at a path with real i18n and an in-memory location.
import { render } from '@testing-library/react';
import { memoryLocation } from 'wouter/memory-location';

import { App } from '@/app/App.js';
import { createI18n } from '@/libs/i18n/i18n.js';

export function renderAt(path: string) {
  const { hook } = memoryLocation({ path });
  return render(<App i18n={createI18n()} locationHook={hook} />);
}
