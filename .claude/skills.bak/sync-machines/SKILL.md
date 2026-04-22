---
name: sync-machines
description: Full machine synchronization — repos, MCP servers, skills, Doppler secrets, health checks, and cron jobs for WSL2. Use when the user says "sync machine", "setup machine", "sync-machines", or "bring this machine up to date".
allowed-tools: Bash
---

# Sync Machines: Full machine alignment (WSL2)

Orchestrate full machine synchronization so any WSL2 machine running Claude Code has identical repos, MCP servers, skills, secrets, and tooling.

**Prerequisites:** `claude-hub` must already be cloned to `~/Github/claude-hub`.

**GitHub dir:** `/home/ivanemadrigal/Github/`

## Steps — run in order

### 1. Clone missing repos
```bash
bash ~/Github/claude-hub/scripts/clone-missing.sh
```
This clones any repos from the canonical list that don't exist locally yet.

### 2. Pull all repos (git pull --ff-only)
Do NOT use hub-health.py (it crashes if the hub server is down). Pull all repos directly:

```bash
for dir in ~/Github/*/; do
  repo=$(basename "$dir")
  cd "$dir" 2>/dev/null || continue
  git rev-parse --git-dir &>/dev/null || continue
  git stash -q 2>/dev/null
  result=$(git pull --ff-only 2>&1)
  git stash drop -q 2>/dev/null
  if echo "$result" | grep -q "Already up to date\|Fast-forward"; then
    echo "  [OK]     $repo"
  elif echo "$result" | grep -qiE "error|fatal|conflict|Aborting"; then
    echo "  [WARN]   $repo — $(echo "$result" | grep -iE 'error|fatal' | head -1)"
  else
    echo "  [PULLED] $repo"
  fi
done
```

The `git stash` before each pull handles repos with local skill file changes (from sync-skills) without failing. Stash is dropped after pull since remote is canonical.

### 3. MCP server setup
Check `~/.claude.json` for the mcpServers block. If missing or incomplete, update it using Python:

```bash
python3 - << 'EOF'
import json, pathlib

config_path = pathlib.Path.home() / ".claude.json"
config = json.loads(config_path.read_text()) if config_path.exists() else {}

expected_servers = {
    "github": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": {"GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PAT}"}
    },
    "figma": {"type": "http", "url": "https://mcp.figma.com/mcp"},
    "taskmaster": {
        "type": "stdio", "command": "npx",
        "args": ["-y", "task-master-ai"], "env": {}
    },
    "sqlite": {
        "type": "stdio", "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-sqlite"], "env": {}
    },
    "playwright": {
        "type": "stdio", "command": "npx",
        "args": ["-y", "@anthropic-ai/mcp-server-playwright"], "env": {}
    },
    "sequential-thinking": {
        "type": "stdio", "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"], "env": {}
    },
    "memory": {
        "type": "stdio", "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-memory"], "env": {}
    },
    "puppeteer": {
        "type": "stdio", "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-puppeteer"], "env": {}
    },
    "linear": {
        "type": "stdio", "command": "npx",
        "args": ["-y", "@mseep/linear-mcp"],
        "env": {"LINEAR_API_KEY": "${LINEAR_API_KEY}"}
    },
    "filesystem": {
        "type": "stdio", "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/ivanemadrigal/Github"],
        "env": {}
    },
    "postgres": {
        "type": "stdio", "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-postgres"],
        "env": {"DATABASE_URL": "${DATABASE_URL}"}
    }
}

existing = config.get("mcpServers", {})
added = []
for name, cfg in expected_servers.items():
    if name not in existing:
        existing[name] = cfg
        added.append(name)

config["mcpServers"] = existing
config_path.write_text(json.dumps(config, indent=2))

if added:
    print(f"Added MCP servers: {', '.join(added)}")
else:
    print(f"All {len(existing)} MCP servers already configured")
EOF
```

**MCP servers managed:**
- Linear (`@mseep/linear-mcp`) — key from Doppler `claude-hub/prd`
- Postgres — connection string from Doppler `claude-hub/prd`
- GitHub, Filesystem, Memory, Sequential-Thinking, Puppeteer, Figma, Taskmaster, SQLite, Playwright

### 4. Sync skills to all repos
```bash
SOURCE=~/Github/claude-hub/.claude/skills
GITHUB_DIR=~/Github

for skill_dir in "$SOURCE"/*/; do
  skill=$(basename "$skill_dir")
  for repo in "$GITHUB_DIR"/*/; do
    dest="${repo}.claude/skills/${skill}"
    if [ -d "${repo}.claude/skills" ]; then
      mkdir -p "$dest"
      cp "$skill_dir/SKILL.md" "$dest/SKILL.md"
    fi
  done
done

# Also sync to user-level
mkdir -p ~/.claude/skills
for skill_dir in "$SOURCE"/*/; do
  skill=$(basename "$skill_dir")
  mkdir -p ~/.claude/skills/"$skill"
  cp "$skill_dir/SKILL.md" ~/.claude/skills/"$skill/SKILL.md"
done

echo "Skills synced: $(ls "$SOURCE" | wc -l) skills → $(ls "$GITHUB_DIR" | wc -l) repos + user-level"
```

### 4a. Verify Filesystem MCP paths
Confirm the filesystem MCP is pointing to `/home/ivanemadrigal/Github`:
```bash
python3 -c "
import json, pathlib
cfg = json.loads((pathlib.Path.home() / '.claude.json').read_text())
fs = cfg.get('mcpServers', {}).get('filesystem', {})
args = fs.get('args', [])
path = [a for a in args if a.startswith('/home')]
print('Filesystem MCP path:', path[0] if path else 'NOT SET')
"
```

