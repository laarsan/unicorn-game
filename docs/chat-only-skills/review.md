---
speglar-builtin: review
synkad-fran-cli-version: "2.1.198"
synkad-datum: 2026-07-01
karna: "Claude Code builtin /review"
---

# Review — granska en pull request

Granskar en öppen PR och ger strukturerad feedback på ändringarnas korrekthet, konsekvens och intent. Opt-in för projekt som kör branch-baserat arbetsflöde eller granskar externa bidrag.

## Pipeline-default: direkt-till-main

Pipelinen defaultar till direkt-till-main-arbetsflöde — kod committas och pushas direkt utan PR. `/review` används **inte** i standardflödet.

Aktivera branch-baserat flöde och PR-granskning som ett medvetet projektbeslut (ev. i CLAUDE.md eller via C5-sporet om det gäller repo-aktiveringsflödet).

## Flaggor

| Flagga | Effekt |
|---|---|
| (ingen) | Granskar aktuell öppen PR i nuvarande branch |
| `<PR-nummer>` | Granskar angiven PR: `/review 42` |
| `ultra` | Djup flermanns-cloud-review av PR:en; `/code-review ultra <PR#>` |

## När `/review` är rätt verktyg

- Projektet kör branch-baserat arbetsflöde och PR skapas per feature/slice.
- Granskning av externa bidrag (forks, community PRs).
- Formell review-gate innan merge till skyddad branch.

## Typiskt flöde

1. Skapa PR från feature-branch till main (via `gh pr create` eller GitHub UI).
2. Kör `/review` (terminal) eller följ denna kropp (chat-only) på öppen PR.
3. Svara på kommentarer och korrigera vid behov.
4. Merga när reviewer godkänt.

## Chat-only-körning

Utan Claude Code-harness: klistra in PR-diffens innehåll och accept-kriterierna från issue:n. Granska mot: intent (gör ändringen vad issue:n säger?), korrekthet (logiska fel, kantfall), konsekvens (namngivning, konventioner), testäckning (täcks det som ändrats?). Returnera kategoriserade kommentarer.

## Gräns mot code-review och security-review

`/review` är en PR-nivå-granskning av en sammansatt ändring. `/code-review` och `/security-review` är diff-nivå-granskningar per slice i R-BUILD. Kör dem inte som ersättare för varandra.
