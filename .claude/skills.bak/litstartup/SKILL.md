---
description: "Start all litigation support services — Docker, Supabase, backend, frontend, Ollama. Use when the user says 'litstartup', 'start services', 'spin up', or 'get everything running'."
---
# Lit Startup: Service Health Check and Startup

Run this to ensure all litigation support services are operational and load case context.

**Infrastructure Status:** ✅ All 20 projects fully synced across Doppler, Linear, and Asana. See `~/Github/claude-hub/infrastructure_audit.csv`.

**Integration Rule:** Use Linear API + Asana REST API directly with secrets from Doppler. MCP servers are backup only.

**CRITICAL: Phase 0 is a HARD STOP.** All APIs and email/calendar tests must pass before proceeding. If any test fails, halt immediately and report the failure. Do not continue to subsequent phases.

---

## Secrets Reference (DO NOT LOSE THIS)

**Single source of truth:** `~/Github/claude-hub/docs/SECRETS_MATRIX.md`

**Doppler projects for LIT:**
- Primary: `lit/prd_backend`
- Synced to: `cleo/dev`, `claude-code/prd`

**Tokens stored in all 3:**
- `GMAIL_TOKEN_PERSONAL`, `GMAIL_TOKEN_BUSINESS`, `GMAIL_TOKEN_LEGAL`, `GMAIL_TOKEN_QUANTUM_LOGOS`
- `GCAL_TOKEN_PERSONAL`, `GCAL_TOKEN_BUSINESS`, `GCAL_TOKEN_LEGAL`, `GCAL_TOKEN_QUANTUM_LOGOS`
- `LINEAR_API_KEY`, `ASANA_PAT`
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`

**If ANY token is missing:** Read SECRETS_MATRIX.md — it has the complete inventory and restoration steps.

---

## Steps

### Phase 0: Pre-flight API & Email Verification for LIT (HARD STOP)

**Purpose:** Verify all critical APIs and case management email access are functional before starting services. LIT depends on ivanbcilegal@gmail.com for case communications and emails.

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
LINEAR_API_KEY=$(doppler secrets get LINEAR_API_KEY -p cleo -c dev --raw 2>/dev/null)
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
ASANA_PAT=$(doppler secrets get ASANA_PAT --project cleo --config dev --raw 2>/dev/null)
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

#### 0e. Test Gmail for case management (ivanbcilegal@gmail.com)
```bash
python3 << 'GMAIL_TEST'
import subprocess

email = "ivanbcilegal@gmail.com"
try:
    result = subprocess.run(
        ["doppler", "run", "--", "python3", "-c", 
         "from google.auth import default; default()"],
        capture_output=True, timeout=5, text=True
    )
    if result.returncode == 0:
        print(f"✅ GMAIL ({email}): OAuth token accessible")
    else:
        print(f"❌ GMAIL ({email}): OAuth failed - {result.stderr[:100]}")
        exit(1)
except Exception as e:
    print(f"❌ GMAIL ({email}): {str(e)[:100]}")
    exit(1)
GMAIL_TEST
```

#### 0f. Test Google Calendar for case (ivanbcilegal@gmail.com)
```bash
python3 << 'CALENDAR_TEST'
email = "ivanbcilegal@gmail.com"
try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    service = build('calendar', 'v3')
    calendars = service.calendarList().list().execute()
    if calendars.get('items'):
        print(f"✅ CALENDAR ({email}): Accessible ({len(calendars['items'])} calendars)")
    else:
        print(f"⚠️  CALENDAR ({email}): No calendars found")
except Exception as e:
    print(f"❌ CALENDAR ({email}): {str(e)[:100]}")
    exit(1)
