#!/usr/bin/env bash
# validate-inputs.sh
# Shared input validation for all scripts.
# Source this file, then call the needed validators.

validate_required() {
  local name="$1" value="$2"
  if [ -z "$value" ]; then
    echo "Error: ${name} is required but was not provided" >&2
    exit 1
  fi
}

validate_username() {
  if [[ ! "$1" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "Error: Invalid username format. Must be alphanumeric, hyphens, or underscores." >&2
    exit 1
  fi
}

validate_positive_integer() {
  local name="$1" value="$2"
  if [[ ! "$value" =~ ^[1-9][0-9]*$ ]]; then
    echo "Error: ${name} must be a positive integer, got '${value}'" >&2
    exit 1
  fi
}

validate_tmdb_api_key() {
  local key="$1"
  if [ -z "$key" ]; then
    return 0  # Empty = skip posters
  fi
  if [[ ! "$key" =~ ^[a-fA-F0-9]{32}$ ]]; then
    echo "Error: TMDB API key must be a 32-character hex string" >&2
    exit 1
  fi
}

validate_output_path() {
  local resolved
  if resolved="$(realpath -m "$1" 2>/dev/null)"; then
    :
  elif resolved="$(python3 -c "import os,sys; print(os.path.realpath(sys.argv[1]))" "$1" 2>/dev/null)"; then
    :
  else
    resolved="$(cd "$(dirname "$1")" 2>/dev/null && pwd)/$(basename "$1")"
  fi
  if [ -z "${GITHUB_WORKSPACE:-}" ]; then
    echo "Error: GITHUB_WORKSPACE is not set. Cannot validate output path boundary." >&2
    exit 1
  fi
  if [[ "$resolved" != "${GITHUB_WORKSPACE}"/* ]]; then
    echo "Error: output_path must be within the workspace (${GITHUB_WORKSPACE}), got '${resolved}'" >&2
    exit 1
  fi
}
