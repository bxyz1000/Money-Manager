import { Stack, useRouter } from 'expo-router';
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
import { parseAmountToPaise } from '@/utils/money';
import { CategoryServiceError, ensureCategory } from '@/features/categories/category.service';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useAccountsStore } from '@/stores/accounts.store';
import { useTransactionsStore } from '@/stores/transactions.store';
import { colors, radius, spacing } from '@/components/theme';

/**
 * Add Transaction modal — Income / Expense / Transfer.
 *
 * Amount parsing goes strictly through utils/money.parseAmountToPaise.
 * Category is optional free text resolved idempotently server-side
 * (create-or-get). Transfers show source + destination pickers and no
 * category field. No opening-balance or fake data paths exist here.
 */

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'transfer', label: 'Transfer' },
];

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function AddTransactionScreen() {
  const router = useRouter();
  const insets = useScreenInsets();

  const accounts = useAccountsStore((state) => state.accounts);
  const accountsStatus = useAccountsStore((state) => state.status);
  const loadAccounts = useAccountsStore((state) => state.load);
  const createTransaction = useTransactionsStore((state) => state.createTransaction);

  const [type, setType] = useState<TransactionType>('expense');
  const [amountText, setAmountText] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [note, setNote] = useState('');
  const [dateText, setDateText] = useState(todayIsoDate());

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (accountsStatus === 'idle') {
      void loadAccounts();
    }
  }, [accountsStatus, loadAccounts]);

  async function submit(): Promise<void> {
    setFieldErrors({});
    setFormError(null);

    const nextErrors: Record<string, string> = {};

    let amountPaise = 0;
    try {
      amountPaise = parseAmountToPaise(amountText);
    } catch {
      nextErrors.amount = 'Enter a valid amount, e.g. 500 · 1,250.50';
    }

    if (!accountId || !accounts.some((a) => a.id === accountId)) {
      nextErrors.accountId =
        type === 'transfer' ? 'Choose the source account.' : 'Choose an account.';
    }
    if (type === 'transfer' && !toAccountId) {
      nextErrors.toAccountId = 'Choose the destination account.';
    }
    if (type === 'transfer' && accountId && toAccountId && accountId === toAccountId) {
      nextErrors.toAccountId = 'Accounts must be different.';
    }
    if (dateText.trim().length === 0 || Number.isNaN(new Date(dateText).getTime())) {
      nextErrors.date = 'Enter a valid date (YYYY-MM-DD).';
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setBusy(true);
    try {
      // Optional category: resolved idempotently server-side (create-or-get).
      let categoryId: string | null = null;
      if (type !== 'transfer' && categoryName.trim().length > 0) {
        try {
          const category = await ensureCategory(categoryName);
          categoryId = category.id;
        } catch (categoryError) {
          if (categoryError instanceof CategoryServiceError) {
            setFieldErrors({ category: categoryError.userMessage });
            return;
          }
          throw categoryError;
        }
      }

      const result = await createTransaction({
        type,
        amountPaise,
        accountId: accountId as string,
        toAccountId: type === 'transfer' ? toAccountId : null,
        categoryId,
        note: note.trim().length > 0 ? note : null,
        occurredAt: new Date(`${dateText}T12:00:00`).toISOString(),
      });

      if (!result.ok) {
        setFormError(result.error ?? 'Could not save the transaction.');
        return;
      }

      Alert.alert('Saved', 'Transaction recorded.');
      router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.container, insets]}>
      <Stack.Screen options={{ presentation: 'modal', title: '' }} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add Transaction</Text>

        <View style={styles.typeRow}>
          {TYPE_OPTIONS.map((option) => {
            const selected = type === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.typeChip, selected && styles.typeChipSelected]}
                onPress={() => setType(option.value)}
                disabled={busy}
              >
                <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          placeholder="₹0"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          value={amountText}
          onChangeText={setAmountText}
          editable={!busy}
        />
        {!!fieldErrors.amount && <Text style={styles.fieldError}>{fieldErrors.amount}</Text>}

        {type === 'transfer' ? (
          <>
            <Text style={styles.label}>From</Text>
            <AccountChips
              accounts={accounts}
              selectedId={accountId}
              onSelect={setAccountId}
              disabled={busy}
            />
            {!!fieldErrors.accountId && (
              <Text style={styles.fieldError}>{fieldErrors.accountId}</Text>
            )}
            <Text style={styles.label}>To</Text>
            <AccountChips
              accounts={accounts}
              selectedId={toAccountId}
              onSelect={setToAccountId}
              disabled={busy}
            />
            {!!fieldErrors.toAccountId && (
              <Text style={styles.fieldError}>{fieldErrors.toAccountId}</Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.label}>Account</Text>
            <AccountChips
              accounts={accounts}
              selectedId={accountId}
              onSelect={setAccountId}
              disabled={busy}
            />
            {!!fieldErrors.accountId && (
              <Text style={styles.fieldError}>{fieldErrors.accountId}</Text>
            )}
          </>
        )}

        {type !== 'transfer' && (
          <>
            <Text style={styles.label}>Category (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Groceries, Salary"
              placeholderTextColor={colors.textSecondary}
              value={categoryName}
              onChangeText={setCategoryName}
              editable={!busy}
              maxLength={60}
            />
            {!!fieldErrors.category && (
              <Text style={styles.fieldError}>{fieldErrors.category}</Text>
            )}
          </>
        )}

        <Text style={styles.label}>Date</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          value={dateText}
          onChangeText={setDateText}
          editable={!busy}
        />
        {!!fieldErrors.date && <Text style={styles.fieldError}>{fieldErrors.date}</Text>}

        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Add a note"
          placeholderTextColor={colors.textSecondary}
          value={note}
          onChangeText={setNote}
          editable={!busy}
          multiline
          maxLength={500}
        />

        {!!formError && (
          <View style={styles.formErrorBox}>
            <Text style={styles.fieldError}>{formError}</Text>
          </View>
        )}

        <Pressable
          style={[styles.saveButton, busy && styles.disabled]}
          disabled={busy}
          onPress={() => void submit()}
        >
          <Text style={styles.saveButtonText}>{busy ? 'Saving…' : 'Save Transaction'}</Text>
        </Pressable>

        <Pressable style={styles.cancelButton} disabled={busy} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function AccountChips(props: {
  accounts: { id: string; name: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled: boolean;
}) {
  if (props.accounts.length === 0) {
    return (
      <Text style={styles.hint}>
        No active accounts. Create one from the Accounts screen first.
      </Text>
    );
  }
  return (
    <View style={styles.typeRow}>
      {props.accounts.map((account) => {
        const selected = props.selectedId === account.id;
        return (
          <Pressable
            key={account.id}
            style={[styles.typeChip, selected && styles.typeChipSelected]}
            onPress={() => props.onSelect(account.id)}
            disabled={props.disabled}
          >
            <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
              {account.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  cancelButton: {
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  fieldError: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.sm,
    marginTop: -spacing.xs,
  },
  formErrorBox: {
    backgroundColor: '#fdeceb',
    borderColor: colors.danger,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.sm,
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
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.lg,
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
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
});

