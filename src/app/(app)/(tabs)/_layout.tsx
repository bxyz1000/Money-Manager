import { Tabs, useRouter } from 'expo-router';
import { Text } from 'react-native';

import { colors } from '@/components/theme';

/**
 * Authenticated bottom navigation: Home · Expenses · [+ Add] · Accounts ·
 * Profile. The center action opens the existing add-transaction modal —
 * it does not duplicate any creation logic.
 */

function AddIcon() {
  return (
    <Text style={{ color: colors.primary, fontSize: 26, fontWeight: '300', marginTop: -2 }}>
      +
    </Text>
  );
}

export default function TabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentBright,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: '#0a0c14',
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="expenses" options={{ title: 'Expenses' }} />
      <Tabs.Screen
        name="add-center"
        options={{
          title: 'Add',
          tabBarIcon: AddIcon,
          tabBarActiveTintColor: colors.primary,
        }}
        listeners={() => ({
          tabPress: (event) => {
            // Never land on the placeholder route — open the real modal.
            event.preventDefault();
            router.push('/(app)/add-transaction');
          },
        })}
      />
      <Tabs.Screen name="accounts" options={{ title: 'Accounts' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
