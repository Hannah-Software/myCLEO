---
name: roadmap
description: End-to-end session close-out: scan repo artifacts, create/update Linear issues, sync to Asana with sprint dates, commit all changes, create PR, wait for CI, merge to main. Use when the user says "roadmap", "sync ideas to linear", "push enhancements", "aggregate ideas", "update linear backlog", "update roadmap", or when closing out a session.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
---

# Roadmap — Aggregate Ideas to Linear + Asana

Scan the repo for artifact files, review the current session's work, deduplicate against existing Linear issues, create/update Linear issues, and **always** sync to Asana with sprint sections and dated tasks for Gantt chart view.

**Infrastructure Status:** ✅ All 20 projects fully synced across Doppler, Linear, and Asana. See `~/Github/claude-hub/infrastructure_audit.csv` for audit.

---

## Phase 0: Pre-Flight Connectivity Check

**Run this FIRST before any other phase.** Verify all required tool connections are live. If any fail, report the failure and ask the user how to proceed before continuing.

### 0a: Linear REST API
Test Linear API connection using Doppler-injected LINEAR_API_KEY:
```bash
LINEAR_API_KEY=$(doppler secrets get LINEAR_API_KEY -p claude-code -c prd --plain 2>/dev/null)
if [ -z "$LINEAR_API_KEY" ]; then
  echo "Linear: DISCONNECTED — LINEAR_API_KEY not in Doppler"
  exit 1
fi
curl -s -H "Authorization: $LINEAR_API_KEY" -H "Content-Type: application/json" \
  https://api.linear.app/graphql \
  -d '{"query":"{ viewer { id } }"}' | grep -q '"data"' || {
  echo "Linear: DISCONNECTED — API key invalid or unreachable"
  exit 1
}
echo "Linear: Connected (API accessible)"
```
- **Pass:** Print `Linear: Connected (API accessible)`
- **Fail:** Print error and exit. → Ask user whether to continue without Linear sync or abort.

### 0b: Asana REST Script
Asana is synced via `asana_sync.py` (REST API), **not** via MCP. Check for the script in this priority order:
1. `scripts/asana_sync.py` in the current repo
2. `C:/GitHub/claude-hub/scripts/asana_sync.py` (canonical copy, always present after sync-machines)

Run: `python scripts/asana_sync.py --help 2>&1 || python C:/GitHub/claude-hub/scripts/asana_sync.py --help 2>&1`
- **Pass (either path):** Print `Asana: REST script ready (<path>)`
- **Fail (both missing):** Print `Asana: DISCONNECTED — asana_sync.py not found in repo or claude-hub.` → Ask user whether to continue without Asana sync or abort.

Also verify `ASANA_PAT` is set: `doppler secrets get ASANA_PAT --project claude-code --config prd --plain 2>/dev/null`
- If found: use `doppler run --project claude-code --config prd -- python <script_path> --json`
- If not found: check env var `ASANA_PAT` directly; if missing, warn and skip Asana sync.

### 0c: GitHub CLI
Run `gh auth status` via Bash.
- **Pass:** Print `GitHub: Authenticated as <username>`
- **Fail:** Print `GitHub: NOT AUTHENTICATED — git diff will still work but PR operations won't.` (non-blocking, continue)

### 0d: Config File
Read `.claude/roadmap.json`. Validate all required fields exist.
- **Pass:** Print `Config: Loaded (<linear_project> → <asana_project_name>)`
- **Fail:** Create interactively (ask user for team, project, Asana project name).

Print a summary block:
```
Pre-flight check:
  Linear:  OK
  Asana:   OK
  GitHub:  OK
  Config:  Loaded
Proceeding with full sync.
```

If any critical tool (Linear or Asana) is disconnected, stop and resolve before proceeding.

---

## Phase 1: Load Config

1. Already validated in Phase 0. Use the loaded config.
2. If Phase 0 created it interactively, re-read and confirm.

**Required config structure:**
```json
{
  "linear_team": "<team name>",
  "linear_project": "<project name>",
  "asana_project_name": "<asana project name>",
  "artifact_dirs": ["Docs/", "output/"],
  "artifact_extensions": [".html", ".md", ".txt", ".docx", ".pptx"],
  "priority_labels": {
    "P0": "P0 Critical",
    "P1": "P1 High",
    "P2": "P2 Medium",
    "P3": "P3 Low"
  },
  "sprint_duration_weeks": {
    "Sprint 1": 2,
    "Sprint 2": 4,
    "Sprint 3": 4,
    "Backlog": 8
  }
}
```

---

## Phase 2: Scan Repo Artifacts

