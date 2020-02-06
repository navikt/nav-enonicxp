# NAV.no - Enonic XP
NAVs content management system powered by Enonic XP, an open source project.

## How to get started

1. Install Enonic by following the guide at https://developer.enonic.com/start
2. Create a sandbox
```
enonic sandbox start
```
3. Launch admin console
```
open http://localhost:8080
```
4. Download the NAV.no - XP Application
```
git clone https://github.com/navikt/nav-enonicxp.git
```

## Development

```
enonic project deploy
``` 

## Deploy

- **Q6:** Manual deploy at <br /> 
https://ci.adeo.no/job/navno-enonicxp/
- **Q1:** Merge to develop
- **P:** Merge to master and create a release at <br /> 
https://github.com/navikt/nav-enonicxp/releases

## Environment

#### Getting access to the site from root url

To be able to navigate the site as in production ie. http://localhost:8080/sok, we need to configure this in the file ${XP_HOME}/config/com.enonic.xp.web.vhost.cfg add this properties.

    enabled = true 
    mapping.public.host = localhost 
    mapping.public.source = /
    mapping.public.target = /site/default/master/www.nav.no/
    mapping.public.idProvider.system = default
    mapping.admin.host = localhost
    mapping.admin.source = /admin
    mapping.admin.target = /admin
    mapping.admin.idProvider.system = default
    mapping.webapp.host = localhost
    mapping.webapp.source = /webapp
    mapping.webapp.target = /webapp
    mapping.admin2.idProvider.system = default


## Under construction

Originally migrated by Enonic with CMS2XP 0.10.7. Other migration code added later.
