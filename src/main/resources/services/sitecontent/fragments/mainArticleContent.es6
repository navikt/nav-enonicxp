const globalFragment = require('./_global');

const mainArticleContentFragment =`
    data {
        contentType
        picture {
            target {
                ...on media_Image {
                     imageUrl(scale:"$scale", type:absolute)
                }
            }
            size
            caption
            altText
        }
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
