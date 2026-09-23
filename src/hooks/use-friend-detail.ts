import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type Tag = { id: string; name: string };

export function useFriendDetail(friendshipId: string | undefined) {
  const { session } = useAuth();
  const [note, setNote] = useState('');
  const [rememberAs, setRememberAs] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [metPlace, setMetPlace] = useState('');
  const [metStory, setMetStory] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!friendshipId || !session) return;
    setIsLoading(true);
    const [{ data: noteRow }, { data: tagRows }, { data: friendshipRow }] = await Promise.all([
      supabase
        .from('friend_notes')
        .select('body, remember_as')
        .eq('friendship_id', friendshipId)
        .eq('owner_id', session.user.id)
        .maybeSingle(),
      supabase.from('friend_tags').select('tags ( id, name )').eq('friendship_id', friendshipId),
      supabase.from('friendships').select('met_place, met_story').eq('id', friendshipId).single(),
    ]);
    setNote(noteRow?.body ?? '');
    setRememberAs(noteRow?.remember_as ?? '');
    type Row = { tags: Tag | null };
    const rows = (tagRows as unknown as Row[]) ?? [];
    setTags(rows.map((row) => row.tags).filter((tag): tag is Tag => tag !== null));
    setMetPlace(friendshipRow?.met_place ?? '');
    setMetStory(friendshipRow?.met_story ?? '');
    setIsLoading(false);
  }, [friendshipId, session]);

  useEffect(() => {
    async function initialize() {
      await refresh();
    }
    initialize();
  }, [refresh]);

  const saveNote = useCallback(
    async (body: string) => {
      if (!friendshipId || !session) return;
      setNote(body);
      await supabase
        .from('friend_notes')
        .upsert({
          friendship_id: friendshipId,
          owner_id: session.user.id,
          body,
          updated_at: new Date().toISOString(),
        });
    },
    [friendshipId, session],
  );

  const saveRememberAs = useCallback(
    async (value: string) => {
      if (!friendshipId || !session) return;
      setRememberAs(value);
      await supabase
        .from('friend_notes')
        .upsert({
          friendship_id: friendshipId,
          owner_id: session.user.id,
          remember_as: value || null,
          updated_at: new Date().toISOString(),
        });
    },
    [friendshipId, session],
  );

  const saveStory = useCallback(
    async (place: string, story: string) => {
      if (!friendshipId) return;
      setMetPlace(place);
      setMetStory(story);
      await supabase
        .from('friendships')
        .update({ met_place: place || null, met_story: story || null })
        .eq('id', friendshipId);
    },
    [friendshipId],
  );

  const addTag = useCallback(
    async (name: string) => {
      if (!friendshipId || !session) return;
      const trimmed = name.trim();
      if (!trimmed || tags.some((tag) => tag.name.toLowerCase() === trimmed.toLowerCase())) return;

      const { data: existing } = await supabase
        .from('tags')
        .select('id, name')
        .eq('owner_id', session.user.id)
        .ilike('name', trimmed)
        .maybeSingle();

      let tag = existing;
      if (!tag) {
        const { data: created } = await supabase
          .from('tags')
          .insert({ owner_id: session.user.id, name: trimmed })
          .select('id, name')
          .single();
        tag = created;
      }
      if (!tag) return;

      await supabase.from('friend_tags').upsert({ friendship_id: friendshipId, tag_id: tag.id });
      setTags((prev) => [...prev, tag]);
    },
    [friendshipId, session, tags],
  );

  const removeTag = useCallback(
    async (tagId: string) => {
      if (!friendshipId) return;
      setTags((prev) => prev.filter((tag) => tag.id !== tagId));
      await supabase.from('friend_tags').delete().eq('friendship_id', friendshipId).eq('tag_id', tagId);
    },
    [friendshipId],
  );

  return {
    note,
    rememberAs,
    tags,
    metPlace,
    metStory,
    isLoading,
    saveNote,
    saveRememberAs,
    saveStory,
    addTag,
    removeTag,
  };
}
