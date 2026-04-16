import { Stack } from 'expo-router';
import { CleoProvider } from '../context/CleoContext';

export default function RootLayout() {
  return (
    <CleoProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </CleoProvider>
  );
}
