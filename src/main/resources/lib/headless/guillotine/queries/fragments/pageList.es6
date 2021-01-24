const globalFragment = require('./_global');
const externalLink = require('./externalLink');
const internalLink = require('./internalLink');
const urlFragment = require('./url');
const mainArticle = require('./mainArticle');
const transportPage = require('./transportPage');
const menuListItems = require('./menuListItems');
const { seoMixinFragment } = require('./_mixins');

const pageListShortFragment = `
    ...on no_nav_navno_PageList {
        data {
            ingress
            hide_date
            hideSectionContentsDate
            orderSectionContentsByPublished
            ${seoMixinFragment}
        }
    }
`;

const pageListFragment = `
    ...on no_nav_navno_PageList {
        dataAsJson
        data {
            languages {
                language
                _path
            }
            sectionContents {
                ${globalFragment}
                ${transportPage.shortFragment}
                ${mainArticle.shortFragment}
                ${internalLink.fragment}
                ${externalLink.fragment}
                ${urlFragment.fragment}
                ${pageListShortFragment}
            }
            ${menuListItems.shortcutsFragment}
        }
    }
`;

module.exports = { fragment: pageListFragment, shortFragment: pageListShortFragment };
