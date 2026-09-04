# Issue tracker: Local Markdown

Issues and PRDs for this repo live as markdown files in the committed top-level `issues/` directory.

## File layout

```
issues/
  <feature-slug>/
    PRD.md           ← parent PRD (written by to-prd; does not carry ready-for-agent)
    <NN>-<slug>.md   ← child slice (written by to-issues; carries State: + Status:)
```

Directories are created lazily at first `to-prd` run — no skeleton structure is needed up front.

## Issue fields

Every child slice file carries two orthogonal fields near the top of the file:

- `State: open | closed` — lifecycle; `open` = active, `closed` = done
- `Status: needs-triage | needs-info | ready-for-agent | ready-for-human | wontfix` — triage role (see `triage-labels.md`)

The parent `PRD.md` is a planning document and never carries `Status: ready-for-agent`.

## Backlog query for the stateless orchestrator

```
backlog = State: open  ∧  Status: ready-for-agent
done    = State: closed
```

A stateless orchestrator can resume the backlog from disk alone by reading all `<NN>-<slug>.md` files and filtering for `State: open` + `Status: ready-for-agent`. Completed work is `State: closed`.

## Conventions

- Files numbered from `01`: `01-first-slice.md`, `02-second-slice.md`, …
- Files written UTF-8 without BOM; å/ä/ö in content must render correctly.
- `State:` transitions are committed, giving a versioned audit trail.
- Comments and conversation history append to the bottom of each file under a `## Comments` heading.

## When a skill says "publish to the issue tracker"

Create a new file under `issues/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.
