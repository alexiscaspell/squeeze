#!/usr/bin/env bash
set -euo pipefail

PYODIDE_VERSION="${PYODIDE_VERSION:-0.26.0}"
TARGET_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/pyodide"
ARCHIVE="pyodide-${PYODIDE_VERSION}.tar.bz2"
URL="https://github.com/pyodide/pyodide/releases/download/${PYODIDE_VERSION}/${ARCHIVE}"

mkdir -p "$TARGET_DIR"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Downloading Pyodide ${PYODIDE_VERSION}..."
curl -fsSL "$URL" -o "${TMP_DIR}/${ARCHIVE}"
tar -xjf "${TMP_DIR}/${ARCHIVE}" -C "$TMP_DIR"

cp -r "${TMP_DIR}/pyodide_full_env/"* "$TARGET_DIR/" 2>/dev/null || \
cp -r "${TMP_DIR}/"* "$TARGET_DIR/"

echo "Pyodide installed to ${TARGET_DIR}"
