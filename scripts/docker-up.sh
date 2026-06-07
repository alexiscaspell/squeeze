#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DOCKER_USER="${DOCKER_HUB_USERNAME:-alexiscaspell}"

if [[ -n "${DOCKER_HUB_PERSONAL_TOKEN:-}" ]]; then
    echo "Logging in to Docker Hub as ${DOCKER_USER}..."
    echo "$DOCKER_HUB_PERSONAL_TOKEN" | docker login -u "$DOCKER_USER" --password-stdin
else
    echo "DOCKER_HUB_PERSONAL_TOKEN not set — using existing docker credentials (if any)."
fi

if [[ ! -f packages/scratch-gui/build/index.html ]]; then
    echo "Production bundle not found — running npm run build..."
    npm run build
fi

echo "Building Docker image and starting Squeeze..."
docker compose up -d --build "$@"

echo "Squeeze running at http://localhost:3000"
