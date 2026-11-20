#!/usr/bin/env bash
# Sets one KEY="value" line in deploy/.env, reading the value from stdin.
#
#   printf '%s' "$VALUE" | sudo bash deploy/set-env.sh META_CAPI_TOKEN
#
# The value arrives on stdin and nowhere else, so it never appears in a command
# line, in `ps`, or in the workflow log. This script prints the key and the
# value's length, never the value. An empty value leaves the file untouched: a
# deploy run before the secret exists must not wipe one that was set by hand.
#
# Idempotent. Replaces an existing line rather than appending a second, writes
# a temporary file beside the original and renames it over, and keeps the
# original's owner and mode.
set -euo pipefail

key="${1:?usage: set-env.sh KEY (value on stdin)}"
[[ "$key" =~ ^[A-Z][A-Z0-9_]*$ ]] || { echo "set-env: refusing key '$key'" >&2; exit 2; }

env_file="$(cd "$(dirname "$0")" && pwd)/.env"
[ -f "$env_file" ] || { echo "set-env: $env_file does not exist" >&2; exit 1; }

IFS= read -r value || true
if [ -z "$value" ]; then
  echo "set-env: no value supplied for $key; .env left unchanged"
  exit 0
fi

# Tokens are URL-safe characters. Anything else (a quote, a $, a newline) would
# change what compose reads, so refuse it rather than write it.
if [[ ! "$value" =~ ^[A-Za-z0-9._~+=-]+$ ]]; then
  echo "set-env: value for $key has unexpected characters; refusing" >&2
  exit 1
fi

tmp="$(mktemp "$env_file.XXXXXX")"
trap 'rm -f "$tmp"' EXIT
{ grep -v "^${key}=" "$env_file" || true; printf '%s="%s"\n' "$key" "$value"; } > "$tmp"
chown --reference="$env_file" "$tmp"
chmod --reference="$env_file" "$tmp"
mv "$tmp" "$env_file"
trap - EXIT

echo "set-env: $key written to .env (${#value} characters)"
