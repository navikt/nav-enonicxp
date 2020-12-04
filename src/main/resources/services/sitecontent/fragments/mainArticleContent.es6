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
                links {
                    url
                    text
                }
            }
            formAndApplication {
                links {
                    url
                    text
                }
            }
            processTimes {
                links {
                    url
                    text
                }
            }
            relatedInformation {
                links {
                    url
                    text
                }
            }
            international {
                links {
                    url
                    text
                }
            }
            reportChanges {
                links {
                    url
                    text
                }
            }
            rates {
                links {
                    url
                    text
                }
            }
            appealRights {
                links {
                    url
                    text
                }
            }
            membership {
                links {
                    url
                    text
                }
            }
            rulesAndRegulations {
                links {
                    url
                    text
                }
            }
        }
    }
`;

module.exports = { fragment: mainArticleContentFragment };
