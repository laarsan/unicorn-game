---
name: incident
description: Manage a production incident end-to-end in a materialized target project's drift phase: capture incident facts, drive the debugger-agent for root-cause analysis, and write a blameless postmortem draft plus a LESSONS.md entry. Use when an incident occurs in production — "incident", "something broke in prod", "run the incident skill", "postmortem", "write a postmortem", "root cause analysis", "production issue", "outage", "service degraded", "drifthändelse", "incident i produktion", "skriv postmortem".
---

<what-to-do>

Handle a production incident for the current target project. This skill covers the full arc: capture the incident → root-cause via the debugger-agent → blameless postmortem draft + LESSONS.md entry.

**Drift phase only** (ADR 0001 §8 — after the hardening checkpoint, when there is something in production that can break). Do not use during project startup or build phases.

**No dry-run required** — this skill only writes docs (reversible via git). No destructive operation occurs.

## Step 1 — Capture incident facts

Gather the following fields from the user's message or by asking:

| Fält | Beskrivning |
|---|---|
| **Vad hände** | A short, factual description of what broke |
| **När** | Timestamp or time range (e.g. 2026-06-26 14:32 UTC) |
| **Påverkan** | Who/what was affected and how severely |
| **Allvarsgrad** | SEV1 (total outage) / SEV2 (degraded) / SEV3 (minor) |

If any field is missing, ask before continuing. Do not guess.

## Step 2 — Drive the debugger-agent

Spawn the debugger-agent (ADR 0008 #6, read-only, context-isolated) for root-cause analysis. Pass the captured incident facts as structured input.

The agent returns JSON:

```json
{
  "root_cause": "...",
  "hypotheses": ["...", "..."],
  "fix_sketch": "...",
  "escalate_to_opus": false
}
```

If `escalate_to_opus` is `true`, re-run the agent with the opus model before proceeding.

**Spawn-kvitto-invariant:** postmortemets *Rotorsak*-sektion (Steg 3) ÄR
debugger-agentens spawn-kvitto. Steg 3 får inte skrivas förrän agenten har
returnerat giltig strukturerad JSON enligt schemat ovan **med ett icke-tomt
`root_cause`-fält**. Om agenten returnerar `null`, fallerar, returnerar JSON
med tomt/saknat `root_cause`, eller svarar med ostrukturerad fritext i
stället för JSON: kör om agenten eller eskalera — fortsätt **inte** till
Steg 3. Detta gäller även efter en `escalate_to_opus`-omkörning (rad ovan):
en dålig eller tom retur från opus-omkörningen blockerar Steg 3 lika strikt
som från förstaförsöket. Självförfattad prosa i agentens ställe är inte ett
giltigt kvitto.

Weave the agent's return into the postmortem template in Step 3.

## Step 3 — Write the postmortem draft

Create `docs/postmortems/ÅÅÅÅ-MM-DD-<slug>.md` (where `<slug>` is a short kebab-case summary, e.g. `api-timeout-spike`). Use today's date.

Use this **fixed section order** — blameless tone throughout (analyse systems and processes, never assign blame to individuals):

```markdown
# Postmortem: <kort titel>

**Datum:** ÅÅÅÅ-MM-DD
**Allvarsgrad:** SEV1 / SEV2 / SEV3
**Status:** Utkast

## Sammanfattning

En mening som beskriver vad som hände, när och vilken påverkan det hade.

## Tidslinje

| Tid | Händelse |
|---|---|
| HH:MM | ... |

## Påverkan

Beskriv vem och vad som påverkades och i hur lång tid.

## Rotorsak

<debugger-agentens `root_cause` invävd>

Hypoteser som övervägdes:
- <hypotheses från agentens retur>

Fix-sketch: <agentens `fix_sketch`>

## Åtgärdspunkter

| Åtgärd | Ägare | Deadline |
|---|---|---|
| ... | ... | ... |

## Lärdomar

- ...
```

Show the draft to the user. Let them amend it before committing.

## Step 4 — Append to LESSONS.md

Add one line to `docs/postmortems/LESSONS.md`:

```
ÅÅÅÅ-MM-DD — <en-mening lärdom> → [postmortem](ÅÅÅÅ-MM-DD-<slug>.md)
```

## Step 5 — Commit (posture-gated)

Stage and commit:

```
git add docs/postmortems/
git commit -m "docs(incident): postmortem ÅÅÅÅ-MM-DD <slug>"
```

In `hardened` posture (ADR 0001 §8 — the normal drift-phase posture), push is human-gated: show the command, do not run it automatically.

In `greenfield` posture: push directly.

## Step 6 — Confirm

Report what was written:

```
Incident-hantering klar.
  ✓ Postmortem-utkast: docs/postmortems/ÅÅÅÅ-MM-DD-<slug>.md
  ✓ LESSONS.md uppdaterad
  ✓ Committat
  [Hardened] Kör `git push` när du är redo.
```

</what-to-do>
