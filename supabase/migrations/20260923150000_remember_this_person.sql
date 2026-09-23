-- "How I remember them" — a distinct, labeled private field from the
-- freeform Notes box, living alongside it on the same private
-- (friendship, owner) index card. Same RLS as the existing body column:
-- only the owner, never the friend it's about.

alter table public.friend_notes
  add column remember_as text;
