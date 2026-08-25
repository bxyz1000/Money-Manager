import * as SecureStore from 'expo-secure-store';

/**
 * SecureStore-backed storage adapter for supabase-js session persistence.
 *
 * SECURITY:
 * - Tokens live in iOS Keychain / Android Keystore (never AsyncStorage).
 * - Values are readable only while the device is unlocked.
 * - Supabase keys may contain characters SecureStore rejects, so keys are
 *   sanitized deterministically before use.
 */

const KEY_PATTERN = /[^a-zA-Z0-9.\-_]/g;

function sanitizeKey(key: string): string {
  return key.replace(KEY_PATTERN, '_');
}

export const secureStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(sanitizeKey(key));
  },

  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(sanitizeKey(key), value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  },

  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(sanitizeKey(key));
  },
};
