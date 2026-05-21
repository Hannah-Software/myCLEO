# Work Done Summary

Each entry represents a single chat session with Claude Code. Entries are grouped by session when PRs were worked on together, or split when they were independent.

---

## 2026-05-20 ~8:53 PM — IVA-1200: MLOG events in Inbox + offline cache (Layer 3)

| Metric | Value |
|--------|-------|
| **Date/Time** | 2026-05-20 ~8:53 PM EST |
| **Session Title** | IVA-1200 — Layer 3 of the MLOG life-domain in myCLEO |
| **Chat Messages** | ~5 user prompts, ~5 responses |
| **PRs Shipped** | #24 |
| **New Lines of Code** | +248 / -4 (net +244) |
| **Total Lines in Touched Files** | 1,053 |
| **New Tests Added** | None (repo has no test suite wired up — `jest` script present but no specs) |
| **Tests in CI** | N/A — repo has no GitHub Actions workflows; PR was CLEAN/MERGEABLE with no required checks |

### Scope

Wrapped up the MLOG life-domain feature in myCLEO by building the consumer side of the sibling-events feed and adding offline persistence for the Camping card. The producer-side (MLOG → `cleo_event_client.py` POSTing `MLOG.watch_match`) is its own ticket — myCLEO is now ready to display events whenever they start flowing through the CLEO bridge.

### Changes

#### PR #24 — IVA-1200: MLOG events in Inbox + offline cache (Layer 3)
*Main planned work for the session.*

| File | Action | Lines |
|------|--------|-------|
| `utils/bridge-client.ts` | Modified | +44 — added `getSiblingEvents()`, `ackSiblingEvent()`, `SiblingEvent` + `SiblingEventListResponse` types against `/v1/events` |
| `utils/mlog-cache.ts` | Created | +33 — AsyncStorage helpers (`loadCachedMlog`, `saveCachedMlog`, `clearCachedMlog`) under key `mycleo.mlog.domain.v1` |
| `hooks/useSiblingEvents.ts` | Created | +55 — generic events hook (filterable by `source_repo` / `event_type`), 15-min poll, optimistic `ack(id)` |
| `hooks/useMlogDomain.ts` | Modified | +24/-3 — cache hydrate-on-mount + persist-on-success; keeps stale snapshot on fetch error; exposes `cachedAt` |
| `app/(tabs)/inbox.tsx` | Modified | +92/-1 — new Camping/MLOG section above Action Items with 🏕️ tag + bonfire-outline icon; friendly label parsing (`MLOG.watch_match` → "Watch match"); tap → ack + navigate to `/camping` |

**Stats:** +248 / -4 across 5 files

### Verification

- `npx tsc --noEmit` — clean against all 5 changed files (the only pre-existing errors are unrelated: `useCalendarEvents.ts:37` syntax + missing `expo/tsconfig` reference)
- Bridge contract probed live: `GET /v1/events/schema` confirmed at `http://127.0.0.1:8765`, MLOG in `known_repos`, EventOut shape matches client types
- `GET /v1/events?source_repo=MLOG&consumed=false` returns 0 items currently — wired-up but waiting on the MLOG producer side
- PR #24 merged via standard `--merge` (no CI workflows in repo to wait on)

### Key Decisions

| Decision | Chosen | Alternatives Considered | Why |
|----------|--------|------------------------|-----|
| Hook scope for events feed | Generic `useSiblingEvents({ source_repo, event_type })` | MLOG-specific `useMlogEvents` | Bridge schema already supports any `source_repo` (LIT, budget, sellitall, synaptic) — same code, just pass a filter; future sections can reuse without a copy-paste hook |
| Offline-cache error behavior | Keep stale snapshot on fetch error; don't clear `domain` | Clear domain on error to show "unavailable" state | Camping card should render *something* offline rather than disappear — the prior behavior would blank the card on any fetch failure even when cached data was available |
| Cache hydration timing | Hydrate from cache first, *then* fire network fetch (both in same effect) | Hydrate only on fetch failure | Faster first paint — cached snapshot shows instantly on cold launch; network result overwrites when it lands |
| Event ack semantics | Optimistic (drop locally first, server roundtrip after) with offline-queue fallback | Pessimistic (wait for server 200 before removing) | Matches the existing bridge-client `enqueueOnFailure` pattern; user gets immediate feedback; failed acks replay via existing offline-queue infrastructure |
| Inbox section placement | New section above Action Items, only renders when `events.length > 0` | Mixed into the Action Items list with a type filter | MLOG events aren't urgency-ranked (no high/medium/low) — they don't fit the existing filter taxonomy; separate section keeps the urgency filter coherent |
| Friendly label parsing | Strip namespace prefix (`MLOG.watch_match` → "Watch match") | Hardcode known event-type labels in a switch | Forward-compatible — any new `MLOG.*` event type renders sensibly without a code change here |
| Doppler config bootstrap | Import 13 canonical secrets from `claude-hub/prd` into empty `myCLEO/prd` | Switch `doppler.yaml` to point at `CLEO/dev` directly | Cleaner separation — myCLEO has its own Doppler project; user-authorized via "import all of the api keys and doppler keys you need" |
| Secret transfer mechanism | Pipe `doppler secrets download --format json` through `jq` filter into 600-perm tmpfile, then `doppler secrets upload`, then `shred -u` | Direct env-var copy in shell | Per global rule: never pipe secret values through the parent shell — Doppler env values containing JSON-shaped OAuth tokens break shell parsing and dump credentials to stderr |
| Close-out skill | `/ship` | `/cleoroadmap` (initially invoked but aborted — CLEO-only) | `/cleoroadmap` Phase 0a hard-stops on missing `CLEO_CHARTER.md`, which lives in `~/Github/CLEO`, not myCLEO; `/ship` is the right close-out for a single-PR feature session in a non-CLEO repo |

