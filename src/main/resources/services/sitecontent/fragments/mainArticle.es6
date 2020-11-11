const mainArticleChapter = require('./mainArticleChapter');
const globalFragment = require('./_global');

const mainArticleFragment = `
    ...on no_nav_navno_MainArticle {
        data {
            contentType
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
        children {
            ${mainArticleChapter.fragment}
        }
        publish {
            from
        }
        language
    }
`;

const mainArticleShortFragment = `
    ...on no_nav_navno_MainArticle {
        data {
            ingress
        }
    }
`;

module.exports = { fragment: mainArticleFragment, shortFragment: mainArticleShortFragment };
