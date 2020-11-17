const globalFragment = require('./_global');

const mainArticleContentFragment =`
    data {
        language
        originaltitle
        ingress
        text(processHtml:{type:absolute})
        contentType
        hasTableOfContents
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
        fact(processHtml:{type:absolute})
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
        social
        metaDescription
        canonicalUrl
        noindex
        Tag
    }
    publish {
       from
    }
`;

module.exports = { fragment: mainArticleContentFragment };
