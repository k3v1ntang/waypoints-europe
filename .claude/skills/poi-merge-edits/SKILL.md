---
name: poi-merge-edits
description: Merge a Waypoints on-device edit changeset (a waypoints-edits-*.json file) into pois.json. Triggers when the user shares a path to such a file. Does NOT apply to a full pois-<date>.json snapshot export (different, replace-not-merge shape) — stop and ask if the file looks like one of those instead.
argument-hint: [path to waypoints-edits-*.json]
allowed-tools: Bash(npm run validate:pois:*)
---

Follow **Track C** in `docs/travel-workflow.md`:

1. Confirm the file matches the changeset shape (`{formatVersion, exportedAt, edits[]}`; `author` is optional). The reliable discriminator: a changeset's top level has `edits[]`; a full snapshot's top level has `{cities, walkingTours}` instead. If it's a snapshot, stop and ask before doing anything — that shape needs a replace, not a merge.
2. Apply each edit (override/new/delete) into `src/data/pois.json`.
3. Run `npm run validate:pois`.
4. Report the diff and the validator result. **Do not `git commit` or `git push`.** Wait for explicit confirmation.

$ARGUMENTS
