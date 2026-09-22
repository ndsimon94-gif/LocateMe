-- A shared page for the memory itself: where you met (beyond the auto-
-- captured city — a specific place name) and how you met, editable by
-- either person in the friendship since it's their shared story, not
-- private data. Column-scoped grants keep the update surface to exactly
-- these two columns — RLS alone would let a permissive UPDATE policy touch
-- every column, including the ones that must never change after connect
-- (user_id_a/b, connected_country_code/city_id).

alter table public.friendships
  add column met_place text,
  add column met_story text;

grant update (met_place, met_story) on public.friendships to authenticated;

create policy "friendships_update_story_member"
  on public.friendships for update
  using (auth.uid() in (user_id_a, user_id_b))
  with check (auth.uid() in (user_id_a, user_id_b));

-- friendship_photos: a shared gallery per connection. Either member can add;
-- only the person who added a photo can remove it, so one friend can't
-- unilaterally delete the other's contribution to a shared memory.

create table public.friendship_photos (
  id uuid primary key default gen_random_uuid(),
  friendship_id uuid not null references public.friendships (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index friendship_photos_friendship_id_idx on public.friendship_photos (friendship_id);

alter table public.friendship_photos enable row level security;

create policy "friendship_photos_select_member"
  on public.friendship_photos for select
  using (
    exists (
      select 1 from public.friendships f
      where f.id = friendship_id and auth.uid() in (f.user_id_a, f.user_id_b)
    )
  );

create policy "friendship_photos_insert_member"
  on public.friendship_photos for insert
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.friendships f
      where f.id = friendship_id and auth.uid() in (f.user_id_a, f.user_id_b)
    )
  );

create policy "friendship_photos_delete_own"
  on public.friendship_photos for delete
  using (uploaded_by = auth.uid());

-- Storage: a private bucket, one folder per friendship id. Access mirrors
-- the table policies above — membership in the friendship, checked via the
-- folder name, since storage.objects has no friendship_id column of its own.

insert into storage.buckets (id, name, public)
values ('friendship-photos', 'friendship-photos', false)
on conflict (id) do nothing;

create policy "friendship_photos_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'friendship-photos'
    and exists (
      select 1 from public.friendships f
      where f.id::text = (storage.foldername(name))[1]
        and auth.uid() in (f.user_id_a, f.user_id_b)
    )
  );

create policy "friendship_photos_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'friendship-photos'
    and exists (
      select 1 from public.friendships f
      where f.id::text = (storage.foldername(name))[1]
        and auth.uid() in (f.user_id_a, f.user_id_b)
    )
  );

create policy "friendship_photos_storage_delete"
  on storage.objects for delete
  using (bucket_id = 'friendship-photos' and owner = auth.uid());

-- get_friendship_history(): now also returns the meeting-place coordinates
-- (so History's map doesn't need a second round trip) and the shared
-- place/story fields.

drop function if exists public.get_friendship_history();

create function public.get_friendship_history()
returns table (
  friendship_id uuid,
  friend_id uuid,
  username text,
  display_name text,
  connected_country_name text,
  connected_city_name text,
  connected_city_lat double precision,
  connected_city_lng double precision,
  connected_country_lat double precision,
  connected_country_lng double precision,
  met_place text,
  met_story text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    f.id,
    p.id,
    p.username,
    p.display_name,
    co.name,
    ci.name,
    ci.lat,
    ci.lng,
    co.lat,
    co.lng,
    f.met_place,
    f.met_story,
    f.created_at
  from public.friendships f
  join public.profiles p
    on p.id = (case when f.user_id_a = auth.uid() then f.user_id_b else f.user_id_a end)
  left join public.countries co on co.code = f.connected_country_code
  left join public.cities ci on ci.id = f.connected_city_id
  where auth.uid() in (f.user_id_a, f.user_id_b)
  order by f.created_at desc;
$$;

grant execute on function public.get_friendship_history() to authenticated;
