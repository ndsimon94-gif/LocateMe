-- get_crossing_paths(): upcoming trip-stop overlaps between the caller and
-- a friend, promoted to their own first-class concept rather than buried
-- as a badge on a trip card. Purely a trip-to-trip overlap check (distinct
-- from "lives there"/"currently there", which are about where someone
-- already is, not two people both traveling to the same place).

create or replace function public.get_crossing_paths()
returns table (
  friend_id uuid,
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
  with my_friend_ids as (
    select case when f.user_id_a = auth.uid() then f.user_id_b else f.user_id_a end as friend_id
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
    where ti.owner_id in (select friend_id from my_friend_ids) and ts.end_date >= current_date
  )
  select
    fp.id,
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
  join public.profiles fp on fp.id = fs.friend_id
  join public.cities ci on ci.id = ms.city_id
  join public.countries co on co.code = ms.country_code
  order by greatest(ms.start_date, fs.start_date);
$$;

grant execute on function public.get_crossing_paths() to authenticated;
