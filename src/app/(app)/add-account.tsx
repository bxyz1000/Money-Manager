import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { AccountType } from '@/types/domain';
import { parseAmountToPaise } from '@/utils/money';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useAccountsStore } from '@/stores/accounts.store';
import { colors, radius, spacing } from '@/components/theme';

/**
 * Add Account modal.
 *
 * Opening balance input is free-form INR text ("1000", "1000.50", "₹1,000.50")
 * parsed STRICTLY through utils/money.parseAmountToPaise — never parseFloat.
 * No opening-balance transaction is created; the value populates
 * initial_balance_paise only.
 */

const TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'bank', label: 'Bank' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
];

export default function AddAccountScreen() {
  const router = useRouter();
  const insets = useScreenInsets();

  const createAccount = useAccountsStore((state) => state.createAccount);

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [balanceText, setBalanceText] = useState('');
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<'name' | 'type' | 'balance', string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    setFieldErrors({});
    setFormError(null);

    const nextErrors: typeof fieldErrors = {};
    if (name.trim().length === 0) {
      nextErrors.name = 'Account name is required.';
    }
    let openingPaise = 0;
    if (balanceText.trim().length > 0) {
      try {
        openingPaise = parseAmountToPaise(balanceText);
        if (openingPaise < 0) {
          nextErrors.balance = 'Opening balance cannot be negative.';
        }
      } catch {
        nextErrors.balance = 'Enter a valid amount, e.g. 1,250.50';
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setBusy(true);
    const result = await createAccount({
      name,
      type,
      initialBalancePaise: openingPaise,
    });
    setBusy(false);

    if (!result.ok) {
      // Duplicate names surface gracefully here via the service mapping.
      setFormError(result.error ?? 'Could not create the account.');
      return;
    }

    Alert.alert('Account created', `${name.trim()} is ready to use.`);
    router.back();
  }

  return (
    <View style={[styles.container, insets]}>
      <Stack.Screen options={{ presentation: 'modal', title: '' }} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add Account</Text>

        <Text style={styles.label}>Account name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. HDFC Savings"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
          editable={!busy}
          maxLength={80}
        />
        {!!fieldErrors.name && <Text style={styles.fieldError}>{fieldErrors.name}</Text>}

        <Text style={styles.label}>Account type</Text>
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

        <Text style={styles.label}>Opening balance</Text>
        <TextInput
          style={styles.input}
          placeholder="₹0"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          value={balanceText}
          onChangeText={setBalanceText}
          editable={!busy}
        />
        <Text style={styles.hint}>
          Money already in this account. Examples: 1000 · 1000.50 · ₹1,000.50
        </Text>
        {!!fieldErrors.balance && <Text style={styles.fieldError}>{fieldErrors.balance}</Text>}

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
          <Text style={styles.saveButtonText}>{busy ? 'Saving…' : 'Create Account'}</Text>
        </Pressable>

        <Pressable style={styles.cancelButton} disabled={busy} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </ScrollView>
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
    fontSize: 12,
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
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
});

