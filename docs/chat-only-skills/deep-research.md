---
speglar-builtin: deep-research
synkad-fran-cli-version: "2.1.198"
synkad-datum: 2026-07-01
karna: "Claude Code builtin /deep-research"
---

# Deep-research — djupanalys med fan-out, adversarial verifiering och citerad syntes

Kör en strukturerad multi-källsökning på ett ämne: söker brett från flera vinklar, hämtar och läser källorna, utmanar varje centralt påstående med en motröst, och syntetiserar resultatet som en citerad rapport. Producerar faktagranskat underlag — inte en snabb sökning.

## Vad deep-research gör

| Fas | Vad som händer |
|---|---|
| **Fan-out** | Formulerar flera sökfrågor från olika vinklar (teknisk, historisk, skeptisk, m.fl.) och kör dem parallellt |
| **Källhämtning** | Läser och extraherar innehåll från träffarna; prioriterar primärkällor (docs, papers, officiella sidor) framför sammanfattningar |
| **Adversarial verify** | Utmanar varje centralt påstående med en motröst — specifikt formulerad att hitta undantag, motstridiga data och felaktiga premisser |
| **Syntes** | Sammanfattar i en rapport med inline-citat; delar in i bekräftade påståenden, osäkra påståenden och motargument |

## När deep-research ska köras

Kör deep-research när:

- Ämnet är **obekant domän** — du har inte tillräcklig grund för ett välgrundat svar
- Frågan rör **omtvistade påståenden** — flera troliga svar finns, sourcing avgör
- Svaret kräver **multi-källbelägg** — ett enstaka svar räcker inte för beslutsunderlaget
- Användaren ber om **spike-underlag** inför en design-/grillsession

Hoppa deep-research när:

- Frågan kan besvaras direkt ur koden eller projektkontexten
- Ämnet är känt och sourcing tillför inget (t.ex. syntax-frågor om välkänd teknik)
- Frågan är underspecificerad — be om 2–3 preciseringar först (budget, geografisk kontext, use-case)

## Chat-only-körning

Utan Claude Code-harness — kör manuellt i konversation:

1. **Precisera** frågan om den är vag: formulera en tydlig fråga med scope, kontext och eventuella begränsningar.
2. **Fan-out-sökning:** be Claude söka frågan från minst tre vinklar — t.ex. "teknisk förklaring", "kritiska synpunkter" och "officiell dokumentation". Ange att varje vinkel ska hämta separata källor.
3. **Källläsning:** klistra in eller länka de primärkällor du hittar. Be Claude extrahera det centrala ur varje källa.
4. **Adversarial pass:** be Claude formulera en motröst till varje centralt påstående — specifikt utformad att hitta undantag eller motstridiga data. Instruktion: "försök vederlägga varje påstående; säg om du inte hittar motargument".
5. **Syntes:** be Claude sammanfatta som en rapport med: bekräftade påståenden (med källa), osäkra påståenden (med reservation) och kvarstående motargument.
6. **Konfidensgradering:** be Claude sätta konfidensgrad (hög/medel/låg) per påstående och motivera kortfattat.