### Creative & Design Artifacts

| Artifact | Path (Linux) | Path (Windows) | Notes |
|----------|-------------|----------------|-------|
| MLOG events bridge client | `/home/ivanemadrigal/Github/myCLEO/utils/bridge-client.ts` | `\\wsl.localhost\Ubuntu\home\ivanemadrigal\Github\myCLEO\utils\bridge-client.ts` | `/v1/events` GET + ack POST + types |
| MLOG snapshot AsyncStorage cache | `/home/ivanemadrigal/Github/myCLEO/utils/mlog-cache.ts` | `\\wsl.localhost\Ubuntu\home\ivanemadrigal\Github\myCLEO\utils\mlog-cache.ts` | Key: `mycleo.mlog.domain.v1`; hydrate/persist/clear helpers |
| Generic sibling-events React hook | `/home/ivanemadrigal/Github/myCLEO/hooks/useSiblingEvents.ts` | `\\wsl.localhost\Ubuntu\home\ivanemadrigal\Github\myCLEO\hooks\useSiblingEvents.ts` | Filterable, 15-min poll, optimistic ack |
| Offline-aware MLOG domain hook | `/home/ivanemadrigal/Github/myCLEO/hooks/useMlogDomain.ts` | `\\wsl.localhost\Ubuntu\home\ivanemadrigal\Github\myCLEO\hooks\useMlogDomain.ts` | Cache hydrate-on-mount + persist-on-success |
| Inbox screen with Camping section | `/home/ivanemadrigal/Github/myCLEO/app/(tabs)/inbox.tsx` | `\\wsl.localhost\Ubuntu\home\ivanemadrigal\Github\myCLEO\app\(tabs)\inbox.tsx` | 🏕️ tag + bonfire-outline icon + tap-to-ack-and-navigate |
| Linear ticket (already Done) | https://linear.app/ivan-madrigal-work/issue/IVA-1200 | (same) | Confirmed in `Done` state post-merge |
| Merged PR | https://github.com/Hannah-Software/myCLEO/pull/24 | (same) | Squash-free `--merge` to keep the meaningful single commit + merge commit |

### Locked Settings & Configurations

- **`mycleo.mlog.domain.v1`** — AsyncStorage key for the MLOG snapshot offline cache, defined in `utils/mlog-cache.ts:5`. Locked because: matches the existing `cleo.chat.thread.v1` versioning convention from `utils/chat-storage.ts` (dotted namespace + `.v1` suffix so future schema migrations can bump cleanly).
- **MLOG events poll interval** — `15 * 60 * 1000` ms (15 min), defined in `hooks/useSiblingEvents.ts:13`. Locked because: matches the Gmail action items poll cadence in `hooks/useGmailActionItems.ts:74`; user-pull-to-refresh is the primary path, polling is fallback.
- **MLOG section visual identity** — `#2a8f4a` green + `bonfire-outline` Ionicons + 🏕️ emoji tag, used in `app/(tabs)/inbox.tsx` and matching `components/MlogCampingCard.tsx:36`. Locked because: visual consistency between the Home card and the Inbox section so Ivan recognizes them as the same domain at a glance.
- **myCLEO Doppler config** — `myCLEO/prd` now contains 13 canonical secrets (LINEAR_API_KEY, ASANA_PAT, GMAIL_CLIENT_ID/SECRET, GMAIL_TOKEN_* × 4 accounts, GCAL_TOKEN_* × 4 accounts, ANTHROPIC_API_KEY) imported from `claude-hub/prd`. Locked because: Phase 0 of `/startup` requires these to verify Linear/Asana/Gmail/Calendar access before any work begins, and the user explicitly authorized the import.

### Context

