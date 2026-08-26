import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { TransactionType } from '@/types/domain';
import { parseAmountToPaise, paiseToDecimalRupees } from '@/utils/money';
import {
  CategoryServiceError,
  ensureCategory,
} from '@/features/categories/category.service';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useAccountsStore } from '@/stores/accounts.store';
import { useSessionStore } from '@/stores/session.store';
import { useTransactionsStore } from '@/stores/transactions.store';
import { SegmentedControl, type SegmentOption } from '@/components/SegmentedControl';
import { colors, radius, spacing } from '@/components/theme';

const TYPE_OPTIONS: SegmentOption<TransactionType>[] = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'transfer', label: 'Transfer' },
];

function toIsoDateInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return todayFallback();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayFallback(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

export default function EditTransactionScreen() {
  const router = useRouter();
  const insets = useScreenInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const txnId = typeof params.id === 'string' ? params.id : undefined;

  const sessionStatus = useSessionStore((state) => state.status);
  const transactions = useTransactionsStore((state) => state.transactions);
  const accounts = useAccountsStore((state) => state.accounts);
  const loadAccounts = useAccountsStore((state) => state.load);
  const accountsStatus = useAccountsStore((state) => state.status);
  const updateTransaction = useTransactionsStore((state) => state.updateTransaction);
  const deleteTransaction = useTransactionsStore((state) => state.deleteTransaction);

  const txn = transactions.find((item) => item.id === txnId);

  const [type, setType] = useState<TransactionType>(txn?.type ?? 'expense');
  const [amountText, setAmountText] = useState(
    txn ? formatRupeesForInput(txn.amountPaise) : '',
  );
  const [accountId, setAccountId] = useState<string | null>(txn?.accountId ?? null);
  const [toAccountId, setToAccountId] = useState<string | null>(txn?.toAccountId ?? null);
  const [categoryName, setCategoryName] = useState(txn?.categoryName ?? '');
  const [note, setNote] = useState(txn?.note ?? '');
  const [dateText, setDateText] = useState(txn ? toIsoDateInput(txn.occurredAt) : todayFallback());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && accountsStatus === 'idle') {
      void loadAccounts();
    }
  }, [sessionStatus, accountsStatus, loadAccounts]);

  if (sessionStatus !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

/** Display-only rupee string for pre-filling the amount input (re-parsed on save). */
function formatRupeesForInput(paise: number): string {
  return paiseToDecimalRupees(paise).toFixed(2);
}

// PART1_END
  if (!txn) {
    return (
      <View style={[styles.container, styles.centered, insets]}>
        <Text style={styles.bodyText}>Transaction not found.</Text>
        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  async function save(): Promise<void> {
    if (!txn) return;
    setError(null);

    let amountPaise = 0;
    try {
      amountPaise = parseAmountToPaise(amountText);
    } catch {
      setError('Enter a valid amount.');
      return;
    }
    if (!accountId) {
      setError('Choose an account.');
      return;
    }
    if (type === 'transfer' && !toAccountId) {
      setError('Choose the destination account.');
      return;
    }
    if (type === 'transfer' && toAccountId === accountId) {
      setError('Accounts must be different.');
      return;
    }
    const occurredAt = new Date(`${dateText}T12:00:00`);
    if (Number.isNaN(occurredAt.getTime())) {
      setError('Enter a valid date (YYYY-MM-DD).');
      return;
    }

    setBusy(true);
    try {
      let categoryId: string | null = null;
      if (type !== 'transfer' && categoryName.trim().length > 0) {
        try {
          categoryId = (await ensureCategory(categoryName)).id;
        } catch (categoryError) {
          if (categoryError instanceof CategoryServiceError) {
            setError(categoryError.userMessage);
            return;
          }
          throw categoryError;
        }
      }

      const result = await updateTransaction(txn.id, {
        type,
        amountPaise,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : null,
        categoryId,
        note: note.trim().length > 0 ? note : null,
        occurredAt: occurredAt.toISOString(),
      });
      if (!result.ok) {
        setError(result.error ?? 'Could not save changes.');
        return;
      }
      Alert.alert('Saved', 'Transaction updated.');
      router.back();
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(): void {
    if (!txn) return;
    Alert.alert('Delete transaction', 'This permanently removes the entry from your ledger.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            const result = await deleteTransaction(txn.id);
            setBusy(false);
            if (!result.ok) {
              setError(result.error ?? 'Could not delete the transaction.');
              return;
            }
            router.back();
          })();
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, insets]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Edit Transaction</Text>

        <View style={styles.segmentedWrapper}>
          <SegmentedControl
            options={TYPE_OPTIONS}
            selected={type}
            onSelect={setType}
            disabled={busy}
          />
        </View>

        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          value={amountText}
          onChangeText={setAmountText}
          editable={!busy}
        />

        <Text style={styles.label}>{type === 'transfer' ? 'From' : 'Account'}</Text>
        <View style={styles.typeRow}>
          {accounts.map((account) => {
            const selected = accountId === account.id;
            return (
              <Pressable
                key={account.id}
                style={[styles.typeChip, selected && styles.typeChipSelected]}
                onPress={() => setAccountId(account.id)}
                disabled={busy}
              >
                <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                  {account.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {type === 'transfer' && (
          <>
            <Text style={styles.label}>To</Text>
            <View style={styles.typeRow}>
              {accounts.map((account) => {
                const selected = toAccountId === account.id;
                return (
                  <Pressable
                    key={account.id}
                    style={[styles.typeChip, selected && styles.typeChipSelected]}
                    onPress={() => setToAccountId(account.id)}
                    disabled={busy}
                  >
                    <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                      {account.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {type !== 'transfer' && (
          <>
            <Text style={styles.label}>Category (optional)</Text>
            <TextInput
              style={styles.input}
              value={categoryName}
              onChangeText={setCategoryName}
              editable={!busy}
              maxLength={60}
            />
          </>
        )}

        <Text style={styles.label}>Date</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          value={dateText}
          onChangeText={setDateText}
          editable={!busy}
        />

        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          editable={!busy}
          multiline
          maxLength={500}
        />

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          style={[styles.saveButton, busy && styles.disabled]}
          disabled={busy}
          onPress={() => void save()}
        >
          <Text style={styles.saveButtonText}>{busy ? 'Saving…' : 'Save Changes'}</Text>
        </Pressable>

        <Pressable
          style={[styles.deleteButton, busy && styles.disabled]}
          disabled={busy}
          onPress={confirmDelete}
        >
          <Text style={styles.deleteButtonText}>Delete Transaction</Text>
        </Pressable>

        <Pressable
          style={styles.cancelButton}
          disabled={busy}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  deleteButton: {
    alignItems: 'center',
    borderColor: colors.danger,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingVertical: 12,
  },
  deleteButtonText: {
    color: colors.danger,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  errorBox: {
    backgroundColor: 'rgba(255,92,122,0.12)',
    borderRadius: radius.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs + 2,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    marginTop: spacing.md,
    paddingVertical: 14,
  },
  saveButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  secondaryButton: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  typeChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  typeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    color: colors.text,
    fontWeight: '600',
  },
  typeChipTextSelected: {
    color: colors.primaryText,
  },
  cancelButton: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.md,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  segmentedWrapper: {
    marginBottom: spacing.lg,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
});




