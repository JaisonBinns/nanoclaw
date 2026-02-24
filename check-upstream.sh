#!/bin/bash
# Check for new upstream commits and notify via Telegram
# Runs on a cron schedule

PROJECT="/Users/macserver/self-hosted/nanoclaw"
LOG="$PROJECT/logs/upstream-check.log"
TELEGRAM_BOT_TOKEN="8473974448:AAGE9QmkLEcRBV_qvAgwMysg8mupZaufy6c"
TELEGRAM_CHAT_ID="6863995397"

cd "$PROJECT"

# Fetch upstream without merging
git fetch upstream >> "$LOG" 2>&1

# Count new commits on upstream/main since our main
NEW_COMMITS=$(git log HEAD..upstream/main --oneline 2>/dev/null | wc -l | tr -d ' ')

if [ "$NEW_COMMITS" -gt 0 ]; then
    SUMMARY=$(git log HEAD..upstream/main --oneline 2>/dev/null)

    echo "==============================" >> "$LOG"
    echo "[$(date)] $NEW_COMMITS new upstream commit(s):" >> "$LOG"
    echo "$SUMMARY" >> "$LOG"

    # Send Telegram notification
    MESSAGE="NanoClaw Upstream Update

${NEW_COMMITS} new commit(s) available:

${SUMMARY}

To merge: cd ${PROJECT} && git merge upstream/main"

    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        --data-urlencode "text=$MESSAGE" >> "$LOG" 2>&1

    echo "[$(date)] Telegram notification sent" >> "$LOG"
else
    echo "[$(date)] No new upstream commits" >> "$LOG"
fi
