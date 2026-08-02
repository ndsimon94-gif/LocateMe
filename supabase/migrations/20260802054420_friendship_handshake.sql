-- connect_codes: single-use, short-lived QR handshake tokens ----------------

create table public.connect_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '3 minutes'),
  used_by uuid references public.profiles (id),
  used_at timestamptz
);

create index connect_codes_user_id_idx on public.connect_codes (user_id);

alter table public.connect_codes enable row level security;

create policy "connect_codes_select_own"
  on public.connect_codes for select
  using (user_id = auth.uid());

create policy "connect_codes_insert_own"
  on public.connect_codes for insert
  with check (user_id = auth.uid());

-- No update/delete policy: a code is only ever claimed by
-- redeem_connect_code() below, which runs as the function owner and
-- bypasses RLS. A client can never mark its own or anyone else's code used.

-- friendships: one row per mutual connection -------------------------------

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id_a uuid not null references public.profiles (id) on delete cascade,
  user_id_b uuid not null references public.profiles (id) on delete cascade,
  -- Where the handshake happened, captured once at connect time for the
  -- Orbit history timeline. Never updated afterward.
  connected_country_code text references public.countries (code),
  connected_city_id uuid references public.cities (id),
  created_at timestamptz not null default now(),
  constraint friendships_ordered_pair check (user_id_a < user_id_b),
  unique (user_id_a, user_id_b)
);

create index friendships_user_id_a_idx on public.friendships (user_id_a);
create index friendships_user_id_b_idx on public.friendships (user_id_b);

alter table public.friendships enable row level security;

create policy "friendships_select_member"
  on public.friendships for select
  using (auth.uid() in (user_id_a, user_id_b));

-- No insert policy: created only by redeem_connect_code() below.

create policy "friendships_delete_member"
  on public.friendships for delete
  using (auth.uid() in (user_id_a, user_id_b));

-- friendship_settings: per-friend override of the sharing level -----------

create table public.friendship_settings (
  friendship_id uuid not null references public.friendships (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  sharing_level text not null default 'default'
    check (sharing_level in ('default', 'off', 'country', 'city')),
  primary key (friendship_id, owner_id)
);

alter table public.friendship_settings enable row level security;

create policy "friendship_settings_owner_all"
  on public.friendship_settings for all
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

-- conversations + messages --------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  friendship_id uuid not null unique references public.friendships (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "conversations_select_member"
  on public.conversations for select
  using (
    exists (
      select 1 from public.friendships f
      where f.id = friendship_id and auth.uid() in (f.user_id_a, f.user_id_b)
    )
  );

-- No insert policy: created only alongside a friendship, by
-- redeem_connect_code() below.

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) > 0 and char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index messages_conversation_id_created_at_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

create policy "messages_select_member"
  on public.messages for select
  using (
    exists (
      select 1
      from public.conversations c
      join public.friendships f on f.id = c.friendship_id
      where c.id = conversation_id and auth.uid() in (f.user_id_a, f.user_id_b)
    )
  );

create policy "messages_insert_member"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.conversations c
      join public.friendships f on f.id = c.friendship_id
      where c.id = conversation_id and auth.uid() in (f.user_id_a, f.user_id_b)
    )
  );

alter publication supabase_realtime add table public.messages;

-- redeem_connect_code(token): the only way a friendship or conversation ---
-- gets created. Single transaction, single-use, identity always comes from
-- the caller's JWT (auth.uid()) rather than any client-supplied id.

create or replace function public.redeem_connect_code(p_token text)
returns table (
  friendship_id uuid,
  friend_id uuid,
  friend_username text,
  friend_display_name text,
  already_connected boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := auth.uid();
  v_owner_id uuid;
  v_friendship_id uuid;
  v_user_a uuid;
  v_user_b uuid;
  v_country text;
  v_city uuid;
  v_already boolean := false;
begin
  if v_me is null then
    raise exception 'not_authenticated';
  end if;

  select c.user_id into v_owner_id from public.connect_codes c where c.token = p_token;

  if v_owner_id is null then
    raise exception 'code_not_found';
  end if;

  if v_owner_id = v_me then
    raise exception 'own_code';
  end if;

  -- Atomically claim the code: only one caller can win this update, which
  -- is the actual single-use guarantee (the lookup above is only there to
  -- produce a friendlier error and is not relied on for correctness).
  update public.connect_codes
    set used_by = v_me, used_at = now()
    where token = p_token and used_by is null and expires_at > now()
    returning user_id into v_owner_id;

  if v_owner_id is null then
    raise exception 'code_expired';
  end if;

  v_user_a := least(v_me, v_owner_id);
  v_user_b := greatest(v_me, v_owner_id);

  select f.id into v_friendship_id
    from public.friendships f
    where f.user_id_a = v_user_a and f.user_id_b = v_user_b;

  if v_friendship_id is not null then
    v_already := true;
  else
    select p.current_country_code, p.current_city_id
      into v_country, v_city
      from public.profiles p
      where p.id = v_me;

    insert into public.friendships (user_id_a, user_id_b, connected_country_code, connected_city_id)
    values (v_user_a, v_user_b, v_country, v_city)
    returning id into v_friendship_id;

    insert into public.conversations (friendship_id) values (v_friendship_id);
  end if;

  return query
    select v_friendship_id, p.id, p.username, p.display_name, v_already
    from public.profiles p
    where p.id = v_owner_id;
end;
$$;

grant execute on function public.redeem_connect_code(text) to authenticated;
