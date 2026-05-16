# Local Development — Quickstart

How to get `npm run dev` working on a fresh checkout, and how to recover when
`amplify_outputs.json` goes bad. For the deep "why," see
[cognito-and-environments.md](./cognito-and-environments.md).

---

## TL;DR

```sh
# First-time setup (or after the file gets clobbered):
#   1. Get a real amplify_outputs.json (see "Populating amplify_outputs.json" below)
#   2. Then:
npm run backup:amplify    # stash a copy outside the repo
npm run dev               # predev guard verifies the file, then starts Next.js

# Later, if the file goes missing or gets stubbed:
npm run restore:amplify   # copies the backup back into the repo
```

---

## Why this matters

The frontend's Cognito + AppSync config lives in `amplify_outputs.json` at the
repo root. The file is **gitignored** — local edits don't get committed, but
they also don't survive a `rm` or `git clean -fdx`.

If it's missing or contains stub values (`stubclient` / `stubpool`),
authentication fails with a confusing error:

> User pool client stubclient does not exist.

The setup below makes this state visible and easy to recover from.

---

## What's wired up

| Command | What it does |
|---|---|
| `npm run dev` | Runs the `predev` guard first; refuses to start if the file is missing or stubbed. |
| `npm run check:amplify` | Runs the guard manually. Exits 0 if real, 1 with instructions if not. |
| `npm run extract:amplify -- <artifact-dir>` | Extracts a real `amplify_outputs.json` from a downloaded Amplify build artifact. See "Populating" below. |
| `npm run backup:amplify` | Copies the current `amplify_outputs.json` to `~/.fiapp-amplify-outputs-backup.json`. Refuses to back up stub values. |
| `npm run restore:amplify` | Copies `~/.fiapp-amplify-outputs-backup.json` back into the repo. |

Scripts live in [scripts/](../../scripts/):
- [check-amplify-outputs.mjs](../../scripts/check-amplify-outputs.mjs) — predev guard
- [extract-amplify-outputs.mjs](../../scripts/extract-amplify-outputs.mjs) — pulls config out of an Amplify build artifact
- [backup-amplify-outputs.mjs](../../scripts/backup-amplify-outputs.mjs)
- [restore-amplify-outputs.mjs](../../scripts/restore-amplify-outputs.mjs)
- [create-amplify-stub.mjs](../../scripts/create-amplify-stub.mjs) — CI-only stub writer (now prints a loud warning when it fires)

---

## Populating `amplify_outputs.json`

The file points local dev at the **staging** Cognito + AppSync. There are two
ways to get real values:

### Option A — Extract from a staging build artifact (no AWS perms needed)

1. AWS Amplify Console → **fiapp app** → **staging** branch → latest build
2. Click **Download artifacts** (downloads a folder named `Deployment-NN-artifacts/`)
3. Run the extractor against that folder:
   ```sh
   npm run extract:amplify -- ~/Downloads/Deployment-NN-artifacts
   ```
   It parses the inlined config out of the compiled Next.js chunks (auth,
   AppSync URL, OAuth domain, and the full `model_introspection` for
   custom queries/mutations) and writes a clean `amplify_outputs.json` to
   the repo root.
4. `npm run backup:amplify` to stash a copy outside the repo.

> **Why we need the full `model_introspection`:** Amplify's data client
> builds `client.queries.*` / `client.mutations.*` from the introspection
> at runtime. A hand-written `amplify_outputs.json` with empty `queries`/`mutations`
> will look fine (auth still works, most of the app uses direct DynamoDB)
> but routes like `/api/dev/subscription` that go through AppSync custom
> ops will fail with `TypeError: client.queries.<name> is not a function`.
> The extract script handles this — manual reconstruction does not.

### Option B — Generate from AWS (if you have admin creds)

```sh
npx ampx generate outputs --branch staging --app-id d3nyg9qvz1tj5n --profile <admin-profile>
```

The default `fiapp-server` IAM user does **not** have the CloudFormation
permissions for this. You'd need an admin profile.

### Option C — Run your own sandbox

```sh
npx ampx sandbox
```

Slow, but fully isolated. Useful when changing `amplify/**/*.ts` since those
changes only take effect after a redeploy on staging. See § 5 of
[cognito-and-environments.md](./cognito-and-environments.md) for the tradeoffs.

---

## What happens when the file gets clobbered

The `predev` guard catches it before Next.js starts:

```
$ npm run dev

------------------------------------------------------------------------
  amplify_outputs.json is not usable for local dev

  File contains stub values (stubclient / stubpool).

  To restore real values:
    1. npm run restore:amplify
    2. Otherwise, download from AWS Amplify Console:
         fiapp app -> staging branch -> latest build -> artifacts
       Drop amplify_outputs.json into the repo root, then run:
         npm run backup:amplify
------------------------------------------------------------------------
```

99% of the time `npm run restore:amplify` is the fix. If you have no backup,
re-do Option A above.

### Why does it get clobbered?

Anything that deletes the file and then triggers a stub-write can do it:

- Manual `rm amplify_outputs.json`
- `git clean -fdx` (the `-x` removes gitignored files too)
- A test or build script running while the file is missing — the stub writer
  in [create-amplify-stub.mjs](../../scripts/create-amplify-stub.mjs) will
  fill it back in with placeholder values

The stub writer now prints a big warning banner when it fires, so if this
happens you'll see it in the terminal output.

---

## Note: CI uses the stub on purpose

The `predev` guard only fires on `npm run dev`. CI test jobs and Amplify
Hosting builds bypass it:

- **CI test runs** — [scripts/create-amplify-stub.mjs](../../scripts/create-amplify-stub.mjs)
  writes a stub before tests run. Tests mock auth, so stub values are fine.
- **Amplify Hosting builds** — `ampx pipeline-deploy` generates a real
  `amplify_outputs.json` at build time, before `npm run build` runs.

So nothing in CI breaks because of the guard.