1. Use `Glob` to find files in the configured `artifact_dirs` matching `artifact_extensions`.
2. For each file found:
   - **HTML**: Extract `<title>` tag content or first `<h1>` text as the artifact title.
   - **Markdown**: Read first `# heading` as the artifact title.
   - **Other** (.txt, .docx, .pptx): Use the filename (without extension) as the title.
   - Read the first 5 lines for a brief context summary.
   - Record: `{path, title, type, modified_date}`
3. Classify artifacts into categories:
   - **Plan** — filenames starting with `Plan_` or containing "plan"
   - **Analysis** — filenames starting with `Analysis_` or containing "analysis", "gap", "research"
   - **Reference** — filenames containing "SLA", "matrix", "manual", "training", "schema"
   - **Report** — filenames containing "report", "summary", "review"
   - **Other** — everything else
4. Print artifact summary: `Found X artifacts (Y Plans, Z Analysis, ...)`

---

## Phase 3: Fetch Existing Linear Issues

1. Query Linear API directly using GraphQL:
```bash
LINEAR_API_KEY=$(doppler secrets get LINEAR_API_KEY -p claude-code -c prd --plain 2>/dev/null)
ISSUES=$(curl -s -H "Authorization: $LINEAR_API_KEY" -H "Content-Type: application/json" \
  https://api.linear.app/graphql \
  -d '{"query":"{ team(id: \"0b354535-05b5-46cd-826e-d627e5cf0550\") { issues(first: 250, filter: {state: {type: {neq: \"cancelled\"}}}) { nodes { id identifier title labels { name } description } } } }"}')
```
2. Build a lookup map: `{normalized_title -> {id, identifier, title, labels, description}}`
   - Normalize: lowercase, strip `[P0-P3]` style prefixes, strip leading/trailing whitespace.
   - Parse from JSON using `jq` or Python.
3. Print: `Found X existing issues in Linear project "<name>"`

---

## Phase 4: Review Current Session Work

1. Run `git diff --name-only` to see files changed (unstaged + staged).
2. Run `git diff --cached --name-only` for staged-only changes.
3. Review the **conversation context** for:
   - Ideas or enhancements discussed
   - Plans created or approved
   - Features requested or designed
   - Problems identified that need solutions
4. Identify new artifacts created this session (new files in `artifact_dirs`).
5. Identify code written that represents new features (new `.py` files, new dashboard pages).
6. Build a list of **ideas** from this session, each with:
   - `title`: short descriptive name
   - `priority`: P0/P1/P2/P3 (based on urgency, executive mention, transcript frequency)
   - `type`: Feature / Improvement / Bug / **Decision**
   - `description`: what it is and why it matters
   - `effort`: S/M/L/XL
   - `source`: where the idea came from (conversation, transcript, code observation)
   - `artifacts`: list of related artifact file paths from Phase 2
   - `deliverables`: expected file paths, DB tables, etc.
   - `dependencies`: what it depends on or blocks
7. **Review conversation for CREATIVE & DESIGN DECISIONS:**
   - Voice/audio settings locked or changed
   - Visual design choices made (colors, layout, typography, presentation)
   - Brand alignment decisions
   - Architecture choices (which tool/API/approach was selected over alternatives)
   - Any "this is perfect", "lock it", or "that's the one" confirmations from the user
   - For each decision, capture as an idea with `type: Decision` and include:
     - What was decided and what alternatives were considered
     - Why this was chosen
     - Paths to any artifacts produced during the decision process
     - Whether the decision is `Locked` (confirmed final) or `Exploratory`

---

## Phase 5: Create/Update Linear Issues

For each idea from Phase 4:

### 5a: Deduplication Check
1. Normalize the idea title (lowercase, strip prefixes).
2. Compare against the Phase 3 lookup map.
3. **Match criteria**: >70% word overlap in title OR same core concept.

### 5b: If Duplicate Found → Merge
1. Use Linear GraphQL API to update the existing issue:
   ```bash
   LINEAR_API_KEY=$(doppler secrets get LINEAR_API_KEY -p claude-code -c prd --plain 2>/dev/null)
   ISSUE_ID="<existing_issue_id>"  # from Phase 3 lookup
   NEW_SECTION=$(cat <<'APPEND'
   ---
   ### Update from Terminal Session (YYYY-MM-DD)
   **Source:** <where this came from>
   **Additional context:** <new information>
   **New artifacts linked:**
   - [artifact_title](artifact_path)
   APPEND
   )
   
   # Fetch current description
   CURRENT_DESC=$(curl -s -H "Authorization: $LINEAR_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.linear.app/graphql \
     -d "{\"query\":\"{ issue(id: \\\"$ISSUE_ID\\\") { description } }\"}" \
     | jq -r '.data.issue.description // ""')
   
   # Append new section
   UPDATED_DESC="${CURRENT_DESC}${NEW_SECTION}"
   
   # Update issue
   curl -s -H "Authorization: $LINEAR_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.linear.app/graphql \
     -d "{\"query\":\"mutation { issueUpdate(id: \\\"$ISSUE_ID\\\", input: {description: $(echo "$UPDATED_DESC" | jq -R -s .)}) { issue { id identifier } } }\"}" \
     | jq '.data.issueUpdate.issue'
   ```
