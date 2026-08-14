---
name: poi-merge-edits
description: Merge one or more Waypoints on-device edit changesets (waypoints-edits-*.json files) into pois.json. Triggers when the user shares a path to one or more such files. Does NOT apply to a full pois-<date>.json snapshot export (different, replace-not-merge shape) — stop and ask if the file looks like one of those instead.
argument-hint: [path(s) to waypoints-edits-*.json]
allowed-tools: Bash(npm run validate:pois:*), Bash(npm run detect-edit-conflicts:*)
---

Follow **Track C** in `docs/travel-workflow.md`:

1. Confirm each file matches the changeset shape (`{formatVersion, exportedAt, edits[]}`; `author` is optional). The reliable discriminator: a changeset's top level has `edits[]`; a full snapshot's top level has `{cities, walkingTours}` instead. If any file is a snapshot, stop and ask before doing anything — that shape needs a replace, not a merge. If a changeset path lives outside the repo and the script can't read it, copy it into the repo/scratchpad first.
2. Run `npm run detect-edit-conflicts -- <path1> [<path2> ...]` — this diffs each touched POI against current `pois.json`, auto-applies anything unambiguous, and writes the result in place. Exit code `1` means "some applied, some flagged for review," not failure — don't treat it as an error, read the printed conflict report instead.
3. Run `npm run validate:pois`. If it fails specifically because a `poiSequence` references a just-deleted POI, that's a manual walking-tour edit needed, not a sign to re-run the merge.
4. Report the diff, the validator result, and any conflicts from step 2. For each conflict, draft a suggested combined value from both raw sources where it makes sense (e.g. a `notes`/`description`/`walkingTourNotes` disagreement) — this is a conversational judgment call, not something the script does. Present both sides and ask what to do. **Do not `git commit` or `git push`.** Apply whatever resolution is chosen for any remaining conflict by hand first, then wait for explicit confirmation.

$ARGUMENTS
