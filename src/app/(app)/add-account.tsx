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

import { GlassButton } from '@/components/GlassCard';
import type { AccountType } from '@/types/domain';
import { parseAmountToPaise } from '@/utils/money';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useAccountsStore } from '@/stores/accounts.store';
import { colors, radius, spacing, typography } from '@/components/theme';

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
      const errorMsg = result.error ?? 'Could not create the account.';
      setFormError(errorMsg);
      Alert.alert('Account Creation Failed', errorMsg);
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
              <GlassButton
                key={option.value}
                style={[styles.typeChip, selected && styles.typeChipSelected]}
                intensity={selected ? 55 : 35}
                borderRadius={radius.sm}
                onPress={() => setType(option.value)}
                disabled={busy}
              >
                <View style={styles.typeChipContent}>
                  <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                    {option.label}
                  </Text>
                </View>
              </GlassButton>
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

        <GlassButton
          style={styles.saveButton}
          intensity={55}
          borderRadius={radius.md}
          disabled={busy}
          onPress={() => void submit()}
        >
          <View style={styles.saveButtonContent}>
            <Text style={styles.saveButtonText}>{busy ? 'Saving…' : 'Create Account'}</Text>
          </View>
        </GlassButton>

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
    fontSize: typography.body,
    fontWeight: '500',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  fieldError: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.sm,
    marginTop: -spacing.xs,
  },
  formErrorBox: {
    backgroundColor: 'rgba(255,92,122,0.12)',
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
    backgroundColor: colors.surfaceGlass,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    fontSize: 16,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.xs + 2,
  },
  saveButton: {
    backgroundColor: 'rgba(0, 112, 243, 0.22)',
    borderColor: 'rgba(0, 240, 255, 0.4)',
    marginTop: spacing.md,
  },
  saveButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  typeChip: {
    backgroundColor: colors.surfaceGlass,
    flex: 1,
  },
  typeChipContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  typeChipSelected: {
    backgroundColor: 'rgba(0, 112, 243, 0.35)',
    borderColor: 'rgba(0, 240, 255, 0.45)',
  },
  typeChipText: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  typeChipTextSelected: {
    color: colors.primaryText,
    fontWeight: '600',
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
});
