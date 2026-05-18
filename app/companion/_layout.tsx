/**
 * Companion mode Stack — three routes:
 *   /companion          → home (today, meds, family, help)
 *   /companion/setup    → first-launch wizard (no nav bar)
 *   /companion/settings → caregiver-only, PIN-protected
 *
 * The whole stack hides the default header — Companion has its own visual
 * language (cards + giant titles) and a header would only add clutter.
 */
import { Stack } from 'expo-router';

export default function CompanionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
