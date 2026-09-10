# Kuratert innholdseksport

Tjenesten lager et representativt uttrekk av publisert innhold og redaksjonelle avhengigheter fra nav.no.

Uttrekket inneholder:

- sider fra URL-listen
- nødvendige innholdsavhengigheter
- komplette avhengighets- og foreldrekjeder i `draft` og `master`
- redaksjonelle kontormapper for arbeidsgiver og lokalkontor
- hele dekoratørmenyen
- representanter for sidetyper som mangler i URL-listen
- innhold fra de aktuelle språk-repositoriene
- prosjektmetadata, applikasjonsstatus og grenmedlemskap

Innhold under `/www.nav.no/brukertester` og `/www.nav.no/testsider` tas ikke med. Store avhengigheter av typen `section-page` utelates når de har mer enn 50 etterkommere.

Eksporttjenestene krever rollen `role:system.admin`. Innlogging i administrasjonsgrensesnittet er ikke tilstrekkelig. Eksporten gir tilgang til komplette noder og vedlegg, inkludert upublisert innhold; dette er ikke et offentlig datasett.

## Sikkerhetsgrenser

Importtjenesten og dens skrivende Java-/TypeScript-hjelpere er utelatt fra standardbygget, også når et tidligere lokalt bygg ligger i `build/`. De må tas med eksplisitt med `-PcuratedImportLocal=true`. I tillegg krever alle importforespørsler administratorrollen og at målappen kjører med både `env=localhost` og `curatedImportEnabled=true`.

Alle skrivende CLI-operasjoner er lokale. Skriptene kontrollerer at port 8080 og 4848 tilhører samme lokale Java-prosess, med `-Dxp.home` som peker til den valgte sandkassen. Dermed er ikke en localhost-URL eller en porttunnel alene nok. Direkte Unix-sandkasser med `lsof` og `ps` støttes; Docker, tunneler, alternative porter og XP-hjemmestier med mellomrom avvises. Bare grunnleggende prosessinnstillinger arves av målprosessene, ikke kildepassord, JVM-overstyringer eller remote-/proxyinnstillinger.

HTTP-kall til målet bruker direkte loopback-forbindelser uten proxy, DNS-oppslag eller videresending. Dette gjelder også innlogging, prosjektikoner og dumpoperasjoner, ikke bare Enonic CLI.

En eksisterende målsandkasse må ha `env=localhost`, `curatedImportEnabled=true`, `serviceSecret=dummyToken` og ingen `searchApiKey` i `home/config/no.nav.navno.cfg`. Filen `home/config/com.enonic.xp.cluster.cfg` må inneholde kun `cluster.enabled=false` (kommentarer er tillatt), slik at en lokal prosess ikke kan bruke et produksjonscluster. Den må også kjøre det lokale bygget som inneholder importtjenesten. Konfigurasjonen kontrolleres før sandkassen startes eller endres. Ikke start en gjenopprettet produksjonssandkasse med produksjonskonfigurasjon, produksjonslegitimasjon eller åpne utgående forbindelser til produksjon. Andre installerte applikasjoner og lagrede jobber er aktiv kode og må isoleres separat.

`.curated/` og genererte eksportarkiver skal ikke legges i Git. De kan inneholde begrenset og upublisert innhold. Oppbevar dem med begrenset tilgang, avtal eventuell deling og slett dem når de ikke lenger trengs.

## Autentisering mot produksjon

Produksjon bruker Microsoft-innlogging på det offentlige administrasjonsgrensesnittet. Før direkte eksport fra produksjon må de skrivebeskyttede eksporttjenestene deployes dit.

Produksjonsruting og autentisering må godkjennes før bruk. Den implementerte klienten støtter XP-systemproviderens brukernavn/passord, ikke Microsoft-innlogging, nettlesercookies eller nøkkelfiler. Bruk en godkjent, kryptert forbindelse. Skriv passordet i skriptets skjulte terminalprompt, aldri i kildekode, shell-historikk eller chat. Bruk et annet passord for den lokale målsandkassen.

