const globalFragment = require('./_global');

const mainArticleContentFragment =`
    data {
        contentType
        fact
        social
        hasTableOfContents
        ingress
        menuListItems {
            _selected
            selfservice {
                link {
                    ${globalFragment}
                }
            }
            formAndApplication {
                link {
                    ${globalFragment}
                }
            }
            processTimes {
                link {
                    ${globalFragment}
                }
            }
            relatedInformation {
                link {
                    ${globalFragment}
                }
            }
            international {
                link {
                    ${globalFragment}
                }
            }
            reportChanges {
                link {
                    ${globalFragment}
                }
            }
            rates {
                link {
                    ${globalFragment}
                }
            }
            appealRights {
                link {
                    ${globalFragment}
                }
            }
            membership {
                link {
                    ${globalFragment}
                }
            }
            rulesAndRegulations {
                link {
                    ${globalFragment}
                }
            }
        }
        text(processHtml:{type:absolute})
    }
    publish {
       from
    }
    language
`;


module.exports = { fragment: mainArticleContentFragment };
