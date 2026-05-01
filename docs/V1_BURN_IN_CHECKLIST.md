# myCLEO V1 — One-Week Burn-In Checklist

**Goal:** prove the V1 app is trustworthy enough to disable the Telegram bot (`CLEO_TELEGRAM_ENABLED=0`) and operate exclusively from the phone.

**Window:** 7 consecutive days of real use, starting the day Ivan installs the signed APK on his Android device. Don't shorten — failure modes (stale push tokens, daemon restarts, Tailscale flaps) only show up over multi-day stretches.

**Pass criteria:** every row below either checked off or has an open Linear ticket explaining why it was deferred. If any P0 row fails, V1 is not done — Telegram stays on.

---

## Day-of-install (Day 0)

- [ ] APK installed via EAS preview build link.
- [ ] App opens, completes `bootstrapBridgeAuth()` without warnings in console.
- [ ] Settings → Bridge Connection shows the correct URL + masked API key.
- [ ] Settings → Connection Tests: Tailscale probe = 200 OK, Daemon probe = 200 OK.
- [ ] Push permission prompt appears; granted; token registered with bridge (check `data/CLEO.db` `push_tokens` table for new row).
- [ ] Send first chat message → reply received within 30s.
- [ ] Verify chat row appears in `chat_history` with `source='mycleo'`.

## Daily checks (Days 1–7)

For each day, log a one-line entry in `docs/V1_BURN_IN_LOG.md`:

```
2026-MM-DD · ✓ chat / ✓ push / ✓ offline / ✓ settings — notes
```

### P0 — must pass every day
- [ ] Day 1: at least 5 chat exchanges in app, all replies under 30s.
- [ ] Day 2: kill the bridge daemon mid-conversation → unreachable banner appears within 10s; messages typed during outage queue offline; restart bridge → queue drains automatically.
- [ ] Day 3: receive at least one push notification; tapping it opens the app to the right screen.
- [ ] Day 4: rotate `CLEO_BRIDGE_API_KEY` on the bridge; paste new key in Settings; chat resumes without app restart; daemon probe goes 401 → 200.
- [ ] Day 5: airplane-mode test — send 3 chat messages while disconnected, then reconnect; verify all 3 land in `chat_history` in order, no duplicates.
- [ ] Day 6: leave the app backgrounded for 8 hours, return → chat scrolls to most recent turn (persistence works); no crash on resume.
- [ ] Day 7: with both bridge and Telegram alive, alternate sending one message via each → both appear in the same chat thread, source-tagged correctly.

### P1 — nice-to-have but flag if broken
- [ ] Tailscale flap test: disable/enable Tailscale on the phone → unreachable banner reflects state within 30s.
- [ ] Settings probe latency stays under 500ms on home wifi, under 2000ms on cellular.
- [ ] No console warnings about `EAS projectId not set`, `LAST_TOKEN_KEY mismatch`, or push registration deferred.
- [ ] Daemon restart while app is open → app reconnects without manual refresh.

---

## Cutover gate (end of Day 7)

If every P0 row passed, run:

```bash
doppler secrets set CLEO_TELEGRAM_ENABLED=0 -p CLEO -c dev
```

Then:

- [ ] Send a Telegram message → bot stays silent (no reply, no `chat_history` row).
- [ ] Send a chat in myCLEO → reply lands as expected.
- [ ] After 24h with Telegram off, no missed messages, no urge to flip it back on → V1 is done.

If the urge comes back: re-enable Telegram immediately, file a Linear bug describing what gap drove the regression, and do not call V1 done until the gap is closed.

---

## Retro template

When the burn-in is complete, write `docs/V1_RETRO.md` with these sections:

```markdown
# myCLEO V1 Retro — <date>

## What worked
- ...

## What broke (and was fixed mid-week)
- ...

## What broke (and is still open)
- Linear ticket links to V2 backlog.

## Promote to V2
- Features that proved themselves and should harden into the long-term codebase.

## Demote / revisit
- Decisions that didn't survive contact with daily use.

## Cutover decision
- Telegram kill date: ...
- Reverted? Y/N. If Y, why?
```

Drop the doc in `docs/`, link it from `docs/index/` if that subfolder exists, and append a one-line entry to the parent CLEO repo's `WorkDoneSummary.md`.
