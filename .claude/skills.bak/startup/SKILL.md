---
name: startup
description: Session startup checklist — read context files, check repo health, sync with remote, verify services, and brief the user. Use when the user says "startup", "start session", "open up", "begin", or starts a new working session.
allowed-tools: Bash, Agent, Read, Glob, Grep
---

# Startup: New session initialization

Run this at the start of every working session. This skill is repo-agnostic — it detects the current repo and adapts.

**CRITICAL: Phase 0 is a HARD STOP.** All APIs and email/calendar tests must pass before proceeding. If any test fails, halt immediately and report the failure. Do not continue to subsequent phases.

---

## Infrastructure Status

**✅ All 20 projects fully synced:** Every repo now has Doppler, Linear, and Asana projects. See `~/Github/claude-hub/infrastructure_audit.csv` for complete audit.

---

## Secrets Reference (DO NOT LOSE THIS)

**Single source of truth:** `~/Github/claude-hub/docs/SECRETS_MATRIX.md`

**Doppler projects by repo:**
- `claude-hub`: project=`claude-hub`, config=`prd`
- `CLEO`: project=`cleo`, config=`dev` (imports from claude-hub/prd)
- `LIT`: project=`lit`, config=`prd_backend` (imports from claude-hub/prd)

**All tokens stored in claude-hub/prd and synced to all projects:**
- `GMAIL_TOKEN_PERSONAL`, `GMAIL_TOKEN_BUSINESS`, `GMAIL_TOKEN_LEGAL`, `GMAIL_TOKEN_QUANTUM_LOGOS`
- `GCAL_TOKEN_PERSONAL`, `GCAL_TOKEN_BUSINESS`, `GCAL_TOKEN_LEGAL`, `GCAL_TOKEN_QUANTUM_LOGOS`
- `LINEAR_API_KEY`, `ASANA_PAT`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`

**If ANY token is missing:** Read SECRETS_MATRIX.md — it has the complete inventory and restoration steps.

---

## Steps — run in order

### Pre-Phase 0: Load Doppler secrets into environment (REQUIRED)

This **MUST** run before Phase 0 tests access any environment variables.

Detects current repo and loads correct Doppler project/config with explicit flags.

```bash
#!/bin/bash
set -e

echo "Loading Doppler secrets into environment..."

# Detect current repo and determine Doppler project/config
REPO_NAME=$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")

case "$REPO_NAME" in
  claude-hub)
    DOPPLER_PROJECT="claude-hub"
    DOPPLER_CONFIG="prd"
    ;;
  CLEO)
    DOPPLER_PROJECT="CLEO"
    DOPPLER_CONFIG="dev"
    ;;
  LIT)
    DOPPLER_PROJECT="LIT"
    DOPPLER_CONFIG="prd_backend"
    ;;
  *)
    echo "❌ Unknown repo: $REPO_NAME"
    exit 1
    ;;
esac

echo "Detected: $REPO_NAME → Doppler project=$DOPPLER_PROJECT, config=$DOPPLER_CONFIG"

# Load all API tokens from Doppler into environment variables
# Use explicit -p and -c flags; doppler.yaml is fallback only
eval "$(doppler run -p "$DOPPLER_PROJECT" -c "$DOPPLER_CONFIG" -- env | grep -E '^(GMAIL_|GCAL_|LINEAR_|ASANA_|GITHUB_|ANTHROPIC_)' 2>/dev/null | sed 's/^/export /' || true)" 2>/dev/null

if [ -z "$LINEAR_API_KEY" ]; then
  echo "❌ FAILED: Doppler secrets not loaded. LINEAR_API_KEY is empty."
  echo "   Repo: $REPO_NAME, Project: $DOPPLER_PROJECT, Config: $DOPPLER_CONFIG"
  echo "   Verify Doppler authentication: doppler login"
  exit 1
fi

