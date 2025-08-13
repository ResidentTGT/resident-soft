#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

BIN="./resident_app"

chmod +x "$BIN" 2>/dev/null || true

if command -v xattr >/dev/null 2>&1; then
  xattr -dr com.apple.quarantine "$BIN" 2>/dev/null || true
fi

export NODE_NO_WARNINGS=1

exec "$BIN" "$@"
