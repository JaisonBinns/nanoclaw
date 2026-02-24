#!/bin/bash
# Wait for colima/docker to be ready, then exec the given command
MAX_WAIT=120
WAITED=0

while ! /opt/homebrew/bin/docker info >/dev/null 2>&1; do
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "[$(date)] Timed out waiting for Docker after ${MAX_WAIT}s" >&2
    exit 1
  fi
  sleep 5
  WAITED=$((WAITED + 5))
done

echo "[$(date)] Docker is ready (waited ${WAITED}s)" >&2
exec "$@"
