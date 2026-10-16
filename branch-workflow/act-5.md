# Act 5: Ship it and tell people

**Goal:** Right now Deploy runs on every branch, with no manual approval, and its deploy key sits in plain text in `pipeline.yml` (and the deploy log prints it). You'll move the key into a secret, deploy only from `workshop/<your-name>`, add a human approval step, make sure only one deploy job runs at a time, and send out a notification when a build on `workshop/<your-name>` fails.

**Time:** about 40 minutes.

**You start with:** the end of Act 4. (Caught up with `./scripts/catch-up-branch.sh 4`? You still need the Buildkite setup from Acts 1–3.)

**Run commands from your `buildkite-workshop` folder, on `workshop/<your-name>` unless a step says to switch.**

Your primary workshop branch plays the deployment-branch role today. Shared `main` stays untouched. The deploy is a mock: it prints messages and sleeps.

---

## 5.1 Get the key out of the repo

Open any Deploy job's log from earlier: `Deploying with key kite_deploy_not_a_real_key_123`. It's in `pipeline.yml`, in the shared repository, and in the logs.

### Step 1: create a cluster secret

Store the fake deployment key in your personal cluster secret before referencing it from the pipeline.

**Agents →** your cluster → **Secrets → New Secret**:

- Key: **`DEPLOY_KEY_<your-name>`**, for example `DEPLOY_KEY_alicesmith`
- Value: **`kite_deploy_not_a_real_key_123`**
- No access policy yet → **Create**.

Creating a secret and consuming it are separate steps.

