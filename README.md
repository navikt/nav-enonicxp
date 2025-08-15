# NAV.no - Enonic XP

NAVs content management system powered by Enonic XP, an open source project.

![Deploy to prod](https://github.com/navikt/nav-enonicxp/actions/workflows/deploy-to-prod.yml/badge.svg) |
![Deploy to dev](https://github.com/navikt/nav-enonicxp/actions/workflows/deploy-to-dev.yml/badge.svg) |
![Deploy to dev2/q6](https://github.com/navikt/nav-enonicxp/actions/workflows/deploy-to-q6.yml/badge.svg)

## How to get started

1. Install Enonic by following the guide at https://developer.enonic.com/start
2. Create a sandbox (preferably called **navno**)

```
enonic sandbox start
```

3. Launch admin console

```
open http://localhost:8080/admin
```

4. Download the NAV.no - XP Application

```
git clone https://github.com/navikt/nav-enonicxp.git
```

5. Copy **com.enonic.xp.content.cfg**, **no.nav.navno.cfg** and **com.enonic.xp.web.vhost.cfg** to your sandbox

```
cp com.enonic.xp.content.cfg /YOUR_SANDBOX_PATH/home/config/com.enonic.xp.content.cfg
cp no.nav.navno.cfg /YOUR_SANDBOX_PATH/home/config/no.nav.navno.cfg
cp com.enonic.xp.web.vhost.cfg /YOUR_SANDBOX_PATH/home/config/com.enonic.xp.web.vhost.cfg
```

6. Temporary step. Copy **com.enonic.app.contentstudio.cfg** to your sandbox

```
cp com.enonic.app.contentstudio.cfg /YOUR_SANDBOX_PATH/home/config/com.enonic.app.contentstudio.cfg
```

## Development

```
enonic project deploy
```

## Kopiere data til lokal sandbox fra prod

1. **Opprette en datadump**

   For å få data inn til lokal sandbox så må man først og fremst opprette en datadump av hele databasen. Oppskrift på det finner du her: [Systemdumps – Confluence](https://confluence.adeo.no/spaces/ATOM/pages/387108768/Div.+jobber#Div.jobber-Systemdumps)

2. **Last ned dumpen**

   Når dumpen er opprettet, laster du ned ZIP-filen fra *Data Toolbox* i [dev](https://portal-admin-dev.oera.no/admin/tool/systems.rcd.enonic.datatoolbox/data-toolbox#dumps)  eller *q6* (avhengig av hvilket miljø du opprettet dumpen i).

3. **Flytt ZIP-filen til riktig mappe**

   Filen skal ligge i: ```home/data/dump``` i din sandbox-implementasjon.
   
    Eksempel på terminalkommando (hvis filen ligger i Downloads):
   ```mv Downloads/prod_2025_08_05.zip ~/.enonic/sandboxes/navno/home/data/dump```

5. **Kjør import av dumpen**

   Kjør kommandoen: ```enonic dump load```

   Denne kan kjøres fra hvor som helst, men *ZIP-filen må ligge* i data/dump-katalogen.
   Velg dumpen fra listen.

6. **Oppgi brukernavn og passord**

   Format ```bruker:passord```
    - Brukernavn: su
    - Passord: det du har definert i system.properties-filen.
   
      ```system.properties```-filen ligger i:
      ```home/config```
      Hvis du ikke har den fra før:
      ```touch system.properties```
      Relevant verdi i filen:
      ```xp.suPassword=PASSORDDUVELGER```
      Flere eksempler finnes her:  [Standard config files – Enonic Docs](https://developer.enonic.com/docs/xp/stable/deployment/config#standard_config_files)

7. **Vent på at dumpen fullfører**

   Dette kan ta *lang* tid, så det kan være lurt å starte prosessen om natten. Pass på at maskinen ikke går i dvale, f.eks. ved å bruke:
   ```caffeinate``` (innebygd på Mac).

## Server config docs

[See confluence pages](https://confluence.adeo.no/display/ATOM/Servere)

## Cache docs

https://github.com/navikt/nav-enonicxp/wiki/Caching

## Deploy

- **dev/dev2(q6):** Run deploy-to-(dev|dev2/q6) workflow dispatch
- **P:** Make a PR between main and your feature branch **\*** and create a release at <br />
  https://github.com/navikt/nav-enonicxp/releases <br />
  **Obs:** Release must be formatted as **vX.X.X** (e.g v1.2.1)

## Useful Enonic XP tools

Document describing useful tools to query the database and look for changes in the case of user errors.
[Enonic XP Tools](tools.md)

## Dependencies

Enonic XP krever at npm-pakker dras inn som webjars. For å dra inn en pakke i js/ts må du bruke avbsolutt path til kildefilen i pakka.
Det betyr at path til spesifikk versjon må settes opp i kildekoden. For at dette skal fungere som forventet lokalt og i din IDE, må det settes opp en match i tsconfig mellom versjonsspesifikk path i webjar og path i node_modules.

### Rutine ved bumping av dependecies

1. Sjekk om ønsket versjon finnes som webjar
2. Oppdater versjon av webjar i `build.gradle`: `webjar "org.webjars.npm:html-entities:2.5.2"`
3. Oppdater path i ts-fil: `import { decode } from '/assets/html-entities/2.5.2/lib';`
4. Oppdater tsconfig.json (3 steder: rot, e2e-test og unit-test): `"paths": {"/assets/html-entities/2.5.2/lib": ["../../../node_modules/html-entities"],}`

## Alerting

Beskrivelse av oppsett for varsling til slack på `#xpnavno-alerts`: [Varsling av alvorlige feil](alerting.md)

## NAIS-device

We are able to use nais device to reach portal-admin and use ssh to reach our server nodes. To be able to use this with the host names instead of the ip-addresses we need to set this up in our hosts file

### /etc/hosts

```
# Q1
10.186.160.27 b31apvl00104.oera-q.local
10.186.32.37 b31apvl00105.oera-q.local
10.186.32.39 b31apvl00106.oera-q.local
10.186.160.28 b31apvl00107.oera-q.local
10.49.1.53 b31apvl00110.oera-q.local
10.186.160.30 b31apvl00108.oera-q.local
10.186.160.45 b31apvl00109.oera-q.local
10.186.32.43 b31apvl00111.oera-q.local
10.186.32.60 b31apvl00112.oera-q.local
# Q6
10.49.1.54 b31apvl00059.oera-q.local
10.186.32.17 b31apvl00060.oera-q.local
10.186.160.50 b31apvl00061.oera-q.local
10.186.32.21 b31apvl00062.oera-q.local
10.186.160.11 b31apvl00063.oera-q.local
# portal-admin
155.55.182.101 portal-admin-dev.oera.no
155.55.182.101 portal-admin-q6.oera.no
155.55.183.16 portal-admin.oera.no
#prod
10.187.160.36 a30apvl00088.oera.no
10.187.32.49 a30apvl00089.oera.no
10.187.160.40 a30apvl00113.oera.no
10.187.32.45 a30apvl00115.oera.no
10.49.0.69 a30apvl00090.oera.no
10.187.160.34 a30apvl00084.oera.no
10.187.160.35 a30apvl00085.oera.no
10.187.32.47 a30apvl00086.oera.no
10.187.32.48 a30apvl00087.oera.no
```

## In case of errors in which case we need to restart the app.

go to portal-admin of the environment you wish to restart:

| environment | url                              |
| ----------- | -------------------------------- |
| production  | https://portal-admin.oera.no     |
| develop     | https://portal-admin-dev.oera.no |
| q6          | https://portal-admin-q6.oera.no  |

Then just use the Applications link ({baseurl}/admin/tool/com.enonic.xp.app.applications/main). When
you select the app you will see buttons on the top of the page for stopping and starting the app.

## Viktig å huske på

### Unngå endring av feltnavn i Enonic-innholdstyper

Endring av feltnavn i Enonic (f.eks. fra `html` til `editorial` i et `richText`-felt) medfører at
referanser til tidligere data brytes. Verdiene eksisterer fortsatt i nodenes rådata, men blir
ikke hentet ut via GraphQL-spørringer og vises heller ikke i Content Studio eller frontend. Dette
skyldes at Enonic ikke har støtte for migrering av datamodeller. Dersom historikk eller gjenbruk
av eksisterende innhold er viktig, må navnekonvensjoner holdes stabile eller endringer håndteres
eksplisitt via migreringsscript.
