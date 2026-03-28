import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { CheckIn } from '@/lib/database.types';

export default function CrewNearYouCarousel({ crews }: { crews: CheckIn[] }) {
  return (
    <View className="bg-white pt-3 pb-1 border-b border-border">
      <Text className="text-text-primary font-bold px-4 mb-2">
        ✈️ Crew Near You ({crews.length})
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 gap-x-3 pb-2"
      >
        {crews.map((checkin) => (
          <TouchableOpacity
            key={checkin.id}
            className="items-center w-20"
            onPress={() => router.push(`/user/${checkin.user_id}`)}
          >
            <View className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary overflow-hidden mb-1">
              {checkin.user?.avatar_url ? (
                <Image source={{ uri: checkin.user.avatar_url }} className="w-full h-full" />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-2xl">👤</Text>
                </View>
              )}
            </View>
            <Text className="text-text-primary text-xs font-semibold text-center" numberOfLines={1}>
              {checkin.user?.display_name?.split(' ')[0] ?? 'Crew'}
            </Text>
            <Text className="text-text-muted text-xs text-center" numberOfLines={1}>
              {checkin.city}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
