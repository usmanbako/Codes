import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Post } from '@/lib/database.types';
import PostCard from '@/components/feed/PostCard';

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: { display_name: string; avatar_url?: string; verification_status: string };
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (id === 'new') { setLoading(false); return; }
    async function load() {
      const [postRes, commentsRes] = await Promise.all([
        supabase.from('posts').select('*, user:users(*)').eq('id', id).single(),
        supabase
          .from('post_comments')
          .select('*, user:users(display_name, avatar_url, verification_status)')
          .eq('post_id', id)
          .order('created_at', { ascending: true }),
      ]);
      if (postRes.data) setPost(postRes.data as Post);
      if (commentsRes.data) setComments(commentsRes.data as Comment[]);
      setLoading(false);
    }
    load();
  }, [id]);

  async function submitComment() {
    if (!newComment.trim() || !user || !post) return;
    setPosting(true);
    const { data, error } = await supabase
      .from('post_comments')
      .insert({ post_id: post.id, user_id: user.id, content: newComment.trim() })
      .select('*, user:users(display_name, avatar_url, verification_status)')
      .single();

    if (error) {
      Alert.alert('Error', error.message);
    } else if (data) {
      setComments((c) => [...c, data as Comment]);
      setNewComment('');
      await supabase.from('posts').update({ comment_count: (post.comment_count ?? 0) + 1 }).eq('id', post.id);
    }
    setPosting(false);
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#0A84FF" size="large" />
      </View>
    );
  }

  if (!post) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-text-muted">Post not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <PostCard post={post} />

        <View className="px-4 py-3 border-b border-border bg-white">
          <Text className="font-semibold text-text-primary">
            Comments ({comments.length})
          </Text>
        </View>

        {comments.map((comment) => (
          <View key={comment.id} className="px-4 py-3 border-b border-border/50 bg-white">
            <View className="flex-row items-center gap-x-2 mb-1">
              <Text className="font-semibold text-text-primary text-sm">
                {comment.user?.display_name ?? 'Crew'}
              </Text>
              {comment.user?.verification_status === 'verified' && (
                <View className="bg-crew/20 rounded-full px-1.5 py-0.5">
                  <Text className="text-crew text-xs font-bold">✓</Text>
                </View>
              )}
              <Text className="text-text-muted text-xs ml-auto">
                {formatTime(comment.created_at)}
              </Text>
            </View>
            <Text className="text-text-secondary text-sm">{comment.content}</Text>
          </View>
        ))}

        <View className="h-20" />
      </ScrollView>

      {/* Comment input */}
      <View className="bg-white border-t border-border px-4 py-3 flex-row items-center gap-x-3">
        <TextInput
          className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-base text-text-primary"
          placeholder="Add a comment..."
          placeholderTextColor="#9CA3AF"
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        <TouchableOpacity
          className={`rounded-xl px-4 py-2.5 ${newComment.trim() ? 'bg-primary' : 'bg-border'}`}
          onPress={submitComment}
          disabled={!newComment.trim() || posting}
        >
          <Text className={`font-bold ${newComment.trim() ? 'text-white' : 'text-text-muted'}`}>
            Post
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}
