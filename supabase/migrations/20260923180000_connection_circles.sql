-- Connection circles: your existing private tags can now optionally carry
-- a default sharing level ("Close Friends" -> city, etc). Nobody sees what
-- circle you've put them in — the tag stays private (existing tags RLS),
-- only its effect (a friend seeing more or less of your location) is ever
-- visible, and only to that one friend.

alter table public.tags
  add column default_sharing_level text
    check (default_sharing_level is null or default_sharing_level in ('off', 'country', 'city'));

-- effective_sharing_level(friendship_id, friend_id): the single place that
-- resolves what `friend_id` shares with the caller for this friendship,
-- used by every RPC that redacts by sharing level. Precedence, most to
-- least specific: an explicit per-friendship override
-- (friendship_settings, set by the friend) > the friend's own circle tags
-- on this friendship (most restrictive tag wins if more than one applies)
-- > the friend's global default. This is SECURITY DEFINER so it can read
-- the friend's own tags (invisible to the caller under normal RLS) purely
-- to compute this one redacted value — the tags themselves are never
-- exposed.

create or replace function public.effective_sharing_level(p_friendship_id uuid, p_friend_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    nullif(fs.sharing_level, 'default'),
    (
      select case
        when bool_or(t.default_sharing_level = 'off') then 'off'
        when bool_or(t.default_sharing_level = 'country') then 'country'
        when bool_or(t.default_sharing_level = 'city') then 'city'
      end
      from public.friend_tags ft
      join public.tags t on t.id = ft.tag_id
      where ft.friendship_id = p_friendship_id
        and t.owner_id = p_friend_id
        and t.default_sharing_level is not null
    ),
    p.location_sharing_default
  )
  from public.profiles p
  left join public.friendship_settings fs
    on fs.friendship_id = p_friendship_id and fs.owner_id = p_friend_id
  where p.id = p_friend_id
$$;

-- get_friends_with_location(): now resolves sharing_level via
-- effective_sharing_level() instead of the inline coalesce, so circle
-- tags apply here too.

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
  home_city_name text,
  hosting_status text,
  hosting_note text
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
      p.hosting_status,
      p.hosting_note,
      public.effective_sharing_level(f.id, p.id) as sharing_level
    from public.friendships f
    join public.profiles p
      on p.id = (case when f.user_id_a = auth.uid() then f.user_id_b else f.user_id_a end)
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
    hci.name,
    fr.hosting_status,
    fr.hosting_note
  from friend_rows fr
  left join public.countries co on co.code = fr.current_country_code
  left join public.cities ci on ci.id = fr.current_city_id
  left join public.countries hco on hco.code = fr.home_country_code
  left join public.cities hci on hci.id = fr.home_city_id
  order by fr.display_name nulls last, fr.username;
$$;

grant execute on function public.get_friends_with_location() to authenticated;

-- get_my_itineraries_with_connections(): same swap.

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
      public.effective_sharing_level(f.id, p.id) as sharing_level
    from public.friendships f
    join public.profiles p
      on p.id = (case when f.user_id_a = auth.uid() then f.user_id_b else f.user_id_a end)
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

-- search_orbit_by_place(): same swap.

create or replace function public.search_orbit_by_place(p_country_code text)
returns table (
  friend_id uuid,
  friendship_id uuid,
  name text,
  reasons jsonb,
  met_place text,
  met_at date
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
      p.home_country_code,
      public.effective_sharing_level(f.id, p.id) as sharing_level,
      f.connected_country_code,
      coalesce(ci.name, co.name) as met_place,
      f.created_at::date as met_at
    from public.friendships f
    join public.profiles p
      on p.id = (case when f.user_id_a = auth.uid() then f.user_id_b else f.user_id_a end)
    left join public.cities ci on ci.id = f.connected_city_id
    left join public.countries co on co.code = f.connected_country_code
    where auth.uid() in (f.user_id_a, f.user_id_b)
  ),
  friend_trip_stops as (
    select
      ti.owner_id as friend_id,
      min(ts.start_date) filter (where ts.start_date > current_date) as next_arrival,
      max(ts.end_date) filter (where ts.end_date <= current_date) as last_visit
    from public.trip_stops ts
    join public.trip_itineraries ti on ti.id = ts.itinerary_id
    where ts.country_code = p_country_code
      and ti.owner_id in (select friend_id from my_friends)
    group by ti.owner_id
  )
  select
    mf.friend_id,
    mf.friendship_id,
    mf.friend_name,
    (
      select jsonb_agg(r.reason order by r.priority)
      from (
        values
          (mf.home_country_code = p_country_code, 1, jsonb_build_object('type', 'lives_there')),
          (
            mf.sharing_level in ('city', 'country') and mf.current_country_code = p_country_code,
            2,
            jsonb_build_object('type', 'currently_there')
          ),
          (
            fts.next_arrival is not null,
            3,
            jsonb_build_object('type', 'upcoming_trip', 'date', fts.next_arrival)
          ),
          (
            mf.connected_country_code = p_country_code,
            4,
            jsonb_build_object('type', 'met_there')
          ),
          (
            fts.last_visit is not null,
            5,
            jsonb_build_object('type', 'past_trip', 'date', fts.last_visit)
          )
      ) as r (matched, priority, reason)
      where r.matched
    ) as reasons,
    mf.met_place,
    mf.met_at
  from my_friends mf
  left join friend_trip_stops fts on fts.friend_id = mf.friend_id
  where
    mf.home_country_code = p_country_code
    or (mf.sharing_level in ('city', 'country') and mf.current_country_code = p_country_code)
    or mf.connected_country_code = p_country_code
    or fts.friend_id is not null
  order by mf.friend_name nulls last;
$$;

grant execute on function public.search_orbit_by_place(text) to authenticated;