2. Report as: `Merged into IVA-XXX (existing: "<title>")`

### 5c: If New → Create
1. Use Linear GraphQL API to create issue:
   ```bash
   LINEAR_API_KEY=$(doppler secrets get LINEAR_API_KEY -p claude-code -c prd --plain 2>/dev/null)
   TEAM_ID="<team_id_from_config>"        # e.g., "0b354535-..."
   TITLE="[P#] <Short descriptive title>"
   PRIORITY="2"                            # 1=P0, 2=P1, 3=P2, 4=P3
   
   # Build description using template
   DESCRIPTION=$(cat <<'DESC'
   ## <Title>
   
   **Source:** <where this idea came from>
   **Effort:** S (1 session) | M (2-3 sessions) | L (4-5 sessions) | XL (6+ sessions)
   **Terminal:** <terminal identifier or session description>
   
   ### What
   <1-3 sentences describing the enhancement and why it matters>
   
   ### Builds On
   <List existing pages, pipelines, or components this leverages. "None (greenfield)" if new.>
   
   ### Deliverables
   - <file paths, DB tables, new pages>
   
   ### Dependencies
   - Depends on: <other enhancements or infrastructure needed first>
   - Blocks: <what can't start until this is done>
   
   ### Linked Artifacts
   - [<artifact_title>](<relative_path>) — <brief description>
   DESC
   )
   
   # Create issue via GraphQL mutation
   curl -s -H "Authorization: $LINEAR_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.linear.app/graphql \
     -d "{\"query\":\"mutation { issueCreate(input: {teamId: \\\"$TEAM_ID\\\", title: $(echo "$TITLE" | jq -R -s .), description: $(echo "$DESCRIPTION" | jq -R -s .), labelIds: [\\\"LABEL_ID1\\\", \\\"LABEL_ID2\\\"], priority: $PRIORITY}) { issue { id identifier title } } }\"}" \
     | jq '.data.issueCreate.issue'
   ```
   - **Labels:** Fetch label IDs from Phase 3 lookup or via: `curl -s -H "Authorization: $LINEAR_API_KEY" https://api.linear.app/graphql -d '{"query":"{ team(id: \"TEAM_ID\") { labels(first: 50) { nodes { id name } } } }"}'`
   - **Priority mapping:** `1` (P0 Urgent), `2` (P1 High), `3` (P2 Normal), `4` (P3 Low)
   - **Decision label:** If `type: Decision`, ensure `Decision` label exists in Linear team. Create if missing via labelCreate mutation.
2. If dependencies reference other issues, add relations via separate GraphQL mutations after creation.
3. Report as: `Created IVA-XXX: "<title>"`

**For `type: Decision` issues**, use this description template instead:

```markdown
## Decision: <Title>

**Status:** Locked ✓ / Exploratory
**Session:** <date>
**Terminal:** <terminal identifier>

### What Was Decided
<1-3 sentences describing the final choice>

### Alternatives Considered
- <option A> — <why rejected>
- <option B> — <why rejected>
- <option C> — <why rejected>

### Rationale
<why this choice was made — include user quotes if relevant>

### Artifacts
- [<name>](<path>) — <description>

### Settings Locked
- <setting>: `<value>` (<where stored>)
```

### 5d: Never Silently Skip
- Every idea MUST result in either a "Created" or "Merged into" action.
- Print a summary table after all issues are processed:

```
| Action | Issue | Title |
|--------|-------|-------|
| Created | IVA-XXX | [P1] New Enhancement |
| Merged into | IVA-YYY | [P0-3] Existing Enhancement |
| Created | IVA-ZZZ | [P2] Another Idea |
```

---

## Phase 6: Asana Sync

**Always execute this phase.** Asana is synced exclusively via `asana_sync.py` (REST API). Do NOT use Asana MCP tools.

### Locate the script
Use whichever path exists (check in this order):
1. `scripts/asana_sync.py` (current repo)
2. `C:/GitHub/claude-hub/scripts/asana_sync.py` (canonical, always present)

