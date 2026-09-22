import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type FriendshipPhoto = Database['public']['Tables']['friendship_photos']['Row'];

const BUCKET = 'friendship-photos';

function extensionFor(mimeType: string | undefined | null): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/heic') return 'heic';
  return 'jpg';
}

export async function pickAndUploadPhoto(
  friendshipId: string,
  uploadedBy: string,
): Promise<FriendshipPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const ext = extensionFor(asset.mimeType);
  const path = `${friendshipId}/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;

  const response = await fetch(asset.uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType: asset.mimeType ?? 'image/jpeg' });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('friendship_photos')
    .insert({ friendship_id: friendshipId, uploaded_by: uploadedBy, storage_path: path })
    .select('*')
    .single();
  if (error) throw error;

  return data;
}

export async function getPhotoUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

export async function deletePhoto(photo: FriendshipPhoto): Promise<void> {
  await supabase.storage.from(BUCKET).remove([photo.storage_path]);
  await supabase.from('friendship_photos').delete().eq('id', photo.id);
}
