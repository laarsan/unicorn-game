---
speglar-builtin: code-review
synkad-fran-cli-version: "2.1.198"
synkad-datum: 2026-07-02
karna: "Claude Code builtin /code-review"
---

# Code-review — granska kod för korrekthet och kvalitet

Granskar nuvarande diff efter korrekthetsbuggar och kvalitetsrensningar
(återanvändning, förenkling, effektivitet) och returnerar kategoriserade fynd.
Används för att fånga buggar, kontraktsbrott och kvalitetsproblem innan commit.

## Flaggor

| Flagga | Effekt |
|---|---|
| (ingen) | Analyserar diff, returnerar fynd i konsoloutput |
| `--comment` | Postas som inline PR-kommentarer på öppen PR |
| `--fix` | Applicerar fyndens föreslagna korrigeringar direkt i worktree |
| `--effort low` / `medium` | Färre fynd med hög konfidensströskel; `medium` är default |
| `--effort high` / `xhigh` / `max` | Stigande täckningsbredd; kan inkludera fynd med lägre konfidensgrad |
| `ultra` | Djup flermanns-cloud-review av branchen, eller av en PR: `/code-review ultra <PR#>` |

## Fyndens form

Varje fynd ankras till fil + radnummer och bär en ensats-sammanfattning av
defekten plus ett **konkret felscenario** — vilka indata eller vilket tillstånd
som ger fel utfall. Fynd rapporteras sorterade mest-allvarlig först. Vid
granskningar med verifieringspass märks fynd som bekräftade (`CONFIRMED`)
eller troliga (`PLAUSIBLE`).

## Inklusionslista — när code-review ska köras

Kör code-review när slicen kan introducera ett funktionsfel, ett kontraktsbrott
eller en sårbarhet:

- Kontrollflöde, tillståndshantering, beräkningar
- Datamodell eller API-kontrakt
- Autentisering, behörighet, externa anrop (HTTP/RPC), fil-I/O
- Mer än 20 rader beteendepåverkande kod

**Hoppa** code-review för: dokumentations-only-slices (rena `.md`-filer),
konfigurationsfiler utan beteendeeffekt, rena testfiler.

## Fynd-kategorier

- **blocking** — måste adresseras innan commit. Stoppa och rapportera; fortsätt inte.
- **nit** — icke-blockerande förbättringsförslag. Registreras och loggas, men stoppar inte körningen.

## Nit-lins: ADR-referensblock i kod

Inline-kommentarer som refererar ADR-nummer (t.ex. `# ADR 0007`), issue-nummer
(t.ex. `# #42`) eller task-namn flaggas som **nit** med förslag om borttagning.

Designhistorik hör hemma i commit-meddelanden och issue-kroppar — inte som
inline-kommentar som kan bli inaktuell när ADR:n revideras. Denna lins är
aldrig blocking.

## Typiska användningsmönster

### I R-BUILD (automatiserad loop)
I pipeline-körning spawnas `reviewer.md`-agenten i stället för `/code-review` —
agentens strukturerade JSON-retur (`blocking`/`nit`) är direkt maskinagerbar av
`plan-next`. Finns `blocking`-fynd: stoppa och rapportera, committa inte. Finns
bara `nit`-fynd: logga och fortsätt.

### Manuell djupgranskning
Kör `/code-review` (terminal) eller följ denna kropp (chat-only) vid:
- Manuell slice-granskning utanför automatiserad loop
- PR-granskning med `--comment` för inline-feedback på GitHub

### Gräns mot angränsande steg
Ordning i R-BUILD: testsvit → code-review (om inklusionslistan träffar) →
security-review (om säkerhetsyta) → verify → commit.

`/simplify` överlappar kvalitetskategorierna men letar inte buggar och
applicerar sina fixar direkt; code-review hittar och rapporterar, och
applicerar endast med `--fix`.

## Chat-only-körning

Utan Claude Code-harness: klistra in diff i konversationen och ange vilka
linser som ska tillämpas (korrekthet + reuse/förenkling/effektivitet).
Kontrollera inklusionslistan ovan och rapportera fynd kategoriserade som
`blocking` eller `nit`, sorterade mest-allvarlig först, med fil, rad och
konkret felscenario per fynd.
