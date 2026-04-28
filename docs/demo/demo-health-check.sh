#!/usr/bin/env bash

set -euo pipefail

DASHBOARD_URL="${DASHBOARD_URL:-http://127.0.0.1:3000/api/health}"
TOOL_NODE_URL="${TOOL_NODE_URL:-http://127.0.0.1:4318/invokeTool}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-10}"
SLEEP_SECONDS="${SLEEP_SECONDS:-1}"
FAILURES=0

check_endpoint() {
  local name="$1"
  local url="$2"
  local expected_csv="$3"
  local code
  local attempt

  for ((attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1)); do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$url" || true)"

    if [[ -n "$code" && "$code" != "000" ]]; then
      IFS=',' read -r -a expected_codes <<< "$expected_csv"
      for expected in "${expected_codes[@]}"; do
        if [[ "$code" == "$expected" ]]; then
          printf '[OK] %s 返回 %s: %s\n' "$name" "$code" "$url"
          return 0
        fi
      done

      if (( attempt < MAX_ATTEMPTS )); then
        printf '[WAIT] %s 第 %s/%s 次返回 %s，等待 %ss 后重试: %s\n' \
          "$name" "$attempt" "$MAX_ATTEMPTS" "$code" "$SLEEP_SECONDS" "$url"
        sleep "$SLEEP_SECONDS"
        continue
      fi

      printf '[WARN] %s 返回 %s，期望 %s: %s\n' "$name" "$code" "$expected_csv" "$url"
      FAILURES=$((FAILURES + 1))
      return 1
    fi

    if (( attempt < MAX_ATTEMPTS )); then
      printf '[WAIT] %s 尚未响应，第 %s/%s 次重试前等待 %ss: %s\n' \
        "$name" "$attempt" "$MAX_ATTEMPTS" "$SLEEP_SECONDS" "$url"
      sleep "$SLEEP_SECONDS"
      continue
    fi
  done

  printf '[FAIL] %s 未响应: %s\n' "$name" "$url"
  FAILURES=$((FAILURES + 1))
  return 1
}

echo "== OpenTool Mesh demo 健康检查 =="

check_endpoint "dashboard" "$DASHBOARD_URL" "200" || true
check_endpoint "tool-node" "$TOOL_NODE_URL" "404,400" || true

if (( FAILURES > 0 )); then
  exit 1
fi
