---
speglar-builtin: skill-creator
synkad-fran-cli-version: "2.1.198"
synkad-datum: 2026-07-02
karna: "Claude Code builtin /skill-creator"
---

# Skill-creator — skapa och förbättra skills

Skapar en ny skill från en idé eller förbättrar en befintlig skills kropp,
trigger-accuracy och eval-täckning genom en iterativ loop: utkast → testkörning →
mänsklig granskning → förbättring → upprepa. I Claude Code körs testfallen som
parallella subagenter med baseline-jämförelse och kvantitativ benchmark; i
chat-only körs loopen manuellt i konversationen.

> **Windows-begränsning:** Trigger-eval-skripten (`run_eval`/`run_loop`) är
> **Unix-only** — de förutsätter `claude.cmd`-shimen, `select`-på-pipe och
> API-nyckel på ett sätt som inte fungerar på Windows. Skapande, förbättring
> och manuell trigger-testning fungerar fullt ut på alla OS.

## En skills anatomi

En skill är en **katalog**, inte en ensam fil:

```
skill-namn/
├── SKILL.md            (obligatorisk)
│   ├── YAML-frontmatter — name + description (båda obligatoriska)
│   └── Markdown-instruktioner (kroppen)
└── Medföljande resurser (valfria)
    ├── scripts/        — körbar kod för deterministiska/repetitiva moment
    ├── references/     — dokumentation som läses in vid behov
    └── assets/         — filer som används i output (mallar, ikoner)
```

**Progressive disclosure** — tre laddningsnivåer: (1) metadata (name +
description) ligger alltid i kontext, (2) SKILL.md-kroppen läses in när skillen
triggar (<500 rader som riktmärke), (3) resurser läses endast vid behov.
Närmar sig kroppen 500 rader: lägg till en hierarkinivå med tydliga pekare.

## Skapa en ny skill (create)

1. **Fånga intentionen** — vad ska skillen göra, vilka fraser/kontexter ska
   trigga den, vilket outputformat förväntas? Om konversationen redan
   innehåller arbetsflödet ("gör en skill av det här"): extrahera stegen,
   verktygen och korrigeringarna ur historiken först, bekräfta med användaren.
2. **Intervjua** — fråga proaktivt om kantfall, in-/outputformat, exempelfiler,
   framgångskriterier och beroenden innan utkastet skrivs.
3. **Skriv SKILL.md** — `description` är den primära trigger-mekanismen: både
   vad skillen gör OCH när den ska användas, allt "när"-innehåll dit (inte i
   kroppen). Claude tenderar att **undertrigga** skills — gör beskrivningen
   något "pushig" med explicita trigger-fraser och närliggande formuleringar.
4. **Skrivstil** — imperativ form; förklara *varför* i stället för hårda
   VERSAL-MUST (versala ALWAYS/NEVER är en gul flagga — omformulera med skäl);
   generalisera i stället för att överanpassa till enskilda exempel.
5. **Testfall** — 2–3 realistiska testprompts (sådant en riktig användare
   faktiskt skriver), stäm av med användaren, spara i `evals/evals.json`.

## Iterationsloopen (Claude Code-harness)

1. **Kör testfallen** — för varje testprompt spawnas två subagenter i samma
   tur: en med skillen, en baseline (utan skill vid nyskapande; gamla versionen
   vid förbättring — snapshotta skillen före redigering). Resultat organiseras
   i `<skill-namn>-workspace/iteration-<N>/eval-<id>/`.
2. **Under körningen** — utkasta kvantitativa assertions per testfall
   (objektivt verifierbara; subjektiva skills utvärderas kvalitativt i stället).
3. **Gradera och aggregera** — gradera varje körning mot assertions, aggregera
   till benchmark (pass rate, tid, tokens; medel ± stddev och delta).
4. **Eval-viewer** — generera granskningsvyn med `eval-viewer/generate_review.py`
   (aldrig egen HTML) så användaren kan klicka igenom output och lämna feedback.
5. **Läs feedback och förbättra** — generalisera från feedbacken (skillen ska
   funka på miljontals prompts, inte bara testfallen), håll kroppen mager,
   bundla skript som subagenterna återuppfann i varje körning.
6. **Upprepa** tills användaren är nöjd, feedbacken är tom eller förbättringen
   planar ut.

## Förbättra en befintlig skill (improve)

Samma loop, men börja i eval/iterera-delen: identifiera om problemet är
trigger-accuracy (aktiveras fel) eller kropp-kvalitet (aktiveras rätt, fel
leverans). Baseline är den gamla versionen. Vid trigger-problem: justera
description; vid kroppsproblem: läs transkript (inte bara slutresultat) och ta
bort det som inte drar sin vikt.

## Description-optimering (Unix-only, skriptad)

Efter att skillen är klar: 20 trigger-queries (8–10 ska-trigga med spridda
formuleringar, 8–10 ska-inte-trigga där **nästan-träffar** är värdefullast),
granskas av användaren, körs sedan via `scripts/run_loop.py` — 60/40
train/test-split, 3 körningar per query, upp till 5 iterationer, bästa
beskrivning väljs på testscore. På Windows: gör motsvarande optimering för
hand med samma query-design och manuell trigger-kontroll.

## Chat-only-körning

Utan Claude Code-harness (builtinens egen Claude.ai-anpassning):

1. Kör testfallen **själv, ett i taget** — läs skill-utkastet och följ dess
   instruktioner mot testprompten. Hoppa baseline-körningar och kvantitativ
   benchmark (meningslösa utan oberoende subagenter).
2. Presentera resultaten inline i konversationen; be om feedback per testfall.
3. Förbättra kroppen utifrån feedbacken och kör om samma testfall.
4. Trigger-testa manuellt: 8–10 fraser som *ska* trigga, 8–10 nästan-träffar
   som *inte ska* — skriptad description-optimering kräver `claude -p` och
   hoppar över här.
