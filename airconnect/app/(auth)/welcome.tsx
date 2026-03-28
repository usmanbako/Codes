import { View, Text, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function WelcomeScreen() {
  return (
    <View className="flex-1 bg-primary">
      <StatusBar style="light" />
      <SafeAreaView className="flex-1">
        <View className="flex-1 justify-between px-8 pb-12 pt-16">
          {/* Logo / Hero */}
          <View className="items-center mt-8">
            <View className="w-24 h-24 rounded-3xl bg-white/20 items-center justify-center mb-6">
              <Text className="text-5xl">✈️</Text>
            </View>
            <Text className="text-white text-4xl font-bold tracking-tight">AirConnect</Text>
            <Text className="text-white/80 text-lg mt-2 text-center">
              The social network for airline crew
            </Text>
          </View>

          {/* Feature bullets */}
          <View className="gap-y-4">
            <FeatureRow emoji="🌍" text="See who's checked in near you" />
            <FeatureRow emoji="💬" text="Connect with verified crew members" />
            <FeatureRow emoji="🗺️" text="Crowd-sourced city guides for layovers" />
            <FeatureRow emoji="🏅" text="Earn badges for every new country" />
          </View>

          {/* CTAs */}
          <View className="gap-y-3">
            <TouchableOpacity
              className="bg-white rounded-2xl py-4 items-center"
              onPress={() => router.push('/(auth)/sign-up')}
            >
              <Text className="text-primary font-bold text-base">Create Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="border border-white/40 rounded-2xl py-4 items-center"
              onPress={() => router.push('/(auth)/sign-in')}
            >
              <Text className="text-white font-semibold text-base">Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function FeatureRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View className="flex-row items-center gap-x-3">
      <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
        <Text className="text-xl">{emoji}</Text>
      </View>
      <Text className="text-white text-base flex-1">{text}</Text>
    </View>
  );
}
