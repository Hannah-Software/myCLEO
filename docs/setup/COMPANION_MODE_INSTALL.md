---
date: 2026-05-18
status: active
audience: caregiver (Ivan, Kerri, anyone setting up the app for a tester)
---

# Companion Mode — install guide for the first patient tester

This guide is for installing the **myCLEO Companion Mode** APK on an Android phone for a patient tester (e.g. someone with mild-to-moderate Alzheimer's or other cognitive impairment). Built first for Ivan's mother; designed to generalize.

## What Companion Mode is

A single-screen patient experience that shows four calming cards:

1. **Today** — greeting, name, day, date, where she is. Auto-reads aloud each minute.
2. **Medications** — today's doses, with a big "I took it" button on whatever is due now.
3. **Family** — rotating photo of a family member with caption ("Ivan, your son") read aloud.
4. **Call for help** — one big red button to call the primary contact.

Every card has a speaker button — tap and the card reads aloud (English or Spanish, configurable).

Designed to work **with zero network connectivity**. All configuration lives on the phone itself. The CLEO bridge sync is optional and off by default — it doesn't need to be running for the patient to use the app.

## What you need before starting

1. The patient's Android phone (Android 8.0 or newer; almost any phone from the last 5 years).
2. A USB cable OR the ability to share files with the phone (e.g. email the APK to yourself).
3. About 30 minutes of uninterrupted time with the phone + the patient nearby for the first-run wizard.
4. A 4-digit PIN you choose for the caregiver settings (write it down — you'll need it again).
5. (Optional but recommended) A photo of the patient + 3-6 photos of family members ready on your laptop or phone.
6. (Optional) The phone numbers and names of 1-4 emergency contacts.
7. (Optional) The patient's current medication list with display name + dosage + times-of-day.

## Step 1 — Get the APK

The companion-preview APK is built via EAS Build with the profile `companion-preview`. To produce a fresh build:

```bash
cd ~/Github/myCLEO
git checkout feat/companion-mode-for-mother    # or main, after merge
eas build --platform android --profile companion-preview
```

EAS will print a URL when the build finishes (about 10-15 minutes). Download the `.apk` file from that URL.

If you want to test locally before building, use Expo Go:

```bash
cd ~/Github/myCLEO
EXPO_PUBLIC_COMPANION_DEFAULT=1 npx expo start
```

Then scan the QR with Expo Go on the patient's phone (only suitable for short trial — Expo Go expires after a session).

## Step 2 — Install on the patient's phone

1. Copy the `.apk` to the phone (USB, email-to-self, Google Drive, or a USB stick — whatever works).
2. On the phone, open the file manager and tap the APK.
3. Android will warn "Install unknown apps" — say yes. (You may need to enable "Install unknown apps" for whichever app opened the APK in Settings → Apps → Special access.)
4. Tap **Install**. Takes ~30 seconds.
5. Open the app. It's called **myCLEO**.

## Step 3 — Walk through the first-run wizard

The wizard runs once. Sit next to the patient. About 5 minutes. Steps:

1. **Welcome / language** — pick English or Spanish. This drives every text + voice prompt.
2. **Name** — patient's full name, plus a preferred greeting name ("Mom" reads better than "Maria" when the app greets her).
3. **Home** — short phrase the app says when orienting her ("home in Houston"). Optional but worth filling.
4. **Photo** — a picture of the patient herself, shown on the Today card. Optional but lands well.
5. **First emergency contact** — name, relationship ("your son"), and phone number. This contact becomes the big red call button. Mark as primary.
6. **First medication** — display name the patient recognizes ("the blue pill" is fine), dosage, times-of-day in 24-hour format comma-separated ("08:00, 20:00").
7. **Caregiver PIN** — pick a 4-digit code. **Write this down somewhere safe** — you need it to change settings later.

When you tap **Done**, the app marks setup complete, schedules the medication reminders, and lands on the Companion home screen.

## Step 4 — Add the rest of the data (optional but recommended)

After the wizard, tap the small gear icon at the bottom-right corner of the home screen. Enter the PIN. From caregiver Settings you can:

- Add more contacts (the primary is always the big red button; others appear as smaller buttons below)
- Add 3-6 family photos with captions read aloud (e.g. "Kerri, your daughter-in-law" / "Sophia, your granddaughter")
- Add more medications with their own schedules
- Toggle large-text and auto-speak preferences
- Switch language between English and Spanish at any time

Every change saves immediately. Back out by tapping the X in the top-right or pressing the system Back button.

## Step 5 — Hand the phone to the patient

The home screen is what the patient sees. The four cards. The gear icon is small and grey at the bottom-right — visible enough that you can find it, faded enough that she's unlikely to discover it accidentally. Even if she does, it requires the PIN.

Things to expect:

- The Today card speaks aloud once per minute by default (caregiver can disable in Settings → Preferences).
- Medication reminders fire as system notifications at the scheduled times — sound + vibration. Tapping the notification opens the app.
- The Family card auto-advances every 8 seconds. Tap the photo to advance manually + hear the caption.
- The Call for help card places a real phone call when tapped. Test once with the patient watching so she knows what it does.

## Things to watch for during the test week

- **Does the patient understand the Today card on her own?** If not, the home location string may be too short — try "you are at home in Houston, in your apartment" instead of just "home".
- **Are the medication reminders going off?** If she's not getting notifications, open Settings → Apps → myCLEO → Notifications and check that all categories are enabled.
- **Is the Family card actually orienting her?** The caption is the most load-bearing field. Use complete sentences: "Ivan, your son. He lives in Texas." rather than "Ivan".
- **Does she find the Call for help button?** If not, move that card higher (we'll add a setting for card order in a future build) or switch to a brighter accent color.

## Things to tell Ivan after the test

- Which cards she used unprompted
- Which cards she ignored
- Whether the voice (Spanish or English, speed) felt natural
- Anything that confused her or upset her
- Whether the call button worked the way she expected

Drop notes in `docs/userguides/COMPANION_FEEDBACK.md` or the Linear ticket for this release (filed against IVA — see the close-out for the ticket ID).

## Known limitations of this v1 release

- **Local-only.** Nothing syncs back to a caregiver dashboard. If you want to know whether she took her morning meds, you have to physically check the phone OR enable Bridge Sync in Settings (advanced — requires the patient's phone on Ivan's Tailscale network).
- **No "where am I" GPS card.** If she opens the app in an unfamiliar place, the home-location line still says "at home". Coming later.
- **No video calls.** Tap-to-call uses the system dialer for voice. Video would need WhatsApp or FaceTime integration — out of scope for v1.
- **No two-way messaging.** She can't reply to caregiver messages from the home screen. The patient surface is read-only by design — anything that requires a caregiver action stays in Settings.
- **English + Spanish only.** Other languages require strings work in `utils/companionI18n.ts`.
- **Notifications are scheduled locally.** If the patient turns off her phone, the reminder doesn't fire. (We could add a server-side push fallback later via the bridge.)

## Resetting everything (if a different person will use this phone)

Open Settings (cog → PIN) → **Erase all companion data** at the bottom. Confirms once. Removes name, photos, contacts, medications, PIN, and all scheduled notifications. Next launch runs the wizard again.

## Where the code lives

- App routes: `app/companion/index.tsx`, `app/companion/setup.tsx`, `app/companion/settings.tsx`
- Cards: `components/companion/{Companion,Today,Medications,Family,Help}Card.tsx`
- Storage + scheduling: `utils/companion{Store,I18n,Voice,Notifications}.ts`
- EAS build profile: `companion-preview` in `eas.json`

The companion build sets `EXPO_PUBLIC_COMPANION_DEFAULT=1` to route the root index to `/companion`. Without that env var, the app opens to the normal `(tabs)` Ivan-power-user experience.
