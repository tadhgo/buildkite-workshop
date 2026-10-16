#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DEPLOY_KEY:-}" ]]; then
  echo "DEPLOY_KEY is not set" >&2
  exit 1
fi

echo "Deploying the Kite Shop to production"
echo "Deploying with key ${DEPLOY_KEY}"
sleep 5
echo "Deployed"
