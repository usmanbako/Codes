import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { VerificationStatus } from '@/lib/database.types';

export default function VerificationBanner({ status }: { status?: VerificationStatus }) {
  if (status === 'verified') return null;

  if (status === 'pending') {
    return (
      <View className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex-row items-center">
        <Text className="text-xl mr-2">⏳</Text>
        <View className="flex-1">
          <Text className="text-amber-800 font-semibold text-sm">Verification under review</Text>
          <Text className="text-amber-700 text-xs">Usually 24-48 hours. Limited access until verified.</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      className="mx-4 mt-3 bg-primary/10 border border-primary/20 rounded-2xl p-3 flex-row items-center"
      onPress={() => router.push('/(auth)/verify')}
    >
      <Text className="text-xl mr-2">🛂</Text>
      <View className="flex-1">
        <Text className="text-primary font-semibold text-sm">Verify your airline employment</Text>
        <Text className="text-primary/70 text-xs">Unlock messaging, check-ins, and crew finder</Text>
      </View>
      <Text className="text-primary font-bold">→</Text>
    </TouchableOpacity>
  );
}
