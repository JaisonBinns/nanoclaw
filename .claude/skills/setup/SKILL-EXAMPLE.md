---
name: setup
description: Example of script-based setup pattern for NanoClaw
---

# NanoClaw Setup (Script-Based Pattern)

This is an example showing how to use composable scripts for setup tasks.

## Using the Runner Library

The runner library provides helper functions for executing scripts:

```bash
# Source the runner library
source .claude/skills/_lib/runner.sh

# Run a setup step
section "Installing Dependencies"
run_step "Install npm packages" .claude/skills/setup/scripts/install-deps.sh

section "Verifying Docker"
run_step "Check Docker installation" .claude/skills/setup/scripts/verify-docker.sh

section "Telegram Setup"
run_step "Configure Telegram bot" .claude/skills/setup/scripts/setup-telegram.sh
```

## Script Pattern

Each script follows this pattern:

1. **Do the work** (install, check, configure)
2. **Output status** using `STATUS:` and `MESSAGE:` lines
3. **Exit with code** (0 for success, 1 for error)

Example script:

```bash
#!/bin/bash
set -e

# Do work
if command_exists docker; then
  echo "STATUS: success"
  echo "MESSAGE: Docker is installed"
  exit 0
else
  echo "STATUS: error"
  echo "MESSAGE: Docker is not installed"
  exit 1
fi
```

## Benefits

- **Testable**: Run scripts individually
- **Reusable**: Use scripts in multiple skills
- **Maintainable**: Update script without changing skill
- **Composable**: Combine scripts in different ways
- **Debuggable**: See exactly what each step does

## Running Scripts Directly

You can test scripts independently:

```bash
# Test dependency install
.claude/skills/setup/scripts/install-deps.sh

# Test Docker verification
.claude/skills/setup/scripts/verify-docker.sh

# Test Telegram setup
.claude/skills/setup/scripts/setup-telegram.sh
```

Each script outputs STATUS and MESSAGE for integration with the runner.
