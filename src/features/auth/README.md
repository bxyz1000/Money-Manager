# src/features/auth

Authentication feature: screens, hooks and business logic for sign-up,
sign-in, session restoration and (later) Google OAuth.

Rules:
- Screens here are thin; logic lives in services (`src/services`) and stores.
- No direct `supabase.auth` calls outside `services/auth.service.ts`.
- Never log credentials or tokens.
