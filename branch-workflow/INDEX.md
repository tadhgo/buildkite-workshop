# Branch workflow: detailed workshop index

This index covers every Markdown file in the shared-repository workshop and links directly to its sections on GitHub. Start with setup, complete Acts 1–5 in order, and use the cheat sheet throughout. The five acts take approximately **3 hours**, excluding setup, breaks and discussion.

## Files and reading order

| File | Purpose |
|---|---|
| [INDEX.md](INDEX.md) | This detailed navigation guide. |
| [README.md](README.md) | Setup and workshop guide. |
| [act-1.md](act-1.md) | Act 1: Get it running. |
| [act-2.md](act-2.md) | Act 2: Make it fast. |
| [act-3.md](act-3.md) | Act 3: Make it trustworthy. |
| [act-4.md](act-4.md) | Act 4: Make it smart. |
| [act-5.md](act-5.md) | Act 5: Ship it and tell people. |
| [cheat-sheet.md](cheat-sheet.md) | Quick reference. |

## Setup and workshop guide

**Source:** [README.md](README.md)

Prepare access and personal resources before starting Act 1.

| Section | What you will find |
|---|---|
| [Before you arrive](README.md#before-you-arrive) | Prerequisites: repository write access, Git/Git Bash, Buildkite organization access, cluster permissions and team permissions. |
| [Your identifier and branch](README.md#your-identifier-and-branch) | Choose one personal identifier; name branches, pipeline, suite, queue and secret; clone the repository and push the starting pipeline. |
| [The five acts](README.md#the-five-acts) | The five-act learning sequence and approximate workshop timings. |
| [How the steps work](README.md#how-the-steps-work) | Run copy-paste blocks on your own branch, replace placeholders, push one commit at a time and use the GitHub web editor when needed. |
| [Fell behind? Catch up](README.md#fell-behind-catch-up) | Restore a checkpoint with the catch-up script; understand which Buildkite UI settings must still be completed manually. |
| [Getting help](README.md#getting-help) | Find facilitator support, troubleshooting hints and the cheat sheet. |

## Act 1: Get it running

**Source:** [act-1.md](act-1.md)

Create your personal pipeline and hosted queue, start a manual build, then verify push-triggered builds. Estimated time: **35 minutes**.

| Section | What you will find |
|---|---|
| [1.0 Open the workshop cluster](act-1.md#10-open-the-workshop-cluster) | Locate the shared cluster and its queues and cache registry. |
| [1.1 Create your hosted queue](act-1.md#11-create-your-hosted-queue) | Create a personal hosted Linux queue and retain the shared default queue. |
| [1.2 Create your pipeline](act-1.md#12-create-your-pipeline) | Configure the bootstrap upload job, queue routing and branch filters; distinguish build triggers from job conditions and the HEAD^ change comparison. |
| [1.3 Start a build](act-1.md#13-start-a-build) | Create the first build manually, open the upload log and recognize the deliberate lint failure. |
| [1.4 Make your pushes start builds](act-1.md#14-make-your-pushes-start-builds) | Connect GitHub push events to your personal pipeline. |
| [Step 1: the branch settings](act-1.md#step-1-the-branch-settings) | Enable branch builds for your two exact personal branches and disable pull-request builds for the workshop. |
| [Step 2: fix the lint error and push](act-1.md#step-2-fix-the-lint-error-and-push) | Apply the documented lint fix, push it and observe the sequential build and possible Unit soft-fail warning. |
| [What you did, and why it matters](act-1.md#what-you-did-and-why-it-matters) | Review clusters, queues, dynamic pipeline upload and the problems left for later acts. |

## Act 2: Make it fast

**Source:** [act-2.md](act-2.md)

Reduce duplicate work and unnecessary waiting; share build output and reuse dependency downloads. Estimated time: **35 minutes**.

| Section | What you will find |
|---|---|
| [2.1 Parallel by default](act-2.md#21-parallel-by-default) | Remove unnecessary waits, keep the gate before Deploy and compare overlapping jobs in the Waterfall. |
| [2.2 Stop building twice](act-2.md#22-stop-building-twice) | Explore why ordering alone cannot make files available on another hosted machine. |
| [Step 1: remove E2E's own build](act-2.md#step-1-remove-e2es-own-build) | Remove the duplicate application build from E2E and observe the expected missing-dist failure. |
| [Step 2: run the E2E step after the Build step](act-2.md#step-2-run-the-e2e-step-after-the-build-step) | Add key/depends_on, observe that E2E still lacks the files, and examine the optional fail-fast cancellation example. |
| [Step 3: pass `dist/` as an artifact](act-2.md#step-3-pass-dist-as-an-artifact) | Upload web/dist from Build, download it in E2E and verify that tests pass without building twice. |
| [2.3 Cache your dependencies](act-2.md#23-cache-your-dependencies) | Configure dependency caching and compare it with artifacts and checkout caching. |
| [Shared registry policy](act-2.md#shared-registry-policy) | Review the facilitator-managed registry policy that scopes saves and restores by pipeline and branch. |
| [Step 1: cache npm (a miss)](act-2.md#step-1-cache-npm-a-miss) | Define the npm cache key and target path; restore before npm ci, save afterward and inspect the initial miss/save. |
| [Step 2: a hit](act-2.md#step-2-a-hit) | Rebuild with the same lockfile and verify an exact-key restore. |
| [Step 3: add a dependency (the fallback)](act-2.md#step-3-add-a-dependency-the-fallback) | Update the dependency files from the checkpoint and observe lockfile-key invalidation, fallback restore and a new cache entry. |
| [Step 4: the shared Git mirror](act-2.md#step-4-the-shared-git-mirror) | Observe the facilitator enabling the hosted Git mirror and inspect subsequent checkout logs. |
| [What you did, and why it matters](act-2.md#what-you-did-and-why-it-matters) | Review parallel scheduling, explicit file transfer, caches versus artifacts and checkout reuse. |

## Act 3: Make it trustworthy

**Source:** [act-3.md](act-3.md)

Make test failures visible, investigate slow/flaky tests and balance the suite across parallel jobs. Estimated time: **45 minutes**.

| Section | What you will find |
|---|---|
| [3a. See your tests](act-3.md#3a-see-your-tests) | Introduce per-test results, suite workflows and build-page annotations. |
| [Step 1: send test results to Test Engine](act-3.md#step-1-send-test-results-to-test-engine) | Configure the Tests plugin and bktec for Jest, suite authentication/bootstrap and result upload; retain soft_fail initially. |
| [Step 2: tell Test Engine what to do about flaky tests](act-3.md#step-2-tell-test-engine-what-to-do-about-flaky-tests) | Save a webhook URL, configure a branch-filtered passed-on-retry workflow, add alarm/recover actions and enable test states. |
| [Step 3: put the shop on the build page using annotations](act-3.md#step-3-put-the-shop-on-the-build-page-using-annotations) | Upload the E2E screenshot, reference it in a build annotation, understand command order and recognize the still-possible Unit warning. |
| [3b. The slow test](act-3.md#3b-the-slow-test) | Find the slow payment retry test in Test Engine, shorten its test delay and compare its recorded duration. |
| [3c. The flaky test](act-3.md#3c-the-flaky-test) | Follow the customer-search failure from observation to repair and re-enable the test. |
| [Step 1: stop hiding the failure, retry instead](act-3.md#step-1-stop-hiding-the-failure-retry-instead) | Remove soft_fail, introduce limited automatic job retries and distinguish a passing retry from a fixed defect. |
| [Step 2: let Test Engine catch it](act-3.md#step-2-let-test-engine-catch-it) | Rebuild the same commit, collect pass/fail evidence, inspect the flaky label/webhook and temporarily mute the test. |
| [Step 3: the real fix (and drop the retry)](act-3.md#step-3-the-real-fix-and-drop-the-retry) | Investigate apostrophes in customer names, apply the parameterized-query fix and remove the temporary retry. |
| [Step 4: un-mute](act-3.md#step-4-un-mute) | Re-enable the repaired test; distinguish Muted/Enabled state from workflow labels and recovery timing. |
| [3d. Split by timing](act-3.md#3d-split-by-timing) | Use parallelism: 4 with bktec, inspect the historical-timing plan and compare job balance and setup overhead. |
| [What you did, and why it matters](act-3.md#what-you-did-and-why-it-matters) | Review test histories, annotations, flaky-test workflows, muting and timing-based splitting. |

## Act 4: Make it smart

**Source:** [act-4.md](act-4.md)

Run relevant monorepo checks while keeping artifact producers and consumers consistent. Estimated time: **25 minutes**.

| Section | What you will find |
|---|---|
| [4.1 Skip what didn't change](act-4.md#41-skip-what-didnt-change) | Understand upload-time change detection, the HEAD^ comparison and the one-commit-per-push constraint. |
| [Step 1: add `if_changed` to each step](act-4.md#step-1-add-if_changed-to-each-step) | Add separate Web/Account patterns and include shared root/CI files; deliberately give Build a narrower pattern than E2E. |
| [Step 2: a README-only change](act-4.md#step-2-a-readme-only-change) | Observe checks skipping for a documentation edit; optionally add a Deploy change condition. |
| [Step 3: an `account/`-only change](act-4.md#step-3-an-account-only-change) | Modify the Account package metadata and compare Account, Web and Deploy behavior for an Account-only change. |
| [4.2 The skipped-step trap](act-4.md#42-the-skipped-step-trap) | Expose and repair an artifact dependency whose producer skips while its consumer runs. |
| [Step 1: change only a test](act-4.md#step-1-change-only-a-test) | Edit only an E2E test and observe the expected artifact-download failure when Build is skipped. |
| [Step 2: Fix the skipped Build step](act-4.md#step-2-fix-the-skipped-build-step) | Apply one change condition to the Web group, retain the Build-to-E2E dependency and prove the fix with another test-only change. |
| [What you did, and why it matters](act-4.md#what-you-did-and-why-it-matters) | Review monorepo isolation, visible skip reasons, comparison limits and dynamic pipeline generation. |

## Act 5: Ship it and tell people

**Source:** [act-5.md](act-5.md)

Control mock deployments with secrets, branch restrictions, approval and concurrency, then verify notifications. Estimated time: **40 minutes**.

| Section | What you will find |
|---|---|
| [5.1 Get the key out of the repo](act-5.md#51-get-the-key-out-of-the-repo) | Inspect the inline fake key and its exposure in repository configuration and earlier Deploy logs. |
| [Step 1: create a cluster secret](act-5.md#step-1-create-a-cluster-secret) | Create a personal cluster secret using the supplied fake key. |
| [Step 2: read the key from the secret](act-5.md#step-2-read-the-key-from-the-secret) | Replace the inline value with a secrets mapping, preserve the script’s DEPLOY_KEY variable and verify redaction and Last read. |
| [5.2 Deploy only from `workshop/<your-name>`](act-5.md#52-deploy-only-from-workshopyour-name) | Separate branch-based deployment scheduling from authorization to retrieve the secret. |
| [Step 1: the problem](act-5.md#step-1-the-problem) | Push a test-deploy branch with a README change and demonstrate that a secret mapping alone does not restrict deployment. |
| [Step 2: an `if` on Deploy](act-5.md#step-2-an-if-on-deploy) | Edit the primary branch, replace the queue/branch/secret placeholders and put Deploy under a primary-branch condition. |
| [Step 3: a policy on the secret](act-5.md#step-3-a-policy-on-the-secret) | Apply a secret policy requiring both the correct pipeline slug and primary branch. |
| [Step 4: try the branch again](act-5.md#step-4-try-the-branch-again) | Merge into test-deploy and verify Deploy skips; understand independent Web/Account change filters; optionally remove the condition to demonstrate secret-access denial. |
| [5.3 Adding human approval](act-5.md#53-adding-human-approval) | Combine a recorded human decision with deployment serialization. |
| [Step 1: an approval, and one deploy at a time](act-5.md#step-1-an-approval-and-one-deploy-at-a-time) | Add the approval block, explicitly depend on checks and approval, lengthen the mock deploy and configure a pipeline-specific concurrency group. |
| [Step 2: two deploys at once](act-5.md#step-2-two-deploys-at-once) | Approve two builds close together and inspect the second deploy waiting behind the first; distinguish pipeline-specific and shared group names. |
| [5.4 Send a notification when `workshop/<your-name>` breaks](act-5.md#54-send-a-notification-when-workshopyour-name-breaks) | Configure and test build-level webhooks for final failed/passed outcomes on the primary branch. |
| [Step 1: notify block](act-5.md#step-1-notify-block) | Substitute the saved webhook URL into both notification entries while retaining deployment controls. |
| [Step 2: break `workshop/<your-name>` on purpose](act-5.md#step-2-break-workshopyour-name-on-purpose) | Introduce a deliberate lint failure and inspect the failed-build notification. |
| [Step 3: fix it](act-5.md#step-3-fix-it) | Revert the deliberate failure, approve deployment and wait for the passed-build notification. |
| [What you did, and why it matters](act-5.md#what-you-did-and-why-it-matters) | Review secret policies, approval records, matching concurrency groups and build notifications. |
| [The whole day](act-5.md#the-whole-day) | Connect all five acts and identify improvements to take back to production pipelines. |

## Quick reference

**Source:** [cheat-sheet.md](cheat-sheet.md)

Keep this file open while working through the acts.

| Section | What you will find |
|---|---|
| [Pipeline YAML](cheat-sheet.md#pipeline-yaml) | Lookup table for YAML keys and agent commands, with references to the act that introduces each one. |
| [Where things are in Buildkite](cheat-sheet.md#where-things-are-in-buildkite) | UI locations for clusters, queues, caches, secrets, pipeline settings, build views and Test Engine. |
| [Your local settings](cheat-sheet.md#your-local-settings) | Personal identifier replacement, branch selection and the saved workshop.webhook Git setting. |
| [Gotchas](cheat-sheet.md#gotchas) | Queueing, isolated filesystems, artifact upload timing, cache misses, change comparisons, skipped dependencies, approval, concurrency and notification behavior. |
| [Fell behind?](cheat-sheet.md#fell-behind) | Checkpoint command and the distinction between repository catch-up and Buildkite UI setup. |

The index describes the exercises; run commands from the linked act files. Each act includes its prerequisites, expected results, troubleshooting guidance and official Buildkite documentation.
