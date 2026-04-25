---
name: cleostartup
description: CLEO-specific session startup — loads Charter + System Spec + Product Backlog + leadership/coaching framework, runs 4-account Gmail healthcheck, pulls calendar lookahead + financial pulse + sibling-repo context, surfaces open Linear/Asana tasks and unhandled ideas, synthesizes Top 5 priorities across all life domains, ends with the Prime Directive and a rotating principle. Use in CLEO repo instead of generic /startup. Triggers on "cleostartup", "cleo startup", "start cleo session", "open cleo", "CLEO-startup", "full life briefing".
allowed-tools: Bash, Agent, Read, Glob, Grep
---

# CLEO Startup — Session initialization for CLEO

Superset of the generic `/startup` skill with CLEO-specific context loading. Run this at the start of every working session in the CLEO repo. If you're in a different repo, use `/startup` instead.

**Infrastructure Status:** ✅ All 20 projects fully synced across Doppler, Linear, and Asana. See `~/Github/claude-hub/infrastructure_audit.csv`.

**Prime Directive must load every session.** This skill guarantees that.

**Integration Rule:** Use direct APIs (Linear GraphQL, Asana REST, Gmail OAuth2) instead of MCP servers. MCP is fallback only.

**CRITICAL: Phase 0 is a HARD STOP.** All APIs and email/calendar tests must pass before proceeding. If any test fails, halt immediately and report the failure. Do not continue to subsequent phases.

---

## Secrets Reference (DO NOT LOSE THIS)

**Single source of truth:** `~/Github/claude-hub/docs/SECRETS_MATRIX.md`

**Doppler projects for CLEO:**
- Primary: `cleo/dev`
- Synced to: `claude-code/prd`, `lit/prd_backend`

**Tokens stored in all 3:**
- `GMAIL_TOKEN_PERSONAL`, `GMAIL_TOKEN_BUSINESS`, `GMAIL_TOKEN_LEGAL`, `GMAIL_TOKEN_QUANTUM_LOGOS`
- `GCAL_TOKEN_PERSONAL`, `GCAL_TOKEN_BUSINESS`, `GCAL_TOKEN_LEGAL`, `GCAL_TOKEN_QUANTUM_LOGOS`
- `LINEAR_API_KEY`, `ASANA_PAT`
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`

**If ANY token is missing:** Read SECRETS_MATRIX.md — it has the complete inventory and restoration steps.

---

---

## Steps — run in order

### Phase 0: Pre-flight API & Email Verification for CLEO (HARD STOP)

**Purpose:** Verify all critical APIs and email/calendar access are functional before starting any work. CLEO depends on 4 email accounts; all must be accessible.

#### 0a. Test Doppler connectivity
```bash
doppler --version > /dev/null 2>&1 || {
  echo "❌ DOPPLER: Not installed or unavailable"
  exit 1
}
doppler me > /dev/null 2>&1 || {
  echo "❌ DOPPLER: Not authenticated. Run: doppler login"
  exit 1
}
echo "✅ DOPPLER: Connected"
```

#### 0b. Test Doppler secrets are accessible
```bash
doppler setup --no-interactive 2>&1 | grep "Linked project" > /dev/null 2>&1 || {
  echo "❌ DOPPLER PROJECT: Not linked. Run: doppler setup"
  exit 1
}
echo "✅ DOPPLER PROJECT: Linked"
```

#### 0c. Test Linear API
```bash
LINEAR_API_KEY=$(doppler secrets get LINEAR_API_KEY -p claude-code -c prd --plain 2>/dev/null)
if [ -z "$LINEAR_API_KEY" ]; then
  echo "❌ LINEAR_API_KEY: Not found in Doppler (claude-code/prd)"
  exit 1
fi
# CRITICAL FIX: Linear API uses raw key in Authorization header, NOT "Bearer" prefix
curl -s -H "Authorization: $LINEAR_API_KEY" https://api.linear.app/graphql \
  -d '{"query":"{ viewer { id } }"}' | grep -q '"data"' || {
  echo "❌ LINEAR API: Key invalid or API unreachable"
  exit 1
}
echo "✅ LINEAR API: Connected"
```

#### 0d. Test Asana PAT
```bash
ASANA_PAT=$(doppler secrets get ASANA_PAT --project claude-code --config prd --plain 2>/dev/null)
if [ -z "$ASANA_PAT" ]; then
  echo "❌ ASANA_PAT: Not found in Doppler"
  exit 1
