#!/bin/bash
# Verify Docker is installed and running

set -e

echo "Checking Docker installation..."

# Check if docker command exists
if ! command -v docker >/dev/null 2>&1; then
  echo "STATUS: error"
  echo "MESSAGE: Docker is not installed. Please install Docker Desktop."
  exit 1
fi

echo "Docker is installed"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
  echo "STATUS: error"
  echo "MESSAGE: Docker is not running. Please start Docker Desktop."
  exit 1
fi

# Get Docker version
DOCKER_VERSION=$(docker --version)
echo "$DOCKER_VERSION"

echo "STATUS: success"
echo "MESSAGE: Docker is installed and running"
exit 0
