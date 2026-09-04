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

1. Starta spelet på PC:n som vanligt (`start.cmd`), eller `node server.js --no-browser`.
2. Sätt på Quest 3 (samma wifi som PC:n), öppna webbläsaren och gå till adressen ovan.
3. Godkänn certifikatvarningen (Avancerat → Fortsätt).
4. Tryck på **🥽 VR** i menyn. Knappen syns bara när webbläsaren stöder immersive VR.

## Kontroller i VR

| Handling | Quest-kontroll |
|---|---|
| Byt fil | Tumspak vänster/höger (valfri hand) |
| Hoppa | Avtryckare (trigger) eller A/X |
| Ducka | Grepp-knappen (håll inne) |
| Poppa bubbla | Peka på bubblan och tryck avtryckaren |
| Starta / Nästa bana / Försök igen | Avtryckaren i menyerna |

Menyerna på skärmen visas som en svävande skylt framför dig i VR. Namnet på
topplistan blir det som senast skrevs in på PC:n.

## Komfort

Kameran sitter fast bakom enhörningen på konstant höjd, utan svängar eller
rotation. Vill man ändå ta det lugnt: spela bana 1–2 först, de är långsammast.

## Plan B: Virtual Desktop

Fungerar utan certifikat: starta spelet på PC:n, öppna det i Virtual Desktop och
spela med tangentbord/handkontroll på en stor virtuell skärm.

## Felsökning

- **VR-knappen syns inte** – adressen måste börja med `https://` och öppnas i Quest-webbläsaren (inte i en fönsterlös app).
- **Sidan laddar inte** – kontrollera att PC:n och headsetet är på samma nätverk och att `logs/server_log.txt` visar raden `VR (Quest-webbläsaren): https://...`.
- **Certifikatet gäller fel IP** – kör `New-DevCert.ps1` igen efter att PC:n fått ny adress.
