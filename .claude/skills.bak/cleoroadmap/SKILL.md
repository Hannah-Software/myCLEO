---
name: cleoroadmap
description: CLEO-specific session close-out — everything /roadmap does, plus charter-aware priority ranking, product ideas routed to future-CLEO-Product.md, charter-change proposals written to docs/CHARTER_PROPOSALS.md (never overwrites Charter or Spec), structured sessions row written to CLEO.db. Use in CLEO repo. Triggers on "cleoroadmap", "cleo roadmap", "cleo shipit", "close cleo session".
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
---

# CLEO Roadmap — Aggregate ideas, sync, ship, with CLEO governance

Superset of the generic `/roadmap` skill. Same Linear + Asana sync + commit + PR + merge flow, but with:
- Charter-aware priority ranking (Order of Precedence applied)
- Product-tagged ideas routed to `future-CLEO-Product.md` instead of Linear
- Implied charter/spec changes routed to `docs/CHARTER_PROPOSALS.md` (never silently applied)
- Doppler config: `cleo/dev` (NOT `claude-code/prd`)
- Asana project: CLEO · Linear team: IVA
- Structured `sessions` DB row at session close

**Infrastructure Status:** ✅ All 20 projects fully synced across Doppler, Linear, and Asana. See `~/Github/claude-hub/infrastructure_audit.csv`.

**Integration Rule:** Use Linear API + Asana REST API + Gmail OAuth2 directly. MCP servers are fallback only.

---

## Phase 0: Pre-flight — CLEO-aware

**Abort if any of these fail.** CLEO must never run a roadmap sync against a system whose Prime Directive isn't locked in.

### 0a: Charter presence (NEW — CLEO-specific)
```bash
if [ ! -f "CLEO_CHARTER.md" ]; then
  echo "ABORT: CLEO_CHARTER.md is missing. Cannot sync roadmap without Prime Directive."
  exit 1
fi
grep -q "^**Version:**" CLEO_CHARTER.md || echo "WARN: CLEO_CHARTER.md has no version marker"
```

### 0b: Linear GraphQL API
Test Linear API connection using Doppler-injected LINEAR_API_KEY:
```bash
LINEAR_API_KEY=$(doppler secrets get LINEAR_API_KEY -p claude-code -c prd --plain 2>/dev/null)
if [ -z "$LINEAR_API_KEY" ]; then
  echo "Linear: DISCONNECTED"
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
- **Pass:** Print `Linear: Connected`
- **Fail:** Print error and exit. → Ask user whether to proceed without Linear sync.

### 0c: Asana REST script
Check in order: `scripts/asana_sync.py`, then `/home/ivanemadrigal/Github/claude-hub/scripts/asana_sync.py`.
```bash
python scripts/asana_sync.py --help 2>&1 || python /home/ivanemadrigal/Github/claude-hub/scripts/asana_sync.py --help 2>&1
```

### 0d: Doppler — CLEO config (CHANGED from generic)
```bash
doppler secrets get ASANA_PAT --plain -p CLEO -c dev > /dev/null 2>&1 \
  && echo "Doppler (CLEO/dev): OK" \
  || echo "Doppler (CLEO/dev): FAIL"
