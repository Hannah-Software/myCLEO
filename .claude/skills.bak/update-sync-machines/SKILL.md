---
name: update-sync-machines
description: Edit the /sync-machines skill, sync to all repos, and push. Use when the user says "update sync-machines", "edit sync-machines skill", or "add step to sync-machines".
allowed-tools: Bash, Read, Edit
---

# Update Sync-Machines: Edit the skill, sync everywhere, push (WSL2)

Allows editing the `/sync-machines` skill from any machine, then distributes the change to all repos and pushes to GitHub.

## Steps

### 1. Read the current skill
Use the Read tool to load:
```
~/Github/claude-hub/.claude/skills/sync-machines/SKILL.md
```
Show the current content to the user so they can confirm what to change.

### 2. Edit the skill
Apply the user's requested changes to:
```
~/Github/claude-hub/.claude/skills/sync-machines/SKILL.md
```
Use the Edit tool to make targeted changes. Show the diff to the user for confirmation.

### 3. Sync to all repos
```bash
SKILL=sync-machines
SOURCE=~/Github/claude-hub/.claude/skills/$SKILL
SYNCED=0

for repo in ~/Github/*/; do
  dest="${repo}.claude/skills/$SKILL"
  if [ -d "${repo}.claude/skills" ]; then
    mkdir -p "$dest"
    cp "$SOURCE/SKILL.md" "$dest/SKILL.md"
    SYNCED=$((SYNCED + 1))
  fi
done

mkdir -p ~/.claude/skills/$SKILL
cp "$SOURCE/SKILL.md" ~/.claude/skills/$SKILL/SKILL.md

echo "Synced sync-machines skill to $SYNCED repos + user-level"
```

### 4. Commit and push
```bash
cd ~/Github/claude-hub
git add .claude/skills/sync-machines/SKILL.md
git commit -m "chore: update sync-machines skill"
git push origin main
```

### 5. Confirm
Print a summary:
- What was changed (show the diff)
- How many repos were synced
- Commit SHA pushed (`git log --oneline -1`)
