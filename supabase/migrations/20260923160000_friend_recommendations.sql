-- friend_recommendations: deliberately lightweight — a place plus an
-- optional sentence, attributed to whoever added it, shared between both
-- friends (same trust boundary as friendship_photos: either member reads,
-- only the author deletes their own).

create table public.friend_recommendations (
  id uuid primary key default gen_random_uuid(),
  friendship_id uuid not null references public.friendships (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  place text not null check (char_length(place) > 0 and char_length(place) <= 140),
  note text check (note is null or char_length(note) <= 280),
  created_at timestamptz not null default now()
);

create index friend_recommendations_friendship_id_idx on public.friend_recommendations (friendship_id);

alter table public.friend_recommendations enable row level security;

create policy "friend_recommendations_select_member"
  on public.friend_recommendations for select
  using (
    exists (
      select 1 from public.friendships f
      where f.id = friendship_id and auth.uid() in (f.user_id_a, f.user_id_b)
    )
  );

create policy "friend_recommendations_insert_member"
  on public.friend_recommendations for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.friendships f
      where f.id = friendship_id and auth.uid() in (f.user_id_a, f.user_id_b)
    )
  );

create policy "friend_recommendations_delete_author"
  on public.friend_recommendations for delete
  using (author_id = auth.uid());
