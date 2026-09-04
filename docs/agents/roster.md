# Agent-roster

Mallsystemets stående specialiststyrka. Varje rad är en custom-agentdefinition
i `.claude/agents/` — kontextisolerad med strukturerad retur. Designbeslut och
medlemskapsregel: ADR 0008.

---

## Stående specialiststyrka (L1)

Sex custom-agenter. En roll upptas av en stående definition bara om
kontextekonomin motiverar det: antingen bränner den mycket kontext på bulk som
inte behöver återvända, eller är den oberoende parallelliserbar.

Inkopplingskolumnen är orphan-guardens sanningskälla (ADR 0022). Vokabulär:

- `live: <källa>` — aktivt inkopplad; anropas av den namngivna ritualen/filen.
- `pending-wire (<steg>)` — definierad men ännu inte inkopplad i en ritual; planeras i angivet steg.
- `spawn-on-demand` — latent agent; spawnas vid behov, inte via fast ritualsteg.
- ⚠️ drift-flagga — agent deklareras i en källa men saknas i en förväntad anropspunkt; kräver synkronisering.

| Agent | Fil | Modell | Privilegienivå | Syfte | Inkoppling |
|---|---|---|---|---|---|
| Test-körare | `test-runner.md` | haiku | Bash + läs | Kör hela Pester-sviten; returnerar pass/fail + failande testnamn. Bulkig och slängbar. | `live: inter-slice-driver.workflow.js Stage B (test-runner-grind)` |
| Reviewer | `reviewer.md` | opus | **Läs-bara** (ingen Edit/Write, ingen destruktiv Bash) | Granskar kod; fynd i `blocking` / `nit`. | `live: plan-next/SKILL.md, plan-to-done.md, inter-slice Stage B` |
| Säkerhetsgranskare | `security-reviewer.md` | opus | **Läs-bara + webb** (WebSearch + WebFetch, ADR 0023) | Söker säkerhetshål och sårbarheter. | `live: plan-next/SKILL.md, plan-to-done.md` |
| Dokumentation | `documentation.md` | sonnet | Edit/Write + läs | Skriver och uppdaterar dokumentation; isolerbar och parallelliserbar. | `spawn-on-demand` |
| Debugger/diagnostiker | `debugger.md` | sonnet (eskalerar opus) | **Läs-bara + webb** (WebSearch + WebFetch, ADR 0023) | Rotorsaksjakt isolerad från orchestratorns kontext; eskalerar till opus vid svåra fall. | `live: incident/SKILL.md` |
| Kodare (parallell) | `parallel-coder.md` | sonnet | Edit/Write + läs | Implementerar en oberoende slice i dedikerat git-worktree. Används **bara** vid parallella, konfliktfria slices. | `live: inter-slice-driver.workflow.js Stage A (build)` |

---

## Rollramning

Skiljelinjen mellan sanktionerad rollramning (nivå 1 beteendekontrakt, nivå 2
funktionell hållning) och avvisad identitets-/expertis-flärp (nivå 3) är
normerad i `docs/agents/prompt-efficiency.md`, sektionen "Rollramnings-norm"
(ADR 0026, H5). Rostret dupliceras inte här — det här är en pekar-rad.

---

## Beteende-eval

Det regenererbara kvittot att rostret ovan faktiskt fångar planterade defekter
och motstår adversariell skip — mekaniskt lager (`docs/agents/anti-skip-decision-
table.json` + `tests/H6-anti-skip-eval.Tests.ps1`, ci-guard) och omdömeslager
(`docs/agents/eval-fixtures/` + daterat `docs/agents/eval-<datum>.md`-scorecard,
aldrig i CI). ADR 0027, H6. Rostret dupliceras inte här — det här är en pekar-rad.

---

## Inbyggd återanvändning (L2, ad hoc)

Claude Codes inbyggda agenttyper används utan egen definition:

| Agent | Användning |
|---|---|
| **Plan** | Arkitektur- och implementationsplaner. Spawnas vid designbehov. |
| **Explore** | Filsökning och bulkläsning (>500 rader råmaterial/referensmaterial). Håller bulkoutput ur orchestratorns kontext. |

Övriga ad hoc-subagenter (`general-purpose`, skräddarsydda promptar) spawnas vid
engångsbehov — inte en del av den stående specialiststyrkan.

---

## Orchestratorns roll och huvudkontexten (medvetet ingen fil)

Roller som är orchestratorns kärnomdöme hanteras i **huvudkontexten** — ingen
agentfil. Frånvaron av `orchestrator.md`, `spec-tolkare.md`, `test-skrivare.md`
och `sekventiell-kodare.md` är ett designbeslut, inte en lucka.

| Roll | Realisering |
|---|---|
| Orchestrator | Huvudkontexten driven av `plan-next`/`runlist`. Återföds färsk per enhet via `handoff → /clear`. |
| Spec-tolkare | Huvudkontexten under `grill-with-docs` / `to-spec`. |
| Test-skrivare | Huvudkontexten; test-first är en del av BUILD-ritualen. |
| Sekventiell kodare | Huvudkontexten; sekventiell kodning kräver orchestratorns omdöme. |

Orchestratorn är en **roll, inte en långlivad agent** — en dedikerad orchestrator-fil
skulle återinföra exakt det ADR 0001 byggdes för att lösa: kontexten växer och
hamnar ofrånkomligt i `/compact`. Se ADR 0008 §2.
