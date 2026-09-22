-- Contact fields are profile-level (fill in once), not per-friendship: once
-- two people are connected they see whatever the other has filled in, the
-- same way an existing "who are my friends" read already redacts location.
-- No extra grant is needed — profiles_update_own already permits updating
-- any column on your own row.

alter table public.profiles
  add column whatsapp_number text,
  add column social_handle text,
  add column contact_message text;

-- get_friends_with_location(): now also returns each friend's contact
-- fields, so Friend Detail can show them without a second round trip.

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
  contact_message text
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
    fr.contact_message
  from friend_rows fr
  left join public.countries co on co.code = fr.current_country_code
  left join public.cities ci on ci.id = fr.current_city_id
  order by fr.display_name nulls last, fr.username;
$$;

grant execute on function public.get_friends_with_location() to authenticated;
