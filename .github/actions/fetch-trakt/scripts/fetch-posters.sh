#!/usr/bin/env bash
set -euo pipefail

# fetch-posters.sh
# Enriches history data with poster URLs from TMDB.
# NOT on the critical path - failures are non-fatal.
#
# Required env vars:
#   TRAKT_TMPDIR  - Temporary directory containing tmdb-ids.txt
#
# Optional env vars:
#   TMDB_API_KEY  - TMDB API key (if not set, posters are skipped)

TMDB_API="https://api.themoviedb.org/3"
TMDB_IMAGE_BASE="https://image.tmdb.org/t/p/w342"
POSTER_DELAY="${POSTER_DELAY:-0.25}"

: "${TRAKT_TMPDIR:?must be set}"

# shellcheck source=validate-inputs.sh
source "$(dirname "$0")/validate-inputs.sh"
# shellcheck source=http.sh
source "$(dirname "$0")/http.sh"

validate_tmdb_api_key "${TMDB_API_KEY:-}"

echo '{}' > "$TRAKT_TMPDIR/posters.json"

if [ -z "${TMDB_API_KEY:-}" ]; then
  echo "TMDB_API_KEY not configured, skipping poster enrichment"
  echo "skipped" > "$TRAKT_TMPDIR/posters-status.txt"
  echo "status=skipped" >> "${GITHUB_OUTPUT:-/dev/null}"
  exit 0
fi

if [ ! -s "$TRAKT_TMPDIR/tmdb-ids.txt" ]; then
  echo "No TMDB IDs to fetch posters for"
  echo "ok" > "$TRAKT_TMPDIR/posters-status.txt"
  echo "status=ok" >> "${GITHUB_OUTPUT:-/dev/null}"
  exit 0
fi

echo "Fetching TMDB posters (delay: ${POSTER_DELAY}s between requests)"

TOTAL_IDS=$(wc -l < "$TRAKT_TMPDIR/tmdb-ids.txt" | tr -d ' ')
FETCHED=0
FAILED=0

while IFS=' ' read -r tmdb_id media_type; do
  [ -z "$tmdb_id" ] && continue

  HTTP_STATUS=$(fetch_url \
    "${TMDB_API}/${media_type}/${tmdb_id}?api_key=${TMDB_API_KEY}" \
    "$TRAKT_TMPDIR/tmdb-item.tmp")

  if [ "$HTTP_STATUS" -eq 200 ]; then
    POSTER_PATH=$(jq -r '.poster_path // empty' "$TRAKT_TMPDIR/tmdb-item.tmp" 2>/dev/null || true)
    if [ -n "$POSTER_PATH" ]; then
      jq --arg key "${media_type}_${tmdb_id}" \
         --arg url "${TMDB_IMAGE_BASE}${POSTER_PATH}" \
         '. + { ($key): $url }' "$TRAKT_TMPDIR/posters.json" > "$TRAKT_TMPDIR/posters-tmp.json"
      mv "$TRAKT_TMPDIR/posters-tmp.json" "$TRAKT_TMPDIR/posters.json"
      FETCHED=$((FETCHED + 1))
    fi
  else
    echo "::debug::TMDB lookup failed for ${media_type}/${tmdb_id}: HTTP ${HTTP_STATUS}"
    FAILED=$((FAILED + 1))
  fi

  rm -f "$TRAKT_TMPDIR/tmdb-item.tmp"
  sleep "$POSTER_DELAY"
done < "$TRAKT_TMPDIR/tmdb-ids.txt"

if [ "$FAILED" -eq 0 ]; then
  echo "ok" > "$TRAKT_TMPDIR/posters-status.txt"
  echo "status=ok" >> "${GITHUB_OUTPUT:-/dev/null}"
elif [ "$FETCHED" -gt 0 ]; then
  echo "partial" > "$TRAKT_TMPDIR/posters-status.txt"
  echo "status=partial" >> "${GITHUB_OUTPUT:-/dev/null}"
else
  echo "error" > "$TRAKT_TMPDIR/posters-status.txt"
  echo "status=error" >> "${GITHUB_OUTPUT:-/dev/null}"
fi

echo "Fetched ${FETCHED}/${TOTAL_IDS} posters (${FAILED} failed)"
echo "fetch-posters.sh completed"
