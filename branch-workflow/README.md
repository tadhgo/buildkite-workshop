# Kite Shop: shared repository and branch workflow

You've inherited the Kite Shop's CI. Someone ported it from another CI system in a hurry, and it's in a less than ideal state: everything runs one step at a time, every job reinstalls dependencies, the tests hide a bug, deployments don't require human approval, and the build runs every step regardless of the files changed in a given commit.

Over five acts you'll get it running in a new Buildkite pipeline, make it fast, make it trustworthy, make it smart, and deploy it safely. We're not here to debug YAML and fix code so every change you make has a copy-paste block. The point is to understand why we're making the changes and how they will affect the behavior of our pipeline and build.

A Buildkite Pipeline glossary can be found here for reference: https://buildkite.com/docs/pipelines/glossary

Attendees share one repository and cluster. Each attendee works on a personal branch. See the [detailed index](INDEX.md) for navigation through all five acts.

## Before you arrive

Prepare repository access, Git and Buildkite permissions before the workshop.

You need:

- **Write access** to the shared exercise repository: `WORKSHOP_REPOSITORY_URL`.
- **Git**, set up so you can clone and push to that repository from your laptop.
  - **Windows:** install Git for Windows and use **Git Bash** for every command.
  - No Node.js or npm needed. Buildkite runs the builds on hosted agents.
- Access to the workshop Buildkite organization and **cluster-maintainer access** to `WORKSHOP_CLUSTER_NAME`. The workshop team needs **Create pipelines** and **Create test suites** permissions.

Everyone uses the same repository and workshop cluster. It may be private: the facilitator connects authenticated GitHub access before the workshop. Each person has their own branch, pipeline, queue, suite and secret. Work on your own resources. Leave the shared `main` and checkpoint branches unchanged.

Attendees need Git and access to the shared resources; builds run on hosted agents.

