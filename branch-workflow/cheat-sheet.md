# Cheat sheet

Everything the five acts use, on one page. The acts have the full steps.

## Pipeline YAML

Find the YAML setting or agent command that controls the behavior you want to configure.

| Key or command | What it does | Act |
|---|---|---|
| `agents: queue: "hosted-linux-YOUR_NAME"` | Runs steps on that queue. At the top of the file, it applies to every step. No queue named: the cluster's default queue. | 1.1–1.2 |
| `buildkite-agent pipeline upload --git-diff-base HEAD^` | Uploads the repo's steps; `HEAD^` compares the build commit with its first parent. | 1.2 |
| `wait` | Holds every step below it until every step above it has passed. | 2.1 |
| `key` + `depends_on` | Gives a step a name, so another step can wait for that one step only. | 2.2 |
| `artifact_paths: "web/dist/**/*"` | Uploads matching files after the step's commands finish. | 2.2 |
| `buildkite-agent artifact upload` / `download` | Uploads or downloads artifacts from inside a command, straight away. | 2.2, 3a |
| `buildkite-agent cache restore --name npm` / `cache save --name npm` | Restores or saves the cache named `npm` in `.buildkite/cache.yml`. | 2.3 |
| `cache.yml`: `cache_key`, `fallback_limit: true`, `target_paths` | The key is its parts joined together. Everything after the part with `fallback_limit` is optional when restoring. `target_paths` is what gets cached. | 2.3 |
| `plugins: - tests#v1.0.1:` + `bktec run` | The plugin sets up Test Engine (`test-runner`, `result-path`, `test-file-pattern`); `bktec run` runs the tests and uploads the results. | 3a |
| `buildkite-agent annotate --style info --context shop '…'` | Writes a box at the top of the build page. The same context replaces the box. `artifact://web/screenshots/shop.png` shows an uploaded artifact. | 3a |
| `soft_fail: true` | The step can fail without failing the build (⚠️). | 3c |
| `retry: automatic: true` | Retries a failed job automatically, with a default limit of two retries. | 3c |
| `parallelism: 4` | Runs the step as 4 jobs. With `bktec`, Test Engine splits the tests by timing. | 3d |
| `if_changed: ["web/**", …]` | Runs the step only if the commit changed a matching file. Several patterns mean **or**. | 4.1 |
| `group:` | A visual container. A group-level condition runs/skips its children together; grouping alone does not make them sequential. | 4.2 |
| `secrets: {DEPLOY_KEY: DEPLOY_KEY_YOUR_NAME}` | Puts a cluster secret in an environment variable and hides its value in the log. | 5.1 |
| `if: build.branch == "workshop/YOUR_NAME"` | Runs the step (or group) only when the condition is true. | 5.2 |
| `block:` | Pauses the build until someone clicks to approve. | 5.3 |
| `concurrency: 1` + `concurrency_group: "${BUILDKITE_PIPELINE_SLUG}/deploy"` | At most one job in that group runs at a time, across the organization. | 5.3 |
| `notify: - webhook: "…"` with `if: build.state == "failed"` | Sends the build's details to a URL when the condition matches. | 5.4 |

Worth knowing: `cancel_on_build_failing: true` on a step cancels its jobs as soon as another job fails (2.2).

Choose a setting according to the behavior it controls, then inspect the matching job or upload log.

