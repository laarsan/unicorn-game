---
speglar-builtin: run
synkad-fran-cli-version: "2.1.198"
synkad-datum: 2026-07-01
karna: "Claude Code builtin /run"
---

# Run — starta och driva appen

Starta projektets app i rätt läge och håll den igång tillräckligt länge för att verifiera beteende eller demonstrera funktionen.

## Steg

### 1. Sök efter projekt-specifik override

Kontrollera om projektet har egna körningsinstruktioner i `.claude/skills/run/SKILL.md`. Om filen finns: läs och följ den i stället för resten av denna guide.

### 2. Detektera projekttyp

Läs `CLAUDE.md` och `docs/spec.md` (om den finns) för att förstå vad projektet är. Vanliga typer:

| Typ | Tecken | Körkommando |
|---|---|---|
| PowerShell-skript | `.ps1`-filer i rot eller `src/` | `pwsh -File <skript>.ps1` |
| Python CLI / server | `main.py`, `app.py`, `requirements.txt` | `python main.py` eller `uvicorn app:app` |
| Node.js server | `package.json` med `start`-script | `npm start` |
| Node.js CLI | `package.json` med `bin`-fält | `node bin/<namn>` |
| Statisk webbsida | `index.html` i rot | öppna i webbläsare eller `npx serve .` |

### 3. Starta appen

Kör lämpligt kommando i projektets rotkatalog. Bekräfta att appen startat:
- Läs terminalutdata för startmeddelande eller prompt.
- Anropa appen med ett enkelt testinput om det är en CLI.
- Besök `localhost:<port>` om det är en server.

### 4. Rapportera körresultatet

Meddela:
- Vilket kommando kördes
- Observerad startutdata (de första relevanta raderna)
- Eventuella fel eller varningar vid start

## Vanliga problem

- **Saknade beroenden:** kör `npm install`, `pip install -r requirements.txt`, eller motsvarande installationskommando om appen klagar på saknade moduler.
- **Fel PowerShell-version:** kontrollera att `pwsh` (PowerShell 7) används, inte `powershell` (Windows PowerShell 5).
- **Portkonflikter:** om serverporten är upptagen, stoppa befintlig process eller ange en alternativ port via miljövariabel.
