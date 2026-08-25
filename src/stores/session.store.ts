import { create } from 'zustand';

import { authService } from '@/services/auth.service';

/**
 * Session state for the UI layer.
 *
 * Holds ONLY derived, non-sensitive facts: authentication status and user id.
 * Raw tokens stay inside SecureStore / supabase-js and are never exposed
 * through this store.
 */

export type SessionStatus = 'initializing' | 'authenticated' | 'unauthenticated';

interface SessionState {
  status: SessionStatus;
  userId: string | null;

  /** Restores the persisted session and subscribes to future changes. Idempotent. */
  initialize: () => Promise<void>;
}

let unsubscribe: (() => void) | null = null;

export const useSessionStore = create<SessionState>((set) => ({
  status: 'initializing',
  userId: null,

  initialize: async () => {
    // Attach the auth-state listener exactly once; it also keeps the store
    // in sync with token refreshes, sign-outs and other sessions.
    if (!unsubscribe) {
      unsubscribe = authService.onSessionChange((userId) => {
        set({
          status: userId ? 'authenticated' : 'unauthenticated',
          userId,
        });
      });
    }

    try {
      const userId = await authService.getCurrentUserId();
      set({
        status: userId ? 'authenticated' : 'unauthenticated',
        userId,
      });
    } catch {
      // A failed restore means no usable session; treat as signed out.
      // The error itself is intentionally swallowed — it contains nothing
      // actionable for the UI and must not leak into logs.
      set({ status: 'unauthenticated', userId: null });
    }
  },
}));
