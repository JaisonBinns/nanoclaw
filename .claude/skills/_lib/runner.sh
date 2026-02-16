#!/bin/bash
# Shared script runner library for NanoClaw skills
# Provides common functions for composable skill scripts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored status messages
status_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

status_success() {
  echo -e "${GREEN}✓${NC} $1"
}

status_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

status_error() {
  echo -e "${RED}✗${NC} $1"
}

# Run a script step with error handling
# Usage: run_step "Description" "./script.sh"
run_step() {
  local description="$1"
  local script="$2"
  shift 2
  local args="$@"

  status_info "$description"

  # Check if script exists
  if [ ! -f "$script" ]; then
    status_error "Script not found: $script"
    return 1
  fi

  # Make script executable
  chmod +x "$script"

  # Run script and capture output
  local output
  local exit_code

  if output=$("$script" $args 2>&1); then
    exit_code=0
  else
    exit_code=$?
  fi

  # Parse status from script output
  local status_line=$(echo "$output" | grep "^STATUS:" | head -1)
  local message_line=$(echo "$output" | grep "^MESSAGE:" | head -1)

  local status_value=$(echo "$status_line" | cut -d: -f2- | xargs)
  local message_value=$(echo "$message_line" | cut -d: -f2- | xargs)

  # Print non-status output
  echo "$output" | grep -v "^STATUS:" | grep -v "^MESSAGE:" || true

  # Check result
  if [ "$status_value" = "success" ] || [ $exit_code -eq 0 ]; then
    if [ -n "$message_value" ]; then
      status_success "$message_value"
    else
      status_success "$description completed"
    fi
    return 0
  else
    if [ -n "$message_value" ]; then
      status_error "$message_value"
    else
      status_error "$description failed"
    fi
    return 1
  fi
}

# Check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if a file exists
file_exists() {
  [ -f "$1" ]
}

# Check if a directory exists
dir_exists() {
  [ -d "$1" ]
}

# Prompt user for confirmation
# Usage: confirm "Are you sure?" && do_something
confirm() {
  local prompt="$1"
  echo -n "$prompt [y/N] "
  read -r response
  case "$response" in
    [yY][eE][sS]|[yY])
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

# Print a section header
section() {
  echo ""
  echo -e "${BLUE}═══ $1 ═══${NC}"
  echo ""
}

# Print script usage
# Usage: usage "script-name" "description" "arg1 [arg2]"
usage() {
  local script_name="$1"
  local description="$2"
  local args="$3"

  echo "Usage: $script_name $args"
  echo ""
  echo "$description"
  echo ""
}

# Export status for parent script
# Usage: export_status "success" "All dependencies installed"
export_status() {
  local status="$1"
  local message="$2"

  echo "STATUS: $status"
  if [ -n "$message" ]; then
    echo "MESSAGE: $message"
  fi
}

# Check Docker is running
check_docker() {
  if ! command_exists docker; then
    status_error "Docker is not installed"
    return 1
  fi

  if ! docker info >/dev/null 2>&1; then
    status_error "Docker is not running"
    return 1
  fi

  status_success "Docker is running"
  return 0
}

# Check Node.js is installed
check_node() {
  if ! command_exists node; then
    status_error "Node.js is not installed"
    return 1
  fi

  local node_version=$(node --version)
  status_success "Node.js $node_version is installed"
  return 0
}

# Check npm is installed
check_npm() {
  if ! command_exists npm; then
    status_error "npm is not installed"
    return 1
  fi

  local npm_version=$(npm --version)
  status_success "npm $npm_version is installed"
  return 0
}
