-- Home base: "which country/city you live in", distinct from current
-- location (which tracks where you actually are right now and can change
-- as you travel). Unconditionally visible to confirmed friends once set,
-- same trust boundary as the WhatsApp/social contact fields — no separate
-- sharing-level toggle, since "where I'm based" is materially less
-- sensitive than a live current location.

alter table public.profiles
  add column home_country_code text references public.countries (code),
  add column home_city_id uuid references public.cities (id);

-- Multi-stop trip itineraries, replacing the single city+date-range `trips`
-- table (no production trip data predates this, so a clean replacement
-- rather than a migration path). One itinerary owns an ordered set of
-- stops, each its own city + date range.

drop function if exists public.get_upcoming_trips_with_overlap();
drop table if exists public.trips;

create table public.trip_itineraries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create index trip_itineraries_owner_id_idx on public.trip_itineraries (owner_id);

create table public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.trip_itineraries (id) on delete cascade,
  city_id uuid not null references public.cities (id),
  country_code text not null references public.countries (code),
  start_date date not null,
  end_date date not null,
  constraint trip_stops_date_range check (end_date >= start_date)
);

create index trip_stops_itinerary_id_idx on public.trip_stops (itinerary_id);
create index trip_stops_city_id_idx on public.trip_stops (city_id);

alter table public.trip_itineraries enable row level security;
alter table public.trip_stops enable row level security;

create policy "trip_itineraries_owner_all"
  on public.trip_itineraries for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "trip_stops_owner_all"
  on public.trip_stops for all
  using (
    exists (
      select 1 from public.trip_itineraries ti
      where ti.id = itinerary_id and ti.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trip_itineraries ti
      where ti.id = itinerary_id and ti.owner_id = auth.uid()
    )
  );

-- get_friends_with_location(): now also returns each friend's home base.

drop function if exists public.get_friends_with_location();

