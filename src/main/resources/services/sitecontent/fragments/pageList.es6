const globalFragment = require('./_global');
const externalLink = require('./externalLink');
const internalLink = require('./internalLink');
const mainArticle = require('./mainArticle');
const transportPage = require('./transportPage');
const menuListItems = require('./menuListItems');

export const shortFragment = `
    ...on no_nav_navno_PageList {
        data {
            ingress
            hide_date
            hideSectionContentsDate
            orderSectionContentsByPublished
        }
    }
`;

export const fragment = `
    ...on no_nav_navno_PageList {
        dataAsJson
        data {
            sectionContents {
                ${globalFragment}
                ${transportPage.shortFragment}
                ${mainArticle.shortFragment}
                ${internalLink.fragment}
                ${externalLink.fragment}
                ${shortFragment}
            }
            ${menuListItems.shortcutsFragment}
        }
    }
`;
