// Re-renders when the data a Dexie query read changes (Dexie's liveQuery).
// Written here instead of taking dexie-react-hooks, whose CommonJS build
// loads a second copy of Dexie under Vitest and never sees our writes.
import { liveQuery } from 'dexie';
import { useEffect, useState, type DependencyList } from 'react';

/** `undefined` until the first result arrives. A failing query throws into the nearest error boundary. */
export function useLiveQuery<T>(query: () => Promise<T>, deps: DependencyList): T | undefined {
  const [state, setState] = useState<{ value: T | undefined; error: Error | null }>({
    value: undefined,
    error: null,
  });

  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: (value) => {
        setState({ value, error: null });
      },
      error: (error: unknown) => {
        setState({
          value: undefined,
          error: error instanceof Error ? error : new Error('live query failed', { cause: error }),
        });
      },
    });
    return () => {
      subscription.unsubscribe();
    };
    // The caller's deps decide when the query is a different query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  if (state.error) throw state.error;
  return state.value;
}
