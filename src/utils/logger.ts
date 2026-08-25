/**
 * Minimal dev-only logger.
 *
 * SECURITY:
 * - Never logs in production builds (__DEV__ guard).
 * - `meta` keys that look sensitive (passwords, tokens, secrets, codes,
 *   authorization data) are stripped before output.
 * - Callers must still avoid passing raw credentials anywhere near logs.
 */

const SENSITIVE_KEY = /(password|passwd|token|secret|authorization|api[-_]?key|code)/i;

function sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    clean[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : value;
  }
  return clean;
}

export function logDev(message: string, meta?: Record<string, unknown>): void {
  if (!__DEV__) {
    return;
  }
  if (meta) {
    console.log(`[money-manager] ${message}`, sanitizeMeta(meta));
  } else {
    console.log(`[money-manager] ${message}`);
  }
}
