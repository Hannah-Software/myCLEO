import { Stack } from 'expo-router';
import { SafeAreaView, StatusBar } from 'react-native';
import { CleoProvider } from '../context/CleoContext';
import { UnreachableBanner } from '../components/UnreachableBanner';

// Hide the network-unreachable banner when this build's default kind is
// patient — the companion experience is local-first and the banner is
// irrelevant to a patient. Power-user-default builds keep it on.
const COMPANION_DEFAULT = process.env.EXPO_PUBLIC_COMPANION_DEFAULT === '1';

export default function RootLayout() {
  return (
    <CleoProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F4F4' }}>
        <StatusBar barStyle="dark-content" />
        {COMPANION_DEFAULT ? null : <UnreachableBanner />}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="companion" options={{ headerShown: false }} />
          <Stack.Screen name="profiles" options={{ headerShown: false }} />
          <Stack.Screen name="patient-mode" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaView>
    </CleoProvider>
  );
}
