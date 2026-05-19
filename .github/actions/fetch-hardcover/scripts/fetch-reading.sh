#!/usr/bin/env bash
set -euo pipefail

# fetch-reading.sh
# Fetches reading data from the Hardcover GraphQL API.
#
# Required env vars:
#   HC_TOKEN   - Hardcover API token
#   HC_USER_ID - Hardcover user ID (positive integer)
#   HC_LIMIT   - Maximum number of books to fetch
#   HC_TMPDIR  - Temporary directory for intermediate files

# ---------------------------------------------------------------------------
# Validate required environment variables
# ---------------------------------------------------------------------------
: "${HC_TOKEN:?must be set}"
: "${HC_USER_ID:?must be set}"
: "${HC_LIMIT:?must be set}"
: "${HC_TMPDIR:?must be set}"

# shellcheck source=scripts/validate-inputs.sh
source "$(dirname "$0")/validate-inputs.sh"
# shellcheck source=scripts/http.sh
source "$(dirname "$0")/http.sh"

validate_token "$HC_TOKEN"
validate_positive_integer "user_id" "$HC_USER_ID"
validate_positive_integer "limit" "$HC_LIMIT"

# ---------------------------------------------------------------------------
# Create temp directory if it doesn't exist
# ---------------------------------------------------------------------------
mkdir -p "$HC_TMPDIR"

# ---------------------------------------------------------------------------
# Construct GraphQL query
# ---------------------------------------------------------------------------
# shellcheck disable=SC2016 # GraphQL variables ($userId/$limit) are interpreted by the API, not by bash.
QUERY='query GetUserBooks($userId: Int!, $limit: Int!) {
  user_books(
    where: { user_id: { _eq: $userId } }
    order_by: { updated_at: desc }
    limit: $limit
  ) {
    status_id
    rating
    updated_at
    book {
      title
      contributions(limit: 1) {
        author { name }
      }
      image { url }
      slug
    }
  }
}'

PAYLOAD=$(jq -n \
  --arg query "$QUERY" \
  --argjson userId "$HC_USER_ID" \
  --argjson limit "$HC_LIMIT" \
  '{ query: $query, variables: { userId: $userId, limit: $limit } }')

# ---------------------------------------------------------------------------
# Fetch data from Hardcover API
# ---------------------------------------------------------------------------
echo "Fetching reading data for user ID: ${HC_USER_ID} (limit: ${HC_LIMIT})"

TMP_RESPONSE="$HC_TMPDIR/response.tmp"

HTTP_STATUS=$(fetch_graphql "https://api.hardcover.app/v1/graphql" "$TMP_RESPONSE" "$HC_TOKEN" "$PAYLOAD")

if [ "$HTTP_STATUS" -ne 200 ]; then
  echo "Error: Hardcover API returned HTTP ${HTTP_STATUS}" >&2
  rm -f "$TMP_RESPONSE"
  exit 1
fi

# ---------------------------------------------------------------------------
# Validate response
# ---------------------------------------------------------------------------
if ! jq empty "$TMP_RESPONSE" 2>/dev/null; then
  echo "Error: Invalid JSON response from Hardcover API" >&2
  rm -f "$TMP_RESPONSE"
  exit 1
fi

if jq -e '.errors' "$TMP_RESPONSE" > /dev/null 2>&1; then
  echo "Error: GraphQL errors from Hardcover API" >&2
  rm -f "$TMP_RESPONSE"
  exit 1
fi

if ! jq -e '.data.user_books' "$TMP_RESPONSE" > /dev/null 2>&1; then
  echo "Error: Invalid response structure from Hardcover API" >&2
  rm -f "$TMP_RESPONSE"
  exit 1
fi

# ---------------------------------------------------------------------------
# Extract book data
# ---------------------------------------------------------------------------
jq '.data.user_books' "$TMP_RESPONSE" > "$HC_TMPDIR/raw-books.json"
rm -f "$TMP_RESPONSE"

BOOK_COUNT=$(jq 'length' "$HC_TMPDIR/raw-books.json")
echo "Fetched ${BOOK_COUNT} books from Hardcover"
echo "fetch-reading.sh completed successfully"
