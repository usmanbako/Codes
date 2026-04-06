import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { openai, CREW_SYSTEM_PROMPT } from '@/lib/openai';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const SUGGESTIONS = [
  'Best restaurants near LAX for a 4-hour layover?',
  'Things to do in Tokyo on a 24-hour layover',
  'Cheapest transport from Heathrow to central London',
  'Crew-friendly hotels near JFK',
];

export default function AIScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: CREW_SYSTEM_PROMPT },
          ...updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 500,
      });

      const assistantContent = response.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.';
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: assistantContent },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Something went wrong. Please check your API key and try again.',
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, loading]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="bg-white px-4 pt-2 pb-3 border-b border-border">
        <Text className="text-2xl font-bold text-text-primary">CrewAI ✨</Text>
        <Text className="text-text-muted text-sm">Your AI layover assistant</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {messages.length === 0 ? (
          <View className="flex-1 px-4 pt-6">
            <Text className="text-text-primary font-semibold text-base mb-1">How can I help?</Text>
            <Text className="text-text-muted text-sm mb-5">
              Ask me anything about your layover destination.
            </Text>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => sendMessage(s)}
                className="bg-white border border-border rounded-xl px-4 py-3 mb-3"
              >
                <Text className="text-text-primary text-sm">{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => (
              <View
                className={`mb-3 max-w-[85%] rounded-2xl px-4 py-3 ${
                  item.role === 'user'
                    ? 'bg-primary self-end'
                    : 'bg-white border border-border self-start'
                }`}
              >
                <Text
                  className={`text-sm leading-5 ${
                    item.role === 'user' ? 'text-white' : 'text-text-primary'
                  }`}
                >
                  {item.content}
                </Text>
              </View>
            )}
          />
        )}

        {loading && (
          <View className="px-4 pb-2 self-start">
            <View className="bg-white border border-border rounded-2xl px-4 py-3">
              <ActivityIndicator color="#0A84FF" size="small" />
            </View>
          </View>
        )}

        <View className="flex-row items-end px-4 py-3 bg-white border-t border-border gap-2">
          <TextInput
            className="flex-1 bg-background border border-border rounded-2xl px-4 py-3 text-text-primary text-sm"
            placeholder="Ask about your layover..."
            placeholderTextColor="#9CA3AF"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage(input)}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className={`w-11 h-11 rounded-full items-center justify-center ${
              input.trim() && !loading ? 'bg-primary' : 'bg-border'
            }`}
          >
            <Text className="text-white text-lg">↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
