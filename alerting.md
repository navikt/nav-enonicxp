## Monitoring errors with slack alerts to #xpnavno-alerts

We have some `watchers` which triggers an alert to the `#xpnavno-alerts` channel, these are there to give
us a heads up if some specific rules are triggered in kibana.

1. If the numbers of log messages on error level exceeds 100 in the last hour
2. If _any_ errors marked as critical have been logged in the last 10 minutes

We also have 2 triggers which monitor cluster health.

1. Elastic reports an org.elasticsearch.transport error
2. Elastic reports an org.elasticsearch.common.breaker.CircuitBreakingException

These last three where set up when we had problems with the cluster, not that relevant as of now.

To request changes in `watchers`, post a request in slack in `#kibana`

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
