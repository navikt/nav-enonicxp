const globalFragment = require('./_global');
const externalLink = require('./externalLink');
const internalLink = require('./internalLink');
const urlFragment = require('./url');
const mainArticle = require('./mainArticle');
const transportPage = require('./transportPage');
const menuListItems = require('./menuListItems');
const dynamicPage = require('./dynamicPage');
const { decoratorTogglesMixinFragment } = require('./_mixins');
const { languagesMixinFragment } = require('./_mixins');
const { seoMixinFragment } = require('./_mixins');

const pageListShortFragment = `
    ...on no_nav_navno_PageList {
        data {
            ingress
            hide_date
            hideSectionContentsDate
            orderSectionContentsByPublished
            ${decoratorTogglesMixinFragment}
            ${seoMixinFragment}
        }
    }
`;

const pageListFragment = `
    ...on no_nav_navno_PageList {
        dataAsJson
        data {
            ${languagesMixinFragment}
            sectionContents {
                ${globalFragment}
                ${internalLink.fragment}
                ${externalLink.fragment}
                ${urlFragment.fragment}
                ${transportPage.shortFragment}
                ${pageListShortFragment}
                ${mainArticle.shortFragment}
                ${dynamicPage.shortFragment}
            }
            ${menuListItems.shortcutsFragment}
        }
    }
`;

module.exports = { fragment: pageListFragment, shortFragment: pageListShortFragment };
