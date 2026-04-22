---
name: summary
description: Print a structured summary of the current chat session to the screen. Use when the user says "summary", "recap", "what did we do", or "session recap". Does NOT write to any file.
allowed-tools: Bash, Read, Glob, Grep
---

# Session Summary — Screen Only

Print a structured summary of the current chat session directly to the screen. **Do NOT write to any file.** This is a read-only recap.

## Step 1: Gather Data

Run these commands to collect session metrics:

1. **PRs merged this session**: `gh pr list --state merged --limit 20 --json number,title,additions,deletions,changedFiles,mergedAt` — filter to PRs merged today (or since session start if known).
2. **Recent commits**: `git log --oneline -20` to identify which commits belong to this session.
3. **Per-PR stats**: For each PR, run `gh pr view <number> --json additions,deletions,changedFiles,title` to get exact line counts.
4. **Total lines in touched files**: `wc -l` on all files that were created or modified across the session's PRs.
5. **Test counts**: Check if tests were added by looking at test file diffs. Run `python -m pytest tests/ --co -q 2>/dev/null | tail -1` to get total test count if applicable.
6. **CI status**: Confirm all PRs passed CI by checking `gh pr view <number> --json statusCheckRollup`.

If no PRs or commits were made, base the summary on conversation context alone.

## Step 2: Determine Grouping

- If multiple PRs were **worked on together** (same feature, dependent changes), group them under one entry.
- If PRs were **independent** (different features, cleanup, docs), list them as separate sub-entries.
- Use your knowledge of the conversation to determine grouping.

## Step 3: Print to Screen

Output the summary using the exact format below. **Do NOT write to WorkDoneSummary.md or any other file.**

## Output Format

Print this markdown directly as your response:

```
---

## YYYY-MM-DD HH:MM AM/PM — <Short Session Title>

| Metric | Value |
|--------|-------|
| **Date/Time** | YYYY-MM-DD ~HH:MM AM/PM EST |
| **Session Title** | <Descriptive title of what was accomplished> |
| **Chat Messages** | <N> user prompts, <N> responses |
| **PRs Shipped** | #X, #Y, #Z (or "None") |
| **Commits** | <N> commits |
| **New Lines of Code** | +<additions> / -<deletions> (net <+/-net>) |
| **Files Touched** | <N> files |
| **New Tests Added** | <count> or "None" |
| **Tests in CI** | Yes/No — <details> |

### Scope

<1-2 sentence summary of what was tackled in this session and why.>

### Changes

#### PR #<N> — <PR title> (or "#### Direct commits" if no PR)
*<Note: e.g. "Main planned work" or "Independent fix">*

| File | Action | Lines |
|------|--------|-------|
| `path/to/file.py` | Created/Modified | <+N lines — brief description> |

**Stats:** +<additions> / -<deletions> across <N> files

### Verification

- <Test/check performed> — <result>

### Context

<1-2 sentences on how this session fits into the larger project.>
```

## Important Rules

- **NEVER write to any file.** This is screen-only output.
- Count chat messages by reviewing the conversation history (user prompts and your responses).
- If no PRs were shipped, note "No PRs" in the metrics and summarize the work from conversation context.
- If the session was research, planning, or discussion only, still produce the summary with what was discussed/decided.
- Format all numbers with commas for readability (e.g. 1,226 not 1226).
- Be thorough — include everything meaningful that happened in the session.
