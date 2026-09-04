# Spec — Regnbågsgaloppen (unicorn-game)

> Statisk beställning tolkad 2026-09-05. Ägare: Lars. Spelare: en 7-årig flicka utan datorvana.

## Syfte

Ett datorspel som lockar in en 7-åring i PC-världen. Spelet ska vara så charmigt att
hon *vill* lära sig tangentbord och mus: enhörningar, regnbågar, glitter och
spindelvänner (Spidey-inspirerade hjältekompisar) som hejar på.

## Vinstvillkor

- **Äventyret är klarat** när alla fem banor är klarade i följd (mållinjen nådd på bana 5).
- **En bana är klarad** när enhörningen når mållinjen med minst ett hjärta kvar.

## Poängmekanism

| Händelse | Poäng |
|---|---|
| Stjärna (samlas genom att springa på den) | +10 |
| Bubbla (poppas med **musklick**) | +25 |
| Regnbågskristall (ovanlig, ofta i luften → kräver hopp) | +50 |
| Bana klarad | +200 + 50 per hjärta kvar |
| Krock med hinder | −1 hjärta (ingen poängförlust) |

- Fem hjärtan per bana. Noll hjärtan → banan börjar om med uppmuntrande text ("Oj! Försök igen, du klarar det!"). Totalpoängen från tidigare banor behålls.
- 1,5 s osårbarhet efter en krock (blinkning) så att en 7-åring inte förlorar alla hjärtan i ett kluster.

## Grundregler / spelloop

Genre: **3D lane-runner** (Subway Surfers-typ) med **avslutade banor** i stället för oändligt löpande.

- Enhörningen galopperar automatiskt framåt på en regnbågsväg med tre filer.
- Banan är en fast sträcka; en progressbar i HUD visar hur långt det är kvar.
- Hinder: moln-troll, stenar, staket (kräver hopp), regnbågsbågar lågt (kräver ducka).
- Samlarobjekt: stjärnor (på marken och i luften), bubblor (klickas med musen), kristaller.
- Bana klarad: konfetti, fanfar, spindelvännerna jublar, 1–3 stjärnor i betyg, knappen **Nästa bana**.
- Efter bana 5: slutskärm "Du klarade hela äventyret!", inmatning av namn, high score-lista (topp 10), **Spela igen** och **Avsluta**.

## Styrning (inlärningsmål: WASD, pilar, mellanslag, mus, Enter, Esc)

| Handling | Tangent | Mus | VR (Quest 3-kontroll) |
|---|---|---|---|
| Byt fil vänster/höger | A/D, ←/→ | — | Tumspak vänster/höger |
| Hoppa | W, ↑, Mellanslag | — | A / avtryckare |
| Ducka | S, ↓ | — | B / grepp |
| Poppa bubbla | — | Vänsterklick på bubblan | Peka + avtryckare |
| Starta / Nästa / Bekräfta | Enter, Mellanslag | Klick på knapp | Peka + avtryckare |
| Paus | Esc | Klick på paus-ikon | Meny-knapp |

Styrningstips visas i spelet på svenska med stora ikoner (t.ex. "Tryck ↑ eller MELLANSLAG för att hoppa!") första gången varje handling behövs.

## Banor (minst fem, olika teman)

1. **Regnbågsängen** — kort, långsam, bara stjärnor och ett par hinder. Lär hopp och filbyte.
2. **Molnriket** — bubblor introduceras (musklick). Fler hopphinder.
3. **Godislandet** — ducka introduceras (regnbågsbågar). Snabbare.
4. **Stjärnnatten** — kristaller i luften, mörkare himmel med lysande stjärnor, blandade hinder.
5. **Spindelstaden** — snabbast, alla element, spindelvännerna svingar sig i bakgrunden och hejar vid mål.

## Grafik

- Egenproducerad, procedurell 3D i Three.js: gullig enhörning byggd av primitiv (rundad kropp, stort huvud, stora ögon, glittrande horn, regnbågsman och svans), **animerad** galopp (benrörelse, gupp, mansvaj), hoppanimation, duck-animation, skadeblink.
- Pastellpalett, regnbågsväg, mjuka moln, partikelglitter bakom enhörningen.
- Spindelvännerna: tre små stiliserade hjältar i rött/blått, vitt/rosa, svart/rött.

## Ljud

- Allt ljud syntetiseras i Web Audio API (inga externa filer): hoppljud, plingljud vid stjärna, bubbelpopp, kristallklang, ledsen ton vid krock, glad bakgrundsmelodi (loop), fanfar + applåder vid klarad bana, stor fanfar vid klarat äventyr.
- Ljud startar först efter användarens första klick/tangenttryck (webbläsarkrav).

## High score

- Topp 10, sparas mellan spel i `data/scores.json` via den lokala servern. Fallback till `localStorage` om servern inte svarar.
- Registreras efter klarat äventyr (eller när spelaren ger upp på slutskärm — nej: endast efter klarat äventyr eller efter game over-bekräftelse "Sluta spela" → poängen registreras ändå så att inget arbete går förlorat).

## Start och avslut

- `start.cmd` i repo-roten: startar `node server.js` och öppnar Edge i app-läge i helskärm mot `http://localhost:8765`.
- **Avsluta**-knappen: anropar `POST /api/quit` → servern stängs → fönstret stängs (`window.close()` + tydlig text "Du kan stänga fönstret nu" som fallback).
- Ingen installation utöver Node (finns).

## VR (bonus, iteration 2)

- WebXR via Three.js `renderer.xr`. Tredjepersonskamera bakom enhörningen, fast höjd, ingen kamerarotation från spelet (komfort).
- Quest 3: öppna `https://<PC-IP>:8443` i Quest-webbläsaren (självsignerat cert, acceptera varning). Ingen publicering, inget godkännande.
- Plan B: Virtual Desktop mot PC-fönstret.

## Icke-mål

- Ingen online-multiplayer, inga konton, ingen telefonapp.
- Inga nedladdade tillgångar (grafik/ljud) — allt genereras i kod.

## Acceptanskriterier (MVP)

1. `start.cmd` startar spelet i ett fönster utan ytterligare steg.
2. Fem banor kan spelas igenom i följd med tangentbord + mus.
3. Enhörningen är animerad (galopp, hopp, ducka).
4. Varje klarad bana ger konfetti + fanfar + jubel.
5. High score registreras med namn och finns kvar efter omstart av spelet.
6. **Spela igen** startar om från bana 1; **Avsluta** stänger spelet.
7. Alla ljud och all grafik är genererade av koden i repot.
