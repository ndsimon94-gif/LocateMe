-- Intentional — initial schema (designed for milestone 2; not yet connected).
--
-- Principles:
--   * Every user-owned row has user_id and row-level security limited to its owner.
--   * Store the minimum: no email bodies, no calendar descriptions, no message contents.
--   * OAuth refresh tokens live in a server-only table that clients can never read.
--   * Every assistant action that touches an external service is logged with the user's confirmation.

create extension if not exists pgcrypto;

-- Profiles -----------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  time_zone   text not null default 'UTC',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Tasks & reminders ----------------------------------------------------------
create type public.task_kind as enum ('task', 'reminder');
create type public.task_source as enum ('manual', 'assistant', 'communication');

create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 200),
  notes        text not null default '' check (char_length(notes) <= 2000),
  kind         public.task_kind not null default 'task',
  due_date     date,
  due_time     time,
  is_priority  boolean not null default false,
  completed_at timestamptz,
  source       public.task_source not null default 'manual',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,               -- soft delete for offline sync; purged after 30 days
  constraint time_needs_date check (due_time is null or due_date is not null),
  constraint reminder_needs_date check (kind <> 'reminder' or due_date is not null)
);
create index tasks_user_due_idx on public.tasks (user_id, due_date) where deleted_at is null;

-- The "three priorities" rule is also enforced server-side.
create or replace function public.enforce_priority_limit() returns trigger
language plpgsql as $$
begin
  if new.is_priority and new.completed_at is null and new.deleted_at is null then
    if (select count(*) from public.tasks t
        where t.user_id = new.user_id and t.id <> new.id and t.is_priority
          and t.completed_at is null and t.deleted_at is null
          and t.due_date = new.due_date) >= 3 then
      raise exception 'At most three open priorities per day';
    end if;
  end if;
  return new;
end $$;
create trigger tasks_priority_limit before insert or update on public.tasks
  for each row execute function public.enforce_priority_limit();

-- Focus ------------------------------------------------------------------------
create table public.focus_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  intention       text not null default '' check (char_length(intention) <= 200),
  planned_minutes int not null check (planned_minutes between 1 and 180),
  focused_minutes int not null check (focused_minutes >= 0),
  started_at      timestamptz not null,
  ended_at        timestamptz not null,
  completed       boolean not null
);
create index focus_sessions_user_started_idx on public.focus_sessions (user_id, started_at);

-- Attention preferences (one row per user) --------------------------------------
create table public.attention_preferences (
  user_id                       uuid primary key references auth.users (id) on delete cascade,
  communication_windows         jsonb not null default '[{"start":"11:30","durationMinutes":30},{"start":"16:30","durationMinutes":30}]',
  hold_messages_outside_windows boolean not null default true,
  default_focus_minutes         int not null default 25 check (default_focus_minutes between 1 and 180),
  wind_down_time                time default '21:30',
  updated_at                    timestamptz not null default now()
);

-- Integrations ---------------------------------------------------------------------
create type public.integration_provider as enum ('google_calendar', 'gmail');
create type public.integration_status as enum ('not_connected', 'connected', 'revoked', 'error');

-- Client-visible connection state. No secrets here.
create table public.integration_connections (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  provider     public.integration_provider not null,
  status       public.integration_status not null default 'not_connected',
  scopes       text[] not null default '{}',   -- exactly what the user granted
  connected_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (user_id, provider)
);

-- Server-only token storage. RLS enabled with NO policies => only the service role
-- (Edge Functions) can read or write. Tokens are encrypted with a key held in function secrets.
create table public.integration_secrets (
  connection_id           uuid primary key references public.integration_connections (id) on delete cascade,
  -- AES-GCM ciphertext (base64, iv-prefixed). The key lives only in Edge Function secrets.
  encrypted_refresh_token text not null,
  key_id                  text not null,
  updated_at              timestamptz not null default now()
);

-- Communications queue: metadata + AI summary only, never message bodies. Expires.
create type public.triage as enum ('needs_reply', 'review', 'fyi');

create table public.communication_items (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  provider            public.integration_provider not null,
  provider_message_id text not null,
  sender_display      text not null,
  subject             text not null,
  received_at         timestamptz not null,
  summary             text not null check (char_length(summary) <= 600),
  triage              public.triage not null,
  time_sensitive      boolean not null default false,
  handled_at          timestamptz,
  expires_at          timestamptz not null default now() + interval '14 days',
  unique (user_id, provider, provider_message_id)
);

-- Audit log of assistant-proposed actions that were executed or refused.
create table public.assistant_actions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  action_kind        text not null,         -- 'create_task' | 'start_focus' | 'send_reply' | 'create_event' ...
  integration        public.integration_provider,
  confirmed_by_user  boolean not null,
  outcome            text not null check (outcome in ('executed', 'refused', 'failed')),
  created_at         timestamptz not null default now()
  -- Deliberately no prompt text or message content.
);

-- Row-level security ----------------------------------------------------------------
alter table public.profiles               enable row level security;
alter table public.tasks                  enable row level security;
alter table public.focus_sessions         enable row level security;
alter table public.attention_preferences  enable row level security;
alter table public.integration_connections enable row level security;
alter table public.integration_secrets    enable row level security;  -- no policies: service role only
alter table public.communication_items    enable row level security;
alter table public.assistant_actions      enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own tasks" on public.tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own focus sessions" on public.focus_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own preferences" on public.attention_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Connections are read-only to clients; status changes only via the OAuth Edge Function.
create policy "read own connections" on public.integration_connections
  for select using (user_id = auth.uid());
create policy "read own communications" on public.communication_items
  for select using (user_id = auth.uid());
create policy "mark own communications handled" on public.communication_items
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "read own assistant log" on public.assistant_actions
  for select using (user_id = auth.uid());
-- Clients may only change handled_at on communication items.
revoke update on public.communication_items from authenticated;
grant update (handled_at) on public.communication_items to authenticated;
