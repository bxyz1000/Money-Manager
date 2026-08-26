import { Tabs, useRouter } from 'expo-router';
import { Platform } from 'react-native';

import { TabIcon } from '@/components/TabIcon';
import { colors, typography } from '@/components/theme';

/**
 * Authenticated bottom navigation: Home · Expenses · [+ Add] · Accounts · Profile.
 * Features dedicated Ionicons vector icons with active indicators and elevated center button.
 */

export default function TabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentBright,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: typography.caption,
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: '#0a0c14',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="expenses" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="add-center"
        options={{
          title: 'Add',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="add" color={color} focused={focused} />
          ),
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
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="accounts" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="profile" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
