// Every API path the app calls; code and MSW handlers both read from here.
// Feature tickets add their resources as they are built.
export const API_BASE = '/api/v1';

export const API_ENDPOINTS = {
  SYNC: {
    PUSH: `${API_BASE}/sync/push`,
    PULL: `${API_BASE}/sync/pull`,
  },
} as const;

/** The Socket.io namespace for staff devices (TRD §9). */
export const STAFF_SOCKET_NAMESPACE = '/staff';
