-- search_orbit_text(query): "who do I know who might have advice about
-- Nepal?" — deterministic substring search across everything already
-- collected about each friend: their name, how/where you met, your own
-- private notes and tags on them, recommendations either of you added,
-- and their home base / hosting note. No AI, no ranking model — just
-- straightforward matching, which is enough to be genuinely useful and
-- keeps it fast, predictable, and private (nothing leaves the database).
-- Private fields (your own notes, tags) are only ever matched against
-- YOUR OWN rows (owner_id = auth.uid()), same as everywhere else.

create or replace function public.search_orbit_text(p_query text)
returns table (
  friend_id uuid,
  friendship_id uuid,
  name text,
  matches jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with my_friends as (
    select f.id as friendship_id, p.id as friend_id, coalesce(p.display_name, p.username) as friend_name
    from public.friendships f
    join public.profiles p
      on p.id = (case when f.user_id_a = auth.uid() then f.user_id_b else f.user_id_a end)
    where auth.uid() in (f.user_id_a, f.user_id_b)
      and p_query is not null
      and length(btrim(p_query)) >= 2
  ),
  hits as (
    select mf.friendship_id, mf.friend_id, mf.friend_name, 'name' as field, mf.friend_name as snippet
    from my_friends mf
    where mf.friend_name ilike '%' || p_query || '%'

    union all
    select mf.friendship_id, mf.friend_id, mf.friend_name, 'met',
      coalesce(f.met_place, '') || case when f.met_story is not null then ': ' || f.met_story else '' end
    from my_friends mf
    join public.friendships f on f.id = mf.friendship_id
    where f.met_place ilike '%' || p_query || '%' or f.met_story ilike '%' || p_query || '%'

    union all
    select mf.friendship_id, mf.friend_id, mf.friend_name, 'met_location',
      coalesce(mci.name || ', ', '') || mco.name
    from my_friends mf
    join public.friendships f on f.id = mf.friendship_id
    left join public.cities mci on mci.id = f.connected_city_id
    left join public.countries mco on mco.code = f.connected_country_code
    where mci.name ilike '%' || p_query || '%' or mco.name ilike '%' || p_query || '%'

    union all
    select mf.friendship_id, mf.friend_id, mf.friend_name, 'note', coalesce(fn.remember_as, fn.body)
    from my_friends mf
    join public.friend_notes fn on fn.friendship_id = mf.friendship_id and fn.owner_id = auth.uid()
    where fn.remember_as ilike '%' || p_query || '%' or fn.body ilike '%' || p_query || '%'

    union all
    select mf.friendship_id, mf.friend_id, mf.friend_name, 'tag', t.name
    from my_friends mf
    join public.friend_tags ft on ft.friendship_id = mf.friendship_id
    join public.tags t on t.id = ft.tag_id and t.owner_id = auth.uid()
    where t.name ilike '%' || p_query || '%'

    union all
    select mf.friendship_id, mf.friend_id, mf.friend_name, 'recommendation',
      r.place || coalesce(': ' || r.note, '')
    from my_friends mf
    join public.friend_recommendations r on r.friendship_id = mf.friendship_id
    where r.place ilike '%' || p_query || '%' or r.note ilike '%' || p_query || '%'

    union all
    select mf.friendship_id, mf.friend_id, mf.friend_name, 'home',
      coalesce(hci.name || ', ', '') || hco.name
    from my_friends mf
    join public.profiles p on p.id = mf.friend_id
    left join public.cities hci on hci.id = p.home_city_id
    left join public.countries hco on hco.code = p.home_country_code
    where hci.name ilike '%' || p_query || '%' or hco.name ilike '%' || p_query || '%'

    union all
    select mf.friendship_id, mf.friend_id, mf.friend_name, 'hosting', p.hosting_note
    from my_friends mf
    join public.profiles p on p.id = mf.friend_id
    where p.hosting_note ilike '%' || p_query || '%'
  )
  select
    h.friend_id,
    h.friendship_id,
    h.friend_name,
    jsonb_agg(jsonb_build_object('field', h.field, 'snippet', h.snippet))
  from hits h
  group by h.friend_id, h.friendship_id, h.friend_name
  order by h.friend_name nulls last;
$$;

grant execute on function public.search_orbit_text(text) to authenticated;
