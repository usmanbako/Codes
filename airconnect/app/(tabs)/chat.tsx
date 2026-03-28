import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Conversation } from '@/lib/database.types';
import VerificationGate from '@/components/shared/VerificationGate';

export default function ChatScreen() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchConversations() {
    if (!user) return;
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        last_message:messages(content, created_at, sender_id)
      `)
      .contains('participant_ids', [user.id])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setConversations(data as Conversation[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchConversations();

    // Realtime subscription
    const channel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        fetchConversations
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (user?.verification_status !== 'verified') {
    return <VerificationGate feature="messaging" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="bg-white px-4 pt-2 pb-3 border-b border-border">
        <Text className="text-2xl font-bold text-text-primary">Messages</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0A84FF" size="large" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ConversationRow conversation={item} currentUserId={user.id} />}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Text className="text-4xl mb-3">💬</Text>
              <Text className="text-text-primary font-semibold text-lg">No messages yet</Text>
              <Text className="text-text-muted text-sm mt-1 text-center px-8">
                Wave at crew members you meet to start a conversation!
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function ConversationRow({
  conversation,
  currentUserId,
}: {
  conversation: Conversation;
  currentUserId: string;
}) {
  const otherUser = conversation.other_user;
  const lastMsg = conversation.last_message;

  return (
    <TouchableOpacity
      className="flex-row items-center px-4 py-3 bg-white border-b border-border/50"
      onPress={() => router.push(`/conversation/${conversation.id}` as any)}
    >
      <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center mr-3 overflow-hidden">
        {otherUser?.avatar_url ? (
          <Image source={{ uri: otherUser.avatar_url }} className="w-12 h-12" />
        ) : (
          <Text className="text-xl">👤</Text>
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row justify-between items-center">
          <Text className="text-text-primary font-semibold">
            {conversation.type === 'city_chat'
              ? `${conversation.city} City Chat`
              : otherUser?.display_name ?? 'Crew Member'}
          </Text>
          {lastMsg && (
            <Text className="text-text-muted text-xs">
              {formatTime(lastMsg.created_at)}
            </Text>
          )}
        </View>
        <Text className="text-text-muted text-sm mt-0.5" numberOfLines={1}>
          {lastMsg?.content ?? 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return date.toLocaleDateString();
}
