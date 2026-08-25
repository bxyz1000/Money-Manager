import { Redirect } from 'expo-router';

import { useSessionStore } from '@/stores/session.store';

/**
 * Entry route: forwards to the correct area once the session state is known.
 * The root layout guarantees status is never 'initializing' here.
 */
export default function IndexRedirect() {
  const status = useSessionStore((state) => state.status);

  if (status === 'authenticated') {
    return <Redirect href="/(app)/accounts" />;
  }
  return <Redirect href="/(auth)/login" />;
}
