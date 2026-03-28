import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { User, Badge } from '@/lib/database.types';
import { BADGE_DEFINITIONS } from '@/constants';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    async function load() {
      const [userRes, badgesRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', id).single(),
        supabase.from('badges').select('*').eq('user_id', id),
      ]);
      if (userRes.data) setProfile(userRes.data as User);
      if (badgesRes.data) setBadges(badgesRes.data as Badge[]);
      setLoading(false);
    }
    load();
  }, [id]);

  async function sendWave() {
    if (!currentUser || !profile) return;
    if (currentUser.verification_status !== 'verified') {
      Alert.alert('Verification Required', 'You need to be verified to send waves.');
      return;
    }

    // Create or fetch DM conversation
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .contains('participant_ids', [currentUser.id, profile.id])
      .eq('type', 'dm')
      .maybeSingle();

    if (existing) {
      router.push(`/conversation/${existing.id}` as any);
      return;
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        type: 'dm',
        participant_ids: [currentUser.id, profile.id],
      })
      .select()
      .single();

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    // Send wave message
    await supabase.from('messages').insert({
      conversation_id: data.id,
      sender_id: currentUser.id,
      content: `👋 ${currentUser.display_name} waved at you!`,
      message_type: 'text',
    });

    router.push(`/conversation/${data.id}` as any);
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#0A84FF" size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-text-muted">User not found</Text>
      </View>
    );
  }

  const countryBadges = badges.filter((b) => b.badge_type === 'country');
  const achievementBadges = badges.filter((b) => b.badge_type !== 'country');

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover */}
        <View className="h-40 bg-primary">
          {profile.cover_url && (
            <Image source={{ uri: profile.cover_url }} className="w-full h-full" resizeMode="cover" />
          )}
        </View>

        {/* Avatar */}
        <View className="px-4 -mt-10 flex-row justify-between items-end mb-4">
          <View className="w-20 h-20 rounded-full border-4 border-white bg-white overflow-hidden shadow">
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} className="w-full h-full" />
            ) : (
              <View className="flex-1 bg-primary/20 items-center justify-center">
                <Text className="text-3xl">👤</Text>
              </View>
            )}
          </View>
          {!isOwnProfile && (
            <TouchableOpacity
              className="bg-primary rounded-xl px-5 py-2.5 mb-1"
              onPress={sendWave}
            >
              <Text className="text-white font-bold">👋 Wave</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info */}
        <View className="px-4 mb-4">
          <View className="flex-row items-center gap-x-2 mb-1">
            <Text className="text-2xl font-bold text-text-primary">{profile.display_name}</Text>
            {profile.verification_status === 'verified' && (
              <View className="bg-crew/20 rounded-full px-2 py-0.5">
                <Text className="text-crew text-xs font-bold">✓ Crew</Text>
              </View>
            )}
          </View>
          {profile.airline && (
            <Text className="text-text-secondary text-sm">
              ✈️ {profile.position} · {profile.airline}
              {profile.base_airport ? ` · ${profile.base_airport}` : ''}
            </Text>
          )}
          {profile.bio && <Text className="text-text-primary mt-2">{profile.bio}</Text>}

          <View className="flex-row mt-4 gap-x-6">
            <View className="items-center">
              <Text className="text-xl font-bold text-text-primary">{profile.countries_visited}</Text>
              <Text className="text-text-muted text-sm">Countries</Text>
            </View>
            <View className="items-center">
              <Text className="text-xl font-bold text-text-primary">{badges.length}</Text>
              <Text className="text-text-muted text-sm">Badges</Text>
            </View>
          </View>
        </View>

        {/* Achievements */}
        {achievementBadges.length > 0 && (
          <View className="px-4 mb-4">
            <Text className="text-base font-bold text-text-primary mb-3">🏅 Achievements</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {achievementBadges.map((badge) => {
                const def = BADGE_DEFINITIONS[badge.badge_type as keyof typeof BADGE_DEFINITIONS];
                return (
                  <View key={badge.id} className="bg-white rounded-2xl p-3 items-center border border-border mr-3 w-24">
                    <Text className="text-3xl mb-1">{def?.emoji ?? '🏅'}</Text>
                    <Text className="text-text-primary text-xs font-semibold text-center">
                      {def?.name ?? badge.badge_name}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Country badges */}
        {countryBadges.length > 0 && (
          <View className="px-4 mb-8">
            <Text className="text-base font-bold text-text-primary mb-2">
              🌍 Countries ({countryBadges.length})
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {countryBadges.map((b) => (
                <View key={b.id} className="bg-white rounded-xl px-3 py-2 border border-border flex-row items-center gap-x-1">
                  <Text>{b.metadata?.country_code ? getFlagEmoji(b.metadata.country_code) : '🌍'}</Text>
                  <Text className="text-text-primary text-sm">{b.badge_name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return '🌍';
  return String.fromCodePoint(...code.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0)));
}