fi
curl -s -H "Authorization: Bearer $ASANA_PAT" https://app.asana.com/api/1.0/users/me | grep -q '"data"' || {
  echo "❌ ASANA API: Token invalid or API unreachable"
  exit 1
}
echo "✅ ASANA API: Connected"
```

#### 0e. Test Gmail OAuth2 (all 4 CLEO accounts)
```bash
CLEO_ACCOUNTS=(
  "ivan.e.madrigal@gmail.com"
  "ivanbcilegal@gmail.com"
  "ivan.madrigal@synapticsystems.ai"
  "ivan.madrigal@quantum-logos.com"
)

for email in "${CLEO_ACCOUNTS[@]}"; do
  python3 << GMAIL_TEST 2>/dev/null || {
    echo "⚠️  GMAIL ($email): OAuth token missing or invalid"
    exit 1
  }
import subprocess
result = subprocess.run(
    ["doppler", "run", "--", "python3", "-c", 
     "from google.auth import default; default()"],
    capture_output=True, timeout=5, text=True
)
if result.returncode == 0:
    print(f"✅ GMAIL ($email): Accessible")
else:
    print(f"❌ GMAIL ($email): OAuth failed - {result.stderr[:100]}")
    exit(1)
GMAIL_TEST
done
```

#### 0f. Test Google Calendar access (all 4 CLEO accounts)
```bash
CLEO_ACCOUNTS=(
  "ivan.e.madrigal@gmail.com"
  "ivanbcilegal@gmail.com"
  "ivan.madrigal@synapticsystems.ai"
  "ivan.madrigal@quantum-logos.com"
)

for email in "${CLEO_ACCOUNTS[@]}"; do
  python3 << CALENDAR_TEST 2>/dev/null || {
    echo "⚠️  CALENDAR ($email): Not accessible"
  }
try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    service = build('calendar', 'v3')
    calendars = service.calendarList().list().execute()
    if calendars.get('items'):
        print(f"✅ CALENDAR ($email): Accessible ({len(calendars['items'])} calendars)")
    else:
        print(f"⚠️  CALENDAR ($email): No calendars found")
except Exception as e:
    print(f"❌ CALENDAR ($email): {str(e)[:100]}")
