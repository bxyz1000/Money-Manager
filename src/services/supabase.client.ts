import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

import { env } from '@/config/env';
import { secureStorageAdapter } from './secure-storage.adapter';

/**
 * The single Supabase client for the entire app.
 *
 * - Created with the ANON (public) key only. All tenant isolation relies on
 *   PostgreSQL Row Level Security, not on key secrecy.
 * - Sessions persist through expo-secure-store (hardware-backed keystore).
 * - No other module may call createClient(); import this client instead.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: secureStorageAdapter,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
