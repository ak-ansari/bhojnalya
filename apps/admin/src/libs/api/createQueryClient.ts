// Server state lives in TanStack Query. One client per app (and per test).
import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(options: { retry?: boolean } = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: options.retry ?? 2, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}
