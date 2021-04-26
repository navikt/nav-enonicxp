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

const dynamicPageShortFragment = `
    ...on no_nav_navno_DynamicPage {
        data {
            description
        }
    }
`;

module.exports = { fragment: dynamicPageFragment, shortFragment: dynamicPageShortFragment };
