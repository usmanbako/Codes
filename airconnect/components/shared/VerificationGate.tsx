import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';

export default function VerificationGate({ feature }: { feature: string }) {
  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
      <Text className="text-6xl mb-4">🛂</Text>
      <Text className="text-2xl font-bold text-text-primary mb-2 text-center">
        Verification Required
      </Text>
      <Text className="text-text-secondary text-center mb-8">
        You need to be a verified airline employee to access {feature}.
        This keeps AirConnect safe and trusted for all crew.
      </Text>
      <TouchableOpacity
        className="bg-primary rounded-2xl py-4 px-8 w-full items-center"
        onPress={() => router.push('/(auth)/verify')}
      >
        <Text className="text-white font-bold text-base">Verify My Employment</Text>
      </TouchableOpacity>
      <TouchableOpacity className="mt-4" onPress={() => router.back()}>
        <Text className="text-text-muted">Go Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