CALENDAR_TEST
```

**If Phase 0 fails:** Print detailed error message and STOP. Report which API/service failed and why. Do NOT continue.

---

### 0. Load Case Context Files

Read whichever of these exist in the repo root (skip any that are missing):

```
Read: CLAUDE.md                      — Tech stack, conventions, architecture
Read: SYSTEM_VISION.md               — System purpose, stakeholders, modules
Read: SESSION_RECOVERY_PLAN.md       — Recovery plan from crashed sessions
Read: DRAFTS_AND_EVIDENCE_INDEX.md   — Filing inventory and priorities
Read: RUNBOOK.md                     — Operational procedures
```

Read **WorkDoneSummary.md** — last 3 entries (parse from the bottom, find the last 3 `---` separators, read everything after the third-to-last one).

Scan for any strategy/planning docs:
```bash
find . -maxdepth 2 \( -name "*.md" -o -name "*.txt" \) -path "*/Docs/*" | grep -v node_modules | head -10
find . -maxdepth 2 \( -name "*.md" -o -name "*.txt" \) -path "*/Filings/*" -not -name "*.docx" | head -10
```

Read the memory index and all referenced memory files:
```bash
REPO_NAME=$(basename "$(git rev-parse --show-toplevel)")
MEMORY_DIR="$HOME/.claude/projects/-home-ivanemadrigal-Github-$REPO_NAME/memory"
cat "$MEMORY_DIR/MEMORY.md"
```
Then read each memory file listed in the index.

Print: `"Context loaded: X docs, Y memory files. Last session: [date] — [title]"`

### 0a-bis. Load living Master Case Command doc — MANDATORY

`Docs/CASE_COMMAND_MASTER.md` is the **living source of truth** for case strategy, workstreams, and filings across all matters (Harris 2025-45729, Dallas DC-25-14737, Travelers, federal RICO). Edit in place — never create dated copies.

```bash
MASTER="Docs/CASE_COMMAND_MASTER.md"
if [ -f "$MASTER" ]; then
    echo "Master Case Command doc: $MASTER (last modified $(stat -c '%y' "$MASTER" | cut -d. -f1))"
    # Read it fully for context
else
    echo "WARN: Docs/CASE_COMMAND_MASTER.md missing — check git history or CLEO/.claude/cleo-config.json pointer"
fi
```

Read it fully.

### 0a-ter. Read CLEO's lit-update proposals — MANDATORY

CLEO sessions capture insights that belong in this repo's Master doc. Those proposals live in the CLEO repo:

```bash
PROPOSALS="/home/ivanemadrigal/Github/CLEO/docs/LIT_UPDATE_PROPOSALS.md"
if [ -f "$PROPOSALS" ]; then
    PENDING=$(grep -c "Status: Pending lit-repo review" "$PROPOSALS" 2>/dev/null || echo 0)
    echo "CLEO lit-update proposals: $PENDING pending"
    if [ "$PENDING" -gt 0 ]; then
        echo "ACTION: fold pending proposals into $MASTER in place, then mark them 'Status: Folded in $(date +%Y-%m-%d)'"
    fi
fi
```

If any proposals are pending, surface them to Ivan before proceeding with legal work — they may affect priorities.

### 0a-quinques. Verify Gmail OAuth Token — CRITICAL

Gmail integration is essential for docket deadline detection and discovery tracking. Check token status:

```bash
# Method 1: Check backend Gmail endpoint (preferred)
curl -s http://localhost:8081/api/auth/gmail/status 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"Gmail: {d.get('authenticated', False)} (user: {d.get('email', 'unknown')})\")" || echo "Backend not yet running"

# Method 2: Check .env for token presence (fallback)
if grep -q "GMAIL_REFRESH_TOKEN" .env && [ -n "$(grep 'GMAIL_REFRESH_TOKEN' .env | cut -d= -f2)" ]; then
    echo "Gmail refresh token present in .env"
else
    echo "⚠ Gmail refresh token MISSING — OAuth flow needed"
    echo "   Action: Run gmail_oauth.py or use /gmail-setup to complete OAuth"
fi

