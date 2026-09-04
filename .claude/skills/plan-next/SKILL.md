---
name: plan-next
description: Master-drivaren för projektets plan (docs/plan-to-done.md) — kör EN ritual-fas per anrop, räknar själv ut exakt position (steg → ritual-fas → slice) ur pekaren + gap-analysplanen + issue-tillståndet, kör fasen, uppdaterar pekaren, committar, gör handoff och rekommenderar /clear. Detta är standard-ingången till allt återstående projektarbete när en master-plan finns. Triggers på "kör nästa steg", "kör nästa steg i plan-to-done.md", "fortsätt master-planen", "fortsätt planen", "ta nästa fas", "continue the master plan", "run the next step" och "/plan-next". plan-next DELEGERAR själv nedåt — den anropar grill-with-docs (R-DESIGN/grill), to-prd/to-issues eller runlist (R-DESIGN/issues), och handoff — så kör dem inte separat när du driver master-planen. INTE för en fristående PRD-körlista (docs/prd-runlist.md) som "följ körlistan"/"follow the run-list" — det är runlist; INTE för att från grunden skriva en spec (to-spec) eller starta ett tomt repos config (setup-matt-pocock-skills).
argument-hint: "(valfritt) ett specifikt stegnummer i plan-to-done.md att köra i stället för nästa"
---

Driver `docs/plan-to-done.md` **en ritual-fas per anrop** — sedan stopp och
rekommendation att köra `/clear`. Poängen: varje fas körs i färsk, full kontext,
aldrig en komprimerad. Detta är master-nivån; den delegerar till `grill-with-docs`,
`to-prd`, `to-issues`, `runlist` och `handoff`.

## Varför "en fas", inte "ett steg"

Ett steg i Fas 1 (t.ex. D1) rymmer både R-DESIGN och R-BUILD och spänner över flera
`/clear`-cykler. Återupptagning blir korrekt *bara* om positionen läses ur
**issue-tillståndet och spårstatusen**, inte ur pekartexten eller minnet. Därför:
användaren skriver alltid samma fras; den här skillen räknar ut var de är.

## Process

### 0. Färskhetskontroll (innan något annat)