Et alternativ er å bruke den eksisterende nettleserøkten fra Microsoft-innloggingen. Importskriptet må da utvides med `CURATED_SOURCE_COOKIE`, satt direkte i terminalen fra `Cookie`-headeren til en autentisert Content Studio-forespørsel. Cookien er en kortlevd hemmelighet med samme tilgang som nettleserøkten og skal håndteres som et passord.

Foretrukket langsiktig løsning er en egen eksportidentitet med en eksplisitt, begrenset lesekapasitet. Dette krever en egen autorisasjonsmodell og klientstøtte; dagens administratorrolle er ikke en skrivebeskyttet rolle. At eksporthandlerne bare leser, gjør ikke administratorlegitimasjonen skrivebeskyttet.

En mulig reserveflyt er å gjenopprette et Snapshotter-snapshot sammen med tilhørende blobstore i en isolert lokal sandkasse og bruke denne som lokal kilde for det kuraterte uttrekket; snapshotet alene er ikke en sikkerhetskopi.

> [!WARNING]
> Selektiv eksport er fortsatt eksperimentell til importen har bestått alle akseptansekriteriene i to rene sandkasser uten nye forsøk på den aktuelle XP-versjonen. Snapshotter med tilhørende blobstore er en separat, operatørstyrt reserveflyt; det finnes ingen validert klon-og-beskjær-skill i denne checkouten.

## URL-liste

Bruk en tekstfil med én URL eller sti per linje. Du kan også bruke en JSON-fil med en liste av URL-er. Tomme linjer og linjer som starter med `#`, ignoreres.

Filen `curated-content-urls.txt` inneholder det kuraterte utvalget av sider.

## Importer direkte til en lokal sandkasse

Den samlede kommandoen leser kuratert innhold uten å endre kilden. Kilden kan være `prod`, `dev1`, `dev2`, en eksplisitt XP-URL eller navnet på den lokale sandkassen som kjører:

```bash
pnpm curated:import \
  --source prod \
  --target navno-curated \
  --dump-name prod_curated_YYYY_MM_DD
```

Kommandoen spør etter brukernavn og passord for kilden. For en eksisterende, stoppet målsandkasse spør den etter målets `su`-passord. Hvis målsandkassen ikke finnes, spør den etter passordet som den nye lokale `su`-brukeren skal ha. Kilde- og mållegitimasjonen kontrolleres før eksportplanlegging og nedlasting starter. Deretter opprettes sandkassen med samme XP-versjon som kilden. Kommandoen kopierer lokal konfigurasjon, bygger den aktuelle checkouten av NAV-applikasjonen med lokal importstøtte, installerer samme Content Studio-versjon og importerer alle seks repository-grenene. NAV-bygget bruker kildeappens versjonsnummer, men er ikke en kopi av produksjonens JAR-fil.

Etter en full import viser administrasjonsgrensesnittet det vanlige innloggingsskjemaet. Logg inn med brukernavn `su` og passordet du valgte under importen. Førstegangsoppsettet deaktiveres uten å opprette en ekstra lokal bruker.

En eksisterende målsandkasse må oppfylle sikkerhetskravene over og endres bare med eksplisitt flagg og egen autentisering:

```bash
pnpm curated:import --source prod --target navno-curated --force
```

Importer én side med avhengigheter ved å angi en offentlig URL eller en redigerings-URL fra Content Studio:

```bash
pnpm curated:import --page 'https://www.nav.no/arbeid'
```

Med `--page` utledes kilden fra URL-en, og målet er sandkassen som kjører lokalt. En offentlig `nav.no`-URL bruker produksjon, mens en Content Studio-URL bruker miljøet i URL-en. Bruk `--source` og `--target` for å overstyre disse verdiene. Flagget krever en eksisterende målsandkasse og bekrefter at den kan oppdateres, så `--force` er ikke nødvendig.

Sideimporten oppdaterer siden, nødvendige innholdsavhengigheter og foreldrekjeden i de aktuelle grenene. Den endrer ikke prosjektoppsett, applikasjoner eller prosjektikoner. Vanlige XP-hendelser og arv kan likevel påvirke avledet lokalt innhold; dette er ikke en transaksjonelt isolert oppdatering. Målsandkassen startes på nytt før importen for å bruke lokal konfigurasjon og et miljø uten arvede kildehemmeligheter. Kommandoen spør etter brukernavn og passord for kilde og mål. Passordene vises ikke i terminalen.