echo "✅ Doppler secrets loaded ($DOPPLER_PROJECT/$DOPPLER_CONFIG)"
```

### Phase 0: Pre-flight API & Email Verification (HARD STOP)

**Purpose:** Verify all critical APIs and email/calendar access are functional before starting any work. Repeated failures indicate configuration issues that must be resolved immediately.

**ENFORCEMENT:** Single consolidated script with `set -e` (exit immediately on ANY failure). No graceful degradation.

```bash
#!/bin/bash
set -e

echo "=== Phase 0: API Verification (HARD STOP) ==="
echo ""

# All Doppler secrets are already loaded from Pre-Phase 0 step
# (LINEAR_API_KEY, ASANA_PAT, GMAIL_TOKEN_PERSONAL, etc.)

echo "[1/4] Verifying Doppler..."
[ -n "$LINEAR_API_KEY" ] || { echo "❌ LINEAR_API_KEY not in environment"; exit 1; }
echo "✅ Doppler secrets present in environment"

echo "[2/4] Testing Linear API..."
curl -s -H "Authorization: $LINEAR_API_KEY" -H "Content-Type: application/json" \
  https://api.linear.app/graphql \
  -d '{"query":"{ viewer { id } }"}' | grep -q '"data"' || { echo "❌ LINEAR API unreachable or key invalid"; exit 1; }
echo "✅ Linear API: Connected"

echo "[3/4] Testing Asana REST API..."
[ -n "$ASANA_PAT" ] || { echo "❌ ASANA_PAT not in environment"; exit 1; }
curl -s -H "Authorization: Bearer $ASANA_PAT" \
  https://app.asana.com/api/1.0/users/me 2>&1 | grep -q '"data"' || { echo "❌ ASANA API unreachable or token invalid"; exit 1; }
echo "✅ Asana API: Connected"

echo "[4/4] Testing Gmail OAuth..."

#### 0e. Test Gmail OAuth2 (via Doppler tokens)
```bash
python3 << 'GMAIL_TEST'
import json, os
try:
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
except ImportError:
    print("❌ GMAIL: google-auth library not installed. Install: pip install google-auth-oauthlib google-api-python-client")
    exit(1)

# Test account(s) with tokens from Doppler
test_accounts = {
    "personal": ("ivan.e.madrigal@gmail.com", "GMAIL_TOKEN_PERSONAL")
}

for account_name, (email, token_env) in test_accounts.items():
    token_json = os.environ.get(token_env)
    if not token_json:
        print(f"❌ GMAIL ({email}): {token_env} not in environment")
        exit(1)
    
    try:
        token_data = json.loads(token_json)
        refresh_token = token_data.get("refresh_token")
        access_token = token_data.get("access_token")
        client_id = token_data.get("client_id") or os.environ.get("GMAIL_CLIENT_ID")
        client_secret = token_data.get("client_secret") or os.environ.get("GMAIL_CLIENT_SECRET")
        
        if not refresh_token:
            print(f"❌ GMAIL ({email}): refresh_token missing in {token_env}")
            exit(1)
        if not client_id or not client_secret:
            print(f"❌ GMAIL ({email}): GMAIL_CLIENT_ID/SECRET not found")
            exit(1)
        
        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret,
            scopes=["https://www.googleapis.com/auth/gmail.readonly"]
        )
        
        if not creds.valid:
            creds.refresh(Request())
        
        service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        result = service.users().getProfile(userId="me").execute()
        
        if result.get("emailAddress"):
            print(f"✅ GMAIL ({email}): Token valid, API accessible")
        else:
            print(f"❌ GMAIL ({email}): API returned no email")
            exit(1)
    except Exception as e:
        err = str(e)[:100]
        print(f"❌ GMAIL ({email}): {err}")
        exit(1)
GMAIL_TEST
```

