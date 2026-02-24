---
name: merge-upstream
description: Merge upstream NanoClaw updates from the main repository. Use when the user asks to update, merge upstream, sync with upstream, or apply upstream changes. Also use when you detect a .upstream-update-available file.
allowed-tools: Bash(curl:*)
---

# Merge Upstream Updates

Triggers the host to merge upstream changes, rebuild, and restart.

## Usage

When the user asks to merge upstream updates, run:

```bash
curl -s http://172.17.0.1:9000/hooks/merge-upstream
```

This triggers the host to:
1. Fetch and merge from upstream/main
2. If conflicts exist, abort the merge and notify via Telegram
3. If clean merge, rebuild TypeScript and Docker container
4. Restart the service

The user will receive a Telegram notification with the result.

## Checking for updates

To check if upstream updates are available without merging:

```bash
cat /workspace/group/.upstream-update-available 2>/dev/null
```

If the file exists, tell the user what updates are available and ask if they want to merge.

## Important

- The merge happens on the host, not inside this container
- If there are merge conflicts, the merge is aborted safely
- After a successful merge, this container will be rebuilt and restarted
- Your response may be cut short since the container restarts — that's expected
