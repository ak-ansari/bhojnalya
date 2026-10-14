// Storage durability for the till (TRD §8.2): ask the browser to keep this
// site's data under storage pressure, and spot an iPad running the till in a
// Safari tab, where uninstalled sites' storage can be evicted.

export type StorageProtection = 'persisted' | 'not-persisted' | 'unsupported';

/** The slice of `navigator.storage` this needs, so tests can pass their own. */
export interface PersistApi {
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
}

export async function requestPersistentStorage(
  // Older Safari and non-secure origins have no StorageManager at all.
  storage: PersistApi | undefined = (navigator as { storage?: PersistApi }).storage,
): Promise<StorageProtection> {
  if (!storage?.persist || !storage.persisted) return 'unsupported';
  if (await storage.persisted()) return 'persisted';
  return (await storage.persist()) ? 'persisted' : 'not-persisted';
}

/** True on an iPad or iPhone where the till is not opened from the Home Screen. */
export function needsHomeScreenInstall(): boolean {
  const { userAgent, maxTouchPoints } = navigator;
  // iPadOS reports a desktop Mac user agent; touch points tell them apart.
  const apple =
    /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  if (!apple) return false;
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches);
  return !standalone;
}