Om jag redan har fullständigt, osammanfattat minne av en tidigare ritual-fas-körning
**i den här konversationen** (dvs. inget `/clear` har synts sedan dess — leta efter en
faktisk `/clear`-kommandomarkör, inte bara att triggerfrasen kom igen) — **stanna och
fråga användaren** om de vill fortsätta i denna icke-färska kontext eller köra `/clear`
först. Kedja inte tyst vidare bara för att triggerfrasen ("kör nästa steg i
plan-to-done.md") upprepas; det är inte i sig bevis på en ny session. Detta gäller även
när tidigare faser avslutades korrekt (handoff skriven, pekare uppdaterad, commit
gjord) — färskhetskontrollen är oberoende av om föregående fas städade upp efter sig.

### 1. Bestäm exakt position (källa: issues + gap-plan > pekare)

Läs i denna ordning och låt de senare vinna vid konflikt:

1. `docs/plan-to-done.md` — **▶ NÄSTA-pekaren** (steg + ritual-fas) och stegets text.
   Om användaren gav ett stegnummer i argument: använd det i stället.
2. `docs/gap-analysis-plan.md` — statusöversikten för stegets spår
   (`untriaged`/`grilling`/`designed`/`on-runlist`/`done`).
3. GitHub-issues:
   `gh issue list --state all --limit 100 --json number,title,state,labels`
   — vilka av stegets PRD-slices som är öppna (`ready-for-agent`) vs stängda.

Om pekaren motsäger issues/gap-planen: **lita på issues/gap-planen**, korrigera
pekaren, och säg det i slutrapporten.

### 2. Avgör vilken ritual-fas som ska köras

Mappa stegets typ + nuvarande status till **en** fas:

**C/D/A/E-steg (design→bygg):**
- Spår `untriaged`/`grilling`, ingen ratificerad ADR/canon → **R-DESIGN/grill**:
  kör `grill-with-docs <stegets fokus>`, skriv ADR/canon inline, markera spåret
  `designed` i gap-planen. *(Inkludera engångsbeslut som hör steget till — t.ex.
  UI-skal/designsystem i D1.)*
- Spår `designed`, ingen parent-PRD-issue → **R-DESIGN/issues**:
  **Repo-aktiveringsgrind (pre-`to-prd`):** kontrollera om
  `docs/agents/issue-tracker.md` finns.
  - Finns → no-op, tracker konfigurerad. Gå vidare till delegationen nedan.
  - Saknas → surfar online/lokal-valet:
    - **Online:** fråga repo-namn (om saknas), kör C1b-kommandosekvensen inline
      (`git init` → `gh repo create` → triage-label-objekt → `push`), skriv
      tracker = GitHub i `docs/agents/issue-tracker.md`.
    - **Lokalt-bara:** kör `git init` (ingen remote), skriv tracker = local
      (`issues/`-layout per ADR 0021 beslut 3) i `docs/agents/issue-tracker.md`.
      Inga label-objekt skapas (offline: rollerna är vokabulär, inte objekt,
      per ADR 0021 beslut 5).
  Delegera sedan till `runlist` (eller kör `to-prd` + `to-issues` direkt mot
  stegets fokus); markera spåret `on-runlist`, lägg körlista-rad.
- Spår `on-runlist`, ≥1 öppen `ready-for-agent`-slice → **R-BUILD**: ta **nästa
  öppna slice** (lägst issue-nr eller dependency-först). Implementera test-first
  (failande test → kod → grönt; ingen manuell test). Review-subagent (`reviewer.md`)
  **alltid**, utan undantag — även en ren docs-only-slice (ADR 0024 §1). På
  säkerhetsyta (autentisering/behörighet, externa anrop, fil-I/O med yttre input,
  databas-queries, serialisering, opålitlig indata — ADR 0015 §3) spawna även
  `security-reviewer.md`. Hantera `blocking`-fynd efter `autonomyPosture`
  (`.claude/settings.json`; saknas fältet → `greenfield`): **`greenfield`** →
  review→fix→re-review-loop, **max 3 varv per slice** (rött test räknas som blocking
  och förbrukar ett varv; kvarstår blocking efter 3 → stoppa och eskalera, ingen
  commit); **`hardened`** → stoppa direkt vid blocking, människan är grinden.
  **Spawn-kvitto (ADR 0024 §3):** inget commit/stäng utan agenternas
  strukturerade retur i hand. Commit (konventionellt prefix, engelska, **ingen**
  AI-attribution) → push → kommentera/stäng issuen, där kommentaren anger
  reviewerns verdikt (`blocking`-antal eller "inga blocking") och, om
  security-reviewer kördes, dess verdikt likaså. En slice (eller några tätt
  sammanhängande) per anrop. Är fler öppna slices kvar: fasen är "R-BUILD
  (slice k/n)".
  **Inter-slice-advisory:** för obevakad build-out av samtliga öppna slices i ett
  greenfield-steg, se **inter-slice-drivaren** (ADR 0020) — ett opt-in
  Workflow-alternativ. En-slice-per-anrop förblir default och enda vägen i `hardened`.
  **Ingen obligatorisk test-runner-spawn i plan-next-vägen** (ADR 0025 §2): här kodar
  orchestratorn i sin egen huvudkontext och ser testutfallet med egna ögon — en separat
  haiku-spawn för att återverifiera det den just såg tillför inget oberoende. Oberoende
  maskinell återverifiering krävs bara när en *annan* agent gjorde jobbet (inter-slice-
  drivarens Stage A→B-gräns). Omdömesdisciplinen (agera på fältet, malformerad retur =
  misslyckande, tonblindhet med undantag för kalibrerad konfidens — `docs/agents/prompt-
  efficiency.md` §"Tonblindhets-norm") gäller ändå, alltid, oavsett väg.
- Spår `on-runlist`, alla slices stängda → markera spåret `done` i gap-planen +
  bocka körlista-raden. Flytta pekaren till **nästa steg** och stoppa (kör inte
  nästa stegs fas i samma anrop). **Release-advisory:** kör
  `git log $(git describe --tags --abbrev=0 2>$null)..HEAD --oneline` (om ingen
  tag: `git log --oneline`). Är outputen icke-tom: räkna commits med `feat:` och
  `fix:`-prefix och lägg till en rad i slutrapporten:
  *Ej-releasade commits sedan senaste tag: X feat, Y fix — överväg `/release`.*
  Ingen automatisk körning. Ingen blockering. Ren advisory.
  **Mirror-advisory:** kontrollera spegelkropparna i `template/docs/chat-only-skills/`.
  Läs frontmatter-fältet `synkad-fran-cli-version` ur varje `.md`-fil och jämför med
  `claude --version`. Om någon stämpel skiljer sig: räkna N laggande av 8 och lägg
  till en rad i slutrapporten (efter release-advisoryn):
  *Mirror drift: N/8 speglar laggar bakom CLI X.Y.Z — överväg `/refresh-mirrors`.*
  Ingen automatisk körning. Ingen blockering. Ren advisory.

**R-CONTENT-steg (Fas 4):** kör **ett pool/pass** per anrop (pool = 36; skriv till
fil tidigt, checkpoint vid avbrott — se CLAUDE.md). Använd `authoring-perspective`,
`canon-consistency`, A1 canon-vakt. Kör E1-rapporten efter poolen.

**Admin/gate-steg (Fas 0, Fas 3):** utför kontrollen (t.ex. content-grinden i Fas 3:
alla A done, B done, C ≥ on-runlist, D ≥ designed, E1 ≥ designed). Ingen ritual.
Är en grind ej uppfylld: rapportera vad som saknas och stoppa — hitta inte på arbete.

### 3. Uppdatera pekaren

Skriv om **▶ NÄSTA**-blocket i `docs/plan-to-done.md`: nytt stegnamn + ritual-fas +
status (t.ex. "steg 1 — D1 Prolog-UI (R-BUILD, slice 2/4)" eller "steg 2 — D3 …").

**Modellstämpel.** Slice-/fas-stämpeln bär orkestreringsmodellen och ritual-fasen
som ett fält bredvid commit-sha:n: `#84 H4c (2026-07-01, f8adcfd, orch:sonnet/R-BUILD; …)`.
Värdet är den modell **föregående handoff rekommenderade** för fasen — inte modellens
egen uppfattning om vilken den är. En modell kan inte läsa sin egen identitet
tillförlitligt (ett val kan tyst routas om till en annan modell), medan
rekommendationen är en durabel rad i föregående sessions slutrapport. Har användaren
under sessionen sagt att en annan modell faktiskt kördes: skriv
`orch:opus (rek: sonnet)/R-BUILD`. Subagenternas modeller stämplas **inte** — de är
pinnade i `.claude/agents/` och härleds ur `docs/agents/roster.md`.

Syftet är kalibrering, inte bokföring. Pekaren bär redan reviewer-varv och
blockerande fynd per slice; modellfältet är den saknade oberoende variabeln som gör
serien till underlag för frågan *"behövde fasen fler reviewer-varv på en billigare
modell?"*. Utan fältet är den frågan obesvarbar i efterhand, retroaktivt och för
alltid. Stämpeln är ett svagt kvitto — slices är olika svåra och N är litet — men ett
svagt kvitto slår noll observationer för en heuristik som ska justeras mot faktisk
erfarenhet.

### 4. Commit + push

Committa doc-/statusändringar (pekare, gap-plan, körlista) + ev. ADR/canon/research.
Konventionellt meddelande, t.ex. `docs(plan): advance to <steg> <fas>` eller den
fas-specifika ändringens prefix (`feat:`/`test:` för R-BUILD-kod). **Aldrig**
"Co-Authored-By: Claude" eller annan AI-attribution.

Regenerera statusrapporten efter committen: kör `setup/Update-StatusReport.ps1`
från projektets rot om filen finns. Finns ingen rotkopia: kontrollera
`template/setup/Update-StatusReport.ps1` istället — detta repo (mallsystemet
självt) dogfoodar generatorn från sin mallsystem-kopia enligt ADR 0012 §6;
hittas den där, kör den med repots rot som mål. En git `post-commit`-hook är
**opt-in**, inte del av kontraktet; chat-only-användare kör generatorn för
hand (ADR 0012 §4).

### 5. Handoff + rekommendera /clear

Kör `handoff`-skillen med nästa fas fokus som argument (refererar plan-to-done.md +
ev. nyskapade issues/ADR per path, duplicerar inte). Avsluta med max ett par
meningar: vad som gjordes, och **den exakta nästa prompten** — som alltid är samma:

> Kör `/clear`, sedan skriv i ny session: **`kör nästa steg i plan-to-done.md`**

Slutrapporten ska namnge **en** modell för nästa fas — aldrig ett villkor av typen
"sonnet, eskalera till opus vid motstånd". Ett villkorat råd avgörs i praktiken av
användaren (i regel genom att välja den dyrare modellen direkt) och gör
modellstämpeln i steg 3 obrukbar: två faser med samma stämpel kan ha kört olika
modeller. Fäll domen här, där evidensen om fasens svårighet är som färskast, och
skriv ut den.

## Anteckningar

- **En fas = ett anrop.** Kedja aldrig flera faser i ett anrop ens på begäran —
  det spräcker färsk-kontext-poängen. Insisterar användaren: varna att senare faser
  körs på degraderad kontext.
- **Detta skyddar inte mot upprepad triggerfras utan `/clear` mellan separata anrop**
  (samma konversation, flera "kör nästa steg"-meddelanden i rad) — det är vad
  steg 0:s färskhetskontroll bevakar. Ett dokumenterat fall: tre R-BUILD-slices
  (C3 #102–#104) kördes i rad i samma session 2026-06-17 utan att `/clear` någonsin
  skedde, eftersom varken skillen eller agenten kontrollerade det.
- **Skillnad mot `runlist`:** `runlist` driver `docs/prd-runlist.md` och stannar
  vid issue-skapande (R-DESIGN/issues). `plan-next` är master-nivån som dessutom
  driver grilling (R-DESIGN/grill), **byggande** (R-BUILD) och content (R-CONTENT),
  och delegerar till `runlist` för issues-fasen.
- **Sanningskälla för "vad är gjort":** stängda issues + gap-planens statusöversikt.
  Pekaren är bekvämlighet; vid tvivel, lita på issues/gap-planen.
- Stegens scope och beroenden bor i `docs/plan-to-done.md` — håll den som single
  source of truth; om ett steg omskopas, redigera dokumentet, hårdkoda inte här.
- Kan en delegerad skill inte slutföra (saknad label, auth-fel, rött test): stoppa
  efter den fasen, rapportera blockeraren, markera **inte** fasen klar, flytta inte
  pekaren förbi den.
