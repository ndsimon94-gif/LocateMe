import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PhotoWithUrl } from '@/hooks/use-friendship-photos';

type PhotoGalleryProps = {
  photos: PhotoWithUrl[];
  isUploading: boolean;
  myUserId: string | undefined;
  onAdd: () => void;
  onRemove: (photo: PhotoWithUrl) => void;
};

const THUMB_SIZE = 84;

export function PhotoGallery({ photos, isUploading, myUserId, onAdd, onRemove }: PhotoGalleryProps) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {photos.map((photo) => (
        <Pressable
          key={photo.id}
          onLongPress={() => photo.uploaded_by === myUserId && onRemove(photo)}
          style={styles.thumbWrap}>
          {photo.url ? (
            <Image source={{ uri: photo.url }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]} />
          )}
        </Pressable>
      ))}
      <Pressable
        onPress={onAdd}
        disabled={isUploading}
        style={[styles.addTile, { borderColor: theme.line }]}>
        {isUploading ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <Text style={[styles.addLabel, { color: theme.accent }]}>+</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  thumbWrap: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  addTile: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    fontSize: 24,
    fontWeight: '700',
  },
});
