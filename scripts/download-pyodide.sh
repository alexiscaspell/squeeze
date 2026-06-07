#!/usr/bin/env bash
set -euo pipefail

PYODIDE_VERSION="${PYODIDE_VERSION:-0.26.0}"
TARGET_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/pyodide"
ARCHIVE="pyodide-${PYODIDE_VERSION}.tar.bz2"
URL="https://github.com/pyodide/pyodide/releases/download/${PYODIDE_VERSION}/${ARCHIVE}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Downloading Pyodide ${PYODIDE_VERSION}..."
curl -fsSL "$URL" -o "${TMP_DIR}/${ARCHIVE}"
tar -xjf "${TMP_DIR}/${ARCHIVE}" -C "$TMP_DIR"

rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"

if [ -d "${TMP_DIR}/pyodide_full_env" ]; then
    cp -r "${TMP_DIR}/pyodide_full_env/." "$TARGET_DIR/"
elif [ -d "${TMP_DIR}/pyodide" ]; then
    cp -r "${TMP_DIR}/pyodide/." "$TARGET_DIR/"
else
    echo "Unexpected Pyodide archive layout in ${ARCHIVE}" >&2
    exit 1
fi

if [ ! -f "${TARGET_DIR}/pyodide.js" ]; then
    echo "Pyodide install failed: ${TARGET_DIR}/pyodide.js not found" >&2
    exit 1
fi

echo "Pyodide installed to ${TARGET_DIR}"
