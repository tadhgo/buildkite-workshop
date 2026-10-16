# Act 1: Get it running

**Goal:** a pipeline of your own that builds every time you push code. You'll open the shared workshop cluster, create your own hosted queue and pipeline, connect the shared exercise repository, and see how Buildkite uploads steps and schedules jobs onto agents.

**Time:** about 35 minutes.

**You start with:** the shared exercise repo cloned and your `workshop/<your-name>` branch pushed (README). You’ll create the test-deploy branch in Act 5; it does not need to exist yet. You have cluster-maintainer access to `WORKSHOP_CLUSTER_NAME` and the workshop team's pipeline/suite creation permissions.

**Run commands from your `buildkite-workshop` folder, on your workshop branch.**

---

## 1.0 Open the workshop cluster

Locate the shared workshop cluster and the resources your pipeline will use.

A cluster holds queues, agents, secrets and cache registries. Everyone in this workshop shares one cluster; your names keep your resources easy to identify.

1. In Buildkite, open **Agents** in the top navigation.
2. Open **`WORKSHOP_CLUSTER_NAME`**.

**What you should see:** the workshop cluster's queues and a **Default** cache registry (you'll use it in Act 2). Other attendees' queues may appear as they create them.

A cluster organizes the shared agent resources; attendee names distinguish personal resources.

