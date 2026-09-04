---
name: inter-slice-driver
description: Opt-in accelerator that builds out all open ready-for-agent slices for the current R-BUILD step unattended, one fresh subagent per slice (Workflow-orchestrated, greenfield only). Use when you want to build out a greenfield step's slices obevakat — "kör inter-slice-drivaren", "bygg ut det här steget obevakat", "run inter-slice-driver", "build out this step unattended", "kör alla slices i steget", "kör G1 obevakat". NOT for hardened posture; NOT a replacement for plan-next (one-slice-per-call remains default in all postures). Definieras av ADR 0020.
---

<what-to-do>

## Opt-in inter-slice build-out accelerator (ADR 0020)

**Greenfield only.** If `autonomyPosture` in `.claude/settings.json` is `hardened`,
refuse and redirect to `plan-next` — one-slice-per-call is the only path in `hardened`.

**Separate pipeline stages — build-time knot resolved (ADR 0020 §5).**
Workflow subagents may not be able to nest further agent spawning. This driver therefore uses
the preferred option: **separate pipeline stages**, so every role remains context-isolated
without nesting. Per slice: `parallel-coder (worktree) → test-runner → reviewer (+ conditional
security-reviewer) → git-bokföring (merge)` — producer and verifier are architecturally separate
agents (ADR 0025 §2). The posture-gated re-review loop is realised as a bounded while-loop within
the review stage (max 3 rounds per ADR 0019 §2).

**Producer–verifier separation (ADR 0025 §2).** `parallel-coder` implements the slice test-first
in an isolated git worktree and self-reports `tests_passed`, but never pushes, comments, or closes
the issue. A stakeless `test-runner` agent then re-runs the Pester suite independently against
that worktree — this is the binding mechanical gate, not the producer's self-report. A red result
escalates immediately; the reviewer is never spawned. Only after test-runner is green does the
reviewer inspect the worktree diff (it no longer re-runs Pester itself — that would be redundant
with the mechanical gate). Merge worktree→main, push, and issue close happen last, serialized,
after both the mechanical gate and a clean review.

**One build step at a time (ADR 0020 §4).** The driver discovers open `ready-for-agent` slices
for the *current* step in `docs/plan-to-done.md` and stops at the step boundary. It does not
chain into the next step.

## Steps

### 1. Identify the Workflow script

The Workflow script lives at:
`.claude/skills/inter-slice-driver/inter-slice-driver.workflow.js`

Resolve the absolute path from the project root.

### 2. Invoke the Workflow tool

Call the Workflow tool with:
- `scriptPath`: the absolute path to `inter-slice-driver.workflow.js`
- No `args` — the script reads all state from disk (`.claude/settings.json`,
  `docs/plan-to-done.md`, GitHub issues via `gh`)

### 3. Monitor and report

When the Workflow completes, report the summary to the user:
- How many slices were built and reviewed successfully (`done`)
- Which slices (if any) were escalated with blocking findings
- The blocking findings for each escalated slice

### 4. Handle escalations

If any slices were escalated: report the specific blocking findings.
Do not attempt manual fixes here — the escalated slice requires human review.
Suggest the user run `plan-next` to handle the escalated slice one at a time.

### 5. After all slices complete without escalation

Run `handoff` with a summary of what was built and what the next recommended action is.
Recommend `/clear`.

## Invariants (ADR 0020, ADR 0025)

| Invariant | Source |
|---|---|
| `greenfield` posture required — refuse if `hardened` | ADR 0020 §3 |
| One build step only — no cross-step chaining | ADR 0020 §4 |
| Test-first, max 3 review→fix rounds | ADR 0019 |
| `plan-next` one-slice-per-call remains the default and the only path in `hardened` | ADR 0020 §6 |
| Separate pipeline stages — no nesting of agent spawning | ADR 0020 §5 |
| `parallel-coder` implements + commits in worktree only — never pushes/comments/closes | ADR 0025 §2 |
| `test-runner` independently re-runs the suite against the worktree; red → escalate, reviewer never spawned | ADR 0025 §2 |
| Reviewer inspects the worktree diff; no longer re-runs Pester itself | ADR 0025 §2 |
| Merge worktree→main + push is the one serialized (mutex-like) step, run last | ADR 0025 §2 |
| Close-comment carries both the test-runner verdict and the reviewer verdict (spawn-kvitto) | ADR 0024 §3 |

</what-to-do>