### 5. Doppler secrets
Check if Doppler CLI is installed and authenticated:
```bash
doppler --version && doppler me 2>&1 | grep -E "NAME|WORKPLACE"
```

If not authenticated:
```bash
doppler login
```

Key Doppler projects that need setup: `claude-hub`, `opskpi`, `aipex-growth-agent`, `personal-agent`.

After login, verify critical secrets are accessible:
```bash
doppler secrets get LINEAR_API_KEY --project claude-hub --config prd --plain 2>&1 | head -c 20
doppler secrets get ASANA_PAT --project claude-hub --config prd --plain 2>&1 | head -c 20
```

### 6. Health check — verify key tools
```bash
echo "=== Tool Health Check ==="
echo -n "Node.js:     " && node --version 2>/dev/null || echo "MISSING — install via nvm"
echo -n "npm/npx:     " && npx --version 2>/dev/null || echo "MISSING"
echo -n "Python:      " && python3 --version 2>/dev/null || echo "MISSING"
echo -n "gh CLI:      " && gh auth status 2>&1 | grep "Logged in" | head -1 || echo "NOT AUTHENTICATED"
echo -n "Doppler:     " && doppler me 2>&1 | grep "NAVIAI5\|NAME" | head -1 || echo "NOT AUTHENTICATED"
echo -n "git:         " && git --version | head -1
echo -n "PM2:         " && pm2 list 2>/dev/null | grep -c "online" | xargs -I{} echo "{} apps online" || echo "NOT INSTALLED"
echo ""
echo "=== MCP Server Check ==="
for server in github figma taskmaster sqlite playwright sequential-thinking memory puppeteer linear filesystem postgres; do
  python3 -c "
import json, pathlib, sys
cfg = json.loads((pathlib.Path.home() / '.claude.json').read_text())
servers = cfg.get('mcpServers', {})
name = sys.argv[1]
print(f'  {name:25} {\"✓ configured\" if name in servers else \"✗ MISSING\"}')
" "$server"
done
```

### 7. Set up cron jobs (DailySkillSync + McpDoctorHealthCheck)
Register WSL cron jobs equivalent to the old Windows Task Scheduler jobs:

```bash
# Show current cron jobs
crontab -l 2>/dev/null | grep -E "sync-skills|mcp-doctor" && echo "Cron jobs already set" && exit 0

# Add cron jobs
(crontab -l 2>/dev/null; cat << 'CRON'
# DailySkillSync — runs at 6 AM, syncs skills from claude-hub to all repos
0 6 * * * SOURCE=~/Github/claude-hub/.claude/skills; for skill_dir in "$SOURCE"/*/; do skill=$(basename "$skill_dir"); for repo in ~/Github/*/; do dest="${repo}.claude/skills/${skill}"; [ -d "${repo}.claude/skills" ] && mkdir -p "$dest" && cp "$skill_dir/SKILL.md" "$dest/SKILL.md"; done; done >> ~/logs/skill-sync.log 2>&1

# McpDoctorHealthCheck — runs at 6:30 AM, verifies MCP servers are configured
30 6 * * * python3 ~/Github/claude-hub/scripts/mcp-doctor.py --fix --silent >> ~/logs/mcp-doctor.log 2>&1
CRON
) | crontab -

echo "Cron jobs registered:"
crontab -l | grep -E "DailySkillSync|McpDoctorHealthCheck|sync-skills|mcp-doctor" -A1
```

Create the logs directory if it doesn't exist:
```bash
mkdir -p ~/logs
```

### 8. Sync permissions and settings
Check that `~/.claude/settings.json` has the right permissions and model settings:

```bash
SETTINGS_FILE=~/.claude/settings.json
CANONICAL=~/Github/claude-hub/config/claude/settings.json

if [ -f "$CANONICAL" ]; then
  cp "$CANONICAL" "$SETTINGS_FILE"
  echo "Settings synced from canonical"
else
  # Create minimal settings if canonical doesn't exist
  cat > "$SETTINGS_FILE" << 'JSON'
{
  "model": "haiku",
  "permissions": {
    "allow": [
      "Read", "Edit", "Write", "Bash", "Agent",
      "mcp__github__*", "mcp__memory__*",
      "mcp__filesystem__*", "mcp__figma__*", "mcp__sequential-thinking__*",
      "mcp__puppeteer__*", "mcp__playwright__*", "mcp__postgres__*",
      "mcp__sqlite__*", "mcp__taskmaster__*"
    ]
  }
}
JSON
  echo "Created minimal settings.json"
fi
```

### 9. GitHub Actions self-hosted runner (optional — runs on Ivan_Personal only)
Skip this step on NAVIAI5. The self-hosted runner is registered on Ivan_Personal machine only.

To verify the runner is online:
```bash
gh api orgs/Hannah-Software/actions/runners \
  --jq '.runners[] | {name, status, labels: [.labels[].name]}' 2>&1 | head -20
```

## Summary output

After all steps, print a summary table:

```
Sync Machines Summary — WSL2 (NAVIAI5)
┌──────────────────┬──────────────────────────────────────────┐
│ Repos            │ X cloned, Y pulled, Z dirty              │
│ MCP Servers      │ 11 configured                            │
│ Skills           │ X synced to Y repos + user-level         │
│ Doppler          │ authenticated / needs setup               │
│ Cron Jobs        │ DailySkillSync + McpDoctorHealthCheck set │
│ Settings         │ synced                                    │
│ Runner           │ skipped (runs on Ivan_Personal)           │
└──────────────────┴──────────────────────────────────────────┘

Action items (if any):
  - doppler login  (if not authenticated)
  - Provide Linear API key, Postgres connection string
  - Run Gmail OAuth setup: python ~/Github/Personal-Agent/setup_gmail_oauth.py
```
