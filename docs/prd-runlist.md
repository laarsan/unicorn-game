# PRD-körlista — [projektnamn]

> Fylls i via `/to-prd` + `/to-issues` när ett spår i gap-analysplanen
> nått status `designed`.

---

## Körlista

| # | PRD-issue | Slices | Status | Anmärkning |
|---|---|---|---|---|

---

## Hur körlistan används

1. När ett spår i `docs/gap-analysis-plan.md` når `designed`: kör `/to-prd`
   → publicerar parent-PRD-issue.
2. Kör `/to-issues <parent#>` → bryter PRD:n i vertical-slice-barn-issues
   (`ready-for-agent`).
3. Lägg en rad här med parent-issue-nummer och slice-status.
4. `plan-next`-skillen plockar nästa `ready-for-agent`-slice per R-BUILD-ritualen.
5. När alla slices stängda: markera spåret `done` i gap-planen + bocka raden här.
