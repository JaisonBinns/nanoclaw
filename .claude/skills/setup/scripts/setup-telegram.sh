#!/bin/bash
# Guide through Telegram bot setup

set -e

# Change to project root
cd "$(dirname "$0")/../../../../"

echo "=== Telegram Bot Setup ==="
echo ""
echo "To set up NanoClaw with Telegram:"
echo ""
echo "1. Open Telegram and search for @BotFather"
echo "2. Send: /newbot"
echo "3. Follow prompts to name your bot"
echo "4. Copy the bot token provided"
echo "5. Add to .env file: TELEGRAM_BOT_TOKEN=<your-token>"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "Creating .env file..."
  touch .env
fi

# Check if TELEGRAM_BOT_TOKEN is already set
if grep -q "TELEGRAM_BOT_TOKEN=" .env; then
  echo "TELEGRAM_BOT_TOKEN is already configured in .env"
  echo "STATUS: success"
  echo "MESSAGE: Telegram bot token already configured"
  exit 0
fi

echo "After you've added the token to .env, you're ready to go!"
echo ""
echo "STATUS: success"
echo "MESSAGE: Telegram setup instructions provided"
exit 0
