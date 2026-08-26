-- ============================================================================
-- Migration 0002: profiles table
--
-- Supports display name storage for anonymous and authenticated users.
-- RLS enabled and forced: users can only read/upsert their own profile row.
-- ============================================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text check (char_length(name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

create policy profiles_owner_all on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

comment on table public.profiles is
  'User profiles storing display name and preferences, keyed directly by auth.users id.';