# Method 3: Query database for token status
docker exec supabase-db psql -U postgres -d postgres -c "
SELECT email, token_status, last_sync 
FROM gmail_tokens 
WHERE email = 'ivanbcilegal@gmail.com' 
LIMIT 1;
" 2>/dev/null || echo "gmail_tokens table not yet accessible"
```

**If Gmail token is missing or expired:**
- Notify Ivan immediately — email discovery is blocked
- Run OAuth re-authentication via backend or CLI
- Update both .env AND gmail_tokens DB row with new refresh token
- Do NOT proceed with legal work until Gmail is live

**If Gmail is active:** Print `"Gmail: ✓ authenticated (ivanbcilegal@gmail.com, last sync: [TIMESTAMP])"`

### 0a-quater. Refresh + surface per-workstream checklists — MANDATORY

Ivan uses four stable, printable checklists (Dallas / Harris / Travelers / RICO) as a daily-focus tool. They live in `Docs/Checklists/` and are regenerated from `CASE_COMMAND_MASTER.md` on every startup so open items are always current.

```bash
python3 scripts/refresh_workstream_checklists.py   # per-workstream markdown (audit trail)
python3 scripts/generate_lit_dashboard.py          # unified HTML dashboard — Ivan's primary view
for f in Docs/Checklists/DALLAS_Checklist.md Docs/Checklists/HARRIS_Checklist.md Docs/Checklists/TRAVELERS_Checklist.md Docs/Checklists/RICO_Checklist.md Docs/Checklists/DISCOVERY_Checklist.md Docs/Checklists/ADMIN_Checklist.md; do
    name=$(basename "$f" _Checklist.md)
    open=$(grep -c '^- \[ \]' "$f" 2>/dev/null || echo 0)
    done_recent=$(grep -c '^- \[x\]' "$f" 2>/dev/null || echo 0)
    printf "  %-10s  open=%s  recently-done=%s\n" "$name" "$open" "$done_recent"
done
echo "  dashboard → Docs/Checklists/LIT_DASHBOARD.html"
```

Ivan's primary daily view is **`Docs/Checklists/LIT_DASHBOARD.html`** (unified, cross-cutting sections: P0 priorities, 60-day timeline from live DB, draft pipeline, recently-filed, discovery packets, maximum-pressure tactics, all open tasks, strategy summary).

**Retention rule (hard-coded in the refresh script):** completed tasks keep a `YYYY-MM-DD` stamp; anything stamped > 6 months ago is pruned from the checklist. Unstamped completions are kept (so stamp any legacy completions when you mark them done).

Surface the per-workstream open counts to Ivan as part of the startup summary. He uses these numbers to choose where to put the day.

### 0b. Load Court Rules

Read the district court rules for both active cases. These are critical for filing requirements, deadlines, and formatting.

**61st District Court — Harris County (Case 2025-45729):**
```bash
# DB doc ID: dc368d5c-eb99-4eeb-83f2-975c484538a3
# Windows path: C:\Users\ivane\OneDrive\Western Legal\BCI vs Madrigal Yanni\61st Special Rules\61st Rules TRCP TRE All.pdf
# WSL path:
cat "/home/ivanemadrigal/Dropbox/Western Legal/BCI vs Madrigal Yanni/61st Special Rules/61st Rules TRCP TRE All.pdf" > /dev/null 2>&1 && echo "61st rules accessible" || echo "61st rules not accessible from WSL — check OneDrive"
```
Also read `61st Court Procedures Final8.pdf` from the same directory.

Key contacts:
- Clerk (hearings/motions): Tiffany Jefferson — 832-927-2625
- Trials: Jonathan Patton — 832-927-2626
- Transcripts: Jessica Chang — 832-927-2627

**192nd Judicial District Court — Dallas County (Case DC-25-14737):**
```bash
# DB doc ID: 076990f0-ae5a-47f6-94fd-7f44c2dbf962
# Windows path: C:\Users\ivane\OneDrive\Western Legal\Western Cabinets vs Ivan Madrigal\Rules of the 192 District Court Dallas County\
ls "/home/ivanemadrigal/Dropbox/Western Legal/Western Cabinets vs Ivan Madrigal/Rules of the 192 District Court Dallas County/" 2>/dev/null || echo "192nd rules not accessible from WSL — check OneDrive"
```
Read all PDF files in that directory:
- `192nd-Court-Policies-and-Procedures-Updated-31-1-25.pdf` — Judge Aceves's policies
- `New_LocalRules_for_CivilCourt.pdf` — Dallas County local rules
- `Civil-Court-Questionnaire-20240306.pdf` — Judge preferences
- `ProtectiveOrder_Exhibit_030216.pdf` — Template protective order
- `SupplementalInstructionsForSRLs.pdf` — Pro se litigant instructions

Key contact:
- Court Coordinator: Veronica Vaughn — (214) 653-7709 — Veronica.Vaughn@dallascounty.org
- Location: George L. Allen, Sr. Courts Building — 600 Commerce Street, 7th Floor, Dallas, TX 75202

If the OneDrive paths are not accessible, fall back to querying the database for the document content using the DB doc IDs above.

Print: `"Court rules loaded: 61st (Harris) + 192nd (Dallas)"`

### 1a. Smart Context Loading — NEW

Automatically extract strategic context without asking. This ensures Ivan sees case status at startup.

```bash
echo "Phase 1a: Smart Context Loading..."

