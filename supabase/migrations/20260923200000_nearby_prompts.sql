-- "You'll be near Sofia next month. Want to let Ana know?" — Orbit never
-- auto-notifies a friend of an overlap; it only ever prompts the caller,
-- who chooses whether to say anything. This table backs the one
-- permanent action available on that prompt ("Hide"): "Maybe later" is
-- intentionally not persisted here at all — it's a same-session dismissal
-- only, so the prompt can resurface later without needing any time-based
-- expiry logic.

create table public.nearby_dismissals (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id, city_id)
);

alter table public.nearby_dismissals enable row level security;

create policy "nearby_dismissals_owner_all"
  on public.nearby_dismissals for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- get_crossing_paths(): now also returns friendship_id — the earlier
-- version only returned the friend's raw profile id, which the app was
-- (incorrectly) using to link to Friend Detail and Chat, both of which
-- route by friendship id. That link could never have resolved to
-- anything; fixed here before it shipped, caught by re-checking the
-- navigation this same migration's UI work depends on. Also now excludes
-- pairs the caller has permanently hidden.

drop function if exists public.get_crossing_paths();

create function public.get_crossing_paths()
returns table (
  friend_id uuid,
  friendship_id uuid,
  friend_name text,
  city_id uuid,
  city_name text,
  country_name text,
  my_start_date date,
  my_end_date date,
  friend_start_date date,
  friend_end_date date,
  overlap_start date,
  overlap_end date,
  overlap_days integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with my_friendships as (
    select f.id as friendship_id, case when f.user_id_a = auth.uid() then f.user_id_b else f.user_id_a end as friend_id
    from public.friendships f
    where auth.uid() in (f.user_id_a, f.user_id_b)
  ),
  my_stops as (
    select ts.*
    from public.trip_stops ts
    join public.trip_itineraries ti on ti.id = ts.itinerary_id
    where ti.owner_id = auth.uid() and ts.end_date >= current_date
  ),
  friend_stops as (
    select ts.*, ti.owner_id as friend_id
    from public.trip_stops ts
    join public.trip_itineraries ti on ti.id = ts.itinerary_id
    where ti.owner_id in (select friend_id from my_friendships) and ts.end_date >= current_date
  )
  select
    fp.id,
    mfr.friendship_id,
    coalesce(fp.display_name, fp.username),
    ms.city_id,
    ci.name,
    co.name,
    ms.start_date,
    ms.end_date,
    fs.start_date,
    fs.end_date,
    greatest(ms.start_date, fs.start_date),
    least(ms.end_date, fs.end_date),
    (least(ms.end_date, fs.end_date) - greatest(ms.start_date, fs.start_date) + 1)::integer
  from my_stops ms
  join friend_stops fs
    on fs.city_id = ms.city_id
    and fs.start_date <= ms.end_date
    and fs.end_date >= ms.start_date
  join my_friendships mfr on mfr.friend_id = fs.friend_id
  join public.profiles fp on fp.id = fs.friend_id
  join public.cities ci on ci.id = ms.city_id
  join public.countries co on co.code = ms.country_code
  where not exists (
    select 1 from public.nearby_dismissals nd
    where nd.user_id = auth.uid() and nd.friend_id = fs.friend_id and nd.city_id = ms.city_id
  )
  order by greatest(ms.start_date, fs.start_date);
$$;

grant execute on function public.get_crossing_paths() to authenticated;
