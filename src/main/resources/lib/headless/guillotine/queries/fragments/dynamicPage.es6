const { languagesMixinFragment } = require('/lib/headless/guillotine/queries/fragments/_mixins');
const { seoMixinFragment } = require('./_mixins');

const dataObject = `
    data {
        description
        feedbackToggle
        ${languagesMixinFragment}
        ${seoMixinFragment}
    }
`;

const dataObjectShort = `
    data {
        description
    }
`;

const dynamicPageFragment = `
    ...on no_nav_navno_ContentPageWithSidemenus {
        ${dataObject}
    }
    ...on no_nav_navno_DynamicPage {
        ${dataObject}
    }
`;

const dynamicPageShortFragment = `
    ...on no_nav_navno_ContentPageWithSidemenus {
        ${dataObjectShort}
    }
    ...on no_nav_navno_DynamicPage {
        ${dataObjectShort}
    }
`;

module.exports = { fragment: dynamicPageFragment, shortFragment: dynamicPageShortFragment };
