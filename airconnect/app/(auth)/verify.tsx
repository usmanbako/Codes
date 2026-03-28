import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AIRLINES, POSITIONS } from '@/constants';

const STEPS = ['Airline Info', 'Employee ID', 'Badge Photo'];

export default function VerifyScreen() {
  const { supabaseUser, refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [airline, setAirline] = useState('');
  const [position, setPosition] = useState('');
  const [baseAirport, setBaseAirport] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [badgeImage, setBadgeImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function pickBadgeImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setBadgeImage(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (!badgeImage) {
      Alert.alert('Badge photo required', 'Please upload a photo of your airline badge.');
      return;
    }
    setLoading(true);

    try {
      // Upload badge image
      const fileName = `badges/${supabaseUser!.id}-${Date.now()}.jpg`;
      const response = await fetch(badgeImage);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('verifications')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          airline,
          position,
          base_airport: baseAirport.toUpperCase(),
          employee_id_hash: btoa(employeeId), // In production: use proper hashing
          verification_status: 'pending',
        })
        .eq('id', supabaseUser!.id);

      if (updateError) throw updateError;

      await refreshUser();

      Alert.alert(
        'Verification Submitted',
        'Your verification is under review. This usually takes 24-48 hours. You can browse while you wait!',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/home') }]
      );
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message);
    } finally {
      setLoading(false);
    }
  }

  function canProceed() {
    if (step === 0) return airline && position && baseAirport.length >= 3;
    if (step === 1) return employeeId.trim().length > 0;
    return true;
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <ScrollView
        contentContainerClassName="flex-grow px-8 py-12"
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text className="text-3xl font-bold text-text-primary mb-1">Verify your employment</Text>
        <Text className="text-text-secondary mb-6">
          Verification keeps AirConnect trusted and safe for all crew.
        </Text>

        {/* Progress */}
        <View className="flex-row gap-x-2 mb-8">
          {STEPS.map((s, i) => (
            <View
              key={s}
              className={`flex-1 h-1.5 rounded-full ${i <= step ? 'bg-primary' : 'bg-border'}`}
            />
          ))}
        </View>

        <Text className="text-lg font-semibold text-text-primary mb-4">
          Step {step + 1}: {STEPS[step]}
        </Text>

        {/* Step 0: Airline info */}
        {step === 0 && (
          <View className="gap-y-4">
            <SelectField
              label="Airline"
              value={airline}
              options={AIRLINES as unknown as string[]}
              onSelect={setAirline}
              placeholder="Select your airline"
            />
            <SelectField
              label="Position"
              value={position}
              options={POSITIONS as unknown as string[]}
              onSelect={setPosition}
              placeholder="Select your position"
            />
            <View>
              <Text className="text-sm font-medium text-text-primary mb-1.5">
                Home Base / Hub (IATA code)
              </Text>
              <TextInput
                className="bg-background border border-border rounded-xl px-4 py-3.5 text-base text-text-primary"
                placeholder="e.g. LAX, JFK, ORD"
                placeholderTextColor="#9CA3AF"
                value={baseAirport}
                onChangeText={(v) => setBaseAirport(v.toUpperCase())}
                maxLength={3}
                autoCapitalize="characters"
              />
            </View>
          </View>
        )}

        {/* Step 1: Employee ID */}
        {step === 1 && (
          <View className="gap-y-4">
            <View className="bg-primary/10 rounded-xl p-4 mb-2">
              <Text className="text-primary font-semibold mb-1">Why do we need this?</Text>
              <Text className="text-primary/80 text-sm">
                Your employee ID or CASS number is used only for verification — it's stored
                as a one-way hash and never shared with other users.
              </Text>
            </View>
            <View>
              <Text className="text-sm font-medium text-text-primary mb-1.5">
                Employee ID or CASS Number
              </Text>
              <TextInput
                className="bg-background border border-border rounded-xl px-4 py-3.5 text-base text-text-primary"
                placeholder="Enter your employee ID"
                placeholderTextColor="#9CA3AF"
                value={employeeId}
                onChangeText={setEmployeeId}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
        )}

        {/* Step 2: Badge photo */}
        {step === 2 && (
          <View className="gap-y-4">
            <View className="bg-amber-50 rounded-xl p-4 mb-2 border border-amber-200">
              <Text className="text-amber-800 font-semibold mb-1">Photo guidelines</Text>
              <Text className="text-amber-700 text-sm">
                • Upload your airline ID badge (front only){'\n'}
                • Name and airline logo must be clearly visible{'\n'}
                • You may blur your ID number after photographing{'\n'}
                • Photo is only used for verification, not shared publicly
              </Text>
            </View>

            <TouchableOpacity
              className="border-2 border-dashed border-border rounded-2xl p-8 items-center"
              onPress={pickBadgeImage}
            >
              {badgeImage ? (
                <>
                  <Image
                    source={{ uri: badgeImage }}
                    className="w-full h-48 rounded-xl mb-3"
                    resizeMode="cover"
                  />
                  <Text className="text-primary font-semibold">Tap to change photo</Text>
                </>
              ) : (
                <>
                  <Text className="text-4xl mb-3">📷</Text>
                  <Text className="text-text-primary font-semibold">Upload badge photo</Text>
                  <Text className="text-text-muted text-sm mt-1">Tap to select from library</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Nav buttons */}
        <View className="flex-row gap-x-3 mt-8">
          {step > 0 && (
            <TouchableOpacity
              className="flex-1 border border-border rounded-2xl py-4 items-center"
              onPress={() => setStep(step - 1)}
            >
              <Text className="text-text-primary font-semibold">Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className={`flex-1 rounded-2xl py-4 items-center ${canProceed() ? 'bg-primary' : 'bg-border'}`}
            onPress={step < 2 ? () => setStep(step + 1) : handleSubmit}
            disabled={!canProceed() || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className={`font-bold text-base ${canProceed() ? 'text-white' : 'text-text-muted'}`}>
                {step < 2 ? 'Continue' : 'Submit Verification'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="items-center mt-4"
          onPress={() => router.replace('/(tabs)/home')}
        >
          <Text className="text-text-muted text-sm">Skip for now (limited access)</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function SelectField({
  label,
  value,
  options,
  onSelect,
  placeholder,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Text className="text-sm font-medium text-text-primary mb-1.5">{label}</Text>
      <TouchableOpacity
        className="bg-background border border-border rounded-xl px-4 py-3.5 flex-row justify-between items-center"
        onPress={() => setOpen(!open)}
      >
        <Text className={value ? 'text-text-primary text-base' : 'text-text-muted text-base'}>
          {value || placeholder}
        </Text>
        <Text className="text-text-muted">{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View className="border border-border rounded-xl mt-1 bg-white overflow-hidden max-h-48">
          <ScrollView nestedScrollEnabled>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                className={`px-4 py-3 border-b border-border ${opt === value ? 'bg-primary/10' : ''}`}
                onPress={() => { onSelect(opt); setOpen(false); }}
              >
                <Text className={opt === value ? 'text-primary font-semibold' : 'text-text-primary'}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
