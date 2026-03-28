import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Post } from '@/lib/database.types';

const POST_TYPE_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  tip: { emoji: '💡', label: 'Tip', color: '#F59E0B' },
  route: { emoji: '✈️', label: 'Route', color: '#0A84FF' },
  broadcast: { emoji: '📢', label: 'Who\'s Here?', color: '#00C9A7' },
  standard: { emoji: '📸', label: 'Post', color: '#6B7280' },
};

export default function PostCard({ post }: { post: Post }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.liked_by_me ?? false);
  const [likeCount, setLikeCount] = useState(post.like_count);

  const typeInfo = POST_TYPE_LABELS[post.post_type] ?? POST_TYPE_LABELS.standard;

  async function handleLike() {
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => c + (newLiked ? 1 : -1));
    await supabase.from('posts').update({ like_count: likeCount + (newLiked ? 1 : -1) }).eq('id', post.id);
  }

  return (
    <View className="bg-white border-b border-border">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity
          onPress={() => router.push(`/user/${post.user_id}`)}
          className="flex-row items-center flex-1"
        >
          <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-2.5 overflow-hidden">
            {post.user?.avatar_url ? (
              <Image source={{ uri: post.user.avatar_url }} className="w-10 h-10" />
            ) : (
              <Text className="text-lg">👤</Text>
            )}
          </View>
          <View>
            <View className="flex-row items-center gap-x-1.5">
              <Text className="text-text-primary font-semibold text-sm">
                {post.user?.display_name ?? 'Crew Member'}
              </Text>
              {post.user?.verification_status === 'verified' && (
                <View className="bg-crew/20 rounded-full px-1.5 py-0.5">
                  <Text className="text-crew text-xs font-bold">✓</Text>
                </View>
              )}
            </View>
            <Text className="text-text-muted text-xs">
              📍 {post.city}, {post.country} · {formatTime(post.created_at)}
            </Text>
          </View>
        </TouchableOpacity>
        {/* Post type badge */}
        {post.post_type !== 'standard' && (
          <View
            className="rounded-full px-2.5 py-1 flex-row items-center gap-x-1"
            style={{ backgroundColor: typeInfo.color + '20' }}
          >
            <Text className="text-xs">{typeInfo.emoji}</Text>
            <Text className="text-xs font-semibold" style={{ color: typeInfo.color }}>
              {typeInfo.label}
            </Text>
          </View>
        )}
      </View>

      {/* Media */}
      {post.media_urls?.length > 0 && (
        <Image
          source={{ uri: post.media_urls[0] }}
          className="w-full h-64"
          resizeMode="cover"
        />
      )}

      {/* Content */}
      {post.content && (
        <Text className="px-4 py-2 text-text-primary text-sm leading-5">{post.content}</Text>
      )}

      {/* Actions */}
      <View className="flex-row items-center px-4 py-3 gap-x-4">
        <TouchableOpacity className="flex-row items-center gap-x-1.5" onPress={handleLike}>
          <Text className="text-lg">{liked ? '❤️' : '🤍'}</Text>
          <Text className="text-text-secondary text-sm">{likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-row items-center gap-x-1.5"
          onPress={() => router.push(`/post/${post.id}`)}
        >
          <Text className="text-lg">💬</Text>
          <Text className="text-text-secondary text-sm">{post.comment_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center gap-x-1.5">
          <Text className="text-lg">🔖</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}
