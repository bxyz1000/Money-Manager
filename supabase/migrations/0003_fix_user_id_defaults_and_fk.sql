-- ============================================================================
-- Migration 0003: Add DEFAULT auth.uid() on all user-owned tables
--
-- Fixes not-null constraint failure (23502) and ensures RLS owner checks pass
-- seamlessly for both authenticated and anonymous users.
-- ============================================================================

-- Set default auth.uid() on user_id for all user-owned tables
alter table public.accounts alter column user_id set default auth.uid();
alter table public.categories alter column user_id set default auth.uid();
alter table public.transactions alter column user_id set default auth.uid();
alter table public.recurring_payments alter column user_id set default auth.uid();
alter table public.savings_goals alter column user_id set default auth.uid();
alter table public.monthly_summaries alter column user_id set default auth.uid();
alter table public.ai_insights alter column user_id set default auth.uid();

-- Ensure users table trigger handles anonymous users and upserts gracefully
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'display_name', '')
    )
  )
  on conflict (id) do update
  set
    email = coalesce(excluded.email, public.users.email),
    display_name = coalesce(excluded.display_name, public.users.display_name),
    updated_at = now();
  return new;
end;
$$;
