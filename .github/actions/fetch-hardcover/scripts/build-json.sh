#!/usr/bin/env bash
set -euo pipefail

# build-json.sh
# Transforms raw Hardcover API data into the reading.json schema.
# No network calls are made.
#
# Required env vars:
#   HC_OUTPUT_PATH - Path to write the final JSON file
#   HC_TMPDIR      - Temporary directory containing intermediate files

# ---------------------------------------------------------------------------
# Validate required environment variables
# ---------------------------------------------------------------------------
: "${HC_OUTPUT_PATH:?must be set}"
: "${HC_TMPDIR:?must be set}"

# shellcheck source=scripts/validate-inputs.sh
source "$(dirname "$0")/validate-inputs.sh"
validate_output_path "$HC_OUTPUT_PATH"

# ---------------------------------------------------------------------------
# Ensure parent directory of output path exists
# ---------------------------------------------------------------------------
mkdir -p "$(dirname "$HC_OUTPUT_PATH")"

# ---------------------------------------------------------------------------
# Verify input file exists
# ---------------------------------------------------------------------------
if [ ! -f "$HC_TMPDIR/raw-books.json" ]; then
  echo "Error: raw-books.json not found in ${HC_TMPDIR}" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Transform to output schema
# ---------------------------------------------------------------------------
echo "Building final JSON output at ${HC_OUTPUT_PATH}"

# Map status_id: 1=want, 2=reading, 3=finished, 4=dnf, 5=dropped
jq '{
  lastUpdated: (now | todate),
  currentlyReading: [
    .[]
    | select(.status_id == 2)
    | {
        title: .book.title,
        author: (.book.contributions[0].author.name // "Unknown"),
        coverUrl: .book.image.url,
        hardcoverUrl: ("https://hardcover.app/books/" + .book.slug)
      }
  ],
  finished: [
    .[]
    | select(.status_id == 3)
    | {
        title: .book.title,
        author: (.book.contributions[0].author.name // "Unknown"),
        coverUrl: .book.image.url,
        hardcoverUrl: ("https://hardcover.app/books/" + .book.slug),
        rating: (.rating // null),
        dateFinished: .updated_at
      }
  ],
  wantToRead: [
    .[]
    | select(.status_id == 1)
    | {
        title: .book.title,
        author: (.book.contributions[0].author.name // "Unknown"),
        coverUrl: .book.image.url,
        hardcoverUrl: ("https://hardcover.app/books/" + .book.slug)
      }
  ]
}' "$HC_TMPDIR/raw-books.json" > "$HC_OUTPUT_PATH"

# ---------------------------------------------------------------------------
# Print summary
# ---------------------------------------------------------------------------
jq -r '{
  currently_reading: (.currentlyReading | length),
  finished: (.finished | length),
  want_to_read: (.wantToRead | length)
}' "$HC_OUTPUT_PATH"

echo "build-json.sh completed successfully"
