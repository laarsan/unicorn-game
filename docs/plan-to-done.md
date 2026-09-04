# Plan till färdigt [projektnamn] — total körordning

## ▶ NÄSTA: förspel — kickoff-akt → `to-spec`

> Invokering: läs `KICKOFF.md` i roten och följ den.
> `KICKOFF.md` är det interaktiva överlämningskontraktet — det kodar ingångslogiken
> och lämnar över till to-spec-steget, som producerar `docs/spec.md`.
> Spec:en matar sedan grill och planering när förspelet är klart.

---

## Ritualer

*(Fylls i när spec och grill-with-docs är klara.)*

### R-DESIGN — designritual

*(Se mallsystemets CLAUDE.md för definition.)*

### R-BUILD — byggritual

1. Plocka nästa `ready-for-agent`-issue. Implementera **test-first** (failande test → kod → grönt).
2. Kör hela testsviten. Spawna alltid `reviewer.md`-agenten (terminal: `/code-review`). Finns säkerhetsyta: spawna även `security-reviewer.md`-agenten (terminal: `/security-review`); `high`/`critical`-fynd räknas som `blocking`. **Ingen obligatorisk `test-runner`-spawn här** — orchestratorn kodade och såg testutfallet själv i huvudkontext; oberoende maskinell återverifiering krävs bara när en *annan* agent gjorde jobbet (inter-slice-drivarens Stage A→B-gräns). Omdömesdisciplinen (agera på fältet, tonblindhet med undantag för kalibrerad konfidens — `docs/agents/prompt-efficiency.md`) gäller ändå. Hantera `blocking`-fynd efter posture (`.claude/settings.json` → `autonomyPosture`; saknas fältet: behandla som `greenfield`):
   - **`greenfield`:** åtgärda fynden, kör testsviten grön igen, och spawna om reviewer-agenten — en **review→fix→re-review-loop, max 3 varv per slice**. Ett rött test räknas som `blocking` och förbrukar ett varv. Kvarstår `blocking` efter tredje varvet: stoppa och rapportera (ingen commit), eskalera till människa med de kvarvarande fynden. `nit`-fynd loggas, stoppar aldrig.
   - **`hardened`:** finns `blocking`-fynd, stoppa och rapportera direkt — fortsätt inte till commit, ingen auto-loop. Människan är grinden.
3. **Refaktorpass — simplify (hoppa över docs-only-slices):** aldrig blocking — fynd föreslås men stoppar inte körningen.
   - Terminal (Claude Code): `/simplify`
   - Chat-only: läs `docs/chat-only-skills/simplify.md` och följ den.
4. **Verifiera (villkorat — hoppa över för rena dok- eller config-slices):**
   - Terminal (Claude Code): `/verify`
   - Chat-only: läs `docs/chat-only-skills/verify.md` och följ den.
5. **Spawn-kvitto:** inget commit/stäng utan agenternas strukturerade retur i
   hand. Commit (konventionellt prefix, engelska) → push → kommentera/stäng
   issuen, där kommentaren anger reviewerns verdikt (`blocking`-antal eller
   "inga blocking") och, om security-reviewer kördes, dess verdikt likaså.
6. Upprepa 1–5 för alla slices i PRD:n (varje iteration = ett separat `/clear`-anrop; `plan-next` kör en slice åt gången).
7. När alla slices stängda: markera spåret `done` i gap-planen + bocka körlista-raden.
8. `/handoff <nästa steg>` → rekommendera `/clear`.

---

## Körordningen

*(Fylls i efter `/grill-with-docs` och `/to-prd`/`/to-issues`.)*

---

## Sanningskälla

Stängda issues + gap-planens statusöversikt (`docs/gap-analysis-plan.md`).
Pekaren ovan är bekvämlighet — lita på issues/gap-planen vid konflikt.
