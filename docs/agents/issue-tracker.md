# Issue tracker: GitHub

Issues and PRDs for this project live as GitHub issues. Use the `gh` CLI for all
operations. The setup-skript (C1b) creates the GitHub repo and the standard
labels when run with `-RepoSlug`, so this is the locked-in default — no interview
needed.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Switching trackers

To move to GitLab or local-markdown issues instead, re-run
`/setup-matt-pocock-skills` (shipped under `.claude/skills/`) and pick the other
tracker; it will overwrite this file with the matching conventions.
