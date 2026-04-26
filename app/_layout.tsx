import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native';
import { CleoProvider } from '../context/CleoContext';
import { UnreachableBanner } from '../components/UnreachableBanner';

export default function RootLayout() {
  return (
    <CleoProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <UnreachableBanner />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaView>
    </CleoProvider>
  );
}
