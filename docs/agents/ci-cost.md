# CI-kostnad — GitHub Actions-minutregler

Gäller endast projekt med online-GitHub-repo (chat-only-projekt har inga Actions-körningar).
Reglerna styr **när och var** CI körs — aldrig **vad** CI validerar. Varje workflow som
läggs till eller ändras i `.github/workflows/` ska följa dem.

Officiell referens för debiteringsmultiplikatorer:
[GitHub Docs — About billing for GitHub Actions](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions).

## Invariant

**Ändra aldrig vad CI validerar — bara när och var det körs.** En optimering som gör att
en fil inte längre kontrolleras är en regression, inte en besparing.

## Regler i prioritetsordning

1. **Runner-val.** `ubuntu-latest` är default. Linux-minuter debiteras 1x, Windows 2x,
   macOS 10x. `pwsh` och Pester är cross-platform — PowerShell-jobb kräver inte Windows.
   Ett jobb som *tekniskt* kräver dyr runner (Windows-specifika moduler, macOS-byggen)
   grindas per ändrade paths med ett `changes`-jobb (`dorny/paths-filter`) **plus** en
   veckoschemalagd ogrindat körning som drift-vakt — se mönstret nedan.
2. **Ingen dubbeltriggning.** `push` + `pull_request` på samma grenar kör varje PR-commit
   två gånger. Mall: `push` begränsad till `main`, `pull_request` utan grenfilter.
3. **Concurrency per ref.** Ny push till samma ref avbryter den inaktuella körningen:

   ```yaml
   concurrency:
     group: ${{ github.workflow }}-${{ github.ref }}
     cancel-in-progress: true
   ```

4. **`paths-ignore` endast för filer CI inte validerar.** I mallens `ci.yml` finns inget
   att ignorera — encoding-grinden validerar även `.md`/`.yml`/`.txt`. Ett workflow som
   t.ex. bara bygger kod får däremot ignorera `docs/**` och `**.md`.
5. **`timeout-minutes` på alla jobb.** Default är 360 min — en hängd körning bränner
   6 timmar. Mallens jobb: 10 min. Sätt lägsta rimliga värde per jobb.
6. **Cacha beroenden.** Använd setup-actions inbyggda cache (`actions/setup-node` med
   `cache: npm`, `actions/setup-python` med `cache: pip`, etc.) så snart ett workflow
   installerar beroenden. Mallens `ci.yml` installerar inget vid grön väg — cache läggs
   till när beroenden tillkommer, inte i förväg.

## Mönster: grindat dyr-runner-jobb med drift-vakt

Ogrindad `schedule`-körning en gång i veckan fångar drift som path-grinden missar
(ändringar utanför filtret som ändå påverkar Windows-beteendet).

```yaml
on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: "17 4 * * 1"   # veckovis drift-vakt, måndag 04:17 UTC

jobs:
  changes:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    outputs:
      windows: ${{ steps.filter.outputs.windows }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            windows:
              - 'src/windows/**'
              - '**/*.psm1'

  windows-tests:
    needs: changes
    if: github.event_name == 'schedule' || needs.changes.outputs.windows == 'true'
    runs-on: windows-latest      # 2x — därav grindningen
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      # ... samma valideringssteg som annars — grinden ändrar när, inte vad
```

## Arbetssätt vid optimering

- Läs `.github/workflows/` **och** senaste körningarna (`gh run list`) innan ändring —
  optimera mot faktisk förbrukning, inte antaganden.
- Redovisa uppskattad besparing per ändring i commit- eller PR-texten.
- Committa med `ci:`-prefix.
- Verifiera efter push att nästa körning beter sig som avsett (`gh run watch`):
  rätt runner, inga dubbelkörningar, avbrutna inaktuella körningar.
