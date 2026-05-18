/**
 * Root index — selects the default experience.
 *
 * For builds targeted at an Alzheimer's-tester (the IVA-1183 release for
 * Ivan's mother), set EXPO_PUBLIC_COMPANION_DEFAULT=1 in eas.json. The app
 * opens to /companion on launch; from there the wizard routes to /companion/setup
 * on first run, and the home screen exposes the gear icon for caregiver access.
 *
 * For Ivan's own power-user builds, leave the env var unset and the app
 * opens to /(tabs) as before.
 */
import { Redirect } from 'expo-router';

const COMPANION_DEFAULT = process.env.EXPO_PUBLIC_COMPANION_DEFAULT === '1';

export default function Index() {
  return <Redirect href={COMPANION_DEFAULT ? '/companion' : '/(tabs)'} />;
}
