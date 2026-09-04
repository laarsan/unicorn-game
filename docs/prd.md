# PRD — Regnbågsgaloppen MVP

**Status:** beslutad 2026-09-05 · **Posture:** greenfield, full autonomi · **Spec:** `docs/spec.md`

## Problem

En 7-åring utan datorvana ska lockas in i PC-världen. Befintliga spel är antingen för svåra, kräver konton/butiker eller lär inte ut tangentbord + mus systematiskt.

## Lösning

En lane-runner i webbläsaren med en animerad enhörning, fem avslutade banor, egenproducerad grafik och syntetiserat ljud, startad via `Starta-spelet.cmd`. Styrning som successivt introducerar A/D, pilar, W/↑/mellanslag, S/↓ och musklick.

## Teknikval (ADR-lite)

| Beslut | Val | Skäl |
|---|---|---|
| Motor | Three.js (vendored r170) i vanilla ES-modules | Ingen installation, procedurell grafik i kod, `renderer.xr` ger WebXR till Quest 3 utan butik. Godot/Unity kräver install + Android-toolchain + sideload för VR. |
| Ljud | Web Audio API, syntes | "Skapa allt ljud" utan filer; deterministiskt, litet. |
| Server | Node 24 `http`/`https`, inga npm-beroenden | Statiska filer + `/api/scores` + `/api/quit`; HTTPS-läge för Quest. |
| Persistens | `data/scores.json` + localStorage-fallback | Överlever webbläsardata-rensning; delas mellan PC och Quest. |
| Start | `Starta-spelet.cmd` → node + Edge `--app` helskärm | Edge finns på alla Windows 11. Känns som ett riktigt program. |
| Test | Playwright-cli screenshots + `node:test` för server | Visuell verifiering av grafik utan människa. |

## Leverabler

- `Starta-spelet.cmd`, `server.js`, `public/` (index.html, css, js-moduler), `data/scores.json`
- Fem banor definierade som data (`public/js/levels.js`)
- README med start-, styrnings- och VR-instruktioner

## Utanför MVP

VR-läge (issue skapas men görs efter MVP), gamepad-stöd på PC, fler banor, val av enhörningsfärg.

## Risker

- WebGL-prestanda på okänd PC: håll polygonantal lågt, inga skuggkartor på låg nivå. (medel)
- `window.close()` blockeras: fallback-text + servern avslutas ändå. (låg)
- Motion sickness i VR: fast kamera, ingen rotation. (medel, iteration 2)
