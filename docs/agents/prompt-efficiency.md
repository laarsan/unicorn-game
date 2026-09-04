# Prompteffektivitets-riktlinjer

Pipeline-bred referens för *intent-elicitation-disciplinen* — den gemensamma
grunden för hela DESIGN-fronten. Design-auktoritet: ADR 0013.

---

## De två linserna

Kvalitets- och ekonomilinserna är **en kropp, inte två discipliner**.

### Kvalitetslins — Intent-elicitation

Syftet är att omsätta en luddig avsikt till en maskinföljbar instruktion.
Fyra rörelser:

1. **Ersätt subjektiv kvalifikator med mätbar** — "bra" → "≤3 meningar, ett beslut per rad".
2. **Tvinga falsifierbart kriterium** — en acceptgrad ska gå att verifiera utan tolk.
3. **Dekomponera** — ett komplext mål bryts i oberoende, sekvenserbara delar.
4. **Surfacea antaganden** — lyft fram vad som förutsätts snarare än att gissa.

### Ekonomilins — Token-/attention-budget

En prompt ska vara mager nog att varje nedströms-session kan re-läsa den utan att
driva mot `/compact`. Token-ekonomi är en intent-elicitation-rörelse: överskottet
är alltid ett olöst antagande, aldrig nödvändig kontext.

Tumregler:
- Ta bort allt som inte ändrar modellens svar vid borttagning.
- Undvik repetition av kontext modellen redan har via sin roll eller CLAUDE.md.
- Strukturera så att nyckelvillkoret syns i de första 100 token.

---

## DESIGN-only-regeln

Disciplinen konsulteras **uteslutande i DESIGN** (to-spec, grill-with-docs,
to-prd, to-issues). Aldrig i autonom BUILD.

BUILD kör på frusna, redan-disambiguerade slices — det finns ingen avsikt kvar
att tolka. Att köra elicitation i den autonoma ryggen vore att återinföra
tvetydighet där modellen förutsätter att den är borta.

---

## Residual-beslut — gå tillbaka, inte eskalera

Körtidskontrollen på Kvalitetslinsens **Dekomponera**-rörelse. Ratificerad i
ADR 0029; design-auktoritet ADR 0013.

Ett steg är färdig-dekomponerat bara om dess acceptanskriterier går att skriva
utan att ett nytt beslut fattas. Test före varje steg: **kan kriterierna
formuleras utan att ett öppet beslut först stängs?**

- **Nej → steget är felmärkt. Gå tillbaka, eskalera inte.** Ett öppet beslut i
  BUILD hör hemma i design/ADR; ett i to-issues hör hemma i PRD/ADR. Komplettera
  uppströms-artefakten och återinträd steget med beslutet stängt. Att i stället
  eskalera modellen på plats fattar beslutet i fel steg — det dokumenteras inte i
  sin artefakt och återfinns inte. Eskalera bara när återgång bevisligen är
  omöjlig, och notera då att beslutet fattades utanför sin plats.
- **Termineringsvillkor — upprepning, inte en räknare.** Att öppna ett stängt
  beslut en gång är normalt (ny information kom). Öppnas *samma* beslut igen löser
  återgången inget — instabiliteten sitter i spec:ens struktur, inte i detaljen.
  Härled om spec:en (nytt grill-with-docs-underlag som samlar de öppna besluten) i
  stället för att lappa. Signalen är kvalitativ: en upprepning kräver per
  definition två observationer — ingen tröskel att kalibrera.

---

## Tonblindhets-norm — kalibrerad konfidens över prosaisk försäkran

Mallbred norm, ratificerad i ADR 0025 §3–§4 (H4). Gäller **agent-returer och
orchestratorns läsning av dem**, till skillnad från de två linserna ovan som är
DESIGN-only.

### Agent-halvan