#### 0f. Test Google Calendar access (via Doppler tokens)
```bash
python3 << 'CALENDAR_TEST'
import json, os
try:
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
except ImportError:
    print("⚠️  CALENDAR: google-auth library not installed (skipping gracefully)")
    exit(0)

# Test account(s) with tokens from Doppler
test_accounts = {
    "personal": ("ivan.e.madrigal@gmail.com", "GCAL_TOKEN_PERSONAL")
}

for account_name, (email, token_env) in test_accounts.items():
    token_json = os.environ.get(token_env)
    if not token_json:
        print(f"⚠️  CALENDAR ({email}): {token_env} not configured (skipping)")
        continue
    
    try:
        token_data = json.loads(token_json)
        refresh_token = token_data.get("refresh_token")
        access_token = token_data.get("access_token")
        client_id = token_data.get("client_id") or os.environ.get("GMAIL_CLIENT_ID")
        client_secret = token_data.get("client_secret") or os.environ.get("GMAIL_CLIENT_SECRET")
        
        if not refresh_token:
            print(f"⚠️  CALENDAR ({email}): No refresh token (skipping)")
            continue
        
        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret,
            scopes=["https://www.googleapis.com/auth/calendar.readonly"]
        )
        
        if creds.expired and refresh_token:
            creds.refresh(Request())
        
        service = build("calendar", "v3", credentials=creds, cache_discovery=False)
        calendars = service.calendarList().list(maxResults=1).execute()
        
        cal_count = len(calendars.get("items", []))
        print(f"✅ CALENDAR ({email}): Token valid, {cal_count} calendar(s) found")
    except Exception as e:
        err = str(e)[:100]
        print(f"⚠️  CALENDAR ({email}): {err} (graceful degradation)")
CALENDAR_TEST
```

**If Phase 0 fails:** Claude MUST:
1. Print the exact error (from script output)
2. Report which API/service is broken
3. **STOP IMMEDIATELY** — no Phase 1, Phase 2, or context file reading
4. **DO NOT generate new tokens** — troubleshoot Doppler instead

**Gmail Token Troubleshooting (DO NOT REGENERATE):**

If `GMAIL_TOKEN_PERSONAL`, `GMAIL_TOKEN_BUSINESS`, or `GMAIL_TOKEN_LEGAL` are missing/invalid:

```bash
# Check Doppler directly — do NOT run gmail_client.py auth
doppler secrets list -p cleo -c dev | grep GMAIL_TOKEN
doppler secrets get GMAIL_TOKEN_PERSONAL -p cleo -c dev
```

If tokens exist in Doppler but Phase 0 still fails:
- Check: `doppler setup` is linked to `cleo/dev`
- Check: Token format is valid JSON with `refresh_token` field
- Check: Sync status — tokens may not have propagated to claude-code/prd yet

**NEVER run `gmail_client.py auth` unless explicitly instructed by user.**

---

### 1. Identify the current repo

```bash
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
REPO_NAME=$(basename "$REPO_ROOT")
echo "Repo: $REPO_NAME ($REPO_ROOT)"
```

### 2. Read context files

Read whichever of these exist in the repo root. Do NOT fail if they're missing — just skip:

```
Read: CLAUDE.md              — Tech stack, conventions, architecture
Read: SYSTEM_VISION.md       — System purpose, stakeholders, modules (if exists)
Read: RUNBOOK.md             — Operational procedures (if exists)
```

**Read WorkDoneSummary.md — LAST 3 ENTRIES** (not just 50 lines). Parse from the bottom, finding the last 3 `---` separators, and read everything after the third-to-last one. This gives full context on recent sessions including decisions, artifacts, and locked settings.

Then scan for any strategy/planning docs in the repo root:

```bash
find "$REPO_ROOT" -maxdepth 2 \( -name "*.docx" -o -name "*.html" \) | grep -v node_modules | grep -v .venv | grep -v __pycache__ | head -10
```

### 2b. Read project memory files

Read the memory index and all referenced memory files:

```bash
MEMORY_DIR="$HOME/.claude/projects/-home-ivanemadrigal-Github-$REPO_NAME/memory"
```

