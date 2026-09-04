---
speglar-builtin: simplify
synkad-fran-cli-version: "2.1.198"
synkad-datum: 2026-07-01
karna: "Claude Code builtin /simplify"
---

# Simplify — refaktorpass för kvalitet och enkelhet

Granskar nyligen ändrad kod och applicerar förbättringar inom fyra kategorier: återanvändning av befintliga konstruktioner, förenkling av onödig komplexitet, effektivitetsförbättringar och altitude-rensning (abstraktion på rätt nivå). Är aldrig blocking — rör inte korrekthet, det är code-reviews domän.

## Vad simplify täcker

| Kategori | Exempel |
|---|---|
| **Reuse** | Ersätt inline-logik med befintlig funktion/helper; identifiera duplicering |
| **Simplification** | Ta bort onödiga mellanvariabler, förkorta villkorskedjor, slå ihop loopar |
| **Efficiency** | Undvik upprepade beräkningar, onödiga iterationer, redundant I/O |
| **Altitude** | Flytta detaljer dit de hör (t.ex. extrahera till hjälpfunktion); höj abstraktionsnivån i anropsplatsen |

## Inklusionslista — när simplify ska köras

Kör simplify när slicen innehåller:

- Mer än 20 rader **beteendepåverkande** kod (kontrollflöde, tillståndshantering, transformation)
- Ett uppenbart mönster för återanvändning eller förenkling — t.ex. ett block som redan finns som funktion någon annanstans, ett villkorsblock med tre identiska armar

**Hoppa** simplify för:
- Docs-only-slices (rena `.md`-filer utan kodblock)
- Konfigurationsfiler utan beteendeeffekt (t.ex. `.json`-manifest, `.yml`-settings)
- Slices med enbart testfiler — tester är ofta medvetet explicita

## Blocking-policy

**Simplify är aldrig blocking.** Det är ett quality-only-pass: fynd loggas och föreslås men stoppar inte en pipeline-körning. Behandla fynd som nit-nivå — adressera dem om det är lämpligt, annars logga och fortsätt.

## Ordning i R-BUILD

Testsvit → code-review (om inklusionslistan träffar) → security-review (om säkerhetsyta) → **simplify** (om inklusionslistan träffar) → verify → commit.

## Chat-only-körning

Utan Claude Code-harness:

1. Kontrollera inklusionslistan ovan.
2. Klistra in diff eller relevant kodblock i konversationen.
3. Begär granskning inom de fyra kategorierna ovan.
4. Väg fynden mot principen "tre liknande rader är bättre än för tidig abstraktion" — gör inte om om förändringen inte klart minskar komplexiteten.
5. Applicera relevanta förenklingar och logga övriga som nit-observationer.