En agent-retur ska minimera prosaisk försäkran ("I'm confident this is
correct", "all good") och i stället ge **kalibrerad konfidens** där ett
verdikt är osäkert: en explicit grad ("70 %, låg, kunde inte köra
integrationstestet") snarare än ett tvärsäkert tonläge.

### Orchestrator-halvan — tre invarianter

1. **Agera på fältet, aldrig på prosan.** Ritualen läser strukturerade fält
   (`failed_count`, `blocking[]`, `severity`). Prosa tillför noll beslutsvikt.
2. **Malformerad eller saknad strukturerad retur = misslyckande, inte
   välvillig ifyllnad.** Övertygande prosa med trasigt/saknat fält tolkas som
   `failed`/`blocked` och eskaleras — orchestratorn gissar inte "den menade
   nog grönt".
3. **Säkerhetsgrad är inte en grind-signal.** En osäker-låtande retur med
   grönt fält väger lika mycket som en tvärsäker med grönt fält. Orchestratorn
   ska vara **tonblind** åt bägge håll.

**Undantag: eskalering körs på kalibrerad konfidens, inte på tonläge.**
Tonblindheten gäller *grind*-beslut. En kalibrerad, explicit konfidensgrad är
en strukturerad ärlig signal, inte tonläge — den hedras, särskilt vid
eskaleringsbeslut (t.ex. debugger som eskalerar till opus). Skillnaden:
prosaisk okalibrerad självsäkerhet ignoreras; kalibrerad konfidensgrad är
information.

---

## Rollramnings-norm — skiljelinjen mellan beteende och identitet

Mallbred norm, ratificerad i ADR 0026 §2–§5 (H5). Syskonnorm till
tonblindhets-normen ovan — samma dokument äger båda; gäller hur
agentdefinitioner skrivs, till skillnad från de två linserna som är
DESIGN-only.

### Tre nivåer

- **Nivå 1 — beteendekontrakt.** Vad rollen gör, dess output-kontrakt, dess
  grindar (t.ex. "din uppgift är att returnera fynd uppdelade i `blocking`
  och `nit`"). Formar mätbart output. Sanktionerad — finns redan i alla sex
  agentdefinitioner.
- **Nivå 2 — funktionell hållning.** En epistemisk disposition som ändrar hur
  rollen *dömer* (t.ex. `test-runner`:s stakelöshet, `debugger`:s kalibrerade
  konfidens — se tonblindhets-normen ovan). Sanktionerad där den bär.
- **Nivå 3 — identitets-/expertis-flärp.** Ren identitet utan
  beteendeinnehåll ("senior X med N års erfarenhet"). **Avvisad som
  default.**

### Skiljelinjen — "ändrar det svaret?"-testet

En rad i en agentdef motiveras av **beteende- eller hållningsinnehåll,
aldrig av identitet i sig** — samma test som token-ekonomilinsen använder
för överflödig kontext. Nivå 1 och 2 sanktioneras som mönster; nivå 3
avvisas som default och får plats först om H6 mätbart visar vinst för en
specifik agent (då som spårbar opt-in-promovering, se nedan).

### H6-promoveringsregeln — den falsifierbara hypotesen

Den empiriska A/B-mätningen är deferad till H6:s golden-case-eval-harness
(H5 levererar skiljelinjen, inte mätningen). Överlämningen är formulerad
falsifierbart:

- **Nollhypotes (H0):** en nivå-2-hållnings- eller nivå-3-persona-rad höjer
  *inte* en agentdefinitions golden-case-utfall jämfört med
  beteendekontrakt-baslinjen.
- **Metrik:** golden-case *catch-rate* (planterade buggar/sårbarheter som
  fångas) + red-team *grind-hållning* (håller villkorliga grindar,
  tomt-test-fällor).
- **Promoveringsregel:** en hållnings-/persona-rad förtjänar plats endast om
  H6 visar en *materiell och upprepad* (varians-medveten, inte enstaka
  körning) förbättring hänförbar till raden. Skär åt bägge håll — en rad som
  mätbart *sänker* utfall stryks. **Ingen numerisk tröskel** sätts nu — det
  vore en magisk konstant utan harnessen; H6 kalibrerar siffran mot faktisk
  varians.

### Enforcement — omdöme, inte mekanisk teater

Skiljelinje-konformans ("hävdar raden identitet eller beteende/hållning?")
är ett omdömespåstående utan deterministiskt facit. Den upprätthålls som en
**audit-dimension** i H1:s per-agent-scorecard, bedömd av
granskaren/människan — inte som en keyword-Pester mot flärp. Den enda
mekaniska grinden är den som har facit: närvaro-/spegel-drift-test på att
denna sektion finns och matchar sin `template/`-spegel byte-identiskt.

---

## Djup auktoritet

Den evidensbaserade grunden bor i `to-spec`-skillens två filer:

- `.claude/skills/to-spec/EVIDENCE-WHAT-WORKS.md` — vad som faktiskt fungerar
- `.claude/skills/to-spec/EVIDENCE-CAVEATS.md` — kända begränsningar och fallgropar

Denna referens återger dem inte. Konsultera dem direkt vid tvivel eller vid
fördjupning av en lins.
