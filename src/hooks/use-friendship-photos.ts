import { useCallback, useEffect, useState } from 'react';

import {
  deletePhoto,
  getPhotoUrl,
  pickAndUploadPhoto,
  type FriendshipPhoto,
} from '@/lib/friendship-photos';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type PhotoWithUrl = FriendshipPhoto & { url: string | null };

export function useFriendshipPhotos(friendshipId: string | undefined) {
  const { session } = useAuth();
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const refresh = useCallback(async () => {
    if (!friendshipId) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('friendship_photos')
      .select('*')
      .eq('friendship_id', friendshipId)
      .order('created_at', { ascending: false });
    const rows = data ?? [];
    const withUrls = await Promise.all(
      rows.map(async (row) => ({ ...row, url: await getPhotoUrl(row.storage_path) })),
    );
    setPhotos(withUrls);
    setIsLoading(false);
  }, [friendshipId]);

  useEffect(() => {
    async function initialize() {
      await refresh();
    }
    initialize();
  }, [refresh]);

  const addPhoto = useCallback(async () => {
    if (!friendshipId || !session) return;
    setIsUploading(true);
    try {
      const created = await pickAndUploadPhoto(friendshipId, session.user.id);
      if (created) await refresh();
    } finally {
      setIsUploading(false);
    }
  }, [friendshipId, session, refresh]);

  const removePhoto = useCallback(async (photo: FriendshipPhoto) => {
    setPhotos((prev) => prev.filter((item) => item.id !== photo.id));
    await deletePhoto(photo);
  }, []);

  return { photos, isLoading, isUploading, addPhoto, removePhoto, myUserId: session?.user.id };
}
