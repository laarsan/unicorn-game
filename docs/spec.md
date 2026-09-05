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
| Godisbit (bara i flygläget) | +15 |
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
- Efter sista banan: slutskärm "Du klarade hela äventyret!", topplista (topp 10), **Spela igen** och **Avsluta**. Namnet är det som skrevs i menyn.

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
- En rad per spelare (namn matchas skiftlägesokänsligt): bästa poäng och hur många banor den omgången klarat. Raden uppdateras efter **varje** klarad bana, så den som slutar efter bana 3 syns också (provspelning 5). En ny omgång från bana 1 ersätter raden först när den slår den gamla poängen.

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

## Provspelning 4 (2026-09-05) — åtgärdat

| Observation | Åtgärd | Verifiering |
|---|---|---|
| Spindelvännernas röster lät som trasiga robotar | `voice()` omskriven som parallell formantsyntes av ett svenskt "hej!": sågtand med glottal lågpasslutning genom tre bandpassformanter (E → J, barnstämband ×1,18–1,35), andningsbrus genom samma formanter så H:et blir en viskad vokal, alla tonhöjds- och formantändringar är ramper (inga steg), slumpmässig tonhöjdsdrift (jitter ±1,5 %) plus vibrato som tonas in på vokalen. Kurvan stiger (×0,9 → ×1,3) med litet släpp i slutet. Varje rop varieras i tonhöjd (±5 %) och längd (±10 %), var tredje blir "hej hej!" | offline-rendering med tonhöjdsspårning: flicka 356 → 383 → 445 → 441 Hz, pojkar 258 → 288 → 332 och 222 → 242 → 286; H-puffen hörs (rms 0,022 mot vokal 0,07–0,12); topp 0,21–0,30; max sample-hopp 0,05 (inga klick); bot bana 5: 9 rop utan träffar |
| Bara en låt | Tre låtar i `SONGS` (audio.js): *Regnbågsgaloppen* (originalet, 4/4), *Hovarnas dans* (galopprytm lång-kort-kort, 4/4) och *Regnbågsvalsen* (3/4, oom-pah-pah). Varje låt har egen melodi, basgång, trumpattern och takt; banorna roterar låt (bana 1 → A, 2 → B, 3 → C, 4 → A …) via `musicSong` i levels.js | `tests/audio.test.mjs` (gridkonsistens, olika melodier), `tests/levels.test.mjs` (rotation, alla tre används); offline-rendering visar rytmformerna; Playwright: bana 1–4 spelar A, B, C, A utan konsolfel |

## Provspelning 5 (2026-09-05) — åtgärdat

| Observation | Åtgärd | Verifiering |
|---|---|---|
| Topplistan visade bara den som klarat alla 25 banor | Poängen registreras efter varje klarad bana: en rad per spelare med bästa poäng och klarad bana (`bana 7`, `🏆 alla 25`). Logiken ligger i `public/js/scoreboard.js` och delas av servern (`data/scores.json`) och localStorage-fallbacken. Namnfältet på slutskärmen är borttaget (namnet skrivs redan i menyn); knappen heter **Se topplistan** | `tests/scoreboard.test.mjs`, `tests/server.test.mjs`; Playwright (`temp/pw-scores.js`): Zelda 3 banor → 1 rad, Lars 2 banor → 2 rader, Zelda om från bana 1 behåller "bana 3", Lars klarar bana 25 → "🏆 alla 25" markerad; skärmdumpar meny + slutlista |
| Rensa historik | `data/scores.json` = `[]`, lagringsnamnrymd v2 → v3 (v2-nycklarna tas bort vid start), Edge-profilens localStorage tömd | menyn visar "Ingen har spelat än", inga spelar-chips, tomt namnfält |


## Provspelning 6 (2026-09-05) — åtgärdat

