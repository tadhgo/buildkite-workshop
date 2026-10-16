# Act 3: Make it trustworthy

**Goal:** Improve the pipeline's testing posture by actually failing the build when the Unit test step fails, not masking it with `soft_fail`. You'll also give every test its own execution history in Test Engine so we can find a slow test and a flaky one without reading logs. We'll then fix them properly, then use the test execution history to evenly split the test across four parallel Buildkite agents.

**Time:** about 45 minutes.

**You start with:** the end of Act 2. (Caught up with `./scripts/catch-up-branch.sh 2`? You still need Act 1's Buildkite setup, your personal queue/branch routing and the shared cache setup from Act 2.)

**Run commands from your `buildkite-workshop` folder.** Replace every `YOUR_NAME` in the command blocks with your identifier, including queue and cache values. Stay on your personal workshop branch.

---

## 3a. See your tests

Right now your 116 tests only exist as text in the Unit log, and the log doesn't even name the ones that pass.

### Step 1: send test results to Test Engine

The Tests plugin installs/configures the Test Engine client and handles suite authentication and bootstrap. `bktec run` then drives Jest and uploads the results. Keep `install.sh` first: the plugin does not install the application's npm dependencies. Leave `soft_fail` in place for this exercise so you can compare the build result with the individual test results.

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
      - "bktec run"
    plugins:
      - tests#v1.0.1:
          test-runner: jest
          result-path: jest-results.json
          test-file-pattern: "web/tests/**/*.test.ts"
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
git commit -m "[Act 3, Section 3a] Report unit tests to Test Engine"
git push
```

Read the plugin's three settings: `test-runner: jest` selects the runner, `result-path` identifies the results file, and `test-file-pattern` selects the Web test files. This repository has two apps: the Account job still runs its own lint/tests separately and is not included in this Web test pattern.

**What you should see:**

- In the Unit log: `Requesting OIDC token for Test Suite` → `Test Suite not found (HTTP 404), bootstrapping from Pipeline` → `Test Suite ready (HTTP 201)`. The agent proved which pipeline it's running for, and Test Engine created a suite for it, named after your own pipeline. Every attendee gets a separate suite. No token to paste. If it already exists, the bootstrap message may be absent.
- At the bottom of the Unit log: a **Buildkite Test Engine Report** table.
- The build's **Tests** tab: every test, its result and duration.
- **Test Engine**/**Test Suites**  (top navigation) → your suite (`workshop-<your-name>`): runs over time, and display each test's history.
- A **failed** test in a **green** build? If `search finds a customer by last name` failed, that's the ⚠️ from Act 1: `soft_fail` is letting it fail quietly.

Test Engine adds per-test history without changing the initial soft-fail behavior.

**Official Buildkite documentation:** [Test Engine Client setup](https://buildkite.com/docs/pipelines/configure/tests/bktec/installing-and-using-the-client); [Test suites](https://buildkite.com/docs/pipelines/configure/tests/test-suites); [Soft fail](https://buildkite.com/docs/pipelines/configure/soft-fail).

### Step 2: tell Test Engine what to do about flaky tests

Configure your suite to label flaky tests, send webhook alerts and support muting.

Set this up before anything goes wrong. First open [webhook.site](https://webhook.site) in a new browser tab and copy **Your unique URL**. Keep the tab open: the alerts arrive there. Save the same URL for Act 5 and catch-up; replace `YOUR-ID` in this block with the ID from your tab:

```bash
WEBHOOK_URL="https://webhook.site/YOUR-ID"
git config workshop.webhook "$WEBHOOK_URL"
```

Then, in **Test Engine →** your suite (`workshop-<your-name>`), check you have **Full Access** before editing its workflow and settings:

1. **Workflows → New workflow**:
   - Monitor: **Passed on retry** (a test that passes and fails on the same commit)
   - Tag filter: `scm.branch is workshop/<your-name>` (replace `<your-name>` with your identifier)
   - **Alarm actions:** **Add label** `flaky`, and **Send webhook notification** to your webhook.site URL.
   - **Recover actions:** **Remove label** `flaky`. (Put the webhook action under **Alarm**, not Recover.)
   - Save.
2. **Settings → Test state:** tick **Enabled** and **Muted** → **Save**. (3c uses Muted.)

The recover action removes the label after 7 days or 100 executions without a pass-on-retry event, whichever comes first. A successful fix does not immediately remove the label. Muting/enabling the test is a separate state change; a `flaky` label alone does not mute it.

Suite workflows turn test history into labels and alerts independently of pipeline notifications.

**Official Buildkite documentation:** [Test Engine workflows](https://buildkite.com/docs/pipelines/configure/tests/workflows); [Workflow monitors](https://buildkite.com/docs/pipelines/configure/tests/workflows/monitors); [Alarm and recover actions](https://buildkite.com/docs/pipelines/configure/tests/workflows/actions); [Test state and quarantine](https://buildkite.com/docs/pipelines/configure/tests/test-suites/test-state-and-quarantine).

### Step 3: put the shop on the build page using annotations

Builds can show more than pass or fail. An annotation adds context to the top of the build page—text, links or images—so engineers can understand the result without searching through logs. Here, you’ll display a screenshot of the shop to show what the build produced.

The final E2E test already saves the screenshot to web/screenshots/shop.png. Add two commands at the end of the E2E step:

1. Upload the screenshot as a build artifact, storing it with the build.
2. Create an annotation that references the uploaded image and displays it on the build page.

Order matters: the image must be uploaded before the annotation references it. Use buildkite-agent artifact upload here because artifact_paths uploads files only after all step commands finish.

If the screenshot doesn’t appear, check the E2E log first. A test or upload failure may have prevented the annotation command from running.

> **Note:** Unit may still fail because the deliberately flaky customer-search test has not been fixed yet. With `soft_fail: true`, that failure appears as a warning and does not fail the overall build. E2E should pass, upload the screenshot and display the annotation. An E2E failure is not expected in this exercise. You will investigate and fix the flaky Unit test in 3c.

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
      - "bktec run"
    plugins:
      - tests#v1.0.1:
          test-runner: jest
          result-path: jest-results.json
          test-file-pattern: "web/tests/**/*.test.ts"
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
      - "buildkite-agent artifact upload web/screenshots/shop.png"
      - "buildkite-agent annotate --style info --context shop '<img src=\"artifact://web/screenshots/shop.png\" alt=\"Kite Shop\" height=\"300\">'"

  - wait

  - label: ":rocket: Deploy"
    command: "bash .buildkite/scripts/deploy.sh"
    env:
      DEPLOY_KEY: "kite_deploy_not_a_real_key_123"
EOF
git add .buildkite
git commit -m "[Act 3, Section 3a] Put the shop on the build page"
git push
```

**What you should see:** at the top of the build, in the **Annotations** panel, a picture of the Kite Shop. `artifact://web/screenshots/shop.png` in the annotation points at the artifact you just uploaded.

- **Why `artifact upload` here, when 2.2 used `artifact_paths`?** `artifact_paths` uploads after all the step's commands have finished. The annotation needs the screenshot to exist already, so this step uploads it straight away, then annotates.
- **`--context shop`** names the annotation. Write to the same context again (a retried E2E, say) and it replaces the box instead of adding a second one.
- If E2E fails, there's no screenshot that build. A real team might use `screenshot: 'only-on-failure'` in Playwright to see what broke.

<details>
<summary>Stuck?</summary>

1. The plugin sets things up; `bktec run` runs the tests. Keep `install.sh` before it: the plugin doesn't install your dependencies.
2. No screenshot? Did E2E pass? The annotation only appears once E2E gets that far.
3. Can't find the suite? It's named after your pipeline.
4. Nothing on webhook.site? Check the webhook action is under **Alarm**, and the URL matches the one in your open tab.
</details>

An explicit upload makes the screenshot available before the annotation command runs.

**Official Buildkite documentation:** [Build annotations](https://buildkite.com/docs/agent/cli/reference/annotate); [Build artifacts](https://buildkite.com/docs/pipelines/configure/artifacts).

---

## 3b. The slow test

Use Test Engine durations to find the slow payment test, shorten its delay and measure the improvement.

**Find it:** Test Engine → your suite → sort the tests by **duration**. One is far ahead of the rest: **`payment client › retries a failed charge`, about 31 seconds**. Open its page: 31s every run.

**Why:** the payment client retries failed charges with backoff: it waits 1, 2, 4, 8 and 16 seconds between attempts. Right for production (don't hammer a struggling payment gateway). The test makes the gateway fail 5 times, so it really waits 1+2+4+8+16 = 31 seconds, and someone raised the test's timeout to `40_000` to make it pass.

**The fix:** give the test a 1 ms base delay (the option already exists) and drop the raised timeout. The test still checks the retries; it just doesn't wait for real.

```bash
perl -pi -e 's/new PaymentClient\(gateway\);/new PaymentClient(gateway, { baseDelayMs: 1 });/ if $. == 26; s/\}, 40_000\);/});/ if $. == 29' web/tests/payments.test.ts
git add web/tests/payments.test.ts
git commit -m "[Act 3, Section 3b] Use a short backoff in the payment retry test"
git push
```

**In the web editor instead:** in `web/tests/payments.test.ts`, line 26: `new PaymentClient(gateway);` → `new PaymentClient(gateway, { baseDelayMs: 1 });`, and line 29: `}, 40_000);` → `});`.

**What you should see:** the test's page in Test Engine: about **31s → 0.03s**. The whole build gets a little faster too, but less than you'd think: Jest runs test files in parallel, so the slow test was overlapping other work. The big win is in the test's history.

Per-test durations help distinguish slow test behavior from pipeline scheduling delays.

**Official Buildkite documentation:** [Test suites](https://buildkite.com/docs/pipelines/configure/tests/test-suites); [Test splitting with bktec](https://buildkite.com/docs/pipelines/speed-up-builds-with-bktec).

---

## 3c. The flaky test

### Step 1: stop hiding the failure, retry instead

Removing `soft_fail` makes Unit a required check. Automatic retry runs a fresh attempt of a failed job and keeps the failed attempt in its history. With `automatic: true`, the default limit is two retries; if none pass, Unit fails the build. A passing retry is evidence to investigate, not a repair of the defect.

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
      - "bktec run"
    plugins:
      - tests#v1.0.1:
          test-runner: jest
          result-path: jest-results.json
          test-file-pattern: "web/tests/**/*.test.ts"
    retry:
      automatic: true

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
      - "buildkite-agent artifact upload web/screenshots/shop.png"
      - "buildkite-agent annotate --style info --context shop '<img src=\"artifact://web/screenshots/shop.png\" alt=\"Kite Shop\" height=\"300\">'"

  - wait

  - label: ":rocket: Deploy"
    command: "bash .buildkite/scripts/deploy.sh"
    env:
      DEPLOY_KEY: "kite_deploy_not_a_real_key_123"
EOF
git add .buildkite
git commit -m "[Act 3, Section 3c] Stop soft-failing unit tests and retry them"
git push
```

Retries expose repeated attempts while restoring Unit as a required check.

**Official Buildkite documentation:** [Job retries](https://buildkite.com/docs/pipelines/configure/retry); [Soft fail](https://buildkite.com/docs/pipelines/configure/soft-fail).

### Step 2: let Test Engine catch it

Rebuild the same commit to expose the flaky test, inspect its history and temporarily mute it. This test chooses a random customer: three rebuilds are a starting point, not a guarantee. The monitor needs a pass and a failure on the **same commit**; all-pass runs cannot trigger it, and failures on one commit followed only by passes on a different commit do not demonstrate passed-on-retry for that commit.

1. **Rebuild** that build **3 times** (press the **Rebuild** button each time on the latest build).
2. Watch the Unit step: it may fail, then pass on a retry. A successful retry lets the build pass; exhausting all attempts leaves it red. Open the job history to inspect the earlier failed attempts.
3. Test Engine notices the same commit passed **and** failed. The test gets the **`flaky`** label from our workflow we setup earlier, and a request appears in your webhook.site tab.
4. On the test's page, open the **Passed on Retry Commits** tab  which shows the failing runs and their errors.
5. **Mute** the test: on its page, set its state to **Muted**. A muted test still runs and reports data to Test Engine, but can't fail the build.

A pass after a failure is useful evidence to investigate, even when the final build is green.

**Official Buildkite documentation:** [Workflow monitors](https://buildkite.com/docs/pipelines/configure/tests/workflows/monitors); [Test state and quarantine](https://buildkite.com/docs/pipelines/configure/tests/test-suites/test-state-and-quarantine).

### Step 3: the real fix (and drop the retry)

Use the test history to connect the random failures to the customer names that cause them. Then fix the query and remove the temporary job retry. The push below includes both commits; the test remains muted until you enable it in Step 4. Removing retry alone would not restore the muted test's ability to fail the build.

**Read the failures:** `near "Brien": syntax error`, `near "Connor"`, `near "Angelo"`. O'Brien, O'Connor, D'Angelo: what do they have in common? The test picks a random customer, and half of them have an apostrophe in their name.

**The bug** is in `web/src/customers.ts`: the search glues the name into the SQL, `lower('` + lastName + `')`. For O'Brien the database gets `lower('O'Brien')`, and the apostrophe ends the string early. **The fix:** pass the name as a parameter, `lower(?)` with `[lastName]`, so the value can never become SQL.

```bash
perl -0pi -e "s/lower\('\" \+ lastName \+ \"'\)/lower(?)/; s/(\"ORDER BY first_name\",\n)/\$1      [lastName],\n/" web/src/customers.ts
git add web/src/customers.ts
git commit -m "[Act 3, Section 3c] Use a parameterized query for customer search"
```

**In the web editor instead:** in `web/src/customers.ts`, change line 37 to `"WHERE lower(last_name) = lower(?) " +`, and add a new line `[lastName],` right after `"ORDER BY first_name",`. It should look like this:

```ts
    const result = this.db.exec(
      "SELECT id, first_name, last_name, email FROM customers " +
        "WHERE lower(last_name) = lower(?) " +
        "ORDER BY first_name",
      [lastName],
    );
```

Then drop the retry, with the real fix there's nothing to retry. This push includes the fix above:

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
      - "bktec run"
    plugins:
      - tests#v1.0.1:
          test-runner: jest
          result-path: jest-results.json
          test-file-pattern: "web/tests/**/*.test.ts"

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
      - "buildkite-agent artifact upload web/screenshots/shop.png"
      - "buildkite-agent annotate --style info --context shop '<img src=\"artifact://web/screenshots/shop.png\" alt=\"Kite Shop\" height=\"300\">'"

  - wait

  - label: ":rocket: Deploy"
    command: "bash .buildkite/scripts/deploy.sh"
    env:
      DEPLOY_KEY: "kite_deploy_not_a_real_key_123"
EOF
git add .buildkite
git commit -m "[Act 3, Section 3c] Stop retrying unit tests"
git push
```

**What you should see:** The Unit step passes every time now. The test is still muted and still labelled `flaky`. The label clears when the workflow reaches its recovery threshold.

Fix the defect, remove the temporary retry and restore the test's ability to block regressions.

**Official Buildkite documentation:** [Job retries](https://buildkite.com/docs/pipelines/configure/retry); [Test state and quarantine](https://buildkite.com/docs/pipelines/configure/tests/test-suites/test-state-and-quarantine); [Workflow monitors](https://buildkite.com/docs/pipelines/configure/tests/workflows/monitors).

### Step 4: un-mute

Enable the repaired test so future failures can fail the build again.

On the test's page, set its state back to **Enabled**. If it fails from now on, it fails the build, as it should.

<details>
<summary>Stuck?</summary>

1. No `flaky` label yet? It needs a pass **and** a fail on the same commit. Rebuild again.
2. No Mute option? Test state needs **Muted** ticked in the suite's Settings → Test state (3a step 2).
</details>

Unmuting completes the repair by making the test a required check again.

**Official Buildkite documentation:** [Test state and quarantine](https://buildkite.com/docs/pipelines/configure/tests/test-suites/test-state-and-quarantine); [Alarm and recover actions](https://buildkite.com/docs/pipelines/configure/tests/workflows/actions).

---

## 3d. Split by timing

One Unit step will become four Buildkite jobs. `parallelism` creates the jobs; `bktec` uses Test Engine history to assign test files to them. Adding parallelism to an ordinary Jest command alone would not establish this timing-based plan and could repeat the suite on every job.

Watch both the plan and the Waterfall. Historical durations balance the workload, while each job still pays for checkout and setup. More parallel jobs help only when the queue can run them concurrently.

The Unit step is the slowest step of the build: about a minute and a half on one machine. We can split our tests across multiple Buildkite agents, and let Test Engine decide which tests each one runs based on each test's historical duration. We'll add one line: `parallelism: 4`.

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
      - "buildkite-agent artifact upload web/screenshots/shop.png"
      - "buildkite-agent annotate --style info --context shop '<img src=\"artifact://web/screenshots/shop.png\" alt=\"Kite Shop\" height=\"300\">'"

  - wait

  - label: ":rocket: Deploy"
    command: "bash .buildkite/scripts/deploy.sh"
    env:
      DEPLOY_KEY: "kite_deploy_not_a_real_key_123"
EOF
git add .buildkite
git commit -m "[Act 3, Section 3d] Split unit tests four ways by timing"
git push
```

**What you should see:**

- The Unit step expands to **4 jobs**. Each one's log shows bktec's plan: `Parallelism: 4 (fixed)`, `14 selectors across 4 nodes`, `Historical timings: 14 of 14 selectors (100%)`. The first job asks Test Engine for the plan; the others log `Using existing plan`.
- **Count the test files each job got.** Not the same number, but about the same **time**: Test Engine packed them by how long each file took in earlier runs.
- Unit drops to about **35 seconds**, and the whole build to about **1 minute**. Not 4× faster: each job has its own few seconds of setup.

Balance test duration across jobs and compare the resulting critical path.

**Official Buildkite documentation:** [Test splitting with bktec](https://buildkite.com/docs/pipelines/speed-up-builds-with-bktec); [Test Engine Client setup](https://buildkite.com/docs/pipelines/configure/tests/bktec/installing-and-using-the-client).

<!-- compare act-3 -->

---

## What you did, and why it matters

You sent every test result to Test Engine, put a picture of the shop on every build page with an annotation when running E2E tests, set up a workflow to catch flaky tests, found and fixed a slow test, watched retries hide a failing test that Test Engine caught anyway, fixed the bug, and split the tests four ways by timing. Builds went from about 2½ minutes to about **1 minute**, and green now means green.

- **Every test has a history.** Slow tests, flaky tests and failure rates show up on their own.
- **Annotations put what matters on the build page:** a screenshot, a test summary, a coverage number, a link to the deployed app. Any step can write one.
- **Green means green.** `soft_fail` and blanket retries hide failures from the build, but not from Test Engine.
- **Flaky tests are caught, labelled and announced automatically,** for your workshop branch by your suite's workflow.
- **Mute instead of delete.** The team stays unblocked, the test keeps reporting, and it comes back when it's fixed.
- **A flaky test is often a real bug.**
- **Splitting stays balanced by itself.** As tests change, the plan uses the latest timings. Faster means one number and more agents.

**Official Buildkite documentation:** [Test Engine Client setup](https://buildkite.com/docs/pipelines/configure/tests/bktec/installing-and-using-the-client); [Test Engine workflows](https://buildkite.com/docs/pipelines/configure/tests/workflows); [Test state and quarantine](https://buildkite.com/docs/pipelines/configure/tests/test-suites/test-state-and-quarantine); [Test splitting with bktec](https://buildkite.com/docs/pipelines/speed-up-builds-with-bktec).

**Next:** [Act 4: Make it smart](act-4.md). Fell behind? `./scripts/catch-up-branch.sh 3` (the Test Engine setup in 3a step 2 isn't in the repo; do it in the UI).
