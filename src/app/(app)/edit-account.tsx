import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
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

import { GlassButton, GlassCard } from '@/components/GlassCard';
import type { AccountType } from '@/types/domain';
import { formatPaiseAsINR } from '@/utils/money';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useAccountsStore } from '@/stores/accounts.store';
import { useSessionStore } from '@/stores/session.store';
import { colors, radius, spacing } from '@/components/theme';

const TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'bank', label: 'Bank' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
];

export default function EditAccountScreen() {
  const router = useRouter();
  const insets = useScreenInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const accountId = typeof params.id === 'string' ? params.id : undefined;

  const status = useSessionStore((state) => state.status);
  const accounts = useAccountsStore((state) => state.accounts);
  const updateAccount = useAccountsStore((state) => state.updateAccount);
  const archiveAccount = useAccountsStore((state) => state.archiveAccount);

  const account = accounts.find((item) => item.id === accountId);

  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'bank');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  if (!account) {
    return (
      <View style={[styles.container, styles.centered, insets]}>
        <Text style={styles.bodyText}>Account not found.</Text>
        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  async function save(): Promise<void> {
    if (!account) return;
    setBusy(true);
    setError(null);
    const result = await updateAccount(account.id, { name, type });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'Could not save changes.');
      return;
    }
    Alert.alert('Saved', 'Account updated.');
    router.back();
  }

  function confirmArchive(): void {
    if (!account) return;
    Alert.alert(
      'Archive account',
      `"${account.name}" will be hidden from your active accounts. Its history is preserved and nothing is deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true);
              const result = await archiveAccount(account.id);
              setBusy(false);
              if (!result.ok) {
                setError(result.error ?? 'Could not archive the account.');
                return;
              }
              router.back();
            })();
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.container, insets]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{account.name}</Text>

        <GlassCard style={styles.balanceCard} intensity={50} borderRadius={radius.lg}>
          <View style={styles.balanceCardContent}>
            <Text style={styles.balanceLabel}>CURRENT BALANCE</Text>
            <Text style={styles.balanceValue}>{formatPaiseAsINR(account.balancePaise)}</Text>
          </View>
        </GlassCard>

        <View style={styles.readOnlyRow}>
          <Text style={styles.readOnlyLabel}>Opening balance (fixed)</Text>
          <Text style={styles.readOnlyValue}>{formatPaiseAsINR(account.initialBalancePaise)}</Text>
        </View>
        <Text style={styles.readOnlyNote}>
          The opening balance is part of your financial history and cannot be edited here.
        </Text>

        <Text style={styles.label}>Account name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          editable={!busy}
          maxLength={80}
        />

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

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <GlassButton
          style={styles.saveButton}
          intensity={55}
          borderRadius={radius.md}
          disabled={busy || name.trim().length === 0}
          onPress={() => void save()}
        >
          <View style={styles.saveButtonContent}>
            <Text style={styles.saveButtonText}>{busy ? 'Saving…' : 'Save Changes'}</Text>
          </View>
        </GlassButton>

        <Pressable
          style={[styles.archiveButton, busy && styles.disabled]}
          disabled={busy}
          onPress={confirmArchive}
        >
          <Text style={styles.archiveButtonText}>Archive Account</Text>
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
  archiveButton: {
    alignItems: 'center',
    borderColor: 'rgba(255, 92, 122, 0.4)',
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingVertical: 12,
  },
  archiveButtonText: {
    color: colors.danger,
    fontWeight: '500',
  },
  balanceCard: {
    marginBottom: spacing.lg,
  },
  balanceCardContent: {
    padding: spacing.xl,
  },
  balanceLabel: {
    color: colors.textSecondary,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 2,
  },
  balanceValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '400',
    marginTop: spacing.xs,
  },
  bodyText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  cancelButton: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.md,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
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
  readOnlyLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  readOnlyNote: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: spacing.lg,
    marginTop: -spacing.xs + 2,
  },
  readOnlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  readOnlyValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
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
  secondaryButton: {
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
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
    fontWeight: '600',
    marginBottom: spacing.md,
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