create function public.get_friends_with_location()
returns table (
  friendship_id uuid,
  friend_id uuid,
  username text,
  display_name text,
  sharing_level text,
  country_code text,
  country_name text,
  country_lat double precision,
  country_lng double precision,
  city_id uuid,
  city_name text,
  city_lat double precision,
  city_lng double precision,
  whatsapp_number text,
  social_handle text,
  contact_message text,
  home_country_code text,
  home_country_name text,
  home_city_id uuid,
  home_city_name text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with friend_rows as (
    select
      f.id as friendship_id,
      p.id as friend_id,
      p.username,
      p.display_name,
      p.current_country_code,
      p.current_city_id,
      p.whatsapp_number,
      p.social_handle,
      p.contact_message,
      p.home_country_code,
      p.home_city_id,
      coalesce(nullif(fs.sharing_level, 'default'), p.location_sharing_default) as sharing_level
    from public.friendships f
    join public.profiles p
      on p.id = (case when f.user_id_a = auth.uid() then f.user_id_b else f.user_id_a end)
    left join public.friendship_settings fs
      on fs.friendship_id = f.id and fs.owner_id = p.id
    where auth.uid() in (f.user_id_a, f.user_id_b)
  )
  select
    fr.friendship_id,
    fr.friend_id,
    fr.username,
    fr.display_name,
    fr.sharing_level,
    case when fr.sharing_level in ('country', 'city') then fr.current_country_code else null end,
    case when fr.sharing_level in ('country', 'city') then co.name else null end,
    case when fr.sharing_level in ('country', 'city') then co.lat else null end,
    case when fr.sharing_level in ('country', 'city') then co.lng else null end,
    case when fr.sharing_level = 'city' then fr.current_city_id else null end,
    case when fr.sharing_level = 'city' then ci.name else null end,
    case when fr.sharing_level = 'city' then ci.lat else null end,
    case when fr.sharing_level = 'city' then ci.lng else null end,
    fr.whatsapp_number,
    fr.social_handle,
    fr.contact_message,
    fr.home_country_code,
    hco.name,
    fr.home_city_id,
    hci.name
  from friend_rows fr
  left join public.countries co on co.code = fr.current_country_code
  left join public.cities ci on ci.id = fr.current_city_id
  left join public.countries hco on hco.code = fr.home_country_code
  left join public.cities hci on hci.id = fr.home_city_id
  order by fr.display_name nulls last, fr.username;
$$;

grant execute on function public.get_friends_with_location() to authenticated;

-- get_my_itineraries_with_connections(): each of the caller's own upcoming
-- trip stops, plus who else will be relevant there — friends currently
-- located there, friends based there (home base), or friends with their
-- own overlapping stop in the same city. Friends' raw location/trip rows
-- are never exposed directly, only this pre-computed, redacted-to-a-name
-- list, same privacy pattern as the old trip-overlap check.

create or replace function public.get_my_itineraries_with_connections()
returns table (
  itinerary_id uuid,
  title text,
  stop_id uuid,
  city_id uuid,
  city_name text,
  country_code text,
  country_name text,
  start_date date,
  end_date date,
  connections jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with my_friends as (
    select
      f.id as friendship_id,
      p.id as friend_id,
      coalesce(p.display_name, p.username) as friend_name,
      p.current_country_code,
      p.current_city_id,
      p.home_country_code,
      p.home_city_id,
      coalesce(nullif(fs.sharing_level, 'default'), p.location_sharing_default) as sharing_level
    from public.friendships f
    join public.profiles p
      on p.id = (case when f.user_id_a = auth.uid() then f.user_id_b else f.user_id_a end)
    left join public.friendship_settings fs
      on fs.friendship_id = f.id and fs.owner_id = p.id
    where auth.uid() in (f.user_id_a, f.user_id_b)
  ),
  my_stops as (
    select ts.*, ti.title
    from public.trip_stops ts
    join public.trip_itineraries ti on ti.id = ts.itinerary_id
    where ti.owner_id = auth.uid() and ts.end_date >= current_date
  )
  select
    ms.itinerary_id,
    ms.title,
    ms.id,
    ms.city_id,
    ci.name,
    ms.country_code,
    co.name,
    ms.start_date,
    ms.end_date,
    coalesce(
      (
        select jsonb_agg(jsonb_build_object('name', c.friend_name, 'reason', c.reason) order by c.priority, c.friend_name)
        from (
          select distinct on (mf.friend_id)
            mf.friend_name,
            case
              when (mf.sharing_level = 'city' and mf.current_city_id = ms.city_id)
                or (mf.sharing_level in ('city', 'country') and mf.current_country_code = ms.country_code)
                then 'currently there'
              when mf.home_city_id = ms.city_id or mf.home_country_code = ms.country_code
                then 'lives there'
              else 'visiting then'
            end as reason,
            case
              when (mf.sharing_level = 'city' and mf.current_city_id = ms.city_id)
                or (mf.sharing_level in ('city', 'country') and mf.current_country_code = ms.country_code)
                then 1
              when mf.home_city_id = ms.city_id or mf.home_country_code = ms.country_code
                then 2
              else 3
            end as priority
          from my_friends mf
          where
            (mf.sharing_level = 'city' and mf.current_city_id = ms.city_id)
            or (mf.sharing_level in ('city', 'country') and mf.current_country_code = ms.country_code)
            or mf.home_city_id = ms.city_id
            or mf.home_country_code = ms.country_code
            or exists (
              select 1
              from public.trip_stops fts
              join public.trip_itineraries fti on fti.id = fts.itinerary_id
              where fti.owner_id = mf.friend_id
                and fts.city_id = ms.city_id
                and fts.start_date <= ms.end_date
                and fts.end_date >= ms.start_date
            )
          order by mf.friend_id, priority
        ) c
      ),
      '[]'::jsonb
    ) as connections
  from my_stops ms
  join public.cities ci on ci.id = ms.city_id
  join public.countries co on co.code = ms.country_code
  order by ms.start_date;
$$;

grant execute on function public.get_my_itineraries_with_connections() to authenticated;
