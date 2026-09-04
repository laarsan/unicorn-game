---
name: to-prd
description: Turn the CURRENT conversation context into ONE product requirements document (PRD) and publish it as an issue on the project tracker. The atomic "write a PRD now from what we just discussed" — synthesizes already-discussed context, does NOT re-interview. Use when the user says "skriv en PRD", "skriv ihop en PRD av det här", "gör en PRD av det vi pratat om", "write this up as a PRD", "turn this into a PRD/feature doc", "document this feature as a ticket so an agent can build it". Not for breaking a plan/spec/PRD into many grabbable issues or work tickets — that's to-issues. Not for "följ körlistan"/"follow the run-list"/"kör nästa" (runlist) or "kör nästa steg"/master-plan driving (plan-next), which are loops that call this skill. Not for interrogating a still-vague idea into requirements when no concrete content exists yet — that's to-spec.
---

Synthesize the current conversation context and codebase understanding into a single PRD. Do not interview the user — work from what has already been discussed. If little has been discussed and requirements are still vague, the user likely wants a spec first (`/to-spec`), not a PRD.

The issue tracker and triage label vocabulary should have been provided to you — run `/setup-matt-pocock-skills` if not.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain glossary vocabulary throughout the PRD, and respect any ADRs in the area you're touching.

2. Sketch out the seams at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible. If new seams are needed, propose them at the highest point you can.

Check with the user that these seams match their expectations.

3. Write the PRD using the template below, then publish it to the project issue tracker. Apply the `ready-for-agent` triage label - no need for additional triage.

   Exception — **parent PRDs**: if this PRD will be broken down into grabbable child issues by `to-issues` (e.g. when driven by `/runlist`), it is a planning/parent issue, not a work ticket. Do **not** apply `ready-for-agent` to it — the grabbable label belongs on the child slices. Reference the parent from each child via the template's `## Parent` section.

<prd-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

This list of user stories should be extremely extensive and cover all aspects of the feature.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this PRD.

## Further Notes

Any further notes about the feature.

</prd-template>

> **Prompt-effektivitet:** DESIGN-fronten arbetar under intent-elicitation-disciplinen. Se `docs/agents/prompt-efficiency.md`.
