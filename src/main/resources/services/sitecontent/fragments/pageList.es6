const globalFragment = require('./_global');
const externalLink = require('./externalLink');
const internalLink = require('./internalLink');
const mainArticle = require('./mainArticle');
const transportPage = require('./transportPage');

const pageListFragment = `
    ...on no_nav_navno_PageList {
        dataAsJson
        data {
            sectionContents {
                ${globalFragment}
                ${transportPage.shortFragment}
                ${mainArticle.shortFragment}
                ${internalLink.fragment}
                ${externalLink.fragment}
            }
            menuListItems {
                _selected
                shortcuts {
                    links {
                        url
                        text
                    }
                }
            }
        }
    }
`;

const pageListShortFragment = `
    ...on no_nav_navno_PageList {
        data {
            ingress
        }
    }
`;

module.exports = { fragment: pageListFragment, shortFragment: pageListShortFragment };