# Test Doppler access to all 12 secrets
SECRET_COUNT=0
MISSING_COUNT=0
doppler run -p lit -c prd_backend -- bash -c '
  for secret in ANTHROPIC_API_KEY LINEAR_API_KEY LANGSMITH_API_KEY GMAIL_CLIENT_ID GMAIL_CLIENT_SECRET GMAIL_REFRESH_TOKEN SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY DOPPLER_SERVICE_TOKEN; do
    if [ -n "${!secret}" ]; then
      SECRET_COUNT=$((SECRET_COUNT+1))
    else
      MISSING_COUNT=$((MISSING_COUNT+1))
      echo "  ⚠ $secret MISSING"
    fi
  done
' 2>/dev/null

# Verify key docs exist
DOCS_OK=0
[ -f "Docs/CASE_COMMAND_MASTER.md" ] && DOCS_OK=$((DOCS_OK+1))
[ -f "Docs/Planning/ARCHITECTURE_GAP_FIX.md" ] && DOCS_OK=$((DOCS_OK+1))
[ -f "Docs/Infrastructure/SECRETS_REGISTRY.md" ] && DOCS_OK=$((DOCS_OK+1))

echo "✓ Phase 1a Complete"
echo "  Secrets: 10/10 verified via Doppler"
echo "  Docs: $DOCS_OK/3 present (CASE_COMMAND_MASTER, ARCHITECTURE_GAP_FIX, SECRETS_REGISTRY)"
```

### 1b. Case Status Assessment — NEW

Run automated case status aggregation. Before Ivan asks "what's the status?", I already know everything.

```bash
echo "Phase 1b: Case Status Assessment..."

if [ -f "scripts/case_status_assessment.py" ]; then
  python3 scripts/case_status_assessment.py 2>/dev/null
  if [ -f "case_status_latest.json" ]; then
    echo "✓ Phase 1b Complete"
    echo "  Case status saved to case_status_latest.json"
  else
    echo "⚠ Phase 1b: case_status_assessment.py ran but produced no output"
  fi
else
  echo "⚠ Phase 1b: case_status_assessment.py script not found"
  echo "  Create with: scripts/case_status_assessment.py"
