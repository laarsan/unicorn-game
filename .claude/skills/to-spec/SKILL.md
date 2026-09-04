---
name: to-spec
description: Turn a fuzzy goal, vague brief, or one-line idea into a clear, testable project spec (docs/spec.md) — interrogating it until every requirement is specific and every success criterion is measurable. Use at the very start of a project, before grill-with-docs, whenever requirements are still vague and no plan or domain model exists yet: the user wants to "write a spec" or "write requirements", "define what done looks like", "turn this idea into requirements", or "figure out what we're actually building" — even if they never say the word "spec". Not for stress-testing an existing spec against a domain model (that's grill-with-docs), editing an already-agreed spec, or breaking a finished spec into issues (to-issues).
---

<what-to-do>

Take a fuzzy goal and turn it into a clear, testable spec. This is the **first** step in the pipeline — it runs *before* `grill-with-docs`. The distinction:

- **`to-spec`** (this skill): there is no plan and no domain model yet — only a vague goal. Interrogate it into a written spec artifact (`docs/spec.md`).
- **`grill-with-docs`** (next step): a spec exists — stress-test the design against the domain model (`CONTEXT.md`, ADRs).

Interview the user one question at a time, waiting for an answer before the next. For every question, give your recommended answer and a confidence level. Drive toward a spec where **every requirement is specific and every success criterion is measurable**.

Stop interviewing when the spec is testable: someone could read it and tell, unambiguously, whether the result satisfies it. Then write `docs/spec.md` using the template below and confirm it with the user.

If the user already has a short written spec, read it first and interrogate only the gaps and ambiguities — don't re-ask what's already settled.

**When no one is available to interview** (autonomous or AFK runs — a common mode for this template): don't stall waiting for answers that won't come. Take your best recommended answer for each question, record it under **Assumptions** with its confidence level, and route anything you genuinely can't justify to **Open questions**. The artifact still gets written; the gaps are made visible and challengeable rather than silently resolved. A spec that surfaces ten honest assumptions beats one that stalls on question one.

</what-to-do>

<supporting-info>

## The evidence base (why this skill works the way it does)

This skill applies findings from two research syntheses bundled alongside it. **Read them when you need the detail** — they are the authority for the rules below, not this file's summary:

- [EVIDENCE-WHAT-WORKS.md](./EVIDENCE-WHAT-WORKS.md) — the prescriptive synthesis: frameworks, format specification, few-shot selection, anti-patterns, a practical template.
- [EVIDENCE-CAVEATS.md](./EVIDENCE-CAVEATS.md) — the counterweight: prompt brittleness, persona failure modes, model-specificity, "test rigorously and trust nothing unconditionally".

Hold both in tension. The first tells you what reliably helps; the second tells you why none of it is guaranteed and must be tested.

## How to interrogate a fuzzy brief

### Replace every subjective qualifier with a measurable one

This is the single highest-impact move (EVIDENCE-WHAT-WORKS, "task clarity and explicit format specification provide the largest gains"). When the user says something vague, pin it down:

- "brief summary" → "3 sentences"
- "improve performance" → "reduce p95 latency below 200 ms"
- "user-friendly" → name the specific interaction and the observable outcome
- "handle errors" → which errors, and what should happen for each

If a requirement can't be made measurable, flag it as an open question rather than letting it stand vague.

### Ask what success looks like, concretely

Force a concrete acceptance scenario for each goal: "When this is done, what exact input produces what exact output?" A spec without a falsifiable success condition isn't done.

### Decompose, don't combine

If the goal bundles several unrelated objectives, separate them (EVIDENCE-WHAT-WORKS, "one giant prompt doing everything fails; chain prompts for multi-step work"). A spec that tries to settle everything at once produces conflicting requirements. Note dependencies between the parts.

### State requirements positively

Capture what the system **should** do, not only what it shouldn't (positive instructions outperform negative). Where an exclusion matters, put it in the explicit **Out of scope** section rather than scattering "don't" requirements through the goals.

### Respect the finite attention budget

Context is a finite budget (EVIDENCE-WHAT-WORKS, Anthropic's "attention budget"; EVIDENCE-CAVEATS, "context rot"). Keep the spec tight — enough to be unambiguous, not so much that the signal drowns. This directly serves this template's goal of running long autonomous processes without `/compact`: a lean, precise spec is what every downstream session re-reads.

### Stay at spec altitude

A spec says **what** the system must do and **how well** — not **how** it is built. The pull toward designing the solution while you write the spec is strong, and giving in to it is the most common way a spec bloats: a tight requirements list turns into a 200-line document carrying a module breakdown, a file layout, a data model, and a test-implementation plan. None of that belongs here. Architecture and design are the job of the next pipeline step (`grill-with-docs`) and of planning; deciding them now, before the spec is even agreed, pre-commits choices no one has signed off on and drowns the requirements that actually gate completion. If you catch yourself naming modules, sketching directory trees, or choosing libraries, stop — that is a signal you've dropped below spec altitude. Capture the *requirement* that the design would satisfy and move on.

### Surface assumptions instead of guessing

When a requirement is unknown, do not let the spec silently assume a value (EVIDENCE-CAVEATS, unstated requirements drive hallucination). Either ask, or record it explicitly under **Assumptions** — and tag every assumption with a confidence level (high / medium / low) and a one-clause reason. The confidence tag is not decoration: it is what lets a downstream reader or `grill-with-docs` session know *which* assumptions are load-bearing and shaky enough to verify first. An untagged assumption reads as settled fact and gets built on; a "confidence: low, because the user never named the system" assumption invites the challenge it deserves. This is the single most distinctive discipline of a good spec — a buried guess is a future bug, a tagged guess is a managed risk.

## Personas and framing (apply with the caveats in mind)

Generic "act as an expert" framing gives no measurable benefit on factual/objective work and can hurt it (EVIDENCE-CAVEATS). Only invoke a detailed, task-specific persona when the work is genuinely reasoning-heavy or creative, and make it specific (domain, methodology) rather than a bare role label. For a project spec, prefer plain, precise requirements over role-play.

## The spec artifact

Write `docs/spec.md`. Create the file lazily — only once the interview has produced enough to fill it meaningfully.

<spec-template>

# Spec — [PROJECT / FEATURE NAME]

## Goal

The single, clear objective, stated with an actionable verb. One sentence if possible.

## Context

The background needed to understand why this matters and what situation it sits in. Only what's load-bearing — keep within the attention budget.

## Scope

### In scope

- [Specific, measurable requirement]
- [Specific, measurable requirement]

### Out of scope

- [Explicitly excluded item — the things a reader might assume are included but aren't]

## Success criteria

Falsifiable, measurable conditions. Each should be checkable as pass/fail.

1. Given [input/situation], the result is [exact observable outcome].
2. [Measurable threshold, e.g. "completes in under N seconds"].

## Constraints

- [Technical, encoding, platform, or policy constraint — e.g. UTF-8 without BOM, PowerShell 7, no secrets in code]

## Assumptions

Things taken as given that were not confirmed. Each carries a confidence level so it can be challenged.

- [Assumption] — confidence: [high/medium/low], because [reason].

## Open questions

Ambiguities that could not be made measurable yet. These gate completion of the spec and should be resolved (here or in the next `grill-with-docs` session) before building.

- [Question]

</spec-template>

## Handoff to the next step

When `docs/spec.md` is confirmed, the natural next move is `grill-with-docs <the spec's focus>` to stress-test it against the domain model and start producing `CONTEXT.md` / ADRs. Recommend it, then `/handoff` and `/clear`.

> **Förspels-spike:** Om domänen är okänd innan spec-skrivningen börjar — kör `/deep-research` (terminal) eller `docs/chat-only-skills/deep-research.md` (chat-only) som ett förspel för att samla domänkunskap innan intervjun startar.

</supporting-info>
