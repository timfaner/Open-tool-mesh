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
    status_ok "存在文件: ${path#$ROOT_DIR/}"
  else
    status_fail "缺少文件: ${path#$ROOT_DIR/}"
    return 1
  fi
}

echo "== OpenTool Mesh demo 前置检查 =="
echo "root: $ROOT_DIR"

if command -v node >/dev/null 2>&1; then
  NODE_VERSION="$(node -p 'process.versions.node')"
  NODE_MAJOR="${NODE_VERSION%%.*}"
  if (( NODE_MAJOR >= 22 )); then
    status_ok "node 版本满足要求: $NODE_VERSION"
  else
    status_warn "node 版本偏低: $NODE_VERSION，建议 >= 22"
  fi
else
  status_fail "未找到 node"
fi

if command -v npm >/dev/null 2>&1; then
  status_ok "检测到 npm: $(npm --version)"
else
  status_warn "未找到 npm"
fi

if command -v corepack >/dev/null 2>&1; then
  status_ok "检测到 corepack"
else
  status_warn "未找到 corepack"
fi

require_file "$ROOT_DIR/manifests/solidity-pattern-scanner.manifest.json"
require_file "$ROOT_DIR/services/tool-node/manifests/solidity-pattern-scanner.manifest.json"
require_file "$ROOT_DIR/packages/cli/src/index.ts"
require_file "$ROOT_DIR/services/tool-node/src/server.ts"
require_file "$ROOT_DIR/examples/audit-agent/src/run-audit.ts"
require_file "$ROOT_DIR/apps/dashboard/app/api/health/route.ts"

if [[ -d "$ROOT_DIR/apps/dashboard/node_modules" ]]; then
  status_ok "dashboard 依赖已安装"
else
  status_warn "dashboard 依赖未安装: apps/dashboard/node_modules 不存在"
fi

for dist_path in \
  "$ROOT_DIR/packages/cli/dist/cli/src/index.js" \
  "$ROOT_DIR/services/tool-node/dist/services/tool-node/src/server.js" \
  "$ROOT_DIR/examples/audit-agent/dist/examples/audit-agent/src/run-audit.js"
do
  if [[ -f "$dist_path" ]]; then
    status_ok "存在构建产物: ${dist_path#$ROOT_DIR/}"
  else
    status_warn "缺少构建产物: ${dist_path#$ROOT_DIR/}"
  fi
done

if [[ -d "$ROOT_DIR/.opentoolmesh" ]]; then
  status_ok "检测到运行时目录 .opentoolmesh"
else
  status_warn "尚未生成 .opentoolmesh；这表示主链路可能尚未执行"
fi

echo
echo "建议下一步:"
echo "1. 如需校验服务存活，执行: bash docs/demo/demo-health-check.sh"
echo "2. 如需启动 dashboard，进入 apps/dashboard 后运行 npm run dev"
echo "3. 如需启动 tool-node / CLI / audit-agent，先安装 workspace 依赖并构建 dist"
