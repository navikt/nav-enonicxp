const globalFragment = require('./_global');
const contentList = require('./contentList');
const internalLink = require('./internalLink');
const externalLink = require('./externalLink');
const pageList = require('./pageList');
const mainArticle = require('./mainArticle');
const transportPage = require('./transportPage');
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
                ${pageList.shortFragment}
                ${transportPage.shortFragment}
                ${mainArticle.shortFragment}
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
            ${seoMixinFragment}
        }
    }
`;

module.exports = { fragment: sectionPageFragment, shortFragment: sectionPageShortFragment };
