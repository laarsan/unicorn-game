---
speglar-builtin: verify
synkad-fran-cli-version: "2.1.198"
synkad-datum: 2026-07-01
karna: "Claude Code builtin /verify"
---

# Verify — bekräfta att ändringen fungerar

Bekräfta att en kodändring gör det den ska — inte bara att testsviten är grön — genom att köra projektet och observera verkligt beteende.

## Mål

En grön testsvit är ett nödvändigt men inte tillräckligt villkor. Verify-steget observerar att projektet beter sig korrekt i sin körande kontext: rätt utdata, rätt sidoeffekter, inga regressioner i gränssnittet mot angränsande ytor.

## Steg

### 1. Avgör om det finns en körbar yta

- Finns det en huvudingångspunkt (CLI-skript, server, API, GUI)? Om ja: fortsätt.
- Rör slicen enbart dokumentation, konfigurationsfiler eller rena testfiler utan runtime-yta? Hoppa i så fall över verify och anteckna det i commit-meddelandet som `(docs-only, verify skipped)`.

### 2. Starta appen

Använd projektets `run`-instruktioner (se `docs/chat-only-skills/run.md`) för att starta appen.

### 3. Kör det scenario som ändringen påverkar

- Identifiera exakt vilket beteende ändringen var tänkt att påverka (läs issue-acceptance criteria).
- Kör det scenariot manuellt eller via ett provkörningskommando.
- Observera att beteendet matchar den förväntade specen.

### 4. Kontrollera att inga regressioner uppstår

Kör minst ett angränsande scenario som ändringen inte var tänkt att påverka. Bekräfta att det beter sig som förut.

### 5. Rapportera

Dokumentera:
- Vilket scenario kördes
- Vad som observerades (konkret output, skärmavläsning, logg-utdrag)
- Godkänt / ej godkänt — och om ej, vad som avviker från förväntningen

## Vad verify inte är

- Verify ersätter inte testsviten — kör testerna via projektets testkommando i ett separat steg.
- Verify ersätter inte code review — det är ett separat steg i R-BUILD.
- Verify är inte en fullständig regressionssuite — det är en sanity-check på den ändrade ytan och närmaste grannar.
