# Kite Shop: a hands-on Buildkite workshop

Improve a TypeScript/Jest pipeline through five guided exercises: get it running, make it fast, make it trustworthy, skip unnecessary work, and control deployments.

This workshop uses one shared repository and Buildkite cluster. Each attendee has their own branch, pipeline, queue, test suite, secret and cache keys.

**Start with the [shared-branch setup guide](branch-workflow/README.md).** Your facilitator supplies the exercise repository URL and workshop cluster name. If your organization has copied this repository, use that copy's URL for the exercises.

- [Detailed workshop index](branch-workflow/INDEX.md)
- [Act 1: Get it running](branch-workflow/act-1.md)
- [Act 2: Make it fast](branch-workflow/act-2.md)
- [Act 3: Make it trustworthy](branch-workflow/act-3.md)
- [Act 4: Make it smart](branch-workflow/act-4.md)
- [Act 5: Ship it and tell people](branch-workflow/act-5.md)
- [Cheat sheet](branch-workflow/cheat-sheet.md)

You need Git, write access to the exercise repository, and the Buildkite permissions listed in the setup guide. Builds run on hosted agents; you do not need Node.js or npm on your laptop.

The deployment is a mock: it prints messages and sleeps. It does not deploy anything, and the key in the starting pipeline is deliberately fake.

## Catch up

From your own workshop branch, run:

```sh
./scripts/catch-up-branch.sh 2
```

Replace `2` with the act you want to be at the end of. This restores exercise files and applies your branch's names, then commits and pushes. It keeps the current workshop instructions. Complete the Buildkite UI setup listed in each act too.

## License

[MIT](LICENSE), Copyright 2026 Buildkite.