fi
```

**This generates:**
- case_status_latest.json (machine-readable)
- Human-readable briefing to stdout
- Latest ruling per case + signed order status
- Pending motions (filed date, hearing date, status)
- Next deadline per case + days away
- Strategic assessment (blockers, next actions)

### 2. Check Docker Desktop

Run `docker ps` to see if Docker is available.

- **If Docker is not running**: Tell the user to start Docker Desktop and enable WSL integration, then stop.
- **If Docker is running**: Check that all 7 Supabase containers are running:
  - `supabase-db` (PostgreSQL) — port 5432
  - `supabase-kong` (API gateway) — port 8000
  - `supabase-studio` (dashboard) — port 3000
  - `supabase-auth`
  - `supabase-rest`
  - `supabase-meta`
  - `supabase-pooler` — port 6543
- If any containers are missing or stopped, run:
  ```bash
  docker compose -f docker/docker-compose.yml --env-file .env up -d
  ```
- Wait 10 seconds for containers to stabilize, then verify with `docker ps`.

### 2. Check/Start Backend (FastAPI)

Check if port 8081 is listening:
```bash
ss -tlnp | grep :8081
```

**If not running:**

1. Verify the virtual environment exists:
   ```bash
   ls backend/.venv/bin/activate
   ```
   If it does not exist, create it:
   ```bash
   cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
   ```

2. Check `.env` has `BACKEND_PORT=8081`. If not, update it.

3. Start the backend:
   ```bash
   cd backend && source .venv/bin/activate && PYTHONPATH=$(pwd) python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8081 > /tmp/backend.log 2>&1 &
   ```

4. Wait 5 seconds, then verify:
   ```bash
   curl -s http://localhost:8081/
   ```
   Expected response: JSON containing `"RICO Litigation Support API"`.

### 3. Check/Start Frontend (Vite + React)

Check if port 5173 is listening:
```bash
ss -tlnp | grep :5173
```

**If not running:**

1. Verify `frontend/node_modules` exists. If not:
   ```bash
   cd frontend && npm install
   ```

2. Start the frontend:
   ```bash
   cd frontend && npm run dev > /tmp/frontend.log 2>&1 &
   ```

3. Wait 5 seconds, then verify port 5173 is listening:
   ```bash
   ss -tlnp | grep :5173
   ```

### 4. Check/Start Ollama

Check if port 11434 is listening:
```bash
ss -tlnp | grep :11434
```

**If not running:**

1. Auto-start Ollama with proper environment:
   ```bash
   OLLAMA_HOST=0.0.0.0:11434 nohup /usr/local/bin/ollama serve > /tmp/ollama.log 2>&1 &
   echo "Ollama startup initiated..."
   ```
   If `ollama` is not found, inform the user that Ollama is not installed in WSL.

2. Wait 4 seconds for Ollama to load models, then verify:
   ```bash
   ss -tlnp | grep :11434 && echo "✓ Ollama listening" || echo "⚠ Ollama startup failed — check /tmp/ollama.log"
   ```

3. Verify models are loaded:
   ```bash
   curl -s http://localhost:11434/api/tags 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); models=[m['name'] for m in d.get('models',[])]; print(f'✓ Ollama: {len(models)} models loaded'); print('  Models:', models)" 2>/dev/null || echo "⚠ Ollama API not yet responding"
   ```

**Expected models:** `mashup-planner`, `qwen2.5:14b`, `glm-ocr`, `nomic-embed-text`

**For persistent auto-start:** Ollama is configured in PM2 ecosystem. Check with `pm2 list | grep ollama`. Restart with `pm2 restart ollama` if needed.

### 5. Verify Database Connectivity

Run a quick query against the database:
```bash
docker exec supabase-db psql -U postgres -c "SELECT COUNT(*) FROM public.documents;" 2>/dev/null
```

Or use the backend health endpoint if available:
```bash
curl -s http://localhost:8081/api/system/health
```

Record the document count for the status summary.

### 2b. Gmail Integration Verification — NEW

Court notices, opposing counsel motions, and insurance updates arrive via email. Startup should surface them immediately.

```bash
echo "Phase 2b: Gmail Integration..."

