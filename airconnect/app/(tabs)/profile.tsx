import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Badge, Post } from '@/lib/database.types';
import { BADGE_DEFINITIONS, COLORS } from '@/constants';

export default function ProfileScreen() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [badgesRes, postsRes] = await Promise.all([
        supabase.from('badges').select('*').eq('user_id', user!.id),
        supabase.from('posts').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(9),
      ]);
      if (badgesRes.data) setBadges(badgesRes.data as Badge[]);
      if (postsRes.data) setPosts(postsRes.data as Post[]);
      setLoading(false);
    }
    load();
  }, [user]);

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  if (authLoading || !user) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#0A84FF" size="large" />
      </View>
    );
  }

  const verificationColor = {
    verified: COLORS.verified,
    pending: COLORS.pending,
    rejected: COLORS.rejected,
  }[user.verification_status];

  const countryBadges = badges.filter((b) => b.badge_type === 'country');
  const achievementBadges = badges.filter((b) => b.badge_type !== 'country');

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover */}
        <View className="h-40 bg-primary">
          {user.cover_url && (
            <Image source={{ uri: user.cover_url }} className="w-full h-full" resizeMode="cover" />
          )}
        </View>

        {/* Avatar + actions */}
        <View className="px-4 -mt-10 flex-row justify-between items-end mb-4">
          <View className="w-20 h-20 rounded-full border-4 border-white bg-white overflow-hidden shadow">
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} className="w-full h-full" />
            ) : (
              <View className="flex-1 bg-primary/20 items-center justify-center">
                <Text className="text-3xl">👤</Text>
              </View>
            )}
          </View>
          <View className="flex-row gap-x-2 mb-1">
            <TouchableOpacity
              className="border border-border rounded-xl px-4 py-2"
              onPress={() => router.push('/edit-profile' as any)}
            >
              <Text className="text-text-primary font-semibold text-sm">Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="border border-border rounded-xl px-3 py-2"
              onPress={handleSignOut}
            >
              <Text className="text-text-secondary text-sm">Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* User info */}
        <View className="px-4 mb-4">
          <View className="flex-row items-center gap-x-2 mb-1">
            <Text className="text-2xl font-bold text-text-primary">{user.display_name}</Text>
            <View
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: verificationColor + '20' }}
            >
              <Text className="text-xs font-semibold capitalize" style={{ color: verificationColor }}>
                {user.verification_status === 'verified' ? '✓ Verified' : user.verification_status}
              </Text>
            </View>
          </View>

          {user.airline && (
            <Text className="text-text-secondary text-sm">
              ✈️ {user.position} · {user.airline}
              {user.base_airport ? ` · Based ${user.base_airport}` : ''}
            </Text>
          )}

          {user.bio && (
            <Text className="text-text-primary mt-2">{user.bio}</Text>
          )}

          {/* Stats */}
          <View className="flex-row mt-4 gap-x-6">
            <StatItem value={user.countries_visited} label="Countries" />
            <StatItem value={posts.length} label="Posts" />
            <StatItem value={countryBadges.length} label="Badges" />
          </View>
        </View>

        {/* Verification prompt */}
        {user.verification_status === 'pending' && (
          <TouchableOpacity
            className="mx-4 mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row items-center"
            onPress={() => router.push('/(auth)/verify')}
          >
            <Text className="text-2xl mr-3">⏳</Text>
            <View className="flex-1">
              <Text className="text-amber-800 font-semibold">Verification Pending</Text>
              <Text className="text-amber-700 text-sm">Tap to complete or check status</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Achievement badges */}
        {achievementBadges.length > 0 && (
          <View className="px-4 mb-4">
            <Text className="text-base font-bold text-text-primary mb-3">🏅 Achievements</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-x-3">
              {achievementBadges.map((badge) => {
                const def = BADGE_DEFINITIONS[badge.badge_type as keyof typeof BADGE_DEFINITIONS];
                return (
                  <View
                    key={badge.id}
                    className="bg-white rounded-2xl p-3 items-center border border-border mr-3 w-24"
                  >
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
          <View className="px-4 mb-4">
            <Text className="text-base font-bold text-text-primary mb-1">
              🌍 Countries Visited ({countryBadges.length})
            </Text>
            <View className="flex-row flex-wrap gap-2 mt-2">
              {countryBadges.map((badge) => (
                <View
                  key={badge.id}
                  className="bg-white rounded-xl px-3 py-2 border border-border flex-row items-center gap-x-1"
                >
                  <Text>{badge.metadata?.country_code ? getFlagEmoji(badge.metadata.country_code) : '🌍'}</Text>
                  <Text className="text-text-primary text-sm">{badge.badge_name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent posts grid */}
        {posts.length > 0 && (
          <View className="px-4 mb-8">
            <Text className="text-base font-bold text-text-primary mb-3">📸 Posts</Text>
            <View className="flex-row flex-wrap gap-1">
              {posts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  className="w-[31%] aspect-square bg-primary/10 rounded-xl overflow-hidden"
                  onPress={() => router.push(`/post/${post.id}`)}
                >
                  {post.media_urls?.[0] ? (
                    <Image
                      source={{ uri: post.media_urls[0] }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Text className="text-2xl">✈️</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <View className="items-center">
      <Text className="text-text-primary font-bold text-xl">{value}</Text>
      <Text className="text-text-muted text-sm">{label}</Text>
    </View>
  );
}

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
