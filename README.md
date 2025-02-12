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

## Server config docs
[See confluence pages](https://confluence.adeo.no/display/ATOM/Servere)

## Cache docs
https://github.com/navikt/nav-enonicxp/wiki/Caching

## Deploy

-   **dev/dev2(q6):** Run deploy-to-(dev|dev2/q6) workflow dispatch
-   **P:** Make a PR between master and your feature branch **\*** and create a release at <br />
    https://github.com/navikt/nav-enonicxp/releases <br />
    **Obs:** Release must be formatted as **vX.X.X** (e.g v1.2.1)

## Useful Enonic XP tools

Document describing useful tools to query the database and look for changes in the case of user errors.
[Enonic XP Tools](tools.md)

## Monitoring errors with slack alerts to #xpnavno-alerts

We have some rules which triggers an alert to the #xpnavno-alerts channel, these are there to give
us a heads up if some specific rules are triggered in kibana.

1. If the numbers of log messages on error level exceeds 100 in the last hour
2. If _any_ errors marked as critical have been logged in the last 10 minutes

We also have 3 triggers which monitor cluster health.

1. Ping warning of a node (if it persists it should be checked out, but we've seen that sometimes
   during the process of taking a snapshot, this can be triggered\*\*
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

### Critical errors

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
                    "query": """+("[critical]")"""
                  }
                },
                {
                  "range": {
                    "@timestamp": {
                      "include_lower": true,
                      "include_upper": true,
                      "from": "now-10m",
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
      "throttle_period_in_millis": 600000,
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
              "title": "Det har blitt logget kritiske feil siste 10 minutter! :rotating_light:",
              "title_link": "https://logs.adeo.no/goto/c398867f3e7f0cf2f2e6dd7191942b91",
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

