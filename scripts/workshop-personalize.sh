#!/usr/bin/env bash
# Internal catch-up helper: render templates using the identifier passed by catch-up.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

name="${1:-}"
if [[ ! "$name" =~ ^[a-z][a-z0-9]*$ ]]; then
  echo 'Catch-up requires an identifier: lowercase letters/digits, starting with a letter.' >&2
  exit 1
fi

webhook="$(git config --get workshop.webhook || true)"
if [[ -n "$webhook" && ! "$webhook" =~ ^https://webhook\.site/[a-fA-F0-9-]{36}$ ]]; then
  echo 'workshop.webhook must be your complete https://webhook.site/<unique-id> URL.' >&2
  exit 1
fi
if grep -q 'https://webhook.site/YOUR-ID' .buildkite/pipeline.yml && [[ -z "$webhook" ]]; then
  echo 'Set the URL from Act 3 first: git config workshop.webhook "https://webhook.site/<unique-id>".' >&2
  exit 1
fi

for file in .buildkite/pipeline.yml .buildkite/cache.yml; do
  [[ -f "$file" ]] || continue
  temporary="$(mktemp "${file}.XXXXXX")"
  sed "s/YOUR_NAME/${name}/g" "$file" > "$temporary"
  if [[ "$file" == .buildkite/pipeline.yml ]]; then
    second="$(mktemp "${file}.XXXXXX")"
    sed -E "s#build\.branch == \"main\"#build.branch == \"workshop/${name}\"#g; s#^([ ]*)- DEPLOY_KEY\$#\1DEPLOY_KEY: DEPLOY_KEY_${name}#" "$temporary" > "$second"
    mv "$second" "$temporary"
    if ! grep -q '^agents:' "$temporary"; then
      second="$(mktemp "${file}.XXXXXX")"
      printf 'agents:\n  queue: "hosted-linux-%s"\n\n' "$name" > "$second"
      cat "$temporary" >> "$second"
      mv "$second" "$temporary"
    fi
  elif ! grep -q "^      - \"${name}\"$" "$temporary"; then
    second="$(mktemp "${file}.XXXXXX")"
    awk -v person="$name" '{ print; if ($0 == "      - \"npm\"") print "      - \"" person "\"" }' "$temporary" > "$second"
    mv "$second" "$temporary"
  fi
  if [[ -n "$webhook" ]]; then
    second="$(mktemp "${file}.XXXXXX")"
    sed "s#https://webhook.site/YOUR-ID#${webhook}#g" "$temporary" > "$second"
    mv "$second" "$temporary"
  fi
  mv "$temporary" "$file"
done

echo "Using workshop/${name}, hosted-linux-${name}, and personal key DEPLOY_KEY_${name}."
