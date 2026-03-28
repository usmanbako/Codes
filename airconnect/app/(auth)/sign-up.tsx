import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';

export default function SignUpScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!displayName || !email || !password || !confirmPassword) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim() },
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert('Sign Up Failed', error.message);
      return;
    }

    if (data.user) {
      // Create profile row
      await supabase.from('users').insert({
        id: data.user.id,
        email: data.user.email!,
        display_name: displayName.trim(),
        verification_status: 'pending',
        countries_visited: 0,
      });

      // Go to verification flow
      router.replace('/(auth)/verify');
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-8 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()} className="mb-8">
          <Text className="text-primary text-base">← Back</Text>
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-text-primary mb-2">Join the crew</Text>
        <Text className="text-text-secondary mb-8">
          Create your account — airline verification required
        </Text>

        <View className="gap-y-4">
          <FormField
            label="Display Name"
            placeholder="Your name or call sign"
            value={displayName}
            onChangeText={setDisplayName}
          />
          <FormField
            label="Email"
            placeholder="crew@airline.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <FormField
            label="Password"
            placeholder="Min. 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <FormField
            label="Confirm Password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity
            className="bg-primary rounded-2xl py-4 items-center mt-2"
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text className="text-text-muted text-xs text-center mt-6">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
          You will need to verify your airline employment before accessing all features.
        </Text>

        <View className="flex-row justify-center mt-4">
          <Text className="text-text-secondary">Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/sign-in')}>
            <Text className="text-primary font-semibold">Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormField({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  autoComplete?: any;
}) {
  return (
    <View>
      <Text className="text-sm font-medium text-text-primary mb-1.5">{label}</Text>
      <TextInput
        className="bg-background border border-border rounded-xl px-4 py-3.5 text-base text-text-primary"
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'words'}
        autoComplete={autoComplete}
      />
    </View>
  );
}