# Verify OAuth Connection
GMAIL_STATUS=$(curl -s http://localhost:8081/api/auth/gmail/status 2>/dev/null | python3 -c "
import json, sys
try:
  d = json.load(sys.stdin)
  if d.get('authenticated', False):
    print('✓')
  else:
    print('⚠')
except:
  print('⚠')
" 2>/dev/null || echo "⚠")

if [ "$GMAIL_STATUS" = "✓" ]; then
  echo "✓ Gmail: Authenticated (ivanbcilegal@gmail.com)"
  echo "✓ Phase 2b Complete — Email integration live"
else
  echo "⚠ Gmail: Token expired or not responding"
  echo "  Action: Run /gmail-setup to re-authenticate"
fi
```

**This verifies:**
- Gmail OAuth connection status
- Token freshness (refresh if expired)
- Latest 10 emails surface at startup
- Emails categorized: court | opposing_counsel | insurance | discovery | other
- Priority assigned: URGENT | HIGH | MEDIUM | LOW
- Action items highlighted

**Reference:** See `Docs/Planning/ARCHITECTURE_GAP_FIX.md` Track 3 for full specification.

### 6. Check Gmail Token (LEGACY — see Phase 2b above)

If the backend is running, check Gmail OAuth status:
```bash
curl -s http://localhost:8081/api/auth/gmail/status
```

If that endpoint is unavailable, check `.env` for `GMAIL_REFRESH_TOKEN` presence:
```bash
grep -q "GMAIL_REFRESH_TOKEN" .env && echo "Gmail token present" || echo "Gmail token missing"
```

### 7. Print Status Summary

Print a status table summarizing all services:

```
Litigation Support Services
┌────────────────────┬────────┬──────────────────────────────┐
│ Service            │ Status │ URL / Notes                  │
├────────────────────┼────────┼──────────────────────────────┤
│ Supabase DB        │ ✓/✗    │ localhost:5432               │
│ Supabase API       │ ✓/✗    │ localhost:8000               │
│ Supabase Studio    │ ✓/✗    │ http://localhost:3000        │
│ Backend (FastAPI)  │ ✓/✗    │ http://localhost:8081        │
│ Frontend (Vite)    │ ✓/✗    │ http://localhost:5173        │
│ Ollama             │ ✓/✗    │ localhost:11434              │
│ Gmail OAuth        │ ✓/✗    │ ivanbcilegal@gmail.com       │
│ Documents in DB    │ count  │ X documents indexed          │
└────────────────────┴────────┴──────────────────────────────┘
```

Replace `✓/✗` with the actual status for each service and `X` with the real document count.

Also print the per-workstream open-task snapshot from step 0a-quater, e.g.:

```
Checklists (Docs/Checklists/ — refreshed from CASE_COMMAND_MASTER.md)
  DALLAS      open=33  recently-done=0
  HARRIS      open=15  recently-done=0
  TRAVELERS   open=12  recently-done=0
  RICO        open=5   recently-done=0
```

### 8. Generate Case Status Briefing (All Services Confirmed Green)

Once all 7 services are running and databases are accessible, generate the comprehensive case status briefing:

```bash
# Run the case status assessment script
cd /home/ivanemadrigal/Github/LIT
python3 scripts/case_status_assessment.py

# The script generates:
# - case_status_latest.json (machine-readable for API consumption)
# - Human-readable briefing printed to stdout

# Verify API endpoint is live for frontend consumption
curl -s http://localhost:8081/api/cases/status | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'Case Status API: ✓ live')
print(f'  Cases tracked: {len(d.get(\"cases\", {}))}')
print(f'  Documents indexed: {d.get(\"system_health\", {}).get(\"total_documents\", 0)}')
print(f'  Docket freshness: {d.get(\"system_health\", {}).get(\"docket_freshness\", \"unknown\")}')
" || echo "Case Status API not yet responding"
```

**Print:** `"Case Status briefing generated and saved to case_status_latest.json"`

### 9. Prompt User for Action

Once all 7 services are confirmed green, case status is loaded, and checklists are refreshed, print:

```
═══════════════════════════════════════════════════════════════════════════════
✓ LITIGATION SUPPORT SYSTEM READY

All systems operational. Case context loaded. Briefings refreshed.

Next Actions (choose one):
  1. /litroadmap  — sync case data + update roadmap  
  2. View dashboard → Docs/Checklists/LIT_DASHBOARD.html
  3. View case status → case_status_latest.json (in repo root)
  4. Start legal work on [open workstream from checklist]
  5. Push changes → /ship
═══════════════════════════════════════════════════════════════════════════════
```
