#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
live_url="${1:-}"
export PATH="$HOME/.strix/bin:$PATH"
export STRIX_LLM="${STRIX_LLM:-chatgpt/gpt-5.6-luna}"

if ! command -v strix >/dev/null 2>&1; then
  echo "Strix is not installed. Run: curl -sSL https://strix.ai/install | bash" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Docker is not ready. Start Docker Desktop and enable WSL integration for Ubuntu." >&2
  exit 1
fi

targets=(--target "$repo_root/frontend")
if [[ -n "$live_url" ]]; then
  if [[ ! "$live_url" =~ ^https?:// ]]; then
    echo "The optional website target must begin with http:// or https://" >&2
    exit 1
  fi
  targets+=(--target "$live_url")
fi

strix --non-interactive --scan-mode quick --max-turns 50 "${targets[@]}" --instruction \
  "Authorized assessment of the 8Liv application. Pharmacy functionality is strictly out of scope: do not inspect, map, test, validate, report, or modify pharmacy-related routes, files, APIs, database objects, orders, prescriptions, fulfillment, delivery, staff, or workflows. Do not test production or use real patient, medical, payment, or provider data. Do not perform denial-of-service, destructive database operations, credential stuffing, or send real emails, messages, payments, prescriptions, or video invitations. Prefer source review and non-destructive proofs of concept. Treat all .env files and secrets as sensitive and never include secret values in reports."
