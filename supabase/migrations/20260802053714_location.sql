create extension if not exists pg_trgm;

create table public.countries (
  code text primary key,
  name text not null,
  lat numeric not null,
  lng numeric not null,
  emoji text
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries (code),
  name text not null,
  lat numeric not null,
  lng numeric not null
);

create index cities_country_code_idx on public.cities (country_code);
create index cities_name_trgm_idx on public.cities using gin (name gin_trgm_ops);

alter table public.countries enable row level security;
alter table public.cities enable row level security;

-- Reference geography, not user data: readable by anyone signed in.
create policy "countries_select_all"
  on public.countries for select
  to authenticated
  using (true);

create policy "cities_select_all"
  on public.cities for select
  to authenticated
  using (true);

alter table public.profiles
  add column location_sharing_default text not null default 'off'
    check (location_sharing_default in ('off', 'country', 'city')),
  add column current_country_code text references public.countries (code),
  add column current_city_id uuid references public.cities (id),
  add column location_updated_at timestamptz;
