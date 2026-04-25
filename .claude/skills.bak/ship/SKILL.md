---
name: ship
description: Commit, push, create PR, wait for CI, merge to main, and log work done. Use when the user says "ship it", "deploy", "push this", or asks to commit and merge.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# Ship: Commit → Push → PR → Merge → Log Work

Follow these steps exactly:

## Phase 1: Ship

1. **Check for changes**: Run `git status` and `git diff --stat` to see what changed.
2. **Stage files**: Add only the relevant changed files by name (never `git add .` or `git add -A`).
3. **Commit**: Write a clear commit message summarizing the changes. Always end with `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`.
4. **Create feature branch**: `git checkout -b <branch-name>` using a short descriptive name like `feat/description` or `fix/description`.
5. **Push**: `git push -u origin <branch-name>`.
6. **Create PR**: Use `gh pr create` with a title and body summarizing the changes.
7. **Wait for CI**: Run `gh pr checks <number> --watch` and wait for the required `test (3.14)` check to pass. Ignore `docker-build` failures.
8. **Merge**: Run `gh pr merge <number> --merge`.
9. **Return to main**: `git checkout main && git pull`.
10. **Confirm**: Show the user the merged PR URL and latest `git log --oneline -3`.

If there are no changes to commit, tell the user "Nothing to ship — working tree is clean." and skip all remaining steps.

## Phase 2: Log Work Done

After a successful merge, automatically run the `/workdone` skill to append a session summary to `WorkDoneSummary.md`. Follow the full workdone skill instructions (gather PR data, format entry, append to file, print to screen).
