# EAS Build — myCLEO

One-time setup, then `eas build --profile preview --platform android` to get an APK for sideloading on Ivan's phone.

## One-time setup (Ivan only)

```bash
cd ~/Github/myCLEO

# 1. Install EAS CLI globally if not already
npm install -g eas-cli

# 2. Log in (Expo account: ivanemadrigal)
eas login

# 3. Initialize the EAS project — this writes the real projectId
#    into app.json's extra.eas.projectId field, replacing the
#    REPLACE_WITH_EAS_PROJECT_ID placeholder.
eas init

# 4. Commit the projectId change
git add app.json
git commit -m "eas: pin EAS project id"
```

## Profiles

| Profile | Output | Channel | Use |
|---|---|---|---|
| `development` | dev-client APK | `development` | local Metro hot reload on a device |
| `preview` | signed release APK | `preview` | sideload to Ivan's phone (IVA-904) |
| `production` | AAB for Play Store | `production` | future Play Store upload |

## Build commands

```bash
# Preview APK for Ivan's phone (the IVA-904 path)
eas build --profile preview --platform android

# Development build (only if you need local hot reload on device)
eas build --profile development --platform android

# When the build finishes, EAS prints a download link. Open the link
# on the phone in a browser and tap to install. Android will ask
# permission to install from an unknown source — allow it for Chrome
# (or whatever browser is downloading the APK).
```

## Environment variables

`EXPO_PUBLIC_BRIDGE_URL` is set in `eas.json` under the `base` build profile and currently points at the Tailscale IP `http://100.64.218.73:8765`. If the WSL2 host's Tailscale address changes, update `eas.json` and rebuild.

`EXPO_PUBLIC_BRIDGE_API_KEY` is **not** baked into the build. The app reads it from `expo-secure-store` at runtime (set via the Settings screen — IVA-910). This keeps the secret out of the binary.

## Versioning

`runtimeVersion: { policy: "appVersion" }` in `app.json` means OTA updates can ship to a build without a native rebuild as long as the JS bundle stays compatible. Bump `version` in `app.json` when shipping any change that touches native modules (new Expo SDK plugin, new permissions, etc.) and rebuild.

## Identifiers (locked)

- iOS bundle: `com.synapticsystems.mycleo`
- Android package: `com.synapticsystems.mycleo`

These cannot change without re-publishing as a new app, so they're locked for V1.
