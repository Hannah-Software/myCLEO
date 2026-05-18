/**
 * Profile picker / creator stack — only mounted when isTestMode() OR
 * there's no profile yet on first launch.
 */
import { Stack } from 'expo-router';

export default function ProfilesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="pick" />
      <Stack.Screen name="create" />
    </Stack>
  );
}
