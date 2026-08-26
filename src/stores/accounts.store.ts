import { create } from 'zustand';

import {
  AccountServiceError,
  accountService,
  type AccountInput,
  type AccountWithBalance,
} from '@/features/accounts/account.service';

/**
 * Thin UI state for the Accounts feature.
 *
 * Holds: accounts, loading/error status, user-safe messages.
 * Never holds: Supabase clients, SQL, tokens, balance algorithms — all of
 * that lives in the account service / database view layer.
 */

export type AccountsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface CreateAccountResult {
  ok: boolean;
  /** User-safe message when ok is false. */
  error?: string;
}

interface AccountsState {
  accounts: AccountWithBalance[];
  status: AccountsStatus;
  errorMessage: string | null;

  load: () => Promise<void>;
  reset: () => void;
  createAccount: (input: AccountInput) => Promise<CreateAccountResult>;
  updateAccount: (
    id: string,
    patch: { name?: string; type: AccountInput['type'] },
  ) => Promise<CreateAccountResult>;
  archiveAccount: (id: string) => Promise<CreateAccountResult>;
}

function errorToMessage(error: unknown): { message: string; code: string } {
  if (error instanceof AccountServiceError) {
    return { message: error.userMessage, code: error.code };
  }
  return { message: 'Something went wrong. Please try again.', code: 'unknown' };
}

export const useAccountsStore = create<AccountsState>((set) => ({
  accounts: [],
  status: 'idle',
  errorMessage: null,

  reset: () => {
    set({ accounts: [], status: 'idle', errorMessage: null });
  },

  load: async () => {
    set({
      status: useAccountsStore.getState().accounts.length > 0 ? 'ready' : 'loading',
      errorMessage: null,
    });
    try {
      const accounts = await accountService.listActiveAccounts();
      set({ accounts, status: 'ready', errorMessage: null });
    } catch (error) {
      const { message } = errorToMessage(error);
      set({ status: 'error', errorMessage: message });
    }
  },

  createAccount: async (input) => {
    try {
      await accountService.createAccount(input);
      // Refresh so the new account appears with its authoritative balance.
      const accounts = await accountService.listActiveAccounts();
      set({ accounts, status: 'ready', errorMessage: null });
      return { ok: true };
    } catch (error) {
      const { message, code } = errorToMessage(error);
      if (code !== 'validation') {
        // Validation failures are surfaced inline by the form; other failures
        // also update global list state for the banner/retry path.
        set({ status: 'error', errorMessage: message });
      }
      return { ok: false, error: message };
    }
  },

  updateAccount: async (id, patch) => {
    try {
      await accountService.updateAccount(id, patch);
      const accounts = await accountService.listActiveAccounts();
      set({ accounts, status: 'ready', errorMessage: null });
      return { ok: true };
    } catch (error) {
      const { message } = errorToMessage(error);
      return { ok: false, error: message };
    }
  },

  archiveAccount: async (id) => {
    try {
      await accountService.archiveAccount(id);
      // Archived accounts leave the active list by definition.
      set({
        accounts: useAccountsStore.getState().accounts.filter((account) => account.id !== id),
      });
      return { ok: true };
    } catch (error) {
      const { message } = errorToMessage(error);
      return { ok: false, error: message };
    }
  },
}));
