#!/bin/bash
# Install npm dependencies for NanoClaw

set -e

# Change to project root (script is in .claude/skills/setup/scripts/)
cd "$(dirname "$0")/../../../../"

echo "Installing npm dependencies..."

# Check if package.json exists
if [ ! -f "package.json" ]; then
  echo "STATUS: error"
  echo "MESSAGE: package.json not found"
  exit 1
fi

# Run npm install
if npm install; then
  echo "STATUS: success"
  echo "MESSAGE: Dependencies installed successfully"
  exit 0
else
  echo "STATUS: error"
  echo "MESSAGE: npm install failed"
  exit 1
fi
