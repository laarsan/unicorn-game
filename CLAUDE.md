# CLAUDE.md — unicorn-game

> Ersätt detta med projektets stående order efter att `/init` körts.

## Projektets syfte

<!-- Beskriv vad projektet gör: domän, mål, avgränsning. -->

## Konventioner

- Filkodning: UTF-8 utan BOM. Svenska tecken (å, ä, ö) ska renderas korrekt.
- Språk: resonemang och prosa på svenska, kod/commits/kommandon på engelska.
  Domäntermer enligt `CONTEXT.md` — tappa dem inte till synonymer ordlistan undviker.
- Hemligheter: aldrig i kod. Använd `.env` + `.gitignore`.
- Loggning: tidsstämplad loggfil (`<operation>_log.txt`), inte bara konsolutdata.
- Agent-returer följer kalibrerad-konfidens-inte-prosaisk-ton-normen — se `docs/agents/prompt-efficiency.md`.
- Residual-beslut: ett steg körs först när dess acceptanskriterier kan skrivas utan nytt beslut — annars tillbaka uppströms (design/ADR/PRD), eskalera inte. Se `docs/agents/prompt-efficiency.md`.

## Git

- Commits: Conventional Commits-prefix (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
- Commit-meddelanden på engelska.

## Agent skills

De portade pipeline-skillsen (`to-issues`, `to-prd`, `triage`, m.fl.) är
förkonfigurerade för detta projekt — inga interaktiva svar krävs efter `/init`.
Vill du byta något, kör `/setup-matt-pocock-skills`.

- **Issue tracker** — GitHub via `gh` CLI. Se `docs/agents/issue-tracker.md`.
- **Triage labels** — de fem kanoniska rollerna (`needs-triage`, `needs-info`,
  `ready-for-agent`, `ready-for-human`, `wontfix`). Se `docs/agents/triage-labels.md`.
- **Domain docs** — single-context-layout (`CONTEXT.md` + `docs/adr/` i roten).
  Se `docs/agents/domain.md`.
- **CI-kostnad** — GitHub Actions-minutregler för alla workflows (endast
  online-repo): runner-val, triggers, concurrency, timeouts, cache.
  Se `docs/agents/ci-cost.md`.
