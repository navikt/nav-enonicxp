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

Tjenesten krever rollen `role:system.admin.login`.

## Autentisering mot produksjon

Produksjon bruker Microsoft-innlogging på det offentlige administrasjonsgrensesnittet. Før direkte eksport fra produksjon må de skrivebeskyttede eksporttjenestene deployes dit.

Første produksjonsvariant kan bruke XP sin innebygde `su`-bruker gjennom det interne endepunktet `http://<hostname>:8080/admin42` mens maskinen er koblet til gatewayen `team-personbruker-prod` i naisdevice. Passordet ligger i Nais-secreten `xp-admin`. Kontroller at secreten tilhører riktig produksjonsinstans før bruk; den dokumenterte lenken ligger under `team/navno/dev-fss`. Skriv passordet bare i skriptets skjulte terminalprompt, aldri i kildekode, shell-historikk eller chat.

Et alternativ er å bruke den eksisterende nettleserøkten fra Microsoft-innloggingen. Importskriptet må da utvides med `CURATED_SOURCE_COOKIE`, satt direkte i terminalen fra `Cookie`-headeren til en autentisert Content Studio-forespørsel. Cookien er en kortlevd hemmelighet med samme tilgang som nettleserøkten og skal håndteres som et passord.

Foretrukket langsiktig løsning er en egen XP service account med en generert nøkkelfil og bare rollen eksporttjenestene trenger. Skriptene må da støtte nøkkelfilen tilsvarende Enonic CLI sitt `--cred-file`, slik at eksporten ikke avhenger av en personlig og kortlevd nettleserøkt.

En mulig reserveflyt er å gjenopprette et Snapshotter-snapshot sammen med tilhørende blobstore i en isolert lokal sandkasse og bruke denne som lokal kilde for det kuraterte uttrekket; snapshotet alene er ikke en sikkerhetskopi.

> [!WARNING]
> Selektiv eksport er fortsatt eksperimentell til importen har bestått alle akseptansekriteriene i to rene sandkasser uten nye forsøk. Behold klon-og-beskjaer-flyten i `.github/skills/curated-xp-dump/` som validert reserve fram til da.

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

Kommandoen spør etter brukernavn og passord for kilden. For en eksisterende, stoppet målsandkasse spør den etter målets `su`-passord. Hvis målsandkassen ikke finnes, spør den etter passordet som den nye lokale `su`-brukeren skal ha. Kilde- og mållegitimasjonen kontrolleres før eksportplanlegging og nedlasting starter. Deretter opprettes sandkassen med samme XP-versjon som kilden. Kommandoen kopierer prosjektets standardkonfigurasjon, bygger NAV-applikasjonen med kildeversjonene, installerer samme Content Studio-versjon og importerer alle seks repository-grenene.

Etter en full import viser administrasjonsgrensesnittet det vanlige innloggingsskjemaet. Logg inn med brukernavn `su` og passordet du valgte under importen. Førstegangsoppsettet deaktiveres uten å opprette en ekstra lokal bruker.

En eksisterende målsandkasse endres bare med eksplisitt bekreftelse og egen autentisering:

```bash
pnpm curated:import --source prod --target navno-curated --force
```

Importer én side med avhengigheter ved å angi en offentlig URL eller en redigerings-URL fra Content Studio:

```bash
pnpm curated:import --page 'https://www.nav.no/arbeid'
```

Med `--page` utledes kilden fra URL-en, og målet er sandkassen som kjører lokalt. En offentlig `nav.no`-URL bruker produksjon, mens en Content Studio-URL bruker miljøet i URL-en. Bruk `--source` og `--target` for å overstyre disse verdiene. Flagget krever en eksisterende målsandkasse og bekrefter at den kan oppdateres, så `--force` er ikke nødvendig.

Sideimporten oppdaterer siden, nødvendige innholdsavhengigheter og foreldrekjeden i de aktuelle grenene. Den endrer ikke andre innholdstrær, prosjektoppsett, applikasjoner eller prosjektikoner. Kommandoen spør etter brukernavn og passord for kilde og mål. Passordene vises ikke i terminalen.

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

Skriptet lager seks filtrerte roteksporter: `draft` og `master` for hvert av de tre språkprosjektene. Begge grenene eksporteres direkte fordi XP 7 ikke kan gjenskape lagdelte `master`-grener sikkert ved å publisere importert `draft`-innhold:

```bash
ENONIC_AUTH='user:password' node scripts/create-curated-export.mjs \
  --input src/main/resources/services/curatedExportManifest/curated-content-urls.txt \
  --service-url https://portal-admin.oera.no/_/service/no.nav.navno/curatedExportManifest \
  --management-url https://xp-management.oera.no \
  --bundle prod-curated-2026-08-03 \
  --export-dir /path/to/XP_HOME/data/export
```

`--service-url` og `--management-url` må peke til henholdsvis tjeneste- og management-endepunktet på samme XP-installasjon. Skriptet setter `ENONIC_CLI_REMOTE_URL` eksplisitt for hver native eksport, slik at en eventuell global CLI-konfigurasjon ikke kan velge en annen kilde. `--export-dir` skal peke til `XP_HOME/data/export` på denne installasjonen. Arkivet inneholder native eksporter, manifestet og importskriptet.

## Importer i en ren sandkasse

Installer og start applikasjonene fra manifestet, inkludert samme versjoner. Deploy denne appen, og kjør importen fra roten av det utpakkede arkivet:

```bash
ENONIC_AUTH='user:password' \
CURATED_IMPORT_SERVICE_URL='http://localhost:8080/_/service/no.nav.navno/curatedExportImport' \
./prod-curated-2026-08-03.import.sh
```

Importen verifiserer applikasjonene og prosjektstrukturen, og importerer deretter alle seks repository-grenene direkte. Før en språkgren importeres, fjernes bare arvede noder som bruker samme innholds-ID på en annen sti enn den lokaliserte noden i manifestet. Dette lar native import gjenopprette flyttede oversettelser uten ID-kollisjoner. Eldre arkiver med tre `draft`-eksporter og `master`-enkeltobjekter avvises.

## Del innholdet som en systemdump

Etter at eksportene er importert og kontrollert i en ren sandkasse, oppretter du én XP-systemdump fra sandkassen:

```bash
ENONIC_AUTH='user:password' node scripts/create-curated-dump.mjs \
  --sandbox navno \
  --name prod_curated_YYYY_MM_DD
```

Systemdumpen ligger i `XP_HOME/data/dump/prod_curated_YYYY_MM_DD.zip` og inneholder repositoriene og hele mappestrukturen. Del denne ZIP-filen med teamet.

## Last inn i en lokal sandkasse

Opprett og konfigurer en XP 7.16.4-sandkasse som beskrevet i prosjektets hoved-README. Start sandkassen, og kjør deretter:

> [!WARNING]
> Lastingen erstatter alle repositorier som også finnes i systemdumpen.

```bash
ENONIC_AUTH='user:password' node scripts/load-curated-dump.mjs \
  --sandbox navno \
  --dump /path/to/prod_curated_YYYY_MM_DD.zip \
  --force
```

Skriptet kopierer ZIP-filen til sandkassen, laster alle repositoriene, kontrollerer resultatet og starter sandkassen på nytt. Prosjektene og foreldremappene for alle språklag følger med systemdumpen.

Åpne `http://localhost:8080/admin/` etter importen, velg **Create Admin User**, og opprett din lokale administratorkonto. Systemdumpen erstatter `system-repo`, så en konto som opprettes før importen, blir fjernet.
