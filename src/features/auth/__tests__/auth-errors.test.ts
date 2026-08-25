import { AuthApiError, isAuthApiError } from '@supabase/supabase-js';

import {
  AppAuthError,
  mapAuthError,
  AUTH_USER_MESSAGES,
} from '../auth-errors';

function authApiError(code: string | null, message: string): AuthApiError {
  const error = new AuthApiError(message, 400, code ?? undefined);
  return error;
}

describe('mapAuthError', () => {
  it('maps invalid credentials by code', () => {
    const mapped = mapAuthError(authApiError('invalid_credentials', 'Invalid login credentials'));
    expect(mapped.code).toBe('invalid_credentials');
    expect(mapped.userMessage).toBe(AUTH_USER_MESSAGES.invalid_credentials);
  });

  it('maps already-registered emails', () => {
    const mapped = mapAuthError(authApiError('user_already_exists', 'User already registered'));
    expect(mapped.code).toBe('email_taken');
  });

  it('maps weak passwords', () => {
    const mapped = mapAuthError(
      authApiError('weak_password', 'Password should be at least 6 characters.'),
    );
    expect(mapped.code).toBe('weak_password');
  });

  it('maps rate limiting', () => {
    const mapped = mapAuthError(
      authApiError('over_request_rate_limit', 'Request rate limit reached'),
    );
    expect(mapped.code).toBe('rate_limited');
  });

  it('falls back to message matching for legacy errors without codes', () => {
    const noCode = new AuthApiError('Email not confirmed', 400, undefined);
    expect(mapAuthError(noCode).code).toBe('email_not_confirmed');
  });

  it('maps network TypeErrors without leaking details', () => {
    const mapped = mapAuthError(new TypeError('Network request failed http://x/token'));
    expect(mapped.code).toBe('network');
    expect(mapped.userMessage).not.toContain('token');
  });

  it('returns unknown (never raw) for unexpected values', () => {
    const mapped = mapAuthError(new Error('some internal detail'));
    expect(mapped.code).toBe('unknown');
    expect(Object.values(AUTH_USER_MESSAGES)).toContain(mapped.userMessage);
  });

  it('preserves an already-mapped AppAuthError', () => {
    const original = new AppAuthError('cancelled', AUTH_USER_MESSAGES.cancelled);
    expect(mapAuthError(original)).toBe(original);
  });

  it('recognises genuine supabase AuthApiError instances via the guard', () => {
    expect(isAuthApiError(authApiError(null, 'x'))).toBe(true);
  });
});
