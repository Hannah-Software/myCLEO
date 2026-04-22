---
name: sync-skills
description: Sync Claude Code skills from claude-hub repo to all local repos and user-level. Use when the user says "sync skills", "update skills", or "push skills".
allowed-tools: Bash
---

# Sync Skills: Push skills from claude-hub to all repos (WSL2)

Copy skills from the canonical source (`~/Github/claude-hub/.claude/skills/`) to every repo in `~/Github/` and to `~/.claude/skills/`.

## Steps

1. **Run the sync:**
```bash
SOURCE=~/Github/claude-hub/.claude/skills
GITHUB_DIR=~/Github
SYNCED=0
SKIPPED=0

for skill_dir in "$SOURCE"/*/; do
  skill=$(basename "$skill_dir")
  for repo in "$GITHUB_DIR"/*/; do
    dest="${repo}.claude/skills/${skill}"
    if [ -d "${repo}.claude/skills" ]; then
      mkdir -p "$dest"
      if ! diff -q "$skill_dir/SKILL.md" "$dest/SKILL.md" &>/dev/null 2>&1; then
        cp "$skill_dir/SKILL.md" "$dest/SKILL.md"
        SYNCED=$((SYNCED + 1))
      else
        SKIPPED=$((SKIPPED + 1))
      fi
    fi
  done

  # Also sync to user-level
  mkdir -p ~/.claude/skills/"$skill"
  cp "$skill_dir/SKILL.md" ~/.claude/skills/"$skill/SKILL.md"
done

echo "Sync complete: $SYNCED updated, $SKIPPED already current"
echo "Skills: $(ls "$SOURCE" | tr '\n' ' ')"
```

2. **Show the output** so you can see which repos were updated vs already current.

3. To sync a **single skill only**, run:
```bash
SKILL_NAME=ship   # change to the skill you want
SOURCE=~/Github/claude-hub/.claude/skills/$SKILL_NAME
for repo in ~/Github/*/; do
  dest="${repo}.claude/skills/$SKILL_NAME"
  [ -d "${repo}.claude/skills" ] && mkdir -p "$dest" && cp "$SOURCE/SKILL.md" "$dest/SKILL.md"
done
mkdir -p ~/.claude/skills/$SKILL_NAME
cp "$SOURCE/SKILL.md" ~/.claude/skills/$SKILL_NAME/SKILL.md
echo "Synced $SKILL_NAME to all repos"
```

4. To do a **dry run** (see what would change without changing it):
```bash
SOURCE=~/Github/claude-hub/.claude/skills
for skill_dir in "$SOURCE"/*/; do
  skill=$(basename "$skill_dir")
  for repo in ~/Github/*/; do
    dest="${repo}.claude/skills/${skill}/SKILL.md"
    if [ -f "$dest" ] && ! diff -q "$skill_dir/SKILL.md" "$dest" &>/dev/null; then
      echo "[WOULD UPDATE] $repo → $skill"
    elif [ ! -f "$dest" ] && [ -d "${repo}.claude/skills" ]; then
      echo "[WOULD ADD]    $repo → $skill"
    fi
  done
done
```
