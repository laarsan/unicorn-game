# Härdnings-checkpoint — byt till `hardened` posture

## Trigger: när ska du byta?

Byt posture från `greenfield` till `hardened` när projektet korsar tröskeln
**"har något som kan gå sönder"** — typiskt:

- Första deploybara artefakten finns, eller
- En produktionsmiljö är kopplad till projektet.

Greenfield-default är ärlig mot risken: i uppstartsskedet finns inget att förstöra
och modellen behöver svängrum. När det väl finns en breakbar produkt ska modellen
fråga innan den pushar eller tar bort.

## Vad du gör för att byta posture

1. **Kör en säkerhetsgranskning av hela kodbasen** innan du byter posture:
   - Terminal (Claude Code): `/security-review`
   - Chat-only: läs `docs/chat-only-skills/security-review.md` och följ den.

   Finns `high`- eller `critical`-sårbarheter utan mitigering: adressera dem innan du fortsätter. Posture-bytet låser ner modellens autonomi — gör det från en ren säkerhetsbas.

2. Byt profilinnehållet i `.claude/settings.json` till `.claude/settings.hardened.json` —
   men bevara `enabledPlugins` om projektet har det (t.ex. materialiserat med `-UI`).
   En rak `Copy-Item` skulle tyst radera pluginen:

   ```powershell
   $aktuell  = Get-Content .claude\settings.json -Raw | ConvertFrom-Json
   $hardened = Get-Content .claude\settings.hardened.json -Raw | ConvertFrom-Json
   if ($aktuell.PSObject.Properties['enabledPlugins']) {
       $hardened | Add-Member -NotePropertyName 'enabledPlugins' -NotePropertyValue $aktuell.enabledPlugins -Force
   }
   $json = (($hardened | ConvertTo-Json -Depth 10) -replace "`r`n", "`n") + "`n"
   [System.IO.File]::WriteAllText("$PWD\.claude\settings.json", $json, [Text.UTF8Encoding]::new($false))
   ```

3. Verifiera att fältet är rätt satt (se nedan).

4. Committa ändringen:

   ```powershell
   git add .claude/settings.json
   git commit -m "chore: switch autonomy posture to hardened"
   ```

## Vad hardened innebär i praktiken

- **Förhands-godkänt:** filläsning och test-körning (Invoke-Pester, npm/pnpm test)
  samt git-läsoperationer (status, diff, log).
- **Kräver bekräftelse:** alla skrivoperationer (Edit, Write), git-commit/push,
  filborttagning, utåtriktade operationer (gh pr create/merge, push --force).

Modellen frågar alltså mer, men det destruktiva och utåtriktade skyddas explicit.

## Hur du verifierar att bytet tog effekt

```powershell
(Get-Content .claude\settings.json | ConvertFrom-Json).autonomyPosture
# Förväntat output: hardened
```

Claude Code läser `settings.json` vid sessionsstart. Starta en ny session efter
att du bytt — innevarande session behåller gamla behörigheter tills dess.
