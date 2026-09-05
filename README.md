# Regnbågsgaloppen 🦄🌈

Ett enhörningsspel för barn som ska lära sig tangentbord och mus. 25 banor,
en animerad enhörning, regnbågar, glitter, fyrverkerier, flygande enhörningar
i himlen och spindelvänner som hejar vid mål.
All grafik och allt ljud genereras av koden – inga nedladdade tillgångar.

## Starta spelet

1. Se till att [Node.js](https://nodejs.org) (version 18 eller nyare) är installerat.
2. Dubbelklicka på **`Starta-spelet.cmd`**.

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
| Extra liv | Spring på hjärtat 💖 | |
| Starta / Nästa bana | `Enter` | Klick på knappen |
| Paus | `Esc` | Klick på ⏸ |
| Ljud av/på | `M` | Klick på 🔊 |

Handkontroll (Xbox-typ) fungerar också: vänster spak/styrkors, `A` hoppa, `B` ducka.

## Banor

25 banor i fem världar (äng, moln, godis, natt, stad) som återkommer med nya
färger och namn. De fem första lär ut en sak i taget:

1. **Regnbågsängen** – lär hopp och filbyte.
2. **Molnriket** – bubblor som poppas med musen, och det första hjärtat.
3. **Godislandet** – ducka under regnbågsbågar.
4. **Stjärnnatten** – kristaller högt i luften.
5. **Spindelstaden** – sura moln som kräver filbyte, spindelvännerna svingar sig i bakgrunden och ropar "hej!".

Svårighetskurva: bana 1–15 håller samma lugna tempo, bana 16–24 blir lite
snabbare för varje bana och bana 25 (**Enhörningsslottet**) går fortast.
Bubblorna är dubbelt så stora på bana 1–15 och krymper sedan till 125 % på
bana 25. Kurvan ligger i `public/js/levels.js`.

Tre låtar turas om mellan banorna: *Regnbågsgaloppen* (4/4), *Hovarnas dans*
(galopprytm) och *Regnbågsvalsen* (3/4). Varje värld spelar dem i sin egen
tonart och sitt eget tempo.

Fem hjärtan per bana. Ett hjärta 💖 på banan ger ett extra liv (upp till sju).
Tar hjärtana slut börjar banan om, men poängen från tidigare banor behålls.
Vid mål dansar enhörningen medan fyrverkerierna går och publiken hoppar.
Målkortet ger 1–3 stjärnor efter hur stor del av banans stjärnor som togs:
minst hälften ger tre, minst en femtedel ger två (`STAR_RATING` i
`public/js/config.js`).
Topplistan (`data/scores.json`) uppdateras efter varje klarad bana: en rad per
spelare med bästa poäng och hur långt den omgången kom (`bana 7`, eller
`🏆 alla 25`). Den finns kvar mellan spelomgångar.

## Flera spelare

Varje namn har sin egen sparade bana. Skriv ditt namn (stor eller liten
bokstav spelar ingen roll) så visas **Fortsätt på bana N** om du spelat förut.
**Ny spelare** tömmer namnrutan för nästa barn, och chipsen under rutan byter
tillbaka med ett klick. `Enter` i namnrutan fortsätter där du var.

Vill du börja om helt (tom topplista, inga sparade spelare): töm
`data/scores.json` till `[]` och ta bort `temp/browser-profile`.

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
| `world.js` | Himmel, väg, moln, flygande enhörningar, dekorationer per tema |
| `entities.js` | Stjärnor, kristaller, bubblor, hinder |
| `friends.js` | Målport, publiken och spindelvännerna |
| `effects.js` | Glitter, konfetti |
| `audio.js` | Ljudsyntes och musiksekvenser |
| `ui.js` | Menyer och HUD (DOM) |
| `input.js` | Tangentbord, mus, handkontroll |
| `scores.js` | Topplista (server + localStorage) och sparad progress per spelare |
| `scoreboard.js` | Topplistans regler (en rad per spelare, bästa poäng, delas med servern) och stjärnbetyget |
| `cursor.js` | Enhörningshornet som muspekare + glittersläp |

Test-hook: `window.__game.debug.autoplay = true` låter en enkel bot spela banan.

## Licens

Spelkoden: MIT. `public/vendor/three.module.js` är Three.js (MIT).
