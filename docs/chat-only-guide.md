# Chat-only-driftguide

Denna guide förklarar hur du kör hela pipeline-mallen i en **chat-only-miljö** — VS Code med GitHub Copilot i agent-läge, inloggad med Claude-modeller (Opus/Sonnet/Haiku) — utan Claude Code-harnessen.

Du behöver inte känna till hur harnessen fungerar. Följ stegen i ordning.

---

## Mentala modellen: fyra överbryggningar

Allt som skiljer chat-only från Claude Code hanteras med fyra enkla ersättningar.
Läs tabellen en gång — den är kartan för resten av guiden.

| Claude Code-funktion | Chat-only-överbryggning |
|---|---|
| **Slash-command** (t.ex. `/to-spec`) | Säg till agenten: *"Läs `.claude/skills/to-spec/SKILL.md` och följ den."* Agenten läser filen direkt i workspacet. |
| **`/clear` mellan faser** | Starta **ny chatt** och välj rätt modell i modellväljaren. |
| **Subagent-spawning** (Agent/Task) | Agenten **antar en roll** genom att läsa `docs/agents/<roll>.md`. Rollerna körs sekventiellt, inte parallellt. |
| **`settings.json`-enforcement** | Copilot läser inte `.claude/settings.json` — **ingen automatisk enforcement**. Människan är grinden (se varning nedan). |

---

## Förutsättningar

- VS Code installerat, GitHub Copilot aktiverat med Claude-modeller.
- Git installerat. Katalogen innehåller ett materialiserat projektskelett (kört via `New-PipelineProject.ps1`).
- GitHub CLI (`gh`) installerat och inloggat om du vill använda GitHub-vägen för issue-tracker.

---

## Steg-för-steg: förspelet

### 1. Öppna projektkatalogen i VS Code

Öppna den materialiserade projektkatalogen som workspace. Alla sökvägar i guiden är relativa till workspace-roten.

### 2. Starta ny chatt — välj modell

Öppna Copilot-chatten. Välj **Opus** (bäst för tolkningsuppgifter och planering).

### 3. Invokera kickoff-prompten

KICKOFF.md i workspace-roten är startpunkten. Läs filen och ge agenten instruktionen:

> "Läs `KICKOFF.md` och följ instruktionerna i den."

Agenten avgör automatiskt vilket nästa steg är utifrån vad som finns i `seed/`:
- Finns en fil i `seed/` → den används som projektidéns ankare (Ingång-1).
- Katalogen är tom → agenten ber dig beskriva projektet inline (Ingång-2).
- Oklart läge → agenten stannar och frågar.

### 4. Invokera `to-spec`

KICKOFF.md leder till `to-spec`. Agenten anropar den automatiskt om den läst KICKOFF.md korrekt. Om inte: säg

> "Läs `.claude/skills/to-spec/SKILL.md` och följ den."

Agenten intervjuar dig och skriver `docs/spec.md`.

### 5. Stäng chatten

Spec-fasen är klar. Stäng chatten (detta är din `/clear`).

---

## Steg-för-steg: första spiralvarvet — grill-fasen

### 6. Starta ny chatt — välj modell

Öppna ny chatt. Välj **Opus**.

### 7. Invokera `grill-with-docs`

> "Läs `.claude/skills/grill-with-docs/SKILL.md` och följ den med fokus på [det spår du arbetar med just nu]."

Agenten stress-testar designen mot `CONTEXT.md` och befintliga `docs/adr/`-filer, uppdaterar `CONTEXT.md` (domänspråk) och skriver ADR:er inline i samma chatt.

### 8. Avsluta grill-fasen

Grillningen är klar när ADR:n är skriven och godkänd. Stäng chatten.

---

## Generaliserad ritual — upprepa per fas

Varje efterföljande fas i master-planen (`docs/plan-to-done.md`) följer samma mönster:

1. **Ny chatt** — öppna ny chatt, välj rätt modell (Opus för design/grill, Sonnet för kodning, Haiku för mekaniska uppgifter).
2. **Peka på SKILL.md** — säg till agenten: *"Läs `.claude/skills/<skill-namn>/SKILL.md` och följ den."*
3. **Agenten kör skillen** — om skillen anropar subagenter gör agenten det sekventiellt via `docs/agents/<roll>.md`.
4. **Stäng chatten** (din `/clear`) — gå till nästa fas.

Vilken skill som är näst hittar du alltid i `docs/plan-to-done.md` under **▶ NÄSTA**.

---

## Webb-access i granskar-roller

`security-reviewer` och `debugger` är utrustade med `WebSearch` och `WebFetch` för att kunna slå upp CVE:er, biblioteksbrister och officiella felsträngar under körning (ADR 0023). De webb-utrustade rollerna förutsätter verktyg som chat-only-harnessen kanske inte tillhandahåller.

**Har agenten webb** (Claude Code i terminalen): agenten följer *Web access boundary* i agentdefinitionen — sökningar görs på publika identifierare (biblioteksnamn+version, CVE/GHSA-id, ASVS-kapitel, officiella felsträngar), aldrig på repo-innehåll.

**Chat-only utan webb-tillgång:** gör uppslaget manuellt och ange **källan** (CVE-databas, NVD, officiell biblioteksdokumentation). Mata in resultatet till agenten. Fyndet förblir *Rådgivande fynd* (se `CONTEXT.md`) tills det kopplas till en konkret kodreferens i det granskade materialet — **du är grinden**, precis som med posture-enforcement.

---

## Issue-tracker

