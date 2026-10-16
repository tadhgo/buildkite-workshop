#!/usr/bin/env bash
set -euo pipefail

buildkite-agent cache restore --name npm
npm ci
buildkite-agent cache save --name npm

echo "--- :arrow_forward: ${BUILDKITE_LABEL:-install}"