**Official Buildkite documentation:** [Managing queues](https://buildkite.com/docs/agent/queues/managing); [Buildkite Cache](https://buildkite.com/docs/pipelines/configure/cache).

---

## 1.1 Create your hosted queue

Create a personal hosted Linux queue to run your workshop jobs.

1. Inside the workshop cluster, select **New queue**.
2. Choose **Buildkite hosted**, **Linux**, the **Small** shape.
3. Key: **`hosted-linux-<your-name>`**, for example `hosted-linux-alicesmith` → **Create**.

Leave the cluster's default queue unchanged. It is one shared setting. Your pipeline will name your queue explicitly for the upload job and every job it adds.

**What you should see:** your queue in the cluster. Hosted agents are supplied when jobs need them; you don't install an agent on your laptop.

**Official Buildkite documentation:** [Managing queues](https://buildkite.com/docs/agent/queues/managing); [Linux hosted agents](https://buildkite.com/docs/agent/buildkite-hosted/linux).

---

## 1.2 Create your pipeline

Your pipeline starts with one upload job. Buildkite checks out the selected commit, then `buildkite-agent pipeline upload` reads `.buildkite/pipeline.yml` from that checkout and adds its steps to the running build. This lets pipeline changes travel with the code and be reviewed in Git. Both the bootstrap job and the uploaded jobs need your personal queue key.

Replace all three `YOUR_NAME` values below. There are three separate decisions to understand:

- **Does a push create a build?** In 1.4, the pipeline's GitHub settings enable branch builds and allow pushes only to your two personal branches. A push to another attendee's branch should not create a build of your pipeline.
- **Does the upload job run?** The YAML `branches:` setting below limits that job to your two branches inside a build that already exists. It does not configure the GitHub webhook or create builds.
- **Which checks should the upload add or skip?** `--git-diff-base HEAD^` compares the checked-out build commit with its immediate parent. Act 4's `if_changed` patterns use that comparison. It does not control whether a push starts a build.

`HEAD` is the commit being built, and `HEAD^` is its first parent. For a commit that changes only `account/`, the comparison identifies those files so Act 4 can run Account checks and skip Web checks. Keep the flag through the workshop. Push one commit at a time: if you push several commits together, this comparison covers only the final commit's changes.

1. In Buildkite, open **Pipelines → New pipeline**.
2. Use the organization's authenticated GitHub integration. Select the shared exercise repository (`WORKSHOP_REPOSITORY_URL`).
3. Select the workshop cluster: **`WORKSHOP_CLUSTER_NAME`**.
4. Name the pipeline **`workshop-<your-name>`**.
5. Give the workshop team **Full Access** to this pipeline, then **Create**.
6. In the pipeline's **Settings → General**, set its **Default branch** to **`workshop/<your-name>`**.
7. In **Settings → Steps**, replace the initial steps with this YAML. Replace all three occurrences of `YOUR_NAME` with your identifier, then **Save**:

```yaml
agents:
  queue: "hosted-linux-YOUR_NAME"

steps:
  - label: ":pipeline:"
    command: "buildkite-agent pipeline upload --git-diff-base HEAD^"
    branches: "workshop/YOUR_NAME workshop/YOUR_NAME-test-deploy"
```

Saving these settings does not run the upload job, so there is no upload log to inspect yet. Continue to **1.3**, where you create the first build manually using the branch already pushed during setup. You do not need another Git push for that build.

**Official Buildkite documentation:** [Pipeline upload](https://buildkite.com/docs/agent/cli/reference/pipeline); [Branch configuration](https://buildkite.com/docs/pipelines/configure/workflows/branch-configuration).

---

## 1.3 Start a build

Start your first build, watch pipeline upload add the jobs, and identify the expected lint failure.

On your pipeline, click **New Build → Create Build**. Check **Branch** is **`workshop/<your-name>`** before creating the build.

**What you should see:**

- On the new build page, click the first job, labelled `:pipeline:` (shown as the pipeline emoji), to open its log. Check the queue/agent information, then find the `buildkite-agent pipeline upload --git-diff-base HEAD^` command and its upload output. This is the **upload log**: it belongs to this running job. A successful upload means the Buildkite agent was able to find the pipeline.yaml file within the Git repo and it was uploaded to Buildkite.
- **The build grows:** Lint, Unit, Account, Build, E2E and Deploy appear under it. The upload reads the repo's YAML and adds those jobs while the build runs.
- **Lint fails, so the build goes red.** That's expected. Scroll up past the `npm error` lines:

  ```
  38:9  error  'isEmpty' is assigned a value but never used  @typescript-eslint/no-unused-vars
  ```

  It's in `web/src/main.ts`. Don't fix it yet: you'll fix it with a push in 1.4.

<details>
<summary>Stuck?</summary>

1. Can't create a pipeline in this cluster? Ask the facilitator to check your cluster-maintainer access and your team's **Create pipelines** permission.
2. Job waiting? Check the queue key in **Settings → Steps** and `.buildkite/pipeline.yml` matches your queue exactly.
3. Checkout fails? Ask the facilitator to check the GitHub integration has access to the shared repository.
</details>

A successful pipeline upload can still lead to failing application checks; inspect the first failed job.

**Official Buildkite documentation:** [Pipeline upload](https://buildkite.com/docs/agent/cli/reference/pipeline); [Wait steps](https://buildkite.com/docs/pipelines/configure/step-types/wait-step).

---

## 1.4 Make your pushes start builds

The GitHub integration receives repository events. Configure your pipeline to build your two personal branches so another attendee's pushes don't start your work.

### Step 1: the branch settings

Configure GitHub push triggers so only your two personal branches start builds of your pipeline.

Your pipeline → **Settings → GitHub**:

- **Build branches:** enabled.
- **Branch filter:** **`workshop/<your-name> workshop/<your-name>-test-deploy`** (two exact names, separated by a space).
- **Build pull requests:** disabled for the workshop. Work directly on your branch; no PR is needed.

The test-deploy branch is used in Act 5. These settings accept GitHub push events for your two branches and create builds from them. The bootstrap YAML's `branches:` line is a second check on the upload job after a build exists. Manually creating a build is a separate path: the GitHub push filter does not select its branch for you. Always check the Branch field in New Build.

Pipeline trigger filters and step branch filters operate at different points.

**Official Buildkite documentation:** [GitHub integration](https://buildkite.com/docs/pipelines/source-control/github); [Branch configuration](https://buildkite.com/docs/pipelines/configure/workflows/branch-configuration).

### Step 2: fix the lint error and push

Fix the lint error and verify that pushing to your personal branch starts a new build.

The error points at `web/src/main.ts`, line 38: a variable that's never used. Delete that line:

```bash
sed -i.bak '/const isEmpty = cart.count === 0;/d' web/src/main.ts && rm web/src/main.ts.bak
git add web/src/main.ts
git commit -m "[Act 1, Section 1.4] Remove unused isEmpty variable"
git push
```

**In GitHub's web editor instead:** select **`workshop/<your-name>`**, open `web/src/main.ts`, delete that line, and commit on the same branch.

**What you should see:**

- A build of your branch starts on your pipeline, titled with your commit message.
- It goes green, slowly: about 4 to 5 minutes. Watch each step wait for the one before. Act 2 fixes that.
- If Unit shows a **⚠️** instead of a green tick: well spotted. What do you think that means? Check `pipeline.yml` for that step.

<details>
<summary>Stuck?</summary>

1. Nothing starts? Check your branch name and pipeline filter, then ask the facilitator to check the repository integration.
2. Check **New Build** points at your workshop branch, not shared `main`.
3. Can't push from your laptop? Use GitHub's web editor on your branch or ask a helper.
</details>

The push verifies the GitHub integration, while the Unit warning reveals a hidden failure.

**Official Buildkite documentation:** [GitHub integration](https://buildkite.com/docs/pipelines/source-control/github); [Soft fail](https://buildkite.com/docs/pipelines/configure/soft-fail).

---

<!-- compare act-1 -->

## What you did, and why it matters

You opened the shared cluster, created your hosted queue and pipeline, routed its jobs to your queue by name, watched the pipeline grow as it uploaded the repo's YAML, and turned a red build green with a push to your branch.

It's green, but almost everything about this pipeline is wrong: slow, wasteful, hiding a failing test, deploying from every branch it builds with a key in plain text. The next four acts fix it.

**Official Buildkite documentation:** [Pipeline upload](https://buildkite.com/docs/agent/cli/reference/pipeline); [Managing queues](https://buildkite.com/docs/agent/queues/managing); [GitHub integration](https://buildkite.com/docs/pipelines/source-control/github).

**Next:** [Act 2: Make it fast](act-2.md). Fell behind? `./scripts/catch-up-branch.sh 1` puts your branch at the end of this act; the Buildkite setup above still needs doing.
