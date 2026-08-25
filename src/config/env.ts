/**
 * Environment configuration.
 *
 * Validated once at startup. The app fails fast if required variables are
 * missing so we never run against a misconfigured backend.
 *
 * SECURITY:
 * - Only EXPO_PUBLIC_* (client-safe) variables are read here.
 * - Only the Supabase anon/public key is allowed. It ships in the JS bundle
 *   by design; all authorization is enforced server-side by RLS.
 * - The service-role key must NEVER be added to this app or this repository.
 */

interface RequiredEnvVars {
  EXPO_PUBLIC_SUPABASE_URL: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
}

function requireEnv<K extends keyof RequiredEnvVars>(name: K): string {
  // Static property access keeps Metro able to inline env values at
  // build time and satisfies the expo/no-dynamic-env-var rule.
  const value =
    name === 'EXPO_PUBLIC_SUPABASE_URL'
      ? process.env.EXPO_PUBLIC_SUPABASE_URL
      : process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        'Copy .env.example to .env and provide real values before starting the app.',
    );
  }
  return value.trim();
}

const supabaseUrl = requireEnv('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = requireEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

try {
  // Validate shape early; also surfaces malformed values immediately.
  new URL(supabaseUrl);
} catch {
  throw new Error(
    `EXPO_PUBLIC_SUPABASE_URL must be a valid absolute URL. Received: "${supabaseUrl}"`,
  );
}

export const env = {
  supabaseUrl,
  supabaseAnonKey,
} as const;

export type Env = typeof env;
