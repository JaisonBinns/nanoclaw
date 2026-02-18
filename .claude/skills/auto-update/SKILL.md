# /auto-update

Automatically check for and apply NanoClaw updates from the git repository.

## What This Does

Sets up a scheduled task that:
- Pulls latest changes from the git repository
- Runs `npm install` if package.json changed
- Runs `npm run build` to compile TypeScript
- Logs results and notifies on updates

## When to Use

Use this skill when you want NanoClaw to automatically update itself from the repository on a schedule (daily, hourly, etc).

## Usage

```
/auto-update [schedule]
```

**Parameters:**
- `schedule` (optional): How often to check. Default: daily at 3 AM
  - Examples: "daily", "hourly", "every 6 hours", "twice daily"

## Examples

### Example 1: Daily Updates (Default)

**Command:** `/auto-update`

**Result:** Checks for updates daily at 3 AM

### Example 2: Hourly Checks

**Command:** `/auto-update hourly`

**Result:** Checks for updates every hour

### Example 3: Twice Daily

**Command:** `/auto-update twice daily`

**Result:** Checks at 3 AM and 3 PM

## What It Does

1. **Git Pull:** Fetches latest changes from origin/main
2. **Check Changes:** Determines what files changed
3. **Install Dependencies:** Runs `npm install` if package.json/package-lock.json changed
4. **Build:** Runs `npm run build` to compile TypeScript
5. **Notify:** Sends update summary to main chat

## Schedule Reference

| Interval | Cron Expression | Description |
|----------|----------------|-------------|
| Hourly | `0 * * * *` | Every hour at :00 |
| Every 6 hours | `0 */6 * * *` | 4 times per day |
| Twice daily | `0 3,15 * * *` | 3 AM and 3 PM |
| Daily | `0 3 * * *` | Once per day at 3 AM |

## Implementation

The scheduled task runs this prompt:

```
Check for NanoClaw updates and apply them:

1. cd /workspace/project
2. Run: git fetch origin main
3. Check if there are new commits: git log HEAD..origin/main --oneline
4. If updates available:
   - Run: git pull origin main
   - Check what changed: git diff HEAD@{1} --name-only
   - If package.json or package-lock.json changed: npm install
   - Run: npm run build
   - Summarize changes from git log
   - Send notification: "🔄 NanoClaw updated: [summary of changes]"
5. If no updates:
   - Log: "No updates available"
   - Don't send notification (silent)

Use git config --global --add safe.directory if needed.
```

## Notification Examples

**When updates are available:**
```
🔄 NanoClaw Updated!

Changes:
- cd46bd7 Add message chunking for Telegram
- 1fe1046 Fix build.sh to use Docker

Files changed: 1
- npm install: Not needed
- Build: ✓ Successful

Ready to use new features!
```

**When no updates:**
No notification (silent check)

## Managing Auto-Update

**View scheduled task:**
```
List all scheduled tasks to find the auto-update task ID
```

**Pause updates:**
```
/pause-task [task_id]
```

**Resume updates:**
```
/resume-task [task_id]
```

**Cancel auto-update:**
```
/cancel-task [task_id]
```

## Important Notes

1. **Container rebuild:** Code updates require rebuilding the container image (`./container/build.sh`). The task cannot do this automatically since it runs inside a container. You'll need to manually run the build after updates.

2. **Silent when no updates:** The task only notifies when updates are found, not on every check.

3. **Safe directory:** The task automatically adds the project directory as a git safe directory if needed.

4. **Build errors:** If the build fails, you'll get a notification with the error details.

## Best Practices

- **Daily checks** are usually sufficient for a personal assistant
- **Hourly checks** if you're actively developing and want quick updates
- **Always review changes** before deploying to production
- **Test after updates** to ensure nothing broke

## Alternative: Manual Updates

You can also manually trigger updates anytime:

```
cd /workspace/project
git pull origin main
npm install
npm run build
```

Then rebuild the container on the host machine.
