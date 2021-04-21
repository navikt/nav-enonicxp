const { languagesMixinFragment } = require('/lib/headless/guillotine/queries/fragments/_mixins');
const { seoMixinFragment } = require('./_mixins');

const dynamicPageFragment = `
    ...on no_nav_navno_DynamicPage {
        data {
            feedbackToggle
            ${languagesMixinFragment}
            ${seoMixinFragment}
        }
    }
`;

module.exports = { fragment: dynamicPageFragment };
