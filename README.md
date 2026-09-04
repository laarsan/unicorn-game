# Regnbågsgaloppen 🦄🌈

Ett enhörningsspel för barn som ska lära sig tangentbord och mus. Fem banor,
en animerad enhörning, regnbågar, glitter och spindelvänner som hejar vid mål.
All grafik och allt ljud genereras av koden – inga nedladdade tillgångar.

## Starta spelet

1. Se till att [Node.js](https://nodejs.org) (version 18 eller nyare) är installerat.
2. Dubbelklicka på **`start.cmd`**.

Spelet öppnas i ett eget helskärmsfönster (Edge eller Chrome i app-läge).
Knappen **Avsluta** i spelet stänger både fönstret och servern.

Behöver du starta utan att ett fönster öppnas (t.ex. för VR-headsetet):

```
node server.js --no-browser
```

## Styrning

| Handling | Tangentbord | Mus |
|---|---|---|
| Byt fil | `A` / `D` eller `←` / `→` | |
| Hoppa | `W`, `↑` eller `Mellanslag` | |
| Ducka | `S` eller `↓` (håll inne) | |
| Poppa bubbla | | Vänsterklick på bubblan |
| Starta / Nästa bana | `Enter` | Klick på knappen |
| Paus | `Esc` | Klick på ⏸ |
| Ljud av/på | `M` | Klick på 🔊 |

Handkontroll (Xbox-typ) fungerar också: vänster spak/styrkors, `A` hoppa, `B` ducka.

## Banor

1. **Regnbågsängen** – lär hopp och filbyte.
2. **Molnriket** – bubblor som poppas med musen.
3. **Godislandet** – ducka under regnbågsbågar.
4. **Stjärnnatten** – kristaller högt i luften.
5. **Spindelstaden** – allt på en gång, spindelvännerna svingar sig i bakgrunden.

Fem hjärtan per bana. Tar hjärtana slut börjar banan om, men poängen från
tidigare banor behålls. Efter bana 5 sparas poängen på topplistan
(`data/scores.json`), som finns kvar mellan spelomgångar.

## VR (Meta Quest 3)

Se `docs/vr.md`. Kort: kör `setup/New-DevCert.ps1` en gång, starta spelet, öppna
`https://<datorns-IP>:8443` i Quest-webbläsaren och tryck **VR**. Ingen
publicering eller app-butik behövs.

## Utveckling

```
node --test             # enhetstester
node server.js --no-browser
```

Koden ligger i `public/js/`:

| Fil | Innehåll |
|---|---|
| `game.js` | Tillståndsmaskin, spelloop, kollisioner, kamera |
| `levels.js` | Bandata och den deterministiska bangeneratorn |
| `unicorn.js` | Enhörningen (modell + animation) |
| `world.js` | Himmel, väg, moln, dekorationer per tema |
| `entities.js` | Stjärnor, kristaller, bubblor, hinder |
| `friends.js` | Målport och spindelvännerna |
| `effects.js` | Glitter, konfetti |
| `audio.js` | Ljudsyntes och musiksekvenser |
| `ui.js` | Menyer och HUD (DOM) |
| `input.js` | Tangentbord, mus, handkontroll |
| `scores.js` | Topplista och sparad progress |

Test-hook: `window.__game.debug.autoplay = true` låter en enkel bot spela banan.

## Licens

Spelkoden: MIT. `public/vendor/three.module.js` är Three.js (MIT).
