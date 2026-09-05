# VR-läge (Meta Quest 3)

Spelet är byggt på WebXR, så det körs direkt i Quest-webbläsaren från din PC
över det lokala nätverket. Inget behöver publiceras, godkännas eller sidoladdas.

## Engångsförberedelse på PC:n

WebXR kräver HTTPS. Skapa ett självsignerat certifikat (skriver `cert/key.pem` och `cert/cert.pem`):

```powershell
pwsh -ExecutionPolicy Bypass -File setup\New-DevCert.ps1
```

Skriptet skriver ut vilken adress headsetet ska öppna, t.ex. `https://192.168.10.101:8443`.
Windows-brandväggen kan fråga om Node får ta emot anslutningar – svara ja för privata nätverk.

## Spela

1. Starta spelet på PC:n som vanligt (`Starta-spelet.cmd`), eller `node server.js --no-browser`.
   När certifikatet finns visar PC-menyn adressen längst ner: *🥽 VR i Quest-webbläsaren: https://…:8443*.
2. Sätt på Quest 3 (samma wifi som PC:n), öppna webbläsaren och gå till adressen.
3. Godkänn certifikatvarningen (Avancerat → Fortsätt).
4. Skriv namnet i namnrutan (Quest-tangentbordet) och välj spelsätt – det går att ändra inne i VR också.
5. Tryck på **🥽 VR** i menyn. Knappen syns bara när webbläsaren stöder immersive VR.

Topplistan är gemensam (den ligger på PC:n), men sparad bana och namn ligger i
Quest-webbläsaren för sig.

## Kontroller i VR

Båda handkontrollerna fungerar likadant.

| Handling | Quest-kontroll |
|---|---|
| Byt fil | Tumspak ◀ ▶ |
| Byt spelsätt (i menyn) | Tumspak ◀ = 🌈 galoppera, ▶ = ☁️ flyga |
| Hoppa (galopp) | A/X, eller avtryckaren när den inte pekar på en bubbla |
| Ducka (galopp) | Grepp-knappen, B/Y eller tumspak ▼ (håll inne) |
| Flyg upp (flygläge) | A/X eller tumspak ▲ (håll inne) |
| Flyg ner (flygläge) | B/Y, grepp-knappen eller tumspak ▼ (håll inne) |
| Regnbågslaser (flygläge) | Avtryckaren när mätaren lyser *REDO!* |
| Poppa bubbla | Peka på bubblan och tryck avtryckaren |
| Den gula knappen (Starta / Nästa bana / Försök igen / Fortsätt) | Avtryckaren |
| Till menyn (från paus eller "Försök igen") | B/Y |
| Paus | Klick på tumspaken |

Menyerna på skärmen visas som en svävande skylt framför dig, och strax under
blicken ligger en HUD-remsa med hjärtan, bana, poäng, hur långt du kommit och
lasermätaren. Nedräkningen, tipsen (omskrivna för handkontrollerna) och *WOW!*
dyker upp på skylten. Spelet begär 90 Hz av headsetet när det går.

## Komfort

Kameran sitter fast bakom enhörningen på konstant höjd, utan svängar eller
rotation. Vill man ändå ta det lugnt: spela bana 1–2 först, de är långsammast.

## Plan B: Virtual Desktop

Fungerar utan certifikat: starta spelet på PC:n, öppna det i Virtual Desktop och
spela med tangentbord/handkontroll på en stor virtuell skärm.

## Felsökning

- **VR-knappen syns inte** – adressen måste börja med `https://` och öppnas i Quest-webbläsaren (inte i en fönsterlös app).
- **Ingen VR-adress i PC-menyn** – certifikatet saknas; `logs/server_log.txt` säger då `VR: no certificate in cert/`. Kör `New-DevCert.ps1`.
- **Sidan laddar inte** – kontrollera att PC:n och headsetet är på samma nätverk och att `logs/server_log.txt` visar raden `VR (Quest-webbläsaren): https://...`.
- **Certifikatet gäller fel IP** – kör `New-DevCert.ps1` igen efter att PC:n fått ny adress.
