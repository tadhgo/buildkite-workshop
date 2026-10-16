#!/usr/bin/env bash
# Behind? Catch up to the end of an act, then carry on from there.
#
#   ./scripts/catch-up.sh 2     # your repo now matches the end of Act 2
#
# It replaces the files in this repo with the facilitator's version,
# commits that as one change and pushes it, so your pipeline builds it.
set -euo pipefail

UPSTREAM="upstream"

if [[ "$(git symbolic-ref --quiet --short HEAD || true)" == workshop/* ]]; then
  echo "For the branch workflow use ./scripts/catch-up-branch.sh instead." >&2
  exit 1
fi

act="${1:-}"
if [[ ! "${act}" =~ ^[1-5]$ ]]; then
  echo "Usage: ./scripts/catch-up.sh <act number, 1-5>" >&2
  exit 1
fi

cd "$(git rev-parse --show-toplevel)"

if ! git remote get-url "$UPSTREAM" >/dev/null 2>&1; then
  echo 'Add the source repository first: git remote add upstream "WORKSHOP_REPOSITORY_URL" (see README).' >&2
  exit 1
fi

if ! branch="$(git symbolic-ref --quiet --short HEAD)"; then
  echo "You're not on a branch. Run 'git switch main', then run this again." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "You have uncommitted changes. Commit them, or set them aside with 'git stash', then run this again." >&2
  exit 1
fi

echo "Fetching the end of Act ${act}..."
git fetch --quiet "$UPSTREAM" "checkpoint/act-${act}"
target="$(git rev-parse FETCH_HEAD)"

# Build on what's on GitHub, so the push can't be rejected if your branch
# changed there (for example, a file edited in the browser).
rc=0
git ls-remote --exit-code --heads origin "$branch" >/dev/null || rc=$?
if [[ "$rc" -eq 0 ]]; then
  git fetch --quiet origin "$branch"
  base="$(git rev-parse FETCH_HEAD)"
elif [[ "$rc" -eq 2 ]]; then
  base="$(git rev-parse HEAD)"   # branch isn't on GitHub yet; the push creates it
else
  echo "Couldn't reach your repo on GitHub (origin). Check your connection, then run this again." >&2
  exit 1
fi
unpushed="$(git rev-list --count "$base..HEAD")"
git reset --quiet --soft "$base"
git restore --source="$target" --staged --worktree -- .

if [[ "$unpushed" -gt 0 ]]; then
  echo "Note: $unpushed commit(s) on this computer weren't on GitHub; the catch-up replaces them."
fi

if git diff --cached --quiet; then
  echo "You're already at the end of Act ${act}. Nothing to do."
  exit 0
fi

git diff --cached --stat
git commit --quiet -m "Catch up to the end of Act ${act}"
git push --quiet origin "HEAD:refs/heads/${branch}"
echo "Done. '${branch}' matches the end of Act ${act}, and the push will start a build."
