# Nyttige administratorverktøy for Enonic XP


## Users/Brukeradministrasjon
Installeres automatisk som en del av XP

Enkleste måte å søke opp brukere på. Brukere lagres og vises bare med adfs-ID i Content Viewer og andre verktøy.
Her kan du matche brukerid og visningsnavn. 

Visningsnavn er full e-postadresse i NAV, så derfor kan du søke på navn eller deler av navn.


## Data Toolbox
Egen applikasjon - https://market.enonic.com/vendors/glenn-ricaud/data-toolbox

Query mot databasen via valget **Node Search**.
Husk at det kan være lurt å spesifisere repo og branch.
**com.enonic.cms.default** er repo til nettstedet.
**no.nav.navno** er repo til applikasjonen.

Ved å bruke søkefeltet øverst til høyre (forstørrelsesglasset), får du satt opp et detaljert Query som du så kan justere.

Queries settes opp på samme måte som fra koden. Feltnavn finner du lettest via live data i **Content Viewer** i **Content Studio**, eller eventuelt beskrevet som XML i source-koden, f.eks.: `site/content-types/main-article/main-article.xml`.
- Bruk **=** for eksakt match på typer som krever dette (number, id-er …)
- Bruk **LIKE** for treff i strenger. * for å matche hva som helst.

Innholdet ligger under /content/<app-navn>, så husk å prefiks søk på **_path** eller **_parentPath** med `/content/www.nav.no/` eller `*`

Eksempler:
```
_path LIKE '*/no/person/arbeid/*'
_parentPath LIKE '/content/www.nav.no/no/person/arbeid/*'
```

Du kan dele et query med andre ved å kopiere URL-en til siden.

Doc på formatet til et Query:
https://developer.enonic.com/docs/xp/stable/storage/noql


## Audit Log Browser
Egen applikasjon - https://market.enonic.com/vendors/enonic/audit-log-browser

Innsyn i Change log for databasen. Kan gjøre filtering på ulike felter for å finne spesifikke logentries ved å velge fra dropdown-felter øverst på skjermen.
Visning er basert på id-er, for å knytte det til meningsbærende data bruk **Data Toolbox**.

Data Toolbox inneholder også en oversikt - **Audit Log** - hvor redaktørens e-postadresse og path til objektet vises.

Du kan også gjøre søk mot audit log fra **Data Toolbox** > **Node Search**. 
```
Repositories
system.auditlog
```

## Eksempler/snippets

### Case 1 - Feilaktig avpublisering
Noen har avpublisert et element som avpubliserte en hel rekke av andre elementer (via avhengigheter).
Hvordan finne ut hvilke som ble avpublisert?

1. Finn eventuelt brukerid via **Users/Brukeradministrasjon**
2. Bruk **Audit Log Browser** til å finne elementet som ble avpublisert, basert på bruker eller tidspunkt:
```
	From -> <Velg dato du vil sjekke fra (YYY-MM-DD)>
	Type -> system.content.unpublishcontent
	User -> <brukeridentifikasjon> (hvis du vil snevre inn søket)
```
3. Finn aktuelt element og kopier listen av id-er under **unpublishedContents**
4. Ta listen i en editor og legg id-ene i en kommaseparert liste av strenger (“id1”, ”id2”, ...)
5. Lim listen inn i et IN-query i **Data toolbox > Node Search** :

```
Query
_id IN ("9cb56cb1-2195-4dda-a14e-6d2c683b6409","74e6bd4d-ede3-4f6c-9f7f-954cf8cd3226")
```

#### Alternativ metode (references)

Bruk references til å finne innhold som hadde tilknytning til innholdet som ble avpublisert.
Da holder det å gjøre et query basert på id-en til hovedelementet.
Problemet er at du ikke kan vite 100% sikkert at alle disse elementene faktisk ble avpublisert. Redaktøren kan ha valgt bort noen i dialogen.

```
Query
_references = "d3a6050e-6d68-47bd-8933-72a3a045140f"
```


### Case 2 - Finn endringer fra bruker/redaktør
Finn alle artikler som er endret av en bestemt bruker i master, siste endrede øverst.

1. Finn brukerid via **Users/Brukeradministrasjon**
2. **Data toolbox** > **Node search** :
```
Repositories
com.enonic.cms.default

Branch
master

Query
modifier = "user:adfs:39ab475e-a6d6-4089-8f50-05f17d2e5828" AND type = "no.nav.navno:main-article"

Sort
modifiedTime DESC
```

### Case 3 - Finn innhold som er slettet siste 24 timer

**Audit Log Browser**
```
From -> <Velg gårsdagens dato (YYYY-MM-DD)>
Type -> system.content.delete
```
Listen vil vise user-id for utførende og path til objektene (i tillegg til id)
Husk prefiks _ for oppslag i Data Toolbox: **_id**, **_path** og **_parentPath**


### Case 4 - Finn innhold som er flyttet siste dager

**Audit Log Browser**
```
From -> <Velg ønsket dato (YYYY-MM-DD)>
Type -> system.content.move
```
Listen vil vise user-id for utførende og parentPath til objektene (i tillegg til id)
Husk prefiks _ for oppslag i Data Toolbox: **_id**, **_path** og **_parentPath**

