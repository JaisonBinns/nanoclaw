#!/bin/bash
# NanoClaw auto-rebuild script
# Pulls latest code, rebuilds everything, restarts the service

set -e

LOG="/Users/macserver/nanoclaw/logs/rebuild.log"
PROJECT="/Users/macserver/nanoclaw"

echo "==============================" >> "$LOG"
echo "[$(date)] Starting rebuild..." >> "$LOG"

cd "$PROJECT"

# Pull latest changes
git pull >> "$LOG" 2>&1

# Install/update dependencies
npm install >> "$LOG" 2>&1

# Build TypeScript
npm run build >> "$LOG" 2>&1

# Rebuild agent container
./container/build.sh >> "$LOG" 2>&1

# Restart the service
launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist

echo "[$(date)] Rebuild complete" >> "$LOG"
