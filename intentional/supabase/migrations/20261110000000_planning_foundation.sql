-- Planning foundation: time set aside by plans, applied-plan history for undo,
-- and the new attention preferences. Designed, not yet connected.

create type public.block_kind as enum ('exercise', 'focus', 'personal');

create table public.applied_plans (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  summary              text not null check (char_length(summary) <= 300),
  -- The validated structured request (no free text from the user's prompt).
  request              jsonb not null,
  created_task_ids     uuid[] not null default '{}',
  prioritized_task_ids uuid[] not null default '{}',
  previous_windows     jsonb,
  applied_at           timestamptz not null default now(),
  undone_at            timestamptz
);

create table public.time_blocks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 60),
  kind              public.block_kind not null,
  date              date not null,
  start_time        time not null,
  end_time          time not null check (end_time > start_time),
  plan_id           uuid references public.applied_plans (id) on delete cascade,
  -- Set once the block has been written to the user's calendar (with consent).
  external_event_id text,
  created_at        timestamptz not null default now()
);
create index time_blocks_user_date_idx on public.time_blocks (user_id, date);

alter table public.attention_preferences
  add column planning_start time not null default '07:00',
  add column planning_end time not null default '21:00',
  add column notify_communication_windows boolean not null default false,
  add column notify_time_blocks boolean not null default true,
  add column default_reminder_time time not null default '09:00';

alter table public.applied_plans enable row level security;
alter table public.time_blocks enable row level security;

create policy "own applied plans" on public.applied_plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own time blocks" on public.time_blocks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
