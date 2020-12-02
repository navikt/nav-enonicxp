const globalFragment = require('./_global');

const mainArticleContentFragment = `
    ${globalFragment}
    publish {
       from
    }
    data {
        ingress
        text(processHtml:{type:absolute})
        hasTableOfContents
        fact(processHtml:{type:absolute})
        social
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
    }
`;

module.exports = { fragment: mainArticleContentFragment };
