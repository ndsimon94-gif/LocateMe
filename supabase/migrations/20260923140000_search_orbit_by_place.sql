-- search_orbit_by_place(country): "type a country, see your whole private
-- network there" — the flagship view tying together data already
-- collected elsewhere (home base, current location, where you met people,
-- trip stops) into one place-first lens. Every reason is computed
-- server-side from the same privacy rules as the rest of the app (current
-- location still respects each friend's sharing level; nothing new is
-- exposed that wasn't already visible somewhere in the app).

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
      coalesce(nullif(fs.sharing_level, 'default'), p.location_sharing_default) as sharing_level,
      f.connected_country_code,
      coalesce(ci.name, co.name) as met_place,
      f.created_at::date as met_at
    from public.friendships f
    join public.profiles p
      on p.id = (case when f.user_id_a = auth.uid() then f.user_id_b else f.user_id_a end)
    left join public.friendship_settings fs
      on fs.friendship_id = f.id and fs.owner_id = p.id
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
