import { create } from 'zustand';

import { authService, type SafeUserInfo } from '@/services/auth.service';
import { mapAuthError } from '@/features/auth/auth-errors';
import { logDev } from '@/utils/logger';

/**
 * Session state for the UI layer.
 *
 * DECISION — safe projection, not the raw session:
 * Zustand exposes ONLY derived, non-sensitive facts (status, userId, email).
 * The full Supabase Session (access_token / refresh_token / expiry) stays
 * inside supabase-js + SecureStore. Reasons:
 * 1. Tokens in app state risk accidental logging/serialization (e.g. devtools).
 * 2. supabase-js already refreshes and persists sessions transparently;
 *    duplicating it in Zustand would create two sources of truth.
 * 3. Nothing in the UI legitimately needs a raw token.
 */

export type SessionStatus = 'initializing' | 'authenticated' | 'unauthenticated';

interface SessionState {
  status: SessionStatus;
  userId: string | null;
  /** May be shown in the protected placeholder ("signed in as …"). */
  email: string | null;

  /** Restores the persisted session and subscribes to future changes. Idempotent. */
  initialize: () => Promise<void>;

  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

let unsubscribe: (() => void) | null = null;

function applyUser(user: SafeUserInfo | null) {
  return {
    status: user ? ('authenticated' as const) : ('unauthenticated' as const),
    userId: user?.userId ?? null,
    email: user?.email ?? null,
  };
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'initializing',
  userId: null,
  email: null,

  initialize: async () => {
    // Attach the auth-state listener exactly once; it keeps the store in sync
    // with token refreshes, OAuth completions, sign-outs and other devices.
    if (!unsubscribe) {
      unsubscribe = authService.onSessionChange((user) => {
        set(applyUser(user));
      });
    }

    try {
      const user = await authService.restoreSession();
      set(applyUser(user));
    } catch (restoreError) {
      // A failed restore means no usable session right now; treat as signed
      // out rather than blocking the app. Technical detail goes to the dev
      // logger only.
      const mapped = mapAuthError(restoreError);
      set({ status: 'unauthenticated', userId: null, email: null });
      logDev('session restore failed', { code: mapped.code });
    }
  },

  /**
   * Thin pass-throughs: the UI reaches authentication ONLY through this store,
   * never via supabase-js directly. Store state converges automatically
   * through the onAuthStateChange listener after each action resolves.
   */
  signInWithPassword: async (email, password) => {
    await authService.signInWithPassword(email, password);
  },

  signUp: async (email, password) => {
    await authService.signUp(email, password);
  },

  signInWithGoogle: async () => {
    await authService.signInWithGoogle();
  },

  signOut: async () => {
    await authService.signOut();
  },
}));

