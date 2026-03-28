import { useAuth } from '@clerk/clerk-react';
import { useMemo } from 'react';
import { createApiClient, type ApiClient } from '../api/client';

export function useApi(): ApiClient | null {
  const { getToken, isSignedIn } = useAuth();

  return useMemo(() => {
    if (!isSignedIn) return null;

    // Return a proxy that fetches a fresh token on each call
    const handler: ProxyHandler<ApiClient> = {
      get(_target, prop) {
        return async (...args: unknown[]) => {
          const token = await getToken();
          if (!token) throw new Error('Not authenticated');
          const client = createApiClient(token);
          return (client[prop as keyof ApiClient] as (...a: unknown[]) => unknown)(...args);
        };
      },
    };

    return new Proxy({} as ApiClient, handler);
  }, [isSignedIn, getToken]);
}