1. Read `$MEMORY_DIR/MEMORY.md` (the index file)
2. For EACH memory file listed in the index, read it fully
3. Categorize what you find:
   - **Locked decisions** — settings confirmed as final (voice configs, design choices, architecture picks)
   - **Feedback rules** — user preferences on how to work (avoid X, always do Y)
   - **Project context** — ongoing work, goals, deadlines
   - **References** — pointers to external systems
4. Print: `"Active memories: X files (Y decisions locked, Z feedback rules)"`

### 2c. Scan for creative artifacts

Check for generated artifacts from previous sessions:

```bash
find "$REPO_ROOT" -type d -name "output" -o -name "artifacts" 2>/dev/null | head -5
find "$REPO_ROOT" \( -name "*.mp3" -o -name "*.mp4" -o -name "*.png" -o -name "*.wav" \) -not -path "*/node_modules/*" 2>/dev/null | wc -l
```

Print: `"Found X artifacts from previous sessions"` (if any)

### 2d. Synthesize context for the user

Summarize to the user: "Here's where we left off: [last session title + date]. Key decisions still active: [list locked settings/decisions from memory]. Recent work: [bullet list from last 1-2 WorkDone entries]."
If no WorkDoneSummary exists, say "No prior session log found — fresh start."

### 3. Check repo status

```bash
echo "=== Git Status ==="
git status --short
echo ""
echo "=== Current Branch ==="
git branch --show-current
echo ""
echo "=== Recent Commits ==="
git log --oneline -5
echo ""
echo "=== Uncommitted Changes ==="
git diff --stat
```

If there are uncommitted changes, ask the user whether to stash, commit, or continue.

### 4. Sync with remote

```bash
git fetch origin
git pull --ff-only origin "$(git branch --show-current)" 2>&1 || echo "WARN: Cannot fast-forward — may need merge or rebase"
```

### 5. Create a new working branch (optional)

Ask the user what they're working on today. Create a branch:
```bash
# Pattern: feat/<topic>, fix/<topic>, chore/<topic>
git checkout -b feat/<topic>
```
If the user says "just stay on main" or "continue where I left off", skip this step.

### 6. Check running services (if applicable)

Only run this if the repo has a `docker-compose.yml` or `Dockerfile`:

```bash
if [ -f "$REPO_ROOT/docker-compose.yml" ] || [ -f "$REPO_ROOT/docker/docker-compose.yml" ]; then
  echo "=== Docker Services ==="
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker not running"
fi
```

Check for common service ports if the repo has a backend/frontend:

```bash
echo ""
for port in 3000 5173 5174 8000 8080 11434; do
  if ss -tlnp 2>/dev/null | grep -q ":$port "; then
    echo "Port $port: LISTENING"
  fi
done
```

### 7. Dependency check

```bash
if [ -f "$REPO_ROOT/requirements.txt" ]; then
  echo "=== Python deps ==="
  python3 --version 2>/dev/null || echo "Python not found"
fi

if [ -f "$REPO_ROOT/package.json" ]; then
  echo "=== Node deps ==="
  node --version 2>/dev/null || echo "Node not found"
  if [ ! -d "$REPO_ROOT/node_modules" ]; then
    echo "WARN: node_modules missing — may need: npm install"
  fi
fi
```

### 8. Show startup summary

Print a summary table adapted to what was found:

```
Session Startup Summary
┌──────────────────┬──────────────────────────────────┐
│ Repo             │ <repo-name> (<branch>)           │
│ Status           │ clean / X uncommitted changes     │
│ Last Session     │ <date> — <title from WorkDone>    │
│ Key Decisions    │ <bullet list from last entry>     │
│ Locked Settings  │ <list from memory files>          │
│ Active Memories  │ X files loaded                    │
│ Artifacts        │ X files from prior sessions       │
│ Services         │ X containers / ports active       │
│ Dependencies     │ OK / missing                      │
└──────────────────┴──────────────────────────────────┘

Ready to work. What are we tackling today?
```
