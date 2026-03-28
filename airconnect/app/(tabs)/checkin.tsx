import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Switch,
} from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const DURATION_OPTIONS = [
  { label: '6 hours', hours: 6 },
  { label: '12 hours', hours: 12 },
  { label: '24 hours', hours: 24 },
  { label: '48 hours', hours: 48 },
  { label: '1 week', hours: 168 },
];

export default function CheckInScreen() {
  const { user } = useAuth();
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [statusText, setStatusText] = useState('');
  const [availableToMeet, setAvailableToMeet] = useState(true);
  const [duration, setDuration] = useState(24);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  async function detectLocation() {
    setDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is needed to auto-detect your city.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });

      const [geocode] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (geocode) {
        setCity(geocode.city || geocode.subregion || '');
        setCountry(geocode.country || '');
        setCountryCode(geocode.isoCountryCode || '');
      }
    } catch (err: any) {
      Alert.alert('Location error', err.message);
    } finally {
      setDetecting(false);
    }
  }

  async function handleCheckIn() {
    if (!city || !country) {
      Alert.alert('Location required', 'Please enter or detect your current city.');
      return;
    }
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to check in.');
      return;
    }
    if (user.verification_status !== 'verified') {
      Alert.alert(
        'Verification required',
        'You need to be a verified crew member to check in.',
        [
          { text: 'Verify Now', onPress: () => router.push('/(auth)/verify') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString();

      // Expire old check-ins first
      await supabase
        .from('check_ins')
        .update({ expires_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString());

      const { error } = await supabase.from('check_ins').insert({
        user_id: user.id,
        city: city.trim(),
        country: country.trim(),
        country_code: countryCode.toUpperCase(),
        latitude: coords?.lat ?? 0,
        longitude: coords?.lng ?? 0,
        status_text: statusText.trim() || null,
        available_to_meet: availableToMeet,
        duration_hours: duration,
        expires_at: expiresAt,
      });

      if (error) throw error;

      // Award country badge if first time
      await awardCountryBadge(countryCode, country);

      Alert.alert(
        'Checked In! ✈️',
        `You're now showing as checked in to ${city}, ${country} for ${DURATION_OPTIONS.find(d => d.hours === duration)?.label}.`,
        [{ text: 'Great!', onPress: () => router.replace('/(tabs)/explore') }]
      );
    } catch (err: any) {
      Alert.alert('Check-in failed', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function awardCountryBadge(code: string, countryName: string) {
    if (!user || !code) return;
    const { data: existing } = await supabase
      .from('badges')
      .select('id')
      .eq('user_id', user.id)
      .eq('badge_type', 'country')
      .eq('metadata->>country_code', code)
      .maybeSingle();

    if (!existing) {
      await supabase.from('badges').insert({
        user_id: user.id,
        badge_type: 'country',
        badge_name: countryName,
        earned_at: new Date().toISOString(),
        metadata: { country_code: code, country_name: countryName },
      });
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="px-6 py-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text className="text-3xl font-bold text-text-primary mb-1">Check In</Text>
        <Text className="text-text-secondary mb-6">Let crew know you're here</Text>

        {/* Location */}
        <View className="bg-white rounded-2xl p-4 border border-border mb-4">
          <Text className="text-sm font-semibold text-text-secondary mb-3">📍 LOCATION</Text>
          <TouchableOpacity
            className="flex-row items-center bg-primary/10 rounded-xl px-4 py-3 mb-3"
            onPress={detectLocation}
            disabled={detecting}
          >
            {detecting ? (
              <ActivityIndicator color="#0A84FF" size="small" />
            ) : (
              <Text className="text-primary">📡</Text>
            )}
            <Text className="text-primary font-semibold ml-2">
              {detecting ? 'Detecting...' : 'Auto-detect my location'}
            </Text>
          </TouchableOpacity>

          <Text className="text-text-muted text-xs text-center mb-3">— or enter manually —</Text>

          <View className="gap-y-2">
            <TextInput
              className="bg-background border border-border rounded-xl px-4 py-3 text-base text-text-primary"
              placeholder="City"
              placeholderTextColor="#9CA3AF"
              value={city}
              onChangeText={setCity}
            />
            <TextInput
              className="bg-background border border-border rounded-xl px-4 py-3 text-base text-text-primary"
              placeholder="Country"
              placeholderTextColor="#9CA3AF"
              value={country}
              onChangeText={setCountry}
            />
          </View>
        </View>

        {/* Status */}
        <View className="bg-white rounded-2xl p-4 border border-border mb-4">
          <Text className="text-sm font-semibold text-text-secondary mb-3">💬 STATUS (OPTIONAL)</Text>
          <TextInput
            className="bg-background border border-border rounded-xl px-4 py-3 text-base text-text-primary"
            placeholder="30hr layover, looking for food recs!"
            placeholderTextColor="#9CA3AF"
            value={statusText}
            onChangeText={setStatusText}
            maxLength={120}
          />
          <Text className="text-text-muted text-xs mt-1 text-right">{statusText.length}/120</Text>
        </View>

        {/* Duration */}
        <View className="bg-white rounded-2xl p-4 border border-border mb-4">
          <Text className="text-sm font-semibold text-text-secondary mb-3">⏱ DURATION</Text>
          <View className="flex-row flex-wrap gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.hours}
                className={`px-3 py-2 rounded-xl border ${duration === opt.hours ? 'bg-primary border-primary' : 'bg-background border-border'}`}
                onPress={() => setDuration(opt.hours)}
              >
                <Text
                  className={`text-sm font-medium ${duration === opt.hours ? 'text-white' : 'text-text-secondary'}`}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Available to meet */}
        <View className="bg-white rounded-2xl p-4 border border-border mb-6 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-base font-semibold text-text-primary">Available to meet up</Text>
            <Text className="text-text-muted text-sm mt-0.5">Show in the "Crew Near You" carousel</Text>
          </View>
          <Switch
            value={availableToMeet}
            onValueChange={setAvailableToMeet}
            trackColor={{ false: '#E5E7EB', true: '#0A84FF' }}
            thumbColor="white"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          className={`rounded-2xl py-4 items-center ${city && country ? 'bg-primary' : 'bg-border'}`}
          onPress={handleCheckIn}
          disabled={loading || !city || !country}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className={`font-bold text-base ${city && country ? 'text-white' : 'text-text-muted'}`}>
              ✈️ Check In Now
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
