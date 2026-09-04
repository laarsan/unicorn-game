---
name: handoff
description: Compact the CURRENT conversation into a transient handoff document (saved under temp/) so a fresh agent with no context can pick up exactly where this session left off. Use when context is running low or a session is ending and work must carry over — "gör en handoff", "lämna över", "sammanfatta var vi är för nästa agent/session", "skriv ihop var vi landade så någon annan kan ta vid", "hand off", "I'm low on context, write up where we are for the next session". NOT for durable planning artifacts: a spec is to-spec, a PRD is to-prd, breaking work into issues is to-issues — defer when the user wants a real project document rather than a context carry-over. NOT a driver: a bare "kör nästa steg"/"continue the master plan" is plan-next and "följ körlistan" is runlist; those call handoff themselves as a final step, so don't run it separately when driving them.
argument-hint: "What will the next session be used for?"
---

If `setup/Update-StatusReport.ps1` exists at the project root, run it to
regenerate `docs/status/index.html` before writing the handoff. If no
root-level copy exists, check `template/setup/Update-StatusReport.ps1`
instead — this repository (the template source itself) dogfoods the
generator from its template-resident copy per ADR 0012 §6; if found there,
run it with the repository root as target. A git `post-commit` hook is
**opt-in**, not part of the contract; chat-only users run the generator
manually per `docs/chat-only-guide.md` (ADR 0012 §4).

Write a handoff document summarising the current conversation so a fresh agent can continue the work. A good handoff captures what the goal was, what was decided and done, what is still open, and the immediate next step — enough that someone with no memory of this session can resume without re-deriving context. Stop once that is covered; this is a short carry-over note, not a report.

Save it to a `temp/` directory at the root of the current project's workspace — not the OS temp directory, which collides between simultaneously-running projects — creating the directory if it does not exist. When creating or addressing the directory, use a relative path (`temp/`) or forward slashes; never pass an absolute Windows backslash path through a POSIX shell such as the Bash tool, where `\` is consumed as an escape character and an empty directory with a literal mangled name (e.g. `C:UsersXprojecttemp`) is created instead. `temp/` is gitignored: the handoff is transient, not a committed artifact.

Include a "suggested skills" section in the document, which suggests skills that the agent should invoke.

Include a **model recommendation**: name exactly **one** orchestration model for the next phase (`opus`, `sonnet`, `haiku`, or `fable` — bare names, no version numbers), with a one-line reason. State it both in the handoff document and in the final message to the user. Never make it conditional ("sonnet, escalate to opus on resistance") — a conditional verdict is resolved in practice by the user, usually toward the more expensive model, and if the project stamps the orchestration model in its plan pointer (`orch:<model>`, per plan-next), a conditional recommendation makes that stamp unusable: two phases with the same stamp may have run different models. Decide here, where the evidence about the phase's difficulty is freshest.

Do not duplicate content already captured in other artifacts (PRDs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.
