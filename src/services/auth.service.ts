import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

import { supabase } from './supabase.client';

/**
 * Authentication service — the ONLY module that touches supabase.auth.
 *
 * SECURITY:
 * - Credentials and tokens are never logged here (or anywhere in the app).
 * - Errors are propagated to callers for UI handling; they contain no
 *   secrets. Sessions themselves never leave SecureStore except through
 *   supabase-js internals.
 */

async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

export const authService = {
  /** Returns the current session's user id, or null when signed out. */
  async getCurrentUserId(): Promise<string | null> {
    const session = await getSession();
    return session?.user?.id ?? null;
  },

  async signInWithPassword(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
  },

  async signUp(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      throw error;
    }
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  },

  /**
   * Subscribes to session changes. The callback receives the user id
   * (or null on sign-out) — never raw tokens or the full session.
   * Returns an unsubscribe function.
   */
  onSessionChange(callback: (userId: string | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      callback(session?.user?.id ?? null);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  },

  /** Exposed for rare low-level needs (e.g. token viewers in debug builds). */
  async getSupabaseUser(): Promise<SupabaseUser | null> {
    const session = await getSession();
    return session?.user ?? null;
  },
};
