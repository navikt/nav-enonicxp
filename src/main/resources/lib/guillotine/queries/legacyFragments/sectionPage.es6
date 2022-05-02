const globalFragment = require('./_global');
const contentList = require('./contentList');
const internalLink = require('./internalLink');
const externalLink = require('./externalLink');
const urlFragment = require('./url');
const pageList = require('./pageList');
const mainArticle = require('./mainArticle');
const transportPage = require('./transportPage');
const dynamicPage = require('./dynamicPage');
const { decoratorTogglesMixinFragment } = require('./_mixins');
const { languagesMixinFragment } = require('./_mixins');
const { seoMixinFragment, linkPanelsMixinFragment } = require('./_mixins');

const sectionPageShortFragment = `
    ...on no_nav_navno_SectionPage {
        data {
            ingress
        }
    }
`;

const sectionPageFragment = `
    ...on no_nav_navno_SectionPage {
        data {
            ingress
            moreNewsUrl
            tableContents {
                ${globalFragment}
                ${sectionPageShortFragment}
                ${internalLink.fragment}
                ${externalLink.fragment}
                ${urlFragment.fragment}
                ${pageList.shortFragment}
                ${transportPage.shortFragment}
                ${mainArticle.shortFragment}
                ${dynamicPage.shortFragment}
            }
            newsContents {
                ${globalFragment}
                ${contentList.fragment}
            }
            ntkContents {
                ${globalFragment}
                ${contentList.fragment}
            }
            scContents {
                ${globalFragment}
                ${contentList.fragment}
            }
            ${linkPanelsMixinFragment}
            ${decoratorTogglesMixinFragment}
            ${seoMixinFragment}
            ${languagesMixinFragment}
        }
    }
`;

module.exports = { fragment: sectionPageFragment, shortFragment: sectionPageShortFragment };
