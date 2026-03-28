import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '@/constants';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View className="items-center justify-center">
      <Text className="text-xl">{emoji}</Text>
      <Text
        className={`text-xs mt-0.5 ${focused ? 'text-primary font-semibold' : 'text-text-muted'}`}
      >
        {label}
      </Text>
    </View>
  );
}

function CheckInTabIcon({ focused }: { focused: boolean }) {
  return (
    <View
      className={`w-14 h-14 rounded-2xl items-center justify-center -mt-4 shadow-lg ${focused ? 'bg-primary-dark' : 'bg-primary'}`}
    >
      <Text className="text-2xl">📍</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
          paddingTop: 4,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🌍" label="Explore" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          tabBarIcon: ({ focused }) => <CheckInTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="💬" label="Chat" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