This session closes the loop on the MLOG life-domain feature in myCLEO. Layer 1 (CLEO `/v1/domains/mlog` bridge endpoint, PR #68 in CLEO) and Layer 2 (myCLEO Home camping card + detail screen, PRs #21–#23) were built last week from an MLOG-rooted session using cross-repo worktrees. Per the 2026-05-20 handoff doc (`docs/HANDOFF_MLOG_DOMAIN_2026-05-20.md`), Layer 3 was deliberately left for a myCLEO-rooted session to un-blur repo ownership — this session is that one. The cross-repo boundary held: myCLEO only reads the two documented bridge endpoints (`/v1/domains/mlog`, `/v1/events`); no reach into MLOG or CLEO working trees. Next on-device step is Ivan publishing OTA via `eas update --branch preview` and visually verifying the card + new Inbox section on his phone.

---

## 2026-05-20 ~10:15 PM — /roadmap close-out (Linear + Asana sync for myCLEO)

| Metric | Value |
|--------|-------|
| **Date/Time** | 2026-05-20 ~10:15 PM EST |
| **Session Title** | /roadmap sync — file follow-ups, populate Asana sprints |
| **Chat Messages** | ~3 user prompts, ~6 responses (continuation of IVA-1200 session) |
| **PRs Shipped** | #25 (workdone log), #26 (roadmap config + audit) |
| **Linear Tickets Filed** | 3 (IVA-1201, IVA-1202, IVA-1203) |
| **Asana Tasks Synced** | 9 created across 4 sprint sections |
| **New Lines of Code** | +113 / -1 (workdone log + roadmap.json + audit) |
| **New Tests Added** | None — config + docs only |
| **Tests in CI** | N/A — repo has no GitHub Actions workflows |

### Scope

Wrapped the IVA-1200 session with `/roadmap` close-out. Filed 3 forward-looking tickets in Linear myCLEO, synced the project to Asana with sprint sections + dated tasks, and committed the roadmap config file + HTML/dashboard audit so future `/roadmap` runs in this repo don't need to rediscover the project ids.

### Changes

#### PR #25 — chore: append IVA-1200 entry to WorkDoneSummary.md
The session log itself, before the roadmap close-out started.

#### PR #26 — chore(roadmap): sync Linear myCLEO + Asana sprints
- `.claude/roadmap.json` — Linear team IVA, project myCLEO (id `4650694c-a3e1-4ccf-9be3-997b78ac51c0`), Asana workspace `1213725282099683` / project gid `1214158831619829`
- `docs/audits/20260521_HTML_UPDATE_AUDIT-myCLEO.md` — required per Repo Documentation Standard §6; no HTML dashboards in this repo

### Linear Tickets Filed

| ID | Pri | Title |
|----|-----|-------|
| IVA-1201 | P1 | OTA-publish IVA-1200 to preview + on-device verification |
| IVA-1202 | P3 | MlogCampingCard — surface "cached" indicator when rendering from offline snapshot |
| IVA-1203 | P3 | Symlink skill files to claude-hub canonical |

### Verification

- Linear: all 3 `issueCreate` mutations returned `success: true` with identifiers
- Asana: `asana_sync.py` reported `9 created, 0 updated` against project gid `1214158831619829`
- Standards validator: 18 pre-existing missing-docs-folder gaps + 8 tracked-skill-copy drift findings — none introduced this session; skill drift now ticketed as IVA-1203

### Key Decisions

| Decision | Chosen | Alternatives Considered | Why |
|----------|--------|------------------------|-----|
| Linear ticket creation transport | Standalone Python script via `doppler run -- python3 <<PY` heredoc with native `json.dumps()` | Inline bash with `$(python3 -c …)` for per-field JSON escaping | First attempt (inline bash) returned HTTP 500 three times — shell-side escaping of multi-line markdown descriptions broke the GraphQL variables JSON. Moving the entire body construction into Python with one `json.dumps()` fixed it on the first retry |
| Standards-validator failures handling | Note in commit message + Phase 8 confirm; do NOT block | Halt and bootstrap all 18 missing folders before commit | The gaps predate this session (myCLEO has never been compliant), the repo has no CI gating on the standards workflow, and bootstrapping would balloon the PR scope. Filed IVA-1203 for skill drift; remaining doc-folder gaps are their own future ticket |
| Asana sprint task effort default | 7-day window per task, evenly staggered within each sprint | Per-task effort (S/M/L/XL) based on Linear estimate | Linear issues didn't carry estimate fields populated; even staggering produces a clean Gantt view without requiring manual effort calls |

### Locked Settings & Configurations

- **myCLEO Linear project id** — `4650694c-a3e1-4ccf-9be3-997b78ac51c0`, stored in `.claude/roadmap.json`. Locked because: future `/roadmap` runs need this to query the right project's issues without rediscovering it
- **myCLEO Asana project gid** — `1214158831619829`, stored in `.claude/roadmap.json`. Locked because: `asana_sync.py` matches the project by gid; without this, it would either create a duplicate or fail to find the existing project

### Context

This is the close-out half of the same chat session as the IVA-1200 entry above. Two split entries (rather than one merged) because (a) the IVA-1200 entry was committed in PR #25 before the roadmap work started, and (b) the roadmap work is independent housekeeping rather than feature work. Ivan's next on-device step (OTA publish) is now formally tracked as IVA-1201.
