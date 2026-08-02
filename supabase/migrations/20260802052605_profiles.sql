create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Profiles are private index cards, not public directory entries: a user
-- only ever reads or writes their own row directly. Anything a friend is
-- allowed to see about another user goes through a security-definer RPC
-- instead (see later migrations), never a direct table grant.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert/delete policy: rows are created only by the trigger below and
-- removed only by the auth.users cascade, never directly by a client.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