Ingen `pnpm curated:import`-kommando krever at autentisering settes på forhånd. I CI eller andre ikke-interaktive miljøer kan `CURATED_SOURCE_AUTH` og `CURATED_TARGET_AUTH` fortsatt settes til `user:password`. For en ny målsandkasse må `CURATED_TARGET_AUTH` bruke formatet `su:password`.

En full import forsøker å installere alle ikke-systemapplikasjoner som kilden rapporterer, med samme versjoner fra Enonic-repositoriet. Content Studio, NAV-applikasjonen og applikasjoner som eier innholdstyper i uttrekket er obligatoriske; importen stopper hvis en av disse ikke kan installeres. Andre administrasjonsverktøy hoppes over med en kort advarsel hvis artefakten ikke er offentlig tilgjengelig. Importen overfører også prosjektikonene gjennom Content Studio-API-et.

`--dump-name` er valgfritt. Når det er satt, oppretter kommandoen en komprimert XP-systemdump uten versjonshistorikk etter at importen er validert. Bruk `--plan-only` for å validere utvalget og skrive manifestet uten å opprette eller endre en målsandkasse.

## Kontroller eksportplanen

Deploy appen til XP-miljøet som inneholder kildedataene. Lag deretter manifestet uten å kjøre native eksport:

```bash
ENONIC_AUTH='user:password' node scripts/create-curated-export.mjs \
  --input src/main/resources/services/curatedExportManifest/curated-content-urls.txt \
  --service-url https://portal-admin.oera.no/_/service/no.nav.navno/curatedExportManifest \
  --bundle prod-curated-2026-08-03 \
  --plan-only
```

Kommandoen feiler hvis URL-er, innholdstyper, prosjekter eller nødvendige applikasjoner mangler. På en ufullstendig lokal klone kan `--allow-missing-applications` brukes sammen med `--plan-only` for diagnostikk. Flagget kan ikke brukes til å lage et arkiv.

## Lag arkivet

Arkivkommandoen bruker samme uttrekksmotor som `pnpm curated:import`, også for lokale Snapshotter-kilder. Noder og binærer hentes gjennom lesetjenestene; det kjøres aldri native management-eksport på kilden. Det lokale arkivet inneholder `draft` og `master` fra hvert språkprosjekt:

```bash
ENONIC_AUTH='user:password' node scripts/create-curated-export.mjs \
  --input src/main/resources/services/curatedExportManifest/curated-content-urls.txt \
  --service-url https://portal-admin.oera.no/_/service/no.nav.navno/curatedExportManifest \
  --bundle prod-curated-2026-08-03 \
  --export-dir .curated/prod-curated-2026-08-03-export
```

`--export-dir` må være en ny lokal katalog, ikke en eksisterende XP-eksportkatalog. Arkivet inneholder native eksporter, manifestet og importskriptet med avhengigheter. Ved en egendefinert manifest-rute må `--source-service-url` også angis. De tidligere flaggene `--management-url`, `--dry` og `--write-supplements-only` avvises; bruk `--plan-only` for planlegging uten uttrekk.

## Importer i en ren sandkasse

Installer og start applikasjonene fra manifestet, inkludert samme versjoner. Deploy det lokale importbygget. Pakk arkivet ut i en privat lokal katalog, og kjør kommandoen fra denne katalogen. Importskriptet kopierer de deklarerte eksportene til den verifiserte målsandkassens `XP_HOME/data/export`; Enonic CLI sender bare eksportnavnet til XP. Eksisterende eksportmapper med samme navn avvises. Direkte bruk av Node-skriptet støtter `--export-dir`; standardverdien er katalogen som inneholder manifestet.

```bash
ENONIC_AUTH='user:password' \
CURATED_IMPORT_SERVICE_URL='http://localhost:8080/_/service/no.nav.navno/curatedExportImport' \
CURATED_TARGET_SANDBOX='navno-curated' \
./prod-curated-2026-08-03.import.sh
```