Run command: `doppler run --project claude-code --config prd -- python <script_path> --json <file.json>`

### 6a: Build the Project Structure JSON
1. Gather all Linear issues (Phase 3 list + newly created in Phase 5).
2. Group into sections by priority:
   - **Sprint 1 (P0 Critical)** — all P0-labeled issues
   - **Sprint 2 (P1 High)** — all P1-labeled issues
   - **Sprint 3 (P2 Medium)** — all P2-labeled issues
   - **Backlog (P3 Low)** — all P3-labeled issues
3. Calculate sprint date ranges from today:
   ```
   Sprint 1: today → today + sprint_duration_weeks["Sprint 1"] weeks
   Sprint 2: Sprint 1 end + 1 day → + sprint_duration_weeks["Sprint 2"] weeks
   Sprint 3: Sprint 2 end + 1 day → + sprint_duration_weeks["Sprint 3"] weeks
   Backlog:  Sprint 3 end + 1 day → + sprint_duration_weeks["Backlog"] weeks
   ```
4. Within each sprint, stagger task dates sequentially by effort:
   - **S**: 3-day window  **M**: 7-day  **L**: 14-day  **XL**: 21-day
5. Map priorities: P0/P1 → `"high"`, P2 → `"medium"`, P3 → `"low"`.
6. Build JSON matching the `asana_sync.py` schema:
   ```json
   {
     "project_name": "<config.asana_project_name>",
     "sections": [
       {
         "name": "Sprint 1 — P0 Critical",
         "tasks": [
           {
             "name": "[P0] <title>",
             "description": "<Linear issue description>",
             "start_date": "YYYY-MM-DD",
             "due_date": "YYYY-MM-DD",
             "assignee": "me",
             "priority": "high"
           }
         ]
       }
     ]
   }
   ```
7. Write JSON to a temp file (e.g., `/tmp/asana_sync_<timestamp>.json`).

### 6b: Run the Sync
```bash
doppler run --project claude-code --config prd -- python <script_path> --json /tmp/asana_sync_<timestamp>.json
```
The script handles create-or-update idempotently — safe to re-run. It will:
- Create the project if it doesn't exist
- Create sections that don't exist
- Create tasks that don't exist
- Update tasks that already exist (by name match)
- Report created/updated counts and project URL

### 6c: Report Asana Results
Parse stdout from the script for the summary line and project URL. Print:
```
Asana Sync Complete:
  Project: "<name>"
  Created: X tasks
  Updated: Y tasks
  URL: https://app.asana.com/0/<project_gid>
```

### 6d: Report Asana Results
```
Asana Sync Complete:
  Project: "<name>" (GID: <gid>)
  Updated: X tasks
  Created: Y tasks
  Unchanged: Z tasks
  Orphaned: W tasks (no Linear match)
  URL: <project_url>
```

---

## Phase 7: Final Report

Print a complete summary to the screen:

```
## Roadmap Sync Complete

### Linear
| Action | Count |
|--------|-------|
| Issues Created | X |
| Issues Updated (Merged) | Y |
| Total in Project | Z |

### Artifacts
| Type | Count |
|------|-------|
| Plans | X |
| Analysis | Y |
| Reference | Z |
| Reports | W |
| Total Linked | N |

### Asana
| Action | Count |
|--------|-------|
| Tasks Updated | X |
| Tasks Created | Y |
| Tasks Unchanged | Z |
| Orphaned | W |
| Project URL | <url> |
```

---

## Phase 8: Ask For Confirmation Before Merging

Before committing and merging, ask the user to review the roadmap changes:

Print a summary block:
```
========================================
ROADMAP SYNC COMPLETE — READY TO COMMIT?
========================================

Linear Issues:
  Created: X
  Merged: Y
  Total in project: Z

Asana Tasks:
  Created: X
  Updated: Y
  Project URL: <url>

Artifacts Linked: X files

Files to Commit:
  - WorkDoneSummary.md
  - Any new artifacts in docs/output/
  - Any .claude/roadmap.json updates

Ready to:
  1. Commit changes
  2. Create PR
  3. Wait for CI
  4. Merge to main
  5. Return to main & pull latest

Proceed? (y/n)
```

Wait for user input. If user types anything other than `y` or `yes`:
- Print: `Commit cancelled. Changes are still staged. You can review and commit manually later.`
- Exit the skill without committing
- STOP HERE

If user confirms (y/yes):
- Proceed to Phase 9

---

## Phase 9: Ship Operations (Commit → Push → PR → Merge)

Only execute if user confirmed in Phase 8.

