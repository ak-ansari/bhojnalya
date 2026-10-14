// Whether the browser has a network, from `navigator.onLine` and its events.
// It reports the device's link, not the API's health: a till offline by this
// measure keeps billing, and sync retries on its own (TRD §8.1).
import { useSyncExternalStore } from 'react';

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, readOnline, () => true);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

function readOnline(): boolean {
  return navigator.onLine;
}
