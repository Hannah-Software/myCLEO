# myCLEO — Your Co-Life CEO

## Project Overview

Consumer mobile app (iOS/Android/iPad) that packages CLEO as a personal life operating system. Single Expo (React Native + TypeScript) codebase with two deployment modes.

## Modes

- **Personal:** Ivan's phone connects to WSL2 CLEO daemon via FastAPI bridge (Tailscale)
- **Commercial:** Standalone app, syncs to PocketBase (E2E encrypted)

## Phase 0 (Ivan Pilot)
- Work rhythm check-in (A/B/C/D/E phases)
- Today's top 5 priorities (Linear)
- Health log (mood, energy, meds)
- Proactive alerts (push notifications)
- Google Calendar (unified view)
- Gmail action items

## Tech Stack
- Framework: Expo (React Native + TypeScript)
- Local storage: op-sqlite (WAL mode)
- Backend (personal): FastAPI bridge → CLEO daemon
- Backend (commercial): PocketBase (E2E encrypted)
- AI: Claude Haiku API via CleoBrain abstraction
- Health: HealthKit (iOS) + Health Connect (Android)
- Calendar: Google Calendar API
- Notifications: Expo Notifications

## Linear Tickets
All tickets tracked under team IVA, label myCLEO. See `/cleoroadmap` output for full list.

## Repository
- GitHub: hannah-Software/myCLEO
- CLEO daemon: Hannah-Software/Co-Life-CEO (separate)
- Authorization: Charter §14 (parallel product track)
