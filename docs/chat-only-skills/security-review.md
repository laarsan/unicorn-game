---
speglar-builtin: security-review
synkad-fran-cli-version: "2.1.198"
synkad-datum: 2026-07-01
karna: "Claude Code builtin /security-review"
---

# Security-review — granska säkerhetsytor

Kör en säkerhetsorienterad granskning mot nuvarande diff eller kodbas och returnerar kategoriserade sårbarheter. Används för att fånga säkerhetsbrister per slice och vid härdningscheckpointen.

## Flaggor

| Flagga | Effekt |
|---|---|
| (ingen) | Analyserar pågående changes mot aktuell branch |
| `--comment` | Postas som inline PR-kommentarer på öppen PR |

## Triggerlista — när security-review ska köras

Kör security-review när slicen rör en säkerhetsyta:

- Autentisering eller behörighetskontroll
- Externa anrop (HTTP-klienter, RPC, webhooks)
- Fil-I/O med yttre input (filuppladdning, sökvägar från indata)
- Databas-queries (SQL, NoSQL) — riskytor: injection, plan-läckor
- Serialisering/deserialisering av opålitlig data (JSON, XML, pickle, m.m.)
- Hantering av opålitlig indata generellt

## Fynd-kategorier

- **critical** — omedelbar blockerare; får inte nå commit eller deploy.
- **high** — blockerande i R-BUILD och obligatoriskt vid härdningscheckpoint.
- **medium** — bör adresseras; icke-blockerande men loggas.
- **low** / **info** — observationsfynd; registreras och loggas.

`high`- och `critical`-fynd är blocking i R-BUILD och vid härdningscheckpoint.

## Två instanser i pipelinen

### R-BUILD (villkorlig, per slice)
Spawna `security-reviewer.md`-agenten när inklusionslistan träffar. Agentens strukturerade JSON-retur (`vulnerabilities` med severity-fält) är direkt maskinagerbar av `plan-next`. `high`/`critical`-fynd: stoppa och rapportera, committa inte.

### Härdningscheckpoint (obligatorisk, fullbredds)
Kör `/security-review` (terminal) eller följ denna kropp (chat-only) mot hela kodbasen innan posture byter till `hardened`. Ser interaktion mellan slices — komplement till löpande per-slice-granskning, inte ersättning. Se `docs/hardening-checkpoint.md` för checklistans fullständiga steg.

## Typiska användningsmönster

### Manuell körlista
1. Identifiera säkerhetsytor enligt triggerlistan ovan.
2. Klistra in relevant kod/diff i konversationen.
3. Begär granskning med fokus på listan ovan.
4. Kategorisera fynd (critical/high/medium/low/info).
5. Adressera `high`/`critical` innan commit eller posture-byte.

### Gräns mot angränsande steg
Ordning i R-BUILD: testsvit → code-review (om inklusionslistan träffar) → security-review (om säkerhetsyta) → verify → commit.
