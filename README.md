# NAV.no - Enonic XP
NAVs content management system powered by Enonic XP, an open source project.

![Build to prod](https://github.com/navikt/nav-enonicxp/workflows/Build%20to%20prod/badge.svg)
![Deploy to prod](https://github.com/navikt/nav-enonicxp/workflows/Deploy%20to%20prod/badge.svg) <br>
![Build to dev](https://github.com/navikt/nav-enonicxp/workflows/Build%20to%20dev/badge.svg)
![Deploy to dev](https://github.com/navikt/nav-enonicxp/workflows/Deploy%20to%20dev/badge.svg) |
![Build to Q6](https://github.com/navikt/nav-enonicxp/workflows/Build%20to%20Q6/badge.svg)
![Deploy to Q6](https://github.com/navikt/nav-enonicxp/workflows/Deploy%20to%20Q6/badge.svg)

Deployed by [nav-enonicxp-actions-runner
](https://github.com/navikt/nav-enonicxp-actions-runner)

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
5. Copy **no.nav.navno.cfg.sample** to your sandbox
```
cp no.nav.navno.cfg.sample /YOUR_SANDBOX_PATH/home/config/no.nav.navno.cfg
```
6. Start dekoratøren med
```
docker login docker.pkg.github.com -u GITHUB_USERNAME -p GITHUB_PERSONAL_ACCESS_TOKEN
docker-compose up -d
```

## Development

```
enonic project deploy
```

## Deploy

- **Q6:** Run **trigger-deploy-q6.sh** located in the .github folder <br>
`.github/trigger-deploy-q6.sh`
- **Q1:** Merge to develop
- **P:**  Make a PR between master and develop __*__ and create a release at <br />
https://github.com/navikt/nav-enonicxp/releases <br />
**Obs:** Release must be formatted as **vX.X.X** (e.g v1.2.1)

 __*__ PR between master and develop
1. Make a pull request between master and develop
2. Name it "Release: < iso-date of the release> "
3. Write release notes in the comment. Remember to get links to the jira tasks.
  Optimally we get the whole text from Jira when doing the release there. For
  now just check how a previous release pull request looks. Bullet list with
  link to issue and short description.
4. Set the label **Release** on the pull request.
5. After code review merge the pull request to master
6. Deploy the code to production

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

## Usefull Enonic XP tools
Document describing usefull tools to query the database and look for changes in the case of user errors.
[Enonic XP Tools](tools.md)

## Monitoring errors with slack alerts to #xpnavno-alerts

We have some rules which triggers an alert to the #xpnavno-alerts channel, these are there to give
us a heads up if some spesific rules are triggered in kibana.

1. If the numbers of log messages on error level exceeds 100 in the last hour
2. If we have an error from the invalidator code (cache invalidation), we'll get a warning.

We also have 3 triggers which monitor cluster health.

1. Ping warning of a node (if it persists it should be checked out, but we've seen that sometimes
   during the process of taking a snapshot, this can be triggered**
2. Elastic reports an org.elasticsearch.transport error
3. Elastic reports an org.elasticsearch.common.breaker.CircuitBreakingException

These last three where set up when we had problems with the cluster, not that relevant as of now.

We can't modify there ourselves, but any of these @terje.sannum, @bjorn.carlin, @christer.gabrielsen
or @steinar.vollebaek can be contacted to make new or modify the rules.

### Too many errors last hour
```
{
  "trigger": {
    "schedule": {
      "interval": "3m"
    }
  },
  "input": {
    "search": {
      "request": {
        "search_type": "query_then_fetch",
        "indices": [
          "logstash-apps-prod"
        ],
        "rest_total_hits_as_int": true,
        "body": {
          "query": {
            "bool": {
              "filter": [
                {
                  "match_phrase": {
                    "program": "EnonicXP"
                  }
                },
                {
                  "match_phrase": {
                    "level": "Error"
                  }
                },
                {
                  "range": {
                    "@timestamp": {
                      "from": "now-60m"
                    }
                  }
                }
              ]
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.hits.total": {
        "gt": 100
      }
    }
  },
  "actions": {
    "notify-slack": {
      "throttle_period_in_millis": 3600000,
      "slack": {
        "account": "logganalyse",
        "proxy": {
          "host": "webproxy-drift.nav.no",
          "port": 8088
        },
        "message": {
          "from": "Logganalyse",
          "to": [
            "#xpnavno-alerts"
          ],
          "attachments": [
            {
              "color": "danger",
              "title": "Det har blitt logget over 100 error meldiner siste 60 minutter :rotating_light:",
              "title_link": "https://logs.adeo.no/goto/23aae11caf085c8425c01a1101304664",
              "fields": [
                {
                  "title": "Program",
                  "value": "{{ctx.payload.hits.hits.0._source.program}}",
                  "short": true
                },
                {
                  "title": "Envclass",
                  "value": "{{ctx.payload.hits.hits.0._source.envclass}}",
                  "short": true
                },
                {
                  "title": "Server",
                  "value": "{{ctx.payload.hits.hits.0._source.host}}",
                  "short": false
                }
              ]
            }
          ]
        }
      }
    }
  }
}
```
### Sitecache error
```
{
  "trigger": {
    "schedule": {
      "interval": "5m"
    }
  },
  "input": {
    "search": {
      "request": {
        "search_type": "query_then_fetch",
        "indices": [
          "logstash-apps-prod*"
        ],
        "rest_total_hits_as_int": true,
        "body": {
          "query": {
            "bool": {
              "adjust_pure_negative": true,
              "must_not": [
                {
                  "term": {
                    "application": {
                      "boost": 1,
                      "value": "elk"
                    }
                  }
                }
              ],
              "must": [
                {
                  "term": {
                    "program": {
                      "boost": 1,
                      "value": "EnonicXP"
                    }
                  }
                },
                {
                  "term": {
                    "level": {
                      "boost": 1,
                      "value": "Error"
                    }
                  }
                },
                {
                  "query_string": {
                    "query": """+("(/lib/siteCache/invalidator.js)")"""
                  }
                },
                {
                  "range": {
                    "@timestamp": {
                      "include_lower": true,
                      "include_upper": true,
                      "from": "now-30m",
                      "boost": 1,
                      "to": null
                    }
                  }
                }
              ]
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.hits.total": {
        "gt": 0
      }
    }
  },
  "actions": {
    "notify-slack": {
      "throttle_period_in_millis": 1800000,
      "slack": {
        "account": "logganalyse",
        "proxy": {
          "host": "webproxy-drift.nav.no",
          "port": 8088
        },
        "message": {
          "from": "Logganalyse",
          "to": [
            "#xpnavno-alerts"
          ],
          "attachments": [
            {
              "color": "danger",
              "title": """<!channel> "(/lib/siteCache/invalidator.js)" error
 har blitt logget {{ctx.payload.hits.total}} ganger siste 30 minutter :rotating_light:""",
              "title_link": "https://logs.adeo.no/goto/731b1dd18d725b69de5d80927e581dc06",
              "fields": [
                {
                  "title": "Program",
                  "value": "{{ctx.payload.hits.hits.0._source.program}}",
                  "short": true
                },
                {
                  "title": "Envclass",
                  "value": "{{ctx.payload.hits.hits.0._source.envclass}}",
                  "short": true
                },
                {
                  "title": "Server",
                  "value": "{{ctx.payload.hits.hits.0._source.host}}",
                  "short": false
                }
              ]
            }
          ]
        }
      }
    }
  }
}
```
### XP-ping

```
{
  "trigger": {
    "schedule": {
      "interval": "5m"
    }
  },
  "input": {
    "search": {
      "request": {
        "search_type": "query_then_fetch",
        "indices": [
          "logstash-apps-prod*"
        ],
        "rest_total_hits_as_int": true,
        "body": {
          "query": {
            "bool": {
              "adjust_pure_negative": true,
              "must_not": [
                {
                  "term": {
                    "application": {
                      "boost": 1,
                      "value": "elk"
                    }
                  }
                }
              ],
              "must": [
                {
                  "term": {
                    "program": {
                      "boost": 1,
                      "value": "EnonicXP"
                    }
                  }
                },
                {
                  "query_string": {
                    "query": """+("[internal:discovery/zen/fd/ping]" "failed to ping")"""
                  }
                },
                {
                  "range": {
                    "@timestamp": {
                      "include_lower": true,
                      "include_upper": true,
                      "from": "now-5m",
                      "boost": 1,
                      "to": null
                    }
                  }
                }
              ]
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.hits.total": {
        "gt": 0
      }
    }
  },
  "actions": {
    "notify-slack": {
      "throttle_period_in_millis": 300000,
      "slack": {
        "account": "logganalyse",
        "proxy": {
          "host": "webproxy-drift.nav.no",
          "port": 8088
        },
        "message": {
          "from": "Logganalyse",
          "to": [
            "#xpnavno-alerts"
          ],
          "attachments": [
            {
              "color": "danger",
              "title": """<!channel> "[internal:discovery/zen/fd/ping]" OR "failed to ping"
 har blitt logget {{ctx.payload.hits.total}} ganger siste 5 minutter :rotating_light:""",
              "title_link": "https://logs.adeo.no/goto/bd56ee3f9e181f382917e50bbdb484be",
              "fields": [
                {
                  "title": "Program",
                  "value": "{{ctx.payload.hits.hits.0._source.program}}",
                  "short": true
                },
                {
                  "title": "Envclass",
                  "value": "{{ctx.payload.hits.hits.0._source.envclass}}",
                  "short": true
                },
                {
                  "title": "Server",
                  "value": "{{ctx.payload.hits.hits.0._source.host}}",
                  "short": false
                }
              ]
            }
          ]
        }
      }
    }
  }
}
```

### Elastic transport error
```
{
  "trigger": {
    "schedule": {
      "interval": "5m"
    }
  },
  "input": {
    "search": {
      "request": {
        "search_type": "query_then_fetch",
        "indices": [
          "logstash-apps-prod*"
        ],
        "rest_total_hits_as_int": true,
        "body": {
          "query": {
            "bool": {
              "adjust_pure_negative": true,
              "must_not": [
                {
                  "term": {
                    "application": {
                      "boost": 1,
                      "value": "elk"
                    }
                  }
                },
                {
                  "term": {
                    "level": {
                      "boost": 1,
                      "value": "Info"
                    }
                  }
                }
              ],
              "must": [
                {
                  "term": {
                    "program": {
                      "boost": 1,
                      "value": "EnonicXP"
                    }
                  }
                },
                {
                  "query_string": {
                    "query": """+("org.elasticsearch.transport")"""
                  }
                },
                {
                  "range": {
                    "@timestamp": {
                      "include_lower": true,
                      "include_upper": true,
                      "from": "now-5m",
                      "boost": 1,
                      "to": null
                    }
                  }
                }
              ]
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.hits.total": {
        "gt": 5
      }
    }
  },
  "actions": {
    "notify-slack": {
      "throttle_period_in_millis": 300000,
      "slack": {
        "account": "logganalyse",
        "proxy": {
          "host": "webproxy-drift.nav.no",
          "port": 8088
        },
        "message": {
          "from": "Logganalyse",
          "to": [
            "#xpnavno-alerts"
          ],
          "attachments": [
            {
              "color": "danger",
              "title": """<!channel> "org.elasticsearch.transport" Warning OR Error
 har blitt logget {{ctx.payload.hits.total}} ganger siste 5 minutter :rotating_light:""",
              "title_link": "https://logs.adeo.no/goto/3bf37c06a2a171a5df57a49c882e72ba",
              "fields": [
                {
                  "title": "Program",
                  "value": "{{ctx.payload.hits.hits.0._source.program}}",
                  "short": true
                },
                {
                  "title": "Envclass",
                  "value": "{{ctx.payload.hits.hits.0._source.envclass}}",
                  "short": true
                },
                {
                  "title": "Server",
                  "value": "{{ctx.payload.hits.hits.0._source.host}}",
                  "short": false
                }
              ]
            }
          ]
        }
      }
    }
  }
}
```

### Elastic circutbreaker
```
{
  "trigger": {
    "schedule": {
      "interval": "5m"
    }
  },
  "input": {
    "search": {
      "request": {
        "search_type": "query_then_fetch",
        "indices": [
          "logstash-apps-prod*"
        ],
        "rest_total_hits_as_int": true,
        "body": {
          "query": {
            "bool": {
              "adjust_pure_negative": true,
              "must_not": [
                {
                  "term": {
                    "application": {
                      "boost": 1,
                      "value": "elk"
                    }
                  }
                }
              ],
              "must": [
                {
                  "term": {
                    "program": {
                      "boost": 1,
                      "value": "EnonicXP"
                    }
                  }
                },
                {
                  "query_string": {
                    "query": """+("org.elasticsearch.common.breaker.CircuitBreakingException")"""
                  }
                },
                {
                  "range": {
                    "@timestamp": {
                      "include_lower": true,
                      "include_upper": true,
                      "from": "now-5m",
                      "boost": 1,
                      "to": null
                    }
                  }
                }
              ]
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.hits.total": {
        "gt": 0
      }
    }
  },
  "actions": {
    "notify-slack": {
      "throttle_period_in_millis": 300000,
      "slack": {
        "account": "logganalyse",
        "proxy": {
          "host": "webproxy-drift.nav.no",
          "port": 8088
        },
        "message": {
          "from": "Logganalyse",
          "to": [
            "#xpnavno-alerts"
          ],
          "attachments": [
            {
              "color": "danger",
              "title": """<!channel> "org.elasticsearch.common.breaker.CircuitBreakingException"
 har blitt logget {{ctx.payload.hits.total}} ganger siste 5 minutter :rotating_light:""",
              "title_link": "https://logs.adeo.no/goto/72596549c71b4e14c0ab9200ee442e4e",
              "fields": [
                {
                  "title": "Program",
                  "value": "{{ctx.payload.hits.hits.0._source.program}}",
                  "short": true
                },
                {
                  "title": "Envclass",
                  "value": "{{ctx.payload.hits.hits.0._source.envclass}}",
                  "short": true
                },
                {
                  "title": "Server",
                  "value": "{{ctx.payload.hits.hits.0._source.host}}",
                  "short": false
                }
              ]
            }
          ]
        }
      }
    }
  }
}
```

#Nyttige administratorverktøy for Enonic XP

##Users/Brukeradministrasjon Installeres sammen med XP

Enkleste måte å søke opp brukere på. Brukere lagres og vises bare med adfs-ID i Content Viewer og andre verktøy. Her kan du matche brukerid og visningsnavn. Visningsnavn er full e-postadresse i NAV, så derfor kan du søke på navn eller deler av navn.

##Data Toolbox Egen applikasjon - https://market.enonic.com/vendors/glenn-ricaud/data-toolbox

Query mot databasen via valget Node Search Husk at det kan være lurt å spesifisere repo og branch. com.enonic.cms.default er repo til nettstedet. no.nav.navno er repo til applikasjonen.

Ved å bruke søkefeltet øverst til høyre (forstørrelsesglasset), får du satt opp et detaljert Query som du så kan justere.

Queries settes opp på samme måte som fra koden. Feltnavn finner du via live data i Content Viewer eller i content-types i koden (XML). Bruk = for eksakt match på typer som krever dette (number, id-er …) Bruk LIKE for treff i strenger. * for å matche hva som helst. Innholdet ligger under /content/, så husk å prefiks søk på _path eller _parentPath med /content/www.nav.no/ eller *

Eksempler: _path LIKE '/no/person/arbeid/' _parentPath LIKE '/content/www.nav.no/no/person/arbeid/*'

Doc på formatet til et Query: https://developer.enonic.com/docs/xp/stable/storage/noql

Du kan dele et query med andre ved å kopiere URL-en til siden.

##Audit Log Browser Egen applikasjon - https://market.enonic.com/vendors/enonic/audit-log-browser

Innsyn i Change log for databasen. Kan gjøre filtering på ulike felter for å finne spesifikke logentries Visning er basert på id-er, for å knytte det til meningsbærende data bruk Data Toolbox. Data Toolbox inneholder også en oversikt - Audit Log - hvor redaktørens e-postadresse og path til objektet vises. Du kan også gjøre søk mot audit log fra Node Search i Data Toolbox; velg repo = system.auditlog

##Eksempler/snippets

###Case 1 - Feilaktig avpublsiering Noen har avpublisert et element som avpubliserte en hel rekke av andre elementer (via avhengigheter). Hvordan finne ut hvilke som ble avpublisert?

Finn eventuelt brukerid via Users/Brukeradministrasjon
Bruk Audit Log Browser til å finne elementet som ble avpublisert, basert på bruker eller tidspunkt: a. From = dato du vil sjekke fra b. Type = system.content.unpublishcontent c. User = brukeridentifikasjon, hvis du vil snevre inn søket
Finn aktuelt element og kopier listen av id-er under unpublishedContents
Ta listen i en editor og legg id-ene i en kommaseparert liste av strenger (“id1”, ”id2”, ...)
Lim listen inn i et IN-query i Data toolbox > Node Search :
Query _id IN ("9cb56cb1-2195-4dda-a14e-6d2c683b6409","74e6bd4d-ede3-4f6c-9f7f-954cf8cd3226”)

Alternativ metode (references) Bruk references til å finne innhold som hadde tilknytning til innholdet som ble avpublisert. Da holder det å gjøre et query basert på id-en til hovedelementet. Problemet er at du ikke kan vite 100% sikkert at alle disse elementene faktisk ble avpublisert. Redaktøren kan ha valgt bort noen, f.eks.

Query _references = "d3a6050e-6d68-47bd-8933-72a3a045140f"

###Case 2 - Finn endringer fra bruker/redaktør Finn alle artikler som er endret av en bestemt bruker i master, siste endret øverst.

Finn brukerid via Users/Brukeradministrasjon
Data toolbox > Node search:
Repositories com.enonic.cms.default

Branch master

Query modifier = "user:adfs:39ab475e-a6d6-4089-8f50-05f17d2e5828" AND type = "no.nav.navno:main-article”

Sort modifiedTime DESC

###Case 3 - Finn innhold som er slettet siste 24 timer

Audit Log Browser a. From = gårsdagens dato b. Type = system.content.delete Listen vil vise user-id for utførende og path til objektene (i tillegg til id) Husk prefiks _ for oppslag i Data Toolbox: _id, _path og _parentPath
###Case 4 - Finn innhold som er flyttet siste dager

Audit Log Browser a. From = ønsket dato dato b. Type = system.content.move Listen vil vise user-id for utførende og parentPath til objektene (i tillegg til id) Husk prefiks _ for oppslag i Data Toolbox: _id, _path og _parentPath
