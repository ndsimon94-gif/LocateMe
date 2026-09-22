import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { LoadingScreen } from '@/components/loading-screen';
import { LocationBadge } from '@/components/location-badge';
import { PhotoGallery } from '@/components/photo-gallery';
import { TagChip } from '@/components/tag-chip';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFriendDetail } from '@/hooks/use-friend-detail';
import { useFriendshipPhotos } from '@/hooks/use-friendship-photos';
import { useFriendsWithLocation } from '@/hooks/use-friends-with-location';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export default function FriendDetailScreen() {
  const { friendshipId } = useLocalSearchParams<{ friendshipId: string }>();
  const theme = useTheme();
  const { friends, isLoading: friendsLoading } = useFriendsWithLocation();
  const {
    note,
    tags,
    metPlace,
    metStory,
    isLoading: detailLoading,
    saveNote,
    saveStory,
    addTag,
    removeTag,
  } = useFriendDetail(friendshipId);
  const {
    photos,
    isLoading: photosLoading,
    isUploading,
    addPhoto,
    removePhoto,
    myUserId,
  } = useFriendshipPhotos(friendshipId);

  const friend = friends.find((item) => item.friendship_id === friendshipId);
  const [draftNote, setDraftNote] = useState('');
  const [draftPlace, setDraftPlace] = useState('');
  const [draftStory, setDraftStory] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    // Seeds the editable drafts once each finishes its async load; this
    // isn't derived state, it's a one-time sync from a data source outside
    // React into locally-owned editable text.
    setDraftNote(note);
  }, [note]);

  useEffect(() => {
    setDraftPlace(metPlace);
  }, [metPlace]);

  useEffect(() => {
    setDraftStory(metStory);
  }, [metStory]);

  if (friendsLoading || detailLoading) return <LoadingScreen />;
  if (!friend) return null;

  const name = friend.display_name ?? friend.username ?? 'Unknown';

  function handleAddTag() {
    if (!newTag.trim()) return;
    addTag(newTag);
    setNewTag('');
  }

  function handleStoryBlur() {
    if (draftPlace !== metPlace || draftStory !== metStory) {
      saveStory(draftPlace, draftStory);
    }
  }

  function handleOpenWhatsapp() {
    const digits = friend!.whatsapp_number?.replace(/[^\d+]/g, '');
    if (!digits) return;
    Linking.openURL(`https://wa.me/${digits.replace(/^\+/, '')}`);
  }

  function handleOpenSocial() {
    const handle = friend!.social_handle?.trim();
    if (handle && /^https?:\/\//i.test(handle)) Linking.openURL(handle);
  }

  function handleUnfriend() {
    Alert.alert(`Unfriend ${name}?`, "You'll stop seeing each other's location, and lose this chat. This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unfriend',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('friendships').delete().eq('id', friendshipId);
          router.replace('/(app)');
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.profile}>
            <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText style={[styles.avatarLabel, { color: theme.accent }]}>
                {name.slice(0, 2).toUpperCase()}
              </ThemedText>
            </View>
            <ThemedText type="subtitle">{name}</ThemedText>
            <LocationBadge
              sharingLevel={friend.sharing_level}
              countryName={friend.country_name}
              cityName={friend.city_name}
            />
            <Button label="Message" onPress={() => router.push(`/(app)/chat/${friendshipId}`)} />
          </View>

          {(friend.whatsapp_number || friend.social_handle || friend.contact_message) && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionLabel}>Reach out</ThemedText>
              {friend.whatsapp_number && (
                <View style={styles.contactRow}>
                  <View style={styles.contactBody}>
                    <ThemedText themeColor="textSecondary" style={styles.contactLabel}>
                      WhatsApp
                    </ThemedText>
                    <ThemedText>{friend.whatsapp_number}</ThemedText>
                  </View>
                  <Button label="Open" variant="outline" onPress={handleOpenWhatsapp} />
                </View>
              )}
              {friend.social_handle && (
                <View style={styles.contactRow}>
                  <View style={styles.contactBody}>
                    <ThemedText themeColor="textSecondary" style={styles.contactLabel}>
                      Social media
                    </ThemedText>
                    <ThemedText>{friend.social_handle}</ThemedText>
                  </View>
                  {/^https?:\/\//i.test(friend.social_handle) && (
                    <Button label="Open" variant="outline" onPress={handleOpenSocial} />
                  )}
                </View>
              )}
              {friend.contact_message && (
                <View>
                  <ThemedText themeColor="textSecondary" style={styles.contactLabel}>
                    Message
                  </ThemedText>
                  <ThemedText>{friend.contact_message}</ThemedText>
                </View>
              )}
            </View>
          )}

          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>Our story</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.sectionHint}>
              Visible to both of you.
            </ThemedText>
            <TextField
              value={draftPlace}
              onChangeText={setDraftPlace}
              onBlur={handleStoryBlur}
              placeholder="Where you met — a hostel, a bar, a trail"
            />
            <TextField
              value={draftStory}
              onChangeText={setDraftStory}
              onBlur={handleStoryBlur}
              placeholder="How you met"
              multiline
              style={styles.noteInput}
            />
            <PhotoGallery
              photos={photos}
              isUploading={isUploading || photosLoading}
              myUserId={myUserId}
              onAdd={addPhoto}
              onRemove={removePhoto}
            />
            {photos.length > 0 && (
              <ThemedText themeColor="textSecondary" style={styles.sectionHint}>
                Long-press a photo to remove one you added.
              </ThemedText>
            )}
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>Notes</ThemedText>
            <TextField
              value={draftNote}
              onChangeText={setDraftNote}
              onBlur={() => draftNote !== note && saveNote(draftNote)}
              placeholder="Add a note only you can see."
              multiline
              style={styles.noteInput}
            />
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>Tags</ThemedText>
            <View style={styles.tagRow}>
              {tags.map((tag) => (
                <TagChip key={tag.id} label={tag.name} onPress={() => removeTag(tag.id)} />
              ))}
            </View>
            <View style={styles.addTagRow}>
              <View style={styles.addTagField}>
                <TextField
                  value={newTag}
                  onChangeText={setNewTag}
                  placeholder="New tag"
                  onSubmitEditing={handleAddTag}
                  returnKeyType="done"
                />
              </View>
              <Button label="Add" variant="outline" onPress={handleAddTag} />
            </View>
          </View>

          <Button
            label="Sharing settings"
            variant="outline"
            onPress={() => router.push(`/(app)/friend/${friendshipId}/sharing`)}
          />

          <Button label="Unfriend" variant="danger" onPress={handleUnfriend} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  profile: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 20,
    fontWeight: '700',
  },
  section: {
    gap: Spacing.two,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHint: {
    fontSize: 12,
    marginTop: -Spacing.one,
  },
  noteInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  addTagRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  addTagField: {
    flex: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  contactBody: {
    flex: 1,
    gap: 2,
  },
  contactLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
