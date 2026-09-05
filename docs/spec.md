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
5. **Spindelstaden** — sura moln (filbyte), alla element, spindelvännerna svingar sig i bakgrunden och hejar vid mål.

**Utökning efter provspelning 1 (2026-09-05):** 25 banor. Bana 1–15 håller bana 1:s tempo
(hastighet 9) medan mekanikerna introduceras och världarna varierar; bana 16–24 ökar
gradvis (+0,55/bana); bana 25 har den gamla bana 5:s hastighet (14,5). Bubblor är 2× på
bana 1–15 och krymper linjärt till 1,25× på bana 25. Hjärtan på banan ger extra liv (max 7).
Målgång: "WOW!"-text, fyrverkerier och dansande enhörning innan resultatkortet.

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

- `Starta-spelet.cmd` i repo-roten: startar `node server.js` och öppnar Edge i app-läge i helskärm mot `http://localhost:8765`.
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

1. `Starta-spelet.cmd` startar spelet i ett fönster utan ytterligare steg.
2. Fem banor kan spelas igenom i följd med tangentbord + mus.
3. Enhörningen är animerad (galopp, hopp, ducka).
4. Varje klarad bana ger konfetti + fanfar + jubel.
5. High score registreras med namn och finns kvar efter omstart av spelet.
6. **Spela igen** startar om från bana 1; **Avsluta** stänger spelet.
7. Alla ljud och all grafik är genererade av koden i repot.

## Status 2026-09-05 — MVP uppnått

| Kriterium | Status | Verifiering |
|---|---|---|
| 1. `Starta-spelet.cmd` startar spelet | klart | Edge-fönster öppnas, `logs/server_log.txt` |
| 2. Fem banor i följd med tangentbord + mus | klart | Playwright: riktiga tangenttryck, musklick på bubbla, bot-genomspelning utan träffar |
| 3. Animerad enhörning | klart | skärmdumpar galopp/hopp/ducka |
| 4. Konfetti + fanfar + jubel vid klarad bana | klart | skärmdump vid mål, fanfar i `audio.js` |
| 5. High score med namn, kvar efter omstart | klart | `data/scores.json` via servern, localStorage-fallback |
| 6. Spela igen / Avsluta | klart | knapparna testade; Avsluta stänger server + fönster |
| 7. All grafik och allt ljud genereras i kod | klart | inga tillgångsfiler i repot utöver Three.js |

Öppet: VR-läget (issue #10) är implementerat men inte provkört på en riktig Quest 3.

## Provspelning 1 (2026-09-05) — åtgärdat

| Observation | Åtgärd | Verifiering |
|---|---|---|
| Kunde inte skriva W/A/S/D i namnfältet | Tangenter går till textfältet när det har fokus | Playwright: riktiga tryck ger "Wilma Sasa dW" |
| Enhörningen "vibrerade" innan styrning | Gallopfasen ackumuleras per bildruta i stället för t × frekvens (hoppade vid hastighetsrampen) | kodgranskning, bot-körning |
| Svårigheten stegrades för snabbt | 25 banor, lugnt tempo t.o.m. bana 15, ramp 16–24, bana 25 = gamla bana 5 | `tests/levels.test.mjs` |
| Mer "WOW!" vid mål | WOW-text, fyrverkerier, dansande enhörning, 3,4 s innan kortet | skärmdumpar bana 3 och 4 |
| Större bubblor | 2× bana 1–15 → 1,25× bana 25 | test + skärmdump bana 15 |
| Extraliv | Hjärta på banan från bana 2, minst ett per bana, max 7 liv | bot fångade hjärtan (6–7 liv) |
| Rensa historik | `data/scores.json` = `[]`, nytt localStorage-namnrymd (v2) rensar gammal progress | menyn visar "Ingen har spelat än" |

## Provspelning 2 (2026-09-05) — åtgärdat

| Observation | Åtgärd | Verifiering |
|---|---|---|
| Titeln inte centrerad | Titeln är en flex-rad (centreras även när ordet är bredare än kortet) och kortets sidopadding är begränsad till 56 px | mätning: titel- och kortcentrum sammanfaller vid 1366–2560 px bredd |
| Vägens vita prickar rörde sig bortåt | Texturoffset skrollar åt andra hållet (planets +v pekar bort från kameran) | kodgranskning, skärmdumpar |
| Muspekare | Gyllene, regnbågsrandigt enhörningshorn med glitter, 96 px (3× vanlig pekare), spets = klickpunkt; glittersläp följer pekaren | `cursor.js`, renderad SVG i skärmdump |
| Bubbelljudet för tamt | Pop + "boing" + harpstigning i pentatonisk skala + glitter; varje bubbla i rad börjar ett steg högre | offline-rendering: 0,53 s, topp 0,21 |
| Mer publik vid målet | 16 figurer till i två rader per sida, några med ballonger, hoppar och vinkar | skärmdump bana 5 |
| Publikvrål i mål | `crowdRoar`: svällande brus i tre band + kör av "heeey" + visslingar + applåder, 3,3 s — *borttaget efter provspelning 3* | offline-rendering |
| Ny spelare, progress per namn | Knapp **Ny spelare**, spelar-chips, progress lagras per namn (skiftlägesokänsligt) i `regnbagsgaloppen.v2.players`; gammal progress migreras | `tests/players.test.mjs` + Playwright: Zelda 3 banor, Lars 2, "zelda" → Fortsätt på bana 4 |
| Ljud när spindelvännerna hänger | "Heey!" från vartannat gungtag när vännen är i bild; röst 1 (vit dräkt) = flicka (340 Hz), 0 och 2 = pojkar (205/150 Hz), stereopanorerat efter läge, 1,2 s spärrtid | bot bana 5: 10 rop utan träffar |

## Provspelning 3 (2026-09-05) — åtgärdat

| Observation | Åtgärd | Verifiering |
|---|---|---|
| Publikjublet vid mål lät bara som brus | `crowdRoar` borttaget (anrop och metod). Kvar vid mål: fanfar med kort applåd, fyrverkerier, dans, hoppande publik | offline-rendering: metoden finns inte; bot bana 5 når målskärmen |
| Spindelvännernas "heey" lät som trötta amöbor | `voice()` omskriven: två stavelser "he-EY" där andra stavelsen hoppar upp en kvart (×1,34) och fortsätter stiga till ×1,5 i slutet, kort H, vibrato bara på "ey", krispigt slut i stället för utfasning. Barnröster: flicka 370 Hz, pojkar 250/200 Hz (var 340/205/150) | offline-rendering med tonhöjdsspårning: flicka 371 → 496 → 531 Hz, pojkar 251 → 334 → 359 och 200 → 266 → 290; längd 0,40–0,49 s; bot bana 5: 9 rop |
| Titelns nedstapel (g, p) kapades | `.title` line-height 1,1 → 1,45: regnbågen är en bakgrund klippt till texten och målas bara inom boxen, Comic Sans behöver ≈ 1,39 em | mätning 1366 px: box 106,7 px ≥ glyfhöjd 83 px; skärmdump |