### 9a: Stage Files
```bash
git add WorkDoneSummary.md
git add .claude/roadmap.json (if it was created/updated)
git add docs/ (if new artifacts exist)
```

### 9b: Commit
```bash
git commit -m "$(cat <<'EOF'
roadmap: sync Linear issues and Asana tasks to current session

- Scanned repo artifacts and identified enhancements
- Created/updated Linear issues in "<project>" project
- Synced all issues to Asana with sprint sections and dated tasks
- Updated WorkDoneSummary.md with session accomplishments

Linear Issues: X created, Y merged
Asana Tasks: X created, Y updated
Project: <asana_project_name>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### 9c: Create Feature Branch
```bash
git checkout -b feat/roadmap-sync-<date>
git push -u origin feat/roadmap-sync-<date>
```

### 9d: Create PR
```bash
gh pr create --title "roadmap: sync Linear issues and Asana tasks" --body "$(cat <<'EOF'
## Summary
Synced session accomplishments and enhancements to Linear and Asana.

- Scanned repo artifacts
- Created/updated Linear issues
- Synced to Asana with sprint sections and date ranges

## Changes
- WorkDoneSummary.md updated with session summary
- Linear project updated with X new issues, Y merged
- Asana project updated with X tasks created, Y tasks updated

## Test Plan
- [x] Pre-flight checks passed
- [x] Linear GraphQL API functional
- [x] Asana REST script running
- [x] All artifacts scanned and linked
- [x] Dates calculated correctly for Asana sprints

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### 9e: Wait for CI
```bash
gh pr checks <number> --watch
```

Proceed only when all required checks pass.

### 9f: Merge to Main
```bash
gh pr merge <number> --merge
```

### 9g: Return to Main
```bash
git checkout main && git pull
```

Print:
```
✅ PR merged successfully
   URL: https://github.com/Hannah-Software/claude-hub/pull/<number>

Latest commits:
```
Then show `git log --oneline -3`

---

## Phase 11: Log Work Done

After the final report, append a session summary to `WorkDoneSummary.md` in the repo root.

1. If `WorkDoneSummary.md` doesn't exist, create it with a `# Work Done Summary` header.
2. Append an entry with today's date and:
   - **Accomplishments:** What was built, fixed, or discovered this session (bullet list).
   - **Lessons Learned:** Any debugging insights, gotchas, workarounds, or architectural decisions worth remembering (bullet list). Skip if nothing notable.
   - **Linear/Asana changes:** Summary of issues created/merged, Asana tasks updated.
   - **Key files changed:** List of important files added or modified.
3. Keep entries concise — 10-20 lines max per session.

---

## Phase 12: Update Memory

After logging work, check if any new knowledge should be persisted to auto-memory files (`~/.claude/projects/<project>/memory/`).

**Always save to memory if any of these occurred:**
1. **New MCP server discoveries** — new tool names, parameters that worked/failed, workarounds for MCP limitations.
2. **New API integrations** — API endpoints, auth methods, rate limits, or gotchas discovered.
3. **Corrected assumptions** — if a tool name, team name, project ID, or config value turned out to be different than expected.
4. **New project/repo naming** — cross-project naming conventions.
5. **Stable patterns** — recurring workflows, file paths, or conventions confirmed across multiple sessions.

**Do NOT save:** session-specific state, temporary debugging context, or anything already in CLAUDE.md or MEMORY.md.

Update existing memory entries rather than creating duplicates. Check `MEMORY.md` first.

---

## Important Rules

1. **Pre-flight check is mandatory.** Never skip Phase 0. If a tool is disconnected, address it before proceeding.
2. **Never silently skip ideas.** Every idea either creates a new issue or merges into an existing one. Always report the outcome.
3. **Never create duplicate Asana projects.** The `asana_sync.py` script handles this — it finds existing projects by name before creating.
4. **Never delete Asana tasks.** The script only creates and updates. Orphans are reported by name-match diff.
5. **Always include terminal identification** in Linear issue descriptions so cross-terminal contributions are traceable.
6. **Always link artifacts** from the repo when they're relevant to an issue.
7. **Respect the config file.** Use labels, sprint durations, and project names from `.claude/roadmap.json`.
8. **No MCP limits for Asana.** The REST script has no section or task limits. No batching needed.
9. **Dates must be future.** Never create Asana tasks with past dates. If recalculating, use today as the start.
10. **Asana credentials:** `ASANA_PAT` is in Doppler (`claude-code/prd`). Always use `doppler run` to inject it. Never hardcode.
11. **Use the API, not the user.** Never tell the user to "open Asana" or "open Linear" to do something the API can do. The whole point of this skill is automation.