**Official Buildkite documentation:** [Command steps](https://buildkite.com/docs/pipelines/configure/step-types/command-step); [Pipeline upload](https://buildkite.com/docs/agent/cli/reference/pipeline).

## Where things are in Buildkite

Locate your workshop resources and settings in the Buildkite UI.

- **Cluster:** **Agents → WORKSHOP_CLUSTER_NAME**. Inside the shared cluster:
  - **New queue** → **Buildkite hosted**, Linux, Small. Key `hosted-linux-<your-name>`; leave the shared default unchanged.
  - **Cache Registries → Default → Entries:** your cache entries.
  - **Cache Storage → Settings → Enable Git mirror:** facilitator demonstration, one shared setting.
  - **Secrets → New Secret.** Edit a secret to set its **access policy**.
- **Pipeline:** **Settings → Steps** (the steps that start every build) and **Settings → GitHub** (webhook URL, branch filter).
- **Build page:** **Waterfall** view, **Rebuild**, the **Annotations** panel, the **Tests** tab, **auto-hide skipped steps** (turn it off to see skipped steps). Click a skipped step to see why.
- **Test Engine →** your suite:
  - **Workflows → New workflow:** monitor, tag filter, **Alarm** and **Recover** actions.
  - **Settings → Test state:** tick **Enabled** and **Muted**.
  - A test's page: its state (**Muted** / **Enabled**) and the **Passed on Retry Commits** tab.
- **GitHub integration:** the shared repository is connected centrally. Your pipeline builds only `workshop/<your-name>` and `workshop/<your-name>-test-deploy`; pull-request builds are off.

Repository configuration and Buildkite resource settings are both required.

**Official Buildkite documentation:** [Managing queues](https://buildkite.com/docs/agent/queues/managing); [Test suites](https://buildkite.com/docs/pipelines/configure/tests/test-suites); [Buildkite secrets](https://buildkite.com/docs/pipelines/security/secrets/buildkite-secrets).

## Your local settings

Keep your personal identifier, branch and saved webhook URL consistent across the exercises.

Replace every `YOUR_NAME` in a pipeline/cache command block with your identifier before running it. The pre-run notes identify the values to replace. Catch-up reads your identifier from the current workshop branch and applies it automatically. Check you are on your own branch. `git config workshop.webhook "https://webhook.site/<unique-id>"` saves the Act 3 URL for Act 5/catch-up. In the web editor, replace the placeholders yourself and select your own branch.

Consistent personal values prevent routing and policy mismatches.

**Official Buildkite documentation:** [Branch configuration](https://buildkite.com/docs/pipelines/configure/workflows/branch-configuration); [Build notifications](https://buildkite.com/docs/pipelines/configure/notify).

## Gotchas

Recognize expected failures, skips and waits, and identify the setting to check when behavior differs.

- **A job is waiting?** Check its queue key, hosted capacity and concurrency limits before assuming a configuration failure.
- **Every job runs on a fresh machine.** Running after another job isn't sharing its disk: pass files as artifacts.
- **`artifact_paths` uploads after the commands.** To use a file during the step (like the annotation), upload it with `buildkite-agent artifact upload` first.
- **Your first personal cache key misses.** Rebuild to see a hit. Keep your name before the fallback boundary; registry scopes restrict access by pipeline and branch.
- **`if_changed` only works in the repo's `pipeline.yml`,** not in the pipeline's Settings → Steps. Quote every pattern.
- **With `HEAD^`, only the latest commit is compared with its parent.** Push one commit at a time. Rebuild repeats that commit's comparison using that commit's YAML.
- **A skipped step counts as done** for the steps that depend on it. Put artifact producers and consumers under the same group-level change condition; grouping without that shared condition does not fix mismatched patterns.
- **New Build ignores the branch filter.** Only pushes use it.
- **Approval and dependencies are separate controls.** The shown block inherits the preceding wait. Deploy explicitly depends on Web, Account and approval; omitting the approval key can bypass the block.
- **A secret policy that says no** fails the job with `404 Not Found: Secret not found or access denied`.
- **Concurrency requires matching group names.** `${BUILDKITE_PIPELINE_SLUG}/deploy` isolates attendees; cross-pipeline serialization requires the same group string.
- **Flaky detection needs mixed results on the same commit.** Random tests may need more rebuilds, and a label is separate from the Muted/Enabled state.
- **The webhook `notify` fires on every failed or passed `workshop/<your-name>` build,** not only when the state changes. `passed` arrives once the build has really finished, after the deploy.

Use the expected outcome for the current exercise to decide whether a build needs fixing.

**Official Buildkite documentation:** [Step dependencies](https://buildkite.com/docs/pipelines/configure/depends-on); [Using if_changed](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines/if-changed); [Secret access policies](https://buildkite.com/docs/pipelines/security/secrets/buildkite-secrets/access-policies).

## Fell behind?

Restore an act checkpoint on your personal branch and complete the associated UI setup.

```sh
./scripts/catch-up-branch.sh 3      # the act you want to be at the end of
```

It uses private `origin`, keeps your branch and fills in your saved identifier/webhook. It doesn't do the Buildkite UI setup. Each act lists what it expects at the top.

A checkpoint supplies repository state, not hosted resources or suite settings.

**Official Buildkite documentation:** [Pipeline upload](https://buildkite.com/docs/agent/cli/reference/pipeline); [Managing queues](https://buildkite.com/docs/agent/queues/managing).
