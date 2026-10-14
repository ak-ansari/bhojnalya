import { QueryClient } from '@tanstack/react-query';

/** The app's query client. Tests build their own with `retry: false`. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: false },
    },
  });
}
