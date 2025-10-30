#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${1:-4173}"
cd "$SCRIPT_DIR"
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN=python3
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN=python
else
  echo "Python is required to run the local preview server. Install Python 3 to continue." >&2
  exit 1
fi

echo "Serving Social Spark at http://localhost:${PORT} (press Ctrl+C to stop)"
"$PYTHON_BIN" -m http.server "$PORT"