```
All secret lookups use `-p CLEO -c dev`, NOT `claude-code/prd`.

### 0e: GitHub CLI
```bash
gh auth status > /dev/null 2>&1 && echo "GitHub: OK" || echo "GitHub: NOT AUTH (PR ops will fail)"
```

### 0f: Config file
Read `.claude/roadmap.json`. Required:
```json
{
  "linear_team": "IVA",
  "linear_project": "CLEO",
  "asana_project_name": "CLEO",
  "artifact_dirs": ["docs/", "output/", "knowledge/"],
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
If missing, create interactively.

Print pre-flight summary. Abort if any critical check fails.

---

## Phase 1: Load config

Already validated in Phase 0. Use loaded config.

---

## Phase 2: Scan repo artifacts

Glob `artifact_dirs` for `artifact_extensions`. For each:
- HTML → `<title>` or first `<h1>`
- Markdown → first `# heading`
- Other → filename stem
- Read first 5 lines for context
- Record `{path, title, type, modified_date}`

Classify:
- **Plan** — filenames with `plan`
- **Analysis** — `analysis`, `gap`, `research`
- **Reference** — `SLA`, `matrix`, `manual`, `training`, `schema`
- **Report** — `report`, `summary`, `review`
- **Other** — rest

Print: `Found X artifacts (Y Plans, Z Analysis, ...)`.

---

## Phase 3: Fetch existing Linear issues

Use Linear GraphQL API to fetch all issues in CLEO project:
```bash
LINEAR_API_KEY=$(doppler secrets get LINEAR_API_KEY -p claude-code -c prd --plain 2>/dev/null)
TEAM_ID="0b354535-..."  # IVA team

curl -s -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  https://api.linear.app/graphql \
  -d "{\"query\":\"{ team(id: \\\"$TEAM_ID\\\") { projects(first: 100) { nodes { id name issues(first: 250) { nodes { id identifier title description labels { nodes { name } } } } } } } }\"}" \
  | jq '.data.team.projects.nodes[] | select(.name == "CLEO") | .issues.nodes'
```
Build lookup map: `{normalized_title -> {id, identifier, title, labels, description}}`.
Print: `Found X existing issues in Linear project "CLEO"`.

---

## Phase 4: Review current session work

- `git diff --name-only` for changed files
- Review conversation for: ideas, enhancements, plans, features, decisions
- For each identified idea, build:
  - `title`, `priority` (P0–P3), `type` (Feature / Improvement / Bug / Decision / **Product**)
  - `description`, `effort` (S/M/L/XL), `source`, `artifacts`, `deliverables`, `dependencies`
  - **NEW** `domain`: Health / Legal / Family / CLEO / Synaptic / Finance / Creative / Product

---

## Phase 4a: Charter-aware priority pass (NEW)

Apply Charter §4 Order of Precedence to re-rank ideas:

| Domain | Minimum priority floor |
|---|---|
| Health | P1 (never lower) |
| Legal | P0 if deadline ≤ 30 days, else P1 |
| Family | P1 |
| CLEO (60-day window work) | P1 |
| Synaptic | unchanged |
| Finance | unchanged |
| Creative / Product | P2 or lower; never P0 |

If the session's dominant work was Health/Legal/Family, and the generated idea priorities skew toward Synaptic/Creative, flag this to Ivan as a drift signal in the final report.

---

## Phase 4b: Route product ideas to future-CLEO-Product.md (NEW)

For every idea where `type == "Product"` OR `domain == "Product"` (e.g., distributable package, onboarding wizard, packaging architecture, config-driven refactor, separate product repo):

1. Do NOT create a Linear issue.
2. Do NOT create an Asana task.
3. Append to `future-CLEO-Product.md` under §4 "Feature Ideas":
   ```
   - YYYY-MM-DD · [area] · <short title>
     <Why it matters. What problem it solves. Rough scope.>
   ```
4. Print: `Appended product idea to future-CLEO-Product.md: "<title>"`.

This is the ONLY skill-level write to the product backlog. Charter and Spec are NEVER written by this skill.

---

## Phase 4c: Charter/Spec proposal detection (NEW)

For every idea, check if it implies a structural change to the Charter or System Spec. Triggers include:
- Changes to digest frequency or content
- Changes to email accounts list
- Changes to priority order / domains
- Changes to daemon cadence
- Changes to communication rules
- Changes to the 60-day window scope or success criteria

If detected:

1. Do NOT edit `CLEO_CHARTER.md` or `CLEO_SYSTEM_SPEC.md`.
2. Ensure `docs/CHARTER_PROPOSALS.md` exists; if not, create it with:
   ```markdown
   # Charter & System Spec Proposals

   Proposed changes to CLEO_CHARTER.md or CLEO_SYSTEM_SPEC.md. Each entry requires Ivan's review. Never auto-applied.

   ---
   ```
3. Append a block:
   ```markdown
   ## Proposal YYYY-MM-DD — <short title>

   **Target:** Charter §X and/or Spec §Y
   **Current:** <quote current wording>
   **Proposed:** <change>
   **Source:** <session context / quote from Ivan / observation>
   **Status:** Pending Ivan's review

   ---
   ```
4. Print: `Raised charter proposal: "<title>" → docs/CHARTER_PROPOSALS.md`.

---

## Phase 4d: Lit-repo update proposal detection (NEW)

CLEO never writes directly to `LIT/Docs/CASE_COMMAND_MASTER.md`. But CLEO sessions often surface facts, decisions, or insights that belong in that doc. This phase captures them as proposals for the next lit-repo session.

For every idea or session insight, check if it implies a change to the lit-repo Master Case Command doc. Triggers:

- New factual development on any case (Harris 2025-45729, Dallas DC-25-14737, Travelers, federal RICO)
- A decision that changes strategy, sequencing, or claim structure
- A discovered procedural issue (missed docket reset, stale notice, etc.)
- A new exhibit or evidence finding
- A ruling, order, or coordinator confirmation that updates case status
- Any rule/insight about how litigation work should be done

If detected:

1. Do NOT edit the lit-repo Master doc or any lit-repo file from CLEO.
2. Append a proposal block to `docs/LIT_UPDATE_PROPOSALS.md`:

   ```markdown
   ## Proposal YYYY-MM-DD — <short title>

   **Target section in Master doc:** <section name or "new section">
   **Source:** <CLEO session context, Linear issue, Ivan quote>
   **Content:**
   <the actual fact/decision/insight to fold in>
   **Status:** Pending lit-repo review

   ---
   ```

3. Print: `Raised lit-update proposal: "<title>" → docs/LIT_UPDATE_PROPOSALS.md`.

The next lit-repo Claude session's `/litstartup` reads `LIT_UPDATE_PROPOSALS.md` and folds pending items into the Master Case Command doc in place, then marks them `Status: Folded in YYYY-MM-DD`.

---

## Phase 4e: Update CLEO_OPERATIONS_STATE.md (NEW)

`docs/CLEO_OPERATIONS_STATE.md` is a **living doc** — updated in place each session, not appended.

After Phases 4a–4d settle, update the following sections of `CLEO_OPERATIONS_STATE.md` to reflect current reality:

- **Active Workstreams table:** refresh the "Top 3 Todos" column per workstream from the current Linear state (P0/P1 only, re-ranked per Phase 4a).
- **Active Cron Jobs:** re-run `crontab -l` and update if changed. Note anything removed or added this session.
- **Running Services:** update ports/hosts table if anything changed.
- **Recent Sessions:** prepend a one-line entry for the current session (keep only the last 5 shown).
- **Updated:** change the header date.

Preserve any manual edits by Ivan that don't conflict with factual updates. Do NOT wholesale replace the file.

Print: `Updated CLEO_OPERATIONS_STATE.md — <N> workstreams refreshed, <M> cron changes.`

---

## Phase 4f: Review pending Charter & Spec Proposals (NEW)

Charter Proposals (`docs/CHARTER_PROPOSALS.md`) and Lit-Update Proposals (`docs/LIT_UPDATE_PROPOSALS.md`) accumulate over sessions. They MUST be surfaced for Ivan's review at close-out — otherwise they rot.

### 4f.1: Surface pending Charter Proposals

Parse `docs/CHARTER_PROPOSALS.md` for entries with `**Status:** Pending Ivan's review`. For each:

```
─────────────────────────────────────────────────
PENDING CHARTER PROPOSAL — <date> — <title>
  Target: <Charter §X / Spec §Y>
  Why: <one-line summary>
  Risk if unapplied: <one-line>

  Action? [a]ccept (you edit Charter/Spec yourself now) /
          [r]eject (mark Status: Rejected with reason) /
          [d]efer (leave as Pending — re-surfaces next /cleoroadmap) /
          [s]kip all remaining
─────────────────────────────────────────────────
```

For each response:
- **accept** → wait for Ivan to make the manual edit (offer to open the file in the editor); then mark proposal `**Status:** Accepted YYYY-MM-DD — applied to Charter §X` in `CHARTER_PROPOSALS.md`.
- **reject** → mark `**Status:** Rejected YYYY-MM-DD — <reason>` in place.
- **defer** → leave as `Pending Ivan's review` (will re-surface next session).
- **skip all** → exit this sub-phase; remaining proposals stay Pending.

### 4f.2: Surface pending Lit-Update Proposals

Same flow against `docs/LIT_UPDATE_PROPOSALS.md` for entries marked `**Status:** Pending lit-repo review`. These don't get accepted/rejected by CLEO — they get **acknowledged** (you're aware they're queued for the next lit-repo session). Print:

```
PENDING LIT-UPDATE PROPOSALS (await /litstartup in LIT):
  - <date> — <title>
  - <date> — <title>
```

If any pending lit-update proposal is older than 7 days, flag YELLOW: `Lit proposal stale — open the lit repo soon.`

### 4f.3: Archive resolved proposals (compaction)

After 4f.1, move all entries with status `Accepted YYYY-MM-DD` or `Rejected YYYY-MM-DD` out of `docs/CHARTER_PROPOSALS.md` and append them to `docs/archives/charter-proposals-resolved.md` (create if missing). This keeps the live file short — only Pending entries remain, so the next `/cleostartup` doesn't re-load history.

Same for `LIT_UPDATE_PROPOSALS.md`: move `Folded` entries to `docs/archives/lit-update-proposals-folded.md`.

Print: `Archived <N> resolved proposals.`

### 4f.4: Final summary

```
Charter Proposals reviewed: <N>
  Accepted: <X>
  Rejected: <Y>
  Deferred: <Z>
Lit-Update Proposals acknowledged: <M> (still pending lit-repo session)
```

If `X > 0`, remind Ivan that Charter/Spec edits should be committed in a separate, manual commit (NOT bundled into the cleo-roadmap commit, per Phase 9a's never-stage rule).

---

## Phase 5: Create/update Linear issues

For each non-Product idea from Phase 4 (after Phase 4a re-ranking):

### 5a: Deduplication
Normalize title (lowercase, strip prefixes). Match against Phase 3 lookup: >70% word overlap OR same core concept.

### 5b: Duplicate found → merge
Use Linear GraphQL API to update:
```bash
LINEAR_API_KEY=$(doppler secrets get LINEAR_API_KEY -p claude-code -c prd --plain 2>/dev/null)
ISSUE_ID="<existing_issue_id>"

# Fetch current description
CURRENT_DESC=$(curl -s -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  https://api.linear.app/graphql \
  -d "{\"query\":\"{ issue(id: \\\"$ISSUE_ID\\\") { description } }\"}" \
  | jq -r '.data.issue.description // ""')

# Append new section
NEW_SECTION=$(cat <<'APPEND'
---
### Update from CLEO Session (YYYY-MM-DD)
**Source:** <where this came from>
**Additional context:** <new information>
**New artifacts linked:**
- [artifact_title](artifact_path)
APPEND
)
UPDATED_DESC="${CURRENT_DESC}${NEW_SECTION}"

# Update issue
curl -s -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  https://api.linear.app/graphql \
  -d "{\"query\":\"mutation { issueUpdate(id: \\\"$ISSUE_ID\\\", input: {description: $(echo "$UPDATED_DESC" | jq -R -s .)}) { issue { id } } }\"}" \
  | jq '.data.issueUpdate.issue'
```
Report: `Merged into IVA-XXX`.

### 5c: New → create
Use Linear GraphQL API to create issue:
```bash
LINEAR_API_KEY=$(doppler secrets get LINEAR_API_KEY -p claude-code -c prd --plain 2>/dev/null)
TEAM_ID="0b354535-..."  # IVA team
TITLE="[P#] <title>"
PRIORITY="2"            # 1=P0, 2=P1, 3=P2, 4=P3

# Build description template
DESCRIPTION=$(cat <<'DESC'
## <Title>

**Source:** <where from>
**Effort:** S / M / L / XL
**Domain:** <life domain>
**Session:** YYYY-MM-DD

### What
<1–3 sentences>

### Builds On
<existing components or "None (greenfield)">

### Deliverables
- <file paths, DB tables, pages>

### Dependencies
- Depends on: <...>
- Blocks: <...>

### Linked Artifacts
- [<title>](<relative_path>) — <brief description>
DESC
)

# Create issue via GraphQL
curl -s -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  https://api.linear.app/graphql \
  -d "{\"query\":\"mutation { issueCreate(input: {teamId: \\\"$TEAM_ID\\\", title: $(echo "$TITLE" | jq -R -s .), description: $(echo "$DESCRIPTION" | jq -R -s .), labelIds: [\\\"LABEL_ID1\\\", \\\"LABEL_ID2\\\"], priority: $PRIORITY}) { issue { id identifier title } } }\"}" \
  | jq '.data.issueCreate.issue'
```

For `type: Decision`, use this template instead:
```markdown
## Decision: <Title>

**Status:** Locked ✓ / Exploratory
**Session:** YYYY-MM-DD

### What Was Decided
<...>

### Alternatives Considered
- <A> — why rejected
- <B> — why rejected

### Rationale
<...>

### Artifacts
- [<name>](<path>)

### Settings Locked
- <setting>: `<value>` (<where stored>)
```

### 5d: Never silently skip
Every non-Product idea MUST be either Created or Merged. Print summary table.

---

## Phase 6: Asana sync — CLEO config

Script path: `scripts/asana_sync.py` OR `/home/ivanemadrigal/Github/claude-hub/scripts/asana_sync.py`.

Run with:
```bash
doppler run -p CLEO -c dev -- python <script_path> --json /tmp/asana_sync_<ts>.json
```

### 6a: Build JSON
- Group Linear issues into Sprint 1 (P0), Sprint 2 (P1), Sprint 3 (P2), Backlog (P3).
- Calculate sprint date ranges from today using `sprint_duration_weeks` config.
- Stagger tasks within sprint by effort: S=3d, M=7d, L=14d, XL=21d.
- Map priority: P0/P1 → high, P2 → medium, P3 → low.
- Never use past dates.

### 6b: Run sync
Idempotent create-or-update.

### 6c: Report
```
Asana Sync Complete:
  Project: "CLEO"
  Created: X tasks
  Updated: Y tasks
  URL: https://app.asana.com/0/<gid>
```

---

## Phase 7: Final report — with CLEO additions

```
## CLEO Roadmap Sync Complete

### Linear (team IVA, project CLEO)
| Action | Count |
|--------|-------|
| Created | X |
| Merged | Y |
| Total in project | Z |

### Asana (CLEO)
| Action | Count |
|--------|-------|
| Created | X |
| Updated | Y |
| URL | <url> |

### Artifacts
| Type | Count |
|------|-------|
| Plans | X |
| Analysis | Y |
| Reference | Z |
| Reports | W |

### Charter & Spec (NEW)
| Proposals raised | X |
| File | docs/CHARTER_PROPOSALS.md |

### Product Backlog (NEW)
| Ideas appended to future-CLEO-Product.md | Y |

### Drift signal (NEW)
<If Phase 4a detected drift toward non-priority domains, surface here>
```

---

## Phase 8: Confirm before commit

```
========================================
CLEO ROADMAP COMPLETE — READY TO COMMIT?
========================================

Linear: X created, Y merged
Asana: X created, Y updated
Charter Proposals: X raised (docs/CHARTER_PROPOSALS.md)
Product ideas appended: Y (future-CLEO-Product.md)

Files to commit:
  - WorkDoneSummary.md
  - docs/CHARTER_PROPOSALS.md (if updated)
  - future-CLEO-Product.md (if updated)
  - .claude/roadmap.json (if created/updated)
  - any new artifacts in docs/ knowledge/ output/

NOT committed (never auto-edited):
  - CLEO_CHARTER.md
  - CLEO_SYSTEM_SPEC.md

Proceed? (y/n)
```

If not `y`/`yes`: print cancellation message, exit without committing.

---

## Phase 9: Ship ops (commit → push → PR → merge)

Only if Phase 8 confirmed.

### 9a: Stage
```bash
git add WorkDoneSummary.md
[ -f docs/CHARTER_PROPOSALS.md ] && git add docs/CHARTER_PROPOSALS.md
git add future-CLEO-Product.md
[ -f .claude/roadmap.json ] && git add .claude/roadmap.json
git add docs/ knowledge/ output/ 2>/dev/null || true
```

**Explicitly NEVER stage:** `CLEO_CHARTER.md`, `CLEO_SYSTEM_SPEC.md`. If they appear modified, print a warning:
```
WARN: CLEO_CHARTER.md / CLEO_SYSTEM_SPEC.md has uncommitted changes.
These are governance files — edits should be intentional and manual.
Review with: git diff CLEO_CHARTER.md
If intentional, commit manually outside of /cleoroadmap.
```

### 9b: Commit
```bash
git commit -m "$(cat <<'EOF'
cleo-roadmap: sync Linear, Asana, and governance for current session

- Linear: X created, Y merged in CLEO project
- Asana: X created, Y updated
- Charter proposals raised: Z (see docs/CHARTER_PROPOSALS.md)
- Product ideas appended: W (see future-CLEO-Product.md)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### 9c: Branch + push
```bash
git checkout -b cleo-roadmap-<date>
git push -u origin cleo-roadmap-<date>
```

### 9d: PR
```bash
gh pr create --title "cleo-roadmap: sync session $(date +%Y-%m-%d)" --body "$(cat <<'EOF'
## Summary
CLEO session close-out. Synced Linear + Asana, captured charter proposals, routed product ideas to backlog.

## Governance integrity
- CLEO_CHARTER.md: untouched ✓
- CLEO_SYSTEM_SPEC.md: untouched ✓
- Any implied changes → docs/CHARTER_PROPOSALS.md

## Test plan
- [x] Pre-flight passed
- [x] Linear + Asana sync completed
- [x] Product ideas routed correctly
- [x] Charter proposals logged

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### 9e: Wait for CI
```bash
gh pr checks <number> --watch
```

### 9f: Merge
```bash
gh pr merge <number> --merge
```

### 9g: Return to main
```bash
git checkout main && git pull
git log --oneline -3
```

---

## Phase 11: Log work done

Append to `WorkDoneSummary.md` (create if missing with `# Work Done Summary` header):

```markdown
---

## YYYY-MM-DD — <Session title>

### Accomplishments
- ...

### Charter Proposals raised
- ...

### Product ideas appended
- ...

### Linear / Asana changes
- ...

### Key files changed
- ...

### Lessons learned
- ...
```

Keep to 10–20 lines.

**If `data/CLEO.db` exists with a `sessions` table:** also INSERT a row:
```sql
INSERT INTO sessions (started_at, ended_at, title, domain, summary, artifacts_json, linear_issues, asana_tasks)
VALUES (?, ?, ?, ?, ?, ?, ?, ?);
```
If the table doesn't exist yet (pre–Phase 1 of CLEO_BUILD_PLAN), skip with a single-line note: `Sessions DB table not yet built — skipping structured row.`

---

## Phase 13: Save approved plan to repo (NEW)

If an approved plan exists in `~/.claude/plans/`, copy it to `docs/plans/` in the repo:

```bash
# Find most recent plan file (ExitPlanMode creates: YYYY-MM-DD_*.md or hash_*.md)
PLAN_FILE=$(find ~/.claude/plans -maxdepth 1 -name "*.md" -type f -newer /tmp/roadmap_start.marker 2>/dev/null | sort -r | head -1)

if [ -n "$PLAN_FILE" ]; then
  # Create docs/plans/ if missing
  mkdir -p docs/plans
  
  # Copy with standardized name: YYYY-MM-DD_<title>.md
  TIMESTAMP=$(date +%Y-%m-%d)
  BASENAME=$(basename "$PLAN_FILE" .md)
  if [[ $BASENAME =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2} ]]; then
    # Already has date, keep as-is
    cp "$PLAN_FILE" "docs/plans/$BASENAME.md"
  else
    # Add date prefix
    cp "$PLAN_FILE" "docs/plans/${TIMESTAMP}_${BASENAME}.md"
  fi
  
  echo "✓ Saved plan: docs/plans/$(basename docs/plans/*.md)"
  git add docs/plans/
else
  echo "No approved plan found (or no ExitPlanMode in this session)"
fi
```

Commit the plan file as part of the PR (Phase 9a).

---

## Phase 12: Update memory

If any of the following occurred, save to `~/.claude/projects/-home-ivanemadrigal-Github-CLEO/memory/`:
1. New MCP server discoveries / tool workarounds
2. New API integrations or endpoints
3. Corrected assumptions (team names, project IDs, config values)
4. Stable patterns confirmed across sessions

Do NOT save: session-specific state, temp debugging context, anything already in CLAUDE.md or MEMORY.md.

---

## Important rules

1. **Charter and Spec are sacred.** Never auto-edit. Always route proposed changes to `docs/CHARTER_PROPOSALS.md`.
2. **Product ideas don't go to Linear.** They go to `future-CLEO-Product.md` §4. Product distribution is walled off during the 60-day window.
3. **Doppler is `CLEO/dev`.** Never `claude-code/prd` here.
4. **Asana is `CLEO` project.** Linear is team `IVA`.
5. **Pre-flight is mandatory.** If Charter is missing, abort. Prime Directive must be locked in before roadmap can run.
6. **Every idea gets an outcome.** Created in Linear, merged, routed to Product backlog, or raised as a Charter proposal. Never silently dropped.
7. **Dates always future.** Never create Asana tasks with past dates.
8. **API over UI.** Never tell the user to open Linear or Asana manually.
