# Kuratert innhold til lokal sandbox

Oppretter en lokal sandbox med et kuratert utvalg av sider. Kan også oppdatere sidene eller importere én spesifikk side til en lokal sandbox.

Kuratert import inkluderer sidene i [curated-content-urls.txt](curated-content-urls.txt), kontormapper (editorial), dekoratørmenyen, alle sidemaler (`_templates`) og ett eller flere eksempler for hver sidetype, med nødvendige avhengigheter og foreldre. Bruk `--input <fil>` for en egen liste med én URL eller sti per linje. Filer som slutter på `.json`, leses som en JSON-liste av strenger.

## Viktig før du starter

- Du trenger Enonic CLI installert for at dette skal fungere.
- Kommandoene kjører på macOS, Linux (med `lsof` installert) og Windows (i PowerShell, med Enonic CLI installert med Scoop eller installasjonsprogrammet, ikke npm).
- Du må ha rollen `system.admin` i kildemiljøet. Mot `prod`, `dev1` og `dev2` godkjenner du tilgangen i nettleseren med din vanlige Entra ID-innlogging, se [Tilgang til deployede miljøer](#tilgang-til-deployede-miljøer). Mot en lokal sandbox logger du inn med brukernavn og passord. Skriver du feil, får du tre forsøk.
- Den lokale sandboxen bruker den innebygde SU-brukeren.
- Kommandoen endrer ikke innhold i kilden. Import og andre endringer skjer i den lokale sandboxen. Er kilden en lokal sandbox, stoppes den etter nedlastingen fordi målet skal kjøre på samme port.
- Valgt lokalt innhold kan bli overskrevet. Importen har ingen automatisk tilbakeføring, så ta vare på lokalt arbeid du trenger.
- Navnet på målsandboxen kan bare inneholde bokstaver, tall og understrek (`_`), samme regel som `enonic sandbox create`.

## Opprett en sandbox med kuratert innhold

```bash
pnpm sandbox:import --source prod --target navno
```

Kommandoen spør etter et nytt lokalt SU-passord, som du skriver to ganger, og ber deg godkjenne tilgangen til kilden i nettleseren (eller spør etter brukernavn og passord hvis kilden er en lokal sandbox). Kilden bygger deretter utvalget som en XP-task, og kommandoen viser hvilket steg den er på og hvor mange noder som er sjekket. Så laster kommandoen ned innholdet, viser fremdriften og prøver på nytt hvis forbindelsen brytes. Den oppretter sandboxen med samme XP-versjon som kilden og importerer innholdet og prosjektikonene for Bokmål, engelsk og nynorsk. Som standard tas bare publisert innhold med: den publiserte versjonen legges i både `draft` og `master` lokalt, så upubliserte endringer og innhold som aldri er publisert blir igjen i kilden. Legg til `--include-drafts` for å også hente upubliserte endringer og innhold som aldri er publisert. Den installerer også de samme applikasjonene og versjonene som kjører i kilden, blant annet Content Studio. Hvis en versjon ikke kan installeres, brukes nyeste patch-versjon med samme minor-versjon, og importen viser en advarsel. Content Studio og apper som eier innholdstyper i utvalget, må installeres. Andre apper hoppes over med en advarsel hvis ingen versjon kan installeres eller de er stoppet i kilden. Manifest og nedlastinger lagres i en egen kjøringsmappe under `.curated` og slettes når kommandoen avslutter, også ved feil.

Dette tas ikke med:

- innhold i andre lag enn disse tre, for eksempel samisk
- versjonshistorikk
- auditloggen. Dashbord-widgeten «Sist publiserte», «Forhåndspubliseringer» og «Sist avpubliserte» er derfor tom i sandboxen. «Under arbeid» viser bare innhold du selv har endret lokalt.

Hvis oppsettet av en ny sandbox feiler, beholdes SU-passordet. Kjør kommandoen på nytt med `--force` og samme passord, eller slett sandboxen med `enonic sandbox delete navno`.

## Oppdatere importtjenesten

Importtjenesten bygges når sandboxen opprettes. Hvis du senere endrer kode i importtjenesten eller annen lokal kuratert-importlogikk, deployer du den oppdaterte applikasjonen med:

```bash
pnpm sandbox:deploy navno
```

`pnpm sandbox:deploy [sandbox]` aktiverer `curatedImportEnabled=true` i sandboxens `no.nav.navno.cfg`, slår av klynging hvis `com.enonic.xp.cluster.cfg` mangler eller bare har utkommenterte linjer, og kjører deretter den vanlige `enonic project deploy`-kommandoen med `curatedImportLocal=true` satt som Gradle-prosjektegenskap. Du kan også bruke denne kommandoen for å gjøre en sandbox som er satt opp manuelt etter [hoved-READMEen](../../README.md#manuelt-oppsett-av-sandbox), klar for import.

> [!WARNING]
> Vanlig `enonic project deploy` bygger uten importtjenesten og bør ikke brukes når den trengs lokalt.

## Oppdater eksisterende innhold

En full oppdatering av en eksisterende sandbox krever eksplisitt `--force`:

```bash
pnpm sandbox:import --source prod --target navno --force
```

Dette oppdaterer det kuraterte utvalget, ikke hele systemdatabasen. Lokale endringer i valgt innhold kan bli overskrevet. Usikre konflikter stopper importen.

## Importere en spesifikk side

Bruk en offentlig URL eller en redigerings-URL fra Content Studio:

```bash
pnpm sandbox:import --page 'https://www.nav.no/arbeid'
```

`--page` utleder siden fra URL-en og importerer til den lokale sandboxen som kjører. Den krever et eksisterende mål, så `--force` er ikke nødvendig. Du kan overstyre kilden og målet med `--source` og `--target`. Content Studio-URL-er beholder prosjekt og innholds-ID, men importerer den publiserte versjonen. Innhold som aldri er publisert, kan bare importeres med `--include-drafts`.

En eksisterende sandbox stoppes og startes før både full import og sideimport. Importen kan også oppdatere innhold i lokale språkprosjekter som arver fra det valgte innholdet. «Én side» betyr derfor ikke at bare én node endres.

## Kilde og utvalg

`--source` støtter `prod`, `dev1`, `dev2`, en eksplisitt XP-origin eller navnet på en lokal sandbox som kjører. Kilde og mål må være forskjellige:

```bash
pnpm sandbox:import --source dev2 --target navno_dev2
pnpm sandbox:import --source lokal-kilde --target navno
```

En eksplisitt origin, for eksempel `https://portal-admin-q6.oera.no`, behandles som et deployet miljø.

Første gang du bruker en eksisterende lokal sandbox som kilde, må du deploye den, slik at den får eksporttjenestene som importen leser fra:

```bash
enonic sandbox start lokal-kilde
enonic project deploy lokal-kilde
```

Dersom kilden er en lokal sandbox opprettet fra et Snapshotter-snapshot, trenger du både snapshotet av metadata/indeks og tilhørende blobstore med selve filene, som bilder og PDF-er.

## Tilgang til deployede miljøer

Deployede miljøer har bare Entra ID-innlogging, så kommandoen får tilgang på samme måte som `gh auth login`:

1. Kommandoen starter en midlertidig mottaker på `127.0.0.1` og åpner godkjenningssiden `/webapp/no.nav.navno/curated-export/authorize` i nettleseren. Adressen skrives også ut, i tilfelle nettleseren ikke åpnes.
2. Er du ikke innlogget i XP-admin, viser siden en lenke til innloggingen. Logg inn der, og trykk «Prøv igjen». Bekreft deretter at importverktøyet skal få lesetilgang. Godkjenn bare hvis du nettopp startet importen selv.
3. Nettleseren sender en engangskode tilbake til kommandoen. Kommandoen bytter koden mot et eksporttoken.

Detaljer:

- Godkjenningen må skje innen 5 minutter. Engangskoden gjelder i 2 minutter og kan bare brukes én gang. Den er bundet til kommandoen som startet godkjenningen (PKCE).
- Tokenet gjelder i 2 timer og ligger bare i minnet til kommandoen. Ingenting lagres på disk.
- Tokenet gir bare tilgang til de skrivebeskyttede eksportrutene under `/webapp/no.nav.navno/curated-export/`. Hver forespørsel kjøres som deg og sjekker på nytt at du har `system.admin`.
- Koder og tokener lagres bare som SHA-256-hasher i kildemiljøet, slik at alle nodene i klyngen kan sjekke dem.
- Rutene må være deployet i kildemiljøet. Endringer i eksporttjenestene virker derfor ikke mot `dev2` eller `prod` før de er deployet dit.

## Lag en Enonic-systemdump

Lag en vanlig, komprimert XP-systemdump uten versjonshistorikk fra den valgte lokale sandboxen:

```bash
pnpm sandbox:dump --sandbox navno --name dump_YYYY_MM_DD
```

`--sandbox` og `--name` er påkrevd, og sandboxen må kjøre fra før. Filen havner i `XP_HOME/data/dump/<name>.zip`.

Se [«Full systemdump» i hoved-READMEen](../../README.md#full-systemdump) for hvordan du laster en slik dump inn i en annen sandbox.

## Tester

Lint og skripttester kjøres i CI av `sandbox-tooling.yml` når filer under `scripts/sandbox/` endres:

```bash
pnpm sandbox:lint
pnpm sandbox:test
```
