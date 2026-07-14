#!/usr/bin/env bash
# Local Stitch MCP proxy for Cursor.
# Used by .cursor/mcp.json → stitch server.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Prefer the gcloud binary configured for this workspace when present.
if [[ -n "${GCLOUD_BIN:-}" && -x "${GCLOUD_BIN}" ]]; then
  export PATH="$(dirname "${GCLOUD_BIN}"):${PATH}"
  GCLOUD_CMD="${GCLOUD_BIN}"
elif command -v gcloud >/dev/null 2>&1; then
  GCLOUD_CMD="$(command -v gcloud)"
else
  GCLOUD_CMD=""
fi

export STITCH_USE_SYSTEM_GCLOUD="${STITCH_USE_SYSTEM_GCLOUD:-1}"
export CI="${CI:-1}"
export NO_COLOR="${NO_COLOR:-1}"

# Newer stitch-mcp proxy builds require an explicit token/API key even when
# using system gcloud. Prefer an existing env var; otherwise mint ADC token.
if [[ -z "${STITCH_API_KEY:-}" && -z "${STITCH_ACCESS_TOKEN:-}" ]]; then
  if [[ -z "${GCLOUD_CMD}" ]]; then
    echo "stitch-mcp-proxy: need STITCH_API_KEY/STITCH_ACCESS_TOKEN or gcloud" >&2
    exit 1
  fi
  STITCH_ACCESS_TOKEN="$("${GCLOUD_CMD}" auth application-default print-access-token)"
  export STITCH_ACCESS_TOKEN
fi

cd "${REPO_ROOT}"

exec npx -y @_davideast/stitch-mcp@latest proxy
