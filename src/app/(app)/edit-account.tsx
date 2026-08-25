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

import type { AccountType } from '@/types/domain';
import { formatPaiseAsINR } from '@/utils/money';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useAccountsStore } from '@/stores/accounts.store';
import { useSessionStore } from '@/stores/session.store';
import { colors, radius, spacing } from '@/components/theme';

/**
 * Edit Account screen.
 *
 * Editable: name, type. Archivable via explicit confirm.
 * NOT editable: initial balance — it represents historical financial state;
 * corrections belong to a future explicit adjustment mechanism, not silent
 * edits. Balance itself is read-only and authoritative from the DB view.
 */

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

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current balance</Text>
          <Text style={styles.balanceValue}>{formatPaiseAsINR(account.balancePaise)}</Text>
        </View>

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

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          style={[styles.saveButton, busy && styles.disabled]}
          disabled={busy || name.trim().length === 0}
          onPress={() => void save()}
        >
          <Text style={styles.saveButtonText}>{busy ? 'Saving…' : 'Save Changes'}</Text>
        </Pressable>

        <Pressable
          style={[styles.archiveButton, busy && styles.disabled]}
          disabled={busy}
          onPress={confirmArchive}
        >
          <Text style={styles.archiveButtonText}>Archive Account</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  archiveButton: {
    alignItems: 'center',
    borderColor: colors.danger,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingVertical: 12,
  },
  archiveButtonText: {
    color: colors.danger,
    fontWeight: '600',
  },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    padding: spacing.xl,
  },
  balanceLabel: {
    color: '#d6e7ff',
    fontSize: 13,
  },
  balanceValue: {
    color: colors.primaryText,
    fontSize: 26,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
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
  disabled: {
    opacity: 0.5,
  },
  errorBox: {
    backgroundColor: '#fdeceb',
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
    fontWeight: '600',
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
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
});

