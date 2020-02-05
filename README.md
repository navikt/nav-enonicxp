# NAV main site - Enonic XP

## Get started

1. Rename no.nav.navno.cfg.sample to no.nav.navno.cfg and move 
the file to your XP config folder located at ~/.enonic/sandboxes/YOUR_SANDBOX/home/config
2. Run the decorator and oidc-provider with 
```
docker-compose up -d
```

## Build

```
./gradlew deploy -t
```

## Development 

### Environment

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

