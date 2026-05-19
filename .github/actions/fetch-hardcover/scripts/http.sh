#!/usr/bin/env bash
# http.sh
# Shared HTTP fetch with retry and backoff for authenticated GraphQL requests.
# Source this file, then call fetch_graphql.

fetch_graphql() {
  local url="$1" output="$2" token="$3" payload="$4"
  local max_attempts=3 attempt=0 status

  while [ $attempt -lt $max_attempts ]; do
    status=$(curl -s -w "%{http_code}" -o "$output" \
      -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${token}" \
      -d "$payload" \
      --max-time 30 --connect-timeout 10 \
      "$url") || status="000"

    if [ "$status" -eq 429 ]; then
      local wait=$((2 ** attempt))
      echo "Rate limited (HTTP 429), retrying in ${wait}s..." >&2
      sleep "$wait"
      attempt=$((attempt + 1))
    elif [ "$status" = "000" ] && [ $attempt -lt $((max_attempts - 1)) ]; then
      local wait=$((2 ** attempt))
      echo "Connection failed, retrying in ${wait}s..." >&2
      sleep "$wait"
      attempt=$((attempt + 1))
    else
      echo "$status"
      return 0
    fi
  done
  echo "$status"
}
