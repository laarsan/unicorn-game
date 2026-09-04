---
name: runlist
description: Drive the standalone PRD run-list (docs/prd-runlist.md) one row at a time — run the next /to-prd step (PRD + vertical-slice issues), commit, push, hand off, and recommend /clear. The LOOP that runs successive run-list rows. Trigger when the user says "följ körlistan", "follow the run-list", "kör nästa rad", "kör nästa PRD i körlistan", "ta nästa steg i körlistan", or "/runlist" — for a standalone run-list OUTSIDE the master plan. NOT the master-plan driver: "kör nästa steg [i plan-to-done / master-planen]", "fortsätt master-planen", or a bare "kör nästa steg" → that's plan-next (which itself calls runlist when a row needs it). NOT for authoring a single PRD from the current conversation — that's to-prd; runlist is the loop that invokes to-prd per row.
argument-hint: "(optional) a specific run-list row number to run instead of the next one"
---

Drive the standalone PRD run-list `docs/prd-runlist.md` one row at a time. **Exactly one row per invocation** — for a build row that means one parent PRD *plus* its vertical-slice child issues — then stop and recommend `/clear`. The point is that each row runs in fresh, full architecture context — never a compacted one.

## Process

1. **Read `docs/prd-runlist.md`.** Find the **first row that is not `[x]`** (or the row the user named in arguments). A `[~]` row (PRD published, slices still pending) takes priority over the next `[ ]` row — its parent PRD exists and only needs the slices-only phase. If every row is `[x]`, report that the run-list is complete and stop — do not invent new steps.

2. **Run the row according to its type.**
   - **Repo-activation gate (pre-`to-prd`, no-op if already configured):** Check whether
     `docs/agents/issue-tracker.md` exists.
     - Exists → no-op, tracker configured. Proceed to the build/research row.
     - Missing → surface the online/local choice:
       - **Online:** ask for repo name (if missing), run the C1b command sequence
         inline (`git init` → `gh repo create` → triage-label objects → `push`),
         write tracker = GitHub to `docs/agents/issue-tracker.md`.
       - **Local-only:** run `git init` (no remote), write tracker = local
         (`issues/` layout per ADR 0021 decision 3) to
         `docs/agents/issue-tracker.md`. No label objects.
   - **Build row** (most rows — argument begins `/to-prd …`): two phases in the same session.
     - **a. PRD (parent).** Invoke the `to-prd` skill with that argument string verbatim. Let `to-prd` do its own seam-check with the user and publish the PRD as the **parent** issue. Because `to-issues` will break it down, the parent is a planning issue — it must **not** carry `ready-for-agent`. Capture the parent issue number.
     - **b. Slices (children).** Invoke the `to-issues` skill against that parent PRD issue. It breaks the PRD into **vertical-slice** child issues (tracer bullets) — each independently grabbable and demoable, each `ready-for-agent`, each referencing the parent via `## Parent`, published in dependency order. A slice may cover several cohesive user stories; do **not** publish one issue per user story. Let `to-issues` quiz you on granularity. Capture all child issue numbers.
   - **Research row** (marked "research-spår, EJ `/to-prd`"): invoke `grill-with-docs` to grill the topic and write the named `research/<name>.md` (rule + property-test strategy, mirroring `coupling-detection.md`). No issue is published; the deliverable is the research doc.
   - **Slices-only row** (a build row whose PRD already exists — e.g. legacy rows #1/#2 marked `[~]`): skip phase 2a (do **not** run `to-prd` again — that would create a duplicate PRD). Run only phase 2b: `to-issues` against the existing parent PRD issue named in the row.

3. **Mark progress + commit + push.** Edit the row in `docs/prd-runlist.md` and append the deliverable pointer:
   - **Build row** fully done (PRD + slices published): `[ ]`/`[~]` → `[x]`, append ` (PRD #<p> → #<a>, #<b>, …)`.
   - **Research row**: `[ ]` → `[x]`, append ` (research/<name>.md)`.
   - Then commit the run-list change (and the research doc, if any) and push:
   - Conventional message, e.g. `docs(runlist): mark step <n> done (PRD #<p> + <k> slices)` or `docs(research): <name> + mark runlist step <n>`.
   - **Never add any "Co-Authored-By: Claude" or AI-attribution trailer** — all work is attributed to Lars Lundgren alone.
   - After committing and pushing, regenerate the status report: run
     `setup/Update-StatusReport.ps1` from the project root if the file exists.
     If no root-level copy exists, check `template/setup/Update-StatusReport.ps1`
     instead — this repository (the template source itself) dogfoods the
     generator from its template-resident copy per ADR 0012 §6; if found there,
     run it with the repository root as target. A git `post-commit` hook is
     **opt-in**, not part of the contract; chat-only users run the generator
     manually (ADR 0012 §4).

4. **Hand off.** Invoke the `handoff` skill with an argument describing the **next** run-list row's focus (or "run-list complete" if none remain). This writes a handoff doc to the project's `temp/` directory (per the `handoff` skill) so the next session resumes without `/compact`. The handoff should reference `docs/prd-runlist.md`, the just-created parent PRD + its child issues, and the relevant architecture docs by path — not duplicate them.

5. **Recommend `/clear`.** Tell the user the step is done and recommend they run `/clear`, then start a fresh session and say "följ körlistan" to take the next row. Keep the closing message to a couple of sentences.

## Notes

- One row = one session. Running `to-prd` then `to-issues` for the **same** row in one session is correct (both run on the same fresh context). What you must NOT do is chain *different* rows in one invocation, even if asked to "do a few" — that defeats the fresh-context purpose. If the user insists, warn that later rows will run on degraded context.
- **A user story is not a unit of work.** The grabbable unit is a vertical slice that cuts through all layers and is demoable on its own; one slice may satisfy several user stories. Never expand the PRD's user-story list 1:1 into issues — that produces tightly-coupled, non-independent tickets.
- If `to-prd` or `to-issues` cannot publish (e.g. missing label, auth failure), stop after the failing phase, report the blocker, and do not mark the row done. If `to-prd` published the parent but `to-issues` failed, leave the row as `[~]` (PRD done, slices pending) with the parent issue number.
- The run-list's scope rationale and per-step workflow live in `docs/prd-runlist.md` — keep that file as the single source of truth; if the user re-scopes a row, edit the doc, don't hardcode here.
