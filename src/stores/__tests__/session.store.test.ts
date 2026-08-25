/**
 * Session store behaviour tests.
 *
 * The auth service is fully mocked — no network, no SecureStore, no Supabase.
 * The registered auth-state listener is captured so tests can drive real
 * transitions: restore-on-launch, sign-out, and OAuth-style sign-in events.
 *
 * Each test loads a FRESH store module via jest.isolateModules because the
 * store intentionally subscribes to auth changes exactly once per process
 * (module-level guard); isolation gives every test its own subscription.
 */

type SafeUser = { userId: string; email: string | null };
type Listener = (user: SafeUser | null) => void;

const mockedRestoreSession = jest.fn<Promise<SafeUser | null>, []>();
const mockedSignOut = jest.fn<Promise<void>, []>();
const listenerRef: { current: Listener | null } = { current: null };
let subscribeCount = 0;

jest.mock('@/services/auth.service', () => ({
  authService: {
    restoreSession: (...args: []) => mockedRestoreSession(...args),
    signOut: (...args: []) => mockedSignOut(...args),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signInWithGoogle: jest.fn(),
    getCurrentUserId: jest.fn(),
    onSessionChange: (listener: Listener) => {
      subscribeCount += 1;
      listenerRef.current = listener;
      return () => {
        listenerRef.current = null;
      };
    },
  },
}));

function loadFreshStore(): typeof import('../session.store') {
  let mod!: typeof import('../session.store');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../session.store');
  });
  return mod;
}

describe('session.store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listenerRef.current = null;
    subscribeCount = 0;
  });

  it('starts in initializing state with no user facts exposed', () => {
    const store = loadFreshStore().useSessionStore;
    const state = store.getState();
    expect(state.status).toBe('initializing');
    expect(state.userId).toBeNull();
    expect(state.email).toBeNull();
  });

  it('transitions to authenticated when a persisted session is restored', async () => {
    const store = loadFreshStore().useSessionStore;
    mockedRestoreSession.mockResolvedValueOnce({
      userId: 'u-1',
      email: 'user@example.com',
    });

    await store.getState().initialize();

    const state = store.getState();
    expect(state.status).toBe('authenticated');
    expect(state.userId).toBe('u-1');
    expect(state.email).toBe('user@example.com');
  });

  it('transitions to unauthenticated when no session exists', async () => {
    const store = loadFreshStore().useSessionStore;
    mockedRestoreSession.mockResolvedValueOnce(null);

    await store.getState().initialize();

    expect(store.getState().status).toBe('unauthenticated');
    expect(store.getState().userId).toBeNull();
  });

  it('treats a failed restore as unauthenticated rather than crashing', async () => {
    const store = loadFreshStore().useSessionStore;
    mockedRestoreSession.mockRejectedValueOnce(new TypeError('Network request failed'));

    await store.getState().initialize();

    const state = store.getState();
    expect(state.status).toBe('unauthenticated');
    expect(state.userId).toBeNull();
    expect(state.email).toBeNull();
  });

  it('subscribes to auth-state changes exactly once despite repeated init', async () => {
    const store = loadFreshStore().useSessionStore;
    mockedRestoreSession.mockResolvedValue(null);

    await store.getState().initialize();
    await store.getState().initialize();

    expect(subscribeCount).toBe(1);
    expect(listenerRef.current).not.toBeNull();
  });

  it('sign-out event flips an authenticated store to unauthenticated', async () => {
    const store = loadFreshStore().useSessionStore;
    mockedRestoreSession.mockResolvedValueOnce({
      userId: 'u-1',
      email: 'user@example.com',
    });
    await store.getState().initialize();
    expect(store.getState().status).toBe('authenticated');

    listenerRef.current?.(null); // supabase fires SIGNED_OUT

    expect(store.getState().status).toBe('unauthenticated');
    expect(store.getState().email).toBeNull();
  });

  it('OAuth-style sign-in event flips an unauthenticated store to authenticated', async () => {
    const store = loadFreshStore().useSessionStore;
    mockedRestoreSession.mockResolvedValueOnce(null);
    await store.getState().initialize();
    expect(store.getState().status).toBe('unauthenticated');

    listenerRef.current?.({ userId: 'g-1', email: 'gmail-user@gmail.com' });

    const state = store.getState();
    expect(state.status).toBe('authenticated');
    expect(state.userId).toBe('g-1');
    expect(state.email).toBe('gmail-user@gmail.com');
  });

  it('signOut action delegates to the service', async () => {
    const store = loadFreshStore().useSessionStore;
    mockedSignOut.mockResolvedValueOnce(undefined);
    await store.getState().signOut();
    expect(mockedSignOut).toHaveBeenCalledTimes(1);
  });
});


