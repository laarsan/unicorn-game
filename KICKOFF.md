# KICKOFF — unicorn-game

> **Invokering (harness):** "Läs `KICKOFF.md` och följ den."
> **Invokering (chat-only):** klistra in hela denna kropp.

---

## Ingångslogik

Kontrollera `seed/`-katalogen och eventuellt inline-yttrande:

| `seed/` | Inline-yttrande | Utfall |
|---|---|---|
| Fil finns | (oavsett) | **Ingång-1** — filen är beställningens ankare. Yttrande = komplement till to-spec, inte konkurrerande projektidé. |
| Tom | Yttrande finns | **Ingång-2** — yttrandet är projektidén. |
| Tom | Inget | **Stoppa och fråga** — beskriv vad projektet ska göra. Inget gissande. |

---

## Referensmaterial

Har du bakgrundsdokument, exempelkod eller referensmaterial?
Lägg det i `referensmaterial/` — det granskas i ett senare steg, inte nu.

---

## Autonomi-posture

Projektet kör i posture **`greenfield`** — hög autonomi.
Posturen sätts av setup-skriptets `-Posture`-flagga och byts vid härdnings-checkpointen, inte nu.

---

## Repo-status

Inget GitHub-repo kopplat ännu.
`to-prd`-steget behöver **GitHub eller ett lokalt repo** för issue-trackern.
Förspelet (spec → grill → planering) är helt lokalt och kan köras nu.

---

## Nästa steg — kör to-spec

Kör **to-spec**-steget på beställningen: det intervjuar dig och producerar `docs/spec.md`.
Spec:en är förspelsfasens första artefakt och matar sedan grill och planering.

> **Intent-elicitation-disciplin:** to-spec och resten av DESIGN-fronten (grill-with-docs, to-prd, to-issues) arbetar under intent-elicitation-disciplinen. Se `docs/agents/prompt-efficiency.md`.

---

## Idempotens

**`docs/spec.md` finns redan?** Kör inte om to-spec blint.
Välj i stället:

- **(a)** Revidera spec — kör to-spec med ny input.
- **(b)** Gå vidare — läs pekaren i `docs/plan-to-done.md` och fortsätt därifrån.

Pekaren ägs av spiralen — läs den, skriv den inte här.
