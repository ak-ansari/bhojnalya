// The signed-in session: the access token, held in memory only (the refresh
// token is an httpOnly cookie, TRD §13), and the claims decoded from it.
import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { decodeAccessClaims } from './accessClaims';
import type { AccessClaims } from './accessClaims';

interface Session {
  accessToken: string | null;
  claims: AccessClaims | null;
  setAccessToken: (token: string | null) => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({
  initialToken = null,
  children,
}: {
  initialToken?: string | null;
  children: ReactNode;
}) {
  const [accessToken, setAccessToken] = useState(initialToken);
  const session = useMemo(
    () => ({ accessToken, claims: decodeAccessClaims(accessToken), setAccessToken }),
    [accessToken],
  );
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside SessionProvider');
  return session;
}