Importen verifiserer applikasjonene og prosjektstrukturen, og importerer deretter alle seks repository-grenene direkte. Flyttinger skal bevare valgte ID-er og avvises hvis de vil ramme innhold utenfor utvalget. Importen sletter ikke vilkårlige kollisjonsnoder eller midlertidige stier. Når en flytting må vente på at native import oppretter forelderen, importeres eksporten på nytt etter flyttingen slik at innholdet ikke beholder gamle data. Kildeeksportene beholdes under kjøringen fordi XP konsumerer importmappene.

Importen krever et versjonert, typet manifest med eksplisitte nodeversjoner og komplette `curated-metadata.json`-filer i format 2. Eldre arkiver må lages på nytt, også hvis de inneholder seks grener. Uventede native noder eller ufullstendige forventninger avvises før målinnholdet endres.

XP-egenskapstyper overføres eksplisitt, ikke utledet fra feltnavn eller JSON-tall. Hver valgt nodeversjon og dens binærer leses som samme uforanderlige versjon. Dette er ikke et transaksjonelt øyeblikksbilde av hele repositoriet. Sanitering av ugyldige XML-tegn skjer i det typede uttrekket; `supplement.node` spilles ikke av som en ny JSON-oppdatering etter import.

Etter native import gjenopprettes metadata som XP ikke oppdaterer på eksisterende noder. For typene `dateTime`, `localDateTime` og `localTime` repareres også presisjonstap når målverdien er nøyaktig kildeverdien avkortet til millisekunder; andre data- eller typeforskjeller avvises. Deretter kontrolleres valgte ID-er og stier, egenskapstyper og verdier, binærenes størrelse og SHA-512, indeksoppsett, nodetype, sortering og eksplisitt fravær i den andre grenen. Kildens versjons-ID og tidsstempel er proveniens, ikke verdier som skal påtvinges nye målversjoner. Kontrollene stopper ved feil; de er ikke en transaksjon eller automatisk tilbakeføring.

Hvis en node som skal være fraværende, finnes i målet, avbrytes importen i stedet for å slette den og mulige etterkommere. Arvede forskjeller mellom grenene og tvetydige sti-/sorteringskonflikter kan derfor kreve operatørstyrt opprydding i en isolert sandkasse. Flytteplanen tillater inntil 20 000 valgte noder og inspiserer maksimalt 1 000 etterkommere per flyttet undertre; større flyttinger avvises. Bruk ikke `--start-index` som bevis på at tidligere trinn er riktige: sluttkontrollen omfatter fortsatt hele manifestet.

## Del innholdet som en systemdump

Etter at eksportene er importert og kontrollert i en ren sandkasse, oppretter du én XP-systemdump fra sandkassen:

```bash
ENONIC_AUTH='user:password' node scripts/create-curated-dump.mjs \
  --sandbox navno \
  --name prod_curated_YYYY_MM_DD
```

Systemdumpen ligger i `XP_HOME/data/dump/prod_curated_YYYY_MM_DD.zip` og inneholder repositoriene og hele mappestrukturen. Del denne ZIP-filen med teamet.

## Last inn i en lokal sandkasse

Opprett en sandkasse med samme XP-versjon som dumpen, lokal konfigurasjon og det eksplisitte importbygget. Start sandkassen, og kjør deretter:

> [!WARNING]
> Lastingen erstatter alle repositorier som også finnes i systemdumpen.

```bash
ENONIC_AUTH='user:password' node scripts/load-curated-dump.mjs \
  --sandbox navno \
  --dump /path/to/prod_curated_YYYY_MM_DD.zip \
  --force
```

Skriptet kopierer ZIP-filen til sandkassen og laster alle repositoriene. Det starter sandkassen på nytt bare hvis XP rapporterer at lastingen er ferdig uten importfeil. Når `system-repo` erstattes, kan oppgaven som rapporterer resultatet forsvinne. Da stopper skriptet med en uttrykkelig feil: eksisterende repository-navn er ikke bevis på vellykket lasting. Sandkassen må undersøkes og innholdet valideres før den brukes. Den komplette dump-reserveflyten er fortsatt ikke produksjonsverifisert.

Åpne `http://localhost:8080/admin/` etter importen, velg **Create Admin User**, og opprett din lokale administratorkonto. Systemdumpen erstatter `system-repo`, så en konto som opprettes før importen, blir fjernet.
