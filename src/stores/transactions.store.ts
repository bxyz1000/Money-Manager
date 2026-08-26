import { create } from 'zustand';

import {
  TransactionServiceError,
  transactionService,
  type TransactionInput,
  type TransactionListItem,
} from '@/features/transactions/transaction.service';
import { currentMonthStart } from '@/features/transactions/monthly';

/**
 * Thin UI state for the ledger.
 *
 * Holds: transactions, monthly totals, loading/error status, user-safe
 * messages. Never holds: Supabase clients, balance algorithms, raw Postgres
 * errors — all of that lives in the service layer.
 */

export type TransactionsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

interface TransactionsState {
  transactions: TransactionListItem[];
  status: TransactionsStatus;
  errorMessage: string | null;

  monthKey: string; // 'YYYY-MM-DD', first day of the viewed month
  monthIncomePaise: number;
  monthExpensePaise: number;
  monthNetPaise: number;

  load: () => Promise<void>;
  reset: () => void;
  createTransaction: (input: TransactionInput) => Promise<ActionResult>;
  updateTransaction: (id: string, input: TransactionInput) => Promise<ActionResult>;
  deleteTransaction: (id: string) => Promise<ActionResult>;
}

function errorToMessage(error: unknown): { message: string; code: string } {
  if (error instanceof TransactionServiceError) {
    return { message: error.userMessage, code: error.code };
  }
  return { message: 'Something went wrong. Please try again.', code: 'unknown' };
}

async function refreshTotals(): Promise<{
  incomePaise: number;
  expensePaise: number;
  netPaise: number;
}> {
  const totals = await transactionService.getMonthlyTotals(currentMonthStart());
  return {
    incomePaise: totals.incomePaise,
    expensePaise: totals.expensePaise,
    netPaise: totals.netPaise,
  };
}

export const useTransactionsStore = create<TransactionsState>((set) => ({
  transactions: [],
  status: 'idle',
  errorMessage: null,
  monthKey: currentMonthStart(),
  monthIncomePaise: 0,
  monthExpensePaise: 0,
  monthNetPaise: 0,

  reset: () => {
    set({
      transactions: [],
      status: 'idle',
      errorMessage: null,
      monthIncomePaise: 0,
      monthExpensePaise: 0,
      monthNetPaise: 0,
    });
  },

  load: async () => {
    set({
      status:
        useTransactionsStore.getState().transactions.length > 0 ? 'ready' : 'loading',
      errorMessage: null,
    });
    try {
      const [transactions, totals] = await Promise.all([
        transactionService.listTransactions(),
        refreshTotals(),
      ]);
      set({ transactions, status: 'ready', errorMessage: null, ...totals });
    } catch (error) {
      const { message } = errorToMessage(error);
      set({ status: 'error', errorMessage: message });
    }
  },

  createTransaction: async (input) => {
    try {
      await transactionService.createTransaction(input);
      // Reload so history AND derived balances (accounts store reloads its own
      // data separately) stay consistent with the authoritative view.
      const [transactions, totals] = await Promise.all([
        transactionService.listTransactions(),
        refreshTotals(),
      ]);
      set({ transactions, ...totals, status: 'ready', errorMessage: null });
      return { ok: true };
    } catch (error) {
      const { message } = errorToMessage(error);
      return { ok: false, error: message };
    }
  },

  updateTransaction: async (id, input) => {
    try {
      await transactionService.updateTransaction(id, input);
      const [transactions, totals] = await Promise.all([
        transactionService.listTransactions(),
        refreshTotals(),
      ]);
      set({ transactions, ...totals, status: 'ready', errorMessage: null });
      return { ok: true };
    } catch (error) {
      const { message } = errorToMessage(error);
      return { ok: false, error: message };
    }
  },

  deleteTransaction: async (id) => {
    try {
      await transactionService.deleteTransaction(id);
      set({
        transactions: useTransactionsStore
          .getState()
          .transactions.filter((txn) => txn.id !== id),
      });
      const totals = await refreshTotals();
      set({
        monthIncomePaise: totals.incomePaise,
        monthExpensePaise: totals.expensePaise,
        monthNetPaise: totals.netPaise,
      });
      return { ok: true };
    } catch (error) {
      const { message } = errorToMessage(error);
      return { ok: false, error: message };
    }
  },
}));
