import { Stack } from 'expo-router';

/**
 * Authenticated app shell: tabbed core (Home/Expenses/Accounts/Profile) plus
 * modal/pushed screens for account & transaction editing. The root layout
 * already blocks ALL rendering until the session state is known, so nothing
 * here can appear unauthenticated.
 */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add-account" options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-transaction" options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit-account" />
      <Stack.Screen name="edit-transaction" />
    </Stack>
  );
}
