-- `numeric` is serialized by PostgREST as a JSON string (to avoid precision
-- loss), which is the wrong shape for coordinates the client will actually
-- do arithmetic on. `double precision` is both the more honest type for a
-- lat/lng and comes back as a real JSON number.

alter table public.countries
  alter column lat type double precision,
  alter column lng type double precision;

alter table public.cities
  alter column lat type double precision,
  alter column lng type double precision;

-- get_friends_with_location(): now also returns each resolved location's
-- coordinates, so the map can place a pin without a second round trip.

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
  city_lng double precision
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
    case when fr.sharing_level = 'city' then ci.lng else null end
  from friend_rows fr
  left join public.countries co on co.code = fr.current_country_code
  left join public.cities ci on ci.id = fr.current_city_id
  order by fr.display_name nulls last, fr.username;
$$;

grant execute on function public.get_friends_with_location() to authenticated;
