import '../global.css';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function RootLayoutNav() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (session) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(auth)/welcome');
    }
  }, [session, loading]);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="destination/[id]"
          options={{ headerShown: true, headerTitle: '', headerTransparent: true }}
        />
        <Stack.Screen
          name="user/[id]"
          options={{ headerShown: true, headerTitle: '', headerTransparent: true }}
        />
        <Stack.Screen
          name="post/[id]"
          options={{ headerShown: true, headerTitle: 'Post', presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
