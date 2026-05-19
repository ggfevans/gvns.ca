#!/usr/bin/env bash
# validate-inputs.sh
# Shared input validation for all scripts.
# Source this file, then call the needed validators.

validate_token() {
  local token="$1"
  if [ -z "$token" ]; then
    echo "Error: Token must not be empty" >&2
    exit 1
  fi
  if [ "${#token}" -lt 10 ]; then
    echo "Error: Token appears too short" >&2
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

validate_output_path() {
  local resolved
  # realpath -m works on GNU/Linux (GitHub Actions runners) but not macOS.
  # Fall back to python3 or plain realpath when -m is unavailable.
  if resolved="$(realpath -m "$1" 2>/dev/null)"; then
    :
  elif resolved="$(python3 -c "import os,sys; print(os.path.realpath(sys.argv[1]))" "$1" 2>/dev/null)"; then
    :
  else
    resolved="$(cd "$(dirname "$1")" 2>/dev/null && pwd -P)/$(basename "$1")"
  fi
  if [ -n "${GITHUB_WORKSPACE:-}" ]; then
    if [[ "$resolved" != "${GITHUB_WORKSPACE}"/* ]]; then
      echo "Error: output_path must be within the workspace (${GITHUB_WORKSPACE}), got '${resolved}'" >&2
      exit 1
    fi
  fi
}
