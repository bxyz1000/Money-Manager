import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

import { AppAuthError, mapAuthError } from '@/features/auth/auth-errors';
import { supabase } from './supabase.client';
import { logDev } from '@/utils/logger';

export interface SafeUserInfo {
  userId: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
}

const REDIRECT_URI = 'money-manager://auth/callback';

async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

function toSafeUser(
  user: SupabaseUser | null | undefined,
): SafeUserInfo | null {
  if (!user) {
    return null;
  }

  const metaName =
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
    (typeof user.user_metadata?.display_name === 'string' && user.user_metadata.display_name.trim()) ||
    null;

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName: metaName,
    isAnonymous: Boolean(user.is_anonymous),
  };
}

async function signInAnonymously(name: string): Promise<void> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new AppAuthError('unknown', 'Please enter your name.');
  }

  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: {
        full_name: trimmedName,
        name: trimmedName,
      },
    },
  });

  if (error) {
    throw mapAuthError(error);
  }

  const user = data.user;
  if (user) {
    // Immediately after anonymous session is created, upsert display name into profiles table
    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        name: trimmedName,
      });
    } catch (upsertErr) {
      logDev('profiles upsert warning', { err: String(upsertErr) });
    }

    // Also upsert into users table for foreign-key consistency across the schema
    try {
      await supabase.from('users').upsert({
        id: user.id,
        display_name: trimmedName,
      });
    } catch (userUpsertErr) {
      logDev('users upsert warning', { err: String(userUpsertErr) });
    }
  }
}

async function signInWithPassword(
  email: string,
  password: string,
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw mapAuthError(error);
  }
}

async function signUp(
  email: string,
  password: string,
): Promise<void> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw mapAuthError(error);
  }

  logDev('signUp completed', {
    hasSession: Boolean(data.session),
  });
}

async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw mapAuthError(error);
  }
}

async function signInWithGoogle(): Promise<void> {
  const redirectTo = REDIRECT_URI;

  logDev('Google OAuth redirect', {
    redirectTo,
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    throw mapAuthError(error);
  }

  if (!data.url) {
    throw new AppAuthError(
      'unknown',
      'Could not start Google sign-in. Please try again.',
    );
  }

  const browserResult = await WebBrowser.openAuthSessionAsync(
    data.url,
    redirectTo,
  );

  if (browserResult.type !== 'success' || !browserResult.url) {
    logDev('OAuth cancelled', {
      type: browserResult.type,
    });

    throw new AppAuthError(
      'cancelled',
      'Sign-in was cancelled.',
    );
  }

  const callbackUrl = browserResult.url;

  logDev('Google OAuth callback received');

  const parsed = Linking.parse(callbackUrl);

  const code =
    typeof parsed.queryParams?.code === 'string'
      ? parsed.queryParams.code
      : null;

  const errorDescription =
    typeof parsed.queryParams?.error_description === 'string'
      ? parsed.queryParams.error_description
      : null;

  if (errorDescription) {
    throw new AppAuthError(
      'unknown',
      errorDescription,
    );
  }

  if (!code) {
    throw new AppAuthError(
      'unknown',
      'Google sign-in did not return an authentication code.',
    );
  }

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    throw mapAuthError(exchangeError);
  }
}

async function linkGoogleAccount(): Promise<void> {
  const redirectTo = REDIRECT_URI;

  logDev('Google OAuth link redirect', {
    redirectTo,
  });

  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    throw mapAuthError(error);
  }

  if (!data.url) {
    throw new AppAuthError(
      'unknown',
      'Could not start Google account linking. Please try again.',
    );
  }

  const browserResult = await WebBrowser.openAuthSessionAsync(
    data.url,
    redirectTo,
  );

  if (browserResult.type !== 'success' || !browserResult.url) {
    logDev('OAuth link cancelled', {
      type: browserResult.type,
    });

    throw new AppAuthError(
      'cancelled',
      'Account linking was cancelled.',
    );
  }

  const callbackUrl = browserResult.url;

  logDev('Google OAuth link callback received');

  const parsed = Linking.parse(callbackUrl);

  const code =
    typeof parsed.queryParams?.code === 'string'
      ? parsed.queryParams.code
      : null;

  const errorDescription =
    typeof parsed.queryParams?.error_description === 'string'
      ? parsed.queryParams.error_description
      : null;

  if (errorDescription) {
    throw new AppAuthError(
      'unknown',
      errorDescription,
    );
  }

  if (!code) {
    throw new AppAuthError(
      'unknown',
      'Google account linking did not return an authentication code.',
    );
  }

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

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

function onSessionChange(
  callback: (user: SafeUserInfo | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange(
    (_event, session: Session | null) => {
      callback(toSafeUser(session?.user));
    },
  );

  return () => {
    data.subscription.unsubscribe();
  };
}

export const authService = {
  signInAnonymously,
  signInWithPassword,
  signUp,
  signOut,
  signInWithGoogle,
  linkGoogleAccount,
  restoreSession,
  getCurrentUserId,
  onSessionChange,
};

export type AuthService = typeof authService;