Skillarna `to-prd`, `to-issues` och `triage` skapar och hanterar issues via det substrat projektet konfigurerades med. Två vägar finns.

**GitHub-vägen (online):** se till att `gh` är inloggat och att projektet har ett GitHub-repo. Agenten kör `gh`-kommandon i terminalen med ditt godkännande.

**Lokalt-bara vägen (offline/jobbmiljö utan GitHub):** välj det lokala markdown-substratet när GitHub-åtkomst saknas. Skillarna fungerar identiskt — de läser `docs/agents/issue-tracker.md` och anpassar sig till substratet. Skillnaden mot online: inga GitHub-repos, inga `gh`-kommandon, inga label-objekt. Triage-rollerna lever som `Status:`-vokabulär i filerna.

### `issues/`-konventionen (lokalt-bara väg)

```
issues/
  <feature-slug>/
    PRD.md            ← parent (to-prd); ingen ready-for-agent
    <NN>-<slug>.md    ← child-slice (to-issues); bär State: + Status:
```

Varje child-slice bär två ortogonala fält:

- `State: open | closed` — livscykeln. Klart = `State: closed`.
- `Status: needs-triage | ready-for-agent | ...` — triage-rollen (oförändrad vokabulär).

**Backlog-query:** `State: open` ∧ `Status: ready-for-agent`.

### Migration lokalt-bara → GitHub

Om du senare får GitHub-åtkomst: kör om `setup-matt-pocock-skills` och välj GitHub-vägen, importera sedan `issues/`-filerna manuellt med `gh issue create`. Ingen automatisk migration finns — det är ett aktivt, manuellt val.

---

## Speglade builtins

Katalogen `docs/chat-only-skills/` innehåller provider-neutrala kroppar för Claude Code builtins — officiella skills som terminalen kör direkt men som chat-only-operatörer behöver anropa manuellt.

För att köra en speglad builtin: **läs filen och följ den**, precis som med `.claude/skills/`-filerna.

| Builtin | Anropsinstruktion | Syfte |
|---|---|---|
| `verify` | *"Läs `docs/chat-only-skills/verify.md` och följ den."* | Verifiera att en ändring funkar i det körande systemet (R-BUILD steg 3) |
| `run` | *"Läs `docs/chat-only-skills/run.md` och följ den."* | Starta och observera appen/systemet för diagnostik och utforskning |
| `code-review` | *"Läs `docs/chat-only-skills/code-review.md` och följ den."* | Granska ändrad kod för buggar, säkerhetsbrister och förenklingsmöjligheter (R-BUILD härdningspunkt) |
| `security-review` | *"Läs `docs/chat-only-skills/security-review.md` och följ den."* | Säkerhetsanalys av pågående ändringar — kör innan posture-byte (se hardening-checkpoint.md) |
| `review` | *"Läs `docs/chat-only-skills/review.md` och följ den."* | PR-granskning — sammanfattar diff och lyfter blockers och nits |
| `simplify` | *"Läs `docs/chat-only-skills/simplify.md` och följ den."* | Refaktorera ändrad kod för återanvändning, förenkling och effektivitet — aldrig blocking, hoppa för docs-only-slices (R-BUILD steg 3) |
| `deep-research` | *"Läs `docs/chat-only-skills/deep-research.md` och följ den."* | Djupresearch med fan-out-sökningar, adversariell verifiering och syntetiserad rapport — spike-verktyg i DESIGN-fronten |
| `skill-creator` | *"Läs `docs/chat-only-skills/skill-creator.md` och följ den."* | Skapa eller förbättra skills för projektets verktygslåda |

---

## Varning: posture är rådgivande i chat-only — du är grinden

> **VIKTIG SÄKERHETSNOTIS**

I Claude Code enforcar `.claude/settings.json` posture-allowlisten automatiskt. I chat-only gör den filen **ingenting** — Copilot läser den inte.

Det innebär att du, operatören, manuellt måste granska varje terminalkommando agenten vill köra.

**Låt aldrig dessa operationer gå igenom utan att du explicit godkänt dem:**

- `git push --force` eller `git push --force-with-lease`
- History-rewrite (`git rebase -i`, `git reset --hard`, `git commit --amend` på publicerade commits)
- Mass-delete (`rm -rf`, `Remove-Item -Recurse`, `git clean -fd`)
- `DROP TABLE`, `DELETE` utan `WHERE`, eller liknande destruktiva databasoperationer

Posture (`greenfield`/`hardened`) är i chat-only **rådgivande**, inte enforcad. Ett `hardened`-projekt förlorar sin automatiska grind mot destruktiva och utåtriktade operationer.

Chat-only är fullt stött även för härdade projekt — den ärliga framingen (du är grinden) är skyddet, inte en spärr.

Se `docs/hardening-checkpoint.md` för en komplett checklista över vad som ska granskas innan destruktiva operationer tillåts.

---

## Vanliga frågor

**Q: Måste jag göra allt i en session?**
Nej. Stäng chatten när som helst. Nästa fas hittar du i `docs/plan-to-done.md` → **▶ NÄSTA**.

**Q: Vilken modell ska jag välja?**
SKILL.md-filen nämner ofta rekommenderad modell i slutet. Tumregel: Opus för design och review, Sonnet för kodning, Haiku för snabba mekaniska uppgifter.

**Q: Agenten verkar inte följa skillen korrekt.**
Börja om med ny chatt och referera filen explicit: *"Läs `.claude/skills/<skill>/SKILL.md` noggrant och följ den punkt för punkt."*
