#!/usr/bin/env bash
set -euo pipefail

# fetch-history.sh
# Fetches recent watch history from the Trakt API.
# Critical path - if fetching history fails, the action fails.
#
# Required env vars:
#   TRAKT_CLIENT_ID     - Trakt API client ID
#   TRAKT_USERNAME      - Trakt username
#   TRAKT_HISTORY_LIMIT - Number of history items to fetch
#   TRAKT_TMPDIR        - Temporary directory for intermediate files

TRAKT_API="https://api.trakt.tv"

: "${TRAKT_CLIENT_ID:?must be set}"
: "${TRAKT_USERNAME:?must be set}"
: "${TRAKT_HISTORY_LIMIT:?must be set}"
: "${TRAKT_TMPDIR:?must be set}"

# shellcheck source=validate-inputs.sh
source "$(dirname "$0")/validate-inputs.sh"
# shellcheck source=http.sh
source "$(dirname "$0")/http.sh"
validate_username "$TRAKT_USERNAME"
validate_positive_integer "history_limit" "$TRAKT_HISTORY_LIMIT"

mkdir -p "$TRAKT_TMPDIR"

echo "Fetching watch history for user: ${TRAKT_USERNAME} (limit: ${TRAKT_HISTORY_LIMIT})"

HTTP_STATUS=$(fetch_url_with_headers \
  "${TRAKT_API}/users/${TRAKT_USERNAME}/history?limit=${TRAKT_HISTORY_LIMIT}" \
  "$TRAKT_TMPDIR/history-response.tmp" \
  -H "Content-Type: application/json" \
  -H "trakt-api-version: 2" \
  -H "trakt-api-key: ${TRAKT_CLIENT_ID}")

if [ "$HTTP_STATUS" -ne 200 ]; then
  echo "Error: Trakt API returned HTTP ${HTTP_STATUS}" >&2
  echo "::warning::Trakt API returned HTTP ${HTTP_STATUS}. Check API credentials and username."
  rm -f "$TRAKT_TMPDIR/history-response.tmp"
  exit 1
fi

if ! jq -e 'type == "array"' "$TRAKT_TMPDIR/history-response.tmp" > /dev/null 2>&1; then
  echo "Error: Trakt API returned invalid JSON (expected array)" >&2
  rm -f "$TRAKT_TMPDIR/history-response.tmp"
  exit 1
fi

# Extract TMDB IDs for poster lookup
jq -r '[
  .[] |
  if .type == "movie" then
    { tmdb_id: (.movie.ids.tmdb // empty), media_type: "movie" }
  elif .type == "episode" then
    { tmdb_id: (.show.ids.tmdb // empty), media_type: "tv" }
  else empty end
] | unique_by(.tmdb_id) | .[] | "\(.tmdb_id) \(.media_type)"' \
  "$TRAKT_TMPDIR/history-response.tmp" > "$TRAKT_TMPDIR/tmdb-ids.txt" 2>/dev/null || true

TMDB_COUNT=$(wc -l < "$TRAKT_TMPDIR/tmdb-ids.txt" | tr -d ' ')
echo "Extracted ${TMDB_COUNT} unique TMDB IDs for poster lookup"

mv "$TRAKT_TMPDIR/history-response.tmp" "$TRAKT_TMPDIR/history.json"

HISTORY_COUNT=$(jq length "$TRAKT_TMPDIR/history.json")
echo "Wrote ${HISTORY_COUNT} history items to ${TRAKT_TMPDIR}/history.json"

echo "fetch-history.sh completed successfully"
