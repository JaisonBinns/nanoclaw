#!/bin/bash
# Merge upstream changes, rebuild, and restart NanoClaw
# Triggered via webhook from the agent container

set -e

PROJECT="/Users/macserver/self-hosted/nanoclaw"
LOG="$PROJECT/logs/merge-upstream.log"
TELEGRAM_BOT_TOKEN="8473974448:AAGE9QmkLEcRBV_qvAgwMysg8mupZaufy6c"
TELEGRAM_CHAT_ID="6863995397"

send_telegram() {
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        --data-urlencode "text=$1" > /dev/null 2>&1
}

echo "==============================" >> "$LOG"
echo "[$(date)] Starting upstream merge..." >> "$LOG"

cd "$PROJECT"

# Fetch upstream
git fetch upstream >> "$LOG" 2>&1

# Check if there are updates
NEW_COMMITS=$(git log HEAD..upstream/main --oneline 2>/dev/null | wc -l | tr -d ' ')
if [ "$NEW_COMMITS" -eq 0 ]; then
    echo "[$(date)] No upstream changes to merge" >> "$LOG"
    send_telegram "No upstream changes to merge. Already up to date."
    exit 0
fi

SUMMARY=$(git log HEAD..upstream/main --oneline 2>/dev/null)

# Attempt merge
if ! git merge upstream/main >> "$LOG" 2>&1; then
    echo "[$(date)] Merge conflict detected, aborting" >> "$LOG"
    git merge --abort >> "$LOG" 2>&1
    send_telegram "Upstream merge failed due to conflicts. Merge aborted, no changes made.

Conflicting commits:
${SUMMARY}

Please merge manually:
cd ${PROJECT} && git merge upstream/main"
    exit 1
fi

echo "[$(date)] Merge successful, rebuilding..." >> "$LOG"

# Install dependencies
npm install >> "$LOG" 2>&1

# Build TypeScript
npm run build >> "$LOG" 2>&1

# Rebuild agent container
./container/build.sh >> "$LOG" 2>&1

# Restart the service
launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist

# Clean up the notification file
rm -f "$PROJECT/.upstream-update-available"

echo "[$(date)] Merge, rebuild, and restart complete" >> "$LOG"

send_telegram "Upstream merge complete! Merged ${NEW_COMMITS} commit(s):

${SUMMARY}

Rebuilt and restarted successfully."