**Official Buildkite documentation:** [GitHub integration](https://buildkite.com/docs/pipelines/source-control/github); [Managing queues](https://buildkite.com/docs/agent/queues/managing).

## Your identifier and branch

The starting pipeline deliberately has several CI problems: waits serialize independent checks, every job repeats dependency installation, Unit can fail without failing the build, and the mock deploy uses an inline fake key. You will change these behaviors one at a time so you can see their effects. The queue setting must match your personal hosted queue, which you create in Act 1.

Pick a unique identifier using **lowercase letters and digits**, starting with a letter, for example `alicesmith`. Use that same identifier everywhere. Wherever a UI instruction says `<your-name>` or a YAML example says `YOUR_NAME`, put your identifier there.

| Resource | Pattern | Example |
|---|---|---|
| Main workshop branch | `workshop/<your-name>` | `workshop/alicesmith` |
| Test-deploy branch | `workshop/<your-name>-test-deploy` | `workshop/alicesmith-test-deploy` |
| Pipeline and test suite | `workshop-<your-name>` | `workshop-alicesmith` |
| Hosted queue | `hosted-linux-<your-name>` | `hosted-linux-alicesmith` |
| Cluster secret | `DEPLOY_KEY_<your-name>` | `DEPLOY_KEY_alicesmith` |

Replace `WORKSHOP_REPOSITORY_URL` with the exercise repository URL supplied by the facilitator, and replace all three `YOUR_NAME` placeholders below with your identifier: the two branch commands and the queue key. Then paste:

```bash
git clone "WORKSHOP_REPOSITORY_URL" buildkite-workshop
cd buildkite-workshop
git switch -c "workshop/YOUR_NAME"
cat > .buildkite/pipeline.yml <<'EOF'
agents:
  queue: "hosted-linux-YOUR_NAME"

steps:
  - label: ":eslint: Lint"
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run lint -w web"

  - wait

  - label: ":jest: Unit"
    command:
      - ".buildkite/scripts/install.sh"
      - "npm test -w web"
    soft_fail: true

  - wait

  - label: ":bust_in_silhouette: Account"
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run lint -w account"
      - "npm test -w account"

  - wait

  - label: ":package: Build"
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run build -w web"

  - wait

  - label: ":playwright: E2E"
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run build -w web"
      - "npx playwright install --with-deps chromium"
      - "npm run e2e -w web"

  - wait

  - label: ":rocket: Deploy"
    command: "bash .buildkite/scripts/deploy.sh"
    env:
      DEPLOY_KEY: "kite_deploy_not_a_real_key_123"
EOF
git add .buildkite
git commit -m "[Setup, Section: Your identifier and branch] Route my workshop jobs to my queue"
git push -u origin "workshop/YOUR_NAME"
```

The block writes the starting pipeline with your queue specified explicitly. Keep the shared `main` and checkpoints unchanged. In the GitHub web editor, add `agents: {queue: "hosted-linux-<your-name>"}` at the top of the starting YAML too; replace the name.

Branch commands, pipeline and cache examples use `YOUR_NAME`: replace every occurrence with your identifier before running the block. Catch-up reads your identifier from your current workshop branch. For example, `hosted-linux-YOUR_NAME` becomes `hosted-linux-alicesmith`.

**No laptop Git on the day?** Ask a helper to create your personal branch, then use GitHub's web editor. Select your own branch before every edit. In each YAML block, replace `YOUR_NAME` yourself before committing. Terminal commands and catch-up need a terminal or a helper.

The initial pipeline deliberately demonstrates serial execution, repeated setup, hidden test failures and an unprotected mock deploy.

**Official Buildkite documentation:** [Command steps](https://buildkite.com/docs/pipelines/configure/step-types/command-step); [Wait steps](https://buildkite.com/docs/pipelines/configure/step-types/wait-step); [Soft fail](https://buildkite.com/docs/pipelines/configure/soft-fail).

## The five acts

Follow the five acts to build a faster, more reliable pipeline with controlled deployments.

| Act | What you'll do | |
|---|---|---|
| [1. Get it running](act-1.md) | Open the shared cluster, create your queue and pipeline, and make your pushes start builds. | ~35 min |
| [2. Make it fast](act-2.md) | Run steps in parallel, pass files between jobs, and cache your dependencies in the shared registry. | ~35 min |
| [3. Make it trustworthy](act-3.md) | See your tests in your own suite, fix a slow test and a flaky one, and split tests by timing. | ~45 min |
| [4. Make it smart](act-4.md) | Compare with the previous commit and skip steps that your latest change doesn't need. | ~25 min |
| [5. Ship it and tell people](act-5.md) | Store your deploy key as a secret, restrict mock deploys to your workshop branch, add approval and concurrency, and send notifications. | ~40 min |

Each act preserves the previous improvements and introduces the next Buildkite capability.

**Official Buildkite documentation:** [Pipeline upload](https://buildkite.com/docs/agent/cli/reference/pipeline); [Test Engine Client setup](https://buildkite.com/docs/pipelines/configure/tests/bktec/installing-and-using-the-client).

## How the steps work

Run each exercise on your personal branch and understand how a push updates the running pipeline.

- **Copy, paste, wait.** Replace `YOUR_NAME` in each block before running it. Most blocks write a file, commit and push. Run them from your `buildkite-workshop` folder, on your own workshop branch.
- **One commit per push.** Wait for the build's first step (pipeline upload) to finish before pushing the next change. From Act 4, the upload compares the build's commit with its first parent (`HEAD^`). Pushing several commits together can leave earlier changes outside that comparison.
- **Red builds are part of it.** The instructions say when to expect red.
- **The deploy is a mock.** It prints messages and sleeps; it does not deploy a real service.
- **Measure behavior, not a promised duration.** The times and example log counts reflect the workshop baseline. Queue capacity, cache warmth and application output can change them. Use job states, the Waterfall and log evidence to verify each exercise.
- **Using GitHub's web editor?** For a block containing `cat > .buildkite/pipeline.yml <<'EOF'`, copy only the YAML between that line and `EOF`, replace `YOUR_NAME`, then commit on your own branch. Keep `${BUILDKITE_PIPELINE_SLUG}` as written: the agent fills it in.

The repository holds the evolving pipeline, and upload evaluates the checked-out commit.

**Official Buildkite documentation:** [Pipeline upload](https://buildkite.com/docs/agent/cli/reference/pipeline); [Using if_changed](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines/if-changed).

## Fell behind? Catch up

Restore the checkpoint for the act you need and complete any missing Buildkite UI setup.

```sh
./scripts/catch-up-branch.sh 2      # replace 2 with the act you want to be at the end of
```

It fetches the checkpoint from your shared `origin`, replaces the exercise files while keeping the current instructions, fills in your personal names, commits and pushes to your current workshop branch. It refuses branches outside the `workshop/<your-name>` and `workshop/<your-name>-test-deploy` naming pattern. Check you are on your own branch before running it. Commit or stash your own changes first. On Windows, use Git Bash.

The Buildkite UI setup is not in Git: queues, suite settings and secrets still need the steps listed at the start of each act. Act 5 catch-up also needs your webhook URL saved in the local Git settings (Act 3).

Catch-up restores repository state; Buildkite resource setup remains a separate requirement.

**Official Buildkite documentation:** [Pipeline upload](https://buildkite.com/docs/agent/cli/reference/pipeline); [Managing queues](https://buildkite.com/docs/agent/queues/managing).

## Getting help

Use the facilitator, job logs and cheat sheet to resolve issues in the current exercise.

Put a hand up: the facilitator will come over. Most steps also have hints. The [cheat sheet](cheat-sheet.md) has the keys, UI paths and gotchas.

The job log and matching resource names are the first troubleshooting evidence.

**Official Buildkite documentation:** [Command steps](https://buildkite.com/docs/pipelines/configure/step-types/command-step); [Managing queues](https://buildkite.com/docs/agent/queues/managing).
