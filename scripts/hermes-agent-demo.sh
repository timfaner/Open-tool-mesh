#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT_DATA_DIR="${OTM_HERMES_AGENT_DATA_DIR:-"$ROOT_DIR/agent_data"}"
HERMES_IMAGE="${OTM_HERMES_IMAGE:-nousresearch/hermes-agent:latest}"
CONTRACT_PATH="${OTM_HERMES_CONTRACT_PATH:-examples/audit-agent/fixtures/sample-contract.sol}"
CONTAINER_CONTRACT_PATH="/workspace/$CONTRACT_PATH"
DOCKER_TOOL_NODE_BASE_URL="${OTM_HERMES_TOOL_NODE_BASE_URL:-http://host.docker.internal:4318}"
TOOL_NODE_PORT="$(node -e "console.log(new URL(process.argv[1]).port || '80')" "$DOCKER_TOOL_NODE_BASE_URL")"
LOCAL_TOOL_NODE_HEALTH_URL="${OTM_LOCAL_TOOL_NODE_HEALTH_URL:-http://127.0.0.1:$TOOL_NODE_PORT/health}"
TOOL_NODE_LISTEN_HOST="${OTM_TOOL_NODE_LISTEN_HOST:-0.0.0.0}"
TOOL_NODE_DIST="$ROOT_DIR/services/tool-node/dist/services/tool-node/src/server.js"
TOOL_NODE_PID=""
TOOL_NODE_LOG="$ROOT_DIR/.opentoolmesh/hermes-tool-node.log"
AGENT_LOG="$ROOT_DIR/.opentoolmesh/hermes-agent-demo.log"
AGENT_RESULT="$ROOT_DIR/.opentoolmesh/hermes-agent-demo-result.json"

cleanup() {
  if [[ -n "$TOOL_NODE_PID" ]]; then
    kill "$TOOL_NODE_PID" >/dev/null 2>&1 || true
    wait "$TOOL_NODE_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "Missing required file: $1" >&2
    exit 1
  fi
}

wait_for_tool_node() {
  for _ in {1..40}; do
    if curl -fsS "$LOCAL_TOOL_NODE_HEALTH_URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.25
  done

  echo "Tool node did not become healthy at $LOCAL_TOOL_NODE_HEALTH_URL" >&2
  if [[ -f "$TOOL_NODE_LOG" ]]; then
    tail -n 40 "$TOOL_NODE_LOG" >&2
  fi
  exit 1
}

echo "== OpenTool Mesh Hermes agent demo =="
echo "repo: $ROOT_DIR"
echo "agent_data: $AGENT_DATA_DIR"
echo "Hermes image: $HERMES_IMAGE"
echo "Docker-visible tool node: $DOCKER_TOOL_NODE_BASE_URL"

command -v docker >/dev/null 2>&1 || {
  echo "Missing docker command" >&2
  exit 1
}

require_file "$AGENT_DATA_DIR/config.yaml"
require_file "$ROOT_DIR/$CONTRACT_PATH"

cd "$ROOT_DIR"

echo "== Build demo packages =="
corepack pnpm --filter @opentoolmesh/shared build
corepack pnpm --filter @opentoolmesh/sdk build
corepack pnpm --filter @opentoolmesh/tool-node build
corepack pnpm --filter @opentoolmesh/mcp-server build

mkdir -p "$ROOT_DIR/.opentoolmesh"

if curl -fsS "$LOCAL_TOOL_NODE_HEALTH_URL" >/dev/null 2>&1; then
  echo "== Reusing existing tool node at $LOCAL_TOOL_NODE_HEALTH_URL =="
else
  echo "== Starting host tool node for Docker Hermes =="
  HOST="$TOOL_NODE_LISTEN_HOST" PORT="$TOOL_NODE_PORT" node "$TOOL_NODE_DIST" >"$TOOL_NODE_LOG" 2>&1 &
  TOOL_NODE_PID="$!"
  wait_for_tool_node
fi

echo "== Publish demo tool for Docker-visible peer URL =="
OTM_TOOL_NODE_BASE_URL="$DOCKER_TOOL_NODE_BASE_URL" corepack pnpm demo:publish

echo "== Verify Docker can reach the host tool node =="
docker run --rm \
  -v "$AGENT_DATA_DIR:/opt/data" \
  -v "$ROOT_DIR:/workspace" \
  -w /workspace \
  "$HERMES_IMAGE" \
  node -e "fetch('$DOCKER_TOOL_NODE_BASE_URL/health').then(async (response) => { if (!response.ok) throw new Error('HTTP ' + response.status); console.log(await response.text()); }).catch((error) => { console.error(error); process.exit(1); })"

PROMPT="${OTM_HERMES_PROMPT:-Use the OpenTool Mesh native MCP tool, not a shell fallback command. Read $CONTAINER_CONTRACT_PATH and run the solidity-static-analysis capability through OpenTool Mesh. Return only a concise JSON object with keys agent, toolUsed, status, verificationOk, traceUri, findingsCount, findings. Set toolUsed exactly to \"mcp_opentoolmesh_opentoolmesh_solidity_static_analysis\". Do not modify files.}"

echo "== Run real Hermes agent through Docker =="
agent_output="$(
  docker run --rm \
    -v "$AGENT_DATA_DIR:/opt/data" \
    -v "$ROOT_DIR:/workspace" \
    -w /workspace \
    -e OTM_PROVIDER_PROFILE="${OTM_PROVIDER_PROFILE:-local}" \
    "$HERMES_IMAGE" \
    --skills opentool-mesh \
    -z "$PROMPT"
)"

printf "%s\n" "$agent_output" | tee "$AGENT_LOG"
printf "%s\n" "$agent_output" | awk 'BEGIN { capture = 0 } /^\{/ { capture = 1 } capture { print }' > "$AGENT_RESULT"

if [[ ! -s "$AGENT_RESULT" ]]; then
  echo "Hermes output did not contain a JSON result" >&2
  exit 1
fi

node -e "
const result = JSON.parse(require('node:fs').readFileSync(process.argv[1], 'utf8'));
if (result.toolUsed !== 'mcp_opentoolmesh_opentoolmesh_solidity_static_analysis') {
  throw new Error('Unexpected toolUsed: ' + result.toolUsed);
}
if (result.status !== 'ok') {
  throw new Error('Unexpected status: ' + result.status);
}
if (result.verificationOk !== true) {
  throw new Error('Expected verificationOk=true');
}
" "$AGENT_RESULT"

echo "== Hermes demo result saved =="
echo "log: $AGENT_LOG"
echo "result: $AGENT_RESULT"
