import * as WebBrowser from 'expo-web-browser';
import { createURL } from 'expo-linking';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

import { AppAuthError, mapAuthError } from '@/features/auth/auth-errors';

import { supabase } from './supabase.client';
import { logDev } from '@/utils/logger';

/**
 * Authentication service — the ONLY module that touches supabase.auth.
 *
 * SECURITY:
 * - Credentials and tokens are never logged here (or anywhere in the app).
 * - Callers receive either success or an AppAuthError whose userMessage is
 *   safe for UI display; raw Supabase errors never escape this module.
 * - Sessions persist through the SecureStore adapter configured on the
 *   Supabase client; tokens never touch AsyncStorage or app state.
 *
 * EMAIL/PASSWORD:
 * - Delegates entirely to Supabase Auth. The existing on_auth_user_created
 *   database trigger creates public.users server-side; this service never
 *   inserts profile rows and never stores passwords anywhere.
 *
 * GOOGLE OAUTH (native, PKCE):
 * - Mobile flow: open a system browser session against the Supabase authorize
 *   endpoint; Google redirects back into the app via the `money-manager://`
 *   scheme; the authorization code is exchanged locally by supabase-js
 *   (`exchangeCodeForSession`). No client secret exists in the app.
 * - External prerequisites (Supabase provider config + Google Cloud Console
 *   redirect URIs) are documented in docs/AUTH_SETUP.md.
 */

/** Safe user facts exposed to the rest of the app. Never contains tokens. */
export interface SafeUserInfo {
  userId: string;
  email: string | null;
}

const OAUTH_REDIRECT_PATH = '/auth/callback';

async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

function toSafeUser(user: SupabaseUser | null | undefined): SafeUserInfo | null {
  if (!user) {
    return null;
  }
  return { userId: user.id, email: user.email ?? null };
}

async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw mapAuthError(error);
  }
}

async function signUp(email: string, password: string): Promise<void> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // No user metadata is passed: public.users.display_name stays null until
    // profile customization exists. The DB trigger handles row creation.
  });
  if (error) {
    throw mapAuthError(error);
  }
  // When email confirmation is enabled, data.session is null here even on
  // success. That is a valid outcome, not an error; the UI communicates it.
  logDev('signUp completed', { hasSession: Boolean(data.session) });
}

async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw mapAuthError(error);
  }
}

/**
 * Google OAuth via system browser + PKCE code exchange.
 * Resolves when the session is established (the store updates through the
 * onAuthStateChange listener). Throws AppAuthError('cancelled') when the
 * user closes the browser without completing the flow.
 */
async function signInWithGoogle(): Promise<void> {
  const redirectTo = createURL(OAUTH_REDIRECT_PATH);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true, // native: WE open the browser ourselves
    },
  });
  if (error) {
    throw mapAuthError(error);
  }
  if (!data.url) {
    logDev('OAuth: missing authorize URL');
    throw new AppAuthError(
      'unknown',
      'Could not start Google sign-in. Please try again.',
    );
  }

  const browserResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (browserResult.type !== 'success' || !browserResult.url) {
    logDev('OAuth cancelled or dismissed', { type: browserResult.type });
    throw new AppAuthError('cancelled', 'Sign-in was cancelled.');
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    browserResult.url,
  );
  if (exchangeError) {
    throw mapAuthError(exchangeError);
  }
}

async function restoreSession(): Promise<SafeUserInfo | null> {
  const session = await getSession();
  return toSafeUser(session?.user);
}

async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

/**
 * Subscribes to session changes. The callback receives safe user info
 * (or null on sign-out) — never raw tokens or the full session object.
 * Returns an unsubscribe function.
 */
function onSessionChange(callback: (user: SafeUserInfo | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
    callback(toSafeUser(session?.user));
  });
  return () => {
    data.subscription.unsubscribe();
  };
}

export const authService = {
  signInWithPassword,
  signUp,
  signOut,
  signInWithGoogle,
  restoreSession,
  getCurrentUserId,
  onSessionChange,
};

export type AuthService = typeof authService;

