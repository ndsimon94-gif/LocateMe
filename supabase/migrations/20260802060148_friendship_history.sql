-- get_friendship_history(): the passport-stamp view. "How you met" is a
-- shared historical fact captured once at handshake time, not a live
-- location, so it needs no redaction — this RPC exists only because a
-- client can't otherwise read another user's profile fields at all.

create or replace function public.get_friendship_history()
returns table (
  friendship_id uuid,
  friend_id uuid,
  username text,
  display_name text,
  connected_country_name text,
  connected_city_name text,
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