**Official Buildkite documentation:** [Buildkite secrets](https://buildkite.com/docs/pipelines/security/secrets/buildkite-secrets).

### Step 2: read the key from the secret

Replace Deploy's inline `env` value with a `secrets` mapping. The left side, `DEPLOY_KEY`, is the environment variable the script already reads; the right side, `DEPLOY_KEY_YOUR_NAME`, is your cluster secret's key. Replace `YOUR_NAME` in both the queue and secret reference, and create that exact secret in the pipeline's cluster first.

The mock script still prints the key to demonstrate agent redaction. In a real deployment script, avoid printing credentials even when redaction is available. Moving a value out of the current YAML also does not erase its earlier Git history; this workshop key is deliberately fake.

Deploy loses its `env:` with the key and gets a **secrets mapping** instead: `DEPLOY_KEY: DEPLOY_KEY_<your-name>`. The agent reads your personal cluster secret and exposes it to the script as `DEPLOY_KEY`, so the script does not need to change.

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
    secrets:
      DEPLOY_KEY: DEPLOY_KEY_YOUR_NAME
EOF
git add .buildkite
git commit -m "[Act 5, Section 5.1] Read the deploy key from a cluster secret"
git push
```

**What you should see:**

- The Deploy log starts with `~~~ Preparing secrets` / `# Secret DEPLOY_KEY_<your-name> added as environment variable DEPLOY_KEY`.
- Then **`Deploying with key [REDACTED]`**. The agent hides a secret's value wherever it appears in the log.
- On the Secrets page, the **Last read** column now shows when the secret was used.

The pipeline now references a secret name rather than embedding its value.

**Official Buildkite documentation:** [Buildkite secrets](https://buildkite.com/docs/pipelines/security/secrets/buildkite-secrets).

---

## 5.2 Deploy only from `workshop/<your-name>`

### Step 1: the problem

Demonstrate that a push to your test-deploy branch still runs the mock deployment. Replace `YOUR_NAME` in the branch commands. Start from your primary workshop branch so the new branch inherits its current pipeline.

Push a branch with a README change:

```bash
git switch -c "workshop/YOUR_NAME-test-deploy"
echo "Branch test." >> README.md
git add README.md
git commit -m "[Act 5, Section 5.2] Branch test: README only"
git push -u origin "workshop/YOUR_NAME-test-deploy"
git switch "workshop/YOUR_NAME"
```

**What you should see:** a build of the branch where the web steps and Account are skipped (only the README changed), and **Deploy runs**. A branch just "deployed to production".

A secret mapping alone does not limit which branches can deploy.

**Official Buildkite documentation:** [Branch configuration](https://buildkite.com/docs/pipelines/configure/workflows/branch-configuration); [Buildkite secrets](https://buildkite.com/docs/pipelines/security/secrets/buildkite-secrets).

### Step 2: an `if` on Deploy

The Deploy group's condition is evaluated for the build branch. On your primary branch the group runs; on test-deploy it skips. Keep the condition, queue and secret reference aligned with your personal names. This is the normal scheduling behavior; the secret policy in Step 3 separately controls whether a job can retrieve the key.

Deploy moves into a **Deploy group** with `if: build.branch == "workshop/<your-name>"`:

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

  - group: ":rocket: Deploy"
    if: build.branch == "workshop/YOUR_NAME"
    steps:
      - label: ":rocket: Deploy"
        command: "bash .buildkite/scripts/deploy.sh"
        secrets:
          DEPLOY_KEY: DEPLOY_KEY_YOUR_NAME
EOF
git add .buildkite
git commit -m "[Act 5, Section 5.2] Deploy only from my workshop branch"
git push
```

A group condition prevents routine deployment jobs on the test branch.

**Official Buildkite documentation:** [Using conditionals](https://buildkite.com/docs/pipelines/configure/conditionals); [Group steps](https://buildkite.com/docs/pipelines/configure/step-types/group-step).

### Step 3: a policy on the secret

Paste this YAML into the **secret's access policy**, not the repository pipeline. Both claims in this rule must match. Replace `<your-name>` in the pipeline slug and branch, using the actual slug from the pipeline URL rather than assuming it matches the display name.

A typo denies the primary branch too. First verify an authorized build can still read the secret, then use Step 4 to exercise the unauthorized branch.

**Agents →** your cluster → **Secrets →** `DEPLOY_KEY_<your-name>` → edit its **access policy**, using your pipeline's slug (the last part of its URL, for example `workshop-<your-name>`):

```yaml
- pipeline_slug: workshop-<your-name>
  build_branch: workshop/<your-name>
```

Now only `workshop/<your-name>` builds of your pipeline can read the key.

Secret access policy adds a separate check when the job requests the deployment key.

**Official Buildkite documentation:** [Secret access policies](https://buildkite.com/docs/pipelines/security/secrets/buildkite-secrets/access-policies).

### Step 4: try the branch again

Verify that test-deploy skips deployment, then optionally prove that the secret policy denies access if the branch condition is removed.

Replace every `YOUR_NAME` in both command blocks below. Complete the secret policy first, then bring the test branch up to date with `workshop/<your-name>` and push it:

```bash
git switch "workshop/YOUR_NAME-test-deploy"
git merge --no-edit "workshop/YOUR_NAME"
git push
git switch "workshop/YOUR_NAME"
```

**What you should see:** **Deploy is skipped** because this is your test-deploy branch. Click it to inspect the branch-condition reason.

Web and Account have separate `if_changed` filters from Act 4. Their behavior depends on the files changed between this build’s commit and its first parent (`HEAD^`):

- A change to `.buildkite/pipeline.yml` matches both filters, so Web and Account should run.
- A README-only change matches neither filter, so both skip. They may be hidden if **auto-hide skipped steps** is enabled.

Do not assume that the merge itself makes every check run. Open the `:pipeline:` upload log and inspect the change-comparison output; click a skipped Web/Account step to check for `No changed files matched if_changed.` If this build’s comparison includes `.buildkite/pipeline.yml` but both still skip, check the uploaded YAML and the bootstrap’s `--git-diff-base HEAD^` setting. The branch condition on Deploy does not skip Web or Account.

The outcome this exercise verifies is that **test-deploy cannot run Deploy**; Web/Account running or skipping is a separate change-detection decision.

**Two layers:** the `if` keeps deploys off your test branch for convenience. The secret policy is the real guardrail. Optional proof: remove the `if` on the branch, and Deploy fails in under a second with `404 Not Found: Secret not found or access denied`. The policy works; it just doesn't explain itself.

```sh
git switch "workshop/YOUR_NAME-test-deploy"
perl -ni -e 'print unless /^    if: build\.branch == "workshop\/[a-z0-9]+"$/' .buildkite/pipeline.yml
git commit -am "[Act 5, Section 5.2] Branch test: deploy without the if"
git push
git switch "workshop/YOUR_NAME"
```

<details>
<summary>Stuck?</summary>

1. The branch still deploys? Check the quotes and the `==` in the `if`.
2. `workshop/<your-name>` can't read the key either? Check the policy's `pipeline_slug` matches your pipeline's URL exactly.
</details>

Test the normal skip and the denied secret read as two distinct outcomes.

**Official Buildkite documentation:** [Using conditionals](https://buildkite.com/docs/pipelines/configure/conditionals); [Secret access policies](https://buildkite.com/docs/pipelines/security/secrets/buildkite-secrets/access-policies).

---

## 5.3 Adding human approval

### Step 1: an approval, and one deploy at a time

There are two independent controls here: a block step records human approval, and a concurrency group limits active deploy jobs. Deploy explicitly names Web, Account and `approve-deploy` as dependencies. Explicit dependencies override implicit wait/block ordering, so the approval key must be in that list.

Replace `YOUR_NAME`, including the secret suffix. Leave `${BUILDKITE_PIPELINE_SLUG}` intact: the upload interpolates it into your pipeline's slug. The quoted heredoc keeps your laptop shell from expanding it prematurely.

The Deploy group gets a **block** step (`Deploy to production?`), and Deploy gets a **concurrency limit**: at most one deploy in its `concurrency_group` at a time. The group's name is `${BUILDKITE_PIPELINE_SLUG}/deploy`: the agent fills in your pipeline's slug when it uploads the file, so each of you gets your own group. Deploy `depends_on` Web, Account **and** the approval.

This also changes `deploy.sh` from `sleep 5` to `sleep 30`. The sleep mocks the time a real deployment could take. It also gives you about half a minute to see the second deploy wait. Deploys only happen on `workshop/<your-name>` after a human approval now.

```bash
perl -pi -e 's/^sleep 5$/sleep 30/' .buildkite/scripts/deploy.sh
```
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
    key: account
    if_changed: ["account/**", "*.{json,mjs,cjs}", ".buildkite/**"]
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run lint -w account"
      - "npm test -w account"

  - wait

  - group: ":rocket: Deploy"
    if: build.branch == "workshop/YOUR_NAME"
    steps:
      - block: ":rocket: Deploy to production?"
        key: approve-deploy

      - label: ":rocket: Deploy"
        depends_on: [web, account, approve-deploy]
        concurrency: 1
        concurrency_group: "${BUILDKITE_PIPELINE_SLUG}/deploy"
        command: "bash .buildkite/scripts/deploy.sh"
        secrets:
          DEPLOY_KEY: DEPLOY_KEY_YOUR_NAME
EOF
git add .buildkite
git commit -m "[Act 5, Section 5.3] Approve deploys, one at a time"
git push
```

**What you should see:** everything runs (the pipeline changed), then the build **waits at `Deploy to production?`**.

The shown configuration places a `wait` before the Deploy group, so the block step inherits that wait: expect to approve after the preceding checks complete. Deployment separately requires Web, Account **and** approval through `depends_on`. Leave `approve-deploy` out of that list and the explicit dependencies can bypass the block.

In a pipeline that deliberately makes approval available earlier, an early approval must still not bypass required checks. Keep those checks as explicit deploy dependencies rather than relying on the position of the approval button.

Name every required dependency and use concurrency to serialize deployment jobs.

**Official Buildkite documentation:** [Block steps](https://buildkite.com/docs/pipelines/configure/step-types/block-step); [Step dependencies](https://buildkite.com/docs/pipelines/configure/depends-on); [Controlling concurrency](https://buildkite.com/docs/pipelines/configure/workflows/controlling-concurrency).

### Step 2: two deploys at once

Approve two builds close together and verify that the concurrency limit allows only one deploy to run at a time.

1. While that build waits at the approval, click **Rebuild** on it. The rebuild runs everything again (the commit changed `.buildkite/pipeline.yml`, and `HEAD^` compares it with its parent again) and waits at its own approval. Don't approve the first one yet.
2. When both are waiting, approve both, **within about 30 seconds** of each other.

**What you should see:** the first Deploy runs. The second **waits**. Open it: a **"Limited by concurrency group"** panel names the group, its limit of 1, and the job ahead of it: `Deploy in <your pipeline> #N (Running …)`. When the first finishes, the second starts.

Concurrency groups are organization-wide **when jobs use the same exact group string**. This workshop includes the pipeline slug, so each attendee has a separate group and does not block other attendees. Two real pipelines deploying the same service must intentionally share a group name to serialize those deployments. Approvals are recorded separately: who approved which build, and when.

<details>
<summary>Stuck?</summary>

1. `block` pauses the build until someone clicks.
2. Both deploys ran at once? Did you approve them more than 30 seconds apart? Does Deploy have both `concurrency` and `concurrency_group`?
</details>

Concurrency coordinates deployment jobs across builds; approval records the human decision.

**Official Buildkite documentation:** [Controlling concurrency](https://buildkite.com/docs/pipelines/configure/workflows/controlling-concurrency); [Block steps](https://buildkite.com/docs/pipelines/configure/step-types/block-step).

---

## 5.4 Send a notification when `workshop/<your-name>` breaks

### Step 1: notify block

Top-level `notify` reports the outcome of the whole build. Each webhook condition requires both your primary branch and a final state: `failed` or `passed`. A job can fail while the build is still running and failing; the failed-build notification waits for the matching final state. A build waiting for deployment approval has not passed.

Set `WEBHOOK_URL` to the unique URL from Act 3 and replace every `YOUR_NAME`. The terminal command substitutes that URL into both webhook entries; in the web editor, replace both `YOUR-ID` URLs yourself. Leave `${BUILDKITE_PIPELINE_SLUG}` unchanged.

`notify` sits at the top of `pipeline.yml`, next to `steps`. This one sends a webhook to your webhook.site URL (the tab from Act 3) when a `workshop/<your-name>` build fails, and another when a `workshop/<your-name>` build passes. Steps can have their own `notify` too.

Put your webhook.site URL in the first line, in place of `https://webhook.site/YOUR-ID`, then paste the block:

```bash
WEBHOOK_URL="https://webhook.site/YOUR-ID"
git config workshop.webhook "$WEBHOOK_URL"
cat > .buildkite/pipeline.yml <<'EOF'
agents:
  queue: "hosted-linux-YOUR_NAME"

notify:
  - webhook: "https://webhook.site/YOUR-ID"
    if: build.branch == "workshop/YOUR_NAME" && build.state == "failed"
  - webhook: "https://webhook.site/YOUR-ID"
    if: build.branch == "workshop/YOUR_NAME" && build.state == "passed"

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
    key: account
    if_changed: ["account/**", "*.{json,mjs,cjs}", ".buildkite/**"]
    command:
      - ".buildkite/scripts/install.sh"
      - "npm run lint -w account"
      - "npm test -w account"

  - wait

  - group: ":rocket: Deploy"
    if: build.branch == "workshop/YOUR_NAME"
    steps:
      - block: ":rocket: Deploy to production?"
        key: approve-deploy

      - label: ":rocket: Deploy"
        depends_on: [web, account, approve-deploy]
        concurrency: 1
        concurrency_group: "${BUILDKITE_PIPELINE_SLUG}/deploy"
        command: "bash .buildkite/scripts/deploy.sh"
        secrets:
          DEPLOY_KEY: DEPLOY_KEY_YOUR_NAME
EOF
perl -pi -e "s#https://webhook.site/YOUR-ID#${WEBHOOK_URL}#g" .buildkite/pipeline.yml
grep -n 'webhook:' .buildkite/pipeline.yml
git add .buildkite
git commit -m "[Act 5, Section 5.4] Notify a webhook when my workshop branch fails or passes"
git push
```

**In GitHub's web editor instead:** select your primary workshop branch, paste the YAML, replace `YOUR_NAME`, then replace `https://webhook.site/YOUR-ID` with your URL in both `webhook:` lines.

**What you should see:** the `grep` prints two `webhook:` lines with your URL. Still `YOUR-ID`? Put your URL in both lines of `.buildkite/pipeline.yml`, then commit and push again.

Build notifications report final pipeline outcomes independently of Test Engine workflow alerts.

**Official Buildkite documentation:** [Build notifications](https://buildkite.com/docs/pipelines/configure/notify); [Using conditionals](https://buildkite.com/docs/pipelines/configure/conditionals).

### Step 2: break `workshop/<your-name>` on purpose

Introduce a deliberate lint failure and verify delivery of the failed-build webhook.

```bash
echo 'const brokenOnPurpose = 1;' >> web/src/main.ts
git add web/src/main.ts
git commit -m "[Act 5, Section 5.4] Break lint on purpose"
git push
```

**What you should see:** Lint fails, and about a second after the build fails, a request arrives in your webhook.site tab: the build's details as JSON, with its state, `failed`.

A controlled failure verifies the failure notification end to end.

**Official Buildkite documentation:** [Build notifications](https://buildkite.com/docs/pipelines/configure/notify).

### Step 3: fix it

Revert the deliberate failure, approve the deployment and verify delivery of the passed-build webhook. Before using `git revert HEAD`, check that HEAD is still the deliberate lint-break commit; otherwise revert that commit by its actual SHA.

```bash
git revert --no-edit HEAD
git push
```

**What you should see:** the build goes green up to the approval. The `passed` request only arrives once the build has really finished: approve the deploy, and it arrives about half a minute later, when the deploy is done.

Recovery notification requires a completed passing build, including deployment.

**Official Buildkite documentation:** [Build notifications](https://buildkite.com/docs/pipelines/configure/notify); [Block steps](https://buildkite.com/docs/pipelines/configure/step-types/block-step).

<!-- compare act-5 -->

---

## What you did, and why it matters

You moved the deploy key out of the repo into a cluster secret, made deploys run on your workshop branch only (an `if` plus a secret policy), added a human approval step, made sure only one deploy runs at a time, and notified when `workshop/<your-name>` breaks and recovers.

- **Secrets live in the cluster,** redacted in logs, with access policies (only `workshop/<your-name>`, only this pipeline), and **Last read** shows who uses what.
- **An audit trail for approvals:** who approved which deploy, and when.
- **Concurrency groups work across pipelines,** so two pipelines deploying the same service still queue behind each other.
- **Notifications where your team looks:** a webhook sends the build's details to any tool when `workshop/<your-name>` fails or passes.

**Official Buildkite documentation:** [Buildkite secrets](https://buildkite.com/docs/pipelines/security/secrets/buildkite-secrets); [Secret access policies](https://buildkite.com/docs/pipelines/security/secrets/buildkite-secrets/access-policies); [Block steps](https://buildkite.com/docs/pipelines/configure/step-types/block-step); [Controlling concurrency](https://buildkite.com/docs/pipelines/configure/workflows/controlling-concurrency); [Build notifications](https://buildkite.com/docs/pipelines/configure/notify).

## The whole day

You inherited a pipeline that was slow, wasteful, hid a failing test, and deployed from every branch with its key in plain text. It's now fast (about 4m45s → 1 minute), trustworthy (every test tracked, flaky tests caught and fixed), smart (only what changed runs), and safe to ship (secret, your branch only, approved, one at a time, and you hear when `workshop/<your-name>` breaks).

Your branch in the shared repository keeps all of it. Take the parts you want back to your own pipelines.

The five acts combine faster checks, visible test results, change-aware execution and controlled mock deployment.

**Official Buildkite documentation:** [Test splitting with bktec](https://buildkite.com/docs/pipelines/speed-up-builds-with-bktec); [Using if_changed](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines/if-changed); [Secret access policies](https://buildkite.com/docs/pipelines/security/secrets/buildkite-secrets/access-policies); [Controlling concurrency](https://buildkite.com/docs/pipelines/configure/workflows/controlling-concurrency).
