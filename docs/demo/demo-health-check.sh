#!/usr/bin/env bash

set -euo pipefail

DASHBOARD_URL="${DASHBOARD_URL:-http://127.0.0.1:3000/api/health}"
TOOL_NODE_URL="${TOOL_NODE_URL:-http://127.0.0.1:4318/invokeTool}"
FAILURES=0

check_endpoint() {
  local name="$1"
  local url="$2"
  local expected_csv="$3"
  local code

  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$url" || true)"
  if [[ -z "$code" || "$code" == "000" ]]; then
    printf '[FAIL] %s 未响应: %s\n' "$name" "$url"
    FAILURES=$((FAILURES + 1))
    return 1
  fi

  IFS=',' read -r -a expected_codes <<< "$expected_csv"
  for expected in "${expected_codes[@]}"; do
    if [[ "$code" == "$expected" ]]; then
      printf '[OK] %s 返回 %s: %s\n' "$name" "$code" "$url"
      return 0
    fi
  done

  printf '[WARN] %s 返回 %s，期望 %s: %s\n' "$name" "$code" "$expected_csv" "$url"
  FAILURES=$((FAILURES + 1))
  return 1
}

echo "== OpenTool Mesh demo 健康检查 =="

check_endpoint "dashboard" "$DASHBOARD_URL" "200" || true
check_endpoint "tool-node" "$TOOL_NODE_URL" "404,400" || true

if (( FAILURES > 0 )); then
  exit 1
fi
