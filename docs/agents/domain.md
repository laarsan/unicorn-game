# Domain Docs

How the engineering skills should consume this project's domain documentation
when exploring the codebase. This project uses the **single-context** layout —
one `CONTEXT.md` plus `docs/adr/` at the repo root — which is the locked-in
default.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — the project glossary and domain language.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.

If any of these files don't exist yet, **proceed silently**. Don't flag their
absence; don't suggest creating them upfront. The producer skill
(`/grill-with-docs`) creates them lazily when terms or decisions actually get
resolved.

## File structure

Single-context repo (this project):

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-...md
│   └── 0002-...md
└── ...
```

If the project later grows into multiple bounded contexts, introduce a
`CONTEXT-MAP.md` at the root pointing at one `CONTEXT.md` per context, with
context-scoped `docs/adr/` directories. Until then, the single-context layout
above holds.

## Glossary authority — narrow by design

`CONTEXT.md` is canon for **which word we use for a concept** — never for **how
the system behaves**. Its authority is deliberately narrow. When sources
disagree, precedence is:

1. **Code** — what the system actually does (canon for behaviour).
2. **Spec / ADRs** — intent and decisions (canon for *why* and *what*).
3. **`CONTEXT.md`** — vocabulary only (canon for *which word*).

Two consequences:

- **Point, don't restate.** If an ADR or the spec owns a concept, a glossary
  entry should *reference* it (`… Definieras av ADR 0008`) rather than re-describe
  its semantics. An entry that only points cannot drift out of sync with canon.
- **Drift is a defect, not a tolerance.** If code contradicts the glossary, one
  of them is wrong — fix one side, don't let them quietly disagree. A glossary
  that contradicts the code is worse than none, because it misleads with
  authority.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal,
a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift
to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either
you're inventing language the project doesn't use (reconsider) or there's a real
gap (note it for `/grill-with-docs`).

## Domain language, not a jargon dictionary

`CONTEXT.md` holds **this project's** terms — words coined here or given a
specific local meaning. It is not a dictionary of general software jargon.
Industry-standard terms (idempotent, race condition, eventual consistency) carry
their normal meaning and don't belong here; pinning those for a human learner is
a personal aid that lives outside any project's glossary, never inside
`CONTEXT.md`. Keeping the two apart stops the project's contract from blending
into a general glossary.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than
silently overriding:

> _Contradicts ADR-0002 (...) — but worth reopening because…_
