import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { CheckIn } from '@/lib/database.types';

interface CityGroup {
  city: string;
  country: string;
  country_code: string;
  count: number;
  checkins: CheckIn[];
}

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [cities, setCities] = useState<CityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('list');

  async function fetchActiveCities() {
    const { data, error } = await supabase
      .from('check_ins')
      .select('*, user:users(*)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Group by city
      const grouped = data.reduce<Record<string, CityGroup>>((acc, ci) => {
        const key = `${ci.city}-${ci.country_code}`;
        if (!acc[key]) {
          acc[key] = {
            city: ci.city,
            country: ci.country,
            country_code: ci.country_code,
            count: 0,
            checkins: [],
          };
        }
        acc[key].count++;
        acc[key].checkins.push(ci as CheckIn);
        return acc;
      }, {});
      setCities(Object.values(grouped).sort((a, b) => b.count - a.count));
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchActiveCities();
  }, []);

  const filtered = cities.filter(
    (c) =>
      !query ||
      c.city.toLowerCase().includes(query.toLowerCase()) ||
      c.country.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="bg-white px-4 pt-2 pb-3 border-b border-border">
        <Text className="text-2xl font-bold text-text-primary mb-3">Explore</Text>
        <View className="flex-row items-center bg-background border border-border rounded-xl px-3 py-2.5">
          <Text className="text-text-muted mr-2">🔍</Text>
          <TextInput
            className="flex-1 text-base text-text-primary"
            placeholder="Search cities or countries..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <View className="flex-row mt-3 gap-x-2">
          {(['list', 'map'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              className={`flex-1 py-2 rounded-xl items-center ${activeTab === tab ? 'bg-primary' : 'bg-background border border-border'}`}
              onPress={() => setActiveTab(tab)}
            >
              <Text className={`font-semibold capitalize ${activeTab === tab ? 'text-white' : 'text-text-secondary'}`}>
                {tab === 'list' ? '📋 Cities' : '🗺️ Map'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0A84FF" size="large" />
        </View>
      ) : activeTab === 'map' ? (
        <View className="flex-1 items-center justify-center bg-primary/5">
          <Text className="text-6xl mb-4">🗺️</Text>
          <Text className="text-text-primary font-semibold text-lg">Interactive Map</Text>
          <Text className="text-text-muted text-sm mt-2 text-center px-8">
            Map integration with Mapbox coming soon.{'\n'}
            Use the Cities list view to explore now.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.city}-${item.country_code}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="bg-white mx-4 my-1.5 rounded-2xl p-4 flex-row items-center shadow-sm border border-border/50"
              onPress={() => router.push(`/destination/${encodeURIComponent(item.city)}`)}
            >
              <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center mr-3">
                <Text className="text-2xl">
                  {getFlagEmoji(item.country_code)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-text-primary font-semibold text-base">{item.city}</Text>
                <Text className="text-text-muted text-sm">{item.country}</Text>
              </View>
              <View className="items-end">
                <View className="bg-crew/10 rounded-full px-2.5 py-1">
                  <Text className="text-crew font-bold text-sm">{item.count}</Text>
                </View>
                <Text className="text-text-muted text-xs mt-1">crew here</Text>
              </View>
            </TouchableOpacity>
          )}
          ListHeaderComponent={
            <View className="px-4 pt-4 pb-2">
              <Text className="text-text-secondary text-sm">
                {filtered.length} {filtered.length === 1 ? 'city' : 'cities'} with active crew
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Text className="text-4xl mb-3">🌍</Text>
              <Text className="text-text-primary font-semibold text-lg">No crew out there yet</Text>
              <Text className="text-text-muted text-sm mt-1">Check in to put yourself on the map!</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-4"
        />
      )}
    </SafeAreaView>
  );
}

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
