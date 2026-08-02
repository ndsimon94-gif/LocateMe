create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  city_id uuid not null references public.cities (id),
  country_code text not null references public.countries (code),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  constraint trips_date_range check (end_date >= start_date)
);

create index trips_owner_id_idx on public.trips (owner_id);
create index trips_city_id_idx on public.trips (city_id);

alter table public.trips enable row level security;

create policy "trips_owner_all"
  on public.trips for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- get_upcoming_trips_with_overlap(): each of the caller's own upcoming
-- trips, plus the names of any friends whose own trip to the same city
-- overlaps in dates. Friends' trips are never exposed directly to the
-- client — only ever this pre-computed, redacted-to-a-name-list result.

create or replace function public.get_upcoming_trips_with_overlap()
returns table (
  trip_id uuid,
  city_id uuid,
  city_name text,
  country_code text,
  country_name text,
  start_date date,
  end_date date,
  overlap_friend_names text[]
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with my_trips as (
    select t.*
    from public.trips t
    where t.owner_id = auth.uid()
      and t.end_date >= current_date
  ),
  my_friend_ids as (
    select case when f.user_id_a = auth.uid() then f.user_id_b else f.user_id_a end as friend_id
    from public.friendships f
    where auth.uid() in (f.user_id_a, f.user_id_b)
  )
  select
    mt.id,
    mt.city_id,
    ci.name,
    mt.country_code,
    co.name,
    mt.start_date,
    mt.end_date,
    coalesce(
      (
        select array_agg(distinct coalesce(fp.display_name, fp.username) order by coalesce(fp.display_name, fp.username))
        from public.trips ft
        join public.profiles fp on fp.id = ft.owner_id
        where ft.owner_id in (select friend_id from my_friend_ids)
          and ft.city_id = mt.city_id
          and ft.start_date <= mt.end_date
          and ft.end_date >= mt.start_date
      ),
      '{}'
    ) as overlap_friend_names
  from my_trips mt
  join public.cities ci on ci.id = mt.city_id
  join public.countries co on co.code = mt.country_code
  order by mt.start_date;
$$;

grant execute on function public.get_upcoming_trips_with_overlap() to authenticated;
