# Kuratert innhold til lokal sandbox

Oppretter en lokal sandbox med et kuratert utvalg av sider. Kan også oppdatere sidene eller importer én spesifikk side til en lokal sandbox.

Kuratert import inkluderer sidene i [curated-content-urls.txt](curated-content-urls.txt), kontormapper (editorial), dekoratørmenyen og ett eller flere eksempler for hver sidetype, med nødvendige avhengigheter og foreldre.

Bruk `--input <fil>` for en egen liste med én URL per linje, eller en JSON-liste av strenger.

## Viktig før du starter

- Du trenger Enonic CLI installert for at dette skal fungere.
- Du trenger brukernavn og passord for `su`-brukeren på kilden og den lokale sandboxen.
- Kommandoen sender bare lesekall til kilden. Import og andre endringer skjer i den lokale sandboxen.
- Valgt lokalt innhold kan bli overskrevet. Importen har ingen automatisk tilbakeføring, så ta vare på lokalt arbeid du trenger.

## Opprett en sandbox med kuratert innhold

```bash
pnpm sandbox:import --source prod --target navno
```

Kommandoen spør etter kildebruker/passord og et nytt lokalt `su`-passord. Den planlegger utvalget, laster ned innholdet, oppretter sandboxen med samme XP-versjon som kilden og importerer `draft` og `master` for Bokmål, engelsk og nynorsk. Content Studio og nødvendige innholdsapper installeres.

Manifest og nedlastinger lagres i en egen kjøringsmappe under `.curated` og slettes ved fullføring.

## Oppdater eksisterende innhold

En full oppdatering av en eksisterende sandbox krever eksplisitt `--force`:

```bash
pnpm sandbox:import --source prod --target navno --force
```

Dette oppdaterer det kuraterte utvalget, ikke hele systemdatabasen. Lokale endringer i valgt innhold kan bli overskrevet. Usikre konflikter stopper importen.

Importtjenesten bygges bare når sandboxen opprettes. Hvis du endrer kode i importtjenesten eller annen lokal kuratert-importlogikk, må du bygge og deploye tjenesten manuelt før du prøver igjen med `--force`.

```bash
./gradlew build -PcuratedImportLocal=true -PxpVersion=<xpVersion> -Pversion=<appVersion>
cp build/libs/navno.jar <sandbox>/home/deploy/navno.jar
pnpm sandbox:import --source prod --target navno --force
```

## Importere en spesifikk side

Bruk en offentlig URL eller en redigerings-URL fra Content Studio:

```bash
pnpm sandbox:import --page 'https://www.nav.no/arbeid'
```

`--page` utleder siden fra URL-en og importerer til den lokale sandboxen som kjører. Den krever et eksisterende mål, så `--force` er ikke nødvendig. Du kan overstyre kilden og målet med `--source` og `--target`. Content Studio-URL-er beholder prosjekt, innholds-ID og `draft`-gren.

En eksisterende sandbox stoppes og startes før både full import og sideimport. Importen kan også oppdatere innhold i lokale språkprosjekter som arver fra det valgte innholdet. «Én side» betyr derfor ikke at bare én node endres.

## Kilde og utvalg

`--source` støtter `prod`, `dev1`, `dev2`, en eksplisitt XP-origin eller navnet på en lokal sandbox som kjører. Kilde og mål må være forskjellige:

```bash
pnpm sandbox:import --source lokal-kilde --target navno
```

Dersom kilden er en lokal sandbox opprettet fra et Snapshotter-snapshot, trenger du både snapshotet av metadata/indeks og tilhørende blobstore med selve filene, som bilder og PDF-er.

## Lag en Enonic-systemdump

Lag en vanlig, komprimert XP-systemdump uten versjonshistorikk fra den valgte lokale sandboxen:

```bash
pnpm sandbox:dump --sandbox navno --name dump_YYYY_MM_DD
```

`--sandbox` og `--name` er påkrevd, og sandboxen må kjøre fra før. Filen havner i `XP_HOME/data/dump/prod_curated_YYYY_MM_DD.zip`.

Se [«Full systemdump» i hoved-READMEen](../../../../../README.md#full-systemdump) for hvordan du laster en slik dump inn i en annen sandbox.
