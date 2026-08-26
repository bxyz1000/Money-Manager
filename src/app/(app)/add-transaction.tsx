import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { GlassButton, GlassCard } from '@/components/GlassCard';
import { SegmentedControl, type SegmentOption } from '@/components/SegmentedControl';
import {
  colors,
  radius,
  spacing,
  typography,
} from '@/components/theme';
import { CategoryServiceError, ensureCategory } from '@/features/categories/category.service';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useAccountsStore } from '@/stores/accounts.store';
import { useTransactionsStore } from '@/stores/transactions.store';
import type { TransactionType } from '@/types/domain';
import { parseAmountToPaise } from '@/utils/money';

const TYPE_OPTIONS: SegmentOption<TransactionType>[] = [
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
  const params = useLocalSearchParams<{ type?: string }>();

  const initialType: TransactionType =
    params.type === 'income' || params.type === 'expense' || params.type === 'transfer'
      ? params.type
      : 'expense';

  const accounts = useAccountsStore((state) => state.accounts);
  const accountsStatus = useAccountsStore((state) => state.status);
  const loadAccounts = useAccountsStore((state) => state.load);
  const createTransaction = useTransactionsStore((state) => state.createTransaction);

  const [type, setType] = useState<TransactionType>(initialType);
  const [amountText, setAmountText] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [note, setNote] = useState('');
  const [dateText, setDateText] = useState(todayIsoDate());

  const [amountFocused, setAmountFocused] = useState(false);
  const [categoryFocused, setCategoryFocused] = useState(false);
  const [dateFocused, setDateFocused] = useState(false);
  const [noteFocused, setNoteFocused] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (accountsStatus === 'idle' || accountsStatus === 'error') {
      void loadAccounts();
    }
  }, [accountsStatus, loadAccounts]);

  const selectedAccountId = accountId ?? accounts[0]?.id ?? null;
  const selectedToAccountId =
    type === 'transfer'
      ? toAccountId ?? accounts.find((a) => a.id !== selectedAccountId)?.id ?? null
      : null;

  async function submit(): Promise<void> {
    setFieldErrors({});
    setFormError(null);

    const nextErrors: Record<string, string> = {};

    let amountPaise = 0;
    try {
      amountPaise = parseAmountToPaise(amountText);
    } catch {
      nextErrors.amount = 'Enter a valid amount, e.g. 500 or 1,250.50';
    }

    if (!selectedAccountId || !accounts.some((a) => a.id === selectedAccountId)) {
      nextErrors.accountId =
        type === 'transfer' ? 'Choose the source account.' : 'Choose an account.';
    }
    if (type === 'transfer' && !selectedToAccountId) {
      nextErrors.toAccountId = 'Choose the destination account.';
    }
    if (
      type === 'transfer' &&
      selectedAccountId &&
      selectedToAccountId &&
      selectedAccountId === selectedToAccountId
    ) {
      nextErrors.toAccountId = 'Source and destination accounts must be different.';
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
        accountId: selectedAccountId as string,
        toAccountId: type === 'transfer' ? selectedToAccountId : null,
        categoryId,
        note: note.trim().length > 0 ? note : null,
        occurredAt: new Date(`${dateText}T12:00:00`).toISOString(),
      });

      if (!result.ok) {
        setFormError(result.error ?? 'Could not save the transaction.');
        return;
      }

      Alert.alert('Saved', 'Transaction recorded successfully.');
      router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.container, insets]}>
      <Stack.Screen
        options={{
          presentation: 'modal',
          title: 'Add Transaction',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>New Transaction</Text>

          {/* Animated Segmented Selector */}
          <View style={styles.segmentedWrapper}>
            <SegmentedControl
              options={TYPE_OPTIONS}
              selected={type}
              onSelect={setType}
              disabled={busy}
            />
          </View>

          {/* Frosted Amount Hero Card */}
          <GlassCard
            style={[styles.amountCard, amountFocused && styles.amountCardFocused]}
            intensity={50}
            borderRadius={radius.lg}
          >
            <View style={styles.amountCardContent}>
              <Text style={styles.amountPrefix}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                autoCapitalize="none"
                value={amountText}
                onChangeText={setAmountText}
                onFocus={() => setAmountFocused(true)}
                onBlur={() => setAmountFocused(false)}
                editable={!busy}
              />
            </View>
          </GlassCard>
          {!!fieldErrors.amount && <Text style={styles.fieldError}>{fieldErrors.amount}</Text>}

          {/* Account Pickers */}
          {type === 'transfer' ? (
            <View style={styles.sectionContainer}>
              <Text style={styles.label}>Source Account (From)</Text>
              <AccountChips
                accounts={accounts}
                selectedId={selectedAccountId}
                onSelect={setAccountId}
                disabled={busy}
                onAddAccount={() => router.push('/(app)/add-account')}
              />
              {!!fieldErrors.accountId && (
                <Text style={styles.fieldError}>{fieldErrors.accountId}</Text>
              )}

              <Text style={[styles.label, { marginTop: spacing.md }]}>
                Destination Account (To)
              </Text>
              <AccountChips
                accounts={accounts}
                selectedId={selectedToAccountId}
                onSelect={setToAccountId}
                disabled={busy}
                onAddAccount={() => router.push('/(app)/add-account')}
              />
              {!!fieldErrors.toAccountId && (
                <Text style={styles.fieldError}>{fieldErrors.toAccountId}</Text>
              )}
            </View>
          ) : (
            <View style={styles.sectionContainer}>
              <Text style={styles.label}>Account</Text>
              <AccountChips
                accounts={accounts}
                selectedId={selectedAccountId}
                onSelect={setAccountId}
                disabled={busy}
                onAddAccount={() => router.push('/(app)/add-account')}
              />
              {!!fieldErrors.accountId && (
                <Text style={styles.fieldError}>{fieldErrors.accountId}</Text>
              )}
            </View>
          )}

          {/* Category Input (for Income & Expense) */}
          {type !== 'transfer' && (
            <View style={styles.sectionContainer}>
              <Text style={styles.label}>Category (optional)</Text>
              <TextInput
                style={[
                  styles.input,
                  categoryFocused && styles.inputFocused,
                  busy && styles.inputDisabled,
                ]}
                placeholder="e.g. Groceries, Dining, Salary"
                placeholderTextColor={colors.textSecondary}
                value={categoryName}
                onChangeText={setCategoryName}
                onFocus={() => setCategoryFocused(true)}
                onBlur={() => setCategoryFocused(false)}
                editable={!busy}
                maxLength={60}
              />
              {!!fieldErrors.category && (
                <Text style={styles.fieldError}>{fieldErrors.category}</Text>
              )}
            </View>
          )}

          {/* Date Input */}
          <View style={styles.sectionContainer}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={[
                styles.input,
                dateFocused && styles.inputFocused,
                busy && styles.inputDisabled,
              ]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              value={dateText}
              onChangeText={setDateText}
              onFocus={() => setDateFocused(true)}
              onBlur={() => setDateFocused(false)}
              editable={!busy}
            />
            {!!fieldErrors.date && <Text style={styles.fieldError}>{fieldErrors.date}</Text>}
          </View>

          {/* Note Input */}
          <View style={styles.sectionContainer}>
            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              style={[
                styles.input,
                styles.noteInput,
                noteFocused && styles.inputFocused,
                busy && styles.inputDisabled,
              ]}
              placeholder="What was this for?"
              placeholderTextColor={colors.textSecondary}
              value={note}
              onChangeText={setNote}
              onFocus={() => setNoteFocused(true)}
              onBlur={() => setNoteFocused(false)}
              editable={!busy}
              multiline
              maxLength={500}
            />
          </View>

          {/* Form Error Banner */}
          {!!formError && (
            <View style={styles.formErrorBox}>
              <Text style={styles.formErrorText}>{formError}</Text>
            </View>
          )}

          {/* Frosted CTA Save Button */}
          <GlassButton
            accessibilityLabel="Save Transaction"
            style={styles.saveButton}
            intensity={55}
            borderRadius={radius.md}
            disabled={busy}
            onPress={() => void submit()}
          >
            <View style={styles.saveButtonContent}>
              <Text style={styles.saveButtonText}>{busy ? 'Saving…' : 'Save Transaction'}</Text>
            </View>
          </GlassButton>

          <Pressable
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
            disabled={busy}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function AccountChips(props: {
  accounts: { id: string; name: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled: boolean;
  onAddAccount: () => void;
}) {
  if (props.accounts.length === 0) {
    return (
      <GlassCard style={styles.noAccountsCard} intensity={45} borderRadius={radius.md}>
        <View style={styles.noAccountsContent}>
          <Text style={styles.noAccountsText}>No active accounts found.</Text>
          <GlassButton
            style={styles.inlineCreateAccountBtn}
            intensity={55}
            borderRadius={radius.pill}
            onPress={props.onAddAccount}
          >
            <View style={styles.inlineCreateAccountContent}>
              <Text style={styles.inlineCreateAccountText}>+ Create Account</Text>
            </View>
          </GlassButton>
        </View>
      </GlassCard>
    );
  }

  return (
    <View style={styles.chipsRow}>
      {props.accounts.map((account) => {
        const selected = props.selectedId === account.id;
        return (
          <GlassButton
            key={account.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={selected ? styles.accountChipSelected : styles.accountChipUnselected}
            intensity={selected ? 55 : 35}
            borderRadius={radius.pill}
            onPress={() => props.onSelect(account.id)}
            disabled={props.disabled}
          >
            <View style={styles.accountChipContent}>
              <Text
                style={[
                  styles.accountChipText,
                  selected && styles.accountChipTextSelected,
                ]}
                numberOfLines={1}
              >
                {account.name}
              </Text>
            </View>
          </GlassButton>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  accountChipContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
  },
  accountChipSelected: {
    backgroundColor: 'rgba(0, 112, 243, 0.35)',
    borderColor: 'rgba(0, 240, 255, 0.45)',
  },
  accountChipText: {
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    fontWeight: '500',
  },
  accountChipTextSelected: {
    color: colors.primaryText,
    fontWeight: '600',
  },
  accountChipUnselected: {
    backgroundColor: colors.surfaceGlass,
  },
  amountCard: {
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  amountCardContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  amountCardFocused: {
    borderColor: 'rgba(0, 240, 255, 0.45)',
  },
  amountInput: {
    color: colors.text,
    fontSize: typography.balance,
    fontWeight: '400',
    letterSpacing: -0.5,
    minWidth: 80,
    paddingVertical: 0,
    textAlign: 'center',
  },
  amountPrefix: {
    color: colors.electricCyan,
    fontSize: typography.balance,
    fontWeight: '400',
    marginRight: spacing.xs,
  },
  cancelButton: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.md,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    fontWeight: '500',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  fieldError: {
    color: colors.danger,
    fontSize: typography.caption,
    marginBottom: spacing.sm,
    marginTop: 2,
  },
  formErrorBox: {
    backgroundColor: 'rgba(255, 92, 122, 0.12)',
    borderColor: colors.danger,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  formErrorText: {
    color: colors.danger,
    fontSize: typography.bodySm,
    textAlign: 'center',
  },
  inlineCreateAccountBtn: {
    backgroundColor: 'rgba(0, 112, 243, 0.25)',
    borderColor: 'rgba(0, 240, 255, 0.35)',
  },
  inlineCreateAccountContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  inlineCreateAccountText: {
    color: colors.primaryText,
    fontSize: typography.bodySm,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surfaceGlass,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    fontSize: typography.body,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  inputFocused: {
    borderColor: colors.electricCyan,
  },
  label: {
    color: colors.text,
    fontSize: typography.caption + 1,
    fontWeight: '500',
    marginBottom: spacing.xs + 2,
  },
  noAccountsCard: {
    width: '100%',
  },
  noAccountsContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  noAccountsText: {
    color: colors.textSecondary,
    fontSize: typography.bodySm,
  },
  noteInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  pressed: {
    opacity: 0.75,
  },
  saveButton: {
    backgroundColor: 'rgba(0, 112, 243, 0.22)',
    borderColor: 'rgba(0, 240, 255, 0.4)',
    marginTop: spacing.lg,
  },
  saveButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  saveButtonText: {
    color: colors.primaryText,
    fontSize: typography.body + 1,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionContainer: {
    marginBottom: spacing.md,
  },
  segmentedWrapper: {
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
});
