-- friend_notes: a private index card, one per (friendship, owner). Never
-- visible to the friend it's about — there is deliberately no policy that
-- lets the other party in the friendship read this table.

create table public.friend_notes (
  friendship_id uuid not null references public.friendships (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now(),
  primary key (friendship_id, owner_id)
);

alter table public.friend_notes enable row level security;

create policy "friend_notes_owner_all"
  on public.friend_notes for all
  using (
    owner_id = auth.uid()
    and exists (
      select 1 from public.friendships f
      where f.id = friendship_id and auth.uid() in (f.user_id_a, f.user_id_b)
    )
  )
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.friendships f
      where f.id = friendship_id and auth.uid() in (f.user_id_a, f.user_id_b)
    )
  );

-- tags: a user's own private vocabulary (e.g. "Lisbon 2024"), reusable
-- across friendships. friend_tags is the many-to-many join; ownership
-- flows through the tag itself rather than a duplicated owner_id column.

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

alter table public.tags enable row level security;

create policy "tags_owner_all"
  on public.tags for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create table public.friend_tags (
  friendship_id uuid not null references public.friendships (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (friendship_id, tag_id)
);

alter table public.friend_tags enable row level security;

create policy "friend_tags_owner_all"
  on public.friend_tags for all
  using (
    exists (select 1 from public.tags t where t.id = tag_id and t.owner_id = auth.uid())
    and exists (
      select 1 from public.friendships f
      where f.id = friendship_id and auth.uid() in (f.user_id_a, f.user_id_b)
    )
  )
  with check (
    exists (select 1 from public.tags t where t.id = tag_id and t.owner_id = auth.uid())
    and exists (
      select 1 from public.friendships f
      where f.id = friendship_id and auth.uid() in (f.user_id_a, f.user_id_b)
    )
  );
