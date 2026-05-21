# Handoff — MLOG life-domain in myCLEO (2026-05-20)

**Read this first if you're a myCLEO session picking up the camping/MLOG feature.**

## Why this doc exists

The MLOG "life-domain" feature (a 🏕️ Camping card in myCLEO) was built across three repos — MLOG, CLEO, myCLEO — during an **MLOG-rooted session**, using isolated git worktrees to reach into CLEO and myCLEO. That worked, but it blurred repo ownership. **Going forward, continue myCLEO work in a myCLEO session and CLEO work in a CLEO session.** This doc is the clean handoff so you don't have to reconstruct what happened.

## The decision driving it

One app for Ivan's whole life = **myCLEO**. MLOG is a *life-domain inside it*, NOT a separate app — same pattern as LIT/budget/vitals. (MLOG repo memory: `project-one-app-mycleo`.) MLOG produces data → CLEO exposes it → myCLEO renders it.

## What's already DONE and merged

### CLEO repo (the data side — all merged + deployed)
- **`GET /v1/domains/mlog`** bridge endpoint (CLEO PR #68) — serves the MLOG sibling-adapter snapshot as JSON. Live by default (file-based adapter), persisted fallback. Also `GET /v1/domains` (all repos). Auth: `X-CLEO-API-Key`. **Bridge has been restarted — the route is live and returns HTTP 200.**
- **MLOG sibling adapter** extended (CLEO PR #65) to surface planner / road-budget / gear / shooting-schedule + dashboard paths.
- **Morning briefing** consumes the MLOG whereabouts snapshot (CLEO PR #57).

### myCLEO repo (the UI side — all merged)
- **`utils/bridge-client.ts`** — `getMlogDomain()` → `/v1/domains/mlog` (myCLEO PR #21).
- **`hooks/useMlogDomain.ts`** — typed, fail-soft fetch hook (404 on older bridge = no data, not an error).
- **`components/MlogCampingCard.tsx`** — Home-tab card: now/next stay + road-budget daily rate vs the federal poverty line (green pill if under). Taps → `/camping`. Renders nothing if no MLOG data (never blocks Home).
- **`app/camping/index.tsx`** — detail screen: planner, road budget vs FPL, gear by purpose, shooting coverage, dashboards pointer, pull-to-refresh.
- **`app/(tabs)/index.tsx`** — renders `<MlogCampingCard/>` under the briefing.
- **`components/UpgradeButton.tsx`** + Settings (myCLEO PR #22) — in-app "Check for updates" (expo-updates OTA). `expo-updates ~0.25.28` pinned in package.json.

## The data contract (`GET /v1/domains/mlog`)

```jsonc
{
  "repo": "MLOG",
  "state": "ok",                 // ok | stale | unavailable
  "source": "live",              // live | persisted
  "observed_at": "ISO-8601",
  "payload": {
    "production_systems": {
      "planner":   { "stays_total", "currently", "next_stay", "next_start" },
      "road_budget": { "daily_living_usd", "fpl_daily_usd", "under_fpl", "complete", "road_total_to_date_usd" },
      "gear":      { "total_usd", "item_count", "by_purpose": { camping, production, personal } },
      "shooting_schedule": { "days", "coverage": { ... } },
      "dashboards": { "hub", "guide", "available": [ ... ] }
    }
    // also: baseline, episodes, field_notes, shorts, git_activity, weekly_cadence_compliance
  }
}
```
Verified live 2026-05-20: returns Ivan at "Ryann Nicole Preece's house", next Poole Knobs 5/22, living $17.78/day under the $43.73 FPL line.

## What's LEFT (for a myCLEO session)

1. **Publish to the phone (Ivan's step, his Expo account):** the merged code reaches the sideloaded preview APK only after an OTA publish:
   ```
   cd ~/Github/myCLEO && git checkout main && git pull
   eas update --branch preview --message "MLOG camping card + upgrade button"
   ```
   Then open the app (it auto-pulls on launch). Thereafter: **Settings → App Updates → Check for updates** pulls future updates with one tap.
2. **Runtime/visual verification** — never done on a device (built from a headless box). First real check is on Ivan's phone: card on Home, tap → detail screen. If anything's off (layout, missing value, card absent), fix in myCLEO.
   - If the card is blank: the app needs `EXPO_PUBLIC_BRIDGE_API_KEY` (set in Settings) so the fetch authenticates; otherwise it 401s and fails soft.
3. **Layer 3 — IVA-1200 (not built):** surface `MLOG.watch_match` events (already in CLEO `sibling_repo_events`, likely already flowing through the generic notification feed) in the Inbox with a 🏕️ tag, and cache the last MLOG snapshot (async-storage) so the card renders offline.

## Linear tickets (IVA team, MLOG project)
- IVA-1198 — CLEO `/v1/domains` endpoint ✅ done
- IVA-1199 — myCLEO camping card + detail screen ✅ done
- IVA-1200 — myCLEO watch alerts in Inbox + offline cache ⬜ open

## Cross-repo hygiene going forward
- myCLEO changes → a myCLEO session (or an isolated worktree from elsewhere; never HEAD-move myCLEO's primary tree from another repo's session).
- The bridge endpoint contract above is the boundary: myCLEO only reads `/v1/domains/mlog`; it never reaches into the MLOG or CLEO repos directly.

## Source-of-truth references
- Full scope: MLOG repo `docs/plans/MYCLEO_MLOG_DOMAIN_VIEW_SCOPE.md`
- EAS deploy: myCLEO `docs/EAS_BUILD.md`

---

*Written 2026-05-20 from the MLOG session as a clean handoff. Continue in a myCLEO session.*
