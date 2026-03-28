import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Post, CheckIn } from '@/lib/database.types';
import PostCard from '@/components/feed/PostCard';
import CrewNearYouCarousel from '@/components/feed/CrewNearYouCarousel';
import VerificationBanner from '@/components/shared/VerificationBanner';

type FeedFilter = 'following' | 'nearby' | 'trending';

export default function HomeScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [nearbyCrews, setNearbyCrews] = useState<CheckIn[]>([]);
  const [filter, setFilter] = useState<FeedFilter>('trending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('*, user:users(*)')
      .order('created_at', { ascending: false })
      .limit(30);

    if (!error && data) {
      setPosts(data as Post[]);
    }
  }

  async function fetchNearbyCrews() {
    const { data, error } = await supabase
      .from('check_ins')
      .select('*, user:users(*)')
      .gt('expires_at', new Date().toISOString())
      .eq('available_to_meet', true)
      .limit(10);

    if (!error && data) {
      setNearbyCrews(data as CheckIn[]);
    }
  }

  async function loadData() {
    await Promise.all([fetchPosts(), fetchNearbyCrews()]);
    setLoading(false);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [filter]);

  const filters: { key: FeedFilter; label: string }[] = [
    { key: 'trending', label: 'Trending' },
    { key: 'following', label: 'Following' },
    { key: 'nearby', label: 'Nearby' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3 bg-white border-b border-border">
        <Text className="text-2xl font-bold text-primary">✈️ AirConnect</Text>
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center"
          onPress={() => router.push('/post/new')}
        >
          <Text className="text-primary font-bold text-xl">+</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0A84FF" size="large" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostCard post={item} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0A84FF" />
          }
          ListHeaderComponent={
            <>
              {/* Verification banner */}
              {user?.verification_status !== 'verified' && <VerificationBanner status={user?.verification_status} />}

              {/* Crew Near You */}
              {nearbyCrews.length > 0 && (
                <CrewNearYouCarousel crews={nearbyCrews} />
              )}

              {/* Filter tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="px-4 py-3"
                contentContainerClassName="gap-x-2"
              >
                {filters.map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    className={`px-4 py-2 rounded-full ${filter === f.key ? 'bg-primary' : 'bg-white border border-border'}`}
                    onPress={() => setFilter(f.key)}
                  >
                    <Text
                      className={`font-semibold text-sm ${filter === f.key ? 'text-white' : 'text-text-secondary'}`}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Text className="text-4xl mb-3">✈️</Text>
              <Text className="text-text-primary font-semibold text-lg">No posts yet</Text>
              <Text className="text-text-muted text-sm mt-1 text-center px-8">
                Be the first to share a layover tip or travel photo!
              </Text>
            </View>
          }
          contentContainerClassName="pb-4"
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
