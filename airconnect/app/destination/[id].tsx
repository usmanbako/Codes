import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Tip, CheckIn } from '@/lib/database.types';
import { TIP_CATEGORIES } from '@/constants';

type TipCategory = typeof TIP_CATEGORIES[number]['value'];

export default function DestinationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const city = decodeURIComponent(id ?? '');
  const [tips, setTips] = useState<Tip[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [activeCategory, setActiveCategory] = useState<TipCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [tipsRes, checkinsRes] = await Promise.all([
        supabase
          .from('tips')
          .select('*, user:users(*)')
          .eq('city', city)
          .order('upvotes', { ascending: false }),
        supabase
          .from('check_ins')
          .select('*, user:users(*)')
          .eq('city', city)
          .gt('expires_at', new Date().toISOString()),
      ]);
      if (tipsRes.data) setTips(tipsRes.data as Tip[]);
      if (checkinsRes.data) setCheckins(checkinsRes.data as CheckIn[]);
      setLoading(false);
    }
    load();
  }, [city]);

  const filtered = activeCategory === 'all'
    ? tips
    : tips.filter((t) => t.category === activeCategory);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Hero */}
      <View className="h-48 bg-primary items-center justify-center">
        <Text className="text-white text-4xl font-bold">{city}</Text>
        <Text className="text-white/80 mt-1">
          {checkins.length > 0 ? `${checkins.length} crew here now` : 'Destination Guide'}
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0A84FF" size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Active crew */}
          {checkins.length > 0 && (
            <View className="bg-white mx-4 mt-4 rounded-2xl p-4 border border-border">
              <Text className="font-bold text-text-primary mb-3">
                ✈️ Crew Here Now ({checkins.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-x-3">
                {checkins.map((ci) => (
                  <TouchableOpacity
                    key={ci.id}
                    className="items-center mr-3 w-16"
                    onPress={() => router.push(`/user/${ci.user_id}`)}
                  >
                    <View className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary overflow-hidden mb-1">
                      {ci.user?.avatar_url ? (
                        <Image source={{ uri: ci.user.avatar_url }} className="w-full h-full" />
                      ) : (
                        <View className="flex-1 items-center justify-center">
                          <Text className="text-xl">👤</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-text-primary text-center" numberOfLines={1}>
                      {ci.user?.display_name?.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Category filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="px-4 gap-x-2 py-3"
          >
            <TouchableOpacity
              className={`px-3 py-2 rounded-xl border ${activeCategory === 'all' ? 'bg-primary border-primary' : 'bg-white border-border'}`}
              onPress={() => setActiveCategory('all')}
            >
              <Text className={`font-semibold text-sm ${activeCategory === 'all' ? 'text-white' : 'text-text-secondary'}`}>
                All ({tips.length})
              </Text>
            </TouchableOpacity>
            {TIP_CATEGORIES.map((cat) => {
              const count = tips.filter((t) => t.category === cat.value).length;
              if (count === 0) return null;
              return (
                <TouchableOpacity
                  key={cat.value}
                  className={`px-3 py-2 rounded-xl border flex-row items-center gap-x-1 ${activeCategory === cat.value ? 'bg-primary border-primary' : 'bg-white border-border'}`}
                  onPress={() => setActiveCategory(cat.value as TipCategory)}
                >
                  <Text className="text-sm">{cat.emoji}</Text>
                  <Text className={`font-semibold text-sm ${activeCategory === cat.value ? 'text-white' : 'text-text-secondary'}`}>
                    {cat.label} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Tips */}
          <View className="px-4 gap-y-3 pb-8">
            {filtered.length === 0 ? (
              <View className="items-center py-12">
                <Text className="text-4xl mb-3">📝</Text>
                <Text className="text-text-primary font-semibold">No tips yet</Text>
                <Text className="text-text-muted text-sm mt-1">Be the first to add a tip for {city}!</Text>
              </View>
            ) : (
              filtered.map((tip) => <TipCard key={tip.id} tip={tip} />)
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function TipCard({ tip }: { tip: Tip }) {
  const [votes, setVotes] = useState(tip.upvotes);
  const cat = TIP_CATEGORIES.find((c) => c.value === tip.category);

  return (
    <View className="bg-white rounded-2xl p-4 border border-border">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-row items-center gap-x-2 flex-1">
          {cat && (
            <View className="bg-primary/10 rounded-lg px-2 py-1 flex-row items-center gap-x-1">
              <Text className="text-xs">{cat.emoji}</Text>
              <Text className="text-primary text-xs font-semibold">{cat.label}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          className="flex-row items-center gap-x-1 bg-crew/10 rounded-lg px-2 py-1"
          onPress={() => setVotes((v) => v + 1)}
        >
          <Text className="text-xs">👍</Text>
          <Text className="text-crew font-bold text-sm">{votes}</Text>
        </TouchableOpacity>
      </View>
      <Text className="text-text-primary font-semibold text-base mb-1">{tip.title}</Text>
      <Text className="text-text-secondary text-sm leading-5">{tip.body}</Text>
      {tip.user && (
        <View className="flex-row items-center mt-3">
          <Text className="text-text-muted text-xs">
            by {tip.user.display_name}
            {tip.user.airline ? ` · ${tip.user.airline}` : ''}
            {' · '}
            {formatDate(tip.created_at)}
          </Text>
        </View>
      )}
    </View>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
