---
name: defect
description: Deep-dive defect investigation — root cause analysis, best-practice fix, alternative suggestions, and comprehensive test coverage pushed to CI. Use when the user says "defect", "investigate bug", "root cause", "fix defect", or describes a broken behavior to investigate.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent, WebSearch, WebFetch
---

# Defect Investigation & Resolution

When the user reports a defect (bug, unexpected behavior, ATTENTION flag, failing pipeline, etc.), follow ALL five phases below in order. Do not skip phases.

---

## Phase 1: Deep Dive — Understand the Code

1. **Identify the defect surface**: From the user's description, screenshot, error message, or log output, identify which file(s), function(s), and pipeline(s) are involved.
2. **Read all relevant code**: Read every file in the call chain — entry points, helpers, DB functions, tests. Do NOT propose changes to code you haven't read.
3. **Trace the data flow**: Follow the data from input → processing → output. Map the full execution path.
4. **Check recent changes**: Run `git log --oneline -20 -- <file>` on suspect files to see if a recent commit introduced the issue.
5. **Reproduce mentally**: From the code, explain exactly what the current behavior IS and what it SHOULD be.

**Output a "Deep Dive Summary"** before proceeding:
```
### Deep Dive Summary
- **Affected files**: <list>
- **Execution path**: <entry point → function chain → output>
- **Current behavior**: <what happens now>
- **Expected behavior**: <what should happen>
- **Suspect area**: <specific lines/functions>
```

---

## Phase 2: Root Cause Analysis

1. **Identify the root cause** — not just the symptom. Ask "why" at least 3 times (5-Whys technique).
2. **Classify the defect type**:
   - Logic error (wrong condition, off-by-one, missing edge case)
   - Data issue (wrong query, missing column, NULL handling)
   - Race condition / timing (async, stale data, lock contention)
   - Integration mismatch (API contract, schema drift, config)
   - Missing validation (boundary, type, empty input)
   - Performance (N+1 query, unbounded loop, memory)
3. **Check if the root cause affects other code paths** — search for the same pattern elsewhere.
4. **Determine blast radius**: What else could break if this is wrong? What depends on this code?

**Output a "Root Cause Report"**:
```
### Root Cause
- **Type**: <defect classification>
- **Root cause**: <precise explanation>
- **5-Whys chain**: Why 1 → Why 2 → Why 3 → ...
- **Blast radius**: <what else is affected>
- **Same pattern elsewhere**: <yes/no, where>
```

---

## Phase 3: Best-Practice Fix

1. **Research if needed**: Use `WebSearch` to find authoritative guidance for the specific issue type (e.g., official docs, known pitfalls, framework best practices).
2. **Apply the minimal correct fix**: Fix the root cause, not the symptom. Keep changes focused.
3. **Follow existing project conventions**: Match the codebase style, patterns, and architecture (check MEMORY.md and CLAUDE.md for locked decisions).
4. **Avoid introducing new problems**: No security vulnerabilities, no breaking changes, no unnecessary refactoring.
5. **Comment only where non-obvious**: If the fix involves a subtle gotcha, add a brief comment explaining WHY.

---

## Phase 4: Alternative Suggestions

Before finalizing, evaluate the fix and surrounding code:

1. **Is the code overly complex?** If yes, propose a simpler alternative.
2. **Is there a better pattern?** (e.g., replace manual loop with list comprehension, use built-in instead of hand-rolled)
3. **Is there a structural issue?** (e.g., function does too much, missing abstraction, wrong layer)
4. **Present alternatives as a table** if there are meaningful options:

```
### Alternatives Considered
| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| A: <minimal fix> | Low risk, small diff | Doesn't address structural issue | ✅ Recommended |
| B: <refactor> | Cleaner long-term | Larger change, more risk | Consider for follow-up |
| C: <different approach> | ... | ... | ... |
```

5. **If the current approach is fine**, say so — don't invent alternatives for the sake of it.

---

## Phase 5: Comprehensive Test Coverage + CI

Write tests that **prove the defect is fixed** and **prevent regression**. All tests MUST be runnable in CI (GitHub Actions with `doppler run -- python -m pytest`).

### Required Test Categories

1. **Negative tests** (the defect itself):
   - Reproduce the exact defect scenario as a test — it MUST fail before the fix and pass after.
   - Test edge cases around the defect (boundary values, empty inputs, NULLs, malformed data).

2. **Positive tests** (correct behavior):
   - Verify the happy path still works after the fix.
   - Test with representative real-world data.

3. **Integration tests** (component interactions):
   - Test the full call chain from entry point to output (mock external dependencies like DB, APIs).
   - Verify data flows correctly across function boundaries.

4. **Functional tests** (business requirements):
   - Verify the feature meets its business specification.
   - Test with the specific scenarios the user or product defines as "correct."

### Test Implementation Rules

- **Place tests** in the existing test file for the module, or create `tests/test_<module>.py` if none exists.
- **Use pytest** — match the project's existing test style (fixtures, parametrize, mock patterns).
- **Mock the database** — use `unittest.mock.patch` for DB calls. NEVER require a real DB connection.
- **Name tests descriptively**: `test_<function>_<scenario>_<expected_result>` (e.g., `test_health_check_low_row_count_returns_attention`).
- **Run the full test suite** after writing: `doppler run -- python -m pytest tests/ -x -q` to confirm nothing is broken.
- **Report test results** to the user:

```
### Test Results
- **New tests added**: <count> in `<file>`
- **Test categories**: <N> negative, <N> positive, <N> integration, <N> functional
- **Full suite**: <total> tests, <passed> passed, <failed> failed
- **CI ready**: Yes — all tests pass with `doppler run -- python -m pytest`
```

---

## Final Output

After all 5 phases, present a consolidated summary:

```
## Defect Resolution Summary

**Defect**: <one-line description>
**Root Cause**: <one-line root cause>
**Fix Applied**: <one-line fix description>
**Files Changed**: <list>
**Tests Added**: <count> (<N> negative, <N> positive, <N> integration, <N> functional)
**CI Status**: All tests passing
```

Then ask the user: **"Ready to ship? Say `/ship` to commit, push, PR, and merge."**