| Observation | Åtgärd | Verifiering |
|---|---|---|
| För svårt att få 2 och 3 stjärnor på målkortet | Gränserna sänkta från 80 % / 45 % av banans stjärnor till 50 % / 20 % (`STAR_RATING` i config.js, `starRating()` i scoreboard.js). En bana utan stjärnor ger alltid tre | `tests/scoreboard.test.mjs`; Playwright (`temp/pw-stars.js`): 46/91 → 3 stjärnor, 19/91 → 2, 10/91 → 1 |
| Flygande enhörningar i himlen | Fem bevingade enhörningar (kropp, horn, regnbågsman och -svans, indragna ben, tre-fjädriga vingar som flaxar) korsar himlen i bakgrunden på höjd 7–16, 60–130 enheter bort, i olika riktning, fart och storlek; guppar och lutar sig lätt, dyker upp igen från motsatt sida | Playwright (`temp/pw-sky.js`): 3–4 av 5 inom kamerans bild i meny, bana 1 och natt; skärmdumpar `shot-sky-level1.png`, `shot-sky-closeup.png` |
| Rensa historik | `data/scores.json` = `[]`, Edge-profilens localStorage tömd (namnrymd v3 oförändrad) | menyn visar "Ingen har spelat än" |


## Provspelning 7 (2026-09-05) — åtgärdat

| Observation | Åtgärd | Verifiering |
|---|---|---|
| Stjärnbetyget fortfarande lite för hårt | Gränserna sänkta från 50 % / 20 % till 35 % / 12 % (`STAR_RATING` i config.js) | `tests/scoreboard.test.mjs`; Playwright (`temp/pw-stars.js`): 34/68 → 3 stjärnor, 14/68 → 2, 7/68 → 1 |
| Nytt spelsätt: flyga i stället för att springa | Menyn har två knappar, **🌈 Galoppera på regnbågen** / **☁️ Flyga i himlen**; valet sparas i `settings.mode`. I flygläget får enhörningen tre-fjädriga vingar som flaxar (snabbare vid stigning), `W`/`↑` stiger och `S`/`↓` sjunker (hålls inne, `FLIGHT.climbSpeed`), höjd 0,6–5,4; hoppa/ducka är avstängda. Banan genereras av `generateFlightCourse()` i levels.js: bara samlarobjekt (stjärnbågar, stjärnvågor, godisspår, godisringar runt en kristall, kristallmoln, bubblor, hjärta) på höjder 1–5, inga hinder. Nytt objekt **godisbit** (+15, randig kula med vridna omslagsändar, eget plink-ljud). Alla objekt inom 2 enheter i sidled, 2,4 i höjd och 5,5 framåt dras in mot enhörningen (`FLIGHT.attract`, `pullEntity()` i game.js) – ingen krock behövs. Vid mål glider hon ner och dansar med vingarna ute | `tests/levels.test.mjs` (bara samlarobjekt, nåbar höjd, godis och hjärta på varje bana, determinism); Playwright (`temp/pw-fly.js`): bana 1 flugen av botten utan skott: 12 indragningar före 15 %, 0 träffar, vingar synliga, HUD-mätaren visas; med skott: 68/68 stjärnor, 7 hjärtan, 2675 p; galoppläget oförändrat (hinder, inga vingar, ingen mätare). Skärmdumpar `shot-fly-level1.png`, `shot-fly-finish.png`, `shot-candy.png` |
| Regnbågslaser från hornet | Var femtonde procent av banlängden (`FLIGHT.laserEvery`) laddas ett skott; mätaren nere till vänster (`#hud-laser`: horn-ikon, regnbågsstapel, `E`-tangent) pulserar gult med ✨ och texten *REDO! Tryck E* när den är full, plus ett pling och tipset första gången. `E` (bredvid W och D; ignoreras i namnrutan som alla tangenter) eller handkontrollens `X` skjuter: en bred regnbågstunnel med sju regnbågsringar som rusar framåt från hornet (`RainbowBeam` i effects.js, normal blending – additiv färg försvann mot himlen), skjutljud (sågtandssvep + regnbågsarpeggio, `laser()` i audio.js), och allt som syns framför enhörningen samlas in i en våg närmast först (40 ms mellan, `laserRippleSeconds`) med vanliga poäng, ljud och glitter. `E` med tom mätare: mjukt dunk + mätaren skakar | Playwright (`temp/pw-fly.js`): mätaren full vid 16,3 % av banan, `E` → 1 skott, 43 mål → 43 träffar, +805 p, mätaren tillbaka till 0 och "laddar…"; `E` under laddning → `denied`, inget skott; "Elsa" går att skriva i namnrutan; `E` i galoppläget gör inget. Offline-ljud (`temp/pw-audio4.js`): laser peak 0,17, ready 0,09, empty 0,05. Skärmdumpar `shot-fly-ready.png`, `shot-beam-1.png`, `shot-beam-2.png` |
| Topplista och spelsätt | Poängraden får `mode` ('run'/'fly', servern sanerar); flugna omgångar visas med ☁️ före banan. Progress är gemensam | `tests/server.test.mjs`, `tests/scoreboard.test.mjs`; `temp/pw-scores.js` (☁️ på raderna) |
| Menykortet högre än fönstret klippte titeln | `.card { margin: auto }` – ett kort som är högre än fönstret rullar i stället för att tappa toppen | mätt: kort 995 px vid 900 px viewport |
| Rensa historik | `data/scores.json` = `[]`, Edge-profilens localStorage tömd | menyn visar "Ingen har spelat än" |

