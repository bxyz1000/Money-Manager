import { AuthApiError, isAuthApiError } from '@supabase/supabase-js';

import { logDev } from '@/utils/logger';

/**
 * Authentication error mapping layer.
 *
 * Supabase errors are translated into a small, closed set of application
 * error codes with user-friendly messages. Technical detail (the original
 * code/message) is preserved on the error object for development logging but
 * is never required reading for the UI.
 *
 * UI components display ONLY `userMessage` from AppAuthError — never raw
 * Supabase messages.
 */

export type AppAuthErrorCode =
  | 'invalid_credentials'
  | 'email_taken'
  | 'email_invalid'
  | 'weak_password'
  | 'email_not_confirmed'
  | 'rate_limited'
  | 'network'
  | 'cancelled'
  | 'unknown';

export class AppAuthError extends Error {
  readonly code: AppAuthErrorCode;
  /** Safe to render directly in the UI. */
  readonly userMessage: string;

  constructor(code: AppAuthErrorCode, userMessage: string) {
    super(userMessage);
    this.name = 'AppAuthError';
    this.code = code;
    this.userMessage = userMessage;
  }
}

export const AUTH_USER_MESSAGES: Record<AppAuthErrorCode, string> = {
  invalid_credentials: 'Incorrect email or password.',
  email_taken: 'An account with this email already exists. Try signing in instead.',
  email_invalid: 'That email address does not look valid.',
  weak_password:
    'This password is too weak. Use at least 8 characters with a mix of letters and numbers.',
  email_not_confirmed: 'Please confirm your email address first. Check your inbox.',
  rate_limited: 'Too many attempts. Please wait a moment and try again.',
  network: 'Network problem. Check your connection and try again.',
  cancelled: 'Sign-in was cancelled.',
  unknown: 'Something went wrong. Please try again.',
};

function codeFromAuthApiError(error: AuthApiError): AppAuthErrorCode {
  const code = typeof error.code === 'string' ? error.code : '';
  const message = error.message.toLowerCase();

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'invalid_credentials';
  }
  if (code === 'user_already_exists' || message.includes('already registered')) {
    return 'email_taken';
  }
  if (code === 'email_address_invalid' || message.includes('invalid email')) {
    return 'email_invalid';
  }
  if (code === 'weak_password' || message.includes('password should be')) {
    return 'weak_password';
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'email_not_confirmed';
  }
  if (
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    message.includes('rate limit')
  ) {
    return 'rate_limited';
  }
  return 'unknown';
}

/** Maps any thrown value into an AppAuthError without leaking internals upward. */
export function mapAuthError(error: unknown): AppAuthError {
  // Network failures surface as plain TypeErrors from fetch inside supabase-js.
  if (error instanceof TypeError) {
    logDev('auth network failure', { reason: String(error.message) });
    return new AppAuthError('network', AUTH_USER_MESSAGES.network);
  }

  if (isAuthApiError(error)) {
    const code = codeFromAuthApiError(error);
    logDev('supabase auth error', { status: error.status, code });
    return new AppAuthError(code, AUTH_USER_MESSAGES[code]);
  }

  if (error instanceof AppAuthError) {
    return error;
  }

  logDev('unexpected auth error', { type: typeof error });
  return new AppAuthError('unknown', AUTH_USER_MESSAGES.unknown);
}
