const globalFragment = require('./_global');
const contentList = require('./contentList');
const internalLink = require('./internalLink');
const externalLink = require('./externalLink');
const pageList = require('./pageList');
const mainArticle = require('./mainArticle');
const transportPage = require('./transportPage');

const sectionPageFragment = `
    ...on no_nav_navno_SectionPage {
        dataAsJson
        data {
            tableContents {
                ${globalFragment}
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
            panelsHeading
            panelItems {
                title
                ingress
                spanning
                url {
                    text
                    ref {
                        ${globalFragment}
                        ${internalLink.fragment}
                        ${externalLink.fragment}
                    }
                }
            }
        }
    }
`;

module.exports = { fragment: sectionPageFragment };
