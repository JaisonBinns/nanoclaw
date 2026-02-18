---
name: apply-updates
description: Apply pending code updates from the repository to the local NanoClaw installation. Pulls latest changes, installs dependencies, rebuilds, and restarts the service.
---

# Apply Updates

This skill applies pending updates to the local NanoClaw installation. Use this after:
- Merging upstream changes into the fork
- Pushing new commits to the repository
- Making configuration changes that require a restart

## Quick Apply (Default)

Run all steps automatically:

```bash
cd ~/nanoclaw
git pull origin main
npm install
npm run build
./container/build.sh
```

Then restart the service:

```bash
launchctl kickstart -k gui/$(id -u)/com.nanoclaw
```

## Step-by-Step

### 1. Pull Latest Changes

```bash
cd ~/nanoclaw
git fetch origin
git status
```

Check if there are updates to pull:

```bash
git log HEAD..origin/main --oneline
```

If there are updates, pull them:

```bash
git pull origin main
```

### 2. Install Dependencies

If `package.json` or `package-lock.json` changed:

```bash
npm install
```

If `container/agent-runner/package.json` changed:

```bash
cd container/agent-runner && npm install && cd ../..
```

### 3. Build TypeScript

```bash
npm run build
```

Watch for compilation errors. Fix any issues before proceeding.

### 4. Rebuild Container (if needed)

If any of these changed, rebuild the container:
- `container/Dockerfile`
- `container/agent-runner/src/*.ts`
- `container/agent-runner/package.json`

```bash
./container/build.sh
```

**Note:** This must run on the host machine, not from inside a container.

### 5. Restart Service

```bash
launchctl kickstart -k gui/$(id -u)/com.nanoclaw
```

Or if using systemd:

```bash
systemctl --user restart nanoclaw
```

### 6. Verify

Check logs for successful startup:

```bash
tail -f ~/nanoclaw/logs/nanoclaw.log
```

Look for:
- "Database initialized"
- "Telegram bot connected" (or "Connected to WhatsApp")
- "NanoClaw running"

Send a test message to verify the agent responds.

## Troubleshooting

### Build Fails

Check TypeScript errors:

```bash
npm run build 2>&1 | head -50
```

Common fixes:
- Missing dependencies: `npm install`
- Type errors: Check the specific file and line mentioned

### Container Build Fails

```bash
./container/build.sh 2>&1 | tail -50
```

Common issues:
- Docker not running: Start Docker Desktop
- Disk space: `docker system prune -a`

### Service Won't Start

Check the error log:

```bash
cat ~/nanoclaw/nanoclaw-error.log
```

Or check launchd logs:

```bash
log show --predicate 'subsystem == "com.nanoclaw"' --last 5m
```

### Agent Not Responding

1. Check service is running: `launchctl list | grep nanoclaw`
2. Check logs: `tail -50 ~/nanoclaw/logs/nanoclaw.log`
3. Verify bot token: `grep TELEGRAM_BOT_TOKEN ~/nanoclaw/.env`
4. Test connection: Send `/ping` to the bot

## Rollback

If updates cause issues, rollback to previous commit:

```bash
cd ~/nanoclaw
git log --oneline -10  # Find the commit to rollback to
git reset --hard <commit-hash>
npm install
npm run build
./container/build.sh
launchctl kickstart -k gui/$(id -u)/com.nanoclaw
```

## Automated Updates

To enable automatic updates, the agent can:

1. Check for updates periodically via scheduled task
2. Pull and apply during low-activity periods
3. Notify the user of update results

Example scheduled task prompt:
```
Check if there are new commits in origin/main. If yes, pull, build, and restart.
Send a message summarizing what was updated.
```
