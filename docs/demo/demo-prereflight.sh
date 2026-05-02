#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

status_ok() {
  printf '[OK] %s\n' "$1"
}

status_warn() {
  printf '[WARN] %s\n' "$1"
}

status_fail() {
  printf '[FAIL] %s\n' "$1"
}

require_file() {
  local path="$1"
  if [[ -f "$path" ]]; then
    status_ok "Found file: ${path#$ROOT_DIR/}"
  else
    status_fail "Missing file: ${path#$ROOT_DIR/}"
    return 1
  fi
}

echo "== OpenTool Mesh demo preflight =="
echo "root: $ROOT_DIR"

if command -v node >/dev/null 2>&1; then
  NODE_VERSION="$(node -p 'process.versions.node')"
  NODE_MAJOR="${NODE_VERSION%%.*}"
  if (( NODE_MAJOR >= 22 )); then
    status_ok "Node version meets the requirement: $NODE_VERSION"
  else
    status_warn "Node version is older than recommended: $NODE_VERSION, recommended >= 22"
  fi
else
  status_fail "node was not found"
fi

if command -v npm >/dev/null 2>&1; then
  status_ok "Found npm: $(npm --version)"
else
  status_warn "npm was not found"
fi

if command -v corepack >/dev/null 2>&1; then
  status_ok "Found corepack"
else
  status_warn "corepack was not found"
fi

require_file "$ROOT_DIR/manifests/solidity-pattern-scanner.manifest.json"
require_file "$ROOT_DIR/services/tool-node/manifests/solidity-pattern-scanner.manifest.json"
require_file "$ROOT_DIR/packages/cli/src/index.ts"
require_file "$ROOT_DIR/services/tool-node/src/server.ts"
require_file "$ROOT_DIR/examples/audit-agent/src/run-audit.ts"
require_file "$ROOT_DIR/apps/dashboard/app/api/health/route.ts"

if [[ -d "$ROOT_DIR/apps/dashboard/node_modules" ]]; then
  status_ok "Dashboard dependencies are installed"
else
  status_warn "Dashboard dependencies are not installed: apps/dashboard/node_modules does not exist"
fi

for dist_path in \
  "$ROOT_DIR/packages/cli/dist/cli/src/index.js" \
  "$ROOT_DIR/services/tool-node/dist/services/tool-node/src/server.js" \
  "$ROOT_DIR/examples/audit-agent/dist/examples/audit-agent/src/run-audit.js"
do
  if [[ -f "$dist_path" ]]; then
    status_ok "Found build output: ${dist_path#$ROOT_DIR/}"
  else
    status_warn "Missing build output: ${dist_path#$ROOT_DIR/}"
  fi
done

if [[ -d "$ROOT_DIR/.opentoolmesh" ]]; then
  status_ok "Found runtime directory .opentoolmesh"
else
  status_warn ".opentoolmesh has not been generated yet; the main loop may not have run"
fi

echo
echo "Suggested next steps:"
echo "1. To check service health, run: corepack pnpm demo:health"
echo "2. To start the dashboard, run: corepack pnpm dashboard:dev"
echo "3. Health checks may need a few seconds before the dashboard is ready; this script has retries built in"
echo "4. For a step-by-step demo, prefer: corepack pnpm demo:tool-node / demo:publish / demo:audit-agent"
