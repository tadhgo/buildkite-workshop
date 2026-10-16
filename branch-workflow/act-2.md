# Act 2: Make it fast

**Goal:** make the build and jobs faster by stopping the pipeline waiting for things it doesn't need, stop it building the app twice in two different jobs, and stop it downloading the same packages in every job.

**Time:** about 35 minutes.

**You start with:** a green build of about 4 to 5 minutes, started by a push. (Caught up with `./scripts/catch-up-branch.sh 1`? You still need Act 1's Buildkite setup: the shared workshop cluster, your personal hosted queue, your pipeline and its two-branch filter.)

**Run commands from your `buildkite-workshop` folder.** Replace every `YOUR_NAME` in the command blocks with your identifier, including queue and cache values. Stay on your personal workshop branch.

---

## 2.1 Parallel by default

The change removes unnecessary scheduling barriers while keeping the final gate before Deploy. Independent checks become eligible to run together; their actual start times depend on available hosted capacity. Watch the Waterfall to distinguish time spent waiting for another step from time spent waiting for an agent.

Open your last build and switch to the **Waterfall** view. It's a staircase: every step waits for the one before, because there's a `wait` between each of them in `.buildkite/pipeline.yml`. The `wait` step is an implicit dependency in Buildkite, which means all steps prior to the `wait` step must complete successfully before the `wait` condition is satisfied. However in our case, the Lint job doesn't need to wait for the Unit job, Build doesn't need Lint, Account doesn't need to rely on anything.

Delete the four `wait`s that aren't protecting anything. We can parallelize all steps except the Deploy step. We'll keep one `wait` in front of the Deploy step.

```bash
cat > .buildkite/pipeline.yml <<'EOF'
agents:
  queue: "hosted-linux-YOUR_NAME"

steps:
  - label: ":eslint: Lint"
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run lint -w web"

  - label: ":jest: Unit"
    command:
      - ".buildkite/scripts/install.sh"
      - "npm test -w web"
    soft_fail: true

  - label: ":bust_in_silhouette: Account"
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run lint -w account"
      - "npm test -w account"

  - label: ":package: Build"
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run build -w web"

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
git commit -m "[Act 2, Section 2.1] Run independent steps in parallel"
git push
```

**What you should see:**

- Lint, Unit, Account, Build and E2E **can run concurrently, subject to available hosted capacity**. Buildkite runs steps in parallel unless you tell it not to.
- Each job gets **its own machine**: open two jobs and compare the agent names. (Remember this for 2.2.)
- Deploy still waits: that `wait` is doing its job.
- The build drops to about **2½ minutes**. Open the Waterfall again: bars side by side. Unit (about 2 minutes) is now the slowest thing: the build is only as fast as its slowest path. Act 3 deals with that.

<details>
<summary>Stuck?</summary>

1. What does a `wait` do to everything below it? It holds it until everything above has passed.
2. Deleted the `wait` before Deploy too? Then Deploy runs while the tests are still going. Put that one back.
</details>


**Official Buildkite documentation:** [Command steps](https://buildkite.com/docs/pipelines/configure/step-types/command-step); [Wait steps](https://buildkite.com/docs/pipelines/configure/step-types/wait-step); [Linux hosted agents](https://buildkite.com/docs/agent/buildkite-hosted/linux).

---

## 2.2 Stop building twice

The E2E step builds the app itself (`npm run build -w web`), even though the Build step just did. That's double work and we can take it out.

### Step 1: remove E2E's own build

**This build is expected to fail.** Removing E2E's build command saves duplicate work, but the Build job's output is still on a different machine. Nothing in this version transfers `web/dist/` to E2E. Read the missing-file error before continuing; it explains the next two changes.

```bash
cat > .buildkite/pipeline.yml <<'EOF'
agents:
  queue: "hosted-linux-YOUR_NAME"

steps:
  - label: ":eslint: Lint"
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run lint -w web"

  - label: ":jest: Unit"
    command:
      - ".buildkite/scripts/install.sh"
      - "npm test -w web"
    soft_fail: true

  - label: ":bust_in_silhouette: Account"
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run lint -w account"
      - "npm test -w account"

  - label: ":package: Build"
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run build -w web"

  - label: ":playwright: E2E"
    command:
      - ".buildkite/scripts/install.sh"
      - "npx playwright install --with-deps chromium"
      - "npm run e2e -w web"

  - wait

  - label: ":rocket: Deploy"
    command: "bash .buildkite/scripts/deploy.sh"
    env:
      DEPLOY_KEY: "kite_deploy_not_a_real_key_123"
EOF
git add .buildkite
git commit -m "[Act 2, Section 2.2] Stop building the app twice"
git push
```

**What you should see:** E2E fails. Scroll up from the bottom of its log (past Playwright's stack trace and the `npm error` lines) to:

```
Error: web/dist/ not found. E2E runs against the built app, so dist/ has to exist before it starts.
```

Build made `web/dist/`. Why can't E2E see it?

Removing duplicate work exposes the need to pass build output explicitly.

**Official Buildkite documentation:** [Build artifacts](https://buildkite.com/docs/pipelines/configure/artifacts); [Linux hosted agents](https://buildkite.com/docs/agent/buildkite-hosted/linux).

### Step 2: run the E2E step after the Build step

**Expect the same failure, even though the order is now correct.** `key: build` identifies the producer and `depends_on: build` holds E2E until it succeeds. That dependency changes scheduling; it does not copy the producer's files. Compare the agent names and the error with the previous build.

```bash
cat > .buildkite/pipeline.yml <<'EOF'
agents:
  queue: "hosted-linux-YOUR_NAME"

steps:
  - label: ":eslint: Lint"
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run lint -w web"

  - label: ":jest: Unit"
    command:
      - ".buildkite/scripts/install.sh"
      - "npm test -w web"
    soft_fail: true

  - label: ":bust_in_silhouette: Account"
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run lint -w account"
      - "npm test -w account"

  - label: ":package: Build"
    key: build
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run build -w web"

  - label: ":playwright: E2E"
    depends_on: build
    command:
      - ".buildkite/scripts/install.sh"
      - "npx playwright install --with-deps chromium"
      - "npm run e2e -w web"

  - wait

  - label: ":rocket: Deploy"
    command: "bash .buildkite/scripts/deploy.sh"
    env:
      DEPLOY_KEY: "kite_deploy_not_a_real_key_123"
EOF
git add .buildkite
git commit -m "[Act 2, Section 2.2] Run E2E after Build"
git push
```

**What you should see:**

- E2E now starts only after Build has finished. Same error. Why do you think this is the case?
- Compare the **agent names** on the Build and E2E steps: notice the different machines. Running after isn't the same as sharing a disk. Every hosted job starts on a clean, ephemeral machine that is thrown away afterwards.
- In order to share files between Buildkite jobs, we must explicitly pass them.

> **Worth knowing: stop paying for a build that's already red.** While this build finishes, its status reads *Running … and failing*: E2E has failed, but Unit keeps going for another minute. `cancel_on_build_failing: true` on a step cancels its jobs as soon as any other job fails (soft-failed jobs don't count). We're not adding it here, but on your own pipelines, with long test steps, it's one line that saves real compute:
>
> This is an optional step fragment, not an extra workshop change. Canceling Unit saves work after another required job fails, but also stops collecting its remaining test results. Soft-failed jobs do not trigger this cancellation.
>
> ```yaml
>   - label: ":jest: Unit"
>     cancel_on_build_failing: true
>     command:
>       - ".buildkite/scripts/install.sh"
>       - "npm test -w web"
> ```
>
> Fail-fast cancellation trades additional diagnostic coverage for less work after a failure.
>
> **Official Buildkite documentation:** [Command steps](https://buildkite.com/docs/pipelines/configure/step-types/command-step).
>

An execution dependency provides ordering; artifacts provide the files.

**Official Buildkite documentation:** [Step dependencies](https://buildkite.com/docs/pipelines/configure/depends-on); [Build artifacts](https://buildkite.com/docs/pipelines/configure/artifacts).

### Step 3: pass `dist/` as an artifact

This version supplies both requirements: an execution dependency and a file transfer. Build uploads its output with `artifact_paths`; E2E waits for Build, downloads the matching artifacts, then starts Playwright. Expect E2E to pass without running another application build.

The artifact path retains `web/dist/` so the consumer sees the directory it expects. Quote the download pattern so the agent, rather than the shell, matches the stored artifacts.

```bash
cat > .buildkite/pipeline.yml <<'EOF'
agents:
  queue: "hosted-linux-YOUR_NAME"

steps:
  - label: ":eslint: Lint"
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run lint -w web"

  - label: ":jest: Unit"
    command:
      - ".buildkite/scripts/install.sh"
      - "npm test -w web"
    soft_fail: true

  - label: ":bust_in_silhouette: Account"
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run lint -w account"
      - "npm test -w account"

  - label: ":package: Build"
    key: build
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run build -w web"
    artifact_paths: "web/dist/**/*"

  - label: ":playwright: E2E"
    depends_on: build
    command:
      - ".buildkite/scripts/install.sh"
      - "buildkite-agent artifact download 'web/dist/**' ."
      - "npx playwright install-deps chromium"
      - "npx playwright install chromium"
      - "echo '--- :playwright: Run E2E'"
      - "npm run e2e -w web"

  - wait

  - label: ":rocket: Deploy"
    command: "bash .buildkite/scripts/deploy.sh"
    env:
      DEPLOY_KEY: "kite_deploy_not_a_real_key_123"
EOF
git add .buildkite
git commit -m "[Act 2, Section 2.2] Pass dist from Build to E2E as an artifact"
git push
```

**What you should see:**

- In Build's log: `Found 5 files that match "web/dist/**/*"`. Open Build → **Artifacts** and inspect the actual files; the exact count may change with build output.
- In E2E's log: `Found 5 artifacts. Starting to download to: …`, then 5 lines of `Successfully downloaded "web/dist/…"`, then the tests pass.
- Both pieces were needed: `depends_on` for the order, artifacts for the files.

**The rule:** if a later job needs a file an earlier job made, make it an artifact.

<details>
<summary>Stuck?</summary>

1. Read the E2E error. What file is missing, and which job makes it?
2. Does E2E run after Build? Check the Waterfall.
3. It runs after Build and still fails. Is it on the same machine? Look at the agent name on each job.
4. Build has to upload `dist/`, and E2E has to download it.
</details>

Build once, then explicitly transfer its output to the dependent job.

**Official Buildkite documentation:** [Build artifacts](https://buildkite.com/docs/pipelines/configure/artifacts); [Step dependencies](https://buildkite.com/docs/pipelines/configure/depends-on).

---

## 2.3 Cache your dependencies

Every job runs `npm ci`, which downloads the same 400 packages every time. Buildkite Cache can keep npm's download folder between builds.

Hosted agents may already install this small project quickly, so cache restore and save overhead can outweigh the saved download time. Compare setup logs on a cold build and a rebuild before claiming a speedup. The value of the exercise is the restore/save behavior and reuse across clean machines.

### Shared registry policy

The policy belongs to the shared **Default cache registry**, not `.buildkite/pipeline.yml`. The facilitator applies it once. Saved entries are scoped by pipeline and branch, and restore requests can access only the current pipeline and branch. Keep `$current` and `claims.*` as written: these are policy expressions, not attendee placeholders.

```yaml
save:
  scopes:
    pipeline: true
    branch: true
restore:
  scopes:
    - pipeline: "$current"
      branch: "$current"
rules:
  - name: restore-own
    effect: allow
    action: restore
    when: entry.pipeline == claims.pipeline_slug && entry.branch == claims.build_branch
  - name: save-own
    effect: allow
    action: save
    when: "true"
```

Your identifier makes the entries easy to recognize. The scopes and rules restrict restores to the job's own pipeline and branch, even if someone requests another person's key. The identifier stays before the fallback boundary, so fallback never drops it. A different branch gets its own cache scope.

Registry policy governs access; names make entries recognizable.

**Official Buildkite documentation:** [Buildkite Cache](https://buildkite.com/docs/pipelines/configure/cache).

### Step 1: cache npm (a miss)

We cache npm's downloaded packages in `~/.npm`, rather than passing an installed `node_modules` tree between machines. Every job still runs `npm ci` against the committed lockfile. The cache changes where downloads come from; it does not replace dependency installation.

Replace `YOUR_NAME` in the cache key. It stays before `fallback_limit`, alongside OS and architecture, so a fallback never drops your identifier or crosses those platform boundaries. The registry policy independently restricts which pipeline and branch can restore an entry.

This adds `.buildkite/cache.yml` (what to cache, and its key) and changes `install.sh`, the script every job runs, to restore the cache before `npm ci` and save it after:

```bash
cat > .buildkite/cache.yml <<'EOF'
caches:
  - name: "npm"
    cache_key:
      - "npm"
      - "YOUR_NAME"
      - agent: "os"
      - agent: "arch"
        fallback_limit: true
      - checksum: "package-lock.json"
    target_paths:
      - "~/.npm"
EOF
cat > .buildkite/scripts/install.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

buildkite-agent cache restore --name npm
npm ci
buildkite-agent cache save --name npm

echo "--- :arrow_forward: ${BUILDKITE_LABEL:-install}"
EOF
git add .buildkite
git commit -m "[Act 2, Section 2.3] Cache npm downloads"
git push
```

The key is built from the parts in `cache.yml`, joined together: `npm`, your identifier, the agent's OS and architecture, and a checksum of `package-lock.json`.

**What you should see** (in any job's log):

- **A miss.** It's the first time: `npm-<your-name>-linux-amd64-<long hash> · pipeline=<your-pipeline>, branch=workshop/<your-name> → miss`, then `Cache miss`. Nothing fails; `npm ci` downloads as before. Notice how the agent's OS and architecture were substituted in as part of the cache key.
- **A save** at the end of the job: `Cache saved … archive_size=47 MB`. Jobs that finish a moment later say `Cache already exists, not saving`.
- **E2E** starts after Build, so it may already get a **hit** in this same build.
- The entry: **Agents →** the workshop cluster → **Cache Registries → Default → Entries**. Everyone uses this registry. Your key contains your identifier; its policy also scopes entries to the authenticated pipeline and branch.

Cache regenerable downloads; build correctness must not depend on a cache hit.

**Official Buildkite documentation:** [Buildkite Cache](https://buildkite.com/docs/pipelines/configure/cache).

### Step 2: a hit

Rebuild with the same lockfile and confirm that npm downloads are restored from an exact cache key.

**Rebuild** that build (the **Rebuild** button on the build page). Same lockfile, same key.

**What you should see:** `Cache restored using exact key npm-<your-name>-linux-amd64-…`. npm still runs `npm ci`; packages already in the download cache can be reused, while missing packages or install scripts may still use the network. Confirm the cache hit in the agent log rather than expecting a special npm message.

If it misses, check that the pipeline, branch, OS, architecture and lockfile match the saved entry. A deleted or expired entry also misses. A normal miss should let installation proceed.

A repeated build distinguishes a warm-cache restore from the first cold-cache run.

**Official Buildkite documentation:** [Buildkite Cache](https://buildkite.com/docs/pipelines/configure/cache).

### Step 3: add a dependency (the fallback)

Change the lockfile and observe how a fallback cache reuses existing npm downloads.

Real projects add dependencies, and every lockfile change means a new key. Does that mean starting from zero? This takes `package.json` and `package-lock.json` from the workshop's end-of-Act-2 version, where the only change is one new package, `kleur`. (On a real team you'd run `npm install --save-dev kleur`; you get the same files, and you don't need Node on your laptop.)

```bash
git fetch origin checkpoint/act-2
git checkout FETCH_HEAD -- package.json package-lock.json
git commit -m "[Act 2, Section 2.3] Add kleur"
git push
```

**What you should see:**

- The exact key misses (the lockfile changed): `npm-<your-name>-linux-amd64-<new hash> · pipeline=<your-pipeline>, branch=workshop/<your-name> → miss`.
- **The fallback hits:** `Cache restored using fallback key npm-<your-name>-linux-amd64-<old hash>`. In `cache.yml`, the `arch` part has `fallback_limit: true`: everything after it (the lockfile checksum) is optional when restoring. So Buildkite restores the newest cache for your `npm-<your-name>-linux-amd64`, and `npm ci` only downloads what's new.
- A new entry is saved under the new key. Cache Registries now shows two npm entries.

Fallback reuses earlier downloads while npm reconciles the new lockfile.

**Official Buildkite documentation:** [Buildkite Cache](https://buildkite.com/docs/pipelines/configure/cache).

### Step 4: the shared Git mirror

Observe the facilitator enabling the shared Git mirror and compare checkout behavior on later builds.

Every job also clones the exercise repo. The facilitator enables the Git mirror once for the shared cluster so jobs clone from a copy next to the agents:

**Agents → `WORKSHOP_CLUSTER_NAME` → Cache Storage → Settings → Enable Git mirror → Save**. Watch this as a shared-setting demonstration; if it is already enabled, leave it enabled.

No push needed. **What you should see** in your next build's checkout lines: first `git clone --mirror …` (building the mirror), and on later builds `# Updating existing repository mirror …`. Before, it said `Remote Git mirror: outcome=skipped site=none skip_reason=no-url`: that just meant it was off.

This repo is tiny, so it saves a second or two. On a big repo, a full clone in every job can take minutes. Act 4 uses `HEAD^` and does not depend on a remote branch reference for its comparison.

<details>
<summary>Stuck?</summary>

1. Your first restore normally misses; a later job in the same build may hit a cache already saved. Rebuild to check an exact-key hit.
2. Can't find the entry? It's under the **cluster**: Agents → your cluster → Cache Registries.
3. (Fallback) Which part of the key changed? Which part has `fallback_limit: true`?
4. Ignore `No cache paths specified. Skipping cache mounting.` in the logs: that's a different hosted feature we don't use.
</details>

Git mirrors speed checkout; dependency caches speed setup.

**Official Buildkite documentation:** [Hosted cache volumes and Git mirrors](https://buildkite.com/docs/agent/buildkite-hosted/cache-volumes).

<!-- compare act-2 -->

---

## What you did, and why it matters

You removed the `wait`s that weren't protecting anything, passed `dist/` from Build to E2E as an artifact (with `depends_on` for the order), cached npm's downloads with a fallback key, and saw the shared Git mirror. About **4m45s → 2m15s**, with nothing skipped.

- **Parallel by default scales with agents.** Add steps and agents, not minutes. Use a `wait` or `depends_on` only where something really needs something else.
- **Artifacts are how jobs share files, on purpose.** Nothing works by accident because the last job's files were still on disk. And they're downloadable: test reports, coverage, app bundles.
- **The cache pays off with big dependency trees and on your own agents.** The fallback key means a new dependency never sends you back to zero.
- **Cache or artifact?** If the build breaks without it, it's an artifact. If it's only slower without it, it's a cache.

**Official Buildkite documentation:** [Step dependencies](https://buildkite.com/docs/pipelines/configure/depends-on); [Build artifacts](https://buildkite.com/docs/pipelines/configure/artifacts); [Buildkite Cache](https://buildkite.com/docs/pipelines/configure/cache); [Hosted cache volumes and Git mirrors](https://buildkite.com/docs/agent/buildkite-hosted/cache-volumes).

**Next:** [Act 3: Make it trustworthy](act-3.md). Fell behind? `./scripts/catch-up-branch.sh 2` (the shared Git mirror is handled in step 4).
