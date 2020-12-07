const globalFragment = require('./_global');
const externalLink = require('./externalLink');
const internalLink = require('./internalLink');
const mainArticle = require('./mainArticle');
const transportPage = require('./transportPage');
const menuListItems = require('./menuListItems');

const pageListShortFragment = `
    ...on no_nav_navno_PageList {
        data {
            ingress
            hide_date
            hideSectionContentsDate
            orderSectionContentsByPublished
        }
    }
`;

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
                ${pageListShortFragment}
            }
            ${menuListItems.shortcutsFragment}
        }
    }
`;

module.exports = { fragment: pageListFragment, shortFragment: pageListShortFragment };