## Provspelning 8 (2026-09-05) — åtgärdat

| Observation | Åtgärd | Verifiering |
|---|---|---|
| Lasern tog allt som syntes – ingenting kvar att flyga mot | Räckvidden halverad: skottet träffar bara det som är inom 70 enheter framför hornet (`FLIGHT.laserRange`, spawn-avståndet är 140); strålen ritas exakt så långt | Playwright (`temp/pw-fly.js`): 43 mål framför, 22 inom räckvidd → 22 träffar, 21 bortom kvar; banan ändå 68/68 stjärnor med magnet + sex skott |
| Laserkonen syntes för lite | Konen 50 % vidare: radien växer 0,45 per längdenhet i stället för 0,3 (`FLIGHT.laserSpread`); ringarnas fart och avstånd halverade så de fortfarande når strålens slut när den tonar | Skärmdumpar `shot-fly-laser.png`, `shot-vr-laser.png` |
| Porten till Quest 3 var halvfärdig: flygläget gick inte att styra, ingen HUD, bara den gula knappen i menyerna | `vr.js` omskriven: A/X hoppar (galopp) eller stiger (flyg, håll inne), B/Y/grepp duckar eller sjunker, tumspak ▲▼ gör detsamma, ◀▶ byter fil och i menyn spelsätt, avtryckaren skjuter lasern i flygläget och trycker den gula knappen i menyer, B/Y = "Till menyn", tumspaksklick = paus. Held-flaggor går via `input.xr` så `input.climbing`/`ducking` täcker VR. Två paneler på riggen: skylt (meny med namn, spelsätt, bästa poäng, knapphjälp; nedräkning; tips omskrivna för handkontrollerna; WOW; målkortets stjärnor; topplistans fem första rader) och HUD-remsa (hjärtan, bana, poäng, framsteg, lasermätare som blinkar när den är laddad). Båda speglar DOM:en och ritas om bara när innehållet ändras. 90 Hz begärs. PC-menyn visar VR-adressen när certifikatet finns (`/api/health`); servern överlever upptagen https-port och loggar när certifikat saknas. Certifikatet skapat med `setup/New-DevCert.ps1` | Playwright med simulerat headset (`temp/pw-vr.js`, falska XR-inputkällor via `applyInputSources`): tumspak byter spelsätt i menyn, A höjer till 5,4, B sänker till 0,6, tumspak ▲ stiger, fil −1 på ◀, avtryckare = skott när mätaren är full, tumspaksklick pausar, B på paus → meny, i galoppläget hoppar A och grepp duckar, målkortet visar ⭐⭐☆, exit släcker panelerna. Skärmdumpar `shot-vr-*.png`. Riktig Quest-provspelning återstår |
| Rensa historik | `data/scores.json` = `[]`, Edge-profilens localStorage tömd | menyn visar "Ingen har spelat än" |
