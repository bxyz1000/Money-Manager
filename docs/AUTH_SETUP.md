# Authentication Setup

## Status summary

| Capability | App code | External config | End-to-end tested |
|---|---|---|---|
| Email/password sign-up | ✅ | none needed beyond Supabase project | ⏳ requires device run |
| Email/password sign-in | ✅ | none | ⏳ requires device run |
| Sign-out | ✅ | none | ⏳ requires device run |
| Session restore (SecureStore) | ✅ | none | ⏳ requires device run |
| Google OAuth (app-side flow) | ✅ PKCE + system browser + deep link | ❌ NOT configured yet | ❌ never tested |

## Google OAuth — REQUIRES EXTERNAL CONFIGURATION

The application-side flow is fully implemented
(`src/services/auth.service.ts` → `signInWithGoogle`):

1. `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo,
   skipBrowserRedirect: true })` builds the authorize URL (PKCE).
2. `expo-web-browser` `openAuthSessionAsync` opens the system browser.
3. Google → Supabase → redirect back to the app via the deep link
   `money-manager://auth/callback`.
4. `supabase.auth.exchangeCodeForSession(url)` completes sign-in locally;
   the session persists to SecureStore and the store updates via listener.

Before it can work, complete ALL of:

1. **Google Cloud Console**
   - Create an OAuth client of type **Web application** (yes, web — the
     secret stays server-side inside Supabase; native apps must not embed it).
   - Authorized JavaScript origins: your Supabase site URL
     (`https://<ref>.supabase.co`).
   - Authorized redirect URI:
     `https://<ref>.supabase.co/auth/v1/callback`
   - No client secret is ever placed in this repository.
2. **Supabase Dashboard → Authentication → Providers → Google**
   - Enable the provider; paste the Google **Client ID** and **Client Secret**.
3. **Supabase Dashboard → Authentication → URL Configuration**
   - Add `money-manager://auth/callback` to **Redirect URLs** so Supabase may
     hand control back to the app.
4. Rebuild the development client if the app scheme changed (it has not).

Until steps 1–3 are done, pressing “Continue with Google” will fail at the
authorize step with a mapped error — by design we do not fake success.

## Email confirmation

If Supabase Auth requires email confirmation (default on), `signUp()` returns
success with no session; the login screen tells the user to confirm their
email first, and sign-in then fails with a mapped "email not confirmed"
message until they do.

## Security invariants

- Sessions persist ONLY through `expo-secure-store`
  (`src/services/secure-storage.adapter.ts`).
- Zustand holds `{status, userId, email}` — never tokens (see
  `src/stores/session.store.ts` header for the decision record).
- No password storage, no custom crypto, no client secrets anywhere in-app.
