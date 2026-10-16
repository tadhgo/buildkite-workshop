#!/usr/bin/env bash
# Restore a workshop checkpoint onto your personal branch, then personalize it.
set -euo pipefail
act="${1:-}"
if [[ ! "$act" =~ ^[1-5]$ ]]; then
  echo 'Usage: ./scripts/catch-up-branch.sh <act number, 1-5>' >&2
  exit 1
fi
cd "$(git rev-parse --show-toplevel)"
branch="$(git symbolic-ref --quiet --short HEAD)" || {
  echo 'Switch to your workshop branch before catching up.' >&2; exit 1;
}
if [[ ! "$branch" =~ ^workshop/([a-z][a-z0-9]*)(-test-deploy)?$ ]]; then
  echo 'Catch-up is only allowed on workshop/<your-name> or workshop/<your-name>-test-deploy. Check you are on your own branch.' >&2
  exit 1
fi
name="${BASH_REMATCH[1]}"
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo 'You have uncommitted changes. Commit them or use git stash before catching up.' >&2
  exit 1
fi
if [[ "$act" == 5 ]]; then
  webhook="$(git config --get workshop.webhook || true)"
  if [[ ! "$webhook" =~ ^https://webhook\.site/[a-fA-F0-9-]{36}$ ]]; then
    echo 'Act 5 catch-up needs the webhook URL from Act 3. Set git config workshop.webhook to your URL first.' >&2
    exit 1
  fi
fi

echo "Fetching the end of Act ${act} from your origin..."
git fetch --quiet origin "checkpoint/act-${act}"
target="$(git rev-parse FETCH_HEAD)"
rc=0
git ls-remote --exit-code --heads origin "$branch" >/dev/null || rc=$?
if [[ "$rc" -eq 0 ]]; then
  git fetch --quiet origin "$branch"
  base="$(git rev-parse FETCH_HEAD)"
elif [[ "$rc" -eq 2 ]]; then
  base="$(git rev-parse HEAD)"
else
  echo 'Could not reach your repository.' >&2; exit 1
fi
unpushed="$(git rev-list --count "${base}..HEAD")"
git reset --quiet --soft "$base"
# Keep the current guides and helpers when restoring an older checkpoint.
git restore --source="$target" --staged --worktree -- \
  .buildkite account web package.json package-lock.json \
  eslint.config.mjs jest.config.cjs tsconfig.base.json .gitattributes .gitignore
./scripts/workshop-personalize.sh "$name"
git add .buildkite
if [[ "$unpushed" -gt 0 ]]; then
  echo "Note: ${unpushed} local commit(s) were not on the remote branch; catch-up replaces them."
fi
if git diff --cached --quiet; then
  echo "Already at the end of Act ${act}. Nothing to do."
  exit 0
fi
git diff --cached --stat
git commit --quiet -m "Catch up to the end of Act ${act}"
git push --quiet origin "HEAD:refs/heads/${branch}"
echo "Done. ${branch} matches Act ${act}, with your personal names and webhook URL."
