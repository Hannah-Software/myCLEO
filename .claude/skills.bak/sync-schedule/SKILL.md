---
name: sync-schedule
description: Reconcile scheduled/boot tasks on this machine against manifests in claude-hub/schedule/. Use when the user says "sync schedule", "register cron", "update scheduled tasks", or after editing any schedule/*.yaml.
---

# /sync-schedule

Reads every `*.yaml` in `~/Github/claude-hub/schedule/` and ensures the
current machine has each applicable task registered in the right backend.

Idempotent. Safe to re-run any time.

## Flags

- (no flag): reconcile — register/update tasks. Never delete.
- `--prune`: also delete managed tasks no longer in any manifest. Confirm before deleting.
- `--list`: print the current managed inventory across both layers, no changes.
- `--discover`: scan Task Scheduler + crontab + systemd timers for unmanaged tasks and append them to `schedule/_inventory.md` for review.

## Steps

### 1. Identify machine

```bash
hostname  # e.g. ivanpersonal, naviai5
```

Skip any manifest whose `machines:` list is set and doesn't include this host.

### 2. Load manifests

For each `~/Github/claude-hub/schedule/*.yaml` (skip files starting with `_`):

- Parse YAML.
- Validate required fields: `name`, `target`, `trigger`, `command` (or `command_windows`/`command_wsl` when `target: both`).
- Tag the task description with `[managed-by:sync-schedule owner=<repo>]` so future runs (and `--prune`) can identify managed tasks.

### 3. Reconcile per backend

#### Windows (`target: windows` or `both`)

Use `powershell.exe -NoProfile -Command "Register-ScheduledTask ..."`.

- Trigger mapping:
  - `at-boot` → `New-ScheduledTaskTrigger -AtStartup`
  - `at-logon` → `New-ScheduledTaskTrigger -AtLogOn -User '<user>'`
  - `cron: "<expr>"` → translate to `-Daily` / `-Weekly` / `-Once -RepetitionInterval`. For arbitrary cron expressions, fall back to `-Once` with `-RepetitionInterval` (warn user).
  - `interval: 5m` → `-Once -RepetitionInterval (New-TimeSpan -Minutes 5)`
- Principal:
  - `run_as: s4u` → `-LogonType S4U` (no password, no user-profile resources)
  - `run_as: user` → `-LogonType InteractiveOrPassword` (will fail silently at boot without stored password — warn user to set via `Set-ScheduledTask` with `-User/-Password` or via Task Scheduler GUI)
  - `run_as: system` → `-User SYSTEM` (no WSL2 access)
- Always: `-Force` to overwrite, `-RunLevel Highest`.

#### WSL (`target: wsl` or `both`)

Write systemd units to `/etc/systemd/system/sync-schedule-<name>.service` (and `.timer` if scheduled).

- `at-boot` → `WantedBy=multi-user.target` in the `.service`; no timer.
- `cron: "<expr>"` → `.timer` with `OnCalendar=` (translate cron → systemd calendar syntax). Pair with the `.service`.
- `interval: <dur>` → `.timer` with `OnUnitActiveSec=`.

After writing: `sudo systemctl daemon-reload && sudo systemctl enable --now sync-schedule-<name>.{service|timer}`.

### 4. `--prune` behavior

- Windows: `Get-ScheduledTask | Where-Object Description -like '*[managed-by:sync-schedule]*'` → list those not in current manifests → confirm with user → `Unregister-ScheduledTask -Confirm:$false`.
- WSL: list `sync-schedule-*.{service,timer}` units → same logic → `systemctl disable --now <unit> && rm /etc/systemd/system/<unit>`.
- Crontab entries are NOT pruned automatically (this skill doesn't manage crontab — manifests replace crontab usage).

### 5. Report

Print a table:

```
Backend    Action     Task
---------  ---------  ----------------------
Windows    unchanged  WSL-Autostart
WSL        created    sync-schedule-gmail-token-check.timer
Windows    updated    DailySkillSync
```

End with: `<n> manifests reconciled. <m> managed tasks live on this machine.`

## Notes

- This skill does NOT modify crontab. Existing crontab entries should be migrated to manifests, then removed manually (or via `crontab -e`) once the systemd timer is verified working.
- Tasks not tagged `[managed-by:sync-schedule]` are never touched by `--prune`. Vendor tasks (Adobe, Microsoft, Intel, Realtek) are safe.
- For `run_as: user` on Windows that needs a stored password: print the exact `Set-ScheduledTask -User <user> -Password <prompt>` command for the user to run interactively.
