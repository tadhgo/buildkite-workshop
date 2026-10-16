# Act 4: Make it smart

**Goal:** Right now, every step of the build runs regardless of what actually changed in the latest commit. A typo fix in the README will trigger a build and run the lint, four test jobs, a build, a browser, end-to-end tests. We'll explore ways to scope the amount of work a build should based on what code has actually changed, and skip steps that are not needed.

**Time:** about 25 minutes.

**You start with:** the end of Act 3. (Caught up with `./scripts/catch-up-branch.sh 3`? You still need the Buildkite setup from Acts 1–3, including your personal queue and suite. Keep `--git-diff-base HEAD^` in Settings → Steps.)

**Run commands from your `buildkite-workshop` folder.** Replace every `YOUR_NAME` in the command blocks with your identifier, including queue and cache values. Stay on your personal workshop branch.

**In this act, push one commit at a time** and wait for each build's first step (the pipeline upload) to finish before the next push. You'll see why in 4.1.

---

## 4.1 Skip what didn't change

`if_changed` on a step means: only run this step if the commit changed a file matching one of these patterns.

- **The agent decides, during the upload step.** While it uploads `pipeline.yml`, it works out which files changed and marks the steps with no matching file as skipped. (So `if_changed` only works in `pipeline.yml` in the repo, not in the steps in the pipeline's settings.)
- **Changed compared to what?** Our upload step explicitly uses **`HEAD^`**, the first parent of the checked-out commit. Each attendee's build compares their commit with its own parent. Earlier changes on the branch are not included. Push three commits at once and only the last is checked, hence one commit per push. Without this override, feature branches normally compare against the configured base branch.
- **If it can't work out what changed, it runs everything.** The worst case is time, never a missed test.

### Step 1: add `if_changed` to each step

When the pipeline.yaml is uploaded, the agent checks each step’s if_changed patterns against the changed files in the commit and converts nonmatching steps to skip steps. The checks include .buildkite/** and root-level config files because changes there can affect both applications.

Keep the bootstrap's `--git-diff-base HEAD^`, replace `YOUR_NAME`, and push one commit at a time. This configuration commit changes `.buildkite/pipeline.yml`, so it should run every check.

This push changes `pipeline.yml`, so everything runs:

```bash
cat > .buildkite/pipeline.yml <<'EOF'
agents:
  queue: "hosted-linux-YOUR_NAME"

steps:
  - label: ":eslint: Lint"
    if_changed: ["web/**", "*.{json,mjs,cjs}", ".buildkite/**"]
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run lint -w web"

  - label: ":jest: Unit"
    if_changed: ["web/**", "*.{json,mjs,cjs}", ".buildkite/**"]
    parallelism: 4
    command:
      - ".buildkite/scripts/install.sh"
      - "bktec run"
    plugins:
      - tests#v1.0.1:
          test-runner: jest
          result-path: jest-results.json
          test-file-pattern: "web/tests/**/*.test.ts"

  - label: ":bust_in_silhouette: Account"
    if_changed: ["account/**", "*.{json,mjs,cjs}", ".buildkite/**"]
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run lint -w account"
      - "npm test -w account"

  - label: ":package: Build"
    if_changed: ["web/src/**", "*.{json,mjs,cjs}", ".buildkite/**"]
    key: build
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run build -w web"
    artifact_paths: "web/dist/**/*"

  - label: ":playwright: E2E"
    if_changed: ["web/**", "*.{json,mjs,cjs}", ".buildkite/**"]
    depends_on: build
    command:
      - ".buildkite/scripts/install.sh"
      - "buildkite-agent artifact download 'web/dist/**' ."
      - "npx playwright install-deps chromium"
      - "npx playwright install chromium"
      - "echo '--- :playwright: Run E2E'"
      - "npm run e2e -w web"
      - "buildkite-agent artifact upload web/screenshots/shop.png"
      - "buildkite-agent annotate --style info --context shop '<img src=\"artifact://web/screenshots/shop.png\" alt=\"Kite Shop\" height=\"300\">'"

  - wait

  - label: ":rocket: Deploy"
    command: "bash .buildkite/scripts/deploy.sh"
    env:
      DEPLOY_KEY: "kite_deploy_not_a_real_key_123"
EOF
git add .buildkite
git commit -m "[Act 4, Section 4.1] Skip steps whose files didn't change"
git push
```

Read the patterns:

- **Lint, Unit, E2E: `web/**`**, any file in the web app. **Build: `web/src/**`**, only the app's source.
- **Account: `account/**`.**
- **Every step also lists `"*.{json,mjs,cjs}"`:** shared files at the root, like `package.json` and the lockfile. `*` only matches the top folder, so `account/package.json` doesn't count.
- **And `".buildkite/**"`:** that folder is the CI itself (`pipeline.yml`, `install.sh`, `cache.yml`). Change it and every step has to prove it still works. Without it, a change to `install.sh` would match no step, and nothing would test it.
- Several patterns mean **or**: any one match runs the step. Quote every pattern: `*` and `{` mean something else in YAML.

**What you should see:** everything runs. Open the `:pipeline:` job's log: `Applying if_changed conditions relative to "<parent commit>" (the merge-base of "HEAD^" and HEAD)`, then `if_changed found 1 changed file`.

Change conditions are evaluated during upload; related steps must have compatible conditions.

**Official Buildkite documentation:** [Using if_changed](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines/if-changed); [Pipeline upload](https://buildkite.com/docs/agent/cli/reference/pipeline).

### Step 2: a README-only change

Verify that a README-only change skips the checks and observe whether the mock deploy still runs.

```bash
echo "" >> README.md
echo "Edited in Act 4: a README-only change." >> README.md
git add README.md
git commit -m "[Act 4, Section 4.1] Edit the README"
git push
```

**What you should see:**

- Only the upload step and **Deploy** run. About **20 seconds** instead of a minute.
- At first the skipped steps aren't even drawn: turn off **auto-hide skipped steps** on the build page (it's on by default). Now they show greyed out and crossed through. Click one: `No changed files matched if_changed.`

**Should a README change deploy?** Deploy has no `if_changed`, so it ran. Many teams deploy every `main` commit; others only when something deployable changed. Both are fine; Act 5 makes deploying safe either way. If you want the second, it's one line on Deploy (optional; the next step's block overwrites it):

```sh
perl -pi -e 'print $_ and $_ = "    if_changed: [\"web/src/**\", \"*.{json,mjs,cjs}\", \".buildkite/**\"]\n" if /^  - label: ":rocket: Deploy"$/' .buildkite/pipeline.yml
git add .buildkite/pipeline.yml
git commit -m "[Act 4, Section 4.1] Only deploy when the app changes"
git push
```

Skipping checks does not automatically skip deployment; each condition must express the intended behavior.

**Official Buildkite documentation:** [Using if_changed](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines/if-changed); [Command steps](https://buildkite.com/docs/pipelines/configure/step-types/command-step).

### Step 3: an `account/`-only change

Verify that an Account-only change runs Account checks while the Web checks skip.

```bash
perl -pi -e 's/("version": "0.1.0",\n)/$1  "description": "Account checks: login form and profile helpers",\n/' account/package.json
git add account/package.json
git commit -m "[Act 4, Section 4.1] Describe the account package"
git push
```

**What you should see:** upload, **Account** and Deploy run. The web steps skip. Two apps in one repo, and neither waits for the other.

**Rebuild repeats that commit's comparison.** `HEAD^` is the parent of the checked-out build commit, even after your branch moves on. New changes still need a new commit and push. Rebuilding an old build also uses its older pipeline YAML, so use the latest build when testing your current configuration.

Per-app patterns can isolate work within a monorepo.

**Official Buildkite documentation:** [Using if_changed](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines/if-changed).

---

## 4.2 The skipped-step trap

### Step 1: change only a test

Expose the skipped-step trap: E2E runs after a skipped Build but has no artifact to download.

Add a comment to the E2E test. The Lint, Unit and E2E step use the `web/**` pattern for `if_changed`. Build's pattern is `web/src/**`. **Expect red:**

```bash
perl -pi -e 'print "// The shop page lists every kite we sell.\n" if /^test\("shows the kite catalog"/' web/e2e/shop.e2e.ts
git add web/e2e/shop.e2e.ts
git commit -m "[Act 4, Section 4.2] Comment the catalog E2E test"
git push
```

**What you should see:** Build is skipped, **E2E runs anyway**, and fails about 7 lines from the bottom of its log:

```
buildkite-agent: fatal: failed to download artifacts: no artifacts found for downloading
```

What state is Build in? What does E2E wait for? The E2E step `depends_on` on the Build step, and **a skipped step counts as done** for the steps that depend on it. So E2E went ahead with nothing to download.

A skipped dependency satisfies ordering but cannot produce files for its dependents.

**Official Buildkite documentation:** [Step dependencies](https://buildkite.com/docs/pipelines/configure/depends-on); [Build artifacts](https://buildkite.com/docs/pipelines/configure/artifacts); [Using if_changed](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines/if-changed).

### Step 2: Fix the skipped Build step

Apply the change condition once to the Web group and remove the separate conditions from its children. Now any relevant Web change includes both the artifact producer and its consumer. The group is a shared condition and visual container; its children still run concurrently unless a wait or explicit dependency orders them. E2E retains `depends_on: build`.

Expect this configuration commit to run Web and Account. Then use the separate test-only commit below to prove that the original artifact failure has been fixed.

We can fix this by putting the four web steps in one **group** with one pattern. The group runs or skips as a whole, so the steps that depend on each other can't drift apart. **Expect green:**

```bash
cat > .buildkite/pipeline.yml <<'EOF'
agents:
  queue: "hosted-linux-YOUR_NAME"

steps:
  - group: ":globe_with_meridians: Web"
    key: web
    if_changed: ["web/**", "*.{json,mjs,cjs}", ".buildkite/**"]
    steps:
      - label: ":eslint: Lint"
        command:
          - ".buildkite/scripts/install.sh"
          - "npm run lint -w web"

      - label: ":jest: Unit"
        parallelism: 4
        command:
          - ".buildkite/scripts/install.sh"
          - "bktec run"
        plugins:
          - tests#v1.0.1:
              test-runner: jest
              result-path: jest-results.json
              test-file-pattern: "web/tests/**/*.test.ts"

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
          - "buildkite-agent artifact upload web/screenshots/shop.png"
          - "buildkite-agent annotate --style info --context shop '<img src=\"artifact://web/screenshots/shop.png\" alt=\"Kite Shop\" height=\"300\">'"

  - label: ":bust_in_silhouette: Account"
    if_changed: ["account/**", "*.{json,mjs,cjs}", ".buildkite/**"]
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run lint -w account"
      - "npm test -w account"

  - wait

  - label: ":rocket: Deploy"
    command: "bash .buildkite/scripts/deploy.sh"
    env:
      DEPLOY_KEY: "kite_deploy_not_a_real_key_123"
EOF
git add .buildkite
git commit -m "[Act 4, Section 4.2] Guard the web steps as one group"
git push
```

**What you should see:**

- This configuration push runs the whole **Web** group because `.buildkite/**` changed.
- On the build page, the group is one **Web** box. When it's skipped, it's one crossed-through line.
- Build now runs on any `web/` change, so whenever E2E runs, `dist/` exists. A test-only change costs a few seconds of building. Correct beats fast.

Prove it with a new test-only change after the group fix:

```bash
echo '// Test-only changes keep the Web build and E2E together.' >> web/e2e/shop.e2e.ts
git add web/e2e/shop.e2e.ts
git commit -m "[Act 4, Section 4.2] Prove the Web group on a test-only change"
git push
```

**What you should see:** Lint, Unit, Build and E2E all run inside **Web**; Account skips. E2E downloads the artifact and passes.

Keep artifact producers and consumers under a shared change condition. Grouping alone does not serialize their jobs.

**Official Buildkite documentation:** [Group steps](https://buildkite.com/docs/pipelines/configure/step-types/group-step); [Using if_changed](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines/if-changed); [Step dependencies](https://buildkite.com/docs/pipelines/configure/depends-on).

<!-- compare act-4 -->

---

## What you did, and why it matters

You added `if_changed` to each step, proved it with a README change (almost nothing ran) and an `account/` change (only Account ran), fell into the skipped-step trap, and fixed it with one group and one pattern. A full build is about a minute with a README-only build about 20 seconds. `if_changed` is just one way of many ways you can dynamically generate the steps of your builds at runtime based on what files have been modified.

- **Monorepos scale.** Each app builds when it changes, not when anything changes.
- **Less compute, smaller bills,** and shorter queues for everyone sharing the agents.
- **The decision is visible:** the upload log says what it compared, and each skipped step says why.
- **It fails safe:** if the agent can't work out what changed, it runs everything.
- **Know the limits:** this workshop compares one commit with its parent, so push one commit at a time. A real feature-branch pipeline may compare all changes against its base branch instead.
- **When patterns aren't enough,** a script can generate the pipeline at run time (dynamic pipelines).

**Official Buildkite documentation:** [Using if_changed](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines/if-changed); [Group steps](https://buildkite.com/docs/pipelines/configure/step-types/group-step); [Step dependencies](https://buildkite.com/docs/pipelines/configure/depends-on).

**Next:** [Act 5: Ship it and tell people](act-5.md). Fell behind? `./scripts/catch-up-branch.sh 4`.