CALENDAR_TEST
done
```

**If Phase 0 fails:** Print detailed error message and STOP. Report which API/service failed and why. Do NOT continue.

---

### 1. Identify the current repo

```bash
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
REPO_NAME=$(basename "$REPO_ROOT")
echo "Repo: $REPO_NAME ($REPO_ROOT)"
```

If `$REPO_NAME` is not `CLEO`, warn the user: `/cleostartup is CLEO-specific; you appear to be in a different repo. Consider using /startup instead.`

### 2. Read standard context files

Read whichever of these exist in the repo root. Do NOT fail if missing:

```
Read: CLAUDE.md              — Tech stack, conventions, role instructions
Read: SYSTEM_VISION.md       — System purpose, stakeholders, modules (if exists)
Read: RUNBOOK.md             — Operational procedures (if exists)
```

**Leadership & coaching framework (skip silently if missing):**
```
Read: knowledge/leadership_principles.md   — Jobs, Collins, Drucker, Bossidy, Musk
Read: knowledge/coaching_standards.md      — CLEO's job description as Chief of Life Operations
Read: knowledge/goals.md                   — Ivan's short/medium/long-term life goals
```

**Read WorkDoneSummary.md — LAST 3 ENTRIES** (parse from bottom, find last 3 `---` separators).

**Read `docs/session-details/` — LAST 2 FILES** (sorted by filename = date). These capture the conversational nuance, push-backs, decisions reasoned through, and rejected paths that WorkDoneSummary strips out. If the directory or files don't exist, skip silently.

```bash
SESSION_DETAILS=$(ls -1 docs/session-details/*.md 2>/dev/null | sort | tail -2)
for f in $SESSION_DETAILS; do
  echo "Reading session detail: $f"
  cat "$f"
done
```

**Gap detection — MANDATORY, surface at TOP of brief if triggered:**

Cross-check `WorkDoneSummary.md` against `docs/session-details/`. For each of the last 3 WorkDone entries, parse the date heading (e.g. `## 2026-04-14 — ...`) and verify a matching `docs/session-details/YYYY-MM-DD.md` file exists.

```bash
# Extract last 3 dated headings from WorkDoneSummary
WD_DATES=$(grep -oE '^## [0-9]{4}-[0-9]{2}-[0-9]{2}' WorkDoneSummary.md 2>/dev/null | tail -3 | awk '{print $2}')
MISSING_DETAILS=""
for d in $WD_DATES; do
  [ -f "docs/session-details/${d}.md" ] || MISSING_DETAILS="$MISSING_DETAILS $d"
done
if [ -n "$MISSING_DETAILS" ]; then
  echo "🔴 SESSION-DETAIL GAP — no rich-text file for:$MISSING_DETAILS"
  echo "   Cause: /cleoroadmap didn't run at close-out (dropped connection, crash, or skipped)."
  echo "   Impact: WorkDone bullets survive but push-backs/rejected-paths/nuance are lost."
  echo "   Fix: ask Ivan to recall the missing day(s) OR reconstruct from git log + Linear diffs."
fi
```

**This MUST be surfaced at the top of the startup brief** when triggered — not buried at the end. A missing session-detail file is a memory-integrity failure, not a footnote.

The combination — Charter + Spec + WorkDoneSummary high-level + session-details rich-text — is CLEO's working memory until the proper `sessions` DB table is built (Phase 1, IVA-529).

### 2a. Read CLEO governance layer — MANDATORY

This is the step that guarantees the Prime Directive loads. Read in this exact order:

1. **`CLEO_CHARTER.md`** — always first. If missing, HALT the skill with an error: `CLEO_CHARTER.md is missing — system cannot run without Prime Directive. Restore from git or stop work.`
2. **`CLEO_SYSTEM_SPEC.md`** — operational mechanics. Warn if missing.
3. **`future-CLEO-Product.md`** — productization backlog (read last 20 lines to see what's been appended recently). Warn if missing.
4. **Legal plan — read from canonical litigation repo, not locally.**
   - Load `.claude/cleo-config.json` → `legal.canonical_repo` + `legal.canonical_plan`.
   - Check that `<canonical_repo>/<canonical_plan>` exists. If missing, warn: `Legal canonical plan not found at <path>. Update .claude/cleo-config.json.`
   - If the file is `.docx`, report only the filename + last-modified date (reading .docx in-session is heavy; defer to the litigation repo's own tools). If `.md`, read the file directly.
   - Compute staleness: if `last_modified` is older than `legal.stale_warning_days` (default 7), flag RED: `LEGAL PLAN STALE — <N> days since last edit. Open LIT.`
   - **Never duplicate the plan into CLEO.** The litigation repo is the single source of truth.

**Litigation dashboard — read P0 priorities and upcoming deadlines.**
   - Check for `~/Github/LIT/Docs/Checklists/LIT_DASHBOARD.html` (the unified case management dashboard).
   - If present, parse the HTML to extract:
     - All **P0 (urgent) tasks** across all workstreams with due dates
     - Upcoming court **deadlines** (next 14 days)
     - **Open task count** per workstream
     - **Last updated** timestamp
   - If any P0 is past due (due date < today), flag RED: `LEGAL P0 OVERDUE — <task> was due <N> days ago.`
   - Surface the next 3 legal deadlines in the Top 5 priorities synthesis (step 8f).
   - Print: `Legal dashboard: <N> P0 items, <N> deadlines next 14 days, last updated <date>.`
5. **`docs/CHARTER_PROPOSALS.md`** — if exists and has any proposals with status `Pending Ivan's review`, flag them prominently so Ivan doesn't miss them. **READ EVERY ENTRY** so CLEO knows what governance changes are pending and can avoid contradicting in-flight proposals.
6. **`docs/CLEO_BUILD_PLAN.md`** — read fully so CLEO knows current phase and what's next.
7. **`.claude/cleo-config.json`** — read to know all configured pointers (legal canonical plan, related repos, future API endpoints).

Print:
```
CLEO governance loaded:
  Charter: v<N> (last updated <date>)
  System Spec: v<N> (last updated <date>)
  Product Backlog: <N> ideas appended
  Build Plan: Phase <N> (<phase title>)
  Legal plan: <last-updated date or "not yet created">
  Pending Charter Proposals: <N> awaiting review
  Config pointers loaded: <count>
```

### 2a-bis. Write-targets registry — what CLEO writes to and where

Re-load into working memory the full list of files CLEO is allowed to write to, and the governance rule for each. This protects against forgetting that a file is governed.

| Path | Write rule |
|---|---|
| `CLEO_CHARTER.md` | NEVER auto-edit. Proposals → `docs/CHARTER_PROPOSALS.md` only. |
| `CLEO_SYSTEM_SPEC.md` | NEVER auto-edit. Proposals → `docs/CHARTER_PROPOSALS.md` only. |
| `future-CLEO-Product.md` | APPEND-ONLY. Never restructure. |
| `docs/CHARTER_PROPOSALS.md` | APPEND new proposals. Never delete past proposals. |
| `docs/CLEO_BUILD_PLAN.md` | EDIT freely (operational doc, not governance). |
| `WorkDoneSummary.md` | APPEND new session entries at the bottom. |
| `.claude/cleo-config.json` | EDIT pointer values (e.g., `legal.canonical_plan`) when Ivan supersedes a file. |
| Memory dir (`~/.claude/projects/.../memory/`) | EDIT freely. Update stale memories. Add new ones per the auto-memory system. |
| `data/CLEO.db` | Owned by CLEO daemon. Schema in `db/migrations/`. |

Print: `Write-targets registry loaded: <count> files governed.`

### 2a-ter. Inter-Repo Data Ownership reminder

CLEO is the integrator. Other repos OWN their data; CLEO QUERIES.

| Data type | Owner | CLEO behavior |
|---|---|---|
| Dockets, filings, court orders, evidence, privilege log | `LIT` | Query API at `localhost:8081`. Never duplicate. |
| Sales pipeline | `synaptic-systems-growth` | Query (Phase 8 of Build Plan). |
| Personal finance | `2026-Budget` | Query (Phase 0 of Build Plan). |
| KPI/ops capability proof | `OpsKPI` | Reference only. |

**If Ivan provides a doc that belongs to another repo's data type, CLEO ships it to that repo (per `feedback_ship_it_for_ingestion.md`) and points to it.**

### 2a-quat. Read operational state — MANDATORY

1. **`docs/CLEO_OPERATIONS_STATE.md`** — the living ops doc. Read fully. This captures: active workstreams + top 3 todos each, active cron jobs, running services, integration endpoints, Gmail accounts, recent sessions. Source of truth for "what's happening right now."
2. **`docs/LIT_UPDATE_PROPOSALS.md`** — if any pending proposals exist (look for `Status: Pending lit-repo review`), flag them prominently. These are insights CLEO captured that should be folded into the lit-repo Master Case Command doc on the next lit-repo session.

Print:
```
CLEO operational state loaded:
  Active workstreams: <N>  · Top todos surfaced from OPERATIONS_STATE
  Active cron jobs: <N>
  Running services: <N>
  Pending lit-repo proposals: <N>
```

### 2a-quint. Live system snapshot

Run quickly; non-fatal if any section fails:

```bash
echo "=== crontab ==="
crontab -l 2>/dev/null | grep -v "^#" | grep -v "^$" | head -10

echo "=== listening services (ports 3000 / 5173 / 8000 / 8081 / 11434 / 54321) ==="
for port in 3000 5173 5174 8000 8081 11434 54321; do
  ss -tlnp 2>/dev/null | grep -q ":$port " && echo "  port $port: LISTENING" || echo "  port $port: -"
done

echo "=== tmux sessions (on this host) ==="
tmux ls 2>/dev/null | head -5 || echo "  none"

echo "=== last CLEO healthcheck email ==="
ls -t data/healthchecks/*.html 2>/dev/null | head -1 | xargs -I{} stat -c "  %y  %n" {} 2>/dev/null || echo "  no prior healthcheck artifacts"
```

Flag anything that looks wrong (expected port not listening, stale healthcheck > 6 hours old, etc.).

### 2b. Read project memory files

```bash
MEMORY_DIR="$HOME/.claude/projects/-home-ivanemadrigal-Github-$REPO_NAME/memory"
```

1. Read `$MEMORY_DIR/MEMORY.md` (the index).
2. For EACH memory file listed, read it fully.
3. Categorize: locked decisions, feedback rules, project context, references.
4. Print: `Active memories: X files (Y decisions locked, Z feedback rules)`.

### 2c. Scan for creative artifacts

```bash
find "$REPO_ROOT" -type d \( -name "output" -o -name "artifacts" \) 2>/dev/null | head -5
find "$REPO_ROOT" \( -name "*.mp3" -o -name "*.mp4" -o -name "*.png" -o -name "*.wav" \) -not -path "*/node_modules/*" 2>/dev/null | wc -l
```

Print: `Found X artifacts from previous sessions` if any.

### 2d. Synthesize context for the user

Summarize: "Here's where we left off: [last session title + date]. Key decisions still active: [list locked settings]. Recent work: [bullet list from last 1-2 WorkDone entries]."

If no WorkDoneSummary, say: `No prior session log found — fresh start.`

### 2e. Healthcheck — 4 Gmail accounts, Doppler, Asana, Linear, GitHub

Run ALL healthchecks in parallel. Print a single status table at the end.

**Gmail — ALL 4 accounts via Doppler + scripts/gmail_client.py:**
```bash
for acct in personal business legal quantum-logos; do
  result=$(doppler run -p CLEO -c dev -- python3 scripts/gmail_client.py search "newer_than:1d" --account "$acct" --max 1 2>&1)
  if echo "$result" | grep -qiE "ERROR|invalid_grant|revoked|Exception|Traceback"; then
    echo "Gmail ($acct): FAIL — token expired or revoked"
  else
    echo "Gmail ($acct): OK"
  fi
done
```

> **NOTE:** Gmail MCP only supports the primary Google account. Always use Doppler-backed `gmail_client.py` for multi-account access.

**Doppler:**
```bash
doppler run -p CLEO -c dev -- printenv ASANA_PAT > /dev/null 2>&1 && echo "Doppler: OK" || echo "Doppler: FAIL"
```

**Asana REST API (NOT MCP):**
```bash
ASANA_PAT=$(doppler secrets get ASANA_PAT --plain -p CLEO -c dev 2>/dev/null)
if [ -n "$ASANA_PAT" ]; then
  status=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $ASANA_PAT" "https://app.asana.com/api/1.0/users/me")
  [ "$status" = "200" ] && echo "Asana API: OK" || echo "Asana API: FAIL (HTTP $status)"
else
  echo "Asana API: FAIL — no PAT in Doppler"
fi
```

**Linear API:**
```bash
LINEAR_KEY=$(doppler secrets get LINEAR_API_KEY --plain -p CLEO -c dev 2>/dev/null)
if [ -n "$LINEAR_KEY" ]; then
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: $LINEAR_KEY" -H "Content-Type: application/json" -d '{"query":"{ viewer { id } }"}' "https://api.linear.app/graphql")
  [ "$status" = "200" ] && echo "Linear API: OK" || echo "Linear API: FAIL (HTTP $status)"
else
  echo "Linear API: FAIL — no key in Doppler"
fi
```

**GitHub CLI:**
```bash
gh auth status > /dev/null 2>&1 && echo "GitHub CLI: OK" || echo "GitHub CLI: FAIL"
```

Print results as a table:
```
Integration Healthcheck
┌──────────────────────┬────────┐
│ Doppler              │ OK/FAIL│
│ Gmail (personal)     │ OK/FAIL│
│ Gmail (business)     │ OK/FAIL│
│ Gmail (legal)        │ OK/FAIL│
│ Gmail (quantum-logos)│ OK/FAIL│
│ Asana API            │ OK/FAIL│
│ Linear API           │ OK/FAIL│
│ GitHub CLI           │ OK/FAIL│
└──────────────────────┴────────┘
```

**If any check fails:** print the failure prominently and suggest the fix (e.g., `doppler run -p CLEO -c dev -- python3 scripts/gmail_client.py auth <account>` for expired Gmail).

### 3. Check repo status

```bash
echo "=== Git Status ==="; git status --short
echo "=== Current Branch ==="; git branch --show-current
echo "=== Recent Commits ==="; git log --oneline -5
echo "=== Uncommitted Changes ==="; git diff --stat
```

If there are uncommitted changes, ask the user: stash, commit, or continue.

### 4. Sync with remote

```bash
git fetch origin
git pull --ff-only origin "$(git branch --show-current)" 2>&1 || echo "WARN: Cannot fast-forward"
```

### 5. Optional new branch

Ask the user what they're working on today. If they want a branch:
```bash
git checkout -b feat/<topic>
```
If they say "stay on main" or "continue where I left off", skip.

### 6. Services check (if applicable)

```bash
if [ -f "$REPO_ROOT/docker-compose.yml" ] || [ -f "$REPO_ROOT/docker/docker-compose.yml" ]; then
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker not running"
fi
for port in 3000 5173 5174 8000 8080 11434; do
  if ss -tlnp 2>/dev/null | grep -q ":$port "; then echo "Port $port: LISTENING"; fi
done
```

### 7. Dependency check

```bash
[ -f "$REPO_ROOT/requirements.txt" ] && python3 --version 2>/dev/null
[ -f "$REPO_ROOT/package.json" ] && node --version 2>/dev/null
[ -f "$REPO_ROOT/package.json" ] && [ ! -d "$REPO_ROOT/node_modules" ] && echo "WARN: node_modules missing"
```

### 8. Repo health — CLEO specifics

Quick audit of the repos CLEO is supposed to be aware of (per `CLEO_SYSTEM_SPEC.md` §2):

```bash
for repo in Synaptic-Systems synaptic-systems-growth quantum-logos-studio 2026-Budget; do
  REPO_PATH="/home/ivanemadrigal/Github/$repo"
  if [ -d "$REPO_PATH" ]; then
    echo "$repo: present"
  else
    echo "$repo: MISSING — may need to clone"
  fi
done
```

Surface any missing repos in the startup summary.

### 8a. Task backlog snapshot

Pull active work so Ivan starts the session seeing what's open.

**Linear (team IVA) — grouped by workstream:** Use Linear GraphQL API to fetch issues:
```bash
LINEAR_API_KEY=$(doppler secrets get LINEAR_API_KEY -p claude-code -c prd --plain 2>/dev/null)
TEAM_ID="0b354535-..."  # IVA team

curl -s -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  https://api.linear.app/graphql \
  -d "{\"query\":\"{ team(id: \\\"$TEAM_ID\\\") { issues(first: 50, filter: {state: {neq: \\\"Done\\\"}}) { nodes { id identifier title priority state labels { nodes { name } } } } } }\"}" \
  | jq '.data.team.issues.nodes'
```
Group issues by workstream (infer from title prefix or label: Legal-Harris / Legal-Dallas / Legal-Travelers / CLEO / Synaptic / Health / Family / Other). Within each group, sort by priority. Print top 3 per workstream.

```
Open Linear (IVA) — per workstream:

Legal — Harris (top 3):
  IVA-XXX · [P0] ...
  ...
Legal — Dallas (top 3):
  ...
CLEO (top 3):
  ...
Synaptic (top 3):
  ...
(skip workstreams with zero open issues)
```

If the MCP has stale auth (seen after a Linear key rotation), fall back to a direct GraphQL curl using `LINEAR_API_KEY` from Doppler `CLEO/dev`.

**Also surface overdue items:** anything with a due date in the past gets flagged RED regardless of priority.

**Asana (CLEO project):** query open tasks via the Asana REST script. If `scripts/asana_sync.py --list-open` exists, use it. Otherwise call the API directly:
```bash
doppler run -p CLEO -c dev -- python3 -c "
import os, requests
pat = os.environ['ASANA_PAT']
# fetch open tasks in CLEO project; print top 5
"
```
Print top 5.

**Sessions DB (if exists):** if `data/CLEO.db` has a `sessions` table, print the last 3 rows (title + date). If table doesn't exist yet, print: `Sessions DB not yet built (Phase 1 of CLEO_BUILD_PLAN).`

**Ideas backlog (if exists):** if `data/CLEO.db` has an `ideas` table, print the top 10 rows where `status='new'`. Skip gracefully if not built.

### 8c. Sibling repo context (CLAUDE.md only — quick read)

Read each if present; skip silently if missing:
```
Read: ~/Github/LIT/CLAUDE.md   — litigation context, deadlines
Read: ~/Github/synaptic-systems-growth/CLAUDE.md — consulting pipeline
Read: ~/Github/2026-Budget/CLAUDE.md             — financial context
```

### 8d. Calendar lookahead (next 7 days)

Use the Google Calendar MCP if available:
```
gcal_list_events: timeMin=today, timeMax=today+7d, timeZone=America/Chicago, calendarId=primary
```

If MCP unavailable, note: `Calendar MCP not connected — re-auth needed`. Do not block startup on this.

### 8e. Financial pulse

```bash
git -C ~/Github/2026-Budget log --oneline -5 2>/dev/null || echo "2026-Budget repo not present"
```

Surface recent commits as a one-line activity signal. If `data/CLEO.db` ever exposes finance views, prefer those.

### 8f. Top 5 priorities — synthesis across all life domains

Synthesize EVERYTHING above (governance + ops state + emails + calendar + Linear + Asana + finance + lit-repo deadlines) into the **Top 5 most time-sensitive AND most important items**, applying the Charter §4 Order of Precedence:
1. Health & mental stability
2. Hard legal deadlines
3. Family / co-parenting / relationships
4. CLEO itself (60-day window)
5. Synaptic Systems revenue
6. Financial management
7. Creative / lower-priority

Present as a numbered list. Each item: deadline (if any) + recommended next action + which life domain. Push back if the Top 5 is dominated by low-leverage work while a higher-precedence item is sliding.

### 8b. Show startup summary

```
Session Startup Summary — CLEO
┌──────────────────┬──────────────────────────────────┐
│ Repo             │ CLEO (<branch>)                  │
│ Status           │ clean / X uncommitted             │
│ Last Session     │ <date> — <title>                  │
│ Governance       │ Charter v<N>, Spec v<N>           │
│ Pending Props    │ <N> charter proposals awaiting    │
│ Active Memories  │ X files                           │
│ Linear (IVA)     │ X open issues                     │
│ Asana (CLEO)     │ X open tasks                      │
│ Ideas backlog    │ X unhandled                       │
│ Related repos    │ <list any MISSING>                │
│ Integrations     │ <count OK / count FAIL>           │
└──────────────────┴──────────────────────────────────┘
```

### 9. Prime Directive reminder — always last

Print the following block verbatim, substituting today's rotating principle:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CLEO · Prime Directive (from Charter §1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Make Ivan's life measurably better across
  health, mind, family, legal, execution,
  and business — without becoming another
  system he has to manage.

  Today's principle (rotating):
  <one of §6.1–6.8 — pick based on day-of-year mod 8>

  Order of Precedence:
  1. Health & mental stability
  2. Hard legal deadlines
  3. Family, co-parenting, relationships
  4. CLEO itself (60-day window)
  5. Synaptic Systems revenue
  6. Financial management
  7. Creative / lower-priority projects

Ready to work. What are we tackling today?
```

**Principle rotation** (day-of-year mod 8):
- 0 → §6.1 Tell the truth
- 1 → §6.2 Protect the asset
- 2 → §6.3 Default to leverage
- 3 → §6.4 Reduce cognitive load
- 4 → §6.5 Close loops
- 5 → §6.6 Convert insight into action
- 6 → §6.7 Build memory on purpose
- 7 → §6.8 Favor systems over heroics

Compute with: `day_of_year=$(date +%j); echo $((10#$day_of_year % 8))`.
