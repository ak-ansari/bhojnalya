// Reloads the page as it is: no storage or cache is cleared, so unsynced
// bills in IndexedDB and the device role in localStorage survive. A module of
// its own so tests can replace it (jsdom cannot reload).
export function reloadPage(): void {
  window.location.reload();
}
